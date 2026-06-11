import type { CreatePatientRequest } from '../patient/models/CreatePatientRequest.ts'
import type { PatientDto } from '../patient/models/PatientDto.ts'
import type { generateVitalTrend } from '../../infrastructure/seed/SamplePatients.ts'
import type { SamplePatient } from '../../infrastructure/seed/SamplePatients.ts'

/** Application service contract for patient BFF operations */
export interface IPatientService {
  list(): Promise<PatientDto[]>
  getById(ehrId: string): PatientDto | undefined
  getVitalTrend(ehrId: string): ReturnType<typeof generateVitalTrend>
  create(request: CreatePatientRequest): Promise<PatientDto>
  seedSampleEhRs(onAdmitted: (patient: SamplePatient) => void): Promise<number>
}

export type { CreatePatientRequest } from '../patient/models/CreatePatientRequest.ts'
export type { PatientDto } from '../patient/models/PatientDto.ts'
