/** Latest vital signs captured for a patient. */
export interface PatientVitalsDto {
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  heartRate: number
  temperature: number
  oxygenSat: number
  respiratoryRate: number
  recordedAt: string
}

/** Dashboard-facing patient model returned by the API. */
export interface PatientDto {
  ehrId: string
  subjectId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  bloodType: string
  ward: string
  room: string
  admittedDate: string
  status: string
  primaryDiagnosis: string
  primaryClinician: string
  allergies: string[]
  location: { lat: number; lng: number }
  vitals?: PatientVitalsDto
  _hasRealEhr?: boolean
}

/** Hourly trend point for charts. */
export interface VitalTrendPoint {
  time: string
  systolic: number
  diastolic: number
  heartRate: number
  spo2: number
  temp: number
}
