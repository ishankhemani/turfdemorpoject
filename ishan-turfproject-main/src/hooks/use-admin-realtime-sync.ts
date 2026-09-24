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
  void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-sales-all'] })
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
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_sales', filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
          void queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
          void queryClient.invalidateQueries({ queryKey: ['inventory-sales-all'] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, toast, user?.id])
}
