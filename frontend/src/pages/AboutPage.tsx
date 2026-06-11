/**
 * About page — the story of BunEHR and Daisy.
 *
 * Behind every great piece of software is a great dog.
 * Daisy is a Miniature Schnauzer in South Africa who waited
 * patiently (mostly for kibble) throughout this entire build.
 */
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack,
  Divider, Avatar, Paper,
} from '@mui/material'
import {
  Pets as PetsIcon,
  LocationOn as LocationIcon,
  Favorite as HeartIcon,
  Code as CodeIcon,
  LocalHospital as HospitalIcon,
  Star as StarIcon,
} from '@mui/icons-material'
import { PageGuide } from '../components/shared/PageGuide.tsx'

/** Tech stack card */
function TechCard({ icon, name, description, color }: { icon: string; name: string; description: string; color: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Typography sx={{ fontSize: '1.5rem' }}>{icon}</Typography>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>{name}</Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </CardContent>
    </Card>
  )
}

export default function AboutPage() {
  return (
    <Box>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box component="img" src="/logo.png" alt="BunEHR" sx={{ height: 40 }} />
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ color: 'primary.main', lineHeight: 1.1 }}>
              BunEHR
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>
              Open-source · openEHR REST API v1 · Bun + Hono + Drizzle + PostgreSQL
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.8 }}>
          BunEHR is a production-grade Electronic Health Record system built on the international
          openEHR standard. It gives clinicians a modern, responsive hospital dashboard and developers
          a fully standards-compliant REST API — both powered by the same PostgreSQL backend.
        </Typography>
      </Box>

      <Grid container spacing={3}>

      {/* ── Daisy's Story ─────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0 }}>
              <Grid container>
                {/* Daisy photo */}
                <Grid item xs={12} sm={4} md={3}>
                  <Box sx={{ height: { xs: 260, sm: '100%' }, minHeight: 300, overflow: 'hidden', bgcolor: 'background.default' }}>
                    <Box
                      component="img"
                      src="/daisy.png"
                      alt="Daisy — a small black Miniature Schnauzer in South Africa"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                    />
                  </Box>
                </Grid>

                {/* Story */}
                <Grid item xs={12} sm={8} md={9}>
                  <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                      <Avatar sx={{ bgcolor: 'background.default', width: 44, height: 44, border: '1px solid', borderColor: 'divider' }}>
                        <PetsIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 600 }}>
                          Daisy
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Miniature Schnauzer · South Africa · waiting to come home
                        </Typography>
                      </Box>
                    </Box>

                    <Stack gap={2}>
                      <Typography variant="body1" sx={{ lineHeight: 1.9 }}>
                        I built BunEHR while starting over in the United States — new country, new rules,
                        and the quiet weight of everything I left behind. South Africa is home to people
                        I love and work I am proud of. It is also a place where many of us learned to live
                        with a background hum of risk that left marks that did not show up on a CV.
                        Hypervigilance. Poor sleep. The way your body flinches at a sound before your mind
                        catches up. Clinicians call some of what I carried <strong>PTSD</strong>.
                        I called it Tuesday for a long time, until I could not pretend it was only tiredness.
                      </Typography>

                      <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'divider' }}>
                        <Typography variant="body1" sx={{ lineHeight: 1.9, fontStyle: 'italic', color: 'text.secondary' }}>
                          "Daisy did not fix that by herself. No dog does. What she did was stay.
                          Through nights when I replayed incidents I did not want to name in a job interview.
                          Through mornings when I had to stand in front of a team and defend a database schema
                          while my hands would not stop shaking. She sat on my feet while I debugged.
                          She greeted me like the day was worth starting. She was routine when routine was medicine:
                          walk, feed, touch grass, breathe, open the laptop again."
                        </Typography>
                      </Paper>

                      <Typography variant="body1" sx={{ lineHeight: 1.9, color: 'text.secondary' }}>
                        When I made the decision to build a life in the United States, Daisy could not come
                        on the first flight. Logistics, cost, quarantine rules, and the chaos of getting
                        established meant she stayed with family — <strong>safe, loved, and not with me</strong>.
                        I am grateful she is cared for. I am also honest that every month apart is a line item
                        on my heart.
                      </Typography>

                      <Typography variant="body1" sx={{ lineHeight: 1.9 }}>
                        Stable work means rent I can plan, savings I do not have to apologise for, and
                        eventually the veterinary bills, travel, and import costs to{' '}
                        <strong>bring Daisy home</strong>. That is not a small goal tucked into a footnote.
                        It is one of the main reasons I take the work seriously.
                      </Typography>

                      <Box sx={{ pt: 1, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <HeartIcon sx={{ color: 'secondary.main', fontSize: 16, mt: 0.3, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.7 }}>
                          She is not decoration. She is the reason stability is not abstract for me.
                          That is why the demo password is <strong>daisy</strong>. That is why her face is on
                          this site. Thank you for reading what the charts and KPIs do not show.
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* ── What is BunEHR? ──────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HospitalIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>What is BunEHR?</Typography>
              </Box>
              <Stack gap={2}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  <strong>BunEHR</strong> is a fully open-source Electronic Health Record system
                  implementing the <strong>openEHR REST API v1</strong> specification — the international
                  standard for persistent, interoperable clinical data.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  Unlike HL7 FHIR (which focuses on data exchange), openEHR focuses on <em>storing</em>
                  clinical knowledge in a way that is meaningful, queryable, and interoperable for decades.
                  Every patient record created in this system can be read by any other openEHR-compatible
                  platform — EHRbase, Better Platform, or any future system built on the standard.
                </Typography>
                <Divider />
                {[
                  { icon: '🏥', label: 'Full openEHR REST API v1', desc: 'EHR, COMPOSITION, CONTRIBUTION, DIRECTORY, AQL, DEFINITION — all 37 endpoints' },
                  { icon: '⚡', label: 'Bun runtime', desc: '30× faster startup than Node.js, built-in TypeScript transpilation, native WebSocket' },
                  { icon: '🗄️', label: 'PostgreSQL 16 + JSONB', desc: 'Compositions stored as JSONB with GIN indexes. All timestamps are TIMESTAMPTZ.' },
                  { icon: '🔄', label: 'Drizzle ORM', desc: 'Type-safe SQL with zero-drift types. Migrations auto-generated from schema.' },
                  { icon: '🌐', label: 'Real-time WebSocket', desc: 'Live clinical event feed — admissions, critical alerts, lab results, vitals updates' },
                  { icon: '🗺️', label: 'Hospital map', desc: 'Interactive Leaflet map showing patient ward locations across the hospital campus' },
                ].map(item => (
                  <Box key={item.label} sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ fontSize: '1.1rem', mt: 0.1 }}>{item.icon}</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── openEHR at a glance ────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Stack gap={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>openEHR Concepts</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  New to openEHR? Here's the mental model:
                </Typography>
                {[
                  { term: 'EHR', desc: 'One record per patient (UUID)', color: '#2563EB' },
                  { term: 'COMPOSITION', desc: 'A clinical document (blood pressure, encounter…)', color: '#10B981' },
                  { term: 'VERSION UID', desc: 'uuid::system::1 — append-only history', color: '#8B5CF6' },
                  { term: 'AQL', desc: 'SQL for clinical data', color: '#F59E0B' },
                  { term: 'CONTRIBUTION', desc: 'Audited change-set (HIPAA/GDPR)', color: '#EF4444' },
                ].map(c => (
                  <Box key={c.term} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                    <Chip label={c.term} size="small" sx={{ bgcolor: `${c.color}18`, color: c.color, fontWeight: 700, fontSize: '0.65rem', height: 20, minWidth: 80 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{c.desc}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <StarIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                  <Typography variant="h6" fontWeight={700}>Daisy's Stats</Typography>
                </Box>
                {[
                  { label: 'Breed', value: 'Miniature Schnauzer' },
                  { label: 'Location', value: 'South Africa 🇿🇦' },
                  { label: 'Shirt collection', value: 'Extensive (zebra-print, #1)' },
                  { label: 'Favourite food', value: 'Kibble, any variety' },
                  { label: 'Code reviews', value: 'Approved all of them' },
                  { label: 'Bugs caught', value: '0 (too busy with kibble)' },
                  { label: 'Naps per day', value: 'Many' },
                ].map(s => (
                  <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="caption" fontWeight={500}>{s.value}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* ── Frans Elstadt SF card — black background, white text, beige border ── */}
        <Grid item xs={12}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '300px 1fr' },
            borderRadius: 2,
            overflow: 'hidden',
            border: '2px solid',
            borderColor: '#DDD5C5',   // beige border
          }}>
            {/* Photo on black */}
            <Box sx={{ position: 'relative', bgcolor: '#000', minHeight: { xs: 300, sm: 'auto' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                component="img"
                src="/franselstadt.png"
                alt="Frans Elstadt, BunEHR mascot, and Daisy the Miniature Schnauzer at the Golden Gate Bridge, San Francisco"
                sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
              />
            </Box>

            {/* Text on black with white copy */}
            <Box sx={{ bgcolor: '#0A0806', p: { xs: 3, sm: 3.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>⛩️</Typography>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ color: '#F0EBE0', lineHeight: 1.2 }}>
                    Frans Elstadt
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8A7E72', mt: 0.25 }}>
                    San Francisco, California
                  </Typography>
                </Box>
              </Box>

              <Stack gap={1.5}>
                <Typography sx={{ lineHeight: 1.8, color: '#C8BCAD', fontSize: '0.92rem' }}>
                  BunEHR was designed and built by <Box component="span" sx={{ color: '#F0EBE0', fontWeight: 600 }}>Frans Elstadt</Box> in <Box component="span" sx={{ color: '#F0EBE0', fontWeight: 600 }}>San Francisco</Box> — the city of technology, fog, and the Golden Gate Bridge. The photo shows Frans with the BunEHR mascot at the bridge.
                </Typography>
                <Typography sx={{ lineHeight: 1.8, color: '#6B5E52', fontSize: '0.875rem' }}>
                  The goal was to show that openEHR compliance and modern TypeScript tools — Bun, Hono, Drizzle ORM, PostgreSQL — are not in conflict. A system can be clinically rigorous and built in days, not years.
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', pt: 1 }}>
                  {['San Francisco', 'openEHR REST v1', 'Bun + TypeScript', 'DDD Architecture'].map(tag => (
                    <Box key={tag} component="span" sx={{
                      px: 1.25, py: 0.25, borderRadius: 1,
                      border: '1px solid #3D352C',
                      color: '#8A7E72', fontSize: '0.72rem', fontWeight: 500,
                    }}>
                      {tag}
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Box>
          </Box>
        </Grid>

        {/* ── Tech stack ─────────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>Technology Stack</Typography>
          </Box>
          <Grid container spacing={2}>
            {[
              { icon: '🟡', name: 'Bun 1.2', description: 'JavaScript runtime with native TypeScript, built-in WebSocket, and 30× faster installs than npm. No ts-node, no dotenv, no ws package needed.' },
              { icon: '🔥', name: 'Hono', description: 'Ultra-fast web framework for Bun. Lightweight, TypeScript-first, with built-in middleware for logging, CORS, timing, and security headers.' },
              { icon: '🐘', name: 'PostgreSQL 16', description: 'Primary data store. JSONB for composition content (GIN-indexed for fast JSON queries), TIMESTAMPTZ for timezone-aware clinical timestamps.' },
              { icon: '💧', name: 'Drizzle ORM', description: 'TypeScript-first SQL query builder. Schema is the source of truth for both DB structure and TypeScript types. Zero-drift, zero runtime overhead.' },
              { icon: '⚛️', name: 'React 18 + MUI v6', description: 'Frontend framework with Material UI styled to the BunEHR design system — navy sidebar, BunEHR blue primary, clinical white background.' },
              { icon: '🗺️', name: 'Leaflet + Recharts', description: 'Interactive hospital map (OpenStreetMap tiles, no API key needed) and clinical data charts with normal range reference lines.' },
            ].map(t => (
              <Grid item xs={12} sm={6} md={4} key={t.name}>
                <TechCard {...t} color="#2563EB" />
              </Grid>
            ))}
          </Grid>
        </Grid>

      </Grid>

      {/* ── Page Guide FAB ─────────────────────────────────────────────────── */}
      <PageGuide
        title="About BunEHR"
        tagline="Learn about the project, the team, and Daisy"
        overview="This page tells the story of BunEHR — why it was built, what it does, and the very important role played by Daisy the Miniature Schnauzer. It also provides a technology overview and openEHR concept glossary for newcomers."
        openEhrConcept="openEHR Standard"
        openEhrExplanation="openEHR is an international open standard (ISO 18308) for electronic health records. It defines how clinical data is structured, versioned, and queried in a way that remains interoperable across systems and time. Data stored in any openEHR-compliant system can be read by any other compliant system, anywhere in the world."
        clinicianTips={[
          "You don't need to understand the technical stack to use this system — the Dashboard, Patients, and Patient Detail pages are designed for clinical workflows.",
          "Every page has a help button (this one!) that explains what the page does and how it relates to patient care.",
          "The blue dots on the hospital map show where each patient is currently assigned. Red larger dots are critical patients.",
          "Vital sign cards highlight in red when readings are outside normal clinical ranges — hover for the normal range reference.",
        ]}
        developerTips={[
          "Full OpenAPI spec: GET /api-docs — import into Postman or any OpenAPI client.",
          "Swagger UI: GET /docs — interactive browser-based API explorer with try-it-out.",
          "WebSocket: ws://localhost:3000/ws — connect for real-time clinical event stream.",
          "Seed data: POST /api/seed — creates 12 sample EHRs with realistic patient data.",
          "All responses use openEHR canonical JSON (snake_case). Errors are RFC 7807 Problem Details.",
        ]}
      />
    </Box>
  )
}
