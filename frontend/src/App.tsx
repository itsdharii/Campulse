import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from './hooks/useData'
import { ToastProvider } from './hooks/useToast'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Clubs from './pages/Clubs'
import Events from './pages/Events'
import Volunteers from './pages/Volunteers'
import Assistant from './pages/Assistant'
import Approvals from './pages/Approvals'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DataProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="events" element={<Events />} />
              <Route path="volunteers" element={<Volunteers />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
