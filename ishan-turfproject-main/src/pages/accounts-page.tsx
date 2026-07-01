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
import {
  Plus,
  Search,
  Wallet,
  Users,
  CreditCard,
  Edit,
  Trash2,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Clock,
  User,
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
  'Equipment',
  'Maintenance',
  'Utilities',
  'Supplies',
  'Rent',
  'Marketing',
  'Insurance',
  'Salaries',
  'Transportation',
  'Other',
]

export function AccountsPage() {
  const [activeTab, setActiveTab] = useState('expenses')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isLabourDialogOpen, setIsLabourDialogOpen] = useState(false)
  const [isLabourPaymentDialogOpen, setIsLabourPaymentDialogOpen] = useState(false)
  const [isLiabilityDialogOpen, setIsLiabilityDialogOpen] = useState(false)
  const [isLiabilityPaymentDialogOpen, setIsLiabilityPaymentDialogOpen] = useState(false)
  const [selectedLabourId, setSelectedLabourId] = useState<string | null>(null)
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null)

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

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0)
  const totalLabourPaid = (labour || []).reduce((sum, l) => sum + (l.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0)
  const totalLiabilitiesOutstanding = (liabilities || []).filter(l => !l.is_completed).reduce((sum, l) => sum + Number(l.outstanding_amount), 0)

  if (expensesLoading && labourLoading && liabilitiesLoading) {
    return <PageLoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage expenses, labour, and liabilities</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => { expenseForm.reset(); setIsExpenseDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>

          {(expenses || []).length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses"
              description="Add your first expense to start tracking"
              action={{ label: 'Add Expense', onClick: () => setIsExpenseDialogOpen(true) }}
            />
          ) : (
            <div className="space-y-3">
              {(expenses || []).map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-soft transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{expense.title}</h3>
                            <Badge variant="secondary">{expense.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(expense.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-destructive">-{formatCurrency(expense.amount)}</span>
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
          )}
        </TabsContent>

        <TabsContent value="labour" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search labour..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsLabourPaymentDialogOpen(true)}>
                <IndianRupee className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
              <Button onClick={() => { labourForm.reset(); setIsLabourDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Labour
              </Button>
            </div>
          </div>

          {(labour || []).length === 0 ? (
            <EmptyState
              icon={Users}
              title="No labour records"
              description="Add your first labour to start tracking"
              action={{ label: 'Add Labour', onClick: () => setIsLabourDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(labour || []).map((l, index) => {
                const totalPaid = (l.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-soft transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning font-semibold">
                              {getInitials(l.name)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{l.name}</CardTitle>
                              <CardDescription>{l.role}</CardDescription>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm({ type: 'labour', id: l.id })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {l.phone}
                          </div>
                          <Separator />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total Paid</span>
                            <span className="font-semibold">{formatCurrency(totalPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Payments</span>
                            <span className="font-medium">{l.payments?.length || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liabilities" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Track money you owe or are owed. Outstanding: {formatCurrency(totalLiabilitiesOutstanding)}
            </p>
            <Button onClick={() => { liabilityForm.reset(); setIsLiabilityDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Liability
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
              {(liabilities || []).filter(l => !l.is_completed).map((l, index) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-soft transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{l.person_name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {l.payments?.length || 0} payments
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{l.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">Original: <span className="font-medium text-foreground">{formatCurrency(l.original_amount)}</span></span>
                            <span className="text-muted-foreground">Outstanding: <span className="font-bold text-destructive">{formatCurrency(l.outstanding_amount)}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLiabilityId(l.id)
                              liabilityPaymentForm.reset({ amount: 0, date: new Date().toISOString().split('T')[0] })
                              setIsLiabilityPaymentDialogOpen(true)
                            }}
                          >
                            <IndianRupee className="mr-1 h-3 w-3" />
                            Pay
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

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit(async (data) => {
            try {
              await createExpense.mutateAsync(data as Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Expense added' })
              expenseForm.reset({ date: new Date().toISOString().split('T')[0], title: '', description: '', amount: 0, category: '' })
              setIsExpenseDialogOpen(false)
            } catch (error) {
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
              <Input type="number" min="0" step="1" placeholder="0" {...expenseForm.register('amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" {...expenseForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createExpense.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Labour Dialog */}
      <Dialog open={isLabourDialogOpen} onOpenChange={setIsLabourDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Labour</DialogTitle>
          </DialogHeader>
          <form onSubmit={labourForm.handleSubmit(async (data) => {
            try {
              await createLabour.mutateAsync(data as Omit<Labour, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Labour added' })
              setIsLabourDialogOpen(false)
            } catch (error) {
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
              <Button type="submit" loading={createLabour.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Labour Payment Dialog */}
      <Dialog open={isLabourPaymentDialogOpen} onOpenChange={setIsLabourPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Labour Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={labourPaymentForm.handleSubmit(async (data) => {
            try {
              await createLabourPayment.mutateAsync(data as Omit<LabourPayment, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
              toast({ title: 'Payment recorded' })
              labourPaymentForm.reset({ labour_id: selectedLabourId || '', date: new Date().toISOString().split('T')[0], amount: 0, remarks: '' })
              setIsLabourPaymentDialogOpen(false)
            } catch (error) {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add payment' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Labour</Label>
              <Select value={labourPaymentForm.watch('labour_id')} onValueChange={(v) => labourPaymentForm.setValue('labour_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select labour" /></SelectTrigger>
                <SelectContent>
                  {(labour || []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
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
              <Input type="number" min="0" step="1" placeholder="0" {...labourPaymentForm.register('amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea placeholder="Optional notes" {...labourPaymentForm.register('remarks')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLabourPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createLabourPayment.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Liability Dialog */}
      <Dialog open={isLiabilityDialogOpen} onOpenChange={setIsLiabilityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Liability</DialogTitle>
          </DialogHeader>
          <form onSubmit={liabilityForm.handleSubmit(async (data) => {
            try {
              await createLiability.mutateAsync({ ...data, outstanding_amount: data.original_amount } as Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed'>)
              toast({ title: 'Liability added' })
              liabilityForm.reset({ person_name: '', original_amount: 0, outstanding_amount: 0, description: '' })
              setIsLiabilityDialogOpen(false)
            } catch (error) {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to add liability' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Person Name</Label>
              <Input placeholder="Who do you owe / who owes you?" {...liabilityForm.register('person_name')} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" {...liabilityForm.register('original_amount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What is this liability for?" {...liabilityForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLiabilityDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createLiability.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Liability Payment Dialog */}
      <Dialog open={isLiabilityPaymentDialogOpen} onOpenChange={setIsLiabilityPaymentDialogOpen}>
        <DialogContent>
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
            } catch (error) {
              toast({ variant: 'destructive', title: 'Error', description: 'Failed to record payment' })
            }
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...liabilityPaymentForm.register('date')} />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="1" placeholder="0" {...liabilityPaymentForm.register('amount', { valueAsNumber: true })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLiabilityPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createLiabilityPayment.isPending}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
              } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' })
              }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
