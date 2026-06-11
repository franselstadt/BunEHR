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
 *  GET  /v1/finance/accounts   Chart of accounts
 *  POST /v1/finance/accounts   Create account
 *  POST /v1/finance/journal-entries   Post balanced journal entry
 *  GET  /v1/finance/general-ledger     Ledger lines by account/date
 *  GET  /v1/finance/trial-balance      Trial balance snapshot
 *  GET  /v1/finance/audit              Finance and Rx audit events
 *  GET  /v1/prescriptions              List prescriptions
 *  POST /v1/prescriptions              Create prescription
 *  GET  /v1/prescriptions/:id          Get prescription + fills
 *  POST /v1/prescriptions/:id/fills    Record dispense event
 *  GET  /v1/medicare/:ehr_id   Get Medicare eligibility for a patient
 *  PUT  /v1/medicare/:ehr_id   Upsert Medicare eligibility
 *  POST /api/seed-clinical     Seed ICD-10 + procedure + finance data
 *
 * Made by Frans Elstadt in San Francisco.
 */
import { Hono } from 'hono'
import { eq, and, ilike, sql, desc, gte, lte } from 'drizzle-orm'
import { db } from '../../infrastructure/database/client.ts'
import {
  icd10Code, procedureCode, icd10ProcedureMap,
  financialRecord, medicareEligibility, ehr,
  glAccount, glJournalEntry, glJournalLine, auditEvent,
  prescription, prescriptionFill,
} from '../../infrastructure/database/schema.ts'
import {
  ICD10_CODES, PROCEDURE_CODES, ICD10_PROCEDURE_MAPS,
  SAMPLE_FINANCIAL_RECORDS, SAMPLE_MEDICARE,
  GL_ACCOUNTS,
} from '../../infrastructure/seed/ClinicalSeedData.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

export function createClinicalFinanceController() {
  const app = new Hono()
  const toMoney = (value: unknown) => Number(Number(value ?? 0).toFixed(2))
  const entryNumber = () => `JE-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  const logAudit = async (
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    action: string,
    payload: Record<string, unknown>,
    actor = 'system',
  ) => {
    await db.insert(auditEvent).values({
      id: newUuid(),
      eventType,
      aggregateType,
      aggregateId,
      action,
      actor,
      payload,
      createdAt: new Date(),
    })
  }

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

  // ── Chart of Accounts / Journals / Ledger ──────────────────────────────────

  app.get('/finance/accounts', async (c) => {
    const type = c.req.query('type')
    const rows = await db.select().from(glAccount)
      .where(type ? eq(glAccount.type, type) : undefined)
      .orderBy(glAccount.code)
    return c.json(rows)
  })

  app.post('/finance/accounts', async (c) => {
    const body = await c.req.json() as Record<string, unknown>
    if (!body.code || !body.name || !body.type) {
      return c.json({ detail: 'code, name and type are required' }, 400)
    }
    const id = newUuid()
    await db.insert(glAccount).values({
      id,
      code: String(body.code),
      name: String(body.name),
      type: String(body.type).toUpperCase(),
      parentId: body.parent_id ? String(body.parent_id) : null,
      isActive: body.is_active === undefined ? true : Boolean(body.is_active),
      createdAt: new Date(),
    })
    await logAudit('ACCOUNT', 'GL_ACCOUNT', id, 'CREATE', body)
    const row = await db.select().from(glAccount).where(eq(glAccount.id, id)).limit(1)
    return c.json(row[0], 201)
  })

  app.post('/finance/journal-entries', async (c) => {
    const body = await c.req.json() as {
      entry_date?: string
      description?: string
      source_type?: string
      source_id?: string
      posted_by?: string
      lines?: Array<{ account_id?: string; debit?: number; credit?: number; description?: string }>
    }

    if (!body.description || !body.lines || body.lines.length < 2) {
      return c.json({ detail: 'description and at least two lines are required' }, 400)
    }
    const totalDebit = body.lines.reduce((s, l) => s + toMoney(l.debit), 0)
    const totalCredit = body.lines.reduce((s, l) => s + toMoney(l.credit), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return c.json({ detail: `Unbalanced entry. debit=${totalDebit} credit=${totalCredit}` }, 422)
    }
    if (body.lines.some(l => !l.account_id)) {
      return c.json({ detail: 'Every line must specify account_id' }, 400)
    }

    const journalId = newUuid()
    const number = entryNumber()
    await db.transaction(async (tx) => {
      await tx.insert(glJournalEntry).values({
        id: journalId,
        entryNumber: number,
        entryDate: body.entry_date ? new Date(body.entry_date) : new Date(),
        description: body.description!,
        sourceType: body.source_type ?? null,
        sourceId: body.source_id ?? null,
        postedBy: body.posted_by ?? 'system',
        status: 'POSTED',
      })

      for (let i = 0; i < body.lines!.length; i++) {
        const line = body.lines![i]!
        await tx.insert(glJournalLine).values({
          id: newUuid(),
          journalEntryId: journalId,
          accountId: line.account_id!,
          lineNumber: i + 1,
          description: line.description ?? null,
          debit: toMoney(line.debit).toString(),
          credit: toMoney(line.credit).toString(),
        })
      }
    })

    await logAudit('JOURNAL', 'GL_JOURNAL_ENTRY', journalId, 'POST', {
      entry_number: number,
      description: body.description,
      line_count: body.lines.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
    }, body.posted_by ?? 'system')

    const entry = await db.select().from(glJournalEntry).where(eq(glJournalEntry.id, journalId)).limit(1)
    const lines = await db.select().from(glJournalLine).where(eq(glJournalLine.journalEntryId, journalId)).orderBy(glJournalLine.lineNumber)
    return c.json({ ...entry[0], lines }, 201)
  })

  app.get('/finance/general-ledger', async (c) => {
    const accountId = c.req.query('account_id')
    const from = c.req.query('from')
    const to = c.req.query('to')

    const conditions = []
    if (accountId) conditions.push(eq(glJournalLine.accountId, accountId))
    if (from) conditions.push(gte(glJournalEntry.entryDate, new Date(from)))
    if (to) conditions.push(lte(glJournalEntry.entryDate, new Date(to)))

    const rows = await db.select({
      entryId: glJournalEntry.id,
      entryNumber: glJournalEntry.entryNumber,
      entryDate: glJournalEntry.entryDate,
      entryDescription: glJournalEntry.description,
      lineId: glJournalLine.id,
      lineNumber: glJournalLine.lineNumber,
      accountId: glJournalLine.accountId,
      debit: glJournalLine.debit,
      credit: glJournalLine.credit,
      lineDescription: glJournalLine.description,
      accountCode: glAccount.code,
      accountName: glAccount.name,
      accountType: glAccount.type,
    })
      .from(glJournalLine)
      .innerJoin(glJournalEntry, eq(glJournalLine.journalEntryId, glJournalEntry.id))
      .innerJoin(glAccount, eq(glJournalLine.accountId, glAccount.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(glJournalEntry.entryDate, glJournalEntry.entryNumber, glJournalLine.lineNumber)

    return c.json({ results: rows })
  })

  app.get('/finance/trial-balance', async (c) => {
    const asOf = c.req.query('as_of')
    const rows = await db.select({
      accountId: glAccount.id,
      accountCode: glAccount.code,
      accountName: glAccount.name,
      accountType: glAccount.type,
      debit: sql<string>`coalesce(sum(${glJournalLine.debit}), '0')`,
      credit: sql<string>`coalesce(sum(${glJournalLine.credit}), '0')`,
    })
      .from(glAccount)
      .leftJoin(glJournalLine, eq(glJournalLine.accountId, glAccount.id))
      .leftJoin(glJournalEntry, eq(glJournalLine.journalEntryId, glJournalEntry.id))
      .where(asOf ? lte(glJournalEntry.entryDate, new Date(asOf)) : undefined)
      .groupBy(glAccount.id, glAccount.code, glAccount.name, glAccount.type)
      .orderBy(glAccount.code)

    const totals = rows.reduce((acc, r) => ({
      debit: acc.debit + Number(r.debit),
      credit: acc.credit + Number(r.credit),
    }), { debit: 0, credit: 0 })

    return c.json({
      asOf: asOf ?? null,
      entries: rows.map((r) => ({
        ...r,
        debit: toMoney(r.debit),
        credit: toMoney(r.credit),
        balance: toMoney(Number(r.debit) - Number(r.credit)),
      })),
      totals: {
        debit: toMoney(totals.debit),
        credit: toMoney(totals.credit),
        inBalance: Math.abs(totals.debit - totals.credit) < 0.001,
      },
    })
  })

  app.get('/finance/audit', async (c) => {
    const aggregateType = c.req.query('aggregate_type')
    const aggregateId = c.req.query('aggregate_id')
    const eventType = c.req.query('event_type')
    const limit = Math.min(parseInt(c.req.query('limit') ?? '100', 10), 500)

    const conditions = []
    if (aggregateType) conditions.push(eq(auditEvent.aggregateType, aggregateType))
    if (aggregateId) conditions.push(eq(auditEvent.aggregateId, aggregateId))
    if (eventType) conditions.push(eq(auditEvent.eventType, eventType))

    const rows = await db.select().from(auditEvent)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditEvent.createdAt))
      .limit(limit)
    return c.json({ results: rows })
  })

  // ── Prescriptions ───────────────────────────────────────────────────────────

  app.get('/prescriptions', async (c) => {
    const ehrId = c.req.query('ehr_id')
    const status = c.req.query('status')
    const limit = Math.min(parseInt(c.req.query('limit') ?? '100', 10), 500)

    const conditions = []
    if (ehrId) conditions.push(eq(prescription.ehrId, ehrId))
    if (status) conditions.push(eq(prescription.status, status))

    const rows = await db.select().from(prescription)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prescription.createdAt))
      .limit(limit)
    return c.json({ results: rows })
  })

  app.post('/prescriptions', async (c) => {
    const body = await c.req.json() as Record<string, unknown>
    if (!body.ehr_id || !body.medication_name || !body.dose || !body.route || !body.frequency || !body.quantity || !body.prescriber_name) {
      return c.json({ detail: 'ehr_id, medication_name, dose, route, frequency, quantity and prescriber_name are required' }, 400)
    }
    const exists = await db.select({ id: ehr.id }).from(ehr).where(eq(ehr.id, String(body.ehr_id))).limit(1)
    if (!exists[0]) return c.json({ detail: `EHR not found: ${String(body.ehr_id)}` }, 404)

    const id = newUuid()
    const rxNumber = `RX-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    await db.insert(prescription).values({
      id,
      ehrId: String(body.ehr_id),
      compositionId: body.composition_id ? String(body.composition_id) : null,
      rxNumber,
      medicationCode: body.medication_code ? String(body.medication_code) : null,
      medicationName: String(body.medication_name),
      dose: String(body.dose),
      route: String(body.route),
      frequency: String(body.frequency),
      quantity: toMoney(body.quantity).toString(),
      refills: Number(body.refills ?? 0),
      status: String(body.status ?? 'ACTIVE').toUpperCase(),
      startDate: new Date(String(body.start_date ?? new Date().toISOString())),
      endDate: body.end_date ? new Date(String(body.end_date)) : null,
      prescriberName: String(body.prescriber_name),
      notes: body.notes ? String(body.notes) : null,
      updatedAt: new Date(),
    })

    await logAudit('PRESCRIPTION', 'PRESCRIPTION', id, 'CREATE', {
      ehr_id: body.ehr_id,
      medication_name: body.medication_name,
      quantity: body.quantity,
    }, String(body.prescriber_name))

    const row = await db.select().from(prescription).where(eq(prescription.id, id)).limit(1)
    return c.json(row[0], 201)
  })

  app.get('/prescriptions/:id', async (c) => {
    const id = c.req.param('id')
    const rxRows = await db.select().from(prescription).where(eq(prescription.id, id)).limit(1)
    if (!rxRows[0]) return c.json({ detail: `Prescription not found: ${id}` }, 404)
    const fills = await db.select().from(prescriptionFill).where(eq(prescriptionFill.prescriptionId, id)).orderBy(desc(prescriptionFill.filledAt))
    return c.json({ ...rxRows[0], fills })
  })

  app.post('/prescriptions/:id/fills', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json() as Record<string, unknown>
    const rxRows = await db.select().from(prescription).where(eq(prescription.id, id)).limit(1)
    if (!rxRows[0]) return c.json({ detail: `Prescription not found: ${id}` }, 404)
    if (!body.quantity_dispensed || !body.pharmacy_name) {
      return c.json({ detail: 'quantity_dispensed and pharmacy_name are required' }, 400)
    }

    const fillId = newUuid()
    await db.insert(prescriptionFill).values({
      id: fillId,
      prescriptionId: id,
      filledAt: body.filled_at ? new Date(String(body.filled_at)) : new Date(),
      quantityDispensed: toMoney(body.quantity_dispensed).toString(),
      pharmacyName: String(body.pharmacy_name),
      dispensedBy: body.dispensed_by ? String(body.dispensed_by) : null,
      status: String(body.status ?? 'FILLED'),
      notes: body.notes ? String(body.notes) : null,
    })

    await logAudit('PRESCRIPTION_FILL', 'PRESCRIPTION', id, 'FILL', {
      fill_id: fillId,
      quantity_dispensed: body.quantity_dispensed,
      pharmacy_name: body.pharmacy_name,
    }, String(body.dispensed_by ?? 'pharmacy'))

    const fill = await db.select().from(prescriptionFill).where(eq(prescriptionFill.id, fillId)).limit(1)
    return c.json(fill[0], 201)
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
    let icd10Count = 0, cptCount = 0, mapCount = 0, financeCount = 0, medicareCount = 0, glAccountCount = 0

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

    // Chart of accounts
    for (const account of GL_ACCOUNTS) {
      try {
        await db.insert(glAccount).values({
          id: newUuid(),
          code: account.code,
          name: account.name,
          type: account.type,
        }).onConflictDoNothing()
        glAccountCount++
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
      glAccounts: glAccountCount,
    })
  })

  return app
}
