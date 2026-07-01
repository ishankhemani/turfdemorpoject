import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Customer } from '@/types/database'

export function useCustomers() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async (): Promise<Customer[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('total_bookings', { ascending: false })

      if (error) throw error
      return (data || []) as Customer[]
    },
    enabled: !!user,
  })
}

export function useDeleteCustomer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useAreaStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['area-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('customers')
        .select('area, total_bookings')
        .eq('user_id', user.id)

      if (error) throw error

      const typedData = (data || []) as Array<{ area: string; total_bookings: number }>
      const areaMap = new Map<string, number>()
      typedData.forEach((c) => {
        areaMap.set(c.area, (areaMap.get(c.area) || 0) + c.total_bookings)
      })

      return Array.from(areaMap.entries())
        .map(([area, bookings]) => ({ area, bookings }))
        .sort((a, b) => b.bookings - a.bookings)
    },
    enabled: !!user,
  })
}
