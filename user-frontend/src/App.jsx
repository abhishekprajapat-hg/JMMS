import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PortalProvider } from './context/PortalContext'
import { SiteLayout } from './components/SiteLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { EbooksPage } from './pages/EbooksPage'
import { VideosPage } from './pages/VideosPage'
import { AboutMandirPage } from './pages/AboutMandirPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'
import { DonationPage } from './pages/DonationPage'
import { PoojaSchedulePage } from './pages/PoojaSchedulePage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <PortalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="ebooks" element={<EbooksPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="about" element={<AboutMandirPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="donation"
              element={
                <ProtectedRoute>
                  <DonationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pooja-schedule"
              element={
                <ProtectedRoute>
                  <PoojaSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  )
}
