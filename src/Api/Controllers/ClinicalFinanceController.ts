/**
 * Clinical Finance & ICD-10 Routes
 *
 * Exposes:
 *  GET  /v1/icd10              Search ICD-10 codes (full-text + category filter)
 *  GET  /v1/icd10/:code        Get a specific ICD-10 code with linked procedures
 *  GET  /v1/procedures         List CPT procedure codes (with costs)
 *  GET  /v1/procedures/:code   Get a specific procedure + Medicare rate
 *  GET  /v1/finance            List financial records (filterable)
 *  POST /v1/finance            Create a financial record
 *  GET  /v1/finance/summary    Financial summary (totals, outstanding, etc.)
 *  GET  /v1/medicare/:ehr_id   Get Medicare eligibility for a patient
 *  PUT  /v1/medicare/:ehr_id   Upsert Medicare eligibility
 *  POST /api/seed-clinical     Seed ICD-10 + procedure + finance data
 *
 * Made by Frans Elstadt in San Francisco.
 */
import { Hono } from 'hono'
import { eq, like, and, ilike, sql } from 'drizzle-orm'
import { db } from '../../infrastructure/database/client.ts'
import {
  icd10Code, procedureCode, icd10ProcedureMap,
  financialRecord, medicareEligibility, ehr,
} from '../../infrastructure/database/schema.ts'
import {
  ICD10_CODES, PROCEDURE_CODES, ICD10_PROCEDURE_MAPS,
  SAMPLE_FINANCIAL_RECORDS, SAMPLE_MEDICARE,
} from '../../infrastructure/seed/ClinicalSeedData.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

export function createClinicalFinanceController() {
  const app = new Hono()

  // ── ICD-10 ───────────────────────────────────────────────────────────────

  /**
   * GET /v1/icd10
   * Search ICD-10 codes. Supports:
   *   ?q=hypertension       — full-text search on description
   *   ?category=I           — filter by category chapter
   *   ?billable=true        — filter billable only
   *   ?limit=50&offset=0    — pagination
   */
  app.get('/icd10', async (c) => {
    const q        = c.req.query('q') ?? ''
    const category = c.req.query('category')
    const billable = c.req.query('billable')
    const limit    = parseInt(c.req.query('limit') ?? '50', 10)
    const offset   = parseInt(c.req.query('offset') ?? '0', 10)

    const conditions = []
    if (q)        conditions.push(ilike(icd10Code.description, `%${q}%`))
    if (category) conditions.push(eq(icd10Code.category, category))
    if (billable !== undefined) conditions.push(eq(icd10Code.billable, billable === 'true'))

    const rows = await db.select().from(icd10Code)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(Math.min(limit, 200))
      .offset(offset)
      .orderBy(icd10Code.code)

    const total = await db.select({ count: sql<number>`count(*)` }).from(icd10Code)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    return c.json({
      results: rows,
      total: Number(total[0]?.count ?? 0),
      limit,
      offset,
    })
  })

  /**
   * GET /v1/icd10/categories
   * Returns all available ICD-10 chapter categories.
   */
  app.get('/icd10/categories', async (c) => {
    const rows = await db
      .selectDistinct({ category: icd10Code.category, description: icd10Code.categoryDescription })
      .from(icd10Code)
      .orderBy(icd10Code.category)
    return c.json(rows)
  })

  /**
   * GET /v1/icd10/:code
   * Get a specific ICD-10 code with its linked CPT procedure codes and Medicare rates.
   */
  app.get('/icd10/:code', async (c) => {
    const code = c.req.param('code')
    const rows = await db.select().from(icd10Code).where(eq(icd10Code.code, code)).limit(1)
    if (!rows[0]) return c.json({ detail: `ICD-10 code not found: ${code}` }, 404)

    const procedures = await db
      .select({
        relationship: icd10ProcedureMap.relationship,
        code: procedureCode.code,
        description: procedureCode.description,
        category: procedureCode.category,
        medicareRate: procedureCode.medicareRate,
        typicalCharge: procedureCode.typicalCharge,
        rvuWork: procedureCode.rvuWork,
      })
      .from(icd10ProcedureMap)
      .innerJoin(procedureCode, eq(icd10ProcedureMap.procedureCode, procedureCode.code))
      .where(eq(icd10ProcedureMap.icd10Code, code))
      .orderBy(icd10ProcedureMap.relationship)

    return c.json({ ...rows[0], linkedProcedures: procedures })
  })

  // ── Procedure Codes ───────────────────────────────────────────────────────

  /**
   * GET /v1/procedures
   * List CPT procedure codes with costs and Medicare rates.
   *   ?q=echocardiogram     — search description
   *   ?category=Cardiology  — filter by specialty category
   */
  app.get('/procedures', async (c) => {
    const q        = c.req.query('q') ?? ''
    const category = c.req.query('category')
    const limit    = parseInt(c.req.query('limit') ?? '50', 10)
    const offset   = parseInt(c.req.query('offset') ?? '0', 10)

    const conditions = []
    if (q)        conditions.push(ilike(procedureCode.description, `%${q}%`))
    if (category) conditions.push(eq(procedureCode.category, category))

    const rows = await db.select().from(procedureCode)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(Math.min(limit, 200))
      .offset(offset)
      .orderBy(procedureCode.code)

    return c.json({ results: rows, limit, offset })
  })

  /**
   * GET /v1/procedures/categories
   * All specialty categories.
   */
  app.get('/procedures/categories', async (c) => {
    const rows = await db
      .selectDistinct({ category: procedureCode.category })
      .from(procedureCode)
      .orderBy(procedureCode.category)
    return c.json(rows.map(r => r.category))
  })

  /**
   * GET /v1/procedures/:code
   * Get a specific CPT code with linked ICD-10 diagnoses.
   */
  app.get('/procedures/:code', async (c) => {
    const code = c.req.param('code')
    const rows = await db.select().from(procedureCode).where(eq(procedureCode.code, code)).limit(1)
    if (!rows[0]) return c.json({ detail: `Procedure code not found: ${code}` }, 404)

    const diagnoses = await db
      .select({
        relationship: icd10ProcedureMap.relationship,
        code: icd10Code.code,
        description: icd10Code.description,
        category: icd10Code.category,
      })
      .from(icd10ProcedureMap)
      .innerJoin(icd10Code, eq(icd10ProcedureMap.icd10Code, icd10Code.code))
      .where(eq(icd10ProcedureMap.procedureCode, code))

    return c.json({ ...rows[0], linkedDiagnoses: diagnoses })
  })

  // ── Financial Records ─────────────────────────────────────────────────────

  /**
   * GET /v1/finance/summary
   * Hospital-wide financial summary.
   */
  app.get('/finance/summary', async (c) => {
    const rows = await db.select().from(financialRecord)
    const total   = rows.reduce((s, r) => s + Number(r.billedAmount ?? 0), 0)
    const collected = rows.reduce((s, r) => s + Number(r.insurancePayment ?? 0) + Number(r.patientPayment ?? 0), 0)
    const outstanding = rows.reduce((s, r) => s + Number(r.balance ?? 0), 0)
    // Use array to avoid snake_case middleware mangling status keys (PAID→_PAID etc.)
    const statusMap = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))
    const medicareRows = await db.select().from(medicareEligibility).where(eq(medicareEligibility.status, 'ELIGIBLE'))

    return c.json({
      totalBilled:          parseFloat(total.toFixed(2)),
      totalCollected:       parseFloat(collected.toFixed(2)),
      totalOutstanding:     parseFloat(outstanding.toFixed(2)),
      collectionRate:       total > 0 ? parseFloat(((collected / total) * 100).toFixed(1)) : 0,
      claimCount:           rows.length,
      medicareEligibleCount: medicareRows.length,
      byStatus,
    })
  })

  /**
   * GET /v1/finance
   * List financial records with optional filters:
   *   ?ehr_id=xxx     — filter by patient
   *   ?status=PENDING — filter by claim status
   *   ?icd10=I10      — filter by diagnosis code
   */
  app.get('/finance', async (c) => {
    const ehrId  = c.req.query('ehr_id')
    const status = c.req.query('status')
    const icd10  = c.req.query('icd10')
    const limit  = parseInt(c.req.query('limit') ?? '50', 10)
    const offset = parseInt(c.req.query('offset') ?? '0', 10)

    const conditions = []
    if (ehrId)  conditions.push(eq(financialRecord.ehrId, ehrId))
    if (status) conditions.push(eq(financialRecord.status, status))
    if (icd10)  conditions.push(eq(financialRecord.icd10Code, icd10))

    const rows = await db.select().from(financialRecord)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(Math.min(limit, 200))
      .offset(offset)
      .orderBy(financialRecord.serviceDate)

    return c.json({ results: rows, limit, offset })
  })

  /**
   * POST /v1/finance
   * Create a new financial record (billing entry).
   */
  app.post('/finance', async (c) => {
    const body = await c.req.json() as Record<string, unknown>
    const ehrRows = await db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, body.ehr_id as string)).limit(1)
    if (!ehrRows[0]) return c.json({ detail: `EHR not found: ${body.ehr_id}` }, 404)

    const billed = Number(body.billed_amount ?? 0)
    const insurance = Number(body.insurance_payment ?? 0)
    const patientPay = Number(body.patient_payment ?? 0)
    const balance = billed - insurance - patientPay

    const id = newUuid()
    await db.insert(financialRecord).values({
      id,
      ehrId:             body.ehr_id as string,
      compositionId:     body.composition_id as string | null ?? null,
      icd10Code:         body.icd10_code as string | null ?? null,
      procedureCode:     body.procedure_code as string | null ?? null,
      claimNumber:       body.claim_number as string | null ?? null,
      serviceDate:       new Date(body.service_date as string ?? new Date()),
      billedAmount:      billed.toString(),
      allowedAmount:     body.allowed_amount ? Number(body.allowed_amount).toString() : null,
      patientResponsibility: body.patient_responsibility ? Number(body.patient_responsibility).toString() : null,
      insurancePayment:  insurance.toString(),
      patientPayment:    patientPay.toString(),
      balance:           balance.toString(),
      status:            (body.status as string) ?? 'PENDING',
      payer:             body.payer as string | null ?? null,
      payerId:           body.payer_id as string | null ?? null,
      notes:             body.notes as string | null ?? null,
    })

    const created = await db.select().from(financialRecord).where(eq(financialRecord.id, id)).limit(1)
    return c.json(created[0], 201)
  })

  // ── Medicare Eligibility ───────────────────────────────────────────────────

  /**
   * GET /v1/medicare/:ehr_id
   * Get Medicare eligibility status for a patient.
   */
  app.get('/medicare/:ehr_id', async (c) => {
    const ehrId = c.req.param('ehr_id')
    const rows = await db.select().from(medicareEligibility).where(eq(medicareEligibility.ehrId, ehrId)).limit(1)
    if (!rows[0]) return c.json({ ehr_id: ehrId, status: 'UNKNOWN', part_a: false, part_b: false, part_c: false, part_d: false })
    return c.json(rows[0])
  })

  /**
   * PUT /v1/medicare/:ehr_id
   * Upsert Medicare eligibility for a patient.
   */
  app.put('/medicare/:ehr_id', async (c) => {
    const ehrId = c.req.param('ehr_id')
    const body  = await c.req.json() as Record<string, unknown>
    const ehrRows = await db.select({ id: ehr.id, subjectId: ehr.subjectId }).from(ehr).where(eq(ehr.id, ehrId)).limit(1)
    if (!ehrRows[0]) return c.json({ detail: `EHR not found: ${ehrId}` }, 404)

    const existing = await db.select({ id: medicareEligibility.id }).from(medicareEligibility).where(eq(medicareEligibility.ehrId, ehrId)).limit(1)

    const values = {
      ehrId,
      subjectId:       ehrRows[0].subjectId,
      medicareId:      body.medicare_id as string | null ?? null,
      partA:           Boolean(body.part_a ?? false),
      partB:           Boolean(body.part_b ?? false),
      partC:           Boolean(body.part_c ?? false),
      partD:           Boolean(body.part_d ?? false),
      effectiveDate:   body.effective_date ? new Date(body.effective_date as string) : null,
      terminationDate: body.termination_date ? new Date(body.termination_date as string) : null,
      planName:        body.plan_name as string | null ?? null,
      groupNumber:     body.group_number as string | null ?? null,
      verifiedAt:      new Date(),
      status:          (body.status as string) ?? 'UNKNOWN',
    }

    if (existing[0]) {
      await db.update(medicareEligibility).set(values).where(eq(medicareEligibility.ehrId, ehrId))
    } else {
      await db.insert(medicareEligibility).values({ id: newUuid(), ...values })
    }

    const result = await db.select().from(medicareEligibility).where(eq(medicareEligibility.ehrId, ehrId)).limit(1)
    return c.json(result[0])
  })

  // ── Clinical Seed ─────────────────────────────────────────────────────────

  /**
   * POST /api/seed-clinical
   * Seeds ICD-10 codes, CPT procedure codes, procedure mappings,
   * sample financial records, and Medicare eligibility data.
   */
  app.post('/seed-clinical', async (c) => {
    let icd10Count = 0, cptCount = 0, mapCount = 0, financeCount = 0, medicareCount = 0

    // ICD-10 codes
    for (const code of ICD10_CODES) {
      try {
        await db.insert(icd10Code).values({
          code:                code.code,
          description:         code.description,
          category:            code.category,
          categoryDescription: code.categoryDescription,
          billable:            code.billable,
        }).onConflictDoNothing()
        icd10Count++
      } catch { /* skip duplicates */ }
    }

    // CPT procedure codes
    for (const proc of PROCEDURE_CODES) {
      try {
        await db.insert(procedureCode).values({
          code:            proc.code,
          description:     proc.description,
          category:        proc.category,
          medicareRate:    proc.medicareRate?.toString() ?? null,
          typicalCharge:   proc.typicalCharge?.toString() ?? null,
          facilityFee:     proc.facilityFee?.toString() ?? null,
          nonFacilityFee:  proc.nonFacilityFee?.toString() ?? null,
          rvuWork:         proc.rvuWork?.toString() ?? null,
          rvuTotal:        proc.rvuTotal?.toString() ?? null,
        }).onConflictDoNothing()
        cptCount++
      } catch { /* skip */ }
    }

    // ICD-10 → Procedure mappings
    for (const map of ICD10_PROCEDURE_MAPS) {
      try {
        await db.insert(icd10ProcedureMap).values({
          id: newUuid(), icd10Code: map.icd10Code, procedureCode: map.procedureCode, relationship: map.relationship,
        }).onConflictDoNothing()
        mapCount++
      } catch { /* skip */ }
    }

    // Financial records (only for EHRs that exist)
    for (const rec of SAMPLE_FINANCIAL_RECORDS) {
      try {
        const ehrRows = await db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, rec.ehrId)).limit(1)
        if (!ehrRows[0]) continue
        const billed = rec.billed
        const balance = billed - rec.insurance - rec.patient
        await db.insert(financialRecord).values({
          id: newUuid(), ehrId: rec.ehrId,
          icd10Code: rec.icd10, procedureCode: rec.cpt,
          serviceDate: new Date(rec.serviceDate),
          billedAmount: billed.toString(), allowedAmount: rec.allowed.toString(),
          insurancePayment: rec.insurance.toString(), patientPayment: rec.patient.toString(),
          patientResponsibility: rec.patient.toString(),
          balance: balance.toString(), status: rec.status, payer: rec.payer,
        })
        financeCount++
      } catch { /* skip */ }
    }

    // Medicare eligibility
    for (const med of SAMPLE_MEDICARE) {
      try {
        const ehrRows = await db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, med.ehrId)).limit(1)
        if (!ehrRows[0]) continue
        await db.insert(medicareEligibility).values({
          id: newUuid(), ehrId: med.ehrId, subjectId: med.subjectId,
          medicareId: med.medicareId, partA: med.partA, partB: med.partB,
          partC: med.partC, partD: med.partD, status: med.status,
          planName: med.planName,
          effectiveDate: med.effectiveDate ? new Date(med.effectiveDate) : null,
        }).onConflictDoNothing()
        medicareCount++
      } catch { /* skip */ }
    }

    return c.json({
      message: 'Clinical data seeded successfully',
      icd10Codes: icd10Count, procedureCodes: cptCount,
      mappings: mapCount, financialRecords: financeCount, medicareRecords: medicareCount,
    })
  })

  return app
}
