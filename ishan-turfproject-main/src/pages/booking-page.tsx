import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodayBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, useBookings } from '@/services/dashboard-service'
import { useSyncBookingInventorySales, useRemoveBookingInventorySales, DEFAULT_INVENTORY_ITEMS, useInventoryItems } from '@/services/inventory-service'
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
import { PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  MapPin,
  Wallet,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Check,
  Zap,
} from 'lucide-react'
import { formatCurrency, formatDate, cn, getInitials } from '@/lib/utils'
import type { Booking, AddOnItem } from '@/types/database'

const sports = ['Cricket', 'Football', 'Badminton', 'Tennis', 'Volleyball', 'Basketball']
const areas = ['Ground A', 'Ground B', 'Ground C', 'Court 1', 'Court 2', 'Court 3']

// 30-minute time slot choices from 06:00 AM to 11:30 PM
const SLOT_CHOICES: string[] = []
for (let h = 6; h <= 23; h++) {
  const hourStr = h < 10 ? `0${h}` : `${h}`
  SLOT_CHOICES.push(`${hourStr}:00`)
  if (h !== 23) {
    SLOT_CHOICES.push(`${hourStr}:30`)
  }
}

function format12Hr(time24: string): string {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h < 10 ? '0' + h : h}:${mStr} ${ampm}`
}

const bookingSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile_number: z.string().min(8, 'Invalid phone number'),
  area: z.string(),
  booking_date: z.string().min(1, 'Please select a date'),
  start_time: z.string().min(1, 'Select start time'),
  end_time: z.string().min(1, 'Select end time'),
  sport: z.string(),
  turf_amount: z.number().min(0, 'Invalid amount'),
  payment_status: z.enum(['paid', 'pending']),
  payment_mode: z.enum(['offline', 'online', 'split']),
  online_amount: z.number().min(0),
  offline_amount: z.number().min(0),
  notes: z.string().nullable().optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

export function BookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline')

  // Extend booking state
  const [extendTarget, setExtendTarget] = useState<Booking | null>(null)
  const [extendEndTime, setExtendEndTime] = useState<string>('')

  // Modify actual end time state
  const [modifyTarget, setModifyTarget] = useState<Booking | null>(null)
  const [actualEndTimeInput, setActualEndTimeInput] = useState<string>('')

  // Add-ons state inside booking form
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnItem[]>([])

  const { data: inventoryItems = [] } = useInventoryItems()
  const { data: allBookings, isLoading: allLoading } = useBookings()
  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()
  const syncInventorySales = useSyncBookingInventorySales()
  const removeInventorySales = useRemoveBookingInventorySales()
  const { toast } = useToast()

  const stockMap = React.useMemo(() => {
    const map: Record<string, number> = {}
    inventoryItems.forEach((inv) => {
      map[inv.name.toLowerCase()] = inv.quantity ?? 0
    })
    return map
  }, [inventoryItems])

  const availableInventoryList = React.useMemo(() => {
    if (inventoryItems && inventoryItems.length > 0) {
      return inventoryItems.map((inv) => ({
        name: inv.name,
        category: inv.category,
        default_price: inv.default_price,
        quantity: inv.quantity ?? 0,
      }))
    }
    return DEFAULT_INVENTORY_ITEMS
  }, [inventoryItems])

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: '',
      mobile_number: '',
      area: 'Turf Main Ground',
      booking_date: selectedDate,
      start_time: '16:00',
      end_time: '17:00',
      sport: 'Turf Sport',
      turf_amount: 500,
      payment_status: 'pending',
      payment_mode: 'offline',
      online_amount: 0,
      offline_amount: 500,
      notes: '',
    },
  })

  const watchTurfAmount = form.watch('turf_amount') || 0
  const watchPaymentMode = form.watch('payment_mode')

  const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.price * item.qty, 0)
  const grandTotal = watchTurfAmount + addOnsTotal

  // When payment mode changes, reset amounts appropriately
  useEffect(() => {
    if (watchPaymentMode === 'offline') {
      form.setValue('offline_amount', grandTotal)
      form.setValue('online_amount', 0)
    } else if (watchPaymentMode === 'online') {
      form.setValue('online_amount', grandTotal)
      form.setValue('offline_amount', 0)
    } else if (watchPaymentMode === 'split') {
      // Always reset to half when mode first switches to split
      const half = Math.floor(grandTotal / 2)
      form.setValue('online_amount', half)
      form.setValue('offline_amount', grandTotal - half)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchPaymentMode])

  // When grand total changes, update amounts based on current mode
  useEffect(() => {
    if (watchPaymentMode === 'offline') {
      form.setValue('offline_amount', grandTotal)
      form.setValue('online_amount', 0)
    } else if (watchPaymentMode === 'online') {
      form.setValue('online_amount', grandTotal)
      form.setValue('offline_amount', 0)
    } else if (watchPaymentMode === 'split') {
      // Clamp online to new grandTotal, recalculate offline
      const currentOnline = Math.min(form.getValues('online_amount') || 0, grandTotal)
      form.setValue('online_amount', currentOnline)
      form.setValue('offline_amount', grandTotal - currentOnline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grandTotal])

  const handleOpenNewDialog = () => {
    setEditingBooking(null)
    setSelectedAddOns(
      availableInventoryList.map((item) => ({
        name: item.name,
        category: item.category,
        price: item.default_price,
        qty: 0,
      }))
    )
    form.reset({
      customer_name: '',
      mobile_number: '',
      area: 'Turf Main Ground',
      booking_date: selectedDate,
      start_time: '16:00',
      end_time: '17:00',
      sport: 'Turf Sport',
      turf_amount: 500,
      payment_status: 'pending',
      payment_mode: 'offline',
      online_amount: 0,
      offline_amount: 500,
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const resolvePaymentMode = (b: Partial<Booking>): 'online' | 'offline' | 'split' => {
    if (b.payment_mode === 'online' || b.payment_mode === 'offline' || b.payment_mode === 'split') {
      return b.payment_mode
    }
    if (b.transaction_id || b.source === 'website') {
      return 'online'
    }
    return 'offline'
  }

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking)
    const existingAddOns = booking.add_ons || []
    setSelectedAddOns(
      availableInventoryList.map((def) => {
        const match = existingAddOns.find((a) => a.name.toLowerCase() === def.name.toLowerCase())
        return {
          name: def.name,
          category: def.category,
          price: match ? match.price : def.default_price,
          qty: match ? match.qty : 0,
        }
      })
    )

    const times = (booking.booking_time || '').split(' - ')
    const mode = resolvePaymentMode(booking)
    const totalAmt = booking.amount
    const defaultOnline = mode === 'split' ? Math.floor(totalAmt / 2) : mode === 'online' ? totalAmt : 0
    const defaultOffline = mode === 'split' ? totalAmt - defaultOnline : mode === 'offline' ? totalAmt : 0

    form.reset({
      customer_name: booking.customer_name,
      mobile_number: booking.mobile_number,
      area: booking.area || 'Turf Main Ground',
      booking_date: booking.booking_date,
      start_time: booking.start_time || times[0] || '16:00',
      end_time: booking.end_time || times[1] || '17:00',
      sport: booking.sport || 'Turf Sport',
      turf_amount: booking.amount - (booking.add_ons || []).reduce((s, a) => s + a.price * a.qty, 0),
      payment_status: booking.payment_status,
      payment_mode: mode,
      online_amount: booking.online_amount ?? defaultOnline,
      offline_amount: booking.offline_amount ?? defaultOffline,
      notes: booking.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleAddOnQtyChange = (name: string, delta: number) => {
    const currentItem = selectedAddOns.find((i) => i.name === name)
    if (!currentItem) return

    const availableStock = stockMap[name.toLowerCase()] ?? 0

    if (delta > 0) {
      if (availableStock <= 0) {
        toast({
          variant: 'destructive',
          title: 'Out of Stock',
          description: `${name} is currently out of stock and cannot be added.`,
        })
        return
      }
      if (currentItem.qty + delta > availableStock) {
        toast({
          variant: 'destructive',
          title: 'Stock Limit Reached',
          description: `Only ${availableStock} unit${availableStock === 1 ? '' : 's'} of ${name} available in stock.`,
        })
        return
      }
    }

    setSelectedAddOns((prev) =>
      prev.map((item) => {
        if (item.name === name) {
          return { ...item, qty: Math.max(0, item.qty + delta) }
        }
        return item
      })
    )
  }

  const handleAddOnPriceChange = (name: string, price: number) => {
    setSelectedAddOns((prev) =>
      prev.map((item) => {
        if (item.name === name) {
          return { ...item, price: Math.max(0, price) }
        }
        return item
      })
    )
  }

  const handleSubmit = async (data: BookingFormData) => {
    try {
      const activeAddOns = selectedAddOns.filter((a) => a.qty > 0)
      const formattedTime = `${data.start_time} - ${data.end_time}`

      const payload = {
        customer_name: data.customer_name,
        mobile_number: data.mobile_number,
        area: data.area,
        booking_date: data.booking_date,
        booking_time: formattedTime,
        start_time: data.start_time,
        end_time: data.end_time,
        sport: data.sport,
        amount: grandTotal,
        payment_status: data.payment_status,
        payment_mode: data.payment_mode,
        online_amount: data.payment_mode === 'split' ? data.online_amount : data.payment_mode === 'online' ? grandTotal : 0,
        offline_amount: data.payment_mode === 'split' ? data.offline_amount : data.payment_mode === 'offline' ? grandTotal : 0,
        add_ons: activeAddOns,
        notes: data.notes || null,
      }

      let createdBookingId = editingBooking?.id

      if (editingBooking) {
        await updateBooking.mutateAsync({ id: editingBooking.id, ...payload })
        toast({ title: 'Booking updated', description: 'Booking has been updated' })
      } else {
        const created = await createBooking.mutateAsync(payload as any)
        createdBookingId = created?.id
        toast({ title: 'Booking created', description: 'New booking created successfully' })
      }

      // Sync add-ons to inventory sales log & stock (only records if payment_status is paid)
      if (createdBookingId) {
        try {
          await syncInventorySales.mutateAsync({
            bookingId: createdBookingId,
            date: data.booking_date,
            isPaid: data.payment_status === 'paid',
            addOns: selectedAddOns,
          })
        } catch (invErr) {
          console.warn('Inventory log sync bypassed safely', invErr)
        }
      }

      setIsDialogOpen(false)
      setEditingBooking(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving booking',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  }

  const handleMarkAsPaid = async (booking: Booking) => {
    try {
      const mode = resolvePaymentMode(booking)
      await updateBooking.mutateAsync({
        id: booking.id,
        payment_status: 'paid',
        payment_mode: mode,
        online_amount: booking.online_amount ?? (mode === 'online' ? booking.amount : mode === 'split' ? Math.floor(booking.amount / 2) : 0),
        offline_amount: booking.offline_amount ?? (mode === 'offline' ? booking.amount : mode === 'split' ? booking.amount - Math.floor(booking.amount / 2) : 0),
      })
      await syncInventorySales.mutateAsync({
        bookingId: booking.id,
        date: booking.booking_date,
        isPaid: true,
        addOns: booking.add_ons || [],
      })
      toast({ title: 'Marked as Paid', description: `Booking for ${booking.customer_name} marked as paid.` })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update payment status' })
    }
  }

  const handleSaveExtend = async () => {
    if (!extendTarget || !extendEndTime) return
    try {
      const times = (extendTarget.booking_time || '').split(' - ')
      const newBookingTime = `${times[0] || extendTarget.start_time || '16:00'} - ${extendEndTime}`

      await updateBooking.mutateAsync({
        id: extendTarget.id,
        end_time: extendEndTime,
        booking_time: newBookingTime,
      })
      toast({ title: 'Booking Extended', description: `Extended until ${format12Hr(extendEndTime)}` })
      setExtendTarget(null)
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not extend booking' })
    }
  }

  const handleSaveActualEndTime = async () => {
    if (!modifyTarget || !actualEndTimeInput) return
    try {
      await updateBooking.mutateAsync({
        id: modifyTarget.id,
        actual_end_time: actualEndTimeInput,
      })
      toast({ title: 'Actual End Time Saved', description: `Updated actual end time to ${format12Hr(actualEndTimeInput)}` })
      setModifyTarget(null)
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save actual end time' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await removeInventorySales.mutateAsync(id)
      await deleteBooking.mutateAsync(id)
      toast({ title: 'Booking deleted', description: 'Booking removed' })
      setDeleteConfirm(null)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete booking' })
    }
  }

  const filteredBookings = (allBookings || []).filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.mobile_number.includes(searchQuery) ||
      booking.area.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dateBookings = filteredBookings.filter((b) => b.booking_date === selectedDate)

  if (allLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-emerald-400" /> Ground Bookings
          </h1>
          <p className="text-slate-400 text-sm">Create and manage bookings, add-on drinks, and payment status.</p>
        </div>
        <Button onClick={handleOpenNewDialog} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
          <Plus className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Date Selector Sidebar */}
        <Card className="lg:w-80 flex-shrink-0 bg-slate-900/80 border-slate-800 shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-base text-white">Select Date</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="border-slate-700 text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950/70 border-slate-700 text-white"
                />
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="border-slate-700 text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer/phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/70 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <p className="text-2xl font-bold text-emerald-400">{dateBookings.filter((b) => b.payment_status === 'paid').length}</p>
                <p className="text-xs text-slate-400">Paid Bookings</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40">
                <p className="text-2xl font-bold text-amber-400">{dateBookings.filter((b) => b.payment_status === 'pending').length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings View */}
        <div className="flex-1">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'timeline')}>
            <TabsList className="mb-4 bg-slate-800/80 border border-slate-700/50">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-emerald-600 text-slate-300">
                Time Slots View
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-emerald-600 text-slate-300">
                Bookings Cards List
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
                <CardContent className="p-6">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {SLOT_CHOICES.map((slotTime) => {
                        const booking = dateBookings.find((b) => {
                          if (b.start_time) return b.start_time === slotTime
                          return (b.booking_time || '').startsWith(slotTime)
                        })

                        return (
                          <div
                            key={slotTime}
                            className={cn(
                              'flex items-center gap-4 p-3 rounded-xl border transition-all',
                              booking
                                ? 'bg-slate-800/80 border-slate-700'
                                : 'bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/40'
                            )}
                          >
                            <div className="w-20 text-sm font-semibold text-slate-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              {format12Hr(slotTime)}
                            </div>

                            {booking ? (
                              <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/40">
                                    {getInitials(booking.customer_name)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-white text-base">{booking.customer_name}</p>
                                      <span className="text-xs text-slate-400">({booking.mobile_number})</span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                      Time Slot:{' '}
                                      <span className="text-amber-300 font-mono font-semibold">
                                        {booking.start_time && booking.end_time
                                          ? `${format12Hr(booking.start_time)} - ${format12Hr(booking.end_time)}`
                                          : booking.booking_time}
                                      </span>
                                    </p>
                                    {booking.actual_end_time && (
                                      <p className="text-xs text-purple-300 mt-0.5">
                                        Played till: <strong>{format12Hr(booking.actual_end_time)}</strong>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    className={cn(
                                      'px-2.5 py-1 font-bold text-sm',
                                      booking.payment_status === 'paid'
                                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700'
                                        : 'bg-amber-950/80 text-amber-400 border border-amber-700'
                                    )}
                                  >
                                    ₹{booking.amount} ({resolvePaymentMode(booking)})
                                  </Badge>

                                  {booking.payment_status === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkAsPaid(booking)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" /> Mark Paid
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setExtendTarget(booking)
                                      setExtendEndTime(booking.end_time || '18:00')
                                    }}
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                                  >
                                    <Zap className="w-3.5 h-3.5 mr-1 text-amber-400" /> Extend
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(booking)}
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex justify-between items-center text-sm text-slate-500">
                                <span>Available</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    handleOpenNewDialog()
                                    form.setValue('start_time', slotTime)
                                  }}
                                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                                >
                                  + Book Slot
                                </Button>
                              </div>
                            )}
                          </div>
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
                  title="No Bookings Found"
                  description={`No bookings recorded for ${formatDate(selectedDate)}`}
                  action={{
                    label: 'Create Booking',
                    onClick: handleOpenNewDialog,
                  }}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {dateBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className={cn(
                        'bg-slate-900/80 border-slate-800 shadow-lg relative overflow-hidden',
                        booking.payment_status === 'paid' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-white text-lg">{booking.customer_name}</h3>
                            <p className="text-sm text-slate-400">{booking.mobile_number}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(booking)} className="text-slate-300">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteConfirm(booking.id)} className="text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div>
                            <span className="text-slate-500 block">Timing</span>
                            <strong className="text-amber-300">
                              {booking.start_time && booking.end_time
                                ? `${format12Hr(booking.start_time)} - ${format12Hr(booking.end_time)}`
                                : booking.booking_time}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Ground / Area</span>
                            <strong className="text-white">{booking.area}</strong>
                          </div>
                        </div>

                        {booking.add_ons && booking.add_ons.length > 0 && (
                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-emerald-400" /> Add-ons Purchased:
                            </span>
                            {booking.add_ons.map((item, i) => (
                              <div key={i} className="flex justify-between text-slate-300">
                                <span>
                                  {item.name} x{item.qty}
                                </span>
                                <span className="text-emerald-400 font-medium">₹{item.price * item.qty}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div>
                            <span className="text-xs text-slate-400">Total Bill</span>
                            <p className="text-lg font-bold text-emerald-400">₹{booking.amount}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {booking.payment_status === 'pending' ? (
                              <Button size="sm" onClick={() => handleMarkAsPaid(booking)} className="bg-emerald-600 text-white text-xs">
                                Mark as Paid
                              </Button>
                            ) : (
                              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Paid ({resolvePaymentMode(booking)})
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setModifyTarget(booking)
                                setActualEndTimeInput(booking.actual_end_time || booking.end_time || '18:00')
                              }}
                              className="border-slate-700 text-slate-300 text-xs"
                            >
                              Left Time
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Main Booking Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) return }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-800" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" /> {editingBooking ? 'Edit Booking' : 'New Ground Booking'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Customer Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">1. Customer Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-xs">Customer Name</Label>
                  <Input {...form.register('customer_name')} placeholder="Enter name" className="bg-slate-950/70 border-slate-700" />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Mobile Number</Label>
                  <Input {...form.register('mobile_number')} placeholder="Enter 10-digit number" className="bg-slate-950/70 border-slate-700" />
                </div>
              </div>
            </div>

            {/* Step 2: Time Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">2. Booking Date & Time Slot</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 text-xs">Booking Date</Label>
                  <Input type="date" {...form.register('booking_date')} className="bg-slate-950/70 border-slate-700" />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Start Time (30-min)</Label>
                  <Select value={form.watch('start_time')} onValueChange={(v) => form.setValue('start_time', v)}>
                    <SelectTrigger className="bg-slate-950/70 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                      {SLOT_CHOICES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {format12Hr(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">End Time (30-min)</Label>
                  <Select value={form.watch('end_time')} onValueChange={(v) => form.setValue('end_time', v)}>
                    <SelectTrigger className="bg-slate-950/70 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                      {SLOT_CHOICES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {format12Hr(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 3: Add-on Items */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" /> 3. Add-on Items & Drinks
                </h4>
                <span className="text-xs text-emerald-400 font-bold">Add-ons Subtotal: ₹{addOnsTotal}</span>
              </div>

              <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3 max-h-60 overflow-y-auto">
                {selectedAddOns.map((item) => {
                  const stock = stockMap[item.name.toLowerCase()] ?? 0
                  const isOutOfStock = stock <= 0
                  const isMaxStockReached = item.qty >= stock && stock > 0

                  return (
                    <div key={item.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-semibold block", isOutOfStock ? "text-slate-400 line-through" : "text-white")}>
                            {item.name}
                          </span>
                          {isOutOfStock ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-950/90 text-red-400 border-red-800/60 font-bold">
                              Out of Stock
                            </Badge>
                          ) : stock <= 5 ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-950/90 text-amber-400 border-amber-800/60 font-bold">
                              Low Stock ({stock})
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-emerald-400/80 font-mono">(Stock: {stock})</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{item.category}</span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Price (₹):</span>
                          <Input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleAddOnPriceChange(item.name, Number(e.target.value))}
                            className="w-16 h-8 bg-slate-900 border-slate-700 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleAddOnQtyChange(item.name, -1)}
                            disabled={item.qty <= 0}
                            className="h-6 w-6 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-sm font-bold transition-colors"
                          >
                            −
                          </button>
                          <span className={cn("w-6 text-center font-bold text-xs", item.qty > 0 ? "text-emerald-400" : "text-slate-400")}>
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOnQtyChange(item.name, 1)}
                            disabled={isOutOfStock || isMaxStockReached}
                            title={isOutOfStock ? "Out of Stock" : isMaxStockReached ? `Stock limit reached (${stock})` : "Add item"}
                            className="h-6 w-6 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-sm font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 4: Payments & Billing */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">4. Payment & Billing</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-xs">Turf Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.watch('turf_amount')}
                    onChange={(e) => form.setValue('turf_amount', Number(e.target.value))}
                    className="bg-slate-950/70 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Payment Mode</Label>
                  <Select value={form.watch('payment_mode')} onValueChange={(v) => form.setValue('payment_mode', v as any)}>
                    <SelectTrigger className="bg-slate-950/70 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="offline">Offline (Cash)</SelectItem>
                      <SelectItem value="online">Online (UPI / Card)</SelectItem>
                      <SelectItem value="split">Split (Online + Cash)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {watchPaymentMode === 'split' && (
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Split total must equal ₹{grandTotal}</span>
                    <span className={cn(
                      'font-bold',
                      (form.watch('online_amount') || 0) + (form.watch('offline_amount') || 0) === grandTotal
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    )}>
                      ₹{(form.watch('online_amount') || 0) + (form.watch('offline_amount') || 0)} / ₹{grandTotal}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300 text-xs">Online / UPI Amount (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={form.watch('online_amount') ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(grandTotal, parseInt(e.target.value, 10) || 0))
                          form.setValue('online_amount', val)
                          form.setValue('offline_amount', Math.max(0, grandTotal - val))
                        }}
                        className="bg-slate-900 border-slate-700 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-xs">Cash / Offline Amount (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={form.watch('offline_amount') ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(grandTotal, parseInt(e.target.value, 10) || 0))
                          form.setValue('offline_amount', val)
                          form.setValue('online_amount', Math.max(0, grandTotal - val))
                        }}
                        className="bg-slate-900 border-slate-700 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/50 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block">Total Final Bill</span>
                  <p className="text-2xl font-bold text-emerald-400">₹{grandTotal}</p>
                  <span className="text-xs text-slate-500">
                    (Turf: ₹{watchTurfAmount} + Add-ons: ₹{addOnsTotal})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-300">Status:</Label>
                  <Select value={form.watch('payment_status')} onValueChange={(v) => form.setValue('payment_status', v as any)}>
                    <SelectTrigger className="w-32 bg-slate-950 border-slate-700 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBooking.isPending || updateBooking.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6"
              >
                {createBooking.isPending || updateBooking.isPending ? 'Saving...' : editingBooking ? 'Save Updates' : 'Create Booking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Extend Booking Modal */}
      <Dialog open={!!extendTarget} onOpenChange={(open) => !open && setExtendTarget(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Extend Booking — {extendTarget?.customer_name}
            </DialogTitle>
          </DialogHeader>

          {extendTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-sm">
                <p className="text-slate-400">
                  Current End Time: <strong className="text-white">{format12Hr(extendTarget.end_time || '17:00')}</strong>
                </p>
              </div>

              <div>
                <Label className="text-slate-300 text-xs mb-1 block">New Extended End Time</Label>
                <Select value={extendEndTime} onValueChange={setExtendEndTime}>
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                    {SLOT_CHOICES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {format12Hr(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setExtendTarget(null)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleSaveExtend} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Save Extension
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modify Actual End Time Modal */}
      <Dialog open={!!modifyTarget} onOpenChange={(open) => !open && setModifyTarget(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" /> Modify Actual Played Time — {modifyTarget?.customer_name}
            </DialogTitle>
          </DialogHeader>

          {modifyTarget && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-sm">
                <p className="text-slate-400">
                  Booked End Time: <strong className="text-white">{format12Hr(modifyTarget.end_time || '18:00')}</strong>
                </p>
              </div>

              <div>
                <Label className="text-slate-300 text-xs mb-1 block">Actual Time Player Left</Label>
                <Select value={actualEndTimeInput} onValueChange={setActualEndTimeInput}>
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                    {SLOT_CHOICES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {format12Hr(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setModifyTarget(null)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleSaveActualEndTime} className="bg-purple-600 hover:bg-purple-500 text-white">
                  Save Actual Time
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Delete Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Are you sure you want to delete this booking? This action cannot be undone.</p>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
