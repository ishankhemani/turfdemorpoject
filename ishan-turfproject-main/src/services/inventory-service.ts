import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { InventoryItem, InventorySale } from '@/types/database'

export const DEFAULT_INVENTORY_ITEMS = [
  { name: 'Mountain Dew', category: 'Cold Drinks', default_price: 30, quantity: 0 },
  { name: 'Pepsi', category: 'Cold Drinks', default_price: 30, quantity: 0 },
  { name: 'Mirinda', category: 'Cold Drinks', default_price: 30, quantity: 0 },
  { name: 'Water Bottle', category: 'Cold Drinks', default_price: 20, quantity: 0 },
  { name: 'Campa Energy', category: 'Energy Drinks', default_price: 40, quantity: 0 },
  { name: 'Campa Cola', category: 'Energy Drinks', default_price: 40, quantity: 0 },
  { name: 'Campa Orange', category: 'Energy Drinks', default_price: 40, quantity: 0 },
  { name: 'Hell', category: 'Energy Drinks', default_price: 70, quantity: 0 },
  { name: 'Predator', category: 'Energy Drinks', default_price: 70, quantity: 0 },
  { name: 'Red Bull', category: 'Energy Drinks', default_price: 130, quantity: 0 },
  { name: 'Kesar Doodh', category: 'Hot/Cold Beverages', default_price: 30, quantity: 0 },
  { name: 'Kesar Coffee', category: 'Hot/Cold Beverages', default_price: 40, quantity: 0 },
  { name: 'Ball', category: 'Equipment', default_price: 80, quantity: 0 },
]

const LOCAL_STORAGE_INVENTORY_KEY = 'turf_pos_inventory_items'
const LOCAL_STORAGE_SALES_KEY = 'turf_pos_inventory_sales'

function getLocalInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVENTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed reading local inventory', e)
  }
  // Default fallback if empty
  const defaults: InventoryItem[] = DEFAULT_INVENTORY_ITEMS.map((item, index) => ({
    id: `local-inv-${index}`,
    name: item.name,
    category: item.category,
    default_price: item.default_price,
    quantity: item.quantity,
    last_edited: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user_id: 'local',
  }))
  localStorage.setItem(LOCAL_STORAGE_INVENTORY_KEY, JSON.stringify(defaults))
  return defaults
}

function saveLocalInventory(items: InventoryItem[]) {
  localStorage.setItem(LOCAL_STORAGE_INVENTORY_KEY, JSON.stringify(items))
}

function getLocalSales(): InventorySale[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SALES_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed reading local sales', e)
  }
  return []
}

function saveLocalSales(sales: InventorySale[]) {
  localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(sales))
}

export function useInventoryItems() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['inventory-items', user?.id],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!user) return getLocalInventory()

      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('user_id', user.id)
          .order('name')

        if (error) throw error

        if (!data || data.length === 0) {
          // Pre-seed table if empty
          const toInsert = DEFAULT_INVENTORY_ITEMS.map(item => ({
            ...item,
            user_id: user.id,
            last_edited: new Date().toISOString()
          }))
          const { data: inserted, error: insertErr } = await supabase
            .from('inventory_items')
            .insert(toInsert)
            .select()

          if (!insertErr && inserted && inserted.length > 0) {
            return inserted as InventoryItem[]
          }
          return getLocalInventory()
        }

        return data as InventoryItem[]
      } catch (e) {
        console.warn('Using local inventory fallback', e)
        return getLocalInventory()
      }
    },
    enabled: true,
  })
}

export function useUpdateInventoryStock() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, quantity, default_price }: { id: string; quantity?: number; default_price?: number }) => {
      if (user) {
        try {
          const updates: Record<string, any> = { last_edited: new Date().toISOString() }
          if (quantity !== undefined) updates.quantity = quantity
          if (default_price !== undefined) updates.default_price = default_price

          const { error } = await supabase
            .from('inventory_items')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)

          if (!error) return
        } catch (e) {
          console.warn('Supabase inventory update failed, updating local state', e)
        }
      }

      // Local fallback
      const local = getLocalInventory()
      const updated = local.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...(quantity !== undefined ? { quantity } : {}),
            ...(default_price !== undefined ? { default_price } : {}),
            last_edited: new Date().toISOString()
          }
        }
        return item
      })
      saveLocalInventory(updated)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

export function useRecordInventorySales() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sales: Array<{ item_name: string; qty_sold: number; amount: number; booking_id?: string }>) => {
      const today = new Date().toISOString().split('T')[0]

      if (user) {
        try {
          const rows = sales.map(s => ({
            user_id: user.id,
            item_name: s.item_name,
            qty_sold: s.qty_sold,
            amount: s.amount,
            date: today,
            booking_id: s.booking_id || null
          }))

          await supabase.from('inventory_sales').insert(rows)

          // Deduct quantities from inventory items
          const { data: invItems } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('user_id', user.id)

          if (invItems) {
            for (const sale of sales) {
              const matched = invItems.find((i: InventoryItem) => i.name.toLowerCase() === sale.item_name.toLowerCase())
              if (matched) {
                const newQty = Math.max(0, matched.quantity - sale.qty_sold)
                await supabase
                  .from('inventory_items')
                  .update({ quantity: newQty, last_edited: new Date().toISOString() })
                  .eq('id', matched.id)
              }
            }
          }
        } catch (e) {
          console.warn('Supabase sales logging failed, saving locally', e)
        }
      }

      // Update local storage
      const localInv = getLocalInventory()
      sales.forEach(sale => {
        const itemIndex = localInv.findIndex(i => i.name.toLowerCase() === sale.item_name.toLowerCase())
        if (itemIndex >= 0) {
          localInv[itemIndex].quantity = Math.max(0, localInv[itemIndex].quantity - sale.qty_sold)
          localInv[itemIndex].last_edited = new Date().toISOString()
        }
      })
      saveLocalInventory(localInv)

      const localSales = getLocalSales()
      sales.forEach(sale => {
        localSales.push({
          id: `local-sale-${Date.now()}-${Math.random()}`,
          created_at: new Date().toISOString(),
          item_name: sale.item_name,
          date: today,
          qty_sold: sale.qty_sold,
          amount: sale.amount,
          booking_id: sale.booking_id || null,
          user_id: user?.id || 'local'
        })
      })
      saveLocalSales(localSales)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
    }
  })
}

export function useInventorySales(date?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['inventory-sales', user?.id, date],
    queryFn: async (): Promise<InventorySale[]> => {
      const selectedDate = date || new Date().toISOString().split('T')[0]

      if (user) {
        try {
          const { data, error } = await supabase
            .from('inventory_sales')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', selectedDate)

          if (!error && data) return data as InventorySale[]
        } catch (e) {
          console.warn('Supabase sales fetch failed, using local fallback', e)
        }
      }

      const local = getLocalSales()
      return local.filter(s => s.date === selectedDate)
    },
    enabled: true
  })
}
