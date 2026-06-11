import type { SamplePatient } from '../../../infrastructure/seed/SamplePatients.ts'

/** Input model used when creating a new patient profile. */
export type CreatePatientRequest = Pick<SamplePatient, 'firstName' | 'lastName'> & Partial<SamplePatient>
