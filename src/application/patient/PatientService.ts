import { SAMPLE_PATIENTS } from '../../infrastructure/seed/SamplePatients.ts'
import type { IEhrService } from '../contracts/IEhrService.ts'
import type { IPatientService } from '../contracts/IPatientService.ts'
import type { CreatePatientRequest } from './models/CreatePatientRequest.ts'
import type { PatientDto, VitalTrendPoint } from './models/PatientDto.ts'
import type { IPatientRepository } from '../../domain/patient/repositories/IPatientRepository.ts'
import { newUuid } from '../../domain/shared/IdGenerator.ts'

const defaultLocation = () => ({ lat: 37.7749, lng: -122.4194 })

export class PatientService implements IPatientService {
  constructor(
    private readonly repo: IPatientRepository,
    private readonly ehrService: IEhrService,
  ) {}

  async list(): Promise<PatientDto[]> {
    return this.repo.list()
  }

  getById(ehrId: string): Promise<PatientDto | undefined> {
    return this.repo.findByEhrId(ehrId)
  }

  async getVitalTrend(ehrId: string): Promise<VitalTrendPoint[]> {
    const patient = await this.getById(ehrId)
    if (!patient) throw new Error(`Patient not found: ${ehrId}`)
    return generateTrendFromPatient(patient)
  }

  async create(request: CreatePatientRequest): Promise<PatientDto> {
    const ehrId = newUuid()
    const subjectId = `sub-${newUuid().slice(0, 8)}`
    const today = new Date().toISOString().slice(0, 10)

    const patient: PatientDto = {
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

    return this.repo.upsert(patient, patient.vitals)
  }

  async seedSampleEhRs(onAdmitted: (patient: PatientDto) => void): Promise<number> {
    let count = 0
    for (const patient of SAMPLE_PATIENTS) {
      try {
        await this.ehrService.createEhr(patient.ehrId, {
          externalRef: { id: { value: patient.subjectId }, namespace: 'local', type: 'PERSON' },
        })
        const saved = await this.repo.upsert(patient, patient.vitals)
        count++
        onAdmitted(saved)
      } catch {
        const saved = await this.repo.upsert(patient, patient.vitals)
        onAdmitted(saved)
      }
    }
    return count
  }
}

function generateTrendFromPatient(patient: PatientDto): VitalTrendPoint[] {
  const base = patient.vitals ?? {
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 72,
    oxygenSat: 98,
    temperature: 36.6,
    respiratoryRate: 16,
    recordedAt: new Date().toISOString(),
  }
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now.getTime() - (23 - i) * 3_600_000)
    const jitter = (range: number) => (Math.random() - 0.5) * range
    return {
      time: `${t.getHours().toString().padStart(2, '0')}:00`,
      systolic: Math.round(base.bloodPressureSystolic + jitter(12)),
      diastolic: Math.round(base.bloodPressureDiastolic + jitter(8)),
      heartRate: Math.round(base.heartRate + jitter(10)),
      spo2: Math.min(100, Math.round(base.oxygenSat + jitter(3))),
      temp: parseFloat((base.temperature + jitter(0.4)).toFixed(1)),
    }
  })
}
