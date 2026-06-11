/** HTTP pipeline — middleware, route registration, Swagger. */
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { swaggerUI } from '@hono/swagger-ui'
import { services } from '../infrastructure/config/DependencyInjection.ts'
import { createOpenEhrController } from './Controllers/OpenEhrController.ts'
import { createPatientsController } from './Controllers/PatientsController.ts'
import { createClinicalFinanceController } from './Controllers/ClinicalFinanceController.ts'
import { deepSnakeCase } from './Middleware/JsonNamingMiddleware.ts'
import { openApiSpec } from './OpenApiSpec.ts'

export function buildApp(): Hono {
  const app = new Hono()

  app.use('*', timing())
  app.use('*', logger())
  app.use('*', secureHeaders())
  app.use('*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Accept', 'If-Match', 'Prefer', 'Authorization'],
    exposeHeaders: ['ETag', 'Location'],
  }))

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
      } catch { /* skip non-json */ }
    }
  })

  app.get('/health', (c) => c.json({
    status: 'UP', service: 'BunEHR', version: '1.0.0', timestamp: new Date().toISOString(),
  }))

  app.get('/', (c) => c.json({
    service: 'BunEHR — OpenEHR REST API v1',
    swagger_ui: '/docs',
    openapi_json: '/api-docs',
    health: '/health',
  }))

  app.get('/api-docs', (c) => c.json(openApiSpec))
  app.get('/docs', swaggerUI({ url: '/api-docs' }))

  app.route('/', createOpenEhrController(services))
  app.route('/api/patients', createPatientsController(services.patients))
  app.route('/v1', createClinicalFinanceController())
  app.route('/api', createClinicalFinanceController())

  return app
}
