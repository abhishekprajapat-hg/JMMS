import { Navigate, useLocation } from 'react-router-dom'
import { usePortal } from '../context/usePortal'

export function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated } = usePortal()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
