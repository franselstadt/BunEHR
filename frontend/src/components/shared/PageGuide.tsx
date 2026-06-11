/**
 * PageGuide — floating action button (FAB) that opens a page-specific guide modal.
 *
 * Every page in BunEHR has one of these. It explains:
 *  - What the page does in plain English
 *  - Which openEHR concept it relates to
 *  - The exact API endpoints used
 *  - Sample code snippets
 *  - Tips for clinicians and developers
 *
 * Designed for users who have never worked with an EHR system before.
 */
import { useState } from 'react'
import {
  Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, Stack, Divider, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Alert,
} from '@mui/material'
import {
  HelpOutline as HelpIcon,
  ExpandMore as ExpandIcon,
  Code as CodeIcon,
  Lightbulb as TipIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS'
  path: string
  description: string
  example?: string
}

export interface PageGuideProps {
  title: string
  /** One-line description for the tooltip */
  tagline: string
  /** Plain English explanation of what this page does */
  overview: string
  /** Which openEHR concept this page relates to */
  openEhrConcept?: string
  openEhrExplanation?: string
  /** API endpoints used on this page */
  endpoints?: ApiEndpoint[]
  /** Tips for clinicians */
  clinicianTips?: string[]
  /** Tips for developers */
  developerTips?: string[]
}

const METHOD_COLORS: Record<string, string> = {
  GET:    '#10B981',
  POST:   '#2563EB',
  PUT:    '#F59E0B',
  DELETE: '#EF4444',
  WS:     '#8B5CF6',
}

export function PageGuide({
  title, tagline, overview, openEhrConcept, openEhrExplanation,
  endpoints, clinicianTips, developerTips,
}: PageGuideProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Floating Action Button ─────────────────────────────────────────── */}
      <Tooltip title={tagline} placement="left" arrow>
        <Fab
          size="medium"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1200,
            bgcolor: 'primary.main',
            color: '#fff',
            '&:hover': { bgcolor: 'primary.dark' },
            boxShadow: '0 4px 14px 0 rgba(37,99,235,0.4)',
          }}
        >
          <HelpIcon />
        </Fab>
      </Tooltip>

      {/* ── Guide Modal ────────────────────────────────────────────────────── */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>{title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{tagline}</Typography>
            </Box>
            <Button size="small" onClick={() => setOpen(false)} sx={{ minWidth: 'auto', p: 0.5 }}>
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Stack gap={3}>

            {/* Overview */}
            <Box>
              <Typography variant="h6" gutterBottom>What is this page?</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {overview}
              </Typography>
            </Box>

            {/* openEHR concept */}
            {openEhrConcept && (
              <>
                <Divider />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6">openEHR Concept</Typography>
                    <Chip label={openEhrConcept} size="small" color="primary" />
                  </Box>
                  <Alert severity="info" sx={{ mb: 0 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      {openEhrExplanation}
                    </Typography>
                  </Alert>
                </Box>
              </>
            )}

            {/* API endpoints */}
            {endpoints && endpoints.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CodeIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">API Endpoints Used</Typography>
                  </Box>
                  <Stack gap={1.5}>
                    {endpoints.map((ep, i) => (
                      <Box key={i} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={ep.method}
                            size="small"
                            sx={{
                              bgcolor: `${METHOD_COLORS[ep.method]}18`,
                              color: METHOD_COLORS[ep.method],
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 500 }}>
                            {ep.path}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">{ep.description}</Typography>
                        {ep.example && (
                          <Box
                            component="pre"
                            sx={{
                              mt: 1, mb: 0, p: 1.5,
                              bgcolor: '#0F172A', color: '#E2E8F0',
                              borderRadius: 1.5, fontSize: '0.75rem',
                              overflowX: 'auto', fontFamily: 'monospace',
                              lineHeight: 1.6,
                            }}
                          >
                            {ep.example}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </>
            )}

            {/* Clinician tips */}
            {clinicianTips && clinicianTips.length > 0 && (
              <>
                <Divider />
                <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TipIcon sx={{ color: '#10B981', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={600}>Tips for Clinical Staff</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack gap={1}>
                      {clinicianTips.map((tip, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, mt: 0.1 }}>•</Typography>
                          <Typography variant="body2" color="text.secondary">{tip}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </>
            )}

            {/* Developer tips */}
            {developerTips && developerTips.length > 0 && (
              <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon sx={{ color: '#2563EB', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>Developer Notes</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack gap={1}>
                    {developerTips.map((tip, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 700, mt: 0.1 }}>→</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{tip}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Footer */}
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Full API documentation at{' '}
              </Typography>
              <Chip
                label="localhost:3000/docs"
                size="small"
                component="a"
                href="http://localhost:3000/docs"
                target="_blank"
                clickable
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" onClick={() => setOpen(false)}>Got it</Button>
          <Button
            variant="outlined"
            component="a"
            href="http://localhost:3000/docs"
            target="_blank"
          >
            Open Swagger UI
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
