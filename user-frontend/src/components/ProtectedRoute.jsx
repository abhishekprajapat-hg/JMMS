import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated } = useApp()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname || '/profile' }} />
  }

  return children
}
