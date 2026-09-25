import { motion } from 'framer-motion'
import { useTheme } from '@/stores/theme-store'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Menu, Sun, Moon, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getGreeting } from '@/lib/utils'
import { useAdminRealtimeSync } from '@/hooks/use-admin-realtime-sync'

interface NavbarProps {
  onMenuClick: () => void
  title?: string
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { profile, isStaff, setRole } = useAuth()
  useAdminRealtimeSync()

  return (
    <header className="sticky top-0 z-30 flex min-h-[4rem] items-center gap-4 border-b border-border/60 bg-background/75 backdrop-blur-xl px-4 lg:px-6 pt-[env(safe-area-inset-top,0px)] shadow-[0_10px_30px_rgba(2,6,23,0.15)]">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0 touch-manipulation min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
        onClick={(e) => {
          e.preventDefault()
          onMenuClick()
        }}
        aria-label="Toggle Menu"
      >
        <Menu className="h-6 w-6 text-foreground" />
      </Button>

      <div className="flex-1">
        {title ? (
          <h1 className="text-lg font-semibold">{title}</h1>
        ) : (
          <p className="text-sm text-muted-foreground hidden sm:block">
            {getGreeting()}, <span className="text-foreground font-medium">{profile?.full_name?.split(' ')[0] || 'User'}</span>
          </p>
        )}
      </div>

      <div className="hidden md:flex relative max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookings, customers..."
          className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              {resolvedTheme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Light
              {theme === 'light' && (
                <span className="ml-auto">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
              {theme === 'dark' && (
                <span className="ml-auto">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              System
              {theme === 'system' && (
                <span className="ml-auto">✓</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
