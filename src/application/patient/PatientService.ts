import type { SamplePatient } from '../../infrastructure/seed/SamplePatients.ts'
import {
  SAMPLE_PATIENTS, customPatients, generateVitalTrend, getAllPatients,
} from '../../infrastructure/seed/SamplePatients.ts'
import type { IEhrService } from '../contracts/IEhrService.ts'
import type { IPatientService, CreatePatientRequest, PatientDto } from '../contracts/IPatientService.ts'
import type { Db } from '../../infrastructure/database/client.ts'
import { ehr } from '../../infrastructure/database/schema.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

export type PatientDto = SamplePatient & { _hasRealEhr?: boolean }
export type CreatePatientRequest = Pick<SamplePatient, 'firstName' | 'lastName'> & Partial<SamplePatient>

const defaultLocation = () => ({ lat: 51.5074, lng: -0.1278 })

export class PatientService implements IPatientService {
  constructor(
    private readonly db: Db,
    private readonly ehrService: IEhrService,
  ) {}

  async list(): Promise<PatientDto[]> {
    try {
      const ehrRows = await this.db.select({ id: ehr.id, subjectId: ehr.subjectId }).from(ehr)
      const bySubject = new Map(ehrRows.map(r => [r.subjectId, r.id]))
      return getAllPatients().map(p => ({
        ...p,
        ehrId: bySubject.get(p.subjectId) ?? p.ehrId,
        _hasRealEhr: bySubject.has(p.subjectId),
      }))
    } catch {
      return getAllPatients()
    }
  }

  getById(ehrId: string): PatientDto | undefined {
    return getAllPatients().find(p => p.ehrId === ehrId)
  }

  getVitalTrend(ehrId: string) {
    const patient = this.getById(ehrId)
    if (!patient) throw new Error(`Patient not found: ${ehrId}`)
    return generateVitalTrend(patient)
  }

  async create(request: CreatePatientRequest): Promise<PatientDto> {
    const ehrId = newUuid()
    const subjectId = `sub-${newUuid().slice(0, 8)}`
    const today = new Date().toISOString().slice(0, 10)

    const patient: SamplePatient = {
      ehrId,
      subjectId,
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      dateOfBirth: request.dateOfBirth ?? '1980-01-01',
      gender: request.gender ?? 'other',
      bloodType: request.bloodType ?? 'O+',
      ward: request.ward ?? 'General Medicine',
      room: request.room ?? 'GM-100',
      admittedDate: request.admittedDate ?? today,
      status: request.status ?? 'ADMITTED',
      primaryDiagnosis: request.primaryDiagnosis?.trim() || 'Pending assessment',
      primaryClinician: request.primaryClinician?.trim() || 'Dr. Admin',
      allergies: request.allergies ?? [],
      location: request.location ?? defaultLocation(),
      vitals: {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        temperature: 36.6,
        oxygenSat: 98,
        respiratoryRate: 16,
        recordedAt: new Date().toISOString(),
      },
    }

    await this.ehrService.createEhr(ehrId, {
      externalRef: { id: { value: subjectId }, namespace: 'local', type: 'PERSON' },
    })

    customPatients.push(patient)
    return patient
  }

  async seedSampleEhRs(onAdmitted: (patient: SamplePatient) => void): Promise<number> {
    let count = 0
    for (const patient of SAMPLE_PATIENTS) {
      try {
        await this.ehrService.createEhr(patient.ehrId, {
          externalRef: { id: { value: patient.subjectId }, namespace: 'local', type: 'PERSON' },
        })
        count++
        onAdmitted(patient)
      } catch {
        // already seeded
      }
    }
    return count
  }
}
