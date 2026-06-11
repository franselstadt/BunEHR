/**
 * Clinical Records — browse and create openEHR COMPOSITION documents.
 *
 * A COMPOSITION is the fundamental unit of clinical data in openEHR.
 * Every blood pressure reading, encounter note, prescription, or
 * lab result is stored as a COMPOSITION.
 *
 * This page lets clinicians:
 *  1. Browse all compositions across all patients
 *  2. Create a new composition (POST /v1/ehr/{id}/composition)
 *  3. View composition details with raw openEHR structure
 *
 * Made by Frans Elstadt in San Francisco.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  Alert, Stepper, Step, StepLabel, CircularProgress, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, IconButton,
} from '@mui/material'
import {
  Add as AddIcon, Search as SearchIcon, Article as ArticleIcon,
  Visibility as ViewIcon, ContentCopy as CopyIcon, CheckCircle as DoneIcon,
  Close as CloseIcon, Send as SendIcon,
} from '@mui/icons-material'
import { SAMPLE_PATIENTS } from '../api/samplePatients.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import { Icd10Lookup } from '../components/shared/Icd10Lookup.tsx'

// ── Sample compositions (from EHR seed data) ──────────────────────────────────
const SAMPLE_COMPOSITIONS = SAMPLE_PATIENTS.flatMap((p, idx) => [
  {
    uid: `comp-${p.ehrId}-001::local.bunehr.com::1`,
    ehrId: p.ehrId,
    patientName: `${p.firstName} ${p.lastName}`,
    type: 'Encounter Note',
    archetype: 'openEHR-EHR-COMPOSITION.encounter.v1',
    template: 'BunEHR-Encounter.v1',
    composer: p.primaryClinician,
    date: p.admittedDate,
    ward: p.ward,
    version: 1,
    status: 'COMPLETE',
    summary: `Initial assessment: ${p.primaryDiagnosis}`,
  },
  ...(idx % 3 === 0 ? [{
    uid: `comp-${p.ehrId}-002::local.bunehr.com::1`,
    ehrId: p.ehrId,
    patientName: `${p.firstName} ${p.lastName}`,
    type: 'Blood Pressure Observation',
    archetype: 'openEHR-EHR-OBSERVATION.blood_pressure.v2',
    template: 'BunEHR-Vitals.v1',
    composer: 'Nursing Staff',
    date: '2026-06-10',
    ward: p.ward,
    version: 1,
    status: 'COMPLETE',
    summary: p.vitals ? `BP ${p.vitals.bloodPressureSystolic}/${p.vitals.bloodPressureDiastolic} mmHg` : 'Routine vitals',
  }] : []),
]).slice(0, 30)

const COMPOSITION_TYPES = [
  { label: 'Encounter Note',          archetype: 'openEHR-EHR-COMPOSITION.encounter.v1',     template: 'BunEHR-Encounter.v1' },
  { label: 'Discharge Summary',       archetype: 'openEHR-EHR-COMPOSITION.discharge-summary.v1', template: 'BunEHR-Discharge.v1' },
  { label: 'Blood Pressure',          archetype: 'openEHR-EHR-OBSERVATION.blood_pressure.v2', template: 'BunEHR-Vitals.v1' },
  { label: 'Medication Order',        archetype: 'openEHR-EHR-INSTRUCTION.medication_order.v2', template: 'BunEHR-Medication.v1' },
  { label: 'Laboratory Result',       archetype: 'openEHR-EHR-OBSERVATION.laboratory_test_result.v1', template: 'BunEHR-Lab.v1' },
  { label: 'Allergy Record',          archetype: 'openEHR-EHR-EVALUATION.adverse_reaction_risk.v2', template: 'BunEHR-Allergy.v1' },
  { label: 'Problem/Diagnosis',       archetype: 'openEHR-EHR-EVALUATION.problem_diagnosis.v1', template: 'BunEHR-Diagnosis.v1' },
  { label: 'Procedure Report',        archetype: 'openEHR-EHR-ACTION.procedure.v1',           template: 'BunEHR-Procedure.v1' },
]

const SETTINGS_CODES = [
  { value: '228', label: 'Primary medical care' },
  { value: '229', label: 'Secondary medical care' },
  { value: '230', label: 'Tertiary medical care' },
  { value: '238', label: 'Other care' },
  { value: '305', label: 'Accident and Emergency' },
  { value: '307', label: 'Intensive care unit' },
]

export default function ClinicalRecordsPage() {
  const navigate   = useNavigate()
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewComp,   setViewComp]   = useState<typeof SAMPLE_COMPOSITIONS[0] | null>(null)
  const [icd10Open, setIcd10Open] = useState(false)
  const [posting,   setPosting]   = useState(false)
  const [posted,    setPosted]    = useState(false)
  const [postError, setPostError] = useState('')
  const [step,      setStep]      = useState(0)

  // ── New composition form state ────────────────────────────────────────
  const [form, setForm] = useState({
    ehrId: SAMPLE_PATIENTS[0]?.ehrId ?? '',
    compositionType: COMPOSITION_TYPES[0]!,
    composerName: 'Dr. Admin',
    setting: '228',
    startTime: new Date().toISOString().slice(0, 16),
    notes: '',
    icd10Code: '',
    icd10Desc: '',
  })

  const filtered = SAMPLE_COMPOSITIONS.filter(c => {
    const q = search.toLowerCase()
    return (
      (!search || c.patientName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)) &&
      (!typeFilter || c.type === typeFilter)
    )
  })

  const handlePost = async () => {
    setPosting(true); setPostError('')
    try {
      const res = await fetch(`/v1/ehr/${form.ehrId}/composition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          archetype_node_id: form.compositionType.archetype,
          name: { value: form.compositionType.label + (form.icd10Code ? ` (${form.icd10Code})` : '') },
          archetype_details: {
            archetype_id: { value: form.compositionType.archetype },
            template_id: { value: form.compositionType.template },
            rm_version: '1.1.0',
          },
          language: { terminology_id: { value: 'ISO_639-1' }, code_string: 'en' },
          territory: { terminology_id: { value: 'ISO_3166-1' }, code_string: 'US' },
          category: { value: 'event', defining_code: { terminology_id: { value: 'openehr' }, code_string: '433' } },
          composer: { name: form.composerName },
          context: {
            start_time: { value: new Date(form.startTime).toISOString() },
            setting: { value: SETTINGS_CODES.find(s => s.value === form.setting)?.label ?? 'Primary medical care', defining_code: { terminology_id: { value: 'openehr' }, code_string: form.setting } },
          },
          content: form.notes ? [{ archetype_node_id: 'at0001', name: { value: 'Clinical note' }, data: { text: form.notes, icd10_code: form.icd10Code, icd10_description: form.icd10Desc } }] : [],
        }),
      })
      if (res.ok) { setPosted(true); setStep(2) }
      else { const e = await res.json() as { detail?: string }; setPostError(e.detail ?? 'Failed to create composition') }
    } catch { setPostError('Network error — is the BunEHR API running?') }
    setPosting(false)
  }

  const resetForm = () => { setForm(f => ({ ...f, notes: '', icd10Code: '', icd10Desc: '' })); setStep(0); setPosted(false); setPostError(''); setCreateOpen(false) }

  return (
    <Box>
      <Icd10Lookup open={icd10Open} onClose={() => setIcd10Open(false)} onSelect={(code, desc) => { setForm(f => ({ ...f, icd10Code: code, icd10Desc: desc })); setIcd10Open(false) }} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Clinical Records</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
            Every clinical document in BunEHR is stored as a <strong>COMPOSITION</strong> — the fundamental unit of openEHR. Blood pressure readings, encounter notes, prescriptions, and lab results are all COMPOSITIONs. Every update creates a new immutable version, preserving the full audit history.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Composition
        </Button>
      </Box>

      {/* Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>What is a COMPOSITION?</strong> In openEHR, a COMPOSITION is a clinical document conforming to an internationally agreed archetype template. The version uid format is <code>uuid::system::version</code> — updates append new versions, nothing is ever deleted. Click any row to see the raw openEHR structure.
      </Alert>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" placeholder="Search by patient, type, or diagnosis…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Composition type</InputLabel>
            <Select value={typeFilter} label="Composition type" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="">All types</MenuItem>
              {COMPOSITION_TYPES.map(t => <MenuItem key={t.label} value={t.label}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Version UID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Composer</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ward</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.uid} hover>
                <TableCell>
                  <Tooltip title={c.uid}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontSize: '.75rem', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(c.uid)}>
                      {c.uid.split('::')[0]?.slice(0, 8)}…::1
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500} sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => navigate(`/patients/${c.ehrId}`)}>
                    {c.patientName}
                  </Typography>
                </TableCell>
                <TableCell><Chip label={c.type} size="small" variant="outlined" sx={{ fontSize: '.72rem' }} /></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{c.composer}</Typography></TableCell>
                <TableCell><Typography variant="caption">{c.ward}</Typography></TableCell>
                <TableCell><Typography variant="caption">{c.date}</Typography></TableCell>
                <TableCell><Chip label={c.status} size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontSize: '.7rem', height: 20 }} /></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>{c.summary}</Typography></TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => setViewComp(c)}><ViewIcon sx={{ fontSize: 16 }} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {filtered.length} of {SAMPLE_COMPOSITIONS.length} compositions · Run POST /api/seed for real openEHR compositions
      </Typography>

      {/* ── Create Composition Dialog ───────────────────────────────────── */}
      <Dialog open={createOpen} onClose={resetForm} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArticleIcon color="primary" />
              <Typography fontWeight={700}>Create New Composition</Typography>
            </Box>
            <IconButton size="small" onClick={resetForm}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={step} sx={{ mb: 3, mt: 1 }}>
            {['Select Type', 'Enter Details', 'Submitted'].map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {step === 0 && (
            <Stack gap={2}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                A <strong>COMPOSITION</strong> is created via <code>POST /v1/ehr/&#123;ehr_id&#125;/composition</code>. Choose the clinical template that defines its structure.
              </Alert>
              <FormControl fullWidth>
                <InputLabel>Patient (EHR)</InputLabel>
                <Select value={form.ehrId} label="Patient (EHR)" onChange={e => setForm(f => ({ ...f, ehrId: e.target.value }))}>
                  {SAMPLE_PATIENTS.map(p => <MenuItem key={p.ehrId} value={p.ehrId}>{p.firstName} {p.lastName} — {p.ward}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Composition type / Archetype</InputLabel>
                <Select value={form.compositionType.label} label="Composition type / Archetype"
                  onChange={e => setForm(f => ({ ...f, compositionType: COMPOSITION_TYPES.find(t => t.label === e.target.value) ?? COMPOSITION_TYPES[0]! }))}>
                  {COMPOSITION_TYPES.map(t => <MenuItem key={t.label} value={t.label}>
                    <Box><Typography variant="body2" fontWeight={500}>{t.label}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{t.archetype}</Typography></Box>
                  </MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" onClick={() => setStep(1)}>Next →</Button>
            </Stack>
          )}

          {step === 1 && (
            <Stack gap={2}>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField fullWidth label="Composer (clinician)" size="small" value={form.composerName} onChange={e => setForm(f => ({ ...f, composerName: e.target.value }))} />
                </Grid>
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Setting</InputLabel>
                    <Select value={form.setting} label="Setting" onChange={e => setForm(f => ({ ...f, setting: e.target.value }))}>
                      {SETTINGS_CODES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Start time" type="datetime-local" size="small" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField fullWidth size="small" label="ICD-10 Diagnosis code (optional)" value={form.icd10Code}
                      onChange={e => setForm(f => ({ ...f, icd10Code: e.target.value }))}
                      helperText={form.icd10Desc || 'Click search to lookup a code'} />
                    <Button variant="outlined" size="small" onClick={() => setIcd10Open(true)} sx={{ whiteSpace: 'nowrap', mb: 2.5 }}>
                      🔍 Lookup
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={4} label="Clinical notes" size="small" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Enter clinical observations, findings, or notes…" />
                </Grid>
              </Grid>
              {postError && <Alert severity="error">{postError}</Alert>}
            </Stack>
          )}

          {step === 2 && posted && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <DoneIcon sx={{ fontSize: 64, color: '#10B981', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>Composition Created!</Typography>
              <Typography variant="body2" color="text.secondary">
                The clinical document has been stored in PostgreSQL as JSONB and is now queryable via AQL.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          {step === 1 && !posted && (
            <>
              <Button onClick={() => setStep(0)}>← Back</Button>
              <Button variant="contained" startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={handlePost} disabled={posting}>
                {posting ? 'Submitting…' : 'POST /v1/ehr/.../composition'}
              </Button>
            </>
          )}
          {step === 2 && <Button variant="contained" onClick={resetForm}>Done</Button>}
        </DialogActions>
      </Dialog>

      {/* ── View Composition Dialog ─────────────────────────────────────── */}
      <Dialog open={!!viewComp} onClose={() => setViewComp(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {viewComp && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight={700}>{viewComp.type}</Typography>
                  <Typography variant="caption" color="text.secondary">{viewComp.patientName} · {viewComp.date}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setViewComp(null)}><CloseIcon /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack gap={2}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`v${viewComp.version}`} size="small" color="primary" />
                  <Chip label={viewComp.status} size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857' }} />
                  <Chip label={viewComp.ward} size="small" variant="outlined" />
                  <Chip label={viewComp.composer} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2">{viewComp.summary}</Typography>
                <Divider />
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">ARCHETYPE</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '.82rem', color: 'primary.main' }}>{viewComp.archetype}</Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">openEHR JSON</Typography>
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(viewComp.uid)}><CopyIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Box>
                  <Box component="pre" sx={{ bgcolor: '#0F172A', color: '#E2E8F0', p: 2, borderRadius: 2, fontSize: '.78rem', overflow: 'auto', fontFamily: 'monospace' }}>
{JSON.stringify({ uid: { value: viewComp.uid }, archetype_node_id: viewComp.archetype, name: { value: viewComp.type }, archetype_details: { template_id: { value: viewComp.template }, rm_version: '1.1.0' }, composer: { name: viewComp.composer }, context: { start_time: { value: `${viewComp.date}T08:00:00Z` } }, lifecycle_state: viewComp.status }, null, 2)}
                  </Box>
                </Box>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">Fetch this composition: <code>GET /v1/ehr/{viewComp.ehrId}/composition/{viewComp.uid}</code></Typography>
                </Alert>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>

      <PageGuide
        title="Clinical Records"
        tagline="Browse and create openEHR COMPOSITION clinical documents"
        overview="Every piece of clinical data in BunEHR is stored as a COMPOSITION — a structured document conforming to an internationally agreed archetype. This page shows all compositions across all patients, lets you filter by type or patient, and provides a guided form to create new compositions via the openEHR REST API."
        openEhrConcept="COMPOSITION"
        openEhrExplanation="A COMPOSITION is the basic unit of committed clinical data in openEHR. Every blood pressure reading, encounter note, prescription, lab result, or allergy record is a COMPOSITION. Compositions are stored as JSONB in PostgreSQL, versioned with append-only immutable history, and queryable via AQL. Updates create new versions (uuid::system::2) — nothing is ever overwritten."
        endpoints={[
          { method: 'POST', path: '/v1/ehr/{ehr_id}/composition', description: 'Create a new clinical document', example: 'curl -X POST http://localhost:3000/v1/ehr/EHR_ID/composition \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=representation" \\\n  -d \'{"archetype_node_id":"openEHR-EHR-COMPOSITION.encounter.v1",...}\'' },
          { method: 'GET', path: '/v1/ehr/{ehr_id}/composition/{uid}', description: 'Get composition by version uid' },
          { method: 'PUT', path: '/v1/ehr/{ehr_id}/composition/{uid}', description: 'Update — creates new version (If-Match required)' },
          { method: 'DELETE', path: '/v1/ehr/{ehr_id}/composition/{uid}', description: 'Logical delete — marks DELETED, preserves history' },
          { method: 'GET', path: '/v1/ehr/{ehr_id}/versioned_composition/{uid}', description: 'Full revision history of a composition' },
        ]}
        clinicianTips={[
          "Each row in the table is one clinical document stored in the patient's EHR.",
          "Click the version UID (first column) to copy it — useful for API calls.",
          "Click the patient name to go to their full clinical record.",
          "The 'New Composition' button walks you through creating a document via the openEHR API with ICD-10 lookup.",
          "All compositions are stored as JSONB in PostgreSQL — queryable via the AQL explorer.",
        ]}
        developerTips={[
          "POST /v1/ehr/{id}/composition with Prefer: return=representation returns the created composition with version uid.",
          "Update requires If-Match header with current version uid — prevents concurrent update conflicts.",
          "DELETE is logical: inserts a new row with lifecycle_state='DELETED'. Data never physically removed.",
          "Version history: GET /v1/ehr/{id}/versioned_composition/{uid} returns all versions.",
        ]}
      />
    </Box>
  )
}
