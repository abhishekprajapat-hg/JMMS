import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SiteLayout } from './components/SiteLayout'
import { AboutMandirPage } from './pages/AboutMandirPage'
import { DonationPage } from './pages/DonationPage'
import { EbooksPage } from './pages/EbooksPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { JainCalendarPage } from './pages/JainCalendarPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignupPage } from './pages/SignupPage'
import { VideosPage } from './pages/VideosPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="donate" element={<DonationPage />} />
          <Route path="donation" element={<Navigate to="/donate" replace />} />
          <Route path="ebooks" element={<EbooksPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="calendar" element={<JainCalendarPage />} />
          <Route path="events" element={<Navigate to="/calendar" replace />} />
          <Route path="about" element={<AboutMandirPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="register" element={<Navigate to="/signup" replace />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="profile"
            element={(
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
