import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Booking, Slot } from '@/types/database'

export type PublicSport = 'Football' | 'Cricket' | 'Volleyball' | 'Badminton' | '8 Ball Pool'

export interface PublicAvailabilityRow {
  booking_time: string
  area: string
  sport: string
  payment_status: 'paid' | 'pending'
}

export interface PublicBookingInput {
  customer_name: string
  mobile_number: string
  email: string
  area: string
  booking_date: string
  booking_time: string
  sport: PublicSport
  duration_minutes: number
  amount: number
  transaction_id: string
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: 'INR'
  name: string
  description: string
  prefill: { name: string; email: string; contact: string }
  theme: { color: string }
  handler: (response: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): { open: () => void }
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

export const sports: Array<{ name: PublicSport; price: number; duration: string; image: string; description: string }> = [
  { name: 'Football', price: 2200, duration: '60 min', image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80', description: 'Premium grass, flood lights and full-sized evening football slots.' },
  { name: 'Cricket', price: 2500, duration: '60 min', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80', description: 'Fast outfield, nets-ready setup and team-friendly cricket slots.' },
  { name: 'Volleyball', price: 1600, duration: '60 min', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80', description: 'Bright court setup for practice, tournaments and weekend games.' },
  { name: 'Badminton', price: 1200, duration: '60 min', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80', description: 'Clean, quick-book court slots for casual and coaching sessions.' },
  { name: '8 Ball Pool', price: 700, duration: '60 min', image: 'https://images.unsplash.com/photo-1620741212082-19f9a3cc903e?auto=format&fit=crop&w=1200&q=80', description: 'Premium indoor 8 ball pool table for friends and league nights.' },
]

export const customerAreas = ['Turf Arena', '8 Ball Pool Lounge']

export const defaultSlots: Slot[] = [
  '12:00 AM - 01:00 AM', '01:00 AM - 02:00 AM', '02:00 AM - 03:00 AM', '03:00 AM - 04:00 AM',
  '04:00 AM - 05:00 AM', '05:00 AM - 06:00 AM', '06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM',
].map((time, index) => ({
  id: `default-${index}`,
  time,
  duration_minutes: 60,
  price: index < 6 ? 1200 : index < 18 ? 1800 : 2200,
  is_active: true,
  user_id: 'public',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))

export function usePublicSlots() {
  return useQuery({
    queryKey: ['public-slots'],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase.rpc('get_public_slots')
      if (error) return defaultSlots
      const rows = (data || []) as Slot[]
      return rows.length > 0 ? rows : defaultSlots
    },
  })
}

export function usePublicAvailability(date: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!date) return undefined
    const channel = supabase
      .channel(`public-availability-${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['public-availability', date] })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [date, queryClient])

  return useQuery({
    queryKey: ['public-availability', date],
    queryFn: async (): Promise<PublicAvailabilityRow[]> => {
      const { data, error } = await supabase.rpc('get_public_availability', { p_date: date })
      if (error) throw error
      return (data || []) as PublicAvailabilityRow[]
    },
    enabled: Boolean(date),
    refetchInterval: 15000,
  })
}

export function useCustomerBookings() {
  return useQuery({
    queryKey: ['customer-bookings'],
    queryFn: async (): Promise<Booking[]> => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user?.email) return []
      const { data, error } = await supabase.rpc('get_customer_bookings_by_email', { p_email: user.email })
      if (error) throw error
      return (data || []) as Booking[]
    },
  })
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout. Check your internet connection.'))
    document.body.appendChild(script)
  })
}

export async function openRazorpayPayment(input: PublicBookingInput): Promise<RazorpayResponse> {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
  if (!key) throw new Error('Missing VITE_RAZORPAY_KEY_ID. Add your Razorpay test/live key in environment variables.')
  await loadRazorpayScript()
  if (!window.Razorpay) throw new Error('Razorpay checkout did not load')

  return new Promise((resolve, reject) => {
    const RazorpayCheckout = window.Razorpay
    if (!RazorpayCheckout) {
      reject(new Error('Razorpay checkout did not load'))
      return
    }
    const checkout = new RazorpayCheckout({
      key,
      amount: Math.round(input.amount * 100),
      currency: 'INR',
      name: 'Elite Turf Arena',
      description: `${input.sport} • ${input.booking_time}`,
      prefill: { name: input.customer_name, email: input.email, contact: input.mobile_number },
      theme: { color: '#00C853' },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    checkout.open()
  })
}

export function useCreatePublicBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PublicBookingInput) => {
      const { data, error } = await supabase.rpc('create_public_paid_booking', {
        p_customer_name: input.customer_name,
        p_mobile_number: input.mobile_number,
        p_email: input.email,
        p_area: input.area,
        p_booking_date: input.booking_date,
        p_booking_time: input.booking_time,
        p_sport: input.sport,
        p_duration_minutes: input.duration_minutes,
        p_amount: input.amount,
        p_transaction_id: input.transaction_id,
      })
      if (error) throw error
      return data
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: ['public-availability', input.booking_date] })
      await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] })
      await queryClient.invalidateQueries({ queryKey: ['bookings'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      await queryClient.invalidateQueries({ queryKey: ['today-bookings'] })
    },
  })
}
