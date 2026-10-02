import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

function invalidateAdminData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['today-bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  void queryClient.invalidateQueries({ queryKey: ['monthly-data'] })
  void queryClient.invalidateQueries({ queryKey: ['customers'] })
  void queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
  void queryClient.invalidateQueries({ queryKey: ['area-stats'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-sales-all'] })
  void queryClient.invalidateQueries({ queryKey: ['inventory-audit'] })
}

export function useAdminRealtimeSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  // Hold a ref to the active channel so cleanup always removes the right instance
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user?.id) return

    // Append a random suffix so each mount creates a genuinely new channel.
    // This prevents the "cannot add callbacks after subscribe()" error that
    // occurs in React StrictMode when Supabase internally caches channels by
    // name and returns the already-subscribed instance on the second mount.
    const channelName = `admin-sync-${user.id}-${Math.random().toString(36).slice(2)}`

    const channel = supabase.channel(channelName)

    channel
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

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [queryClient, user?.id])
}
