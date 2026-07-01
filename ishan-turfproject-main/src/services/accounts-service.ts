import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Expense, Labour, LabourPayment, Liability, LiabilityPayment, Customer } from '@/types/database'

export function useExpenses() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['expenses', user?.id],
    queryFn: async (): Promise<Expense[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []) as Expense[]
    },
    enabled: !!user,
  })
}

export function useCreateExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export interface LabourWithPayments extends Labour {
  payments: LabourPayment[]
}

export function useLabour() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['labour', user?.id],
    queryFn: async (): Promise<LabourWithPayments[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data: labour, error } = await supabase
        .from('labour')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: payments } = await supabase
        .from('labour_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const labourList = (labour || []) as Labour[]
      const paymentsList = (payments || []) as LabourPayment[]

      return labourList.map((l) => ({
        ...l,
        payments: paymentsList.filter((p) => p.labour_id === l.id),
      }))
    },
    enabled: !!user,
  })
}

export function useCreateLabour() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (labour: Omit<Labour, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('labour')
        .insert({ ...labour, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
    },
  })
}

export function useCreateLabourPayment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payment: Omit<LabourPayment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('labour_payments')
        .insert({ ...payment, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
    },
  })
}

export function useDeleteLabour() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('labour')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labour'] })
    },
  })
}

export interface LiabilityWithPayments extends Liability {
  payments: LiabilityPayment[]
}

export function useLiabilities() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['liabilities', user?.id],
    queryFn: async (): Promise<LiabilityWithPayments[]> => {
      if (!user) throw new Error('Not authenticated')

      const { data: liabilities, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: payments } = await supabase
        .from('liability_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const liabilitiesList = (liabilities || []) as Liability[]
      const paymentsList = (payments || []) as LiabilityPayment[]

      return liabilitiesList.map((l) => ({
        ...l,
        payments: paymentsList.filter((p) => p.liability_id === l.id),
      }))
    },
    enabled: !!user,
  })
}

export function useCreateLiability() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (liability: Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed'>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('liabilities')
        .insert({ ...liability, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
    },
  })
}

export function useCreateLiabilityPayment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ liabilityId, amount, date }: { liabilityId: string; amount: number; date: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { data: liability } = await supabase
        .from('liabilities')
        .select('*')
        .eq('id', liabilityId)
        .single()

      if (!liability) throw new Error('Liability not found')

      const typedLiability = liability as Liability
      const newOutstanding = Number(typedLiability.outstanding_amount) - amount
      const isCompleted = newOutstanding <= 0

      const { error: updateError } = await supabase
        .from('liabilities')
        .update({
          outstanding_amount: Math.max(0, newOutstanding),
          is_completed: isCompleted,
        })
        .eq('id', liabilityId)

      if (updateError) throw updateError

      const { data, error } = await supabase
        .from('liability_payments')
        .insert({
          liability_id: liabilityId,
          amount,
          date,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
    },
  })
}

export function useDeleteLiability() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] })
    },
  })
}
