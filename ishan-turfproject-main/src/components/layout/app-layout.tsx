import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/bookings': 'Bookings',
  '/accounts': 'Accounts',
  '/customers': 'Customers',
  '/analytics': 'Analytics',
  '/marketing': 'Marketing',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const title = pageTitles[location.pathname] || ''

  return (
    <div className="min-h-[100dvh] w-full bg-background overflow-x-hidden touch-smooth">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div
        className={`transition-all duration-200 min-h-[100dvh] flex flex-col ${
          collapsed ? 'lg:ml-20' : 'lg:ml-[280px]'
        }`}
      >
        <Navbar
          onMenuClick={() => setMobileOpen(true)}
          title={title}
        />

        <main className="flex-1 p-3.5 sm:p-4 lg:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
