/**
 * Finance & Billing Page
 *
 * Hospital financial management module including:
 *  - Financial summary cards (billed, collected, outstanding)
 *  - ICD-10 diagnosis code browser with procedure cost linkage
 *  - CPT procedure code table with Medicare reimbursement rates
 *  - Patient billing records (claim status, payer, amounts)
 *  - Medicare eligibility checker
 *
 * All data is fetched from the BunEHR API and seeded via POST /api/seed-clinical.
 *
 * Made by Frans Elstadt in San Francisco.
 */
import { useState, useEffect } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Alert, Tab, Tabs, Divider, LinearProgress, Tooltip,
  CircularProgress, IconButton,
} from '@mui/material'
import {
  AttachMoney as MoneyIcon, LocalHospital as HospitalIcon,
  CheckCircle as EligibleIcon, Cancel as IneligibleIcon,
  Search as SearchIcon, Refresh as RefreshIcon,
  TrendingUp as TrendingIcon, AccountBalance as InsuranceIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { SAMPLE_PATIENTS } from '../api/samplePatients.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import { Icd10Lookup } from '../components/shared/Icd10Lookup.tsx'
import { SAMPLE_FINANCIAL_RECORDS, SAMPLE_MEDICARE, ICD10_CODES, PROCEDURE_CODES } from '../api/sampleClinicalData.ts'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID:      { bg: '#ECFDF5', color: '#047857' },
  PENDING:   { bg: '#FEF3C7', color: '#92400E' },
  SUBMITTED: { bg: '#EFF6FF', color: '#1D4ED8' },
  DENIED:    { bg: '#FEF2F2', color: '#B91C1C' },
  APPEALED:  { bg: '#F5F3FF', color: '#6D28D9' },
}

const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function FinancePage() {
  const [tab,        setTab]        = useState(0)
  const [icd10Open,  setIcd10Open]  = useState(false)
  const [icdSearch,  setIcdSearch]  = useState('')
  const [cptSearch,  setCptSearch]  = useState('')
  const [cptCat,     setCptCat]     = useState('')
  const [icdCat,     setIcdCat]     = useState('')
  const [seeding,    setSeeding]    = useState(false)
  const [seedDone,   setSeedDone]   = useState(false)
  const [seedError,  setSeedError]  = useState('')
  const [apiFinance, setApiFinance] = useState<null | { results: FinRec[] }>(null)

  interface FinRec { id: string; ehr_id: string; icd10_code: string; procedure_code: string; billed_amount: string; insurance_payment: string; patient_payment: string; balance: string; status: string; payer: string; service_date: string }

  useEffect(() => {
    fetch('/v1/finance').then(r => r.ok ? r.json() : null).then(d => d && setApiFinance(d as { results: FinRec[] })).catch(() => {})
  }, [seedDone])

  const totalBilled      = SAMPLE_FINANCIAL_RECORDS.reduce((s, r) => s + r.billed, 0)
  const totalCollected   = SAMPLE_FINANCIAL_RECORDS.reduce((s, r) => s + r.insurance + r.patient, 0)
  const totalOutstanding = totalBilled - totalCollected
  const collectionRate   = Math.round((totalCollected / totalBilled) * 100)
  const medicareCount    = SAMPLE_MEDICARE.filter(m => m.status === 'ELIGIBLE').length

  const filteredIcd10 = ICD10_CODES.filter(c => {
    const q = icdSearch.toLowerCase()
    return (!q || c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) && (!icdCat || c.category === icdCat)
  }).slice(0, 50)

  const filteredCpt = PROCEDURE_CODES.filter(p => {
    const q = cptSearch.toLowerCase()
    return (!q || p.description.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) && (!cptCat || p.category === cptCat)
  }).slice(0, 50)

  const cptCategories = [...new Set(PROCEDURE_CODES.map(p => p.category))].sort()
  const icd10Categories = [...new Set(ICD10_CODES.map(c => c.category))].sort()

  const getPatientName = (ehrId: string) => {
    const p = SAMPLE_PATIENTS.find(x => x.ehrId === ehrId)
    return p ? `${p.firstName} ${p.lastName}` : ehrId
  }

  const seedClinical = async () => {
    setSeeding(true); setSeedError('')
    try {
      const r = await fetch('/api/seed-clinical', { method: 'POST' })
      const d = await r.json() as Record<string, unknown>
      if (r.ok) setSeedDone(true)
      else setSeedError(String(d.detail ?? 'Seed failed'))
    } catch { setSeedError('API not reachable') }
    setSeeding(false)
  }

  return (
    <Box>
      <Icd10Lookup open={icd10Open} onClose={() => setIcd10Open(false)} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Finance & Billing</Typography>
          <Typography variant="body2" color="text.secondary">
            ICD-10 diagnosis codes, CPT procedure costs, Medicare eligibility, and patient billing records.
            All codes are linked — select a diagnosis to see related procedures and Medicare reimbursement rates.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" size="small" startIcon={<SearchIcon />} onClick={() => setIcd10Open(true)}>
            ICD-10 Lookup
          </Button>
          <Button variant="contained" size="small" startIcon={seeding ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
            onClick={seedClinical} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed Clinical Data'}
          </Button>
        </Stack>
      </Box>

      {seedDone && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSeedDone(false)}>Clinical data seeded successfully — ICD-10 codes, CPT codes, financial records, and Medicare eligibility loaded.</Alert>}
      {seedError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSeedError('')}>{seedError}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Billed', value: fmtUSD(totalBilled), icon: <MoneyIcon />, color: '#2563EB', sub: `${SAMPLE_FINANCIAL_RECORDS.length} claims` },
          { label: 'Collected', value: fmtUSD(totalCollected), icon: <TrendingIcon />, color: '#10B981', sub: `${collectionRate}% collection rate` },
          { label: 'Outstanding', value: fmtUSD(totalOutstanding), icon: <InsuranceIcon />, color: '#F59E0B', sub: 'Pending/unpaid balances' },
          { label: 'Medicare Eligible', value: `${medicareCount} patients`, icon: <EligibleIcon />, color: '#8B5CF6', sub: 'Part A/B enrolled' },
        ].map(stat => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '.68rem', letterSpacing: '.06em', fontWeight: 700 }}>{stat.label}</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: stat.color, mt: 0.3 }}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.sub}</Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: .7 }}>{stat.icon}</Box>
                </Box>
                {stat.label === 'Collected' && (
                  <LinearProgress variant="determinate" value={collectionRate} sx={{ mt: 1, height: 5, borderRadius: 2, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="ICD-10 Codes" />
        <Tab label="CPT Procedures & Costs" />
        <Tab label="Patient Billing" />
        <Tab label="Medicare Eligibility" />
      </Tabs>

      {/* ── Tab 0: ICD-10 ───────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            <strong>ICD-10-CM</strong> (International Classification of Diseases) codes are the standard for medical diagnosis billing. Every claim must include the appropriate ICD-10 code. Click any row to see linked CPT procedure codes and Medicare reimbursement rates.
          </Alert>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={7}>
              <TextField fullWidth size="small" placeholder="Search ICD-10 codes or descriptions…"
                value={icdSearch} onChange={e => setIcdSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Chapter</InputLabel>
                <Select value={icdCat} label="Chapter" onChange={e => setIcdCat(e.target.value)}>
                  <MenuItem value="">All chapters</MenuItem>
                  {icd10Categories.map(c => <MenuItem key={c} value={c}>{c} — {ICD10_CODES.find(x => x.category === c)?.categoryDescription.split(' ').slice(0, 3).join(' ') ?? c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 90 }}>Chapter</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>Billable</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>API Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredIcd10.map(c => (
                  <TableRow key={c.code} hover>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB', fontSize: '.82rem' }}>{c.code}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontSize: '.83rem' }}>{c.description}</Typography></TableCell>
                    <TableCell><Chip label={c.category} size="small" sx={{ height: 18, fontSize: '.68rem' }} /></TableCell>
                    <TableCell>{c.billable ? <Chip label="✓ Yes" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', height: 18, fontSize: '.68rem' }} /> : <Chip label="No" size="small" variant="outlined" sx={{ height: 18, fontSize: '.68rem' }} />}</TableCell>
                    <TableCell>
                      <Tooltip title={`GET /v1/icd10/${c.code}`}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '.7rem', cursor: 'pointer' }}
                          onClick={() => navigator.clipboard.writeText(`/v1/icd10/${c.code}`)}>
                          /v1/icd10/
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredIcd10.length} of {ICD10_CODES.length} codes · Full API: GET /v1/icd10?q=search&category=I · CDC ICD-10-CM FY2024
          </Typography>
        </Box>
      )}

      {/* ── Tab 1: CPT Procedures ────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            <strong>CPT codes</strong> (Current Procedural Terminology) identify medical procedures for billing. Medicare rates are the CMS 2024 national average facility rate. Typical charge is the average private-payer billed amount.
          </Alert>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={7}>
              <TextField fullWidth size="small" placeholder="Search procedures…"
                value={cptSearch} onChange={e => setCptSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Specialty</InputLabel>
                <Select value={cptCat} label="Specialty" onChange={e => setCptCat(e.target.value)}>
                  <MenuItem value="">All specialties</MenuItem>
                  {cptCategories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 80 }}>CPT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>Specialty</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }} align="right">Medicare Rate</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }} align="right">Typical Charge</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">RVU Work</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCpt.map(p => (
                  <TableRow key={p.code} hover>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#8B5CF6', fontSize: '.82rem' }}>{p.code}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontSize: '.82rem' }}>{p.description}</Typography></TableCell>
                    <TableCell><Chip label={p.category} size="small" variant="outlined" sx={{ height: 18, fontSize: '.67rem', maxWidth: 130 }} /></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#10B981', fontSize: '.83rem' }}>
                        {p.medicareRate > 0 ? fmtUSD(p.medicareRate) : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: '#475569', fontSize: '.83rem' }}>{fmtUSD(p.typicalCharge)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.rvuWork}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredCpt.length} of {PROCEDURE_CODES.length} codes · API: GET /v1/procedures?q=search · CMS 2024 Physician Fee Schedule
          </Typography>
        </Box>
      )}

      {/* ── Tab 2: Patient Billing ───────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            Financial records link patients (EHR) to diagnosis codes (ICD-10) and procedures (CPT). Create records via <code>POST /v1/finance</code>. Run "Seed Clinical Data" to load demo billing records.
          </Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ICD-10</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CPT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Service Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Payer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Billed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Insurance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Patient</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAMPLE_FINANCIAL_RECORDS.map((r, i) => {
                  const status = STATUS_COLORS[r.status] ?? STATUS_COLORS['PENDING']!
                  const balance = r.billed - r.insurance - r.patient
                  return (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '.82rem' }}>{getPatientName(r.ehrId)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={r.icd10} size="small" sx={{ height: 18, fontSize: '.7rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }} /></TableCell>
                      <TableCell><Chip label={r.cpt} size="small" sx={{ height: 18, fontSize: '.7rem', bgcolor: '#F5F3FF', color: '#6D28D9', fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography variant="caption">{r.serviceDate}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{r.payer}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={{ fontSize: '.83rem' }}>{fmtUSD(r.billed)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ color: '#10B981', fontSize: '.83rem' }}>{fmtUSD(r.insurance)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '.83rem' }}>{fmtUSD(r.patient)}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} sx={{ color: balance > 0 ? '#EF4444' : '#10B981', fontSize: '.83rem' }}>{fmtUSD(balance)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={r.status} size="small" sx={{ height: 20, fontSize: '.68rem', fontWeight: 700, ...status }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
            {['PAID', 'SUBMITTED', 'PENDING', 'DENIED'].map(s => {
              const count = SAMPLE_FINANCIAL_RECORDS.filter(r => r.status === s).length
              const total = SAMPLE_FINANCIAL_RECORDS.filter(r => r.status === s).reduce((sum, r) => sum + r.billed, 0)
              const col = STATUS_COLORS[s] ?? STATUS_COLORS['PENDING']!
              return (
                <Box key={s} sx={{ textAlign: 'center' }}>
                  <Chip label={s} size="small" sx={{ ...col, height: 20, fontSize: '.68rem', fontWeight: 700 }} />
                  <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{count} claims · {fmtUSD(total)}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* ── Tab 3: Medicare Eligibility ─────────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            <strong>Medicare</strong> is the US federal health insurance program for people 65+ and certain younger individuals with disabilities. <strong>Part A</strong> covers hospital care, <strong>Part B</strong> covers medical services, <strong>Part C</strong> is Medicare Advantage, and <strong>Part D</strong> covers prescription drugs.
          </Alert>
          <Grid container spacing={2}>
            {SAMPLE_MEDICARE.map(m => {
              const patient = SAMPLE_PATIENTS.find(p => p.ehrId === m.ehrId)
              if (!patient) return null
              const eligible = m.status === 'ELIGIBLE'
              return (
                <Grid item xs={12} sm={6} md={4} key={m.ehrId}>
                  <Card sx={{ border: eligible ? '1px solid #D1FAE5' : '1px solid #E2E8F0' }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        {eligible
                          ? <EligibleIcon sx={{ color: '#10B981', fontSize: 24 }} />
                          : <IneligibleIcon sx={{ color: '#94A3B8', fontSize: 24 }} />}
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{patient.firstName} {patient.lastName}</Typography>
                          <Chip label={m.status} size="small" sx={{ height: 18, fontSize: '.68rem', fontWeight: 700, bgcolor: eligible ? '#ECFDF5' : '#F1F5F9', color: eligible ? '#047857' : '#64748B' }} />
                        </Box>
                      </Box>
                      {eligible && m.medicareId && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mb: 1 }}>
                          MBI: {m.medicareId}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {[
                          { key: 'partA', label: 'Part A', desc: 'Hospital' },
                          { key: 'partB', label: 'Part B', desc: 'Medical' },
                          { key: 'partC', label: 'Part C', desc: 'Advantage' },
                          { key: 'partD', label: 'Part D', desc: 'Drugs' },
                        ].map(part => (
                          <Tooltip key={part.key} title={part.desc}>
                            <Chip
                              label={part.label}
                              size="small"
                              sx={{
                                height: 20, fontSize: '.68rem', fontWeight: 700,
                                bgcolor: (m as Record<string, unknown>)[part.key] ? '#DBEAFE' : '#F1F5F9',
                                color:   (m as Record<string, unknown>)[part.key] ? '#1D4ED8' : '#94A3B8',
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                      {m.planName && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Plan: {m.planName}
                        </Typography>
                      )}
                      {m.effectiveDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Effective: {m.effectiveDate}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        API: <code style={{ fontSize: '.72em' }}>GET /v1/medicare/{m.ehrId}</code>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      <PageGuide
        title="Finance & Billing"
        tagline="ICD-10 codes, CPT procedures, Medicare eligibility, and patient billing"
        overview="The Finance module links clinical data to billing. Every patient encounter generates claims using ICD-10 diagnosis codes and CPT procedure codes. Medicare eligibility determines whether federal insurance covers the cost. This page provides lookup tools for all codes, shows linked procedures with Medicare reimbursement rates, and displays billing records with claim status tracking."
        openEhrConcept="CONTRIBUTION + ICD-10"
        openEhrExplanation="In openEHR, financial records are linked to CONTRIBUTIONs — audited change-sets that record who created or updated clinical data. Every billing record references an ICD-10 diagnosis code and a CPT procedure code, creating a traceable chain from clinical documentation to financial claim."
        endpoints={[
          { method: 'GET', path: '/v1/icd10?q=hypertension', description: 'Search ICD-10 codes (full-text)' },
          { method: 'GET', path: '/v1/icd10/{code}', description: 'Get ICD-10 code + linked procedure costs' },
          { method: 'GET', path: '/v1/procedures?category=Cardiology', description: 'List CPT procedure codes with Medicare rates' },
          { method: 'GET', path: '/v1/finance/summary', description: 'Financial summary (totals, collection rate)' },
          { method: 'POST', path: '/v1/finance', description: 'Create a billing record for a patient encounter' },
          { method: 'GET', path: '/v1/medicare/{ehr_id}', description: 'Check patient Medicare eligibility' },
          { method: 'PUT', path: '/v1/medicare/{ehr_id}', description: 'Update Medicare eligibility data' },
          { method: 'POST', path: '/api/seed-clinical', description: 'Seed all ICD-10, CPT, financial, and Medicare data' },
        ]}
        clinicianTips={[
          "Click 'Seed Clinical Data' to load all ICD-10 codes, CPT procedure costs, and sample billing records.",
          "The ICD-10 Lookup button (also in the top bar) lets you search codes and see linked procedures instantly.",
          "Medicare rates are the 2024 CMS national average facility rates — actual reimbursement varies by location.",
          "Part C (Medicare Advantage) patients are covered by a private plan — check the plan name before billing Medicare directly.",
          "Balance shows the outstanding amount after insurance + patient payments.",
        ]}
        developerTips={[
          "GET /v1/icd10?q=diabetes&billable=true — searches billable diabetes codes.",
          "GET /v1/icd10/I10 — returns hypertension details with linked procedures.",
          "GET /v1/procedures?category=Cardiology — all cardiology CPT codes with RVUs.",
          "POST /v1/finance — create a billing record linking EHR → ICD-10 → CPT.",
          "GET /v1/finance/summary — aggregated totals for dashboard display.",
        ]}
      />
    </Box>
  )
}
