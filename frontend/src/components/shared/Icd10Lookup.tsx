/**
 * ICD-10 Quick Lookup Modal
 * Opens from the TopBar search icon. Provides instant full-text search
 * across all 300+ ICD-10 codes with procedure linkage and cost display.
 *
 * Made by Frans Elstadt in San Francisco.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogTitle, DialogContent, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, Box, Typography, Stack, IconButton, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Tooltip, Divider, Alert,
} from '@mui/material'
import {
  Search as SearchIcon, Close as CloseIcon,
  AttachMoney as MoneyIcon, LocalHospital as HospitalIcon,
  CheckCircle as BillableIcon,
} from '@mui/icons-material'

interface Icd10Result {
  code: string
  description: string
  category: string
  category_description: string
  billable: boolean
  linkedProcedures?: Array<{
    code: string
    description: string
    medicare_rate: string
    typical_charge: string
    relationship: string
  }>
}

interface Icd10LookupProps {
  open: boolean
  onClose: () => void
  /** Optional: call when a code is selected (e.g. for form auto-fill) */
  onSelect?: (code: string, description: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  A: 'A — Infectious', B: 'B — Infectious', C: 'C — Neoplasms', D: 'D — Blood',
  E: 'E — Endocrine', F: 'F — Mental Health', G: 'G — Neurological', H: 'H — Eye/Ear',
  I: 'I — Cardiovascular', J: 'J — Respiratory', K: 'K — Digestive', M: 'M — Musculoskeletal',
  N: 'N — Genitourinary', R: 'R — Symptoms', S: 'S — Injuries', T: 'T — Injuries',
  Z: 'Z — Health Status',
}

export function Icd10Lookup({ open, onClose, onSelect }: Icd10LookupProps) {
  const [q,        setQ]        = useState('')
  const [category, setCategory] = useState('')
  const [results,  setResults]  = useState<Icd10Result[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<Icd10Result | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [total, setTotal] = useState(0)

  const search = useCallback(async (query: string, cat: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (query.trim()) params.set('q', query.trim())
      if (cat) params.set('category', cat)
      const res = await fetch(`/v1/icd10?${params}`)
      if (res.ok) {
        const data = await res.json() as { results: Icd10Result[]; total: number }
        setResults(data.results)
        setTotal(data.total)
      }
    } catch { /* API may not be seeded yet */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => search(q, category), 280)
    return () => clearTimeout(timer)
  }, [q, category, open, search])

  const loadDetail = async (code: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/v1/icd10/${encodeURIComponent(code)}`)
      if (res.ok) setSelected(await res.json() as Icd10Result)
    } catch { /* ignore */ }
    setLoadingDetail(false)
  }

  const handleClose = () => { setQ(''); setCategory(''); setSelected(null); onClose() }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '85vh' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HospitalIcon sx={{ color: 'primary.main' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>ICD-10 Quick Lookup</Typography>
            <Typography variant="caption" color="text.secondary">
              International Classification of Diseases · Search {total.toLocaleString()} codes instantly
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search controls */}
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
          <TextField
            fullWidth autoFocus size="small"
            placeholder="Search by description… e.g. hypertension, diabetes, chest pain"
            value={q} onChange={e => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={e => setCategory(e.target.value)}>
              <MenuItem value="">All categories</MenuItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Main content: list + detail */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Results list */}
          <Box sx={{ flex: selected ? '0 0 55%' : '1', overflow: 'auto', borderRight: selected ? '1px solid' : 'none', borderColor: 'divider' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : results.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>
                {q ? `No ICD-10 codes match "${q}"` : 'Run POST /api/seed-clinical to load ICD-10 data, then search here.'}
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 100 }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 120 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 80 }}>Billable</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map(row => (
                      <TableRow
                        key={row.code}
                        hover
                        selected={selected?.code === row.code}
                        onClick={() => { loadDetail(row.code); if (onSelect) onSelect(row.code, row.description) }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', fontSize: '.82rem' }}>
                            {row.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '.83rem' }}>{row.description}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.category} size="small" sx={{ height: 18, fontSize: '.68rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          {row.billable && <BillableIcon sx={{ color: '#10B981', fontSize: 18 }} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Detail panel */}
          {selected && (
            <Box sx={{ flex: '0 0 45%', overflow: 'auto', p: 2.5 }}>
              {loadingDetail ? <CircularProgress size={24} /> : (
                <Stack gap={2}>
                  <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                      {selected.code}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} gutterBottom>{selected.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={selected.category_description} size="small" color="primary" variant="outlined" />
                      {selected.billable && <Chip label="✓ Billable" size="small" sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 700 }} />}
                    </Box>
                  </Box>

                  {selected.linkedProcedures && selected.linkedProcedures.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MoneyIcon sx={{ fontSize: 16, color: '#10B981' }} /> Linked Procedures & Costs
                        </Typography>
                        <Stack gap={1}>
                          {selected.linkedProcedures.map(p => (
                            <Box key={p.code} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#8B5CF6' }}>{p.code}</Typography>
                                  <Chip label={p.relationship} size="small" sx={{ height: 16, fontSize: '.65rem' }} />
                                </Box>
                                {p.medicare_rate && Number(p.medicare_rate) > 0 && (
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ display: 'block', color: '#10B981', fontWeight: 700 }}>
                                      Medicare: ${Number(p.medicare_rate).toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Typical: ${Number(p.typical_charge).toFixed(2)}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">{p.description}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </>
                  )}
                </Stack>
              )}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {results.length} shown of {total.toLocaleString()} codes · CDC ICD-10-CM FY2024 · Click any row for procedures & costs
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Made by Frans Elstadt in San Francisco 🌉
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
