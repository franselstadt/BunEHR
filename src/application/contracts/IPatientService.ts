import type { CreatePatientRequest } from '../patient/models/CreatePatientRequest.ts'
import type { PatientDto, VitalTrendPoint } from '../patient/models/PatientDto.ts'

/** Application service contract for patient BFF operations */
export interface IPatientService {
  list(): Promise<PatientDto[]>
  getById(ehrId: string): Promise<PatientDto | undefined>
  getVitalTrend(ehrId: string): Promise<VitalTrendPoint[]>
  create(request: CreatePatientRequest): Promise<PatientDto>
  seedSampleEhRs(onAdmitted: (patient: PatientDto) => void): Promise<number>
}

export type { CreatePatientRequest } from '../patient/models/CreatePatientRequest.ts'
export type { PatientDto, VitalTrendPoint } from '../patient/models/PatientDto.ts'
