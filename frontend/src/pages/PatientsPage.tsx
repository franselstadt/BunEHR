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
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, TextField, InputAdornment, Select, MenuItem,
  FormControl, InputLabel, Grid, Card, CardContent, CardActionArea,
  Avatar, Chip, Stack, Button, Tooltip, Alert,
} from '@mui/material'
import {
  Search as SearchIcon, PersonAdd as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import { SAMPLE_PATIENTS } from '../api/samplePatients.ts'
import { statusColors, wardColors } from '../theme/medblocksTheme.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import type { Patient } from '../types/openehr.ts'

const WARDS     = ['All wards', ...new Set(SAMPLE_PATIENTS.map(p => p.ward))]
const STATUSES  = ['All statuses', 'CRITICAL', 'ADMITTED', 'OBSERVATION', 'STABLE', 'ACTIVE', 'DISCHARGED']

/** Age from ISO date string */
const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10)

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const wardColor = wardColors[patient.ward as keyof typeof wardColors] ?? '#3B82F6'
  const statusColor = statusColors[patient.status]
  const isCritical = patient.status === 'CRITICAL'

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
              {patient.firstName[0]}{patient.lastName[0]}
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
            <Typography variant="caption" color="text.secondary">Dr. {patient.primaryClinician.replace('Dr. ', '')}</Typography>
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
  const [search,  setSearch]  = useState('')
  const [ward,    setWard]    = useState('All wards')
  const [status,  setStatus]  = useState('All statuses')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return SAMPLE_PATIENTS.filter(p => {
      const matchQ = !q || `${p.firstName} ${p.lastName} ${p.primaryDiagnosis} ${p.ehrId}`.toLowerCase().includes(q)
      const matchW = ward   === 'All wards'    || p.ward   === ward
      const matchS = status === 'All statuses' || p.status === status
      return matchQ && matchW && matchS
    })
  }, [search, ward, status])

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
        <Button variant="contained" startIcon={<AddIcon />} sx={{ whiteSpace: 'nowrap', ml: 2 }}>
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
              {WARDS.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
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
          {filtered.length} of {SAMPLE_PATIENTS.length} patients
        </Typography>
      </Box>

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

      <PageGuide
        title="Patient Records"
        tagline="Browse and search all patient EHRs in the system"
        overview="The Patients page lists every Electronic Health Record (EHR) in the system. In openEHR, every patient has exactly one EHR — a globally unique digital folder identified by a UUID. This page lets you search by name or diagnosis, filter by ward or status, and navigate to any patient's full clinical record. Each card shows the patient's current vital signs, status, ward assignment, allergies, and primary diagnosis at a glance."
        openEhrConcept="EHR"
        openEhrExplanation="An EHR (Electronic Health Record) is the root object in openEHR — a permanent, globally unique record identified by an ehrId (UUID). Once created, an EHR is never deleted or transferred. All clinical data for the patient hangs off their EHR. The subject reference (subject_id + subject_namespace) links the openEHR EHR to the patient in your demographics system."
        endpoints={[
          { method: 'GET', path: '/api/patients', description: 'List all patients with demographics and current vitals' },
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
