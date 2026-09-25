import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCustomers, useAreaStats, usePendingPayments } from '@/services/customers-service'
import { useUpdateBooking } from '@/services/dashboard-service'
import { useSyncBookingInventorySales } from '@/services/inventory-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import {
  Search,
  Users,
  Sun,
  Moon,
  Clock,
  MapPin,
  PhoneCall,
  BarChart3,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Calendar,
  Banknote,
  CheckCircle2,
  CreditCard,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'all' | 'am' | 'pm'>('all')
  const [sortBy, setSortBy] = useState<'visits' | 'am' | 'pm' | 'recent'>('visits')
  const [expandedPending, setExpandedPending] = useState<string | null>(null)

  // Payment modal state in Customers page
  const [payTarget, setPayTarget] = useState<{
    id: string
    customer_name: string
    booking_date: string
    booking_time: string
    amount: number
    paid_amount: number
    pending_amount: number
  } | null>(null)
  const [payAmountInput, setPayAmountInput] = useState<number>(0)

  const { data: customers = [], isLoading } = useCustomers()
  const { data: areaStats } = useAreaStats()
  const { data: pendingPayments = [] } = usePendingPayments()
  const updateBooking = useUpdateBooking()
  const syncInventorySales = useSyncBookingInventorySales()

  const handleOpenPayTarget = (b: {
    id: string
    customer_name: string
    booking_date: string
    booking_time: string
    amount: number
    paid_amount: number
    pending_amount: number
  }) => {
    setPayTarget(b)
    setPayAmountInput(b.paid_amount > 0 ? b.paid_amount : b.amount)
  }

  const handleSavePayTarget = async () => {
    if (!payTarget) return
    try {
      const target = payTarget
      setPayTarget(null)
      const totalAmt = target.amount
      const enteredPaid = Math.max(0, Math.min(totalAmt, Number(payAmountInput || 0)))
      const pendingAmt = Math.max(0, totalAmt - enteredPaid)
      const newStatus: 'paid' | 'pending' = pendingAmt <= 0 ? 'paid' : 'pending'

      await updateBooking.mutateAsync({
        id: target.id,
        payment_status: newStatus,
        paid_amount: enteredPaid,
        pending_amount: pendingAmt,
      })

      await syncInventorySales.mutateAsync({
        bookingId: target.id,
        date: target.booking_date,
        isPaid: newStatus === 'paid' || enteredPaid > 0,
        addOns: [],
      })
    } catch (e) {
      console.warn('Failed to update payment from customers page', e)
    }
  }

  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.area.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (timeFilter === 'am') return c.am_bookings > 0 || c.preference === 'AM'
      if (timeFilter === 'pm') return c.pm_bookings > 0 || c.preference === 'PM'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'am') return b.am_bookings - a.am_bookings
      if (sortBy === 'pm') return b.pm_bookings - a.pm_bookings
      if (sortBy === 'visits') return b.total_bookings - a.total_bookings
      if (sortBy === 'recent') {
        const aDate = a.last_booking_date ? new Date(a.last_booking_date).getTime() : 0
        const bDate = b.last_booking_date ? new Date(b.last_booking_date).getTime() : 0
        return bDate - aDate
      }
      return 0
    })

  const totalCustomers = customers.length
  const amPreferCount = customers.filter((c) => c.preference === 'AM').length
  const pmPreferCount = customers.filter((c) => c.preference === 'PM').length
  const totalAmBookings = customers.reduce((sum, c) => sum + c.am_bookings, 0)
  const totalPmBookings = customers.reduce((sum, c) => sum + c.pm_bookings, 0)

  const totalPendingAmount = pendingPayments.reduce((sum, c) => sum + c.pendingAmount, 0)
  const totalPendingCount = pendingPayments.reduce((sum, c) => sum + c.pendingCount, 0)

  const timeDistribution = [
    { name: 'Morning (AM)', value: totalAmBookings, color: '#F59E0B' },
    { name: 'Evening (PM)', value: totalPmBookings, color: '#6366F1' },
  ]

  const AREA_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (isLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm">Customer database & AM/PM slot preference analytics</p>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Customers</p>
                <p className="text-2xl font-bold text-white">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-amber-900/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Morning (AM) Bookers</p>
                <p className="text-2xl font-bold text-amber-400">{amPreferCount}</p>
                <p className="text-[10px] text-slate-500">{totalAmBookings} AM slot(s) booked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-indigo-900/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Evening (PM) Bookers</p>
                <p className="text-2xl font-bold text-indigo-400">{pmPreferCount}</p>
                <p className="text-[10px] text-slate-500">{totalPmBookings} PM slot(s) booked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending payments stat card */}
        <Card className="bg-slate-900/80 border-red-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Pending Payments</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalPendingAmount)}</p>
                <p className="text-[10px] text-slate-500">{pendingPayments.length} customer(s) · {totalPendingCount} booking(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Pending Payments Section ─── */}
      {pendingPayments.length > 0 && (
        <Card className="bg-slate-900/80 border-red-800/50">
          <CardHeader className="pb-3 border-b border-red-900/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Pending Payments
                <Badge className="bg-red-500/20 text-red-300 border-red-700/50 text-xs">{pendingPayments.length} customers</Badge>
              </CardTitle>
              <p className="text-xs text-slate-400">Total outstanding: <span className="font-bold text-red-400">{formatCurrency(totalPendingAmount)}</span></p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {pendingPayments.map((pc, index) => {
                const isExpanded = expandedPending === pc.phone
                return (
                  <motion.div
                    key={pc.phone}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  >
                    <Card className="bg-red-950/20 border-red-800/40 hover:border-red-700/60 transition-colors">
                      <CardContent className="p-4">
                        <button
                          className="w-full text-left"
                          onClick={() => setExpandedPending(isExpanded ? null : pc.phone)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/60 border border-red-700 text-red-300 font-bold shrink-0 text-sm">
                                {getInitials(pc.name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white text-base">{pc.name}</p>
                                  <Badge className="bg-red-500/20 text-red-300 border-red-700/50 text-[11px] px-2 py-0.5">
                                    {pc.pendingCount} pending
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{pc.phone}</span>
                                  {pc.area && <span>• {pc.area}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-400 flex items-center gap-1">
                                  <IndianRupee className="w-3.5 h-3.5" />
                                  {pc.pendingAmount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] text-slate-500">outstanding</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${pc.phone}`}
                                  title={`Call ${pc.name}`}
                                  className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhoneCall className="h-4 w-4" />
                                </a>
                                <div className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Expandable booking details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-red-800/40 space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pending Bookings Breakdown</p>
                                {pc.bookings.map((b) => (
                                  <div
                                    key={b.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 shrink-0">
                                        <Calendar className="w-4 h-4 text-emerald-400" />
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-white">{formatDate(b.booking_date)}</p>
                                        <p className="text-[10px] text-slate-400">{b.booking_time} · {b.area} · {b.sport}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                      <div className="text-right text-xs">
                                        <span className="text-slate-400 text-[10px] block">Bill: ₹{b.amount} | Paid: ₹{b.paid_amount}</span>
                                        <span className="text-red-400 font-bold text-xs flex items-center justify-end gap-0.5">
                                          Pending: ₹{b.pending_amount}
                                        </span>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleOpenPayTarget({ ...b, customer_name: pc.name })
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] h-7 px-3 font-semibold"
                                      >
                                        Collect Payment
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Main: Customer Database + Charts ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-slate-900/80 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base text-white">Customer Database</CardTitle>
                <Badge variant="secondary" className="text-xs">{filteredCustomers.length}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'all' | 'am' | 'pm')}>
                  <TabsList className="bg-slate-950 text-xs">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="am" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                      <Sun className="w-3 h-3 mr-1" /> AM
                    </TabsTrigger>
                    <TabsTrigger value="pm" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                      <Moon className="w-3 h-3 mr-1" /> PM
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'visits' | 'am' | 'pm' | 'recent')}>
                  <TabsList className="bg-slate-950 text-xs hidden sm:flex">
                    <TabsTrigger value="visits">Visits</TabsTrigger>
                    <TabsTrigger value="am">Most AM</TabsTrigger>
                    <TabsTrigger value="pm">Most PM</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by customer name, phone, or ground area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white text-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {filteredCustomers.length === 0 ? (
              <EmptyState icon={Users} title="No matching customers" description="No customer records match your filter criteria." />
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer, index) => {
                  const hasPending = pendingPayments.some((p) => p.phone === customer.phone)
                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    >
                      <Card className={`bg-slate-950/60 border-slate-800 hover:border-slate-700 transition-colors ${hasPending ? 'border-l-2 border-l-red-500' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold shrink-0">
                                {getInitials(customer.name)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-white text-base">{customer.name}</p>
                                  {customer.preference === 'AM' && (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-700/50 text-[11px] gap-1 px-2 py-0.5">
                                      <Sun className="w-3 h-3" /> AM Prefer
                                    </Badge>
                                  )}
                                  {customer.preference === 'PM' && (
                                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-700/50 text-[11px] gap-1 px-2 py-0.5">
                                      <Moon className="w-3 h-3" /> PM Prefer
                                    </Badge>
                                  )}
                                  {customer.preference === 'Both' && (
                                    <Badge variant="outline" className="text-slate-400 border-slate-700 text-[11px] gap-1 px-2 py-0.5">
                                      <Clock className="w-3 h-3" /> Mixed Slots
                                    </Badge>
                                  )}
                                  {hasPending && (
                                    <Badge className="bg-red-500/20 text-red-300 border-red-700/50 text-[11px] gap-1 px-2 py-0.5">
                                      <AlertCircle className="w-3 h-3" /> Pending
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{customer.phone}</span>
                                  {customer.area && <span>• {customer.area}</span>}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <p className="text-sm font-bold text-white">{customer.total_bookings} total bookings</p>
                                <p className="text-xs text-slate-400 font-medium">
                                  <span className="text-amber-400 font-semibold">{customer.am_bookings} AM</span> /{' '}
                                  <span className="text-indigo-400 font-semibold">{customer.pm_bookings} PM</span>
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                                asChild
                              >
                                <a href={`tel:${customer.phone}`} title={`Call ${customer.name}`}>
                                  <PhoneCall className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Slot Time Ratio (AM vs PM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={38}
                      paddingAngle={4}
                    >
                      {timeDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-900/40">
                  <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <p className="text-slate-400">Morning (AM)</p>
                    <p className="font-bold text-amber-400">{totalAmBookings} slots</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                  <div className="h-3 w-3 rounded-full bg-indigo-500 shrink-0" />
                  <div>
                    <p className="text-slate-400">Evening (PM)</p>
                    <p className="font-bold text-indigo-400">{totalPmBookings} slots</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> Area Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={areaStats?.slice(0, 6) || []}
                      dataKey="bookings"
                      nameKey="area"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={38}
                      paddingAngle={2}
                    >
                      {(areaStats?.slice(0, 6) || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={AREA_COLORS[index % AREA_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3 pt-2 border-t border-slate-800">
                {(areaStats?.slice(0, 4) || []).map((stat, index) => (
                  <div key={stat.area} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: AREA_COLORS[index % AREA_COLORS.length] }}
                      />
                      <span className="text-slate-300">{stat.area}</span>
                    </div>
                    <span className="font-bold text-white">{stat.bookings}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Collect / Clear Payment Dialog */}
      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800 max-w-md touch-smooth gpu-fast">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" /> Collect Payment — {payTarget?.customer_name}
            </DialogTitle>
          </DialogHeader>

          {payTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Booking Date & Slot:</span>
                  <span className="font-medium text-white">{payTarget.booking_date} ({payTarget.booking_time})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Bill Amount:</span>
                  <span className="font-bold text-white">₹{payTarget.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Previously Paid:</span>
                  <span className="font-semibold text-emerald-400">₹{payTarget.paid_amount}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-slate-300 font-medium">Currently Outstanding:</span>
                  <span className="font-bold text-red-400 text-sm">₹{payTarget.pending_amount}</span>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-xs mb-1 block">
                  New Total Amount Paid Received (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={payTarget.amount}
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(Number(e.target.value))}
                  className="bg-slate-950/70 border-slate-700 text-white text-sm"
                />
                <div className="flex justify-between items-center text-xs mt-2 p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span>
                    New Pending Balance:{' '}
                    <strong className={payTarget.amount - payAmountInput > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      ₹{Math.max(0, payTarget.amount - payAmountInput)}
                    </strong>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPayAmountInput(payTarget.amount)}
                    className="text-[11px] h-7 border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40"
                  >
                    Settle Full (₹{payTarget.amount})
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button variant="outline" onClick={() => setPayTarget(null)} className="border-slate-700 text-slate-300 text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePayTarget}
                  disabled={updateBooking.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {updateBooking.isPending ? 'Updating...' : 'Save & Clear Balance'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
