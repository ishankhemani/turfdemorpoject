import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

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
  const { toast } = useToast()

  const currentPath = location.pathname

  // Check if the current route is allowed for staff
  const isAllowedForStaff = ALLOWED_STAFF_PATHS.some(
    (allowed) => currentPath === allowed || currentPath.startsWith(`${allowed}/`)
  )

  useEffect(() => {
    if (!loading && isStaff && !isAllowedForStaff) {
      toast({
        title: 'Access Restricted',
        description: 'Staff accounts are only permitted to access Bookings and Customers.',
        variant: 'destructive',
      })
    }
  }, [isStaff, isAllowedForStaff, loading, toast])

  if (!loading && isStaff && !isAllowedForStaff) {
    return <Navigate to="/admin/bookings" replace />
  }

  return <>{children}</>
}
