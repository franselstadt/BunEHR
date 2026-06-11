/**
 * Sidebar navigation — dark navy panel with icon + label links.
 *
 * Organised into sections to match a real hospital workflow:
 *   Overview → Patient care → Data & queries → System
 */
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Tooltip,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  Settings as SettingsIcon,
  LocalHospital as HospitalIcon,
  Map as MapIcon,
  Pets as PetsIcon,
  AttachMoney as FinanceIcon,
  MedicalInformation as Icd10Icon,
  Source as CkmIcon,
  Biotech as ImagingIcon,
} from '@mui/icons-material'

export const DRAWER_WIDTH = 220

const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard',    icon: <DashboardIcon />, path: '/',          desc: 'Hospital-wide stats & live map' },
      { label: 'Ward Map',     icon: <MapIcon />,       path: '/map',       desc: 'Real-time patient locations' },
    ],
  },
  {
    heading: 'Patient Care',
    items: [
      { label: 'Patients',        icon: <PeopleIcon />,   path: '/patients',  desc: 'Search & manage patient records' },
      { label: 'Clinical Records', icon: <ArticleIcon />,  path: '/records',   desc: 'View & create clinical compositions' },
      { label: 'Finance & Billing', icon: <FinanceIcon />, path: '/finance',   desc: 'ICD-10, CPT codes, Medicare & billing' },
      { label: 'AI Imaging', icon: <ImagingIcon />, path: '/ai-imaging', desc: 'Ziehl-Neelsen + CT AI analyzer results' },
    ],
  },
  {
    heading: 'Data & Queries',
    items: [
      { label: 'AQL Query',    icon: <SearchIcon />,    path: '/aql',       desc: 'Run OpenEHR archetype queries' },
      { label: 'CKM Mirror',   icon: <CkmIcon />,       path: '/ckm',       desc: 'Browse CKM archetypes and templates' },
      { label: 'OpenEHR',      icon: <ScienceIcon />,   path: '/openehr',   desc: 'Explore the OpenEHR data model' },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings',     icon: <SettingsIcon />,  path: '/settings',  desc: 'Configure EHR server & integrations' },
      { label: 'About & Daisy', icon: <PetsIcon />,     path: '/about',     desc: 'About BunEHR and Daisy 🐾' },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate  = useNavigate()
  const { pathname } = useLocation()

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 8 }}>
      {NAV_SECTIONS.map((section) => (
        <Box key={section.heading} sx={{ px: 1.5, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ px: 1, py: 0.5, display: 'block', color: '#6B5E52', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.09em', fontSize: '0.62rem' }}
          >
            {section.heading}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item) => {
              const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
              return (
                <Tooltip key={item.path} title={item.desc} placement="right" arrow>
                  <ListItem disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      selected={active}
                      onClick={() => { navigate(item.path); onClose() }}
                      sx={{
                        borderRadius: 2, py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(123,147,184,0.18)',
                          color: '#B8CEDE',
                          '& .MuiListItemIcon-root': { color: '#B8CEDE' },
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                        '& .MuiListItemIcon-root': { color: '#6B5E52', minWidth: 36 },
                        '& .MuiListItemText-primary': { fontSize: '0.875rem', fontWeight: active ? 600 : 400, color: active ? '#C8BCAD' : '#8A7E72' },
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              )
            })}
          </List>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 0.5 }} />
        </Box>
      ))}

      {/* Footer branding */}
      <Box sx={{ mt: 'auto', p: 2, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
          <HospitalIcon sx={{ fontSize: 14, color: '#4A3F35' }} />
          <Typography variant="caption" sx={{ color: '#4A3F35', fontSize: '0.68rem' }}>openEHR REST v1</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#3D352C', display: 'block', fontSize: '0.68rem' }}>
          BunEHR v1.0.0
        </Typography>
      </Box>
    </Box>
  )

  return (
    <>
      {/* Mobile drawer */}
      <Drawer variant="temporary" open={mobileOpen} onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        {drawerContent}
      </Drawer>
      {/* Desktop permanent drawer */}
      <Drawer variant="permanent"
        sx={{ display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
        {drawerContent}
      </Drawer>
    </>
  )
}
