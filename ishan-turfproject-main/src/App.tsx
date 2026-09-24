import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ThemeProvider } from '@/stores/theme-store'
import { AppLayout, ProtectedRoute, StaffGuard } from '@/components/layout'
import { Toaster } from '@/components/ui/toaster'
import { PageLoadingState } from '@/components/common/loading'
import { PwaInstallPrompt } from '@/components/common/pwa-install-prompt'

const LoginPage = lazy(() => import('@/pages/login-page').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard-page').then(m => ({ default: m.DashboardPage })))
const BookingPage = lazy(() => import('@/pages/booking-page').then(m => ({ default: m.BookingPage })))
const AccountsPage = lazy(() => import('@/pages/accounts-page').then(m => ({ default: m.AccountsPage })))
const CustomersPage = lazy(() => import('@/pages/customers-page').then(m => ({ default: m.CustomersPage })))
const AnalyticsPage = lazy(() => import('@/pages/analytics-page').then(m => ({ default: m.AnalyticsPage })))
const MarketingPage = lazy(() => import('@/pages/marketing-page').then(m => ({ default: m.MarketingPage })))
const ReportsPage = lazy(() => import('@/pages/reports-page').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then(m => ({ default: m.SettingsPage })))
const InventoryPage = lazy(() => import('@/pages/inventory-page').then(m => ({ default: m.InventoryPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

function AdminIndexRedirect() {
  const { isStaff } = useAuth()
  return <Navigate to={isStaff ? '/admin/bookings' : '/admin/dashboard'} replace />
}

const adminChildren = [
  { index: true, element: <AdminIndexRedirect /> },
  { path: 'dashboard', element: <Suspense fallback={<PageLoadingState />}><DashboardPage /></Suspense> },
  { path: 'bookings', element: <Suspense fallback={<PageLoadingState />}><BookingPage /></Suspense> },
  { path: 'inventory', element: <Suspense fallback={<PageLoadingState />}><InventoryPage /></Suspense> },
  { path: 'accounts', element: <Suspense fallback={<PageLoadingState />}><AccountsPage /></Suspense> },
  { path: 'customers', element: <Suspense fallback={<PageLoadingState />}><CustomersPage /></Suspense> },
  { path: 'analytics', element: <Suspense fallback={<PageLoadingState />}><AnalyticsPage /></Suspense> },
  { path: 'marketing', element: <Suspense fallback={<PageLoadingState />}><MarketingPage /></Suspense> },
  { path: 'reports', element: <Suspense fallback={<PageLoadingState />}><ReportsPage /></Suspense> },
  { path: 'settings', element: <Suspense fallback={<PageLoadingState />}><SettingsPage /></Suspense> },
]

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin/dashboard" replace /> },
  { path: '/login', element: <Suspense fallback={<PageLoadingState />}><LoginPage /></Suspense> },
  { path: '/dashboard', element: <Navigate to="/admin/dashboard" replace /> },
  { path: '/bookings', element: <Navigate to="/admin/bookings" replace /> },
  { path: '/accounts', element: <Navigate to="/admin/accounts" replace /> },
  { path: '/customers', element: <Navigate to="/admin/customers" replace /> },
  { path: '/analytics', element: <Navigate to="/admin/analytics" replace /> },
  { path: '/marketing', element: <Navigate to="/admin/marketing" replace /> },
  { path: '/reports', element: <Navigate to="/admin/reports" replace /> },
  { path: '/settings', element: <Navigate to="/admin/settings" replace /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <StaffGuard>
          <AppLayout />
        </StaffGuard>
      </ProtectedRoute>
    ),
    children: adminChildren,
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
          <PwaInstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
