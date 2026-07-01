import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Booking } from '@/types/database'

export interface DashboardStats {
  totalBookings: number
  cashIn: number
  cashOut: number
  profit: number
  todayBookings: number
  currentBooking: Booking | null
  nextBooking: Booking | null
  availableSlots: number
  busySlots: number
  totalSlots: number
}

export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

type MoneyRow = { amount: number | string }
type BookingWrite = Omit<Booking, 'id' | 'user_id' | 'created_at' | 'updated_at'>

const DEFAULT_SLOT_COUNT = 17
const toDateKey = (date: Date) => date.toISOString().split('T')[0]
const moneySum = (rows: MoneyRow[] = []) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

async function assertSlotAvailable(params: {
  userId: string
  bookingDate?: string
  bookingTime?: string
  area?: string
  ignoreBookingId?: string
}) {
  if (!params.bookingDate || !params.bookingTime || !params.area) return

  let query = supabase
    .from('bookings')
    .select('id')
    .eq('user_id', params.userId)
    .eq('booking_date', params.bookingDate)
    .eq('booking_time', params.bookingTime)
    .eq('area', params.area)
    .limit(1)

  if (params.ignoreBookingId) {
    query = query.neq('id', params.ignoreBookingId)
  }

  const { data, error } = await query
  if (error) throw error
  if ((data || []).length > 0) {
    throw new Error('This ground and time slot is already booked. Choose another slot or edit the existing booking.')
  }
}

async function recalculateCustomer(userId: string, phone: string) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('customer_name, mobile_number, area, booking_date, amount, payment_status')
    .eq('user_id', userId)
    .eq('mobile_number', phone)
    .order('booking_date', { ascending: false })

  if (error) throw error

  const customerBookings = (bookings || []) as Array<{
    customer_name: string
    mobile_number: string
    area: string
    booking_date: string
    amount: number | string
    payment_status: 'paid' | 'pending'
  }>

  if (customerBookings.length === 0) {
    await supabase.from('customers').delete().eq('user_id', userId).eq('phone', phone)
    return
  }

  const latest = customerBookings[0]
  const totalSpent = customerBookings
    .filter((booking) => booking.payment_status === 'paid')
    .reduce((sum, booking) => sum + Number(booking.amount || 0), 0)

  const { error: upsertError } = await supabase
    .from('customers')
    .upsert(
      {
        name: latest.customer_name,
        phone,
        area: latest.area,
        user_id: userId,
        total_bookings: customerBookings.length,
        total_spent: totalSpent,
        last_booking_date: latest.booking_date,
      },
      { onConflict: 'user_id,phone' }
    )

  if (upsertError) throw upsertError
}

export function useDashboardStats(dateFilter: 'day' | 'month' | 'year' = 'month') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, dateFilter],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) throw new Error('Not authenticated')

      const now = new Date()
      let startDate: Date
      let endDate: Date

      if (dateFilter === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      } else if (dateFilter === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      } else {
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      }

      const start = toDateKey(startDate)
      const end = toDateKey(endDate)

      const [{ data: bookings, error: bookingsError }, { data: expenses, error: expensesError }, { data: labourPayments, error: labourError }, { data: otherIncome }] =
        await Promise.all([
          supabase.from('bookings').select('*').eq('user_id', user.id).gte('booking_date', start).lte('booking_date', end),
          supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('labour_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('other_income').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
        ])

      if (bookingsError) throw bookingsError
      if (expensesError) throw expensesError
      if (labourError) throw labourError

      const bookingsList = (bookings || []) as Booking[]
      const paidBookings = bookingsList.filter((booking) => booking.payment_status === 'paid')
      const cashIn = paidBookings.reduce((sum, booking) => sum + Number(booking.amount || 0), 0) + moneySum((otherIncome || []) as MoneyRow[])
      const expensesTotal = moneySum((expenses || []) as MoneyRow[])
      const labourTotal = moneySum((labourPayments || []) as MoneyRow[])
      const cashOut = expensesTotal + labourTotal

      const today = toDateKey(new Date())
      const todayBookings = bookingsList.filter((booking) => booking.booking_date === today)
      const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const sortedTodayBookings = [...todayBookings].sort((a, b) => a.booking_time.localeCompare(b.booking_time))
      const currentBooking = [...sortedTodayBookings].reverse().find((booking) => booking.booking_time <= currentTimeStr) || null
      const nextBooking = sortedTodayBookings.find((booking) => booking.booking_time > currentTimeStr) || null
      const uniqueOccupiedSlots = new Set(todayBookings.map((booking) => `${booking.area}-${booking.booking_time}`)).size

      return {
        totalBookings: bookingsList.length,
        cashIn,
        cashOut,
        profit: cashIn - expensesTotal - labourTotal,
        todayBookings: todayBookings.length,
        currentBooking,
        nextBooking,
        availableSlots: Math.max(0, DEFAULT_SLOT_COUNT - uniqueOccupiedSlots),
        busySlots: uniqueOccupiedSlots,
        totalSlots: DEFAULT_SLOT_COUNT,
      }
    },
    enabled: !!user,
    refetchInterval: 60000,
  })
}

export function useMonthlyData(year: number = new Date().getFullYear()) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['monthly-data', user?.id, year],
    queryFn: async (): Promise<MonthlyData[]> => {
      if (!user) throw new Error('Not authenticated')

      const results = await Promise.all(
        Array.from({ length: 12 }, async (_, month) => {
          const start = toDateKey(new Date(year, month, 1))
          const end = toDateKey(new Date(year, month + 1, 0))

          const [{ data: bookings }, { data: expenses }, { data: labourPayments }, { data: otherIncome }] = await Promise.all([
            supabase.from('bookings').select('amount, payment_status').eq('user_id', user.id).gte('booking_date', start).lte('booking_date', end),
            supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('labour_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('other_income').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          ])

          const bookingsList = (bookings || []) as Array<{ payment_status: string; amount: number | string }>
          const revenue = bookingsList
            .filter((booking) => booking.payment_status === 'paid')
            .reduce((sum, booking) => sum + Number(booking.amount || 0), 0) + moneySum((otherIncome || []) as MoneyRow[])
          const expensesTotal = moneySum((expenses || []) as MoneyRow[]) + moneySum((labourPayments || []) as MoneyRow[])

          return {
            month: new Date(year, month).toLocaleString('default', { month: 'short' }),
            revenue,
            expenses: expensesTotal,
            profit: revenue - expensesTotal,
          }
        })
      )

      return results
    },
    enabled: !!user,
  })
}

export function useTodayBookings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['today-bookings', user?.id],
    queryFn: async (): Promise<Booking[]> => {
      if (!user) throw new Error('Not authenticated')

      const today = toDateKey(new Date())
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('booking_date', today)
        .order('booking_time', { ascending: true })

      if (error) throw error
      return (data || []) as Booking[]
    },
    enabled: !!user,
    refetchInterval: 30000,
  })
}

export function useBookings(date?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['bookings', user?.id, date],
    queryFn: async (): Promise<Booking[]> => {
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: true })

      if (date) query = query.eq('booking_date', date)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Booking[]
    },
    enabled: !!user,
  })
}

function invalidateBusinessQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['bookings'] })
  queryClient.invalidateQueries({ queryKey: ['today-bookings'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  queryClient.invalidateQueries({ queryKey: ['monthly-data'] })
  queryClient.invalidateQueries({ queryKey: ['customers'] })
  queryClient.invalidateQueries({ queryKey: ['area-stats'] })
}

export function useCreateBooking() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (booking: BookingWrite) => {
      if (!user) throw new Error('Not authenticated')
      await assertSlotAvailable({ userId: user.id, bookingDate: booking.booking_date, bookingTime: booking.booking_time, area: booking.area })

      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...booking, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      await recalculateCustomer(user.id, booking.mobile_number)
      return data
    },
    onSuccess: () => invalidateBusinessQueries(queryClient),
  })
}

export function useUpdateBooking() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Booking> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data: oldBooking, error: oldError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (oldError) throw oldError

      const previous = oldBooking as Booking
      const nextDate = updates.booking_date || previous.booking_date
      const nextTime = updates.booking_time || previous.booking_time
      const nextArea = updates.area || previous.area
      await assertSlotAvailable({ userId: user.id, bookingDate: nextDate, bookingTime: nextTime, area: nextArea, ignoreBookingId: id })

      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      await recalculateCustomer(user.id, previous.mobile_number)
      const updated = data as Booking
      if (updated.mobile_number !== previous.mobile_number) await recalculateCustomer(user.id, updated.mobile_number)
      return data
    },
    onSuccess: () => invalidateBusinessQueries(queryClient),
  })
}

export function useDeleteBooking() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')

      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('mobile_number')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (fetchError) throw fetchError

      const { error } = await supabase.from('bookings').delete().eq('id', id).eq('user_id', user.id)
      if (error) throw error

      const deleted = booking as { mobile_number: string }
      await recalculateCustomer(user.id, deleted.mobile_number)
    },
    onSuccess: () => invalidateBusinessQueries(queryClient),
  })
}
