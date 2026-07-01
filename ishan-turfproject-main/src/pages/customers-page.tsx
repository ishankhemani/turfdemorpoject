import { useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { useCustomers, useAreaStats } from '@/services/customers-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import {
  Search,
  Users,
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  TrendingUp,
  BarChart3,
  PhoneCall,
} from 'lucide-react'
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils'

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'visits' | 'spent' | 'recent'>('visits')

  const { data: customers, isLoading } = useCustomers()
  const { data: areaStats } = useAreaStats()

  const filteredCustomers = (customers || [])
    .filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.area.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'visits') return b.total_bookings - a.total_bookings
      if (sortBy === 'spent') return b.total_spent - a.total_spent
      if (sortBy === 'recent') {
        const aDate = a.last_booking_date ? new Date(a.last_booking_date).getTime() : 0
        const bDate = b.last_booking_date ? new Date(b.last_booking_date).getTime() : 0
        return bDate - aDate
      }
      return 0
    })

  const totalCustomers = (customers || []).length
  const totalRevenue = (customers || []).reduce((sum, c) => sum + c.total_spent, 0)
  const avgBookings = totalCustomers > 0 ? (customers || []).reduce((sum, c) => sum + c.total_bookings, 0) / totalCustomers : 0

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (isLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm">Manage your customer database</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <IndianRupee className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Bookings</p>
                <p className="text-2xl font-bold">{avgBookings.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <BarChart3 className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Areas</p>
                <p className="text-lg font-bold">{areaStats?.[0]?.area || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base">Customer List</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'visits' | 'spent' | 'recent')}>
                  <TabsList className="hidden sm:flex">
                    <TabsTrigger value="visits">Visits</TabsTrigger>
                    <TabsTrigger value="spent">Spent</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <EmptyState icon={Users} title="No customers" description="Customers will be automatically created from bookings" />
            ) : (
              <div className="space-y-3">
                {filteredCustomers.slice(0, 10).map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-soft transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {getInitials(customer.name)}
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">{customer.total_bookings} bookings</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(customer.total_spent)} spent</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success"
                              asChild
                            >
                              <a href={`tel:${customer.phone}`}>
                                <PhoneCall className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Area Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaStats?.slice(0, 6) || []}
                    dataKey="bookings"
                    nameKey="area"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {(areaStats?.slice(0, 6) || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {(areaStats?.slice(0, 4) || []).map((stat, index) => (
                <div key={stat.area} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{stat.area}</span>
                  </div>
                  <span className="text-sm font-medium">{stat.bookings}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
