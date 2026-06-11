import type { PatientProfile } from '../models/PatientProfile.ts'
import type { PatientVitals } from '../models/PatientVitals.ts'

/** Repository contract for patient profile and vital persistence. */
export interface IPatientRepository {
  list(): Promise<Array<PatientProfile & { vitals?: PatientVitals }>>
  findByEhrId(ehrId: string): Promise<(PatientProfile & { vitals?: PatientVitals }) | undefined>
  upsert(profile: PatientProfile, vitals?: PatientVitals): Promise<PatientProfile & { vitals?: PatientVitals }>
}
