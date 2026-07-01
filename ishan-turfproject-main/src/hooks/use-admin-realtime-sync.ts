import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { Booking } from '@/types/database'

function invalidateAdminData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['today-bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  void queryClient.invalidateQueries({ queryKey: ['monthly-data'] })
  void queryClient.invalidateQueries({ queryKey: ['customers'] })
  void queryClient.invalidateQueries({ queryKey: ['area-stats'] })
}

export function useAdminRealtimeSync() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const shownBookingIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`admin-booking-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          invalidateAdminData(queryClient)

          if (payload.eventType !== 'INSERT') return
          const booking = payload.new as Booking
          if (shownBookingIds.current.has(booking.id)) return
          shownBookingIds.current.add(booking.id)

          const isWebsiteBooking = booking.source === 'website' || booking.notes?.toLowerCase().includes('online website booking')
          toast({
            title: isWebsiteBooking ? 'New website booking received' : 'New booking received',
            description: `${booking.customer_name} • ${booking.sport} • ${booking.booking_date} • ${booking.booking_time}`,
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, toast, user?.id])
}
