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
import { PageGuide } from '../components/shared/PageGuide.tsx'
import { Icd10Lookup } from '../components/shared/Icd10Lookup.tsx'
import { getPatients } from '../api/ehrClient.ts'
import type { Patient } from '../types/openehr.ts'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID:      { bg: '#ECFDF5', color: '#047857' },
  PENDING:   { bg: '#FEF3C7', color: '#92400E' },
  SUBMITTED: { bg: '#EFF6FF', color: '#1D4ED8' },
  DENIED:    { bg: '#FEF2F2', color: '#B91C1C' },
  APPEALED:  { bg: '#F5F3FF', color: '#6D28D9' },
}

const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

interface FinRec {
  id: string
  ehr_id: string
  icd10_code: string
  procedure_code: string
  billed_amount: string
  insurance_payment: string
  patient_payment: string
  balance: string
  status: string
  payer: string
  service_date: string
}

interface MedicareRow {
  ehr_id: string
  medicare_id: string | null
  part_a: boolean
  part_b: boolean
  part_c: boolean
  part_d: boolean
  plan_name: string | null
  effective_date: string | null
  status: string
}

interface Icd10Row {
  code: string
  description: string
  category: string
  category_description: string
  billable: boolean
}

interface ProcedureRow {
  code: string
  description: string
  category: string
  medicare_rate: string | null
  typical_charge: string | null
  rvu_work: string | null
}

interface FinanceSummary {
  total_billed: number
  total_collected: number
  total_outstanding: number
  collection_rate: number
  claim_count: number
  medicare_eligible_count: number
  by_status: Array<{ status: string; count: number }>
}

interface GlAccountRow {
  id: string
  code: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | string
  parent_id: string | null
  is_active: boolean
}

interface GeneralLedgerRow {
  entry_id: string
  entry_number: string
  entry_date: string
  entry_description: string
  line_id: string
  line_number: number
  account_id: string
  debit: string
  credit: string
  line_description: string | null
  account_code: string
  account_name: string
  account_type: string
}

interface TrialBalanceRow {
  account_id: string
  account_code: string
  account_name: string
  account_type: string
  debit: number
  credit: number
  balance: number
}

interface TrialBalanceResponse {
  as_of: string | null
  entries: TrialBalanceRow[]
  totals: { debit: number; credit: number; in_balance: boolean }
}

interface AuditRow {
  id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  action: string
  actor: string
  created_at: string
}

interface JournalLineDraft {
  account_id: string
  debit: number
  credit: number
  description: string
}

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
  const [patients, setPatients] = useState<Patient[]>([])
  const [financeRows, setFinanceRows] = useState<FinRec[]>([])
  const [medicareRows, setMedicareRows] = useState<MedicareRow[]>([])
  const [icd10Rows, setIcd10Rows] = useState<Icd10Row[]>([])
  const [procedureRows, setProcedureRows] = useState<ProcedureRow[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [procedureCategories, setProcedureCategories] = useState<string[]>([])
  const [icdCategories, setIcdCategories] = useState<Array<{ category: string; description: string }>>([])
  const [glAccounts, setGlAccounts] = useState<GlAccountRow[]>([])
  const [ledgerRows, setLedgerRows] = useState<GeneralLedgerRow[]>([])
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null)
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [ledgerFrom, setLedgerFrom] = useState('')
  const [ledgerTo, setLedgerTo] = useState('')
  const [newAccount, setNewAccount] = useState({ code: '', name: '', type: 'ASSET' })
  const [journalDesc, setJournalDesc] = useState('Manual posting')
  const [journalLines, setJournalLines] = useState<JournalLineDraft[]>([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' },
  ])
  const [glMessage, setGlMessage] = useState('')

  const loadData = async () => {
    const [patientRes, summaryRes, financeRes, medicareRes, icdRes, procedureRes, procedureCategoriesRes, icdCategoriesRes, accountRes, trialRes, auditRes] = await Promise.all([
      getPatients().catch(() => []),
      fetch('/v1/finance/summary').then((r) => r.ok ? r.json() : null),
      fetch('/v1/finance?limit=500').then((r) => r.ok ? r.json() : { results: [] }),
      fetch('/v1/medicare?limit=500').then((r) => r.ok ? r.json() : { results: [] }),
      fetch('/v1/icd10?limit=500').then((r) => r.ok ? r.json() : { results: [] }),
      fetch('/v1/procedures?limit=500').then((r) => r.ok ? r.json() : { results: [] }),
      fetch('/v1/procedures/categories').then((r) => r.ok ? r.json() : []),
      fetch('/v1/icd10/categories').then((r) => r.ok ? r.json() : []),
      fetch('/v1/finance/accounts').then((r) => r.ok ? r.json() : []),
      fetch('/v1/finance/trial-balance').then((r) => r.ok ? r.json() : null),
      fetch('/v1/finance/audit?limit=150').then((r) => r.ok ? r.json() : { results: [] }),
    ])

    setPatients(patientRes)
    setSummary(summaryRes as FinanceSummary | null)
    setFinanceRows(((financeRes as { results?: FinRec[] }).results) ?? [])
    setMedicareRows(((medicareRes as { results?: MedicareRow[] }).results) ?? [])
    setIcd10Rows(((icdRes as { results?: Icd10Row[] }).results) ?? [])
    setProcedureRows(((procedureRes as { results?: ProcedureRow[] }).results) ?? [])
    setProcedureCategories(Array.isArray(procedureCategoriesRes) ? procedureCategoriesRes as string[] : [])
    setIcdCategories(Array.isArray(icdCategoriesRes) ? icdCategoriesRes as Array<{ category: string; description: string }> : [])
    setGlAccounts(Array.isArray(accountRes) ? accountRes as GlAccountRow[] : [])
    setTrialBalance((trialRes as TrialBalanceResponse | null) ?? null)
    setAuditRows(((auditRes as { results?: AuditRow[] }).results) ?? [])
  }

  useEffect(() => {
    loadData().catch(() => {})
  }, [seedDone])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (ledgerAccountId) qs.set('account_id', ledgerAccountId)
    if (ledgerFrom) qs.set('from', ledgerFrom)
    if (ledgerTo) qs.set('to', ledgerTo)
    fetch(`/v1/finance/general-ledger?${qs.toString()}`)
      .then((r) => r.ok ? r.json() : { results: [] })
      .then((d) => setLedgerRows(((d as { results?: GeneralLedgerRow[] }).results) ?? []))
      .catch(() => setLedgerRows([]))
  }, [ledgerAccountId, ledgerFrom, ledgerTo, seedDone])

  const totalBilled = summary?.total_billed ?? 0
  const totalCollected = summary?.total_collected ?? 0
  const totalOutstanding = summary?.total_outstanding ?? 0
  const collectionRate = Math.round(summary?.collection_rate ?? 0)
  const medicareCount = summary?.medicare_eligible_count ?? 0

  const filteredIcd10 = icd10Rows.filter(c => {
    const q = icdSearch.toLowerCase()
    return (!q || c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) && (!icdCat || c.category === icdCat)
  }).slice(0, 50)

  const filteredCpt = procedureRows.filter(p => {
    const q = cptSearch.toLowerCase()
    return (!q || p.description.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) && (!cptCat || p.category === cptCat)
  }).slice(0, 50)

  const cptCategories = procedureCategories
  const icd10Categories = icdCategories

  const getPatientName = (ehrId: string) => {
    const p = patients.find(x => x.ehrId === ehrId)
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

  const createAccount = async () => {
    setGlMessage('')
    const r = await fetch('/v1/finance/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newAccount.code.trim(),
        name: newAccount.name.trim(),
        type: newAccount.type,
      }),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ detail: 'Failed to create account' }))
      setGlMessage(String((e as { detail?: string }).detail ?? 'Failed to create account'))
      return
    }
    setNewAccount({ code: '', name: '', type: 'ASSET' })
    setGlMessage('Account created.')
    await loadData()
  }

  const postJournalEntry = async () => {
    setGlMessage('')
    const lines = journalLines
      .filter((l) => l.account_id && (l.debit > 0 || l.credit > 0))
      .map((l) => ({
        account_id: l.account_id,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description || undefined,
      }))
    const r = await fetch('/v1/finance/journal-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: journalDesc.trim() || 'Manual posting',
        lines,
      }),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({ detail: 'Failed to post journal entry' }))
      setGlMessage(String((e as { detail?: string }).detail ?? 'Failed to post journal entry'))
      return
    }
    setGlMessage('Journal entry posted.')
    setJournalLines([
      { account_id: '', debit: 0, credit: 0, description: '' },
      { account_id: '', debit: 0, credit: 0, description: '' },
    ])
    await loadData()
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
          { label: 'Total Billed', value: fmtUSD(totalBilled), icon: <MoneyIcon />, color: '#2563EB', sub: `${summary?.claim_count ?? financeRows.length} claims` },
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
        <Tab label="Chart of Accounts" />
        <Tab label="Journal Entries" />
        <Tab label="General Ledger" />
        <Tab label="Trial Balance (GAAP)" />
        <Tab label="Audit Trail" />
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
                  {icd10Categories.map(c => <MenuItem key={c.category} value={c.category}>{c.category} — {(c.description ?? c.category).split(' ').slice(0, 3).join(' ')}</MenuItem>)}
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
            Showing {filteredIcd10.length} of {icd10Rows.length} codes · Full API: GET /v1/icd10?q=search&category=I · CDC ICD-10-CM FY2024
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
                        {Number(p.medicare_rate ?? 0) > 0 ? fmtUSD(Number(p.medicare_rate ?? 0)) : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: '#475569', fontSize: '.83rem' }}>{fmtUSD(Number(p.typical_charge ?? 0))}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.rvu_work ?? '0.00'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredCpt.length} of {procedureRows.length} codes · API: GET /v1/procedures?q=search · CMS 2024 Physician Fee Schedule
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
                {financeRows.map((r) => {
                  const status = STATUS_COLORS[r.status] ?? STATUS_COLORS['PENDING']!
                  const billed = Number(r.billed_amount ?? 0)
                  const insurance = Number(r.insurance_payment ?? 0)
                  const patient = Number(r.patient_payment ?? 0)
                  const balance = billed - insurance - patient
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '.82rem' }}>{getPatientName(r.ehr_id)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={r.icd10_code} size="small" sx={{ height: 18, fontSize: '.7rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }} /></TableCell>
                      <TableCell><Chip label={r.procedure_code} size="small" sx={{ height: 18, fontSize: '.7rem', bgcolor: '#F5F3FF', color: '#6D28D9', fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography variant="caption">{new Date(r.service_date).toISOString().slice(0, 10)}</Typography></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{r.payer}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={{ fontSize: '.83rem' }}>{fmtUSD(billed)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ color: '#10B981', fontSize: '.83rem' }}>{fmtUSD(insurance)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '.83rem' }}>{fmtUSD(patient)}</Typography></TableCell>
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
              const count = financeRows.filter(r => r.status === s).length
              const total = financeRows.filter(r => r.status === s).reduce((sum, r) => sum + Number(r.billed_amount ?? 0), 0)
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
            {medicareRows.map(m => {
              const patient = patients.find(p => p.ehrId === m.ehr_id)
              if (!patient) return null
              const eligible = m.status === 'ELIGIBLE'
              return (
                <Grid item xs={12} sm={6} md={4} key={m.ehr_id}>
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
                      {eligible && m.medicare_id && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mb: 1 }}>
                          MBI: {m.medicare_id}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        {[
                          { key: 'part_a' as const, label: 'Part A', desc: 'Hospital' },
                          { key: 'part_b' as const, label: 'Part B', desc: 'Medical' },
                          { key: 'part_c' as const, label: 'Part C', desc: 'Advantage' },
                          { key: 'part_d' as const, label: 'Part D', desc: 'Drugs' },
                        ].map(part => (
                          <Tooltip key={part.key} title={part.desc}>
                            <Chip
                              label={part.label}
                              size="small"
                              sx={{
                                height: 20, fontSize: '.68rem', fontWeight: 700,
                                bgcolor: m[part.key] ? '#DBEAFE' : '#F1F5F9',
                                color:   m[part.key] ? '#1D4ED8' : '#94A3B8',
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                      {m.plan_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Plan: {m.plan_name}
                        </Typography>
                      )}
                      {m.effective_date && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Effective: {new Date(m.effective_date).toISOString().slice(0, 10)}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        API: <code style={{ fontSize: '.72em' }}>GET /v1/medicare/{m.ehr_id}</code>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      {/* ── Tab 4: Chart of Accounts ────────────────────────────────────── */}
      {tab === 4 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            QuickBooks-style chart of accounts. Create account codes and keep account types aligned to GAAP buckets.
          </Alert>
          {glMessage && <Alert severity={glMessage.toLowerCase().includes('failed') ? 'error' : 'success'} sx={{ mb: 2 }}>{glMessage}</Alert>}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={2}><TextField size="small" fullWidth label="Code" value={newAccount.code} onChange={e => setNewAccount(a => ({ ...a, code: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="Name" value={newAccount.name} onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select label="Type" value={newAccount.type} onChange={e => setNewAccount(a => ({ ...a, type: e.target.value }))}>
                  {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}><Button variant="contained" onClick={createAccount}>Create Account</Button></Grid>
          </Grid>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Code</TableCell><TableCell sx={{ fontWeight: 700 }}>Name</TableCell><TableCell sx={{ fontWeight: 700 }}>Type</TableCell><TableCell sx={{ fontWeight: 700 }}>Active</TableCell></TableRow></TableHead>
              <TableBody>
                {glAccounts.map(a => (
                  <TableRow key={a.id} hover>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{a.code}</Typography></TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell><Chip size="small" label={a.type} /></TableCell>
                    <TableCell>{a.is_active ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Tab 5: Journal Entries ───────────────────────────────────────── */}
      {tab === 5 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            Post balanced journal entries (debits = credits). This drives the ledger, trial balance, and GAAP checks.
          </Alert>
          {glMessage && <Alert severity={glMessage.toLowerCase().includes('failed') ? 'error' : 'success'} sx={{ mb: 2 }}>{glMessage}</Alert>}
          <TextField size="small" fullWidth label="Entry description" value={journalDesc} onChange={e => setJournalDesc(e.target.value)} sx={{ mb: 2 }} />
          <Grid container spacing={1}>
            {journalLines.map((line, idx) => (
              <Grid key={idx} item xs={12}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Account</InputLabel>
                      <Select label="Account" value={line.account_id} onChange={e => setJournalLines(lines => lines.map((l, i) => i === idx ? { ...l, account_id: e.target.value } : l))}>
                        {glAccounts.map(a => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}><TextField size="small" fullWidth label="Debit" type="number" value={line.debit} onChange={e => setJournalLines(lines => lines.map((l, i) => i === idx ? { ...l, debit: Number(e.target.value) } : l))} /></Grid>
                  <Grid item xs={6} md={2}><TextField size="small" fullWidth label="Credit" type="number" value={line.credit} onChange={e => setJournalLines(lines => lines.map((l, i) => i === idx ? { ...l, credit: Number(e.target.value) } : l))} /></Grid>
                  <Grid item xs={12} md={4}><TextField size="small" fullWidth label="Line description" value={line.description} onChange={e => setJournalLines(lines => lines.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} /></Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => setJournalLines(lines => [...lines, { account_id: '', debit: 0, credit: 0, description: '' }])}>Add Line</Button>
            <Button variant="contained" onClick={postJournalEntry}>Post Journal Entry</Button>
          </Stack>
        </Box>
      )}

      {/* ── Tab 6: General Ledger ────────────────────────────────────────── */}
      {tab === 6 && (
        <Box>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Filter</InputLabel>
                <Select label="Account Filter" value={ledgerAccountId} onChange={e => setLedgerAccountId(e.target.value)}>
                  <MenuItem value="">All accounts</MenuItem>
                  {glAccounts.map(a => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}><TextField size="small" fullWidth label="From" type="date" InputLabelProps={{ shrink: true }} value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} /></Grid>
            <Grid item xs={6} md={3}><TextField size="small" fullWidth label="To" type="date" InputLabelProps={{ shrink: true }} value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} /></Grid>
          </Grid>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Date</TableCell><TableCell sx={{ fontWeight: 700 }}>Entry #</TableCell><TableCell sx={{ fontWeight: 700 }}>Account</TableCell><TableCell sx={{ fontWeight: 700 }} align="right">Debit</TableCell><TableCell sx={{ fontWeight: 700 }} align="right">Credit</TableCell><TableCell sx={{ fontWeight: 700 }}>Description</TableCell></TableRow></TableHead>
              <TableBody>
                {ledgerRows.map(r => (
                  <TableRow key={r.line_id} hover>
                    <TableCell>{new Date(r.entry_date).toISOString().slice(0, 10)}</TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.entry_number}</Typography></TableCell>
                    <TableCell>{r.account_code} — {r.account_name}</TableCell>
                    <TableCell align="right">{fmtUSD(Number(r.debit ?? 0))}</TableCell>
                    <TableCell align="right">{fmtUSD(Number(r.credit ?? 0))}</TableCell>
                    <TableCell>{r.line_description ?? r.entry_description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Tab 7: Trial Balance ─────────────────────────────────────────── */}
      {tab === 7 && (
        <Box>
          <Alert severity={trialBalance?.totals?.in_balance ? 'success' : 'error'} sx={{ mb: 2 }}>
            GAAP check — Debits: {fmtUSD(trialBalance?.totals?.debit ?? 0)} · Credits: {fmtUSD(trialBalance?.totals?.credit ?? 0)} ·
            {trialBalance?.totals?.in_balance ? ' In balance' : ' Out of balance'}
          </Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Code</TableCell><TableCell sx={{ fontWeight: 700 }}>Account</TableCell><TableCell sx={{ fontWeight: 700 }}>Type</TableCell><TableCell sx={{ fontWeight: 700 }} align="right">Debit</TableCell><TableCell sx={{ fontWeight: 700 }} align="right">Credit</TableCell><TableCell sx={{ fontWeight: 700 }} align="right">Balance</TableCell></TableRow></TableHead>
              <TableBody>
                {(trialBalance?.entries ?? []).map(e => (
                  <TableRow key={e.account_id}>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{e.account_code}</Typography></TableCell>
                    <TableCell>{e.account_name}</TableCell>
                    <TableCell><Chip size="small" label={e.account_type} /></TableCell>
                    <TableCell align="right">{fmtUSD(e.debit)}</TableCell>
                    <TableCell align="right">{fmtUSD(e.credit)}</TableCell>
                    <TableCell align="right">{fmtUSD(e.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Tab 8: Audit Trail ───────────────────────────────────────────── */}
      {tab === 8 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
            Immutable audit feed for finance postings and Rx events.
          </Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 540, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell sx={{ fontWeight: 700 }}>Time</TableCell><TableCell sx={{ fontWeight: 700 }}>Event</TableCell><TableCell sx={{ fontWeight: 700 }}>Aggregate</TableCell><TableCell sx={{ fontWeight: 700 }}>Action</TableCell><TableCell sx={{ fontWeight: 700 }}>Actor</TableCell></TableRow></TableHead>
              <TableBody>
                {auditRows.map(a => (
                  <TableRow key={a.id} hover>
                    <TableCell>{new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 19)}Z</TableCell>
                    <TableCell>{a.event_type}</TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{a.aggregate_type}</Typography></TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.actor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <PageGuide
        title="Finance & Billing"
        tagline="Billing + general ledger, GAAP checks, audit trail"
        overview="The Finance module now includes both clinical billing and accounting operations. It links ICD-10/CPT claims to a QuickBooks-style chart of accounts, supports balanced journal posting, renders general ledger lines, computes trial balance, and provides an audit trail alongside Medicare eligibility and claims tracking."
        openEhrConcept="CONTRIBUTION + ICD-10"
        openEhrExplanation="In openEHR, financial records are linked to CONTRIBUTIONs — audited change-sets that record who created or updated clinical data. Every billing record references an ICD-10 diagnosis code and a CPT procedure code, creating a traceable chain from clinical documentation to financial claim."
        endpoints={[
          { method: 'GET', path: '/v1/icd10?q=hypertension', description: 'Search ICD-10 codes (full-text)' },
          { method: 'GET', path: '/v1/icd10/{code}', description: 'Get ICD-10 code + linked procedure costs' },
          { method: 'GET', path: '/v1/procedures?category=Cardiology', description: 'List CPT procedure codes with Medicare rates' },
          { method: 'GET', path: '/v1/finance/summary', description: 'Financial summary (totals, collection rate)' },
          { method: 'POST', path: '/v1/finance', description: 'Create a billing record for a patient encounter' },
          { method: 'GET', path: '/v1/finance/accounts', description: 'Chart of accounts list' },
          { method: 'POST', path: '/v1/finance/journal-entries', description: 'Post balanced journal entry' },
          { method: 'GET', path: '/v1/finance/general-ledger', description: 'Ledger detail by account/date' },
          { method: 'GET', path: '/v1/finance/trial-balance', description: 'GAAP trial balance snapshot' },
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
