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

// ── Patient aggregate API (custom BunEHR extension) ─────────────────────────

/** Get all patients with enriched demographic and clinical summary */
export const getPatients = () =>
  request<Patient[]>('GET', '/api/patients')

/** Get a single patient by EHR ID */
export const getPatient = (ehrId: string) =>
  request<Patient>('GET', `/api/patients/${ehrId}`)

/** Get vital sign trend for a patient (last 24 h) */
export const getVitalTrend = (ehrId: string) =>
  request<import('../types/openehr.ts').VitalTrend[]>('GET', `/api/patients/${ehrId}/vitals`)

/** Trigger sample data seeding (dev/demo only) */
export const seedSampleData = () =>
  request<{ message: string; count: number }>('POST', '/api/seed')
