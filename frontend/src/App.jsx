import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WorkspacePage } from './pages/WorkspacePage'

function getRouterBasename() {
  const baseUrl = String(import.meta.env.BASE_URL || '/')
  if (!baseUrl || baseUrl === '/') return '/'
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function App() {
  const basename = getRouterBasename()
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<WorkspacePage />} />
        <Route path="/dashboard" element={<WorkspacePage />} />
        <Route path="/directory" element={<WorkspacePage />} />
        <Route path="/finance" element={<WorkspacePage />} />
        <Route path="/finance/transactions/:id" element={<WorkspacePage />} />
        <Route path="/payments" element={<WorkspacePage />} />
        <Route path="/payments/intents/:id" element={<WorkspacePage />} />
        <Route path="/portal" element={<WorkspacePage />} />
        <Route path="/expenses" element={<WorkspacePage />} />
        <Route path="/accounting" element={<WorkspacePage />} />
        <Route path="/events" element={<WorkspacePage />} />
        <Route path="/content" element={<WorkspacePage />} />
        <Route path="/staff" element={<WorkspacePage />} />
        <Route path="/whatsapp" element={<WorkspacePage />} />
        <Route path="/inventory" element={<WorkspacePage />} />
        <Route path="/scheduler" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
