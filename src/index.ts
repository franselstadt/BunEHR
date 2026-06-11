/**
 * Meblock EHR — BunEHR Backend
 *
 * Uses Bun's idiomatic export-default server pattern:
 *   export default { port, fetch, websocket }
 *
 * Bun auto-starts exactly ONE server from this export.
 * The Server instance is passed as the second argument to fetch(),
 * giving us the reference needed to upgrade WebSocket connections.
 * No Bun.serve() call — that would start a second server on the same port.
 *
 * Startup sequence:
 *  1. Drizzle migrations run before the module resolves
 *  2. Hono app is built with all routes and middleware
 *  3. export default triggers Bun's single auto-start
 *  4. Demo clinical event stream emits every 8 seconds
 */
import type { Server } from 'bun'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './infrastructure/database/client.ts'
import {
  ehrService, compositionService, contributionService,
  directoryService, queryService, definitionService,
} from './infrastructure/config/container.ts'
import { swaggerUI } from '@hono/swagger-ui'
import { buildRoutes } from './interfaces/rest/routes.ts'
import { createPatientApiRoutes } from './interfaces/rest/patientApiRoutes.ts'
import { createClinicalRoutes }  from './interfaces/rest/clinicalRoutes.ts'
import { websocketHandler, startDemoEventStream } from './interfaces/rest/websocket.ts'
import { deepSnakeCase } from './interfaces/middleware/snakeCase.ts'
import { openApiSpec } from './interfaces/rest/openapi.ts'

const PORT = parseInt(process.env['PORT'] ?? '3000', 10)

// ── 1. Run Drizzle migrations on startup ──────────────────────────────────────
// Guarantees the DB schema matches the application before the first request.
console.log('Running database migrations…')
await migrate(db, { migrationsFolder: './src/infrastructure/database/migrations' })
console.log('Migrations complete.')

// ── 2. Build Hono app ─────────────────────────────────────────────────────────
const app = new Hono()

app.use('*', timing())
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Accept', 'If-Match', 'Prefer', 'Authorization'],
  exposeHeaders: ['ETag', 'Location'],
}))

// Recursively convert camelCase response keys to snake_case (OpenEHR canonical JSON)
app.use('*', async (c, next) => {
  await next()
  const ct = c.res.headers.get('content-type') ?? ''
  if (ct.includes('application/json') && c.res.status !== 204) {
    try {
      const body = await c.res.json() as unknown
      c.res = c.newResponse(JSON.stringify(deepSnakeCase(body)), c.res.status, {
        'Content-Type': 'application/json',
        ...Object.fromEntries(c.res.headers.entries()),
      })
    } catch { /* non-JSON body — skip conversion */ }
  }
})

// Health + root
app.get('/health', (c) => c.json({ status: 'UP', service: 'BunEHR', version: '1.0.0', timestamp: new Date().toISOString() }))
app.get('/', (c) => c.json({
  service: 'Meblock EHR — OpenEHR REST API v1',
  swagger_ui: '/docs',
  openapi_json: '/api-docs',
  health: '/health',
}))

// ── Swagger UI + OpenAPI JSON spec ────────────────────────────────────────────
// Swagger UI at /docs — interactive API explorer with full clinical descriptions
app.get('/api-docs', (c) => c.json(openApiSpec))
app.get('/docs', swaggerUI({ url: '/api-docs' }))

// OpenEHR REST API v1 routes
app.route('/', buildRoutes({
  ehr: ehrService, composition: compositionService, contribution: contributionService,
  directory: directoryService, query: queryService, definition: definitionService,
}))

// Patient BFF API
app.route('/api/patients', createPatientApiRoutes())

// Clinical Finance + ICD-10 + Medicare
app.route('/v1', createClinicalRoutes())
app.route('/api', createClinicalRoutes())

// ── 3. Start demo event stream ────────────────────────────────────────────────
startDemoEventStream()

console.log(`
╔══════════════════════════════════════════════╗
║  Meblock EHR  —  OpenEHR REST API v1          ║
║  HTTP:      http://0.0.0.0:${PORT}                ║
║  WebSocket: ws://0.0.0.0:${PORT}/ws             ║
║  Health:    http://localhost:${PORT}/health       ║
╚══════════════════════════════════════════════╝
`)

// ── 4. Export default — Bun auto-starts exactly ONE server ────────────────────
//
// Bun 1.2.x passes the Server instance as the second argument to fetch().
// We use that reference to upgrade WebSocket connections at /ws.
// DO NOT call Bun.serve() here — that would create a second server.
export default {
  port: PORT,

  fetch(req: Request, server: Server): Response | undefined {
    // Handle WebSocket upgrade before Hono sees the request
    if (new URL(req.url).pathname === '/ws') {
      const ok = server.upgrade(req)
      if (ok) return undefined       // Bun takes over the connection
      return new Response('WebSocket upgrade failed', { status: 426 })
    }
    return app.fetch(req) as Response
  },

  websocket: websocketHandler,
}
