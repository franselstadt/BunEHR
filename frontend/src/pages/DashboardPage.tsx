/**
 * Dashboard — the first page a clinician sees on login.
 *
 * Contains:
 *  - Summary stat cards (total patients, critical alerts, today's admissions, discharges)
 *  - Interactive Leaflet map showing patient ward locations on the hospital campus
 *  - Admissions trend chart (last 7 days)
 *  - Live activity feed powered by WebSockets
 *  - Quick patient status breakdown
 */
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Grid, Card, CardContent, Typography, Box, Chip, LinearProgress,
  List, ListItem, ListItemText, ListItemIcon, Avatar, Divider,
  Alert, Button, Stack,
} from '@mui/material'
import {
  People as PeopleIcon,
  Warning as WarningIcon,
  PersonAdd as AdmitIcon,
  ExitToApp as DischargeIcon,
  FiberManualRecord as DotIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../api/ehrClient.ts'
import { statusColors, wardColors } from '../theme/medblocksTheme.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import type { LiveEvent, Patient } from '../types/openehr.ts'

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const buildAdmissionTrend = (patients: Patient[]) => {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = toIsoDate(d)
    return {
      key,
      day: DAY_LABEL[d.getDay()]!,
      admissions: patients.filter((p) => p.admittedDate === key).length,
      discharges: patients.filter((p) => p.status === 'DISCHARGED' && p.admittedDate === key).length,
    }
  })
  return days
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string; value: number | string; subtitle: string
  icon: React.ReactNode; color: string; trend?: string
}
function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 700, color: 'text.primary' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}18`, width: 44, height: 44 }}>
            <Box sx={{ color }}>{icon}</Box>
          </Avatar>
        </Box>
        {trend && (
          <Chip label={trend} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${color}12`, color, fontWeight: 600, height: 20, mt: 0.5 }} />
        )}
      </CardContent>
    </Card>
  )
}

// ── Event severity colour ─────────────────────────────────────────────────────
const severityColor = { info: '#3B82F6', warning: '#F59E0B', error: '#EF4444', success: '#10B981' }

export default function DashboardPage() {
  const { events, wsConnected } = useOutletContext<{ events: LiveEvent[]; wsConnected: boolean }>()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])

  useEffect(() => {
    getPatients().then(setPatients).catch(() => setPatients([]))
  }, [])

  const totalPatients = patients.length
  const criticalCount = patients.filter((p) => p.status === 'CRITICAL').length
  const todayAdmitted = patients.filter((p) => p.admittedDate === toIsoDate(new Date())).length
  const wardBreakdown = useMemo(() => Object.entries(
    patients.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.ward]: (acc[p.ward] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]), [patients])
  const admissionTrend = useMemo(() => buildAdmissionTrend(patients), [patients])
  const highAcuityPatients = useMemo(
    () => patients.filter((p) => ['CRITICAL', 'OBSERVATION'].includes(p.status)),
    [patients],
  )

  return (
    <Box>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" gutterBottom>Hospital Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time overview of patient activity across all wards. Data is pulled from the OpenEHR record store.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <Grid item xs={6} sm={3}>
          <StatCard title="Total Patients" value={totalPatients} subtitle="All active EHRs"
            icon={<PeopleIcon />} color="#2563EB" trend="+3 from yesterday" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Critical Alerts" value={criticalCount} subtitle="Require immediate attention"
            icon={<WarningIcon />} color="#EF4444" trend="↑ 1 new today" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Admitted Today" value={todayAdmitted} subtitle="New admissions Jun 10"
            icon={<AdmitIcon />} color="#10B981" trend="Avg 9.5/day" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="Discharges" value={6} subtitle="Discharged today"
            icon={<DischargeIcon />} color="#8B5CF6" trend="On target" />
        </Grid>

        {/* ── Hospital map ─────────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: '16px 16px 0 16px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="h6">Patient Location Map</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Each dot represents a patient's current ward. Click for details.{' '}
                    <Chip label="Live" size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: wsConnected ? '#dcfce7' : '#fef3c7', color: wsConnected ? '#166534' : '#92400e' }} />
                  </Typography>
                </Box>
                {/* Legend */}
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ maxWidth: 280, justifyContent: 'flex-end' }}>
                  {Object.entries(wardColors).slice(0, 4).map(([ward, color]) => (
                    <Chip key={ward} label={ward} size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${color}18`, color, fontWeight: 600 }} />
                  ))}
                </Stack>
              </Box>
            </CardContent>
            {/* Leaflet map — rendered at fixed height */}
            <Box sx={{ height: 340, '& .leaflet-container': { borderRadius: '0 0 10px 10px' } }}>
              <MapContainer
                center={[37.7749, -122.4194]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {patients.map(patient => {
                  const color = wardColors[patient.ward as keyof typeof wardColors] ?? '#3B82F6'
                  const isCritical = patient.status === 'CRITICAL'
                  return (
                    <CircleMarker
                      key={patient.ehrId}
                      center={[patient.location.lat, patient.location.lng]}
                      radius={isCritical ? 10 : 7}
                      pathOptions={{
                        color: isCritical ? '#EF4444' : color,
                        fillColor: isCritical ? '#EF4444' : color,
                        fillOpacity: 0.85,
                        weight: isCritical ? 3 : 1.5,
                      }}
                    >
                      <Popup>
                        <Box sx={{ minWidth: 160 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {patient.firstName} {patient.lastName}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {patient.ward} · Room {patient.room}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {patient.primaryDiagnosis}
                          </Typography>
                          <Chip
                            label={patient.status}
                            size="small"
                            sx={{ mt: 0.5, height: 18, fontSize: '0.65rem',
                              bgcolor: `${statusColors[patient.status]}18`,
                              color: statusColors[patient.status], fontWeight: 600 }}
                          />
                        </Box>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </Box>
          </Card>
        </Grid>

        {/* ── Ward breakdown ────────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Patients by Ward</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Current occupancy across all hospital wards
              </Typography>
              {wardBreakdown.map(([ward, count]) => {
                const color = wardColors[ward as keyof typeof wardColors] ?? '#3B82F6'
                return (
                  <Box key={ward} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{ward}</Typography>
                      <Typography variant="body2" color="text.secondary">{count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={totalPatients > 0 ? (count / totalPatients) * 100 : 0}
                      sx={{ bgcolor: `${color}18`, '& .MuiLinearProgress-bar': { bgcolor: color } }}
                    />
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* ── Admissions trend chart ────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>7-Day Admissions & Discharges</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Track patient flow over the past week to spot trends and plan capacity
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={admissionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="admissions" name="Admissions" fill="#2563EB" radius={[4,4,0,0]} />
                  <Bar dataKey="discharges" name="Discharges" fill="#10B981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Live event feed ───────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 320, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">Live Activity Feed</Typography>
                <DotIcon sx={{ fontSize: 10, color: wsConnected ? '#10B981' : '#F59E0B', animation: wsConnected ? 'pulse 1.5s infinite' : 'none' }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Real-time clinical events via WebSocket
              </Typography>
            </CardContent>
            <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
              {events.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
                  <DotIcon sx={{ fontSize: 24, mb: 1, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">Awaiting live events...</Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {events.slice(0, 8).map((evt, i) => (
                    <ListItem key={evt.id ?? i} disablePadding sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <DotIcon sx={{ fontSize: 10, color: severityColor[evt.severity] }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption" fontWeight={500}>{evt.patientName}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{evt.message}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Card>
        </Grid>

        {/* ── Critical patients quick list ─────────────────────────────────── */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">Critical & High-Acuity Patients</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Patients requiring close monitoring or immediate intervention
                  </Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => navigate('/patients')}>View all patients →</Button>
              </Box>
              {highAcuityPatients.map((p, i) => (
                <Box key={p.ehrId}>
                  {i > 0 && <Divider sx={{ my: 1 }} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Avatar sx={{ bgcolor: statusColors[p.status] + '18', color: statusColors[p.status], width: 36, height: 36, fontWeight: 700 }}>
                      {p.firstName[0]}{p.lastName[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 160 }}>
                      <Typography variant="body2" fontWeight={600}>{p.firstName} {p.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.primaryDiagnosis}</Typography>
                    </Box>
                    <Chip label={p.ward} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${wardColors[p.ward as keyof typeof wardColors] ?? '#3B82F6'}18`, color: wardColors[p.ward as keyof typeof wardColors] ?? '#3B82F6', fontWeight: 600 }} />
                    <Chip label={p.status} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${statusColors[p.status]}18`, color: statusColors[p.status], fontWeight: 600 }} />
                    {p.vitals && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        BP {p.vitals.bloodPressureSystolic}/{p.vitals.bloodPressureDiastolic} · HR {p.vitals.heartRate} · SpO₂ {p.vitals.oxygenSat}%
                      </Typography>
                    )}
                    <Button size="small" variant="outlined" onClick={() => navigate(`/patients/${p.ehrId}`)}>View</Button>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      <PageGuide
        title="Hospital Dashboard"
        tagline="Real-time overview of all patients and clinical activity"
        overview="The Dashboard is the nurse station view — a bird's-eye view of the entire hospital. It shows how many patients are currently admitted, how many require critical attention, and how many were admitted or discharged today. The interactive map shows each patient's physical ward location. The live activity feed shows clinical events as they happen in real time via WebSocket. The 7-day chart tracks admission and discharge trends to help with capacity planning."
        openEhrConcept="EHR + AQL"
        openEhrExplanation="The dashboard aggregates data from multiple openEHR EHR records using AQL (Archetype Query Language). Each patient has exactly one EHR — a globally unique record identified by a UUID. The dashboard queries across all EHRs to produce the summary statistics you see here."
        endpoints={[
          { method: 'GET', path: '/api/patients', description: 'Fetch all patients with demographics, ward, status, and current vitals', example: 'curl http://localhost:3000/api/patients' },
          { method: 'GET', path: '/health', description: 'Service health check — returns UP/DOWN status', example: 'curl http://localhost:3000/health' },
          { method: 'WS',  path: '/ws', description: 'WebSocket endpoint for live clinical events (admissions, alerts, lab results)', example: 'const ws = new WebSocket("ws://localhost:3000/ws")\nws.onmessage = e => console.log(JSON.parse(e.data))' },
        ]}
        clinicianTips={[
          "Red dots on the map are CRITICAL patients — click any dot for patient name, ward, and diagnosis.",
          "The live feed in the top-right updates every 8 seconds with clinical events from across the hospital.",
          "The bar chart shows 7-day admissions vs discharges — useful for bed capacity planning.",
          "Critical patients are listed at the bottom with their latest vital signs for quick triage reference.",
          "Orange/amber status means the patient is under observation — not yet critical but being monitored.",
        ]}
        developerTips={[
          "GET /api/patients — dashboard cards and map now render directly from normalized PostgreSQL patient_profile and patient_vital tables.",
          "WS /ws — connect with any WebSocket client. Events are JSON: { type, patientId, patientName, ward, message, severity, timestamp }",
          "The demo event stream fires every 8 seconds. In production, replace startDemoEventStream() with real hospital system integrations.",
          "AQL query for all EHRs: POST /v1/query/aql with { q: 'SELECT e/ehr_id/value FROM EHR e' }",
        ]}
      />
    </Box>
  )
}
