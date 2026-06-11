/**
 * TopBar — main navigation bar with the BunEHR logo.
 *
 * Contains: logo, page title, notification bell (live WS count), and user avatar.
 */
import { useState } from 'react'
import {
  AppBar, Toolbar, Box, Typography, IconButton, Badge, Tooltip,
  Avatar, Chip, useTheme,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  FiberManualRecord as DotIcon,
  Menu as MenuIcon,
  MedicalInformation as Icd10Icon,
} from '@mui/icons-material'
import { Icd10Lookup } from '../shared/Icd10Lookup.tsx'

interface TopBarProps {
  onMenuToggle: () => void
  liveEventCount: number
  wsConnected: boolean
}

export default function TopBar({ onMenuToggle, liveEventCount, wsConnected }: TopBarProps) {
  const theme = useTheme()
  const [icd10Open, setIcd10Open] = useState(false)
  return (<>
    <Icd10Lookup open={icd10Open} onClose={() => setIcd10Open(false)} />
    <AppBar position="fixed" elevation={0} sx={{ zIndex: theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 2 }}>

        {/* Hamburger for mobile */}
        <IconButton edge="start" onClick={onMenuToggle} sx={{ display: { sm: 'none' } }}>
          <MenuIcon />
        </IconButton>

        {/* ── BunEHR logo + product name ────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/logo.png"
            alt="BunEHR logo"
            sx={{ height: 34, width: 'auto' }}
          />
          <Box>
            <Typography sx={{
              fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: '1.25rem',
              lineHeight: 1.1,
              color: 'primary.main',
              letterSpacing: '0.01em',
            }}>
              BunEHR
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1, fontFamily: '"Nunito", system-ui, sans-serif', fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              OpenEHR Hospital System
            </Typography>
          </Box>
        </Box>


        <Box sx={{ flex: 1 }} />

        {/* ── ICD-10 quick lookup ──────────────────────────────────────── */}
        <Tooltip title="ICD-10 Quick Lookup — search diagnosis codes instantly">
          <Chip
            icon={<Icd10Icon sx={{ fontSize: '1rem !important' }} />}
            label="ICD-10"
            size="small"
            variant="outlined"
            onClick={() => setIcd10Open(true)}
            sx={{
              fontWeight: 700, fontSize: '0.72rem', height: 28, cursor: 'pointer',
              borderColor: '#8B5CF6', color: '#8B5CF6',
              '&:hover': { bgcolor: '#F5F3FF' },
            }}
          />
        </Tooltip>

        {/* ── Live connection indicator ─────────────────────────────────── */}
        <Tooltip title={wsConnected ? 'Live feed connected' : 'Reconnecting...'}>
          <Chip
            icon={<DotIcon sx={{ fontSize: '0.7rem !important', color: wsConnected ? '#10B981' : '#F59E0B' }} />}
            label={wsConnected ? 'Live' : 'Reconnecting'}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.7rem', fontWeight: 600, height: 24,
              borderColor: wsConnected ? '#10B981' : '#F59E0B',
              color: wsConnected ? '#10B981' : '#F59E0B',
            }}
          />
        </Tooltip>

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <Tooltip title="Live clinical events">
          <IconButton>
            <Badge badgeContent={liveEventCount > 0 ? liveEventCount : undefined} color="error" max={9}>
              <NotificationsIcon sx={{ color: 'text.secondary' }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* ── User avatar ──────────────────────────────────────────────── */}
        <Tooltip title="Dr. Admin">
          <Avatar
            sx={{
              width: 32, height: 32,
              bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            DA
          </Avatar>
        </Tooltip>

      </Toolbar>
    </AppBar>
  </>)
}
