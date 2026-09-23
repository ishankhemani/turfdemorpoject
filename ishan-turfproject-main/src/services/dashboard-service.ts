import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { ensureUserExists } from '@/lib/ensure-user-exists'
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
  onlineRevenue: number
  offlineRevenue: number
  addOnsRevenue: number
  bottleSalesQty: number
  bottleSalesRevenue: number
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
    .select('id, customer_name')
    .eq('user_id', params.userId)
    .eq('booking_date', params.bookingDate)
    .eq('booking_time', params.bookingTime)
    .eq('area', params.area)
    .limit(1)

  if (params.ignoreBookingId) {
    query = query.neq('id', params.ignoreBookingId)
  }

  const { data, error } = await query
  if (error) {
    console.warn('Slot availability check warning:', error.message)
    return
  }

  if (data && data.length > 0) {
    const existing = data[0]
    const holder = existing.customer_name ? ` (booked by ${existing.customer_name})` : ''
    throw new Error(
      `Slot conflict: '${params.bookingTime}' on '${params.area}' is already booked for ${params.bookingDate}${holder}. Please select an available slot.`
    )
  }
}

async function recalculateCustomer(userId: string, phone: string) {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('customer_name, mobile_number, area, booking_date, amount, payment_status')
      .eq('user_id', userId)
      .eq('mobile_number', phone)
      .order('booking_date', { ascending: false })

    if (error) return

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

    await supabase
      .from('customers')
      .upsert(
        {
          name: latest.customer_name,
          phone,
          area: latest.area || 'Turf Main Ground',
          user_id: userId,
          total_bookings: customerBookings.length,
          total_spent: totalSpent,
          last_booking_date: latest.booking_date,
        },
        { onConflict: 'user_id,phone' }
      )
  } catch (e) {
    console.warn('Recalculate customer warning', e)
  }
}

export interface DailySummary {
  date: string
  revenue: number
  expenses: number
  profit: number
  totalBookings: number
}

export function useDashboardStats(
  dateFilter: 'day' | 'month' | 'custom' = 'month',
  customStartDate?: string,
  customEndDate?: string
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, dateFilter, customStartDate, customEndDate],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) throw new Error('Not authenticated')

      const now = new Date()
      let start: string
      let end: string

      if (dateFilter === 'day') {
        start = toDateKey(now)
        end = toDateKey(now)
      } else if (dateFilter === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        start = toDateKey(firstDay)
        end = toDateKey(now)
      } else {
        start = customStartDate || toDateKey(now)
        end = customEndDate || customStartDate || toDateKey(now)
      }

      const [{ data: bookings, error: bookingsError }, { data: expenses, error: expensesError }, { data: labourPayments, error: labourError }, { data: liabilityPayments, error: liabilityError }, { data: otherIncome }, { data: invSales }] =
        await Promise.all([
          supabase.from('bookings').select('*').eq('user_id', user.id).gte('booking_date', start).lte('booking_date', end),
          supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('labour_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('liability_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('other_income').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          supabase.from('inventory_sales').select('*').eq('user_id', user.id).gte('date', start).lte('date', end),
        ])

      if (bookingsError) throw bookingsError
      if (expensesError) throw expensesError
      if (labourError) throw labourError
      if (liabilityError) throw liabilityError

      const bookingsList = (bookings || []) as Booking[]

      let onlineRevenue = 0
      let offlineRevenue = 0
      let addOnsRevenue = 0
      let bottleSalesQty = 0
      let bottleSalesRevenue = 0

      bookingsList.forEach((b) => {
        const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
        const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
        const totalAmount = Number(b.amount || 0)
        const isPaid = b.payment_status === 'paid'

        if (mode === 'split') {
          let onAmt = Number(b.online_amount || 0)
          let offAmt = Number(b.offline_amount || 0)
          if (onAmt === 0 && offAmt === 0) {
            onAmt = Math.floor(totalAmount / 2)
            offAmt = totalAmount - onAmt
          }
          // Online portion of split is received online right away
          onlineRevenue += onAmt
          // Offline portion of split is included when paid or recorded
          if (isPaid || offAmt > 0) {
            offlineRevenue += offAmt
          }
        } else if (mode === 'online' || isOnlineBooking) {
          // Online payments (UPI, Card, App, Website) are received online right away
          onlineRevenue += totalAmount
        } else {
          // Offline / Cash payment
          if (isPaid) {
            offlineRevenue += totalAmount
          }
        }

        if (isPaid && Array.isArray(b.add_ons)) {
          b.add_ons.forEach((item) => {
            const qty = Number(item.qty || 0)
            const price = Number(item.price || 0)
            const amt = price * qty
            addOnsRevenue += amt
            bottleSalesQty += qty
            bottleSalesRevenue += amt
          })
        }
      })

      // Include standalone inventory counter sales (not linked to a booking)
      if (invSales && Array.isArray(invSales)) {
        invSales.forEach((sale: any) => {
          if (!sale.booking_id) {
            const qty = Number(sale.qty_sold || 0)
            const amt = Number(sale.amount || 0)
            addOnsRevenue += amt
            bottleSalesQty += qty
            bottleSalesRevenue += amt
            // Note: these are counted in standaloneInvSalesIn below, not in offlineRevenue
          }
        })
      }

      const standaloneInvSalesIn = (invSales || []).filter((s: any) => !s.booking_id).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0)
      const cashIn = onlineRevenue + offlineRevenue + standaloneInvSalesIn + moneySum((otherIncome || []) as MoneyRow[])
      const expensesTotal = moneySum((expenses || []) as MoneyRow[])
      const labourTotal = moneySum((labourPayments || []) as MoneyRow[])
      const liabilityTotal = moneySum((liabilityPayments || []) as MoneyRow[])
      const cashOut = expensesTotal + labourTotal + liabilityTotal

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
        profit: cashIn - cashOut,
        todayBookings: todayBookings.length,
        currentBooking,
        nextBooking,
        availableSlots: Math.max(0, DEFAULT_SLOT_COUNT - uniqueOccupiedSlots),
        busySlots: uniqueOccupiedSlots,
        totalSlots: DEFAULT_SLOT_COUNT,
        onlineRevenue,
        offlineRevenue,
        addOnsRevenue,
        bottleSalesQty,
        bottleSalesRevenue,
      }
    },
    enabled: !!user,
    refetchInterval: 60000,
  })
}

export function useDailyData(daysCount: number = 10, startDateOverride?: string, endDateOverride?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['daily-data', user?.id, daysCount, startDateOverride, endDateOverride],
    queryFn: async (): Promise<DailySummary[]> => {
      if (!user) throw new Error('Not authenticated')

      const dates: string[] = []
      if (startDateOverride && endDateOverride) {
        let curr = new Date(startDateOverride)
        const end = new Date(endDateOverride)
        while (curr <= end) {
          dates.push(toDateKey(curr))
          curr.setDate(curr.getDate() + 1)
        }
      } else {
        const today = new Date()
        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          dates.push(toDateKey(d))
        }
      }

      const results = await Promise.all(
        dates.map(async (dateKey) => {
          const [{ data: bookings }, { data: expenses }, { data: labourPayments }, { data: liabilityPayments }] = await Promise.all([
            supabase.from('bookings').select('amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source').eq('user_id', user.id).eq('booking_date', dateKey),
            supabase.from('expenses').select('amount').eq('user_id', user.id).eq('date', dateKey),
            supabase.from('labour_payments').select('amount').eq('user_id', user.id).eq('date', dateKey),
            supabase.from('liability_payments').select('amount').eq('user_id', user.id).eq('date', dateKey),
          ])

          const bookingsList = (bookings || []) as Booking[]
          let revenue = 0
          bookingsList.forEach((b) => {
            const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
            const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
            const amt = Number(b.amount || 0)
            if (mode === 'split') {
              let onAmt = Number(b.online_amount || 0)
              let offAmt = Number(b.offline_amount || 0)
              if (onAmt === 0 && offAmt === 0) {
                onAmt = Math.floor(amt / 2)
                offAmt = amt - onAmt
              }
              revenue += onAmt + (b.payment_status === 'paid' ? offAmt : 0)
            } else if (mode === 'online' || isOnlineBooking) {
              revenue += amt
            } else if (b.payment_status === 'paid') {
              revenue += amt
            }
          })

          const exp = moneySum((expenses || []) as MoneyRow[]) + moneySum((labourPayments || []) as MoneyRow[]) + moneySum((liabilityPayments || []) as MoneyRow[])

          return {
            date: dateKey,
            revenue,
            expenses: exp,
            profit: revenue - exp,
            totalBookings: bookingsList.length,
          }
        })
      )

      return results
    },
    enabled: !!user,
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

          const [{ data: bookings }, { data: expenses }, { data: labourPayments }, { data: liabilityPayments }, { data: otherIncome }] = await Promise.all([
            supabase.from('bookings').select('amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source').eq('user_id', user.id).gte('booking_date', start).lte('booking_date', end),
            supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('labour_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('liability_payments').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
            supabase.from('other_income').select('amount').eq('user_id', user.id).gte('date', start).lte('date', end),
          ])

          const bookingsList = (bookings || []) as Booking[]
          let bookingRev = 0
          bookingsList.forEach((b) => {
            const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
            const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
            const amt = Number(b.amount || 0)
            if (mode === 'split') {
              let onAmt = Number(b.online_amount || 0)
              let offAmt = Number(b.offline_amount || 0)
              if (onAmt === 0 && offAmt === 0) {
                onAmt = Math.floor(amt / 2)
                offAmt = amt - onAmt
              }
              bookingRev += onAmt + (b.payment_status === 'paid' ? offAmt : 0)
            } else if (mode === 'online' || isOnlineBooking) {
              bookingRev += amt
            } else if (b.payment_status === 'paid') {
              bookingRev += amt
            }
          })

          const revenue = bookingRev + moneySum((otherIncome || []) as MoneyRow[])
          const expensesTotal = moneySum((expenses || []) as MoneyRow[]) + moneySum((labourPayments || []) as MoneyRow[]) + moneySum((liabilityPayments || []) as MoneyRow[])

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
      const authUser = user || (await supabase.auth.getUser()).data?.user
      if (!authUser) throw new Error('Not authenticated. Please log in again.')

      await ensureUserExists(authUser)

      const targetArea = booking.area || 'Turf Main Ground'
      const targetSport = booking.sport || 'Turf Sport'

      await assertSlotAvailable({
        userId: authUser.id,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        area: targetArea,
      })

      const payload = { ...booking, area: targetArea, sport: targetSport, user_id: authUser.id }

      // First attempt full payload
      let { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select()
        .single()

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('uniq_bookings_user_date_time_area') ||
          error.message?.includes('unique constraint')
        ) {
          throw new Error(
            `Slot conflict: '${booking.booking_time}' on '${targetArea}' is already booked for ${booking.booking_date}. Please select an available slot.`
          )
        }

        const isSchemaError =
          error.message?.includes('schema cache') ||
          error.message?.includes('column') ||
          error.code === 'PGRST204'

        console.warn('Full payload insert failed, trying standard payload', error.message)
        const effectiveMode = booking.payment_mode || (booking.transaction_id || booking.source === 'website' ? 'online' : 'offline')
        const totalAmt = Number(booking.amount || 0)

        // Build standard payload — exclude online_amount/offline_amount if schema doesn't have them
        const standardPayload: Record<string, any> = {
          customer_name: booking.customer_name,
          mobile_number: booking.mobile_number,
          area: targetArea,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          sport: targetSport,
          amount: booking.amount,
          payment_status: booking.payment_status,
          payment_mode: effectiveMode,
          notes: booking.notes || null,
          user_id: authUser.id,
        }

        // Only include split-amount columns if schema likely has them
        if (!isSchemaError) {
          standardPayload.online_amount = booking.online_amount ?? (effectiveMode === 'split' ? Math.floor(totalAmt / 2) : effectiveMode === 'online' ? totalAmt : 0)
          standardPayload.offline_amount = booking.offline_amount ?? (effectiveMode === 'split' ? totalAmt - Math.floor(totalAmt / 2) : effectiveMode === 'offline' ? totalAmt : 0)
        }

        const fallbackRes = await supabase
          .from('bookings')
          .insert(standardPayload)
          .select()
          .single()

        if (fallbackRes.error) {
          if (
            fallbackRes.error.code === '23505' ||
            fallbackRes.error.message?.includes('uniq_bookings_user_date_time_area') ||
            fallbackRes.error.message?.includes('unique constraint')
          ) {
            throw new Error(
              `Slot conflict: '${booking.booking_time}' on '${targetArea}' is already booked for ${booking.booking_date}. Please select an available slot.`
            )
          }

          // If second attempt also fails on schema, try bare minimum payload
          if (
            fallbackRes.error.message?.includes('schema cache') ||
            fallbackRes.error.message?.includes('column') ||
            fallbackRes.error.code === 'PGRST204'
          ) {
            const minPayload = {
              customer_name: booking.customer_name,
              mobile_number: booking.mobile_number,
              area: targetArea,
              booking_date: booking.booking_date,
              booking_time: booking.booking_time,
              sport: targetSport,
              amount: booking.amount,
              payment_status: booking.payment_status,
              payment_mode: effectiveMode,
              user_id: authUser.id,
            }
            const minRes = await supabase.from('bookings').insert(minPayload).select().single()
            if (minRes.error) throw new Error(minRes.error.message || 'Database error creating booking')
            data = minRes.data
          } else {
            throw new Error(fallbackRes.error.message || 'Database error creating booking')
          }
        } else {
          data = fallbackRes.data
        }
      }

      await recalculateCustomer(authUser.id, booking.mobile_number)
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
      const authUser = user || (await supabase.auth.getUser()).data?.user
      if (!authUser) throw new Error('Not authenticated. Please log in again.')

      await ensureUserExists(authUser)

      const { data: oldBooking, error: oldError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single()

      if (oldError && oldError.code !== 'PGRST116') {
        console.warn('Could not fetch old booking for update', oldError)
      }

      const previous = (oldBooking || {}) as Booking
      const nextDate = updates.booking_date || previous.booking_date
      const nextTime = updates.booking_time || previous.booking_time
      const nextArea = updates.area || previous.area || 'Turf Main Ground'

      await assertSlotAvailable({ userId: authUser.id, bookingDate: nextDate, bookingTime: nextTime, area: nextArea, ignoreBookingId: id })

      let { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .eq('user_id', authUser.id)
        .select()
        .single()

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('uniq_bookings_user_date_time_area') ||
          error.message?.includes('unique constraint')
        ) {
          throw new Error(
            `Slot conflict: '${nextTime}' on '${nextArea}' is already booked for ${nextDate}. Please select an available slot.`
          )
        }

        const isSchemaErrorUpd =
          error.message?.includes('schema cache') ||
          error.message?.includes('column') ||
          error.code === 'PGRST204'

        console.warn('Full payload update failed, trying standard fields update', error.message)
        const standardUpdates: Record<string, any> = {}
        if (updates.customer_name) standardUpdates.customer_name = updates.customer_name
        if (updates.mobile_number) standardUpdates.mobile_number = updates.mobile_number
        if (updates.area) standardUpdates.area = updates.area
        if (updates.booking_date) standardUpdates.booking_date = updates.booking_date
        if (updates.booking_time) standardUpdates.booking_time = updates.booking_time
        if (updates.sport) standardUpdates.sport = updates.sport
        if (updates.amount !== undefined) standardUpdates.amount = updates.amount
        if (updates.payment_status) standardUpdates.payment_status = updates.payment_status
        if (updates.payment_mode !== undefined) standardUpdates.payment_mode = updates.payment_mode
        // Only include split-amount columns if schema likely has them
        if (!isSchemaErrorUpd) {
          if (updates.online_amount !== undefined) standardUpdates.online_amount = updates.online_amount
          if (updates.offline_amount !== undefined) standardUpdates.offline_amount = updates.offline_amount
        }
        if (updates.notes !== undefined) standardUpdates.notes = updates.notes

        const fallbackRes = await supabase
          .from('bookings')
          .update(standardUpdates)
          .eq('id', id)
          .eq('user_id', authUser.id)
          .select()
          .single()

        if (fallbackRes.error) {
          if (
            fallbackRes.error.code === '23505' ||
            fallbackRes.error.message?.includes('uniq_bookings_user_date_time_area') ||
            fallbackRes.error.message?.includes('unique constraint')
          ) {
            throw new Error(
              `Slot conflict: '${nextTime}' on '${nextArea}' is already booked for ${nextDate}. Please select an available slot.`
            )
          }
          // If still schema error, strip out more fields and retry
          if (
            fallbackRes.error.message?.includes('schema cache') ||
            fallbackRes.error.message?.includes('column') ||
            fallbackRes.error.code === 'PGRST204'
          ) {
            const minUpdates: Record<string, any> = {}
            if (updates.customer_name) minUpdates.customer_name = updates.customer_name
            if (updates.mobile_number) minUpdates.mobile_number = updates.mobile_number
            if (updates.area) minUpdates.area = updates.area
            if (updates.booking_date) minUpdates.booking_date = updates.booking_date
            if (updates.booking_time) minUpdates.booking_time = updates.booking_time
            if (updates.sport) minUpdates.sport = updates.sport
            if (updates.amount !== undefined) minUpdates.amount = updates.amount
            if (updates.payment_status) minUpdates.payment_status = updates.payment_status
            if (updates.payment_mode !== undefined) minUpdates.payment_mode = updates.payment_mode
            if (updates.notes !== undefined) minUpdates.notes = updates.notes
            const minRes = await supabase.from('bookings').update(minUpdates).eq('id', id).eq('user_id', authUser.id).select().single()
            if (minRes.error) throw new Error(minRes.error.message || 'Database error updating booking')
            data = minRes.data
          } else {
            throw new Error(fallbackRes.error.message || 'Database error updating booking')
          }
        } else {
          data = fallbackRes.data
        }
      }

      if (previous.mobile_number) {
        await recalculateCustomer(authUser.id, previous.mobile_number)
      }
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
