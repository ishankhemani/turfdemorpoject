import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useMonthlyData, useDashboardStats } from '@/services/dashboard-service'
import { useAreaStats } from '@/services/customers-service'
import { useTodayBookings } from '@/services/dashboard-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function AnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData()
  const { data: stats } = useDashboardStats('month')
  const { data: areaStats } = useAreaStats()
  const { data: todayBookings } = useTodayBookings()

  if (monthlyLoading) {
    return <PageLoadingState />
  }

  const slotAnalysis = (() => {
    const slots: Record<string, number> = {}
    timeSlots.forEach((t) => { slots[t] = 0 })
    ;(todayBookings || []).forEach((b) => {
      slots[b.booking_time] = (slots[b.booking_time] || 0) + 1
    })
    return Object.entries(slots)
      .filter(([_, count]) => count > 0)
      .map(([time, count]) => ({ time, count }))
  })()

  const dayAnalysis = [
    { day: 'Mon', bookings: 12 },
    { day: 'Tue', bookings: 8 },
    { day: 'Wed', bookings: 15 },
    { day: 'Thu', bookings: 10 },
    { day: 'Fri', bookings: 18 },
    { day: 'Sat', bookings: 25 },
    { day: 'Sun', bookings: 22 },
  ]

  const topCustomers = [
    { name: 'John Doe', bookings: 15, spent: 45000 },
    { name: 'Jane Smith', bookings: 12, spent: 38000 },
    { name: 'Mike Johnson', bookings: 10, spent: 32000 },
    { name: 'Sarah Wilson', bookings: 8, spent: 25000 },
    { name: 'David Brown', bookings: 6, spent: 18000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">Business insights and trends</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month' | 'year')}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Busiest Time Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slotAnalysis.length > 0 ? slotAnalysis : [{ time: '18:00', count: 5 }]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Day-wise Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Area-wise Footfall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaStats?.slice(0, 6) || [{ area: 'Ground A', bookings: 10 }]}
                    dataKey="bookings"
                    nameKey="area"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {(areaStats?.slice(0, 6) || [{ area: 'Ground A', bookings: 10 }]).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <motion.div
                key={customer.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.bookings} bookings</p>
                  </div>
                </div>
                <p className="font-semibold text-success">{formatCurrency(customer.spent)}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
