import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { AutoAwesome as AiIcon, Science as StainIcon, Camera as CtIcon } from '@mui/icons-material'
import { getPatients } from '../api/ehrClient.ts'
import {
  getImagingDemoAssets,
  getImagingHistory,
  runCtScanAnalysis,
  runZiehlNeelsenAnalysis,
  seedImagingDemo,
  type CtResult,
  type ImagingDemoAsset,
  type ZiehlResult,
} from '../api/imagingAiClient.ts'
import type { Patient } from '../types/openehr.ts'

type DyeMap = { grid: number[][]; hotspotCoordinates: Array<{ x: number; y: number }> }

const parseDyeMap = (value: unknown): DyeMap | null => {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (!Array.isArray(v['grid']) || !Array.isArray(v['hotspotCoordinates'])) return null
  return {
    grid: (v['grid'] as unknown[]).map((row) => Array.isArray(row) ? row.map((n) => Number(n)) : []),
    hotspotCoordinates: (v['hotspotCoordinates'] as unknown[]).flatMap((p) => {
      if (!p || typeof p !== 'object') return []
      const r = p as Record<string, unknown>
      return [{ x: Number(r['x']), y: Number(r['y']) }]
    }),
  }
}

function DottedImage({
  src,
  dyeMap,
  alt,
}: {
  src: string
  dyeMap: DyeMap | null
  alt: string
}) {
  const cols = dyeMap?.grid?.[0]?.length ?? 1
  const rows = dyeMap?.grid?.length ?? 1
  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Box component="img" src={src} alt={alt} sx={{ width: '100%', borderRadius: 1, border: '1px solid #E2E8F0', display: 'block' }} />
      {(dyeMap?.hotspotCoordinates ?? []).map((dot, idx) => (
        <Box
          key={`${dot.x}-${dot.y}-${idx}`}
          sx={{
            position: 'absolute',
            left: `${((dot.x + 0.5) / cols) * 100}%`,
            top: `${((dot.y + 0.5) / rows) * 100}%`,
            width: 14,
            height: 14,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#1d4ed8',
            border: '2px solid #fff',
            boxShadow: '0 0 0 2px rgba(29,78,216,0.35)',
          }}
        />
      ))}
    </Box>
  )
}

export default function ImagingAiPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [ehrId, setEhrId] = useState('')
  const [assets, setAssets] = useState<ImagingDemoAsset[]>([])
  const [znAssetId, setZnAssetId] = useState('')
  const [ctImageUri, setCtImageUri] = useState('demo://ge/ct/study-001.dcm')
  const [ctStudyUid, setCtStudyUid] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [znResult, setZnResult] = useState<ZiehlResult | null>(null)
  const [ctResult, setCtResult] = useState<CtResult | null>(null)
  const [history, setHistory] = useState<{ ziehlNeelsen: Array<Record<string, unknown>>; ctScan: Array<Record<string, unknown>> } | null>(null)

  const znAssets = useMemo(() => assets.filter(a => a.modality === 'ZIEHL_NEELSEN'), [assets])
  const ctAssets = useMemo(() => assets.filter(a => a.modality === 'CT_SCAN'), [assets])
  const selectedZnAsset = useMemo(() => znAssets.find((a) => a.id === znAssetId) ?? null, [znAssets, znAssetId])

  const loadBase = async () => {
    const [patientRows, demoAssets] = await Promise.all([
      getPatients().catch(() => []),
      getImagingDemoAssets().catch(() => ({ results: [] as ImagingDemoAsset[] })),
    ])
    setPatients(patientRows)
    setAssets(demoAssets.results)
    if (!ehrId && patientRows[0]) setEhrId(patientRows[0].ehrId)
    if (!znAssetId && demoAssets.results.find(r => r.modality === 'ZIEHL_NEELSEN')) {
      setZnAssetId(demoAssets.results.find(r => r.modality === 'ZIEHL_NEELSEN')!.id)
    }
    if (demoAssets.results.find(r => r.modality === 'CT_SCAN')) {
      setCtImageUri(prev => prev || demoAssets.results.find(r => r.modality === 'CT_SCAN')!.imageUri)
    }
  }

  const refreshHistory = async (targetEhrId: string) => {
    if (!targetEhrId) return
    const rows = await getImagingHistory(targetEhrId).catch(() => null)
    if (rows) setHistory({ ziehlNeelsen: rows.ziehlNeelsen, ctScan: rows.ctScan })
  }

  useEffect(() => {
    loadBase().catch(() => {})
  }, [])

  useEffect(() => {
    if (ehrId) refreshHistory(ehrId).catch(() => {})
  }, [ehrId])

  const onSeed = async () => {
    setLoading(true); setError(null); setMessage(null)
    try {
      const res = await seedImagingDemo()
      setMessage(`Imaging demo seeded (${res.inserted}/${res.totalAssets}).`)
      await loadBase()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed imaging demo')
    } finally {
      setLoading(false)
    }
  }

  const onRunZn = async () => {
    if (!ehrId) return
    setLoading(true); setError(null); setMessage(null)
    try {
      const res = await runZiehlNeelsenAnalysis({ ehr_id: ehrId, demo_asset_id: znAssetId || undefined })
      setZnResult(res)
      setMessage(`Ziehl-Neelsen analysis stored and written to EHR composition ${res.ehrCompositionVersionUid}.`)
      await refreshHistory(ehrId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ziehl-Neelsen analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const onRunCt = async () => {
    if (!ehrId || !ctImageUri.trim()) return
    setLoading(true); setError(null); setMessage(null)
    try {
      const res = await runCtScanAnalysis({
        ehr_id: ehrId,
        image_uri: ctImageUri.trim(),
        study_uid: ctStudyUid.trim() || undefined,
      })
      setCtResult(res)
      setMessage(`CT analysis stored and written to EHR composition ${res.ehrCompositionVersionUid}.`)
      await refreshHistory(ehrId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CT analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>AI Imaging Analyzer</Typography>
        <Typography variant="body2" color="text.secondary">
          Demo module in progress: Ziehl-Neelsen stain image analyzer + CT scan analyzer, with GE pseudo device metadata and automatic EHR composition write-back.
        </Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <Select size="small" value={ehrId} onChange={(e) => setEhrId(e.target.value)} sx={{ minWidth: 280 }}>
              {patients.map((p) => (
                <MenuItem key={p.ehrId} value={p.ehrId}>
                  {p.firstName} {p.lastName} — {p.ehrId}
                </MenuItem>
              ))}
            </Select>
            <Button variant="outlined" onClick={onSeed} disabled={loading}>Seed Imaging Demo</Button>
            <Button variant="outlined" onClick={() => refreshHistory(ehrId)} disabled={loading || !ehrId}>Refresh History</Button>
          </Stack>
        </CardContent>
      </Card>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom><StainIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Ziehl-Neelsen</Typography>
              <Select size="small" fullWidth value={znAssetId} onChange={(e) => setZnAssetId(e.target.value)} sx={{ mb: 1.5 }}>
                {znAssets.map((a) => <MenuItem key={a.id} value={a.id}>{a.id} · {a.imageUri}</MenuItem>)}
              </Select>
              <Button variant="contained" startIcon={<AiIcon />} onClick={onRunZn} disabled={loading || !ehrId}>Run Ziehl-Neelsen AI</Button>
              {selectedZnAsset && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Source image (stored in PostgreSQL)</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <DottedImage
                      src={selectedZnAsset.imageData}
                      dyeMap={parseDyeMap(selectedZnAsset.dyeMap)}
                      alt="Ziehl-Neelsen source with hotspot dots"
                    />
                  </Box>
                </Box>
              )}
              {znResult && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>Bacteria Count:</strong> {znResult.bacteriaCount}</Typography>
                  <Typography variant="body2"><strong>Band:</strong> {znResult.bacillaryLoadBand}</Typography>
                  <Typography variant="body2"><strong>Confidence:</strong> {(znResult.aiConfidence * 100).toFixed(0)}%</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Analyzed image (dot overlay from AI)
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <DottedImage
                      src={znResult.analyzedImageData}
                      dyeMap={parseDyeMap(znResult.dyeMap)}
                      alt="Ziehl-Neelsen analyzed with dots"
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom><CtIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> CT Scan</Typography>
              <TextField size="small" fullWidth label="CT image URI" value={ctImageUri} onChange={(e) => setCtImageUri(e.target.value)} sx={{ mb: 1.5 }} />
              {ctAssets.length > 0 && (
                <Select size="small" fullWidth value={ctImageUri} onChange={(e) => setCtImageUri(e.target.value)} sx={{ mb: 1.5 }}>
                  {ctAssets.map((a) => <MenuItem key={a.id} value={a.imageUri}>{a.id} · {a.imageUri}</MenuItem>)}
                </Select>
              )}
              <TextField size="small" fullWidth label="Study UID (optional)" value={ctStudyUid} onChange={(e) => setCtStudyUid(e.target.value)} sx={{ mb: 1.5 }} />
              <Button variant="contained" startIcon={<AiIcon />} onClick={onRunCt} disabled={loading || !ehrId || !ctImageUri.trim()}>
                Run CT AI
              </Button>
              {ctAssets.find((a) => a.imageUri === ctImageUri) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Source image (stored in PostgreSQL)</Typography>
                  <Box component="img" src={ctAssets.find((a) => a.imageUri === ctImageUri)!.imageData} alt="CT source" sx={{ mt: 0.5, width: '100%', borderRadius: 1, border: '1px solid #E2E8F0' }} />
                </Box>
              )}
              {ctResult && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>TB Suspicion:</strong> {(ctResult.tbSuspicionScore * 100).toFixed(0)}%</Typography>
                  <Typography variant="body2"><strong>Nodules:</strong> {ctResult.noduleCount}</Typography>
                  <Typography variant="body2"><strong>Consolidation:</strong> {ctResult.consolidationPercent}%</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Analyzed image (dot overlay from AI)
                  </Typography>
                  <Box component="img" src={ctResult.analyzedImageData} alt="CT analyzed with dots" sx={{ mt: 0.5, width: '100%', borderRadius: 1, border: '1px solid #E2E8F0' }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>EHR-Linked Analysis History</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="body2">Ziehl-Neelsen results: {history?.ziehlNeelsen.length ?? 0}</Typography>
          <Typography variant="body2">CT scan results: {history?.ctScan.length ?? 0}</Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
