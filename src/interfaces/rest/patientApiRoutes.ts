/**
 * Patient aggregate API — a convenience layer on top of OpenEHR.
 *
 * OpenEHR stores data in a standards-compliant but verbose format.
 * These endpoints provide a simplified, frontend-friendly view that
 * combines EHR records with demographic summaries.
 *
 * NOTE: In a real deployment, demographics would be stored in a separate
 * Demographics server (another openEHR RM component). For this demo,
 * we use the in-memory sample patient dataset.
 */
import { Hono } from 'hono'
import { SAMPLE_PATIENTS, generateVitalTrend } from '../../sampleData.ts'
import { db } from '../../infrastructure/database/client.ts'
import { ehr } from '../../infrastructure/database/schema.ts'
import { broadcast } from './websocket.ts'

export function createPatientApiRoutes() {
  const app = new Hono()

  /**
   * GET /api/patients
   * Returns the full sample patient dataset enriched with OpenEHR metadata.
   * In production this would query the EHR store and join with demographics.
   */
  app.get('/', async (c) => {
    try {
      // Merge sample data with actual EHR IDs from the database
      const ehrRows = await db.select({ id: ehr.id }).from(ehr)
      const ehrIds = ehrRows.map(r => r.id)

      // Return sample patients, marking which ones have real EHR records
      const patients = SAMPLE_PATIENTS.map((p, idx) => ({
        ...p,
        ehrId: ehrIds[idx] ?? p.ehrId,   // use real ID if available
        _hasRealEhr: !!ehrIds[idx],
      }))
      return c.json(patients)
    } catch {
      // Fallback to pure sample data if DB is unavailable
      return c.json(SAMPLE_PATIENTS)
    }
  })

  /**
   * GET /api/patients/:ehrId
   * Returns a single patient's full record.
   */
  app.get('/:ehrId', (c) => {
    const ehrId  = c.req.param('ehrId')
    const patient = SAMPLE_PATIENTS.find(p => p.ehrId === ehrId)
    if (!patient) return c.json({ detail: `Patient not found: ${ehrId}` }, 404)
    return c.json(patient)
  })

  /**
   * GET /api/patients/:ehrId/vitals
   * Returns a 24-hour vital sign trend for the patient.
   * Data is simulated in demo mode — in production would query OpenEHR compositions.
   */
  app.get('/:ehrId/vitals', (c) => {
    const ehrId  = c.req.param('ehrId')
    const patient = SAMPLE_PATIENTS.find(p => p.ehrId === ehrId)
    if (!patient) return c.json({ detail: `Patient not found: ${ehrId}` }, 404)
    return c.json(generateVitalTrend(patient))
  })

  /**
   * POST /api/seed
   * Seeds the OpenEHR store with sample patient EHRs.
   * Creates one EHR per sample patient so the AQL queries return real results.
   */
  app.post('/seed', async (c) => {
    try {
      const { DrizzleEhrRepository } = await import('../../infrastructure/database/repositories/EhrRepository.ts')
      let count = 0
      for (const patient of SAMPLE_PATIENTS) {
        try {
          const repo = new DrizzleEhrRepository(db)
          await repo.create(patient.ehrId, patient.subjectId, 'local', patient.vitals !== undefined, true)
          count++

          // Broadcast a simulated admission event for this patient
          broadcast({
            id:          crypto.randomUUID(),
            type:        'admission',
            patientId:   patient.ehrId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            ward:        patient.ward,
            message:     `Seed: EHR created for ${patient.firstName} ${patient.lastName}`,
            severity:    'info',
            timestamp:   new Date().toISOString(),
          })
        } catch {
          // Skip if already exists
        }
      }
      return c.json({ message: `Seeded ${count} patient EHRs`, count })
    } catch (e) {
      return c.json({ detail: String(e) }, 500)
    }
  })

  return app
}
