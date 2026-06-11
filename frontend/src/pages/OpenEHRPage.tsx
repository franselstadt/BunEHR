/**
 * OpenEHR Explorer — learn the OpenEHR standard and query live data.
 *
 * This page is designed for:
 *  - Clinicians unfamiliar with OpenEHR who want to understand what the
 *    data model looks like and why it matters
 *  - Developers who want to run AQL queries against the live database
 *  - Administrators configuring integration with external OpenEHR servers
 */
import { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, TextField, Button,
  Chip, Alert, Accordion, AccordionSummary, AccordionDetails,
  Tab, Tabs, Table, TableHead, TableBody, TableRow, TableCell,
  CircularProgress, Divider,
} from '@mui/material'
import {
  ExpandMore as ExpandIcon, PlayArrow as RunIcon,
  School as LearnIcon, Code as QueryIcon, Settings as SettingsIcon,
  AutoAwesome as AiIcon,
} from '@mui/icons-material'
import { runAql, runAqlFromPrompt } from '../api/ehrClient.ts'
import { PageGuide } from '../components/shared/PageGuide.tsx'
import type { AqlResult } from '../types/openehr.ts'

// ── Educational content ───────────────────────────────────────────────────────
const OPENEHR_CONCEPTS = [
  {
    term: 'EHR (Electronic Health Record)',
    icon: '🏥',
    simple: 'A digital folder containing everything known about one patient.',
    technical: 'The root object in the OpenEHR Reference Model. Each EHR has a globally unique ehrId and contains an EHR_STATUS plus zero or more COMPOSITIONs.',
    example: 'Every person who registers at this hospital gets exactly one EHR.',
  },
  {
    term: 'COMPOSITION',
    icon: '📄',
    simple: 'A clinical document — like a doctor\'s note, a set of vital signs, or a prescription.',
    technical: 'The main unit of committed information in OpenEHR. Each COMPOSITION conforms to a TEMPLATE (an instantiation of one or more ARCHETYPEs) and has a version history.',
    example: 'A blood pressure reading, an encounter note, or a discharge summary are all COMPOSITIONs.',
  },
  {
    term: 'ARCHETYPE',
    icon: '🧬',
    simple: 'A reusable, internationally agreed template that defines how specific clinical information should be structured.',
    technical: 'An Archetype Definition Language (ADL) model constraining the Reference Model. Developed collaboratively by clinicians and published in the Clinical Knowledge Manager (CKM).',
    example: 'openEHR-EHR-OBSERVATION.blood_pressure.v2 defines exactly how blood pressure data is recorded across all EHR systems.',
  },
  {
    term: 'AQL (Archetype Query Language)',
    icon: '🔍',
    simple: 'The OpenEHR equivalent of SQL — a way to search across all patients\' clinical data.',
    technical: 'A declarative query language that traverses the OpenEHR Information Model. It looks like SQL but works with archetype paths rather than tables.',
    example: 'SELECT e/ehr_id/value, c/uid/value FROM EHR e CONTAINS COMPOSITION c',
  },
  {
    term: 'CONTRIBUTION',
    icon: '📝',
    simple: 'A recorded change to a patient\'s record — who changed what and when.',
    technical: 'Groups one or more versioned objects (COMPOSITIONs, EHR_STATUS) committed together with a single audit trail entry. Ensures traceability.',
    example: 'When a nurse updates a patient\'s medication list and documents vital signs at the same time, both changes form one CONTRIBUTION.',
  },
  {
    term: 'DIRECTORY',
    icon: '📁',
    simple: 'A folder structure inside an EHR to organise clinical documents.',
    technical: 'An optional FOLDER hierarchy within an EHR that can group COMPOSITIONs by type, episode, or any other classification.',
    example: 'Folders named "Cardiology", "Medications", "Encounters" to organise a patient\'s record.',
  },
]

// ── Preset AQL queries for quick exploration ─────────────────────────────────
const PRESET_QUERIES = [
  {
    label: 'All EHRs',
    description: 'List every Electronic Health Record in the system with its creation time',
    q: 'SELECT e/ehr_id/value, e/time_created/value FROM EHR e ORDER BY e/time_created DESC',
  },
  {
    label: 'Patient Names + Ward',
    description: 'List EHR ID with patient first name, last name, ward and status',
    q: 'SELECT e/ehr_id/value, p/first_name, p/last_name, p/ward, p/status FROM EHR e CONTAINS PATIENT_PROFILE p',
  },
  {
    label: 'ICU Patient Names',
    description: 'Filter patient names to ICU ward',
    q: "SELECT e/ehr_id/value, p/first_name, p/last_name, p/ward, p/status FROM EHR e CONTAINS PATIENT_PROFILE p WHERE p/ward = 'ICU'",
  },
  {
    label: 'All Compositions',
    description: 'Show every clinical document across all patients',
    q: 'SELECT e/ehr_id/value, c/uid/value, c/name/value FROM EHR e CONTAINS COMPOSITION c',
  },
  {
    label: 'Recent Encounters',
    description: 'Find encounter compositions (clinical notes)',
    q: "SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value FROM EHR e CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]",
  },
]

export default function OpenEHRPage() {
  const [tab, setTab] = useState(0)
  const [aql, setAql] = useState(PRESET_QUERIES[0]!.q)
  const [result, setResult] = useState<AqlResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiInfo, setAiInfo] = useState<{ provider: string; model: string; usedFallback: boolean } | null>(null)
  const [serverUrl, setServerUrl] = useState('http://localhost:8080')

  const handleRunQuery = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await runAql(aql, 50)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRunAiQuery = async () => {
    setAiLoading(true); setError(null); setResult(null); setAiInfo(null)
    try {
      const res = await runAqlFromPrompt(aiPrompt, 50)
      setAql(res.generatedQuery)
      setResult(res.result)
      setAiInfo({ provider: res.provider, model: res.model, usedFallback: res.usedFallback })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI query failed')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>OpenEHR Explorer</Typography>
        <Typography variant="body2" color="text.secondary">
          OpenEHR is an open international standard for electronic health records.
          Meblock EHR is fully compliant with the{' '}
          <strong>OpenEHR REST API v1</strong> specification, meaning your data can be
          shared with any other OpenEHR-compatible system worldwide.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #E2E8F0' }}>
        <Tab icon={<LearnIcon />}   iconPosition="start" label="What is OpenEHR?" />
        <Tab icon={<QueryIcon />}   iconPosition="start" label="AQL Query" />
        <Tab icon={<SettingsIcon />} iconPosition="start" label="Integration" />
      </Tabs>

      {/* ── Tab 0: Educational content ──────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>New to electronic health records?</strong> This page explains the key OpenEHR concepts
              in plain language. Each section includes both a simple explanation for clinical staff and
              technical details for developers.
            </Typography>
          </Alert>
          <Grid container spacing={2}>
            {OPENEHR_CONCEPTS.map(concept => (
              <Grid item xs={12} md={6} key={concept.term}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
                      <Typography sx={{ fontSize: '2rem' }}>{concept.icon}</Typography>
                      <Typography variant="h6" fontWeight={700}>{concept.term}</Typography>
                    </Box>
                    {/* Plain English */}
                    <Alert severity="success" sx={{ mb: 1, py: 0.5 }}>
                      <Typography variant="body2"><strong>In plain English:</strong> {concept.simple}</Typography>
                    </Alert>
                    {/* Technical */}
                    <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                      <Typography variant="body2"><strong>Technical:</strong> {concept.technical}</Typography>
                    </Alert>
                    {/* Example */}
                    <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1.5, borderLeft: '3px solid #2563EB' }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Example:</strong> {concept.example}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* OpenEHR compliance badges */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>OpenEHR Compliance</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Meblock EHR implements the following OpenEHR REST API v1 specifications:
              </Typography>
              {[
                { endpoint: 'EHR', desc: 'Create, retrieve and manage Electronic Health Records', implemented: true },
                { endpoint: 'EHR_STATUS', desc: 'Manage EHR status including queryability and modifiability', implemented: true },
                { endpoint: 'COMPOSITION', desc: 'Create, read, update and delete clinical documents with full versioning', implemented: true },
                { endpoint: 'CONTRIBUTION', desc: 'Track changes to patient records with a complete audit trail', implemented: true },
                { endpoint: 'DIRECTORY', desc: 'Organise compositions in a hierarchical folder structure', implemented: true },
                { endpoint: 'QUERY (AQL)', desc: 'Execute Archetype Query Language queries across all patient data', implemented: true },
                { endpoint: 'DEFINITION', desc: 'Upload and manage clinical templates (ADL 1.4 and ADL 2)', implemented: true },
              ].map(item => (
                <Box key={item.endpoint} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, p: 1.5, bgcolor: 'background.default', borderRadius: 1.5 }}>
                  <Chip label={item.implemented ? '✓ Implemented' : 'Planned'} size="small"
                    sx={{ bgcolor: item.implemented ? '#DCFCE7' : '#FEF3C7', color: item.implemented ? '#166534' : '#92400E', fontWeight: 600 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{item.endpoint}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Tab 1: AQL Query Runner ──────────────────────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Preset Queries</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  AQL (Archetype Query Language) is how you search OpenEHR data.
                  Click a query below to load it.
                </Typography>
                {PRESET_QUERIES.map(q => (
                  <Box key={q.label} sx={{ mb: 1 }}>
                    <Button variant="outlined" fullWidth size="small" onClick={() => setAql(q.q)} sx={{ justifyContent: 'flex-start', textAlign: 'left', mb: 0.5 }}>
                      {q.label}
                    </Button>
                    <Typography variant="caption" color="text.secondary">{q.description}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2 }} />
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">
                    <strong>AQL tip:</strong> Think of it like SQL but for clinical data.
                    <code style={{ display: 'block', marginTop: 4, fontSize: '0.7rem' }}>
                      SELECT … FROM EHR e CONTAINS COMPOSITION c
                    </code>
                    <code style={{ display: 'block', marginTop: 4, fontSize: '0.7rem' }}>
                      SELECT … FROM EHR e CONTAINS PATIENT_PROFILE p
                    </code>
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>AQL Query Editor</Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Ask in plain English"
                  placeholder="Example: show all EHR IDs and creation time"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  sx={{ mb: 1.5 }}
                />
                <Button
                  variant="outlined"
                  startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AiIcon />}
                  onClick={handleRunAiQuery}
                  disabled={aiLoading || !aiPrompt.trim()}
                  sx={{ mb: 2, mr: 1 }}
                >
                  {aiLoading ? 'Generating + Running…' : 'AI Generate + Run'}
                </Button>
                <TextField
                  fullWidth multiline rows={5}
                  value={aql} onChange={e => setAql(e.target.value)}
                  placeholder="SELECT e/ehr_id/value FROM EHR e"
                  sx={{ mb: 2, fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                />
                <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RunIcon />}
                  onClick={handleRunQuery} disabled={loading || !aql.trim()}>
                  {loading ? 'Running…' : 'Run Query'}
                </Button>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {aiInfo && (
                  <Alert severity={aiInfo.usedFallback ? 'warning' : 'success'} sx={{ mt: 2 }}>
                    AI provider: <strong>{aiInfo.provider}</strong> · model: <strong>{aiInfo.model}</strong>
                    {aiInfo.usedFallback ? ' · using local fallback query template' : ''}
                  </Alert>
                )}

                {result && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} returned
                    </Typography>
                    <Box sx={{ overflow: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {result.columns.map((col, i) => (
                              <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                {col.name}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.rows.map((row, i) => (
                            <TableRow key={i} hover>
                              {(row as unknown[]).map((cell, j) => (
                                <TableCell key={j} sx={{ fontSize: '0.78rem', fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {String(cell)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── Page Guide FAB ──────────────────────────────────────────────────── */}
      <PageGuide
        title="OpenEHR Explorer"
        tagline="Learn openEHR concepts and run live AQL queries"
        overview="The OpenEHR Explorer has three sections: 'What is OpenEHR?' explains each core concept in plain English and technical detail — designed for clinical staff who've never worked with an EHR standard before. The AQL Query tab lets you run live Archetype Query Language queries against the real PostgreSQL database — like SQL but for clinical data. The Integration tab lets you configure a connection to an external openEHR server (EHRbase, Better Platform, etc.)."
        openEhrConcept="AQL (Archetype Query Language)"
        openEhrExplanation="AQL is how you search openEHR data. Instead of querying database tables, you query the clinical model: SELECT e/ehr_id/value FROM EHR e CONTAINS COMPOSITION c WHERE c/name/value = 'Blood pressure'. The path e/ehr_id/value traverses the openEHR Reference Model — it works identically on any openEHR server worldwide."
        endpoints={[
          { method: 'POST', path: '/v1/query/aql', description: 'Execute any AQL query against all patient data', example: 'curl -X POST http://localhost:3000/v1/query/aql \\\n  -H "Content-Type: application/json" \\\n  -d \'{"q":"SELECT e/ehr_id/value FROM EHR e","fetch":20}\'' },
          { method: 'GET', path: '/v1/query/aql', description: 'Execute AQL via query parameter (GET variant)', example: 'curl "http://localhost:3000/v1/query/aql?q=SELECT e/ehr_id/value FROM EHR e&fetch=10"' },
          { method: 'PUT', path: '/v1/query/stored-queries/{name}/{version}', description: 'Save a named, versioned AQL query', example: 'curl -X PUT http://localhost:3000/v1/query/stored-queries/org.bunehr::all-patients/1.0.0 \\\n  -d \'{"q":"SELECT e/ehr_id/value FROM EHR e"}\'' },
          { method: 'GET', path: '/v1/definition/template/adl1.4', description: 'List all uploaded clinical templates' },
        ]}
        clinicianTips={[
          "You don't need to know AQL to use the clinical pages — AQL is for advanced searching and reporting.",
          "The preset queries in the AQL tab show common clinical data queries — click to load them.",
          "The compliance badges show which healthcare regulations this system is designed to support.",
          "To integrate with your hospital's existing openEHR server, enter its URL in the Integration tab.",
        ]}
        developerTips={[
          "Full Swagger UI: GET /docs — all endpoints with interactive try-it-out.",
          "OpenAPI JSON spec: GET /api-docs — import into Postman, Insomnia, or any OpenAPI client.",
          "AQL response format: { q, columns: [{name, path}], rows: [[...], ...], meta: {...} }",
          "Stored queries are saved in the stored_query PostgreSQL table and can be reused across systems.",
        ]}
      />

      {/* ── Tab 2: Integration settings ─────────────────────────────────────── */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>OpenEHR Server Integration</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Connect to an external OpenEHR server (such as{' '}
                  <strong>EHRbase</strong>, <strong>Better Platform</strong>, or{' '}
                  <strong>EHRbase</strong>) to federate patient data.
                </Typography>
                <TextField fullWidth label="OpenEHR Server URL" size="small" value={serverUrl}
                  onChange={e => setServerUrl(e.target.value)} sx={{ mb: 2 }}
                  helperText="Base URL of the OpenEHR REST API v1 endpoint" />
                <TextField fullWidth label="Authentication Token" size="small" type="password" sx={{ mb: 2 }}
                  helperText="Bearer token or API key (optional for local servers)" />
                <Button variant="contained" sx={{ mr: 1 }}>Test Connection</Button>
                <Button variant="outlined">Save Settings</Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>About This EHR System</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box component="img" src="/logo.png" alt="BunEHR" sx={{ height: 40 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Meblock EHR</Typography>
                    <Typography variant="caption" color="text.secondary">Built on the BunEHR</Typography>
                  </Box>
                </Box>
                {[
                  ['Backend', 'Bun.js + Hono (TypeScript)'],
                  ['ORM', 'Drizzle ORM'],
                  ['Database', 'PostgreSQL 16 with JSONB'],
                  ['Standard', 'openEHR REST API v1'],
                  ['RM Version', 'openEHR RM 1.1.0'],
                  ['Frontend', 'React 18 + Material UI v6'],
                  ['Real-time', 'WebSockets (Bun native)'],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="caption" fontWeight={500}>{v}</Typography>
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
