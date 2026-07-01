import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { PageLoadingState } from '@/components/common/loading'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoadingState />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
