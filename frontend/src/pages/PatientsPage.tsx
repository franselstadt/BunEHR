/**
 * Patients page — searchable, filterable list of all patients.
 *
 * In an OpenEHR system, every patient has an EHR (Electronic Health Record).
 * This page lists all EHRs in the system alongside demographic summaries.
 *
 * Features:
 *  - Full-text search by name / EHR ID / diagnosis
 *  - Filter by ward, status, clinician
 *  - Status badges colour-coded by acuity
 *  - Click-through to detailed patient view
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, InputAdornment, Select, MenuItem,
  FormControl, InputLabel, Grid, Card, CardContent, CardActionArea,
  Avatar, Chip, Stack, Button, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, LinearProgress,
} from '@mui/material'
import {
  Search as SearchIcon, PersonAdd as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { statusColors, wardColors } from '../theme/medblocksTheme.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import { createPatient, getPatients } from '../api/ehrClient.ts'
import type { Patient } from '../types/openehr.ts'

const DEFAULT_WARDS = ['General Medicine', 'Emergency', 'Cardiology', 'ICU', 'Orthopedics', 'Neurology', 'Oncology', 'Pediatrics']
const STATUSES  = ['All statuses', 'CRITICAL', 'ADMITTED', 'OBSERVATION', 'STABLE', 'ACTIVE', 'DISCHARGED'] as const
const GENDERS   = ['male', 'female', 'other'] as const
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

/** Age from ISO date string */
const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10)

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const wardColor = wardColors[patient.ward as keyof typeof wardColors] ?? '#3B82F6'
  const statusColor = statusColors[patient.status] ?? '#3B82F6'
  const isCritical = patient.status === 'CRITICAL'
  const firstInitial = patient.firstName?.[0] ?? '?'
  const lastInitial = patient.lastName?.[0] ?? '?'

  return (
    <Card sx={{ border: isCritical ? `1.5px solid #EF4444` : '1px solid #E2E8F0', position: 'relative' }}>
      {isCritical && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: '#EF4444', borderRadius: '10px 10px 0 0' }} />
      )}
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* Avatar with patient initials */}
            <Avatar sx={{ bgcolor: `${statusColor}18`, color: statusColor, width: 44, height: 44, fontWeight: 700, fontSize: '1rem' }}>
              {firstInitial}{lastInitial}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {patient.firstName} {patient.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {age(patient.dateOfBirth)} y/o · {patient.gender} · {patient.bloodType}
              </Typography>
              {/* Diagnosis */}
              <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.primary', fontSize: '0.78rem' }} noWrap>
                {patient.primaryDiagnosis}
              </Typography>
            </Box>
          </Box>

          {/* Tags row */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={patient.status} size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: `${statusColor}15`, color: statusColor, fontWeight: 700 }} />
            <Chip label={patient.ward} size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: `${wardColor}15`, color: wardColor, fontWeight: 600 }} />
            <Chip label={`Room ${patient.room}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          </Stack>

          {/* Vitals mini row */}
          {patient.vitals && (
            <Box sx={{ mt: 1.5, p: 1, bgcolor: 'background.default', borderRadius: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <VitalPill label="BP" value={`${patient.vitals.bloodPressureSystolic}/${patient.vitals.bloodPressureDiastolic}`} unit="mmHg" alert={patient.vitals.bloodPressureSystolic > 140 || patient.vitals.bloodPressureDiastolic > 90} />
              <VitalPill label="HR" value={patient.vitals.heartRate} unit="bpm" alert={patient.vitals.heartRate > 100 || patient.vitals.heartRate < 50} />
              <VitalPill label="SpO₂" value={`${patient.vitals.oxygenSat}%`} unit="" alert={patient.vitals.oxygenSat < 95} />
              <VitalPill label="T°" value={`${patient.vitals.temperature}°`} unit="C" alert={patient.vitals.temperature > 38} />
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Dr. {(patient.primaryClinician ?? 'Admin').replace('Dr. ', '')}</Typography>
            <Typography variant="caption" color="text.secondary">Admitted {patient.admittedDate}</Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

function VitalPill({ label, value, unit, alert }: { label: string; value: number | string; unit: string; alert?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1, fontSize: '0.65rem', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, color: alert ? '#EF4444' : 'text.primary', fontFamily: 'monospace' }}>
        {value} <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontSize: '0.65rem' }}>{unit}</Box>
      </Typography>
    </Box>
  )
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [ward,     setWard]     = useState('All wards')
  const [status,   setStatus]   = useState('All statuses')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1980-01-01',
    gender: 'other' as Patient['gender'],
    bloodType: 'O+',
    ward: 'General Medicine',
    room: '',
    primaryDiagnosis: '',
    primaryClinician: 'Dr. Admin',
    status: 'ADMITTED' as Patient['status'],
  })

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      setPatients(await getPatients())
    } catch {
      const { SAMPLE_PATIENTS } = await import('../api/samplePatients.ts')
      setPatients(SAMPLE_PATIENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPatients() }, [loadPatients])

  const wards = useMemo(
    () => ['All wards', ...new Set([...DEFAULT_WARDS, ...patients.map(p => p.ward)])],
    [patients],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return patients.filter(p => {
      const matchQ = !q || `${p.firstName} ${p.lastName} ${p.primaryDiagnosis} ${p.ehrId}`.toLowerCase().includes(q)
      const matchW = ward   === 'All wards'    || p.ward   === ward
      const matchS = status === 'All statuses' || p.status === status
      return matchQ && matchW && matchS
    })
  }, [patients, search, ward, status])

  const handleCreate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setCreateError('First and last name are required.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const patient = await createPatient({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodType: form.bloodType,
        ward: form.ward,
        room: form.room.trim() || `${form.ward.slice(0, 2).toUpperCase()}-100`,
        primaryDiagnosis: form.primaryDiagnosis.trim() || 'Pending assessment',
        primaryClinician: form.primaryClinician.trim() || 'Dr. Admin',
        status: form.status,
      })
      setDialogOpen(false)
      setForm({
        firstName: '', lastName: '', dateOfBirth: '1980-01-01', gender: 'other',
        bloodType: 'O+', ward: 'General Medicine', room: '', primaryDiagnosis: '',
        primaryClinician: 'Dr. Admin', status: 'ADMITTED',
      })
      await loadPatients()
      navigate(`/patients/${patient.ehrId}`)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create patient')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Patient Records</Typography>
          <Typography variant="body2" color="text.secondary">
            Every patient in the system has an <strong>EHR (Electronic Health Record)</strong> — a unique identifier
            that links all their clinical documents, test results, and care history. Browse, search, and manage patient
            EHRs below.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ whiteSpace: 'nowrap', ml: 2 }}
          onClick={() => { setCreateError(''); setDialogOpen(true) }}>
          New Patient
        </Button>
      </Box>

      {/* Info banner */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<SearchIcon />}>
        <strong>What is an EHR?</strong> An Electronic Health Record is a digital collection of a patient's entire medical
        history — diagnoses, medications, test results, and clinical notes — stored in a standardised OpenEHR format
        so it can be shared between any compatible system.
      </Alert>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth size="small" placeholder="Search by name, diagnosis, or EHR ID…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Ward</InputLabel>
            <Select value={ward} label="Ward" onChange={e => setWard(e.target.value)}>
              {wards.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Results count */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} of {patients.length} patients
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Patient cards grid */}
      <Grid container spacing={2}>
        {filtered.map(patient => (
          <Grid item xs={12} sm={6} lg={4} key={patient.ehrId}>
            <PatientCard patient={patient} onClick={() => navigate(`/patients/${patient.ehrId}`)} />
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography>No patients match your filters</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => !creating && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Patient — Create openEHR Record</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates a new <strong>EHR</strong> in PostgreSQL and registers the patient for the hospital dashboard.
          </Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField label="First name" required fullWidth size="small"
                value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Last name" required fullWidth size="small"
                value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Date of birth" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Gender</InputLabel>
                <Select label="Gender" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Patient['gender'] }))}>
                  {GENDERS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Blood type</InputLabel>
                <Select label="Blood type" value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}>
                  {BLOOD_TYPES.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Ward</InputLabel>
                <Select label="Ward" value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}>
                  {DEFAULT_WARDS.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Room" fullWidth size="small" placeholder="e.g. GM-101"
                value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Patient['status'] }))}>
                  {STATUSES.filter(s => s !== 'All statuses').map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Primary diagnosis" fullWidth size="small" placeholder="e.g. Hypertension (I10)"
                value={form.primaryDiagnosis} onChange={e => setForm(f => ({ ...f, primaryDiagnosis: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Primary clinician" fullWidth size="small"
                value={form.primaryClinician} onChange={e => setForm(f => ({ ...f, primaryClinician: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}>
            {creating ? 'Creating…' : 'Create EHR'}
          </Button>
        </DialogActions>
      </Dialog>

      <PageGuide
        title="Patient Records"
        tagline="Browse and search all patient EHRs in the system"
        overview="The Patients page lists every Electronic Health Record (EHR) in the system. In openEHR, every patient has exactly one EHR — a globally unique digital folder identified by a UUID. This page lets you search by name or diagnosis, filter by ward or status, and navigate to any patient's full clinical record. Each card shows the patient's current vital signs, status, ward assignment, allergies, and primary diagnosis at a glance."
        openEhrConcept="EHR"
        openEhrExplanation="An EHR (Electronic Health Record) is the root object in openEHR — a permanent, globally unique record identified by an ehrId (UUID). Once created, an EHR is never deleted or transferred. All clinical data for the patient hangs off their EHR. The subject reference (subject_id + subject_namespace) links the openEHR EHR to the patient in your demographics system."
        endpoints={[
          { method: 'GET', path: '/api/patients', description: 'List all patients with demographics and current vitals' },
          { method: 'POST', path: '/api/patients', description: 'Create a new patient EHR from the New Patient dialog' },
          { method: 'POST', path: '/v1/ehr', description: 'Create a new EHR for a patient', example: 'curl -X POST http://localhost:3000/v1/ehr \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=representation" \\\n  -d \'{"ehr_status":{"subject":{"external_ref":{"id":{"value":"patient-001"},"namespace":"local","type":"PERSON"}}}}\''},
          { method: 'GET', path: '/v1/ehr/{ehr_id}', description: 'Get a specific EHR by ID' },
          { method: 'GET', path: '/v1/ehr?subject_id=X', description: 'Find an EHR by patient subject ID' },
          { method: 'POST', path: '/api/seed', description: 'Create the 12 sample patient EHRs (run once per fresh database)' },
        ]}
        clinicianTips={[
          "Red CRITICAL badges require immediate attention — the patient's vitals are outside safe limits.",
          "Allergy alerts (red chips) appear on each card — always check before prescribing.",
          "Use the ward filter to see only patients in your ward.",
          "Click any patient card to open the full clinical record including vital sign trends and composition history.",
          "The vital signs on each card are colour-coded: red = abnormal, normal = within clinical range.",
        ]}
        developerTips={[
          "POST /api/seed — creates all 12 sample EHRs in PostgreSQL. Must be run on a fresh database.",
          "Each patient card uses ehr-001 through ehr-012 as IDs. Run seed first to match IDs to real DB rows.",
          "GET /v1/ehr returns 200 with ETag header containing the current ehr_status version uid.",
          "Subject IDs are linked to the openEHR EHR via the ehr_status.subject.external_ref field.",
        ]}
      />
    </Box>
  )
}
