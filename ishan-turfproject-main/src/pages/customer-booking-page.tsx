import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import { customerAreas, openRazorpayPayment, sports, useCreatePublicBooking, usePublicAvailability, usePublicSlots, type PublicSport } from '@/services/public-booking-service'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Lock, Phone, ShieldCheck, Sparkles, Trophy, User } from 'lucide-react'

const schema = z.object({
  customer_name: z.string().min(2, 'Enter full name'),
  mobile_number: z.string().min(10, 'Enter valid mobile number'),
  email: z.string().email('Enter valid email'),
})

type CustomerForm = z.infer<typeof schema>

const todayKey = new Date().toISOString().split('T')[0]

export function CustomerBookingPage() {
  const [sport, setSport] = useState<PublicSport>('Football')
  const [date, setDate] = useState(todayKey)
  const [area, setArea] = useState('Turf Arena')
  const [slot, setSlot] = useState('')
  const [duration, setDuration] = useState(60)
  const [successId, setSuccessId] = useState<string | null>(null)

  const { data: slots = [], isLoading: slotsLoading } = usePublicSlots()
  const { data: busy = [], isLoading: availabilityLoading } = usePublicAvailability(date)
  const createBooking = useCreatePublicBooking()
  const { toast } = useToast()

  const form = useForm<CustomerForm>({ resolver: zodResolver(schema), defaultValues: { customer_name: '', mobile_number: '', email: '' } })
  const selectedSport = sports.find((entry) => entry.name === sport) || sports[0]
  const basePrice = selectedSport.price
  const durationMultiplier = duration / 60
  const subtotal = Math.round(basePrice * durationMultiplier)
  const gst = Math.round(subtotal * 0.18)
  const grandTotal = subtotal + gst

  const availableSlots = useMemo(() => {
    return slots.filter((item) => item.is_active).map((item) => {
      const isBooked = busy.some((booking) => booking.booking_time === item.time && booking.area === area)
      return { ...item, isBooked }
    })
  }, [slots, busy, area])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!slot) {
      toast({ variant: 'destructive', title: 'Select a slot', description: 'Choose one available time slot before payment.' })
      return
    }
    const bookingInput = {
      ...values,
      area,
      booking_date: date,
      booking_time: slot,
      sport,
      duration_minutes: duration,
      amount: grandTotal,
      transaction_id: '',
    }
    try {
      const payment = await openRazorpayPayment(bookingInput)
      const bookingId = await createBooking.mutateAsync({ ...bookingInput, transaction_id: payment.razorpay_payment_id })
      setSuccessId(typeof bookingId === 'string' ? bookingId : payment.razorpay_payment_id)
      toast({ title: 'Booking confirmed', description: 'Payment successful. The owner dashboard is now updated.' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Booking failed', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  })

  if (successId) {
    return (
      <main className="min-h-screen bg-[#090909] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl pt-16">
          <Card className="rounded-[2rem] border-white/10 bg-[#111] text-center text-white shadow-2xl">
            <CardContent className="p-8 sm:p-12">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#00C853]/15"><CheckCircle2 className="h-10 w-10 text-[#22E06F]" /></div>
              <h1 className="mt-7 text-4xl font-black">Booking Success</h1>
              <p className="mt-3 text-zinc-400">Your slot is confirmed and has been pushed to the owner dashboard instantly.</p>
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.05] p-5 text-left">
                <p className="text-sm text-zinc-400">Booking ID / Transaction</p>
                <p className="mt-1 break-all font-mono text-sm text-[#22E06F]">{successId}</p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link to="/"><Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white">Back Home</Button></Link>
                <Button onClick={() => { setSuccessId(null); setSlot('') }} className="rounded-full bg-[#00C853] text-black hover:bg-[#22E06F]">Book Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,83,.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,224,111,.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
          <Link to="/admin/dashboard" className="text-sm text-[#22E06F]">Owner Panel</Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <Badge className="mb-4 rounded-full bg-[#00C853]/10 px-4 py-1 text-[#22E06F]">Realtime Booking</Badge>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Book your premium slot</h1>
              <p className="mt-4 max-w-2xl text-zinc-400">Choose Turf or 8 Ball Pool, pick a live available slot, pay via Razorpay and your booking appears inside the owner panel immediately.</p>
            </div>

            <Card className="rounded-[2rem] border-white/10 bg-[#111]/90 text-white backdrop-blur-xl">
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="text-[#00C853]" /> Choose sport</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sports.map((item) => (
                  <button key={item.name} onClick={() => { setSport(item.name); setArea(item.name === '8 Ball Pool' ? '8 Ball Pool Lounge' : 'Turf Arena') }} className={cn('overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1', sport === item.name ? 'border-[#00C853] bg-[#00C853]/10 shadow-[0_0_30px_rgba(0,200,83,.18)]' : 'border-white/10 bg-white/[.04] hover:border-white/20')}>
                    <img src={item.image} alt={item.name} className="h-36 w-full object-cover" />
                    <div className="p-4"><p className="font-bold">{item.name}</p><p className="mt-1 text-sm text-[#22E06F]">{formatCurrency(item.price)} / hour</p></div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-white/10 bg-[#111]/90 text-white backdrop-blur-xl">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="text-[#00C853]" /> Date, area and slot</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2"><Label>Date</Label><Input type="date" min={todayKey} value={date} onChange={(event) => { setDate(event.target.value); setSlot('') }} className="border-white/10 bg-white/[.04] text-white" /></div>
                  <div className="space-y-2"><Label>Ground / Area</Label><Select value={area} onValueChange={(value) => { setArea(value); setSlot('') }}><SelectTrigger className="border-white/10 bg-white/[.04]"><SelectValue /></SelectTrigger><SelectContent>{customerAreas.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Duration</Label><Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}><SelectTrigger className="border-white/10 bg-white/[.04]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">1 Hour</SelectItem><SelectItem value="120">2 Hours</SelectItem><SelectItem value="180">3 Hours</SelectItem></SelectContent></Select></div>
                </div>

                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#00C853]" /> Available</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-500" /> Booked</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-zinc-600" /> Unavailable</span></div>
                  {slotsLoading || availabilityLoading ? <div className="grid gap-3 sm:grid-cols-3"><div className="h-14 animate-pulse rounded-2xl bg-white/10" /><div className="h-14 animate-pulse rounded-2xl bg-white/10" /><div className="h-14 animate-pulse rounded-2xl bg-white/10" /></div> : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availableSlots.map((item) => (
                        <button key={item.id} disabled={item.isBooked} onClick={() => setSlot(item.time)} className={cn('rounded-2xl border px-4 py-4 text-sm font-semibold transition', item.isBooked ? 'cursor-not-allowed border-red-500/30 bg-red-500/10 text-red-200' : slot === item.time ? 'border-[#00C853] bg-[#00C853] text-black' : 'border-white/10 bg-white/[.04] text-white hover:border-[#00C853]/70 hover:bg-[#00C853]/10')}>
                          <Clock className="mx-auto mb-2 h-4 w-4" />{item.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <Card className="rounded-[2rem] border-white/10 bg-[#111]/95 text-white shadow-2xl backdrop-blur-xl">
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="text-[#00C853]" /> Booking Summary</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4">
                    <div className="space-y-2"><Label className="flex gap-2"><User className="h-4 w-4" /> Name</Label><Input {...form.register('customer_name')} className="border-white/10 bg-white/[.04]" placeholder="Your full name" /><p className="text-xs text-red-300">{form.formState.errors.customer_name?.message}</p></div>
                    <div className="space-y-2"><Label className="flex gap-2"><Phone className="h-4 w-4" /> Mobile</Label><Input {...form.register('mobile_number')} className="border-white/10 bg-white/[.04]" placeholder="9876543210" /><p className="text-xs text-red-300">{form.formState.errors.mobile_number?.message}</p></div>
                    <div className="space-y-2"><Label>Email</Label><Input {...form.register('email')} className="border-white/10 bg-white/[.04]" placeholder="you@email.com" /><p className="text-xs text-red-300">{form.formState.errors.email?.message}</p></div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[.04] p-5 space-y-3 text-sm">
                    {[['Sport', sport], ['Date', date], ['Area', area], ['Time', slot || 'Select slot'], ['Duration', `${duration / 60} hour${duration > 60 ? 's' : ''}`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="text-zinc-400">{label}</span><span className="text-right font-medium">{value}</span></div>)}
                    <div className="border-t border-white/10 pt-3" />
                    <div className="flex justify-between"><span className="text-zinc-400">Price</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">GST 18%</span><span>{formatCurrency(gst)}</span></div>
                    <div className="flex justify-between text-lg font-black"><span>Total</span><span className="text-[#22E06F]">{formatCurrency(grandTotal)}</span></div>
                  </div>

                  <Button disabled={createBooking.isPending} className="h-14 w-full rounded-full bg-[#00C853] text-base font-black text-black hover:bg-[#22E06F]">
                    {createBooking.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />} Pay & Confirm
                  </Button>
                  <p className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500"><ShieldCheck className="h-4 w-4 text-[#00C853]" /> Secure Razorpay checkout. Booking syncs with admin panel.</p>
                </form>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  )
}
