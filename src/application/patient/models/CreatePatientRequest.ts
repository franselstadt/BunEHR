import type { PatientDto } from './PatientDto.ts'

/** Input model used when creating a new patient profile. */
export type CreatePatientRequest = Pick<PatientDto, 'firstName' | 'lastName'> & Partial<PatientDto>
