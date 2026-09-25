import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
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
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return undefined

    const channel = supabase
      .channel(`universal-admin-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          invalidateAdminData(queryClient)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_sales' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
          void queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
          void queryClient.invalidateQueries({ queryKey: ['inventory-sales-all'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['customers'] })
          void queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, user?.id])
}
