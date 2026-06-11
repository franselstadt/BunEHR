/** BunEHR host entry point — migrations, HTTP server, WebSocket hub. */
import type { Server } from 'bun'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './infrastructure/database/client.ts'
import { buildApp } from './Api/Program.ts'
import { websocketHandler, startDemoEventStream } from './Api/WebSockets/ClinicalEventHub.ts'

const PORT = parseInt(process.env['PORT'] ?? '3000', 10)

console.log('Running database migrations…')
await migrate(db, { migrationsFolder: './src/infrastructure/database/migrations' })
console.log('Migrations complete.')

const app = buildApp()
startDemoEventStream()

console.log(`
╔══════════════════════════════════════════════╗
║  BunEHR — OpenEHR REST API v1                 ║
║  HTTP:      http://0.0.0.0:${PORT}                ║
║  WebSocket: ws://0.0.0.0:${PORT}/ws             ║
║  Swagger:   http://localhost:${PORT}/docs         ║
╚══════════════════════════════════════════════╝
`)

export default {
  port: PORT,

  fetch(req: Request, server: Server<unknown>): Response | undefined {
    if (new URL(req.url).pathname === '/ws') {
      if (server.upgrade(req, { data: {} })) return undefined
      return new Response('WebSocket upgrade failed', { status: 426 })
    }
    return app.fetch(req) as Response
  },

  websocket: websocketHandler,
}
