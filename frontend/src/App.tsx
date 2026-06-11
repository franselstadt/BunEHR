import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { medblocksTheme } from './theme/medblocksTheme.ts'
import AppLayout from './components/layout/AppLayout.tsx'
import DashboardPage       from './pages/DashboardPage.tsx'
import PatientsPage        from './pages/PatientsPage.tsx'
import PatientDetailPage   from './pages/PatientDetailPage.tsx'
import OpenEHRPage         from './pages/OpenEHRPage.tsx'
import CkmPage             from './pages/CkmPage.tsx'
import ImagingAiPage       from './pages/ImagingAiPage.tsx'
import AboutPage           from './pages/AboutPage.tsx'
import ClinicalRecordsPage from './pages/ClinicalRecordsPage.tsx'
import FinancePage         from './pages/FinancePage.tsx'

/** Placeholder for pages not yet built */
const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
    <h2>{title}</h2>
    <p>Coming soon — this page is under development.</p>
  </div>
)

export default function App() {
  return (
    <ThemeProvider theme={medblocksTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index               element={<DashboardPage />} />
            <Route path="map"          element={<DashboardPage />} />
            <Route path="patients"     element={<PatientsPage />} />
            <Route path="patients/:ehrId" element={<PatientDetailPage />} />
            <Route path="records"      element={<ClinicalRecordsPage />} />
            <Route path="finance"      element={<FinancePage />} />
            <Route path="ai-imaging"   element={<ImagingAiPage />} />
            <Route path="aql"          element={<OpenEHRPage />} />
            <Route path="ckm"          element={<CkmPage />} />
            <Route path="openehr"      element={<OpenEHRPage />} />
            <Route path="settings"     element={<OpenEHRPage />} />
            <Route path="about"        element={<AboutPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
