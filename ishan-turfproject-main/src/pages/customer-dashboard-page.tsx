import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCustomerBookings } from '@/services/public-booking-service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, Download, RotateCcw } from 'lucide-react'

export function CustomerDashboardPage() {
  const { data: bookings = [], isLoading } = useCustomerBookings()
  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter((item) => item.booking_date >= today)
  const past = bookings.filter((item) => item.booking_date < today)

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><Badge className="mb-3 bg-[#00C853]/10 text-[#22E06F]">Customer Dashboard</Badge><h1 className="text-4xl font-black">My Bookings</h1></div>
          <Link to="/book"><Button className="rounded-full bg-[#00C853] text-black hover:bg-[#22E06F]"><RotateCcw className="mr-2 h-4 w-4" /> Book Again</Button></Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[['Upcoming Bookings', upcoming], ['Past Bookings', past]].map(([title, rows]) => (
            <Card key={title as string} className="rounded-[2rem] border-white/10 bg-[#111] text-white">
              <CardHeader><CardTitle>{title as string}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? <div className="h-24 animate-pulse rounded-3xl bg-white/10" /> : (rows as typeof bookings).length === 0 ? <p className="rounded-3xl border border-white/10 bg-white/[.04] p-6 text-sm text-zinc-400">No bookings found.</p> : (rows as typeof bookings).map((booking) => (
                  <div key={booking.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
                    <div className="flex items-start justify-between gap-4"><div><p className="font-bold">{booking.sport} • {booking.area}</p><p className="mt-1 text-sm text-zinc-400">{formatDate(booking.booking_date)} • {booking.booking_time}</p></div><Badge className={booking.payment_status === 'paid' ? 'bg-[#00C853]/15 text-[#22E06F]' : 'bg-orange-500/15 text-orange-300'}>{booking.payment_status}</Badge></div>
                    <div className="mt-4 flex items-center justify-between"><p className="font-black text-[#22E06F]">{formatCurrency(Number(booking.amount))}</p><Button size="sm" variant="outline" className="rounded-full border-white/15 bg-white/5 text-white"><Download className="mr-2 h-4 w-4" /> Invoice</Button></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><CalendarCheck className="h-4 w-4" /> Back to website</Link>
      </div>
    </main>
  )
}
