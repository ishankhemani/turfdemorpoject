import { useEffect, useMemo, useRef } from 'react'
import { useTodayBookings } from '@/services/dashboard-service'
import { useToast } from '@/hooks/use-toast'
import type { Booking } from '@/types/database'

function minutesUntilTodayTime(time: string) {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return Number.POSITIVE_INFINITY
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3]?.toUpperCase()
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)
  return Math.round((target.getTime() - Date.now()) / 60000)
}

export function useBookingNotifications() {
  const { data: bookings = [] } = useTodayBookings()
  const { toast } = useToast()
  const shownRef = useRef<Set<string>>(new Set())

  const upcomingBookings = useMemo(() => {
    return bookings
      .map((booking: Booking) => ({ booking, minutesLeft: minutesUntilTodayTime(booking.booking_time) }))
      .filter(({ minutesLeft }) => minutesLeft >= 0 && minutesLeft <= 5)
      .sort((a, b) => a.minutesLeft - b.minutesLeft)
  }, [bookings])

  useEffect(() => {
    upcomingBookings.forEach(({ booking, minutesLeft }) => {
      if (shownRef.current.has(booking.id)) return
      shownRef.current.add(booking.id)
      toast({
        title: 'Upcoming Booking',
        description: `${booking.customer_name} • ${booking.area} • ${booking.booking_time} starts in ${minutesLeft} min`,
      })
    })
  }, [toast, upcomingBookings])

  return upcomingBookings
}
