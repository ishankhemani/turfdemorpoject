import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useTodayBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, useBookings } from '@/services/dashboard-service'
import { useSyncBookingInventorySales, useRemoveBookingInventorySales, DEFAULT_INVENTORY_ITEMS, useInventoryItems } from '@/services/inventory-service'
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

// 24-hour 30-minute time slot choices from 00:00 to 23:30
const SLOT_CHOICES: string[] = []
for (let h = 0; h <= 23; h++) {
  const hourStr = h < 10 ? `0${h}` : `${h}`
  SLOT_CHOICES.push(`${hourStr}:00`)
  SLOT_CHOICES.push(`${hourStr}:30`)
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const clean = timeStr.trim().toUpperCase()
  const isPM = clean.includes('PM')
  const isAM = clean.includes('AM')
  const numOnly = clean.replace(/(AM|PM)/g, '').trim()
  const parts = numOnly.split(':')
  let hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0

  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0

  return hours * 60 + minutes
}

export function extractTimeInterval(booking: { booking_time?: string; start_time?: string; end_time?: string }): { start: number; end: number } {
  if (booking.start_time && booking.end_time) {
    const start = parseTimeToMinutes(booking.start_time)
    let end = parseTimeToMinutes(booking.end_time)
    if (end <= start) end += 24 * 60
    return { start, end }
  }

  if (booking.booking_time && booking.booking_time.includes('-')) {
    const [startStr, endStr] = booking.booking_time.split('-')
    const start = parseTimeToMinutes(startStr)
    let end = parseTimeToMinutes(endStr)
    if (end <= start) end += 24 * 60
    return { start, end }
  }

  const start = parseTimeToMinutes(booking.booking_time || '00:00')
  return { start, end: start + 60 }
}

export function doIntervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end
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
  paid_amount: z.number().min(0).optional(),
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
  // Success flash & inline error (replaces toast notifications)
  const [successFlash, setSuccessFlash] = useState<{ name: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Payment status modal state for quick paid amount entry
  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null)
  const [paymentModalPaidInput, setPaymentModalPaidInput] = useState<number>(0)

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

  const showSuccess = useCallback((name: string) => {
    setSuccessFlash({ name })
    setTimeout(() => setSuccessFlash(null), 1800)
  }, [])

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

    const initialPaid = booking.paid_amount !== undefined && booking.paid_amount !== null
      ? Number(booking.paid_amount)
      : (booking.payment_status === 'paid' ? totalAmt : 0)

    form.reset({
      customer_name: booking.customer_name,
      mobile_number: booking.mobile_number,
      area: booking.area || 'Turf Main Ground',
      booking_date: booking.booking_date,
      start_time: booking.start_time || times[0] || '16:00',
      end_time: booking.end_time || times[1] || '17:00',
      sport: booking.sport || 'Turf Sport',
      turf_amount: booking.amount - (booking.add_ons || []).reduce((s, a) => s + a.price * a.qty, 0),
      paid_amount: initialPaid,
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
        setErrorMsg(`${name} is out of stock.`)
        return
      }
      if (currentItem.qty + delta > availableStock) {
        setErrorMsg(`Only ${availableStock} unit${availableStock === 1 ? '' : 's'} of ${name} in stock.`)
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
      // Check interval overlap against existing bookings
      const proposedInterval = {
        start: parseTimeToMinutes(data.start_time),
        end: parseTimeToMinutes(data.end_time),
      }
      if (proposedInterval.end <= proposedInterval.start) {
        proposedInterval.end += 24 * 60
      }

      const conflictingBooking = (allBookings || []).find((b) => {
        if (editingBooking && b.id === editingBooking.id) return false
        if (b.booking_date !== data.booking_date) return false
        if (b.area.trim().toLowerCase() !== data.area.trim().toLowerCase()) return false
        const existingInterval = extractTimeInterval(b)
        return doIntervalsOverlap(proposedInterval, existingInterval)
      })

      if (conflictingBooking) {
        setErrorMsg(`Slot conflict with booking for ${conflictingBooking.customer_name} (${conflictingBooking.booking_time || conflictingBooking.start_time}).`)
        return
      }

      const activeAddOns = selectedAddOns.filter((a) => a.qty > 0)
      const formattedTime = `${data.start_time} - ${data.end_time}`

      const rawPaidInput = data.paid_amount
      const initialPaid = rawPaidInput !== undefined && rawPaidInput !== null
        ? Number(rawPaidInput)
        : (data.payment_status === 'paid' ? grandTotal : 0)

      const finalPaid = Math.max(0, Math.min(grandTotal, initialPaid))
      const finalPending = Math.max(0, grandTotal - finalPaid)
      const finalStatus: 'paid' | 'pending' = finalPending <= 0 ? 'paid' : 'pending'

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
        paid_amount: finalPaid,
        pending_amount: finalPending,
        payment_status: finalStatus,
        payment_mode: data.payment_mode,
        online_amount: data.payment_mode === 'split' ? data.online_amount : data.payment_mode === 'online' ? finalPaid : 0,
        offline_amount: data.payment_mode === 'split' ? data.offline_amount : data.payment_mode === 'offline' ? finalPaid : 0,
        add_ons: activeAddOns,
        notes: data.notes || null,
      }

      let createdBookingId = editingBooking?.id

      // Close dialog immediately for 0ms latency user feedback
      setIsDialogOpen(false)
      setEditingBooking(null)

      if (editingBooking) {
        await updateBooking.mutateAsync({ id: editingBooking.id, ...payload })
      } else {
        const created = await createBooking.mutateAsync(payload as any)
        createdBookingId = created?.id
      }

      // Sync add-ons to inventory sales log & stock (only records if payment_status is paid)
      if (createdBookingId) {
        try {
          await syncInventorySales.mutateAsync({
            bookingId: createdBookingId,
            date: data.booking_date,
            isPaid: finalStatus === 'paid' || finalPaid > 0,
            addOns: selectedAddOns,
          })
        } catch (invErr) {
          console.warn('Inventory log sync bypassed safely', invErr)
        }
      }
      // Show success flash after save
      showSuccess(data.customer_name)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  const handleOpenPaymentModal = (booking: Booking) => {
    setPaymentModalBooking(booking)
    const totalAmt = Number(booking.amount || 0)
    const currentPaid = booking.paid_amount !== undefined && booking.paid_amount !== null
      ? Number(booking.paid_amount)
      : (booking.payment_status === 'paid' ? totalAmt : 0)
    setPaymentModalPaidInput(currentPaid > 0 ? currentPaid : totalAmt)
  }

  const handleSavePaymentModal = async () => {
    if (!paymentModalBooking) return
    try {
      const booking = paymentModalBooking
      setPaymentModalBooking(null)
      const totalAmt = Number(booking.amount || 0)
      const enteredPaid = Math.max(0, Math.min(totalAmt, Number(paymentModalPaidInput || 0)))
      const pendingAmt = Math.max(0, totalAmt - enteredPaid)
      const newStatus: 'paid' | 'pending' = pendingAmt <= 0 ? 'paid' : 'pending'
      const mode = resolvePaymentMode(booking)

      await updateBooking.mutateAsync({
        id: booking.id,
        payment_status: newStatus,
        paid_amount: enteredPaid,
        pending_amount: pendingAmt,
        payment_mode: mode,
        online_amount: booking.online_amount ?? (mode === 'online' ? enteredPaid : mode === 'split' ? Math.floor(enteredPaid / 2) : 0),
        offline_amount: booking.offline_amount ?? (mode === 'offline' ? enteredPaid : mode === 'split' ? enteredPaid - Math.floor(enteredPaid / 2) : 0),
      })

      await syncInventorySales.mutateAsync({
        bookingId: booking.id,
        date: booking.booking_date,
        isPaid: newStatus === 'paid' || enteredPaid > 0,
        addOns: booking.add_ons || [],
      })
      showSuccess(booking.customer_name)
    } catch (e) {
      console.warn('Failed to update payment status modal', e)
    }
  }

  const handleSaveExtend = async () => {
    if (!extendTarget || !extendEndTime) return
    try {
      const target = extendTarget
      setExtendTarget(null)
      const times = (target.booking_time || '').split(' - ')
      const newBookingTime = `${times[0] || target.start_time || '16:00'} - ${extendEndTime}`

      await updateBooking.mutateAsync({
        id: target.id,
        end_time: extendEndTime,
        booking_time: newBookingTime,
      })
    } catch (e) {
      console.warn('Could not extend booking', e)
    }
  }

  const handleSaveActualEndTime = async () => {
    if (!modifyTarget || !actualEndTimeInput) return
    try {
      const target = modifyTarget
      setModifyTarget(null)
      await updateBooking.mutateAsync({
        id: target.id,
        actual_end_time: actualEndTimeInput,
      })
    } catch (e) {
      console.warn('Could not save actual end time', e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteConfirm(null)
      await removeInventorySales.mutateAsync(id)
      await deleteBooking.mutateAsync(id)
    } catch (error) {
      console.warn('Failed to delete booking', error)
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
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" /> Ground Bookings
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">Create and manage bookings, add-on drinks, and payment status.</p>
        </div>
        <Button onClick={handleOpenNewDialog} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Mobile: Horizontal date strip. Desktop: Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="lg:w-72 xl:w-80 flex-shrink-0 bg-slate-900/80 border-slate-800 shadow-xl">
          <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-800">
            <CardTitle className="text-sm text-white">Select Date</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 pb-3 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 1)
                  setSelectedDate(d.toISOString().split('T')[0])
                }}
                className="border-slate-700 text-slate-300 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950/70 border-slate-700 text-white text-sm h-8"
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
                className="border-slate-700 text-slate-300 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search customer/phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/70 border-slate-700 text-white text-sm h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <p className="text-xl font-bold text-emerald-400">{dateBookings.filter((b) => b.payment_status === 'paid').length}</p>
                <p className="text-[10px] text-slate-400">Paid</p>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/40">
                <p className="text-xl font-bold text-amber-400">{dateBookings.filter((b) => b.payment_status === 'pending').length}</p>
                <p className="text-[10px] text-slate-400">Pending</p>
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
                <CardContent className="p-3 sm:p-6">
                  <ScrollArea className="h-[500px] sm:h-[600px] pr-2 sm:pr-4">
                    <div className="space-y-2">
                      {SLOT_CHOICES.map((slotTime) => {
                        const slotMinutes = parseTimeToMinutes(slotTime)

                        // Find a booking that STARTS at this slot (to display booking details)
                        const startingBooking = dateBookings.find((b) => {
                          if (b.start_time) return b.start_time === slotTime
                          return (b.booking_time || '').startsWith(slotTime)
                        })

                        // Check if this slot is COVERED by any booking (not necessarily the start)
                        const coveringBooking = !startingBooking
                          ? dateBookings.find((b) => {
                              const interval = extractTimeInterval(b)
                              return slotMinutes >= interval.start && slotMinutes < interval.end
                            })
                          : null

                        const isUnavailable = !startingBooking && !!coveringBooking

                        return (
                          <div
                            key={slotTime}
                            className={cn(
                              'flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl border transition-all',
                              startingBooking
                                ? 'bg-slate-800/80 border-slate-700'
                                : isUnavailable
                                  ? 'bg-red-950/20 border-red-900/40'
                                  : 'bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/40'
                            )}
                          >
                            <div className="w-16 sm:w-20 text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                              {format12Hr(slotTime)}
                            </div>

                            {startingBooking ? (
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/40 text-xs sm:text-sm shrink-0">
                                      {getInitials(startingBooking.customer_name)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-bold text-white text-sm truncate">{startingBooking.customer_name}</p>
                                        <span className="text-[10px] text-slate-400 hidden sm:inline">({startingBooking.mobile_number})</span>
                                      </div>
                                      <p className="text-[10px] sm:text-xs text-amber-300 font-mono font-semibold">
                                        {startingBooking.start_time && startingBooking.end_time
                                          ? `${format12Hr(startingBooking.start_time)} → ${format12Hr(startingBooking.end_time)}`
                                          : startingBooking.booking_time}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge
                                      className={cn(
                                        'px-2 py-0.5 font-bold text-xs flex items-center gap-1',
                                        startingBooking.payment_status === 'paid'
                                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700'
                                          : 'bg-amber-950/80 text-amber-400 border border-amber-700'
                                      )}
                                    >
                                      ₹{startingBooking.amount}
                                      {startingBooking.pending_amount && startingBooking.pending_amount > 0 ? (
                                        <span className="text-[10px] text-red-400 font-normal">
                                          (₹{startingBooking.pending_amount} pend)
                                        </span>
                                      ) : null}
                                    </Badge>

                                    <Button
                                      size="sm"
                                      onClick={() => handleOpenPaymentModal(startingBooking)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs h-7"
                                    >
                                      <Check className="w-3 h-3 mr-0.5" />
                                      {startingBooking.payment_status === 'paid' ? 'Paid' : 'Mark Paid / Enter Amt'}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setExtendTarget(startingBooking)
                                        setExtendEndTime(startingBooking.end_time || '18:00')
                                      }}
                                      className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] sm:text-xs h-7"
                                    >
                                      <Zap className="w-3 h-3 mr-0.5 text-amber-400" /> Ext
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(startingBooking)}
                                      className="border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] sm:text-xs h-7"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteConfirm(startingBooking.id)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[10px] sm:text-xs h-7"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : isUnavailable ? (
                              <div className="flex-1 text-xs text-red-400/80 font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Unavailable — booked by {coveringBooking?.customer_name}</span>
                              </div>
                            ) : (
                              <div className="flex-1 flex justify-between items-center text-xs text-slate-500">
                                <span>Available</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    handleOpenNewDialog()
                                    form.setValue('start_time', slotTime)
                                  }}
                                  className="text-[10px] sm:text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 h-7"
                                >
                                  + Book
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
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {dateBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      className={cn(
                        'bg-slate-900/80 border-slate-800 shadow-lg relative overflow-hidden',
                        booking.payment_status === 'paid' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-500'
                      )}
                    >
                      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <h3 className="font-bold text-white text-base sm:text-lg truncate">{booking.customer_name}</h3>
                            <p className="text-xs sm:text-sm text-slate-400">{booking.mobile_number}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon-sm" variant="ghost" onClick={() => handleEdit(booking)} className="text-slate-300 h-7 w-7">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => setDeleteConfirm(booking.id)} className="text-red-400 h-7 w-7">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
                          <div>
                            <span className="text-slate-500 block">Timing</span>
                            <strong className="text-amber-300 text-[11px] sm:text-xs">
                              {booking.start_time && booking.end_time
                                ? `${format12Hr(booking.start_time)} - ${format12Hr(booking.end_time)}`
                                : booking.booking_time}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Ground</span>
                            <strong className="text-white text-[11px] sm:text-xs">{booking.area}</strong>
                          </div>
                        </div>

                        {booking.add_ons && booking.add_ons.length > 0 && (
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-xs space-y-0.5">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3 text-emerald-400" /> Add-ons:
                            </span>
                            {booking.add_ons.map((item, i) => (
                              <div key={i} className="flex justify-between text-slate-300">
                                <span>{item.name} x{item.qty}</span>
                                <span className="text-emerald-400 font-medium">₹{item.price * item.qty}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-400">Total Bill</span>
                            <p className="text-base sm:text-lg font-bold text-emerald-400">₹{booking.amount}</p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <Button size="sm" onClick={() => handleOpenPaymentModal(booking)} className="bg-emerald-600 text-white text-[10px] sm:text-xs h-7">
                              {booking.payment_status === 'paid' ? 'Paid' : 'Enter Paid Amount'}
                            </Button>
                            {booking.pending_amount && booking.pending_amount > 0 ? (
                              <Badge className="bg-red-950 text-red-400 border-red-800 text-[10px]">
                                Pending: ₹{booking.pending_amount}
                              </Badge>
                            ) : booking.payment_status === 'paid' ? (
                              <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Paid ({resolvePaymentMode(booking)})
                              </Badge>
                            ) : null}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setModifyTarget(booking)
                                setActualEndTimeInput(booking.actual_end_time || booking.end_time || '18:00')
                              }}
                              className="border-slate-700 text-slate-300 text-[10px] sm:text-xs h-7"
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setErrorMsg(null); } }}>
        <DialogContent
          className="w-[95vw] max-w-2xl max-h-[88dvh] overflow-y-auto bg-slate-900 text-white border-slate-800 p-4 sm:p-6 touch-smooth gpu-fast"
        >
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

              <div>
                <Label className="text-slate-300 text-xs">Actual Amount Paid Received (₹)</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={form.watch('paid_amount') ?? (form.watch('payment_status') === 'paid' ? grandTotal : 0)}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(grandTotal, Number(e.target.value)))
                      form.setValue('paid_amount', val)
                      if (val >= grandTotal) {
                        form.setValue('payment_status', 'paid')
                      } else {
                        form.setValue('payment_status', 'pending')
                      }
                    }}
                    placeholder="Enter paid amount..."
                    className="bg-slate-950/70 border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      form.setValue('paid_amount', grandTotal)
                      form.setValue('payment_status', 'paid')
                    }}
                    className="text-xs border-emerald-700/60 text-emerald-400 shrink-0"
                  >
                    Full Paid (₹{grandTotal})
                  </Button>
                </div>
                {grandTotal - (form.watch('paid_amount') ?? (form.watch('payment_status') === 'paid' ? grandTotal : 0)) > 0 && (
                  <p className="text-xs text-red-400 font-semibold mt-1">
                    Remaining Pending Balance: ₹{grandTotal - (form.watch('paid_amount') ?? (form.watch('payment_status') === 'paid' ? grandTotal : 0))}
                  </p>
                )}
              </div>

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
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mb-2 flex items-start gap-2 rounded-xl bg-red-950/60 border border-red-700/60 text-red-300 text-xs p-3"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                  <button className="ml-auto text-red-400 hover:text-red-200" onClick={() => setErrorMsg(null)}>✕</button>
                </motion.div>
              )}
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setErrorMsg(null) }} className="border-slate-700 text-slate-300">
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

      {/* Quick Payment Entry Modal */}
      <Dialog open={!!paymentModalBooking} onOpenChange={(open) => !open && setPaymentModalBooking(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800 max-w-md touch-smooth gpu-fast">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" /> Enter Paid Amount — {paymentModalBooking?.customer_name}
            </DialogTitle>
          </DialogHeader>

          {paymentModalBooking && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Booking Date & Time:</span>
                  <span className="font-medium text-white">{paymentModalBooking.booking_date} ({format12Hr(paymentModalBooking.start_time || '')})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Bill Amount:</span>
                  <span className="font-bold text-emerald-400 text-sm">₹{paymentModalBooking.amount}</span>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-xs mb-1 block">
                  Amount Received / Paid (₹)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={paymentModalBooking.amount}
                  value={paymentModalPaidInput}
                  onChange={(e) => setPaymentModalPaidInput(Number(e.target.value))}
                  className="bg-slate-950/70 border-slate-700 text-white text-sm"
                />
                <div className="flex justify-between items-center text-xs mt-2 p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span>
                    Remaining Pending:{' '}
                    <strong className={paymentModalBooking.amount - paymentModalPaidInput > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      ₹{Math.max(0, paymentModalBooking.amount - paymentModalPaidInput)}
                    </strong>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPaymentModalPaidInput(paymentModalBooking.amount)}
                    className="text-[11px] h-7 border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40"
                  >
                    Full Paid (₹{paymentModalBooking.amount})
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button variant="outline" onClick={() => setPaymentModalBooking(null)} className="border-slate-700 text-slate-300 text-xs">
                  Cancel
                </Button>
                <Button onClick={handleSavePaymentModal} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                  Save Payment
                </Button>
              </DialogFooter>
            </div>
          )}
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

      {/* ─── Booking Success Flash Overlay ─── */}
      <AnimatePresence>
        {successFlash && (
          <motion.div
            key="success-flash"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          >
            {/* Radial burst backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative z-10 flex flex-col items-center gap-4 bg-slate-900/95 border border-emerald-700/60 rounded-3xl px-10 py-8 shadow-2xl shadow-emerald-900/40"
            >
              {/* Animated circle pulse */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.25, 1] }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/60"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </motion.div>
              </motion.div>
              {/* Ripple rings */}
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full border border-emerald-500/30"
                  style={{ width: 80, height: 80 }}
                  initial={{ opacity: 0.7, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.8 }}
                  transition={{ delay: i * 0.18, duration: 0.9, ease: 'easeOut' }}
                />
              ))}
              <div className="text-center">
                <p className="text-2xl font-bold text-white">Booking Created!</p>
                <p className="text-slate-400 text-sm mt-1">{successFlash.name} has been booked successfully.</p>
              </div>
              {/* Progress bar */}
              <motion.div
                className="h-0.5 rounded-full bg-emerald-500/80 w-full"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 1.7, ease: 'linear' }}
                style={{ originX: 1 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
