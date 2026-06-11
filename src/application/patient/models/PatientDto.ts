import type { SamplePatient } from '../../../infrastructure/seed/SamplePatients.ts'

/** Dashboard-facing patient model enriched with EHR sync state. */
export type PatientDto = SamplePatient & { _hasRealEhr?: boolean }
