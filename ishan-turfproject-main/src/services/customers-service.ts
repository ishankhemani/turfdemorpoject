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
          .order('total_bookings', { ascending: false }),
        supabase
          .from('bookings')
          .select('mobile_number, customer_name, booking_time, start_time'),
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

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export interface PendingPaymentCustomer {
  phone: string
  name: string
  area: string
  pendingCount: number
  pendingAmount: number
  bookings: Array<{
    id: string
    booking_date: string
    booking_time: string
    amount: number
    paid_amount: number
    pending_amount: number
    area: string
    sport: string
  }>
}

export function usePendingPayments() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['pending-payments', user?.id],
    queryFn: async (): Promise<PendingPaymentCustomer[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('bookings')
        .select('id, customer_name, mobile_number, area, booking_date, booking_time, amount, paid_amount, pending_amount, payment_status, sport')
        .order('booking_date', { ascending: false })

      if (error) throw error

      const rawBookings = (data || []) as Array<{
        id: string
        customer_name: string
        mobile_number: string
        area: string
        booking_date: string
        booking_time: string
        amount: number | string
        paid_amount?: number | string | null
        pending_amount?: number | string | null
        payment_status: 'paid' | 'pending'
        sport: string
      }>

      // Filter bookings with active pending balance
      const pendingBookingsList = rawBookings.filter((b) => {
        const totalAmt = Number(b.amount || 0)
        let pendingAmt = 0
        if (b.pending_amount !== undefined && b.pending_amount !== null) {
          pendingAmt = Number(b.pending_amount)
        } else if (b.payment_status === 'pending') {
          const paidAmt = Number(b.paid_amount || 0)
          pendingAmt = Math.max(0, totalAmt - paidAmt)
        }
        return pendingAmt > 0 || b.payment_status === 'pending'
      })

      // Group by phone number
      const byPhone = new Map<string, PendingPaymentCustomer>()
      pendingBookingsList.forEach((b) => {
        const phone = (b.mobile_number || '').trim()
        if (!phone) return
        const totalAmt = Number(b.amount || 0)
        let paidAmt = 0
        if (b.paid_amount !== undefined && b.paid_amount !== null) {
          paidAmt = Number(b.paid_amount)
        } else if (b.payment_status === 'paid') {
          paidAmt = totalAmt
        }

        let pendingAmt = 0
        if (b.pending_amount !== undefined && b.pending_amount !== null) {
          pendingAmt = Number(b.pending_amount)
        } else {
          pendingAmt = Math.max(0, totalAmt - paidAmt)
        }

        if (pendingAmt <= 0 && b.payment_status === 'paid') return

        const existing = byPhone.get(phone)
        const bookingItem = {
          id: b.id,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          amount: totalAmt,
          paid_amount: paidAmt,
          pending_amount: pendingAmt,
          area: b.area,
          sport: b.sport,
        }

        if (existing) {
          existing.pendingCount++
          existing.pendingAmount += pendingAmt
          existing.bookings.push(bookingItem)
        } else {
          byPhone.set(phone, {
            phone,
            name: b.customer_name,
            area: b.area,
            pendingCount: 1,
            pendingAmount: pendingAmt,
            bookings: [bookingItem],
          })
        }
      })

      return Array.from(byPhone.values()).sort((a, b) => b.pendingAmount - a.pendingAmount)
    },
    enabled: !!user,
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
