import {
  pgTable, text, boolean, timestamp, jsonb, index, uniqueIndex,
  numeric,
  integer,
} from 'drizzle-orm/pg-core'

// ── EHR ──────────────────────────────────────────────────────────────────────

export const ehr = pgTable('ehr', {
  id:               text('id').primaryKey(),
  subjectId:        text('subject_id').notNull(),
  subjectNamespace: text('subject_namespace').notNull().default('local'),
  systemId:         text('system_id').notNull().default('local.bunehr.com'),
  isQueryable:      boolean('is_queryable').notNull().default(true),
  isModifiable:     boolean('is_modifiable').notNull().default(true),
  timeCreated:      timestamp('time_created', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_ehr_subject').on(t.subjectId, t.subjectNamespace),
  index('idx_ehr_subject').on(t.subjectId, t.subjectNamespace),
])

// ── EHR_STATUS ────────────────────────────────────────────────────────────────

export const ehrStatus = pgTable('ehr_status', {
  id:                 text('id').primaryKey(),
  ehrId:              text('ehr_id').notNull().references(() => ehr.id, { onDelete: 'cascade' }),
  uid:                text('uid').notNull(),
  versionId:          text('version_id').notNull(),
  precedingVersionUid: text('preceding_version_uid'),
  isQueryable:        boolean('is_queryable').notNull().default(true),
  isModifiable:       boolean('is_modifiable').notNull().default(true),
  subjectId:          text('subject_id').notNull(),
  subjectNamespace:   text('subject_namespace').notNull().default('local'),
  otherDetails:       jsonb('other_details'),
  lifecycleState:     text('lifecycle_state').notNull().default('ACTIVE'),
  commitAudit:        jsonb('commit_audit'),
  timeCommitted:      timestamp('time_committed', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_ehr_status_ehr').on(t.ehrId),
  index('idx_ehr_status_time').on(t.ehrId, t.timeCommitted),
])

// ── COMPOSITION ───────────────────────────────────────────────────────────────

export const composition = pgTable('composition', {
  id:                 text('id').primaryKey(),
  ehrId:              text('ehr_id').notNull().references(() => ehr.id, { onDelete: 'cascade' }),
  uid:                text('uid').notNull(),
  versionId:          text('version_id').notNull(),
  precedingVersionUid: text('preceding_version_uid'),
  templateId:         text('template_id').notNull(),
  archetypeId:        text('archetype_id'),
  languageCode:       text('language_code').notNull().default('en'),
  territoryCode:      text('territory_code').notNull().default('US'),
  category:           text('category').notNull().default('event'),
  lifecycleState:     text('lifecycle_state').notNull().default('COMPLETE'),
  composerName:       text('composer_name').notNull(),
  composerId:         text('composer_id'),
  content:            jsonb('content').notNull(),
  commitAudit:        jsonb('commit_audit'),
  timeCommitted:      timestamp('time_committed', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_composition_ehr').on(t.ehrId),
  index('idx_composition_uid').on(t.uid),
  index('idx_composition_template').on(t.templateId),
  index('idx_composition_state').on(t.lifecycleState),
  index('idx_composition_time').on(t.ehrId, t.timeCommitted),
])

// ── CONTRIBUTION ──────────────────────────────────────────────────────────────

export const contribution = pgTable('contribution', {
  id:            text('id').primaryKey(),
  ehrId:         text('ehr_id').notNull().references(() => ehr.id, { onDelete: 'cascade' }),
  uid:           text('uid').notNull(),
  auditType:     text('audit_type').notNull().default('CREATION'),
  auditorId:     text('auditor_id'),
  auditorName:   text('auditor_name'),
  systemId:      text('system_id').notNull().default('local.bunehr.com'),
  timeCommitted: timestamp('time_committed', { withTimezone: true }).notNull().defaultNow(),
  description:   text('description'),
}, (t) => [
  index('idx_contribution_ehr').on(t.ehrId),
  index('idx_contribution_uid').on(t.uid),
])

export const contributionVersion = pgTable('contribution_version', {
  id:             text('id').primaryKey(),
  contributionId: text('contribution_id').notNull().references(() => contribution.id, { onDelete: 'cascade' }),
  versionId:      text('version_id').notNull(),
  type:           text('type').notNull(),
})

// ── DIRECTORY ─────────────────────────────────────────────────────────────────

export const directory = pgTable('directory', {
  id:                 text('id').primaryKey(),
  ehrId:              text('ehr_id').notNull().unique().references(() => ehr.id, { onDelete: 'cascade' }),
  uid:                text('uid').notNull(),
  versionId:          text('version_id').notNull(),
  precedingVersionUid: text('preceding_version_uid'),
  name:               text('name').notNull().default('root'),
  archetypeId:        text('archetype_id'),
  items:              jsonb('items'),
  timeCreated:        timestamp('time_created', { withTimezone: true }).notNull().defaultNow(),
  timeCommitted:      timestamp('time_committed', { withTimezone: true }).notNull().defaultNow(),
})

// ── STORED QUERIES ────────────────────────────────────────────────────────────

export const storedQuery = pgTable('stored_query', {
  qualifiedName: text('qualified_name').primaryKey(),
  version:       text('version').notNull(),
  aqlQuery:      text('aql_query').notNull(),
  type:          text('type').notNull().default('aql'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── TEMPLATE DEFINITIONS ──────────────────────────────────────────────────────

export const templateDefinition = pgTable('template_definition', {
  templateId:  text('template_id').primaryKey(),
  version:     text('version'),
  adlVersion:  text('adl_version').notNull().default('1.4'),
  concept:     text('concept'),
  content:     text('content').notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── CLINICAL FINANCE & ICD-10 ─────────────────────────────────────────────────

export const icd10Code = pgTable('icd10_code', {
  code:                text('code').primaryKey(),
  description:         text('description').notNull(),
  category:            text('category').notNull(),
  categoryDescription: text('category_description').notNull(),
  billable:            boolean('billable').notNull().default(true),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_icd10_category').on(t.category),
])

export const procedureCode = pgTable('procedure_code', {
  code:            text('code').primaryKey(),
  description:     text('description').notNull(),
  category:        text('category').notNull(),
  medicareRate:    numeric('medicare_rate', { precision: 10, scale: 2 }),
  typicalCharge:   numeric('typical_charge', { precision: 10, scale: 2 }),
  facilityFee:     numeric('facility_fee', { precision: 10, scale: 2 }),
  nonFacilityFee:  numeric('non_facility_fee', { precision: 10, scale: 2 }),
  rvuWork:         numeric('rvu_work', { precision: 6, scale: 2 }),
  rvuTotal:        numeric('rvu_total', { precision: 6, scale: 2 }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_procedure_category').on(t.category),
])

export const icd10ProcedureMap = pgTable('icd10_procedure_map', {
  id:            text('id').primaryKey(),
  icd10Code:     text('icd10_code').notNull().references(() => icd10Code.code, { onDelete: 'cascade' }),
  procedureCode: text('procedure_code').notNull().references(() => procedureCode.code, { onDelete: 'cascade' }),
  relationship:  text('relationship').notNull().default('common'),
})

export const financialRecord = pgTable('financial_record', {
  id:                    text('id').primaryKey(),
  ehrId:                 text('ehr_id').notNull().references(() => ehr.id, { onDelete: 'cascade' }),
  compositionId:         text('composition_id'),
  icd10Code:             text('icd10_code').references(() => icd10Code.code),
  procedureCode:         text('procedure_code').references(() => procedureCode.code),
  claimNumber:           text('claim_number'),
  serviceDate:           timestamp('service_date', { withTimezone: true }).notNull(),
  billedAmount:          numeric('billed_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  allowedAmount:         numeric('allowed_amount', { precision: 10, scale: 2 }),
  patientResponsibility: numeric('patient_responsibility', { precision: 10, scale: 2 }).default('0'),
  insurancePayment:      numeric('insurance_payment', { precision: 10, scale: 2 }).default('0'),
  patientPayment:        numeric('patient_payment', { precision: 10, scale: 2 }).default('0'),
  balance:               numeric('balance', { precision: 10, scale: 2 }).default('0'),
  status:                text('status').notNull().default('PENDING'),
  payer:                 text('payer'),
  payerId:               text('payer_id'),
  notes:                 text('notes'),
  createdAt:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_financial_ehr').on(t.ehrId),
  index('idx_financial_status').on(t.status),
  index('idx_financial_date').on(t.serviceDate),
])

export const medicareEligibility = pgTable('medicare_eligibility', {
  id:              text('id').primaryKey(),
  ehrId:           text('ehr_id').notNull().unique().references(() => ehr.id, { onDelete: 'cascade' }),
  subjectId:       text('subject_id').notNull(),
  medicareId:      text('medicare_id'),
  partA:           boolean('part_a').default(false),
  partB:           boolean('part_b').default(false),
  partC:           boolean('part_c').default(false),
  partD:           boolean('part_d').default(false),
  effectiveDate:   timestamp('effective_date', { withTimezone: true }),
  terminationDate: timestamp('termination_date', { withTimezone: true }),
  planName:        text('plan_name'),
  groupNumber:     text('group_number'),
  verifiedAt:      timestamp('verified_at', { withTimezone: true }).defaultNow(),
  status:          text('status').notNull().default('UNKNOWN'),
})

// ── PATIENT PROFILE & VITALS ──────────────────────────────────────────────────

export const patientProfile = pgTable('patient_profile', {
  ehrId:             text('ehr_id').primaryKey().references(() => ehr.id, { onDelete: 'cascade' }),
  subjectId:         text('subject_id').notNull(),
  firstName:         text('first_name').notNull(),
  lastName:          text('last_name').notNull(),
  dateOfBirth:       text('date_of_birth').notNull(),
  gender:            text('gender').notNull(),
  bloodType:         text('blood_type').notNull(),
  ward:              text('ward').notNull(),
  room:              text('room').notNull(),
  admittedDate:      text('admitted_date').notNull(),
  status:            text('status').notNull(),
  primaryDiagnosis:  text('primary_diagnosis').notNull(),
  primaryClinician:  text('primary_clinician').notNull(),
  allergies:         text('allergies').array().notNull().default([]),
  locationLat:       numeric('location_lat', { precision: 9, scale: 6 }).notNull(),
  locationLng:       numeric('location_lng', { precision: 9, scale: 6 }).notNull(),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('uq_patient_profile_subject').on(t.subjectId),
  index('idx_patient_profile_ward').on(t.ward),
  index('idx_patient_profile_status').on(t.status),
])

export const patientVital = pgTable('patient_vital', {
  id:                     text('id').primaryKey(),
  ehrId:                  text('ehr_id').notNull().references(() => patientProfile.ehrId, { onDelete: 'cascade' }),
  bloodPressureSystolic:  integer('bp_systolic').notNull(),
  bloodPressureDiastolic: integer('bp_diastolic').notNull(),
  heartRate:              integer('heart_rate').notNull(),
  temperature:            numeric('temperature', { precision: 4, scale: 1 }).notNull(),
  oxygenSat:              integer('oxygen_sat').notNull(),
  respiratoryRate:        integer('respiratory_rate').notNull(),
  recordedAt:             timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_patient_vital_ehr_time').on(t.ehrId, t.recordedAt),
])

// ── GENERAL LEDGER & AUDIT ────────────────────────────────────────────────────

export const glAccount = pgTable('gl_account', {
  id:        text('id').primaryKey(),
  code:      text('code').notNull().unique(),
  name:      text('name').notNull(),
  type:      text('type').notNull(), // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  parentId:  text('parent_id'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_gl_account_type').on(t.type),
])

export const glJournalEntry = pgTable('gl_journal_entry', {
  id:          text('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(),
  entryDate:   timestamp('entry_date', { withTimezone: true }).notNull(),
  description: text('description').notNull(),
  sourceType:  text('source_type'),
  sourceId:    text('source_id'),
  postedBy:    text('posted_by').notNull().default('system'),
  status:      text('status').notNull().default('POSTED'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_gl_journal_entry_date').on(t.entryDate),
])

export const glJournalLine = pgTable('gl_journal_line', {
  id:            text('id').primaryKey(),
  journalEntryId: text('journal_entry_id').notNull().references(() => glJournalEntry.id, { onDelete: 'cascade' }),
  accountId:     text('account_id').notNull().references(() => glAccount.id),
  lineNumber:    integer('line_number').notNull(),
  description:   text('description'),
  debit:         numeric('debit', { precision: 14, scale: 2 }).notNull().default('0'),
  credit:        numeric('credit', { precision: 14, scale: 2 }).notNull().default('0'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_gl_journal_line_journal').on(t.journalEntryId),
  index('idx_gl_journal_line_account').on(t.accountId),
])

export const auditEvent = pgTable('audit_event', {
  id:            text('id').primaryKey(),
  eventType:     text('event_type').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId:   text('aggregate_id').notNull(),
  action:        text('action').notNull(),
  actor:         text('actor').notNull(),
  payload:       jsonb('payload'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_audit_event_aggregate').on(t.aggregateType, t.aggregateId),
  index('idx_audit_event_created').on(t.createdAt),
])

// ── PRESCRIPTIONS ─────────────────────────────────────────────────────────────

export const prescription = pgTable('prescription', {
  id:             text('id').primaryKey(),
  ehrId:          text('ehr_id').notNull().references(() => ehr.id, { onDelete: 'cascade' }),
  compositionId:  text('composition_id'),
  rxNumber:       text('rx_number').notNull().unique(),
  medicationCode: text('medication_code'),
  medicationName: text('medication_name').notNull(),
  dose:           text('dose').notNull(),
  route:          text('route').notNull(),
  frequency:      text('frequency').notNull(),
  quantity:       numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  refills:        integer('refills').notNull().default(0),
  status:         text('status').notNull().default('ACTIVE'),
  startDate:      timestamp('start_date', { withTimezone: true }).notNull(),
  endDate:        timestamp('end_date', { withTimezone: true }),
  prescriberName: text('prescriber_name').notNull(),
  notes:          text('notes'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_prescription_ehr').on(t.ehrId),
  index('idx_prescription_status').on(t.status),
])

export const prescriptionFill = pgTable('prescription_fill', {
  id:                text('id').primaryKey(),
  prescriptionId:    text('prescription_id').notNull().references(() => prescription.id, { onDelete: 'cascade' }),
  filledAt:          timestamp('filled_at', { withTimezone: true }).notNull(),
  quantityDispensed: numeric('quantity_dispensed', { precision: 10, scale: 2 }).notNull(),
  pharmacyName:      text('pharmacy_name').notNull(),
  dispensedBy:       text('dispensed_by'),
  status:            text('status').notNull().default('FILLED'),
  notes:             text('notes'),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_prescription_fill_rx').on(t.prescriptionId),
  index('idx_prescription_fill_date').on(t.filledAt),
])

// ── Inferred types ────────────────────────────────────────────────────────────

export type EhrRow                  = typeof ehr.$inferSelect
export type EhrStatusRow            = typeof ehrStatus.$inferSelect
export type CompositionRow          = typeof composition.$inferSelect
export type ContributionRow         = typeof contribution.$inferSelect
export type ContributionVersionRow  = typeof contributionVersion.$inferSelect
export type DirectoryRow            = typeof directory.$inferSelect
export type StoredQueryRow          = typeof storedQuery.$inferSelect
export type TemplateDefinitionRow   = typeof templateDefinition.$inferSelect
export type PatientProfileRow       = typeof patientProfile.$inferSelect
export type PatientVitalRow         = typeof patientVital.$inferSelect
export type GlAccountRow            = typeof glAccount.$inferSelect
export type GlJournalEntryRow       = typeof glJournalEntry.$inferSelect
export type GlJournalLineRow        = typeof glJournalLine.$inferSelect
export type AuditEventRow           = typeof auditEvent.$inferSelect
export type PrescriptionRow         = typeof prescription.$inferSelect
export type PrescriptionFillRow     = typeof prescriptionFill.$inferSelect
