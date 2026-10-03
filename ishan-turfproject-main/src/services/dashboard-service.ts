import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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

function distributeSplitAmounts(onAmt: number, offAmt: number, paidAmount: number): [number, number] {
  const explicitSum = Number(onAmt || 0) + Number(offAmt || 0)
  if (paidAmount <= 0) return [0, 0]
  if (explicitSum <= 0) {
    const on = Math.floor(paidAmount / 2)
    return [on, paidAmount - on]
  }
  const ratio = Number(onAmt || 0) / explicitSum
  const on = Math.round(paidAmount * ratio)
  const off = paidAmount - on
  return [on, off]
}

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
      await supabase.from('customers').delete().eq('phone', phone)
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
        { onConflict: 'phone' } // phone-only unique key — works for both owner and employee roles
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
  const queryClient = useQueryClient()

  const query = useQuery({
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
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        start = toDateKey(firstDay)
        end = toDateKey(lastDay)
      } else {
        start = customStartDate || toDateKey(now)
        end = customEndDate || customStartDate || toDateKey(now)
      }

      const [{ data: bookingRows, error: bookingsError }, { data: paymentDateRows }, { data: expenses, error: expensesError }, { data: labourPayments, error: labourError }, { data: liabilityPayments, error: liabilityError }, { data: otherIncome }, { data: invSales }] =
        await Promise.all([
          supabase.from('bookings').select('*').gte('booking_date', start).lte('booking_date', end),
          supabase.from('bookings').select('*').gte('payment_received_date', start).lte('payment_received_date', end),
          supabase.from('expenses').select('amount').gte('date', start).lte('date', end),
          supabase.from('labour_payments').select('amount').gte('date', start).lte('date', end),
          supabase.from('liability_payments').select('amount').gte('date', start).lte('date', end),
          supabase.from('other_income').select('amount').gte('date', start).lte('date', end),
          supabase.from('inventory_sales').select('*').gte('date', start).lte('date', end),
        ])

      if (bookingsError) throw bookingsError
      if (expensesError) throw expensesError
      if (labourError) throw labourError
      if (liabilityError) throw liabilityError

      const mergedBookings = new Map<string, Booking>()
      const bookingsList = [...(bookingRows || []), ...(paymentDateRows || [])].filter(Boolean) as Booking[]
      bookingsList.forEach((booking) => {
        mergedBookings.set(booking.id, { ...(mergedBookings.get(booking.id) || {}), ...booking })
      })

      const normalizedBookings = Array.from(mergedBookings.values())

      let onlineRevenue = 0
      let offlineRevenue = 0
      let addOnsRevenue = 0
      let bottleSalesQty = 0
      let bottleSalesRevenue = 0

      normalizedBookings.forEach((b) => {
        const saleDate = (b.payment_received_date || b.booking_date || '').toString()
        if (saleDate && saleDate < start) return
        if (saleDate && saleDate > end) return

        const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
        const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
        const totalAmount = Number(b.amount || 0)
        const paidAmount = Number(b.paid_amount ?? 0)
        const pendingAmount = Number(b.pending_amount ?? Math.max(0, totalAmount - paidAmount))
        const isFullyPaid = (b.payment_status === 'paid') || paidAmount >= totalAmount

        if (paidAmount > 0) {
          if (mode === 'split') {
            const [onAmt, offAmt] = distributeSplitAmounts(Number(b.online_amount || 0), Number(b.offline_amount || 0), paidAmount)
            onlineRevenue += onAmt
            offlineRevenue += offAmt
          } else if (mode === 'online' || isOnlineBooking) {
            onlineRevenue += paidAmount
          } else {
            offlineRevenue += paidAmount
          }
        }

        // Add-ons revenue should be counted proportionally from the paid portion
        if (paidAmount > 0 && Array.isArray(b.add_ons)) {
          const paidRatio = totalAmount > 0 ? Math.min(1, paidAmount / totalAmount) : 1
          b.add_ons.forEach((item) => {
            const qty = Number(item.qty || 0)
            const price = Number(item.price || 0)
            const amt = price * qty * paidRatio
            addOnsRevenue += amt
            bottleSalesQty += qty * paidRatio
            bottleSalesRevenue += price * qty * paidRatio
          })
        }
      })

      // Include standalone inventory counter sales (not linked to a booking).
      // Route each sale into onlineRevenue / offlineRevenue based on payment_mode
      // so the dashboard online/offline split is accurate for POS counter sales.
      if (invSales && Array.isArray(invSales)) {
        invSales.forEach((sale: any) => {
          if (!sale.booking_id) {
            const qty = Number(sale.qty_sold || 0)
            const amt = Number(sale.amount || 0)
            const mode = sale.payment_mode || 'offline'
            addOnsRevenue += amt
            bottleSalesQty += qty
            bottleSalesRevenue += amt

            if (mode === 'split') {
              onlineRevenue += Number(sale.online_amount || 0)
              offlineRevenue += Number(sale.offline_amount || 0)
            } else if (mode === 'online') {
              onlineRevenue += amt
            } else {
              // 'offline' / cash / anything else
              offlineRevenue += amt
            }
          }
        })
      }

      const cashIn = onlineRevenue + offlineRevenue + moneySum((otherIncome || []) as MoneyRow[])
      const expensesTotal = moneySum((expenses || []) as MoneyRow[])
      const labourTotal = moneySum((labourPayments || []) as MoneyRow[])
      const liabilityTotal = moneySum((liabilityPayments || []) as MoneyRow[])
      const cashOut = expensesTotal + labourTotal + liabilityTotal

      const today = toDateKey(new Date())
      const todayBookings = normalizedBookings.filter((booking) => booking.booking_date === today)
      const periodBookings = normalizedBookings.filter(
        (booking) => booking.booking_date >= start && booking.booking_date <= end
      )
      const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const sortedTodayBookings = [...todayBookings].sort((a, b) => a.booking_time.localeCompare(b.booking_time))
      const currentBooking = [...sortedTodayBookings].reverse().find((booking) => booking.booking_time <= currentTimeStr) || null
      const nextBooking = sortedTodayBookings.find((booking) => booking.booking_time > currentTimeStr) || null
      const uniqueOccupiedSlots = new Set(todayBookings.map((booking) => `${booking.area}-${booking.booking_time}`)).size

      return {
        totalBookings: periodBookings.length,
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

  // Supabase realtime subscription: invalidate and refetch relevant queries on bookings changes
  useEffect(() => {
    if (!user) return
    try {
      const channel = supabase
        .channel('public:bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          invalidateBusinessQueries(queryClient)
        })
        .subscribe()

      return () => {
        try {
          // unsubscribe channel
          // @ts-ignore - supabase types for channel unsubscribe
          channel.unsubscribe()
        } catch (e) {
          // best-effort cleanup
        }
      }
    } catch (e) {
      // ignore realtime setup failures
      return
    }
  }, [user?.id, queryClient])

  return query
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
          const [{ data: bookingsByDate }, { data: bookingsByReceiptDate }, { data: expenses }, { data: labourPayments }, { data: liabilityPayments }, { data: otherIncome }, { data: invSales }] = await Promise.all([
            supabase.from('bookings').select('id, customer_name, mobile_number, area, booking_time, start_time, end_time, amount, paid_amount, pending_amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source, payment_received_date, booking_date, add_ons, user_id, created_at, updated_at').eq('booking_date', dateKey),
            supabase.from('bookings').select('id, customer_name, mobile_number, area, booking_time, start_time, end_time, amount, paid_amount, pending_amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source, payment_received_date, booking_date, add_ons, user_id, created_at, updated_at').eq('payment_received_date', dateKey),
            supabase.from('expenses').select('amount').eq('date', dateKey),
            supabase.from('labour_payments').select('amount').eq('date', dateKey),
            supabase.from('liability_payments').select('amount').eq('date', dateKey),
            supabase.from('other_income').select('amount').eq('date', dateKey),
            supabase.from('inventory_sales').select('amount, booking_id').eq('date', dateKey),
          ])

          const mergedMap = new Map<string, Booking>()
          ;(bookingsByDate || []).forEach((booking: any) => {
            const bookingId = booking?.id as string | undefined
            if (!bookingId) return
            mergedMap.set(bookingId, { ...(mergedMap.get(bookingId) || {}), ...booking })
          })
          ;(bookingsByReceiptDate || []).forEach((booking: any) => {
            const bookingId = booking?.id as string | undefined
            if (!bookingId) return
            mergedMap.set(bookingId, { ...(mergedMap.get(bookingId) || {}), ...booking })
          })

          const bookingsList = Array.from(mergedMap.values()) as Booking[]
          let revenue = 0
          bookingsList.forEach((b) => {
            const receiptDate = (b.payment_received_date || b.booking_date || '').toString()
            if (receiptDate !== dateKey) return
            const total = Number(b.amount || 0)
            const paidAmt = Number((b as any).paid_amount ?? 0)
            if (paidAmt <= 0) return
            const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
            const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
            if (mode === 'split') {
              const [onAmt, offAmt] = distributeSplitAmounts(Number((b as any).online_amount || 0), Number((b as any).offline_amount || 0), paidAmt)
              revenue += onAmt + offAmt
            } else {
              revenue += paidAmt
            }
          })

          // Include standalone inventory counter sales (not linked to a booking) — matches dashboard logic
          if (invSales && Array.isArray(invSales)) {
            invSales.forEach((sale: any) => {
              if (!sale.booking_id) {
                revenue += Number(sale.amount || 0)
              }
            })
          }

          // Include other income — matches dashboard logic
          revenue += moneySum((otherIncome || []) as MoneyRow[])

          const exp = moneySum((expenses || []) as MoneyRow[]) + moneySum((labourPayments || []) as MoneyRow[]) + moneySum((liabilityPayments || []) as MoneyRow[])

          return {
            date: dateKey,
            revenue,
            expenses: exp,
            profit: revenue - exp,
            totalBookings: bookingsList.filter((b) => b.booking_date === dateKey).length,
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

          const [{ data: bookingsByDate }, { data: bookingsByReceiptDate }, { data: expenses }, { data: labourPayments }, { data: liabilityPayments }, { data: otherIncome }, { data: invSales }] = await Promise.all([
            supabase.from('bookings').select('id, customer_name, mobile_number, area, booking_time, start_time, end_time, amount, paid_amount, pending_amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source, payment_received_date, booking_date, add_ons, user_id, created_at, updated_at').gte('booking_date', start).lte('booking_date', end),
            supabase.from('bookings').select('id, customer_name, mobile_number, area, booking_time, start_time, end_time, amount, paid_amount, pending_amount, payment_status, payment_mode, online_amount, offline_amount, transaction_id, source, payment_received_date, booking_date, add_ons, user_id, created_at, updated_at').gte('payment_received_date', start).lte('payment_received_date', end),
            supabase.from('expenses').select('amount').gte('date', start).lte('date', end),
            supabase.from('labour_payments').select('amount').gte('date', start).lte('date', end),
            supabase.from('liability_payments').select('amount').gte('date', start).lte('date', end),
            supabase.from('other_income').select('amount').gte('date', start).lte('date', end),
            supabase.from('inventory_sales').select('amount, booking_id').gte('date', start).lte('date', end),
          ])

          const mergedMap = new Map<string, Booking>()
          ;(bookingsByDate || []).forEach((booking: any) => {
            const bookingId = booking?.id as string | undefined
            if (!bookingId) return
            mergedMap.set(bookingId, { ...(mergedMap.get(bookingId) || {}), ...booking })
          })
          ;(bookingsByReceiptDate || []).forEach((booking: any) => {
            const bookingId = booking?.id as string | undefined
            if (!bookingId) return
            mergedMap.set(bookingId, { ...(mergedMap.get(bookingId) || {}), ...booking })
          })

          const bookingsList = Array.from(mergedMap.values()) as Booking[]
          let bookingRev = 0
          bookingsList.forEach((b) => {
            const receiptDate = (b.payment_received_date || b.booking_date || '').toString()
            if (!receiptDate || receiptDate < start || receiptDate > end) return
            const total = Number(b.amount || 0)
            const paidAmt = Number((b as any).paid_amount ?? 0)
            if (paidAmt <= 0) return
            const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
            const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
            if (mode === 'split') {
              const [onAmt, offAmt] = distributeSplitAmounts(Number((b as any).online_amount || 0), Number((b as any).offline_amount || 0), paidAmt)
              bookingRev += onAmt + offAmt
            } else {
              bookingRev += paidAmt
            }
          })

          let invRev = 0
          if (invSales && Array.isArray(invSales)) {
            invSales.forEach((sale: any) => {
              if (!sale.booking_id) {
                invRev += Number(sale.amount || 0)
              }
            })
          }

          const revenue = bookingRev + invRev + moneySum((otherIncome || []) as MoneyRow[])
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

export function invalidateBusinessQueries(queryClient: ReturnType<typeof useQueryClient>) {
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

export function useCreateBooking() {
  const { user, rawUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (booking: BookingWrite) => {
      const authUser = user || (await supabase.auth.getUser()).data?.user
      if (!authUser) throw new Error('Not authenticated. Please log in again.')

      const actualAuthUid = rawUser?.id || authUser.id

      await ensureUserExists(authUser)

      const targetArea = booking.area || 'Turf Main Ground'
      const targetSport = booking.sport || 'Turf Sport'

      await assertSlotAvailable({
        userId: authUser.id,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        area: targetArea,
      })

      let targetUserId = authUser.id
      let payload = { ...booking, area: targetArea, sport: targetSport, user_id: targetUserId }

      // 1. First attempt with shared project user_id
      let { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select()
        .single()

      // 2. If RLS blocked shared owner user_id, retry with actual auth.uid() (actualAuthUid)
      if (error && (error.message?.includes('row-level security') || error.code === '42501')) {
        console.warn('RLS blocked shared user_id, retrying insert with auth.uid()', actualAuthUid)
        targetUserId = actualAuthUid
        payload.user_id = actualAuthUid
        const rlsRetry = await supabase.from('bookings').insert(payload).select().single()
        data = rlsRetry.data
        error = rlsRetry.error
      }

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
        const calcPaid = booking.paid_amount ?? (booking.payment_status === 'paid' ? totalAmt : 0)
        const calcPending = booking.pending_amount ?? (booking.payment_status === 'paid' ? 0 : totalAmt - calcPaid)

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
          paid_amount: calcPaid,
          pending_amount: calcPending,
          notes: booking.notes || null,
          user_id: targetUserId,
        }

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
              paid_amount: calcPaid,
              pending_amount: calcPending,
              user_id: targetUserId,
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

      void recalculateCustomer(targetUserId, booking.mobile_number)
      return data
    },
    onMutate: async (newBooking) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] })
      const tempId = `temp-${Date.now()}`
      const optimisticBooking: Booking = {
        id: tempId,
        created_at: new Date().toISOString(),
        customer_name: newBooking.customer_name,
        mobile_number: newBooking.mobile_number,
        area: newBooking.area || 'Turf Main Ground',
        booking_date: newBooking.booking_date,
        booking_time: newBooking.booking_time,
        sport: newBooking.sport || 'Turf Sport',
        amount: newBooking.amount,
        payment_status: newBooking.payment_status,
        payment_mode: newBooking.payment_mode || 'offline',
        paid_amount: newBooking.paid_amount ?? (newBooking.payment_status === 'paid' ? newBooking.amount : 0),
        pending_amount: newBooking.pending_amount ?? (newBooking.payment_status === 'paid' ? 0 : newBooking.amount),
        online_amount: newBooking.online_amount ?? 0,
        offline_amount: newBooking.offline_amount ?? 0,
        notes: newBooking.notes || null,
        add_ons: newBooking.add_ons || [],
        user_id: user?.id || '',
      } as Booking

      queryClient.setQueriesData<Booking[]>({ queryKey: ['bookings'] }, (old) => {
        if (!old) return [optimisticBooking]
        return [optimisticBooking, ...old]
      })
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

      if (updates.booking_date || updates.booking_time || updates.area) {
        let previous: Partial<Booking> = {}
        const cachedList = queryClient.getQueriesData<Booking[]>({ queryKey: ['bookings'] })
        for (const [_, list] of cachedList) {
          const found = list?.find((b) => b.id === id)
          if (found) {
            previous = found
            break
          }
        }

        const nextDate = updates.booking_date || previous.booking_date
        const nextTime = updates.booking_time || previous.booking_time
        const nextArea = updates.area || previous.area || 'Turf Main Ground'

        if (
          (updates.booking_date && updates.booking_date !== previous.booking_date) ||
          (updates.booking_time && updates.booking_time !== previous.booking_time) ||
          (updates.area && updates.area !== previous.area)
        ) {
          await assertSlotAvailable({ userId: authUser.id, bookingDate: nextDate, bookingTime: nextTime, area: nextArea, ignoreBookingId: id })
        }
      }

      let { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('uniq_bookings_user_date_time_area') ||
          error.message?.includes('unique constraint')
        ) {
          throw new Error(
            `Slot conflict: '${updates.booking_time}' on '${updates.area}' is already booked for ${updates.booking_date}. Please select an available slot.`
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
        if (updates.paid_amount !== undefined) standardUpdates.paid_amount = updates.paid_amount
        if (updates.pending_amount !== undefined) standardUpdates.pending_amount = updates.pending_amount
        if (updates.payment_received_date !== undefined) standardUpdates.payment_received_date = updates.payment_received_date
        if (!isSchemaErrorUpd) {
          if (updates.online_amount !== undefined) standardUpdates.online_amount = updates.online_amount
          if (updates.offline_amount !== undefined) standardUpdates.offline_amount = updates.offline_amount
        }
        if (updates.notes !== undefined) standardUpdates.notes = updates.notes

        const fallbackRes = await supabase
          .from('bookings')
          .update(standardUpdates)
          .eq('id', id)
          .select()
          .single()

        if (fallbackRes.error) {
          if (
            fallbackRes.error.code === '23505' ||
            fallbackRes.error.message?.includes('uniq_bookings_user_date_time_area') ||
            fallbackRes.error.message?.includes('unique constraint')
          ) {
            throw new Error(
              `Slot conflict: '${updates.booking_time}' on '${updates.area}' is already booked for ${updates.booking_date}. Please select an available slot.`
            )
          }
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
            if (updates.paid_amount !== undefined) minUpdates.paid_amount = updates.paid_amount
            if (updates.pending_amount !== undefined) minUpdates.pending_amount = updates.pending_amount
            if (updates.payment_received_date !== undefined) minUpdates.payment_received_date = updates.payment_received_date
            if (updates.notes !== undefined) minUpdates.notes = updates.notes
            const minRes = await supabase.from('bookings').update(minUpdates).eq('id', id).select().single()
            if (minRes.error) throw new Error(minRes.error.message || 'Database error updating booking')
            data = minRes.data
          } else {
            throw new Error(fallbackRes.error.message || 'Database error updating booking')
          }
        } else {
          data = fallbackRes.data
        }
      }

      if (updates.mobile_number) {
        void recalculateCustomer(authUser.id, updates.mobile_number)
      }
      return data
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] })
      await queryClient.cancelQueries({ queryKey: ['pending-payments'] })

      queryClient.setQueriesData<Booking[]>({ queryKey: ['bookings'] }, (old) => {
        if (!old) return old
        return old.map((b) => (b.id === updates.id ? { ...b, ...updates } : b))
      })

      queryClient.setQueriesData<Booking[]>({ queryKey: ['pending-payments'] }, (old) => {
        if (!old) return old
        if (updates.payment_status === 'paid' || (updates.pending_amount !== undefined && updates.pending_amount <= 0)) {
          return old.filter((b) => b.id !== updates.id)
        }
        return old.map((b) => (b.id === updates.id ? { ...b, ...updates } : b))
      })
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
        .single()
      if (fetchError) throw fetchError

      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) throw error

      const deleted = booking as { mobile_number: string }
      void recalculateCustomer(user.id, deleted.mobile_number)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] })
      await queryClient.cancelQueries({ queryKey: ['pending-payments'] })

      queryClient.setQueriesData<Booking[]>({ queryKey: ['bookings'] }, (old) => {
        if (!old) return old
        return old.filter((b) => b.id !== id)
      })
      queryClient.setQueriesData<Booking[]>({ queryKey: ['pending-payments'] }, (old) => {
        if (!old) return old
        return old.filter((b) => b.id !== id)
      })
    },
    onSuccess: () => invalidateBusinessQueries(queryClient),
  })
}
