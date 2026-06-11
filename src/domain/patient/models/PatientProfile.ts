/** Persisted patient demographics and admission summary. */
export interface PatientProfile {
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
}
