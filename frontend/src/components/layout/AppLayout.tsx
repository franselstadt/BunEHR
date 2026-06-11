import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Toolbar } from '@mui/material'
import TopBar from './TopBar.tsx'
import Sidebar, { DRAWER_WIDTH } from './Sidebar.tsx'
import { useWebSocket } from '../../hooks/useWebSocket.ts'

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { events, connected } = useWebSocket()
  const unread = events.filter(e => e.severity === 'error' || e.severity === 'warning').length

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar
        onMenuToggle={() => setMobileOpen(o => !o)}
        liveEventCount={unread}
        wsConnected={connected}
      />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box component="main" sx={{ flexGrow: 1, ml: { sm: `${DRAWER_WIDTH}px` }, overflow: 'auto' }}>
        <Toolbar />  {/* Spacer for fixed AppBar */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Pass live events to child pages via context or prop drilling */}
          <Outlet context={{ events, wsConnected: connected }} />
        </Box>
      </Box>
    </Box>
  )
}
