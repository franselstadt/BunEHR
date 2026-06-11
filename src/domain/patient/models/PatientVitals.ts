/** Persisted patient vital sign snapshot. */
export interface PatientVitals {
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  heartRate: number
  temperature: number
  oxygenSat: number
  respiratoryRate: number
  recordedAt: string
}
