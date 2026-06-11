/**
 * Meblock EHR API client.
 *
 * Wraps the BunEHR backend REST API and adds helpful typed methods
 * for each OpenEHR domain object.
 */
import type { EhrResponse, AqlResult, Patient } from '../types/openehr.ts'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

type JsonRecord = Record<string, unknown>

const getField = <T>(obj: JsonRecord, camel: string, snake: string, fallback: T): T => {
  const value = (obj[camel] ?? obj[snake]) as T | undefined
  return value ?? fallback
}

const normalizeStatus = (raw: unknown): Patient['status'] => {
  const value = String(raw ?? 'ADMITTED').toUpperCase()
  if (value === 'ACTIVE' || value === 'ADMITTED' || value === 'DISCHARGED' || value === 'CRITICAL' || value === 'STABLE' || value === 'OBSERVATION') {
    return value
  }
  return 'ADMITTED'
}

const toPatient = (raw: unknown): Patient => {
  const obj = (raw ?? {}) as JsonRecord
  const vitalsRaw = (obj['vitals'] ?? obj['vital_signs']) as JsonRecord | undefined
  const locationRaw = (obj['location'] ?? obj['geo']) as JsonRecord | undefined

  return {
    ehrId: getField(obj, 'ehrId', 'ehr_id', 'unknown-ehr'),
    subjectId: getField(obj, 'subjectId', 'subject_id', 'unknown-subject'),
    firstName: getField(obj, 'firstName', 'first_name', 'Unknown'),
    lastName: getField(obj, 'lastName', 'last_name', 'Patient'),
    dateOfBirth: getField(obj, 'dateOfBirth', 'date_of_birth', '1980-01-01'),
    gender: (() => {
      const gender = String(getField(obj, 'gender', 'gender', 'other')).toLowerCase()
      return gender === 'male' || gender === 'female' ? gender : 'other'
    })(),
    bloodType: getField(obj, 'bloodType', 'blood_type', 'O+'),
    ward: getField(obj, 'ward', 'ward', 'General Medicine'),
    room: getField(obj, 'room', 'room', 'GM-100'),
    admittedDate: getField(obj, 'admittedDate', 'admitted_date', new Date().toISOString().slice(0, 10)),
    status: normalizeStatus(getField(obj, 'status', 'status', 'ADMITTED')),
    primaryDiagnosis: getField(obj, 'primaryDiagnosis', 'primary_diagnosis', 'Pending assessment'),
    primaryClinician: getField(obj, 'primaryClinician', 'primary_clinician', 'Dr. Admin'),
    allergies: getField(obj, 'allergies', 'allergies', [] as string[]),
    location: {
      lat: getField(locationRaw ?? {}, 'lat', 'lat', 37.7749),
      lng: getField(locationRaw ?? {}, 'lng', 'lng', -122.4194),
    },
    vitals: vitalsRaw ? {
      bloodPressureSystolic: getField(vitalsRaw, 'bloodPressureSystolic', 'blood_pressure_systolic', 120),
      bloodPressureDiastolic: getField(vitalsRaw, 'bloodPressureDiastolic', 'blood_pressure_diastolic', 80),
      heartRate: getField(vitalsRaw, 'heartRate', 'heart_rate', 72),
      temperature: getField(vitalsRaw, 'temperature', 'temperature', 36.6),
      oxygenSat: getField(vitalsRaw, 'oxygenSat', 'oxygen_sat', 98),
      respiratoryRate: getField(vitalsRaw, 'respiratoryRate', 'respiratory_rate', 16),
      recordedAt: getField(vitalsRaw, 'recordedAt', 'recorded_at', new Date().toISOString()),
    } : undefined,
  }
}

// ── EHR ──────────────────────────────────────────────────────────────────────

/** Create a new Electronic Health Record for a patient */
export const createEhr = (subjectId: string, namespace = 'local') =>
  request<EhrResponse>('POST', '/v1/ehr', {
    ehr_status: { subject: { external_ref: { id: { value: subjectId }, namespace, type: 'PERSON' } } },
  })

/** Get an EHR by its unique ID */
export const getEhr = (ehrId: string) =>
  request<EhrResponse>('GET', `/v1/ehr/${ehrId}`)

/** Find an EHR by subject (patient) ID */
export const getEhrBySubject = (subjectId: string, namespace = 'local') =>
  request<EhrResponse>('GET', `/v1/ehr?subject_id=${encodeURIComponent(subjectId)}&subject_namespace=${namespace}`)

// ── AQL Queries ───────────────────────────────────────────────────────────────

/** Execute an AQL (Archetype Query Language) query — the OpenEHR SQL equivalent */
export const runAql = (q: string, fetch = 50, offset = 0) =>
  request<AqlResult>('POST', '/v1/query/aql', { q, fetch, offset })

export interface AqlAssistResponse {
  prompt: string
  generatedQuery: string
  provider: string
  model: string
  usedFallback: boolean
  result: AqlResult
}

const toAqlAssistResponse = (raw: unknown): AqlAssistResponse => {
  const obj = (raw ?? {}) as Record<string, unknown>
  const result = (obj['result'] ?? {}) as AqlResult
  return {
    prompt: String(obj['prompt'] ?? ''),
    generatedQuery: String(obj['generatedQuery'] ?? obj['generated_query'] ?? ''),
    provider: String(obj['provider'] ?? ''),
    model: String(obj['model'] ?? ''),
    usedFallback: Boolean(obj['usedFallback'] ?? obj['used_fallback'] ?? false),
    result,
  }
}

export const runAqlFromPrompt = (prompt: string, fetch = 50, offset = 0) =>
  request<unknown>('POST', '/v1/query/aql/assist', { prompt, fetch, offset }).then(toAqlAssistResponse)

// ── Patient aggregate API (custom BunEHR extension) ─────────────────────────

/** Get all patients with enriched demographic and clinical summary */
export const getPatients = () =>
  request<unknown[]>('GET', '/api/patients').then(rows => rows.map(toPatient))

/** Create a new patient (openEHR EHR + demographics) */
export const createPatient = (data: Pick<Patient, 'firstName' | 'lastName'> & Partial<Patient>) =>
  request<unknown>('POST', '/api/patients', data).then(toPatient)

/** Get a single patient by EHR ID */
export const getPatient = (ehrId: string) =>
  request<unknown>('GET', `/api/patients/${ehrId}`).then(toPatient)

/** Get vital sign trend for a patient (last 24 h) */
export const getVitalTrend = (ehrId: string) =>
  request<import('../types/openehr.ts').VitalTrend[]>('GET', `/api/patients/${ehrId}/vitals`)

/** Trigger sample data seeding (dev/demo only) */
export const seedSampleData = () =>
  request<{ message: string; count: number }>('POST', '/api/seed')
