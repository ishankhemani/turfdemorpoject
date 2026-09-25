import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

interface StaffGuardProps {
  children: React.ReactNode
}

// Routes allowed for staff accounts
const ALLOWED_STAFF_PATHS = [
  '/admin/bookings',
  '/admin/customers',
]

export function StaffGuard({ children }: StaffGuardProps) {
  const { isStaff, loading } = useAuth()
  const location = useLocation()

  const currentPath = location.pathname

  // Check if the current route is allowed for staff
  const isAllowedForStaff = ALLOWED_STAFF_PATHS.some(
    (allowed) => currentPath === allowed || currentPath.startsWith(`${allowed}/`)
  )

  useEffect(() => {
    // Staff navigation to restricted path — redirect handles it
  }, [isStaff, isAllowedForStaff, loading])

  if (!loading && isStaff && !isAllowedForStaff) {
    return <Navigate to="/admin/bookings" replace />
  }

  return <>{children}</>
}
