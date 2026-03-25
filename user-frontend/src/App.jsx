import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SiteLayout } from './components/SiteLayout'

const AboutMandirPage = lazy(() => import('./pages/AboutMandirPage').then((module) => ({ default: module.AboutMandirPage })))
const DonationPage = lazy(() => import('./pages/DonationPage').then((module) => ({ default: module.DonationPage })))
const EbooksPage = lazy(() => import('./pages/EbooksPage').then((module) => ({ default: module.EbooksPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const JainCalendarPage = lazy(() => import('./pages/JainCalendarPage').then((module) => ({ default: module.JainCalendarPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })))
const VideosPage = lazy(() => import('./pages/VideosPage').then((module) => ({ default: module.VideosPage })))

function RouteLoader() {
  return (
    <div className="rounded-[32px] border border-orange-200/70 bg-white/82 px-6 py-10 text-center text-sm font-semibold text-zinc-600 shadow-[0_18px_50px_rgba(132,71,21,0.08)] dark:border-orange-900/30 dark:bg-zinc-950/70 dark:text-zinc-300">
      Loading page...
    </div>
  )
}

function RouteBoundary({ children }) {
  return (
    <Suspense fallback={<RouteLoader />}>
      {children}
    </Suspense>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<RouteBoundary><HomePage /></RouteBoundary>} />
          <Route path="donate" element={<RouteBoundary><DonationPage /></RouteBoundary>} />
          <Route path="donation" element={<Navigate to="/donate" replace />} />
          <Route path="ebooks" element={<RouteBoundary><EbooksPage /></RouteBoundary>} />
          <Route path="videos" element={<RouteBoundary><VideosPage /></RouteBoundary>} />
          <Route path="calendar" element={<RouteBoundary><JainCalendarPage /></RouteBoundary>} />
          <Route path="events" element={<Navigate to="/calendar" replace />} />
          <Route path="about" element={<RouteBoundary><AboutMandirPage /></RouteBoundary>} />
          <Route path="login" element={<RouteBoundary><LoginPage /></RouteBoundary>} />
          <Route path="signup" element={<RouteBoundary><SignupPage /></RouteBoundary>} />
          <Route path="register" element={<Navigate to="/signup" replace />} />
          <Route path="forgot-password" element={<RouteBoundary><ForgotPasswordPage /></RouteBoundary>} />
          <Route
            path="profile"
            element={(
              <ProtectedRoute>
                <RouteBoundary>
                  <ProfilePage />
                </RouteBoundary>
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<RouteBoundary><NotFoundPage /></RouteBoundary>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
