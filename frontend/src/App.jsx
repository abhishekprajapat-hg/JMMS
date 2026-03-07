import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WorkspacePage } from './pages/WorkspacePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<WorkspacePage />} />
        <Route path="/dashboard" element={<WorkspacePage />} />
        <Route path="/directory" element={<WorkspacePage />} />
        <Route path="/finance" element={<WorkspacePage />} />
        <Route path="/payments" element={<WorkspacePage />} />
        <Route path="/portal" element={<WorkspacePage />} />
        <Route path="/expenses" element={<WorkspacePage />} />
        <Route path="/accounting" element={<WorkspacePage />} />
        <Route path="/events" element={<WorkspacePage />} />
        <Route path="/whatsapp" element={<WorkspacePage />} />
        <Route path="/inventory" element={<WorkspacePage />} />
        <Route path="/scheduler" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
