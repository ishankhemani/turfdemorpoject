import { motion } from 'framer-motion'
import { useTheme } from '@/stores/theme-store'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Search, Menu, Sun, Moon, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getGreeting, formatSlotRange } from '@/lib/utils'
import { useBookingNotifications } from '@/hooks/use-booking-notifications'
import { useAdminRealtimeSync } from '@/hooks/use-admin-realtime-sync'

interface NavbarProps {
  onMenuClick: () => void
  title?: string
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { profile } = useAuth()
  const upcomingBookings = useBookingNotifications()
  useAdminRealtimeSync()

  return (
    <header className="sticky top-0 z-30 flex min-h-[4rem] items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6 pt-[env(safe-area-inset-top,0px)]">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {upcomingBookings.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {upcomingBookings.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {upcomingBookings.length > 0 ? `${upcomingBookings.length} booking reminder${upcomingBookings.length > 1 ? 's' : ''}` : 'No urgent reminders'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {upcomingBookings.length === 0 ? (
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                <span className="text-sm font-medium">All clear</span>
                <span className="text-xs text-muted-foreground">No booking starts in the next 5 minutes.</span>
              </DropdownMenuItem>
            ) : (
              upcomingBookings.map(({ booking, minutesLeft }) => (
                <DropdownMenuItem key={booking.id} className="flex flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">Upcoming Booking</span>
                    <Badge variant="success" className="text-[10px]">{minutesLeft} min</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {booking.customer_name} • {booking.area} • {formatSlotRange(booking.booking_time)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
