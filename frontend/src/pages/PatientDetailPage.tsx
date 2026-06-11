/**
 * Patient Detail page — full clinical record for a single patient.
 *
 * Sections:
 *  - Header: demographics, status, allergy flags
 *  - Vital signs chart (24-hour trend using Recharts)
 *  - Clinical timeline (compositions / clinical documents)
 *  - OpenEHR data view (raw EHR structure with explanations)
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Chip, Avatar, Button,
  Divider, Alert, Stack, Tooltip, Tab, Tabs, LinearProgress,
} from '@mui/material'
import {
  ArrowBack as BackIcon, Warning as AlertIcon,
  FavoriteOutlined as HeartIcon, MonitorHeart as BPIcon,
  Thermostat as TempIcon, Air as RespIcon,
  Assignment as RecordIcon, Timeline as TimelineIcon, Code as RawIcon,
} from '@mui/icons-material'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { getPatient, getVitalTrend } from '../api/ehrClient.ts'
import type { Patient } from '../types/openehr.ts'
import { statusColors, wardColors } from '../theme/medblocksTheme.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'

const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10)

/** Vital sign normal ranges — used for reference lines and colour coding */
const NORMAL_RANGES = {
  systolic:  { min: 90,  max: 140 },
  diastolic: { min: 60,  max: 90  },
  heartRate: { min: 60,  max: 100 },
  spo2:      { min: 95,  max: 100 },
  temp:      { min: 36.1, max: 37.5 },
}

interface VitalCardProps {
  label: string; value: string; unit: string
  icon: React.ReactNode; trend?: string; alert?: boolean; description: string
}
function VitalCard({ label, value, unit, icon, alert, description }: VitalCardProps) {
  return (
    <Tooltip title={description} placement="top">
      <Card sx={{ textAlign: 'center', border: alert ? '1.5px solid #EF4444' : '1px solid #E2E8F0', cursor: 'help' }}>
        <CardContent sx={{ py: 1.5 }}>
          <Box sx={{ color: alert ? '#EF4444' : 'primary.main', mb: 0.5 }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: alert ? '#EF4444' : 'text.primary' }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">{unit}</Typography>
          {alert && <Chip label="Abnormal" size="small" sx={{ display: 'block', mt: 0.5, bgcolor: '#FEF2F2', color: '#EF4444', fontSize: '0.65rem', height: 18 }} />}
        </CardContent>
      </Card>
    </Tooltip>
  )
}

/** Simulated clinical compositions (documents) for demo */
const makeMockCompositions = (patientName: string) => [
  { id: 'c-001', type: 'Encounter Note', date: '2026-06-10', author: 'Dr. Sarah Mitchell', summary: `Initial assessment of ${patientName}. Patient presented with shortness of breath and oedema.` },
  { id: 'c-002', type: 'Blood Pressure Observation', date: '2026-06-10', author: 'Nurse Williams', summary: 'Routine vital signs recorded. BP elevated — medication review requested.' },
  { id: 'c-003', type: 'Medication Order', date: '2026-06-09', author: 'Dr. Sarah Mitchell', summary: 'Furosemide 40mg OD prescribed. Spironolactone 25mg added.' },
  { id: 'c-004', type: 'Lab Result', date: '2026-06-09', author: 'Pathology Lab', summary: 'BNP 820 pg/mL (elevated). eGFR 52 mL/min/1.73m². Electrolytes within normal limits.' },
  { id: 'c-005', type: 'Allergy Record', date: '2026-06-08', author: 'Admissions Nurse', summary: 'Patient allergies documented on admission. See allergy section.' },
]

export default function PatientDetailPage() {
  const { ehrId } = useParams<{ ehrId: string }>()
  const navigate   = useNavigate()
  const [tab, setTab] = useState(0)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [vitalTrend, setVitalTrend] = useState<Array<{ time: string; systolic: number; diastolic: number; heartRate: number; spo2: number; temp: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ehrId) return
    setLoading(true)
    Promise.all([getPatient(ehrId), getVitalTrend(ehrId)])
      .then(([patientRow, trend]) => {
        setPatient(patientRow)
        setVitalTrend(trend)
      })
      .catch(() => {
        setPatient(null)
        setVitalTrend([])
      })
      .finally(() => setLoading(false))
  }, [ehrId])

  if (loading) {
    return <LinearProgress sx={{ mt: 4 }} />
  }

  if (!patient) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Alert severity="error">Patient not found. EHR ID: {ehrId}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/patients')}>Back to patients</Button>
      </Box>
    )
  }

  const compositions = makeMockCompositions(`${patient.firstName} ${patient.lastName}`)
  const wardColor    = wardColors[patient.ward as keyof typeof wardColors] ?? '#3B82F6'
  const v = patient.vitals!

  return (
    <Box>
      {/* ── Back button ────────────────────────────────────────────────────── */}
      <Button startIcon={<BackIcon />} onClick={() => navigate('/patients')} sx={{ mb: 2 }}>
        All Patients
      </Button>

      {/* ── Patient header ──────────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, border: patient.status === 'CRITICAL' ? '1.5px solid #EF4444' : '1px solid #E2E8F0' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 72, height: 72, bgcolor: `${statusColors[patient.status]}18`, color: statusColors[patient.status], fontWeight: 700, fontSize: '1.5rem' }}>
                {patient.firstName[0]}{patient.lastName[0]}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h4" fontWeight={700}>{patient.firstName} {patient.lastName}</Typography>
                <Chip label={patient.status} sx={{ bgcolor: `${statusColors[patient.status]}18`, color: statusColors[patient.status], fontWeight: 700 }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {age(patient.dateOfBirth)} y/o · {patient.gender} · Blood type: <strong>{patient.bloodType}</strong> · EHR ID: <code style={{ fontSize: '0.85em' }}>{patient.ehrId}</code>
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>{patient.primaryDiagnosis}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={patient.ward} size="small" sx={{ bgcolor: `${wardColor}15`, color: wardColor, fontWeight: 600 }} />
                <Chip label={`Room ${patient.room}`} size="small" variant="outlined" />
                <Chip label={patient.primaryClinician} size="small" variant="outlined" />
                <Chip label={`Admitted ${patient.admittedDate}`} size="small" variant="outlined" />
              </Stack>
            </Grid>
            {/* Allergies alert box */}
            {patient.allergies.length > 0 && (
              <Grid item>
                <Alert severity="error" icon={<AlertIcon />} sx={{ py: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} display="block">⚠ Allergies</Typography>
                  {patient.allergies.map(a => (
                    <Chip key={a} label={a} size="small" sx={{ mr: 0.5, mt: 0.25, bgcolor: '#FEF2F2', color: '#DC2626', fontSize: '0.7rem' }} />
                  ))}
                </Alert>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Current vital signs cards ───────────────────────────────────────── */}
      <Typography variant="h6" gutterBottom>
        Current Vital Signs
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          (Hover any card for clinical description · Last recorded {new Date(v.recordedAt).toLocaleTimeString()})
        </Typography>
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="Systolic BP" value={`${v.bloodPressureSystolic}`} unit="mmHg" icon={<BPIcon />}
            alert={v.bloodPressureSystolic > NORMAL_RANGES.systolic.max || v.bloodPressureSystolic < NORMAL_RANGES.systolic.min}
            description="Systolic blood pressure — the pressure in arteries when the heart beats. Normal: 90–140 mmHg" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="Diastolic BP" value={`${v.bloodPressureDiastolic}`} unit="mmHg" icon={<BPIcon />}
            alert={v.bloodPressureDiastolic > NORMAL_RANGES.diastolic.max || v.bloodPressureDiastolic < NORMAL_RANGES.diastolic.min}
            description="Diastolic blood pressure — the pressure when the heart rests between beats. Normal: 60–90 mmHg" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="Heart Rate" value={`${v.heartRate}`} unit="bpm" icon={<HeartIcon />}
            alert={v.heartRate > NORMAL_RANGES.heartRate.max || v.heartRate < NORMAL_RANGES.heartRate.min}
            description="Heart rate (pulse). Normal resting rate: 60–100 beats per minute" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="SpO₂" value={`${v.oxygenSat}%`} unit="oxygen sat" icon={<RespIcon />}
            alert={v.oxygenSat < NORMAL_RANGES.spo2.min}
            description="Oxygen saturation — percentage of haemoglobin carrying oxygen. Normal: ≥95%" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="Temperature" value={`${v.temperature}°`} unit="Celsius" icon={<TempIcon />}
            alert={v.temperature > NORMAL_RANGES.temp.max || v.temperature < NORMAL_RANGES.temp.min}
            description="Body temperature. Normal range: 36.1–37.5 °C. Fever ≥38°C" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <VitalCard label="Resp Rate" value={`${v.respiratoryRate}`} unit="breaths/min" icon={<RespIcon />}
            alert={v.respiratoryRate > 20 || v.respiratoryRate < 12}
            description="Respiratory rate — breaths per minute. Normal: 12–20 at rest" />
        </Grid>
      </Grid>

      {/* ── Tabbed content ──────────────────────────────────────────────────── */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #E2E8F0' }}>
        <Tab icon={<TimelineIcon />} iconPosition="start" label="Vital Trends" />
        <Tab icon={<RecordIcon />}   iconPosition="start" label="Clinical Documents" />
        <Tab icon={<RawIcon />}      iconPosition="start" label="OpenEHR Data" />
      </Tabs>

      {/* Tab 0: Vital trends chart */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>24-Hour Vital Sign Trends</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Tracked every hour. Dashed reference lines show normal clinical ranges.
              Red values indicate readings outside safe limits.
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={vitalTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="bp" domain={[60, 180]} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="hr" orientation="right" domain={[40, 160]} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Legend />
                <ReferenceLine yAxisId="bp" y={NORMAL_RANGES.systolic.max} stroke="#F59E0B" strokeDasharray="4 4" />
                <ReferenceLine yAxisId="bp" y={NORMAL_RANGES.systolic.min} stroke="#10B981" strokeDasharray="4 4" />
                <Line yAxisId="bp" type="monotone" dataKey="systolic"  name="Systolic BP"  stroke="#2563EB" dot={false} strokeWidth={2} />
                <Line yAxisId="bp" type="monotone" dataKey="diastolic" name="Diastolic BP" stroke="#93C5FD" dot={false} strokeWidth={1.5} />
                <Line yAxisId="hr" type="monotone" dataKey="heartRate" name="Heart Rate"   stroke="#EF4444" dot={false} strokeWidth={2} />
                <Line yAxisId="hr" type="monotone" dataKey="spo2"      name="SpO₂ %"       stroke="#10B981" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Clinical documents */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Clinical Documents (Compositions)</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              In OpenEHR, all clinical data is stored as <strong>Compositions</strong> — structured documents
              conforming to internationally agreed templates (archetypes). Each entry below is one such document.
            </Typography>
            {compositions.map((comp, i) => (
              <Box key={comp.id}>
                {i > 0 && <Divider sx={{ my: 1.5 }} />}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.8rem' }}>
                    <RecordIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={600}>{comp.type}</Typography>
                      <Chip label={comp.date} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                      <Typography variant="caption" color="text.secondary">{comp.author}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{comp.summary}</Typography>
                    <Typography variant="caption" color="primary.main" sx={{ mt: 0.25, display: 'block', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                      Composition ID: {comp.id} · Archetype: openEHR-EHR-COMPOSITION.encounter.v1
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Page Guide FAB ──────────────────────────────────────────────── */}
      <PageGuide
        title="Patient Detail"
        tagline="Full clinical record — vitals, documents, and openEHR data"
        overview="The Patient Detail page is the clinician's primary view of a single patient's complete medical record. It has three tabs: Vital Trends (24-hour chart of key vitals with normal range guides), Clinical Documents (the list of all compositions — clinical documents stored for this patient), and OpenEHR Data (the raw EHR structure and API endpoints for this specific patient). Each vital sign card highlights in red when outside normal clinical ranges — hover for the reference range."
        openEhrConcept="COMPOSITION"
        openEhrExplanation="A COMPOSITION is the core clinical document in openEHR — any structured piece of clinical data like blood pressure readings, encounter notes, prescriptions, or discharge summaries. Each COMPOSITION is stored as JSONB in PostgreSQL, has a globally unique version UID, and is preserved forever (updates create new versions). The 'Clinical Documents' tab shows all COMPOSITIONs in this patient's EHR."
        endpoints={[
          { method: 'GET', path: '/v1/ehr/{ehr_id}', description: 'Get the full EHR for this patient' },
          { method: 'GET', path: '/v1/ehr/{ehr_id}/ehr_status', description: 'Get EHR status with current version uid (ETag)' },
          { method: 'POST', path: '/v1/ehr/{ehr_id}/composition', description: 'Create a new clinical document for this patient', example: 'curl -X POST http://localhost:3000/v1/ehr/PATIENT_ID/composition \\\n  -H "Content-Type: application/json" \\\n  -H "Prefer: return=representation" \\\n  -d \'{"archetype_node_id":"openEHR-EHR-COMPOSITION.encounter.v1","name":{"value":"Encounter"},...}\'' },
          { method: 'GET', path: '/v1/ehr/{ehr_id}/versioned_ehr_status', description: 'Full version history of EHR status' },
          { method: 'GET', path: '/api/patients/{id}/vitals', description: 'Get 24-hour vital sign trend (hourly readings)' },
        ]}
        clinicianTips={[
          "Vital sign cards highlight RED when readings are outside normal clinical ranges — hover any card for the normal range.",
          "The 24-hour trend chart shows all key vitals together. Dashed lines mark the normal range boundaries.",
          "The Clinical Documents tab lists all clinical records ever created for this patient — click to expand.",
          "The OpenEHR Data tab shows the raw API structure — useful if you need to integrate with another system.",
          "Allergy alerts at the top of the page should be checked before ordering any medication.",
        ]}
        developerTips={[
          "GET /v1/ehr/{ehr_id} — save the ETag header value as the ehr_status version uid for subsequent PUT requests.",
          "POST /v1/ehr/{ehr_id}/composition — Content-Type: application/json, Prefer: return=representation returns the full created composition.",
          "PUT (update) requires If-Match header: the current composition version uid from GET or POST ETag.",
          "Version UIDs follow format: uuid::local.bunehr.com::N — the ::N suffix increments on each update.",
        ]}
      />

      {/* Tab 2: OpenEHR raw data view */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>EHR Structure</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  This is the actual OpenEHR data structure for this patient.
                  Click the endpoint to query the live API.
                </Typography>
                <Box component="pre" sx={{ bgcolor: '#0F172A', color: '#E2E8F0', p: 2, borderRadius: 2, fontSize: '0.78rem', overflow: 'auto' }}>
{JSON.stringify({
  ehr_id: { value: patient.ehrId },
  system_id: { value: 'local.bunehr.com' },
  ehr_status: {
    uid: { value: `${patient.subjectId}::local.bunehr.com::1` },
    subject: { external_ref: { id: { value: patient.subjectId }, namespace: 'local', type: 'PERSON' } },
    is_queryable: true,
    is_modifiable: true,
  },
  time_created: { value: `${patient.admittedDate}T00:00:00Z` },
}, null, 2)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>API Endpoints</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Use these OpenEHR REST API v1 endpoints to access this patient's data programmatically.
                </Typography>
                {[
                  { method: 'GET', path: `/v1/ehr/${patient.ehrId}`, desc: 'Retrieve this EHR' },
                  { method: 'GET', path: `/v1/ehr/${patient.ehrId}/ehr_status`, desc: 'Get EHR status' },
                  { method: 'POST', path: `/v1/ehr/${patient.ehrId}/composition`, desc: 'Create a new clinical document' },
                  { method: 'GET', path: `/v1/ehr/${patient.ehrId}/directory`, desc: 'Browse the EHR folder structure' },
                  { method: 'POST', path: `/v1/query/aql`, desc: "Run an AQL query against this patient's data" },
                ].map(ep => (
                  <Box key={ep.path} sx={{ mb: 1, p: 1.5, bgcolor: 'background.default', borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                      <Chip label={ep.method} size="small"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700,
                          bgcolor: ep.method === 'GET' ? '#DCFCE7' : '#DBEAFE',
                          color:   ep.method === 'GET' ? '#166534' : '#1D4ED8' }} />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{ep.path}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{ep.desc}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
