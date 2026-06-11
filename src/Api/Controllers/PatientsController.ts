import type { IPatientService, CreatePatientRequest } from '../../application/contracts/IPatientService.ts'
import { broadcast } from '../WebSockets/ClinicalEventHub.ts'
import { handleError } from '../Middleware/ExceptionMiddleware.ts'
import { Hono } from 'hono'

/**
 * PatientsController — BFF endpoints for the hospital dashboard.
 * Thin controller: validate HTTP → delegate to IPatientService.
 */
export function createPatientsController(patients: IPatientService) {
  const app = new Hono()

  app.get('/', async (c) => {
    try {
      return c.json(await patients.list())
    } catch (e) {
      return handleError(e, c)
    }
  })

  app.post('/', async (c) => {
    try {
      const body = await c.req.json().catch(() => null) as CreatePatientRequest | null
      if (!body?.firstName?.trim() || !body?.lastName?.trim()) {
        return c.json({ detail: 'firstName and lastName are required' }, 400)
      }
      const patient = await patients.create(body)
      broadcast({
        id: crypto.randomUUID(),
        type: 'admission',
        patientId: patient.ehrId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        ward: patient.ward,
        message: `New patient admitted: ${patient.firstName} ${patient.lastName} → ${patient.ward}`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      })
      return c.json(patient, 201)
    } catch (e) {
      return handleError(e, c)
    }
  })

  app.get('/:ehrId', async (c) => {
    const patient = await patients.getById(c.req.param('ehrId'))
    if (!patient) return c.json({ detail: `Patient not found: ${c.req.param('ehrId')}` }, 404)
    return c.json(patient)
  })

  app.get('/:ehrId/vitals', async (c) => {
    try {
      return c.json(await patients.getVitalTrend(c.req.param('ehrId')))
    } catch (e) {
      return handleError(e, c)
    }
  })

  app.post('/seed', async (c) => {
    try {
      const count = await patients.seedSampleEhRs(patient => {
        broadcast({
          id: crypto.randomUUID(),
          type: 'admission',
          patientId: patient.ehrId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          ward: patient.ward,
          message: `Seed: EHR created for ${patient.firstName} ${patient.lastName}`,
          severity: 'info',
          timestamp: new Date().toISOString(),
        })
      })
      return c.json({ message: `Seeded ${count} patient EHRs`, count })
    } catch (e) {
      return handleError(e, c)
    }
  })

  return app
}
