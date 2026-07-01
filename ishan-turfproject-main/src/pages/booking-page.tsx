import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodayBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, useBookings } from '@/services/dashboard-service'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Wallet,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatCurrency, formatTime, formatDate, formatSlotRange, cn, getInitials } from '@/lib/utils'
import type { Booking } from '@/types/database'

const bookingSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile_number: z.string().min(10, 'Invalid phone number'),
  area: z.string().min(1, 'Please select an area'),
  booking_date: z.string().min(1, 'Please select a date'),
  booking_time: z.string().min(1, 'Please select a time'),
  sport: z.string().min(1, 'Please select a sport'),
  amount: z.number().min(0, 'Invalid amount'),
  payment_status: z.enum(['paid', 'pending']),
  notes: z.string().nullable().optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

const sports = ['Cricket', 'Football', 'Badminton', 'Tennis', 'Volleyball', 'Basketball']
const areas = ['Ground A', 'Ground B', 'Ground C', 'Court 1', 'Court 2', 'Court 3']
const timeSlots = [
  '06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM'
]

function slotStartHour(time: string) {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return 0
  let hour = Number(match[1])
  const period = match[3]?.toUpperCase()
  if (period === 'PM' && hour < 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return hour
}

export function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline')

  const { data: todayBookings, isLoading: todayLoading } = useTodayBookings()
  const { data: allBookings, isLoading: allLoading } = useBookings()
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()
  const { toast } = useToast()

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: '',
      mobile_number: '',
      area: '',
      booking_date: selectedDate,
      booking_time: '',
      sport: '',
      amount: 0,
      payment_status: 'pending',
      notes: '',
    },
  })

  const handleSubmit = async (data: BookingFormData) => {
    try {
      const bookingData = {
        ...data,
        notes: data.notes || null,
      }
      if (editingBooking) {
        await updateBooking.mutateAsync({ id: editingBooking.id, ...bookingData })
        toast({ title: 'Booking updated', description: 'Booking has been updated successfully' })
      } else {
        await createBooking.mutateAsync(bookingData as Omit<Booking, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        toast({ title: 'Booking created', description: 'New booking has been created' })
      }
      setIsDialogOpen(false)
      form.reset()
      setEditingBooking(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  }

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking)
    form.reset({
      customer_name: booking.customer_name,
      mobile_number: booking.mobile_number,
      area: booking.area,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      sport: booking.sport,
      amount: booking.amount,
      payment_status: booking.payment_status,
      notes: booking.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBooking.mutateAsync(id)
      toast({ title: 'Booking deleted', description: 'Booking has been removed' })
      setDeleteConfirm(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete booking',
      })
    }
  }

  const filteredBookings = (allBookings || []).filter((booking) =>
    booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.mobile_number.includes(searchQuery) ||
    booking.area.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dateBookings = filteredBookings.filter((b) => b.booking_date === selectedDate)

  const currentTime = new Date()
  const currentHour = currentTime.getHours()

  if (todayLoading && allLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground text-sm">Manage turf bookings</p>
        </div>
        <Button onClick={() => { setEditingBooking(null); form.reset(); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="lg:w-80 flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" size="icon-sm" onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() - 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button variant="outline" size="icon-sm" onClick={() => {
                const d = new Date(selectedDate)
                d.setDate(d.getDate() + 1)
                setSelectedDate(d.toISOString().split('T')[0])
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-3 rounded-xl bg-success/10">
                <p className="text-2xl font-bold text-success">{dateBookings.filter(b => b.payment_status === 'paid').length}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <p className="text-2xl font-bold text-warning">{dateBookings.filter(b => b.payment_status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'timeline')}>
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardContent className="p-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-2">
                      {timeSlots.map((time) => {
                        const booking = dateBookings.find((b) => b.booking_time === time)
                        const hour = slotStartHour(time)
                        const isPast = hour < currentHour && selectedDate === new Date().toISOString().split('T')[0]
                        const isCurrent = hour === currentHour && selectedDate === new Date().toISOString().split('T')[0]

                        return (
                          <motion.div
                            key={time}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              'flex items-center gap-4 p-3 rounded-xl transition-all',
                              isPast && 'opacity-50',
                              isCurrent && 'ring-2 ring-primary bg-primary/5',
                              booking && 'bg-card shadow-soft',
                              !booking && !isPast && 'hover:bg-muted/50'
                            )}
                          >
                            <div className={cn(
                              'w-16 text-sm font-medium',
                              booking ? (booking.payment_status === 'paid' ? 'text-success' : 'text-warning') : 'text-muted-foreground'
                            )}>
                              {time.includes('-') ? time : formatSlotRange(time)}
                            </div>
                            {booking ? (
                              <div className="flex-1 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    'h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium',
                                    booking.payment_status === 'paid' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                                  )}>
                                    {getInitials(booking.customer_name)}
                                  </div>
                                  <div>
                                    <p className="font-medium">{booking.customer_name}</p>
                                    <p className="text-xs text-muted-foreground">{booking.sport} - {booking.area}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={booking.payment_status === 'paid' ? 'success' : 'warning'}>
                                    {formatCurrency(booking.amount)}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleEdit(booking)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 text-sm text-muted-foreground">
                                {isPast ? 'Time passed' : 'Available'}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              {dateBookings.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No bookings"
                  description={`No bookings found for ${formatDate(selectedDate)}`}
                  action={{
                    label: 'Create Booking',
                    onClick: () => { form.reset(); setIsDialogOpen(true); },
                  }}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence>
                    {dateBookings.map((booking, index) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-soft-lg',
                            booking.payment_status === 'paid' ? 'border-l-4 border-l-success' : 'border-l-4 border-l-warning'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold">{booking.customer_name}</p>
                                <p className="text-sm text-muted-foreground">{booking.mobile_number}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(booking)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm(booking.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {formatSlotRange(booking.booking_time)}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                {booking.area}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                {booking.sport}
                              </div>
                              <div className="flex items-center gap-1.5 font-medium">
                                <Wallet className="h-3.5 w-3.5" />
                                {formatCurrency(booking.amount)}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <Badge variant={booking.payment_status === 'paid' ? 'success' : 'warning'}>
                                {booking.payment_status === 'paid' ? (
                                  <><CheckCircle2 className="mr-1 h-3 w-3" /> Paid</>
                                ) : (
                                  <><AlertCircle className="mr-1 h-3 w-3" /> Pending</>
                                )}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  placeholder="John Doe"
                  {...form.register('customer_name')}
                />
                {form.formState.errors.customer_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.customer_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  placeholder="9876543210"
                  {...form.register('mobile_number')}
                />
                {form.formState.errors.mobile_number && (
                  <p className="text-xs text-destructive">{form.formState.errors.mobile_number.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Select
                  value={form.watch('area')}
                  onValueChange={(v) => form.setValue('area', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.area && (
                  <p className="text-xs text-destructive">{form.formState.errors.area.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select
                  value={form.watch('sport')}
                  onValueChange={(v) => form.setValue('sport', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((sport) => (
                      <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.sport && (
                  <p className="text-xs text-destructive">{form.formState.errors.sport.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking_date">Date</Label>
                <Input
                  id="booking_date"
                  type="date"
                  {...form.register('booking_date')}
                />
                {form.formState.errors.booking_date && (
                  <p className="text-xs text-destructive">{form.formState.errors.booking_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_time">Time</Label>
                <Select
                  value={form.watch('booking_time')}
                  onValueChange={(v) => form.setValue('booking_time', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time.includes('-') ? time : formatSlotRange(time)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.booking_time && (
                  <p className="text-xs text-destructive">{form.formState.errors.booking_time.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...form.register('amount', { valueAsNumber: true })}
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={form.watch('payment_status')}
                  onValueChange={(v) => form.setValue('payment_status', v as 'paid' | 'pending')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                {...form.register('notes')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createBooking.isPending || updateBooking.isPending}>
                {editingBooking ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this booking? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              loading={deleteBooking.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
