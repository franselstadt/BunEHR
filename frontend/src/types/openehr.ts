/**
 * TypeScript types for the OpenEHR REST API v1 responses.
 *
 * OpenEHR is an open standard for electronic health records.
 * Each patient has an EHR (Electronic Health Record) which contains:
 *  - EHR_STATUS: basic info about the record (who it belongs to)
 *  - COMPOSITIONs: clinical documents (e.g. blood pressure, medications)
 *  - DIRECTORY: a folder structure to organise compositions
 */

/** Unique identifier wrapper used throughout OpenEHR */
export interface HierObjectId   { value: string }
export interface ObjectVersionId { value: string }

/** Coded term from a terminology system (e.g. SNOMED CT, LOINC) */
export interface CodePhrase {
  terminology_id: HierObjectId
  code_string: string
}

/** A text value with optional coding */
export interface DvText     { value: string }
export interface DvCodedText { value: string; defining_code: CodePhrase }
export interface DvDateTime  { value: string }

/** Reference to an external party (e.g. a patient in a demographics system) */
export interface PartyRef {
  id: HierObjectId
  namespace: string
  type: string
}

export interface PartySelf { external_ref?: PartyRef }
export interface PartyIdentified { name: string; external_ref?: PartyRef }

// ── EHR ─────────────────────────────────────────────────────────────────────

/** The root of all clinical data for a single patient */
export interface EhrResponse {
  ehr_id:      HierObjectId
  system_id:   HierObjectId
  ehr_status:  EhrStatusResponse
  time_created: DvDateTime
}

/** Metadata about an EHR — who it belongs to and what permissions it has */
export interface EhrStatusResponse {
  uid:              ObjectVersionId
  archetype_node_id: string
  name:             DvText
  subject:          PartySelf
  is_queryable:     boolean
  is_modifiable:    boolean
}

// ── COMPOSITION ──────────────────────────────────────────────────────────────

/** A clinical document — the basic unit of clinical data in OpenEHR */
export interface CompositionResponse {
  uid:              ObjectVersionId
  archetype_node_id: string
  name:             DvText
  archetype_details: {
    archetype_id: HierObjectId
    template_id:  HierObjectId
    rm_version:   string
  }
  language:  CodePhrase
  territory: CodePhrase
  category:  DvCodedText
  composer:  PartyIdentified
  context?:  {
    start_time:  DvDateTime
    end_time?:   DvDateTime
    setting:     DvCodedText
  }
  content?: ContentItem[]
}

export interface ContentItem {
  archetype_node_id: string
  name:  DvText
  data?: Record<string, unknown>
}

// ── AQL ──────────────────────────────────────────────────────────────────────

/** Result of an AQL (Archetype Query Language) query */
export interface AqlResult {
  q:       string
  columns: Array<{ name: string; path?: string }>
  rows:    unknown[][]
  meta?:   { executed_aql?: string; generator?: string }
}

// ── Frontend-specific patient model ─────────────────────────────────────────

/**
 * A rich patient model used by the frontend.
 * Combines an OpenEHR EHR with additional demographic data
 * stored as a COMPOSITION in the patient's record.
 */
export interface Patient {
  ehrId:           string
  subjectId:       string
  firstName:       string
  lastName:        string
  dateOfBirth:     string
  gender:          'male' | 'female' | 'other'
  bloodType:       string
  ward:            string
  room:            string
  admittedDate:    string
  status:          'ACTIVE' | 'ADMITTED' | 'DISCHARGED' | 'CRITICAL' | 'STABLE' | 'OBSERVATION'
  primaryDiagnosis: string
  primaryClinician: string
  allergies:       string[]
  /** GPS coords of patient's bed/ward on the hospital map */
  location:        { lat: number; lng: number }
  /** Latest vital signs */
  vitals?: VitalSigns
}

export interface VitalSigns {
  bloodPressureSystolic:  number
  bloodPressureDiastolic: number
  heartRate:     number
  temperature:   number
  oxygenSat:     number
  respiratoryRate: number
  recordedAt:    string
}

export interface VitalTrend {
  time:      string
  systolic:  number
  diastolic: number
  heartRate: number
  spo2:      number
  temp:      number
}

/** Live event pushed over WebSocket */
export interface LiveEvent {
  id:        string
  type:      'admission' | 'discharge' | 'critical_alert' | 'lab_result' | 'medication' | 'vitals_update'
  patientId: string
  patientName: string
  ward:      string
  message:   string
  severity:  'info' | 'warning' | 'error' | 'success'
  timestamp: string
}
