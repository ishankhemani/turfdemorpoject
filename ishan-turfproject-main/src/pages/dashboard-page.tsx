import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts'
import { useDashboardStats, useMonthlyData, useTodayBookings } from '@/services/dashboard-service'
import { StatCard } from '@/components/common/stat-card'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  IndianRupee,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatCurrency, formatTime, formatSlotRange } from '@/lib/utils'
import { cn } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<'day' | 'month' | 'year'>('month')
  const { data: stats, isLoading: statsLoading } = useDashboardStats(dateFilter)
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData()
  const { data: todayBookings, isLoading: bookingsLoading } = useTodayBookings()

  if (statsLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Overview of your turf business
          </p>
        </div>
        <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as 'day' | 'month' | 'year')}>
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <StatCard
            title="Total Bookings"
            value={stats?.totalBookings || 0}
            icon={CalendarDays}
            description={`${stats?.todayBookings || 0} today`}
            delay={0}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Cash In"
            value={formatCurrency(stats?.cashIn || 0)}
            icon={TrendingUp}
            iconClassName="bg-success/10 text-success"
            delay={1}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Cash Out"
            value={formatCurrency(stats?.cashOut || 0)}
            icon={TrendingDown}
            iconClassName="bg-destructive/10 text-destructive"
            delay={2}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Profit"
            value={formatCurrency(stats?.profit || 0)}
            icon={IndianRupee}
            iconClassName={cn(
              (stats?.profit || 0) >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
            delay={3}
          />
        </motion.div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Revenue Overview</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Revenue
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  Profit
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  Expenses
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <LoadingState type="chart" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                      }}
                      formatter={(value) => [formatCurrency(value as number), '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--success))"
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Slot Status</CardTitle>
              <p className="text-sm text-muted-foreground">Today's availability</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="12"
                      strokeDasharray={`${
                        ((stats?.busySlots || 0) / (stats?.totalSlots || 1)) * 440
                      } 440`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{stats?.busySlots || 0}</span>
                    <span className="text-xs text-muted-foreground">of {stats?.totalSlots || 0} booked</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-success/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Available</span>
                  </div>
                  <span className="text-sm font-bold text-success">{stats?.availableSlots || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Booked</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{stats?.busySlots || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Today's Bookings</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <LoadingState type="list" count={4} />
              ) : todayBookings && todayBookings.length > 0 ? (
                <div className="space-y-3">
                  {todayBookings.slice(0, 5).map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-xl transition-colors',
                        booking.id === stats?.currentBooking?.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium',
                          booking.payment_status === 'paid'
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        )}
                      >
                        {formatSlotRange(booking.booking_time).split(' ')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{booking.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.sport} - {booking.area}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={booking.payment_status === 'paid' ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {booking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                        <span className="text-sm font-medium">{formatCurrency(booking.amount)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No bookings today"
                  description="Create a new booking to get started"
                  action={{
                    label: 'Create Booking',
                    onClick: () => {},
                  }}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Current & Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div
                  className={cn(
                    'p-4 rounded-xl border-2',
                    stats?.currentBooking
                      ? 'border-primary bg-primary/5'
                      : 'border-dashed border-muted'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Current Booking
                    </span>
                    {stats?.currentBooking && (
                      <Badge variant="default" className="text-[10px]">Live</Badge>
                    )}
                  </div>
                  {stats?.currentBooking ? (
                    <div>
                      <p className="font-medium">{(stats.currentBooking as { customer_name: string }).customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(stats.currentBooking as { sport: string }).sport} - {(stats.currentBooking as { area: string }).area}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatSlotRange((stats.currentBooking as { booking_time: string }).booking_time)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active booking</p>
                  )}
                </div>

                <div
                  className={cn(
                    'p-4 rounded-xl border-2',
                    stats?.nextBooking
                      ? 'border-success/50 bg-success/5'
                      : 'border-dashed border-muted'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Next Booking
                    </span>
                    {stats?.nextBooking && (
                      <Badge variant="success" className="text-[10px]">Upcoming</Badge>
                    )}
                  </div>
                  {stats?.nextBooking ? (
                    <div>
                      <p className="font-medium">{(stats.nextBooking as { customer_name: string }).customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(stats.nextBooking as { sport: string }).sport} - {(stats.nextBooking as { area: string }).area}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatSlotRange((stats.nextBooking as { booking_time: string }).booking_time)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming booking</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
