import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useLabour,
  useCreateLabour,
  useCreateLabourPayment,
  useDeleteLabour,
  useLiabilities,
  useCreateLiability,
  useCreateLiabilityPayment,
  useDeleteLiability,
} from '@/services/accounts-service'
import type { Expense, Labour, LabourPayment, Liability } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState, PageLoadingState } from '@/components/common/loading'
import { EmptyState } from '@/components/common/empty-state'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Search,
  Wallet,
  Users,
  CreditCard,
  Trash2,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Clock,
  ChevronRight,
  History,
  X,
  CheckCircle2,
  Filter,
  ArrowDownLeft,
} from 'lucide-react'
import { formatCurrency, formatDate, cn, getInitials } from '@/lib/utils'

const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  amount: z.number().min(0, 'Invalid amount'),
  category: z.string().min(1, 'Category is required'),
})

const labourSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Invalid phone number'),
  role: z.string().min(1, 'Role is required'),
})

const labourPaymentSchema = z.object({
  labour_id: z.string().min(1, 'Labour is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0, 'Invalid amount'),
  remarks: z.string().nullable().optional(),
})

const liabilitySchema = z.object({
  person_name: z.string().min(2, 'Name is required'),
  original_amount: z.number().min(0, 'Invalid amount'),
  outstanding_amount: z.number().min(0, 'Invalid amount'),
  description: z.string().nullable().optional(),
})

const liabilityPaymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
})

type ExpenseFormData = z.infer<typeof expenseSchema>
type LabourFormData = z.infer<typeof labourSchema>
type LabourPaymentFormData = z.infer<typeof labourPaymentSchema>
type LiabilityFormData = z.infer<typeof liabilitySchema>
type LiabilityPaymentFormData = z.infer<typeof liabilityPaymentSchema>

const expenseCategories = [
  'Equipment', 'Maintenance', 'Utilities', 'Supplies',
  'Rent', 'Marketing', 'Insurance', 'Salaries', 'Transportation', 'Other',
]

// Group items by date key
function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = item.date
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// Labour Detail Panel
function LabourDetailPanel({
  labour,
  onClose,
  onAddPayment,
  onDelete,
}: {
  labour: Labour
  onClose: () => void
  onAddPayment: (labourId: string) => void
  onDelete: (id: string) => void
}) {
  const payments = [...(labour.payments || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const grouped = groupByDate(payments)
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg">
                  {getInitials(labour.name)}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">{labour.name}</h2>
                  <p className="text-amber-300/80 text-sm">{labour.role}</p>
                  {labour.phone && (
                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {labour.phone}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-0.5">Total Paid</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-0.5">Payments</p>
                <p className="text-xl font-bold text-white">{payments.length}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
            <Button
              size="sm"
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
              onClick={() => onAddPayment(labour.id)}
            >
              <IndianRupee className="w-3.5 h-3.5 mr-1" /> Add Payment
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-800/60 text-red-400 hover:bg-red-950/40"
              onClick={() => onDelete(labour.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Date-wise payment history */}
          <ScrollArea className="max-h-[50vh] sm:max-h-[40vh]">
            <div className="px-5 py-4">
              {sortedDates.length === 0 ? (
                <div className="py-8 text-center">
                  <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No payments recorded yet</p>
                  <p className="text-slate-600 text-xs">Click "Add Payment" to record first payment</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Date-wise Payment History
                  </p>
                  {sortedDates.map((date) => {
                    const dayPayments = grouped[date]
                    const dayTotal = dayPayments.reduce((s, p) => s + Number(p.amount), 0)
                    return (
                      <div key={date}>
                        {/* Date header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-sm font-semibold text-white">{formatDate(date)}</span>
                          </div>
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full">
                            {formatCurrency(dayTotal)}
                          </span>
                        </div>
                        {/* Payments on this date */}
                        <div className="ml-4 space-y-2 border-l-2 border-slate-700/60 pl-4">
                          {dayPayments.map((p, i) => (
                            <div
                              key={p.id || i}
                              className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                                  <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{formatCurrency(p.amount)}</p>
                                  {p.remarks && (
                                    <p className="text-xs text-slate-400">{p.remarks}</p>
                                  )}
                                </div>
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function AccountsPage() {
  const [activeTab, setActiveTab] = useState('expenses')
  const [searchQuery, setSearchQuery] = useState('')
  // Date filter state
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isLabourDialogOpen, setIsLabourDialogOpen] = useState(false)
  const [isLabourPaymentDialogOpen, setIsLabourPaymentDialogOpen] = useState(false)
  const [isLiabilityDialogOpen, setIsLiabilityDialogOpen] = useState(false)
  const [isLiabilityPaymentDialogOpen, setIsLiabilityPaymentDialogOpen] = useState(false)
  const [selectedLabourId, setSelectedLabourId] = useState<string | null>(null)
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null)

  // Labour detail panel
  const [detailLabour, setDetailLabour] = useState<Labour | null>(null)

  const { data: expenses, isLoading: expensesLoading } = useExpenses()
  const { data: labour, isLoading: labourLoading } = useLabour()
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilities()

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createLabour = useCreateLabour()
  const createLabourPayment = useCreateLabourPayment()
  const deleteLabour = useDeleteLabour()
  const createLiability = useCreateLiability()
  const createLiabilityPayment = useCreateLiabilityPayment()
  const deleteLiability = useDeleteLiability()

  const { toast } = useToast()

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      amount: 0,
      category: '',
    },
  })

  const labourForm = useForm<LabourFormData>({
    resolver: zodResolver(labourSchema),
    defaultValues: { name: '', phone: '', role: '' },
  })

  const labourPaymentForm = useForm<LabourPaymentFormData>({
    resolver: zodResolver(labourPaymentSchema),
    defaultValues: {
      labour_id: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      remarks: '',
    },
  })

  const liabilityForm = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema),
    defaultValues: {
      person_name: '',
      original_amount: 0,
      outstanding_amount: 0,
      description: '',
    },
  })

  const liabilityPaymentForm = useForm<LiabilityPaymentFormData>({
    resolver: zodResolver(liabilityPaymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
  })

  // --- Filtered expenses ---
  const filteredExpenses = (expenses || []).filter((e) => {
    const matchesSearch =
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const afterStart = !filterStartDate || e.date >= filterStartDate
    const beforeEnd = !filterEndDate || e.date <= filterEndDate
    return matchesSearch && afterStart && beforeEnd
  })

  // Group expenses by date (most recent first)
  const expensesByDate = groupByDate(filteredExpenses)
  const expenseDateKeys = Object.keys(expensesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // --- Filtered labour ---
  const filteredLabour = (labour || []).filter((l) =>
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone?.includes(searchQuery)
  )

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalLabourPaid = (labour || []).reduce((sum, l) => sum + (l.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0)
  const totalLiabilitiesOutstanding = (liabilities || []).filter(l => !l.is_completed).reduce((sum, l) => sum + Number(l.outstanding_amount), 0)

  const handleOpenLabourPayment = (labourId: string) => {
    setSelectedLabourId(labourId)
    labourPaymentForm.reset({
      labour_id: labourId,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      remarks: '',
    })
    setDetailLabour(null)
    setIsLabourPaymentDialogOpen(true)
  }

  const handleDeleteLabour = (id: string) => {
    setDetailLabour(null)
    setDeleteConfirm({ type: 'labour', id })
  }

  if (expensesLoading && labourLoading && liabilitiesLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      {/* Labour Detail Panel */}
      {detailLabour && (
        <LabourDetailPanel
          labour={detailLabour}
          onClose={() => setDetailLabour(null)}
          onAddPayment={handleOpenLabourPayment}
          onDelete={handleDeleteLabour}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage expenses, labour, and liabilities</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
                {(filterStartDate || filterEndDate) && (
                  <p className="text-xs text-muted-foreground mt-0.5">filtered view</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Labour Payments</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLabourPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Liabilities</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLiabilitiesOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(''); setFilterStartDate(''); setFilterEndDate('') }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
        </TabsList>

        {/* ─── EXPENSES TAB ─── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col gap-3">
            {/* Search + Date Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => { expenseForm.reset({ date: new Date().toISOString().split('T')[0], title: '', description: '', amount: 0, category: '' }); setIsExpenseDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </div>

            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 font-medium">Filter by date:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">From</span>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="h-7 text-xs bg-slate-950 border-slate-700 w-36 px-2"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">To</span>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="h-7 text-xs bg-slate-950 border-slate-700 w-36 px-2"
                  />
                </div>
                {(filterStartDate || filterEndDate) && (
                  <button
                    onClick={() => { setFilterStartDate(''); setFilterEndDate('') }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              {filteredExpenses.length > 0 && (
                <span className="ml-auto text-xs text-emerald-400 font-medium">
                  {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses found"
              description={filterStartDate || filterEndDate || searchQuery ? 'No expenses match your filters' : 'Add your first expense to start tracking'}
              action={{ label: 'Add Expense', onClick: () => setIsExpenseDialogOpen(true) }}
            />
          ) : (
            <div className="space-y-6">
              {expenseDateKeys.map((date) => {
                const dayExpenses = expensesByDate[date]
                const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)
                return (
                  <div key={date}>
                    {/* Date group header */}
                    <div className="flex items-center justify-between mb-3 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-white">{formatDate(date)}</span>
                        <Badge variant="secondary" className="text-xs">{dayExpenses.length} item{dayExpenses.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      <span className="text-sm font-bold text-red-400">{formatCurrency(dayTotal)}</span>
                    </div>

                    <div className="space-y-2 border-l-2 border-slate-800 pl-4">
                      {dayExpenses.map((expense, index) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <Card className="hover:shadow-soft transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="h-9 w-9 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-center shrink-0 mt-0.5">
                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <h3 className="font-semibold truncate">{expense.title}</h3>
                                      <Badge variant="secondary" className="text-xs shrink-0">{expense.category}</Badge>
                                    </div>
                                    {expense.description && (
                                      <p className="text-sm text-muted-foreground truncate">{expense.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-base font-bold text-destructive">-{formatCurrency(expense.amount)}</span>
                                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm({ type: 'expense', id: expense.id })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── LABOUR TAB ─── */}
        <TabsContent value="labour" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search labour by name, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setSelectedLabourId(null); labourPaymentForm.reset({ labour_id: '', date: new Date().toISOString().split('T')[0], amount: 0, remarks: '' }); setIsLabourPaymentDialogOpen(true) }}>
                <IndianRupee className="mr-2 h-4 w-4" /> Add Payment
              </Button>
              <Button onClick={() => { labourForm.reset(); setIsLabourDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Add Labour
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 -mt-1">
            <History className="w-3.5 h-3.5" />
            Click on a labour card to view date-wise payment history
          </div>

          {filteredLabour.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No labour records"
              description="Add your first labour to start tracking"
              action={{ label: 'Add Labour', onClick: () => setIsLabourDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLabour.map((l, index) => {
                const totalPaid = (l.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
                const lastPayment = [...(l.payments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="hover:shadow-lg transition-all cursor-pointer border-slate-800 hover:border-amber-700/50 group relative overflow-hidden"
                      onClick={() => setDetailLabour(l)}
                    >
                      {/* Click hint */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      </div>

                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-base">
                            {getInitials(l.name)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{l.name}</CardTitle>
                            <CardDescription>{l.role}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {l.phone}
                          </div>
                          <Separator />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Paid</span>
                            <span className="font-bold text-amber-400">{formatCurrency(totalPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payments</span>
                            <span className="font-medium">{l.payments?.length || 0}</span>
                          </div>
                          {lastPayment && (
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Last paid</span>
                              <span className="text-slate-400">{formatDate(lastPayment.date)}</span>
                            </div>
                          )}
                          {/* Pay quick button */}
                          <Button
                            size="sm"
                            className="w-full mt-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-700/30"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenLabourPayment(l.id)
                            }}
                          >
                            <IndianRupee className="w-3.5 h-3.5 mr-1" /> Pay
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── LIABILITIES TAB ─── */}
        <TabsContent value="liabilities" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search liabilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Outstanding: <strong className="text-destructive">{formatCurrency(totalLiabilitiesOutstanding)}</strong>
              </p>
            </div>
            <Button onClick={() => { liabilityForm.reset({ person_name: '', original_amount: 0, outstanding_amount: 0, description: '' }); setIsLiabilityDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Liability
            </Button>
          </div>

          {(liabilities || []).filter(l => !l.is_completed).length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No liabilities"
              description="All caught up! No outstanding liabilities."
              action={{ label: 'Add Liability', onClick: () => setIsLiabilityDialogOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {(liabilities || [])
                .filter(l => !l.is_completed && (
                  !searchQuery ||
                  l.person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  l.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ))
                .map((l, index) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-soft transition-shadow border-l-4 border-l-destructive/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold">{l.person_name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {l.payments?.length || 0} payments
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{l.description}</p>
                            <div className="flex gap-4 mt-2 text-sm flex-wrap">
                              <span className="text-muted-foreground">Original: <span className="font-medium text-foreground">{formatCurrency(l.original_amount)}</span></span>
                              <span className="text-muted-foreground">Outstanding: <span className="font-bold text-destructive">{formatCurrency(l.outstanding_amount)}</span></span>
                            </div>
                            {/* Date-wise payments mini history */}
                            {l.payments && l.payments.length > 0 && (
                              <div className="mt-3 space-y-1.5 border-t border-slate-800 pt-2.5">
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                  <ArrowDownLeft className="w-3 h-3" /> Payment history
                                </p>
                                {[...l.payments]
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .slice(0, 3)
                                  .map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 rounded-lg px-3 py-1.5">
                                      <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        {formatDate(p.date)}
                                      </span>
                                      <span className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</span>
                                    </div>
                                  ))}
                                {l.payments.length > 3 && (
                                  <p className="text-xs text-slate-600 pl-1">+{l.payments.length - 3} more payments</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLiabilityId(l.id)
                                liabilityPaymentForm.reset({ amount: 0, date: new Date().toISOString().split('T')[0] })
                                setIsLiabilityPaymentDialogOpen(true)
                              }}
                            >
                              <IndianRupee className="mr-1 h-3 w-3" /> Pay
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm({ type: 'liability', id: l.id })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Expense Dialog ── */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit(async (data) => {
            try {
              await createExpense.mutateAsync(data as Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Expense added' })
              expenseForm.reset({ date: new Date().toISOString().split('T')[0], title: '', description: '', amount: 0, category: '' })
              setIsExpenseDialogOpen(false)
            } catch {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add expense' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...expenseForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Expense title" {...expenseForm.register('title')} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={expenseForm.watch('category')} onValueChange={(v) => expenseForm.setValue('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {...expenseForm.register('amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" {...expenseForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpense.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Labour Dialog ── */}
      <Dialog open={isLabourDialogOpen} onOpenChange={setIsLabourDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Labour</DialogTitle>
          </DialogHeader>
          <form onSubmit={labourForm.handleSubmit(async (data) => {
            try {
              await createLabour.mutateAsync(data as Omit<Labour, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Labour added' })
              setIsLabourDialogOpen(false)
            } catch {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add labour' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Full name" {...labourForm.register('name')} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="9876543210" {...labourForm.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input placeholder="e.g., Groundskeeper" {...labourForm.register('role')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLabourDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLabour.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Labour Payment Dialog ── */}
      <Dialog open={isLabourPaymentDialogOpen} onOpenChange={setIsLabourPaymentDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Labour Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={labourPaymentForm.handleSubmit(async (data) => {
            try {
              await createLabourPayment.mutateAsync(data as Omit<LabourPayment, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Payment recorded' })
              labourPaymentForm.reset({ labour_id: '', date: new Date().toISOString().split('T')[0], amount: 0, remarks: '' })
              setIsLabourPaymentDialogOpen(false)
            } catch {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add payment' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Labour</Label>
              <Select value={labourPaymentForm.watch('labour_id')} onValueChange={(v) => labourPaymentForm.setValue('labour_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select labour" /></SelectTrigger>
                <SelectContent>
                  {(labour || []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {l.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...labourPaymentForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {...labourPaymentForm.register('amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea placeholder="Optional notes (e.g., Weekly salary, Bonus)" {...labourPaymentForm.register('remarks')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLabourPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLabourPayment.isPending}>Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Liability Dialog ── */}
      <Dialog open={isLiabilityDialogOpen} onOpenChange={setIsLiabilityDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Liability</DialogTitle>
          </DialogHeader>
          <form onSubmit={liabilityForm.handleSubmit(async (data) => {
            try {
              await createLiability.mutateAsync({ ...data, outstanding_amount: data.original_amount } as Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed'>)
              toast({ title: 'Liability added' })
              liabilityForm.reset({ person_name: '', original_amount: 0, outstanding_amount: 0, description: '' })
              setIsLiabilityDialogOpen(false)
            } catch {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add liability' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Person Name</Label>
              <Input placeholder="Who do you owe / who owes you?" {...liabilityForm.register('person_name')} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {...liabilityForm.register('original_amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What is this liability for?" {...liabilityForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLiabilityDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLiability.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Liability Payment Dialog ── */}
      <Dialog open={isLiabilityPaymentDialogOpen} onOpenChange={setIsLiabilityPaymentDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={liabilityPaymentForm.handleSubmit(async (data) => {
            if (!selectedLiabilityId) return
            try {
              await createLiabilityPayment.mutateAsync({
                liabilityId: selectedLiabilityId,
                amount: data.amount,
                date: data.date,
              })
              toast({ title: 'Payment recorded' })
              liabilityPaymentForm.reset({ amount: 0, date: new Date().toISOString().split('T')[0] })
              setIsLiabilityPaymentDialogOpen(false)
            } catch {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...liabilityPaymentForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" {...liabilityPaymentForm.register('amount', { valueAsNumber: true })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLiabilityPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLiabilityPayment.isPending}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleteConfirm) return
              try {
                if (deleteConfirm.type === 'expense') await deleteExpense.mutateAsync(deleteConfirm.id)
                else if (deleteConfirm.type === 'labour') await deleteLabour.mutateAsync(deleteConfirm.id)
                else if (deleteConfirm.type === 'liability') await deleteLiability.mutateAsync(deleteConfirm.id)
                toast({ title: 'Deleted successfully' })
                setDeleteConfirm(null)
              } catch {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' })
              }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
