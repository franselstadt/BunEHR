import { desc, eq } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { patientProfile, patientVital } from '../schema.ts'
import type { IPatientRepository } from '../../../domain/patient/repositories/IPatientRepository.ts'
import type { PatientProfile } from '../../../domain/patient/models/PatientProfile.ts'
import type { PatientVitals } from '../../../domain/patient/models/PatientVitals.ts'
import { newUuid } from '../../../domain/shared/IdGenerator.ts'

/** Patient repository backed by relational profile and vital tables. */
export class PatientRepository implements IPatientRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Array<PatientProfile & { vitals?: PatientVitals }>> {
    const profiles = await this.db.select().from(patientProfile)
    const vitalsRows = await this.db.select().from(patientVital).orderBy(desc(patientVital.recordedAt))
    const latestByEhr = new Map<string, typeof patientVital.$inferSelect>()
    for (const row of vitalsRows) {
      if (!latestByEhr.has(row.ehrId)) latestByEhr.set(row.ehrId, row)
    }
    return profiles.map((profile) => mapProfile(profile, latestByEhr.get(profile.ehrId)))
  }

  async findByEhrId(ehrId: string): Promise<(PatientProfile & { vitals?: PatientVitals }) | undefined> {
    const profileRows = await this.db.select().from(patientProfile).where(eq(patientProfile.ehrId, ehrId)).limit(1)
    const profile = profileRows[0]
    if (!profile) return undefined

    const vitalRows = await this.db.select().from(patientVital)
      .where(eq(patientVital.ehrId, ehrId))
      .orderBy(desc(patientVital.recordedAt))
      .limit(1)

    return mapProfile(profile, vitalRows[0])
  }

  async upsert(profile: PatientProfile, vitals?: PatientVitals): Promise<PatientProfile & { vitals?: PatientVitals }> {
    await this.db.insert(patientProfile).values({
      ehrId: profile.ehrId,
      subjectId: profile.subjectId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      bloodType: profile.bloodType,
      ward: profile.ward,
      room: profile.room,
      admittedDate: profile.admittedDate,
      status: profile.status,
      primaryDiagnosis: profile.primaryDiagnosis,
      primaryClinician: profile.primaryClinician,
      allergies: profile.allergies,
      locationLat: profile.location.lat.toString(),
      locationLng: profile.location.lng.toString(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: patientProfile.ehrId,
      set: {
        subjectId: profile.subjectId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        bloodType: profile.bloodType,
        ward: profile.ward,
        room: profile.room,
        admittedDate: profile.admittedDate,
        status: profile.status,
        primaryDiagnosis: profile.primaryDiagnosis,
        primaryClinician: profile.primaryClinician,
        allergies: profile.allergies,
        locationLat: profile.location.lat.toString(),
        locationLng: profile.location.lng.toString(),
        updatedAt: new Date(),
      },
    })

    if (vitals) {
      await this.db.insert(patientVital).values({
        id: newUuid(),
        ehrId: profile.ehrId,
        bloodPressureSystolic: vitals.bloodPressureSystolic,
        bloodPressureDiastolic: vitals.bloodPressureDiastolic,
        heartRate: vitals.heartRate,
        temperature: vitals.temperature.toString(),
        oxygenSat: vitals.oxygenSat,
        respiratoryRate: vitals.respiratoryRate,
        recordedAt: new Date(vitals.recordedAt),
      })
    }

    return (await this.findByEhrId(profile.ehrId))!
  }
}

function mapProfile(
  profile: typeof patientProfile.$inferSelect,
  vitals?: typeof patientVital.$inferSelect,
): PatientProfile & { vitals?: PatientVitals } {
  return {
    ehrId: profile.ehrId,
    subjectId: profile.subjectId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    bloodType: profile.bloodType,
    ward: profile.ward,
    room: profile.room,
    admittedDate: profile.admittedDate,
    status: profile.status,
    primaryDiagnosis: profile.primaryDiagnosis,
    primaryClinician: profile.primaryClinician,
    allergies: profile.allergies,
    location: {
      lat: Number(profile.locationLat),
      lng: Number(profile.locationLng),
    },
    vitals: vitals ? {
      bloodPressureSystolic: vitals.bloodPressureSystolic,
      bloodPressureDiastolic: vitals.bloodPressureDiastolic,
      heartRate: vitals.heartRate,
      temperature: Number(vitals.temperature),
      oxygenSat: vitals.oxygenSat,
      respiratoryRate: vitals.respiratoryRate,
      recordedAt: vitals.recordedAt.toISOString(),
    } : undefined,
  }
}
