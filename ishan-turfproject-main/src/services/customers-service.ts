import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Customer } from '@/types/database'

export function getSlotAmPm(timeStr?: string | null): 'AM' | 'PM' {
  if (!timeStr) return 'PM'
  const str = timeStr.trim().toUpperCase()

  if (str.includes('AM')) return 'AM'
  if (str.includes('PM')) return 'PM'

  const match = str.match(/^(\d{1,2})/)
  if (match) {
    const hour = parseInt(match[1], 10)
    if (hour >= 0 && hour < 12) return 'AM'
    return 'PM'
  }

  return 'PM'
}

export interface CustomerWithTimeStats extends Customer {
  am_bookings: number
  pm_bookings: number
  preference: 'AM' | 'PM' | 'Both'
}

export function useCustomers() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['customers', user?.id],
    queryFn: async (): Promise<CustomerWithTimeStats[]> => {
      if (!user) throw new Error('Not authenticated')

      const [{ data: customers, error: custErr }, { data: bookings, error: bookErr }] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('total_bookings', { ascending: false }),
        supabase
          .from('bookings')
          .select('mobile_number, customer_name, booking_time, start_time')
          .eq('user_id', user.id),
      ])

      if (custErr) throw custErr
      if (bookErr) console.warn('Bookings fetch warning in useCustomers:', bookErr.message)

      const customerList = (customers || []) as Customer[]
      const bookingList = (bookings || []) as Array<{
        mobile_number: string
        customer_name: string
        booking_time: string
        start_time?: string | null
      }>

      // Map phone numbers to list of bookings
      const bookingsByPhone = new Map<string, typeof bookingList>()
      bookingList.forEach((b) => {
        const phoneKey = (b.mobile_number || '').trim()
        if (!phoneKey) return
        const existing = bookingsByPhone.get(phoneKey) || []
        existing.push(b)
        bookingsByPhone.set(phoneKey, existing)
      })

      return customerList.map((c) => {
        const cPhone = (c.phone || '').trim()
        const userBookings = bookingsByPhone.get(cPhone) || []

        let amCount = 0
        let pmCount = 0

        userBookings.forEach((b) => {
          const timeVal = b.booking_time || b.start_time || ''
          const slotPeriod = getSlotAmPm(timeVal)
          if (slotPeriod === 'AM') amCount++
          else pmCount++
        })

        let preference: 'AM' | 'PM' | 'Both' = 'Both'
        if (amCount > pmCount) preference = 'AM'
        else if (pmCount > amCount) preference = 'PM'
        else preference = 'Both'

        return {
          ...c,
          am_bookings: amCount,
          pm_bookings: pmCount,
          preference,
        }
      })
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
