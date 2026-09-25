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
// Bump this version string whenever the default inventory list changes.
// Any cached data from a prior version is discarded and re-initialised with quantity = 0.
const INVENTORY_VERSION = 'v2-qty0'
const LOCAL_STORAGE_INVENTORY_VERSION_KEY = 'turf_pos_inventory_version'

function buildDefaultInventory(): InventoryItem[] {
  return DEFAULT_INVENTORY_ITEMS.map((item, index) => ({
    id: `local-inv-${index}`,
    name: item.name,
    category: item.category,
    default_price: item.default_price,
    quantity: 0, // always start at 0 — owner stocks up manually
    last_edited: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user_id: 'local',
  }))
}

function getLocalInventory(): InventoryItem[] {
  try {
    const storedVersion = localStorage.getItem(LOCAL_STORAGE_INVENTORY_VERSION_KEY)
    const raw = localStorage.getItem(LOCAL_STORAGE_INVENTORY_KEY)

    if (storedVersion === INVENTORY_VERSION && raw) {
      return JSON.parse(raw) as InventoryItem[]
    }

    // Version mismatch or missing — wipe old cache and seed fresh with qty = 0
    const defaults = buildDefaultInventory()
    localStorage.setItem(LOCAL_STORAGE_INVENTORY_KEY, JSON.stringify(defaults))
    localStorage.setItem(LOCAL_STORAGE_INVENTORY_VERSION_KEY, INVENTORY_VERSION)
    return defaults
  } catch (e) {
    console.error('Failed reading local inventory', e)
    return buildDefaultInventory()
  }
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
          // Table empty — seed with all quantities = 0
          const toInsert = DEFAULT_INVENTORY_ITEMS.map(item => ({
            name: item.name,
            category: item.category,
            default_price: item.default_price,
            quantity: 0,
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

        // Deduplicate by item name (case-insensitive) to avoid duplicate rows
        const seen = new Map<string, InventoryItem>()
        ;(data as InventoryItem[]).forEach((row) => {
          const key = (row.name || '').trim().toLowerCase()
          if (!seen.has(key)) seen.set(key, row)
        })
        return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
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
    mutationFn: async ({
      id,
      quantity,
      default_price,
      restocked_qty,
    }: {
      id: string
      quantity?: number
      default_price?: number
      restocked_qty?: number
    }) => {
      const nowIso = new Date().toISOString()

      if (user) {
        try {
          // If restocked_qty is provided without an explicit absolute `quantity`,
          // perform a safe increment on the server: read current qty and add restocked_qty.
          if (restocked_qty !== undefined && restocked_qty > 0 && quantity === undefined) {
            const { data: currentRows } = await supabase.from('inventory_items').select('quantity').eq('id', id).limit(1).single()
            const serverQty = Number((currentRows && (currentRows as any).quantity) || 0)
            const newQty = Math.max(0, serverQty + restocked_qty)
            const updates: Record<string, any> = { last_edited: nowIso, quantity: newQty, last_restocked_qty: restocked_qty }
            const { error } = await supabase.from('inventory_items').update(updates).eq('id', id)
            if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
              delete updates.last_restocked_qty
              await supabase.from('inventory_items').update(updates).eq('id', id)
            }
          } else {
            const updates: Record<string, any> = { last_edited: nowIso }
            if (quantity !== undefined) updates.quantity = quantity
            if (default_price !== undefined) updates.default_price = default_price
            if (restocked_qty !== undefined && restocked_qty > 0) updates.last_restocked_qty = restocked_qty

            const { error } = await supabase
              .from('inventory_items')
              .update(updates)
              .eq('id', id)

            if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
              delete updates.last_restocked_qty
              await supabase.from('inventory_items').update(updates).eq('id', id)
            }
          }
        } catch (e) {
          console.warn('Supabase inventory update failed, updating local state', e)
        }
      }

      // Local fallback
      const local = getLocalInventory()
      const updated = local.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...(quantity !== undefined ? { quantity } : {}),
            ...(default_price !== undefined ? { default_price } : {}),
            ...(restocked_qty !== undefined && restocked_qty > 0 ? { last_restocked_qty: restocked_qty } : {}),
            last_edited: nowIso,
          }
        }
        return item
      })
      saveLocalInventory(updated)
    },
    onMutate: async ({ id, quantity, default_price, restocked_qty }) => {
      const nowIso = new Date().toISOString()
      queryClient.setQueriesData<InventoryItem[]>({ queryKey: ['inventory-items'] }, (old) => {
        if (!old) return old
        return old.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              ...(quantity !== undefined ? { quantity } : {}),
              ...(default_price !== undefined ? { default_price } : {}),
              ...(restocked_qty !== undefined && restocked_qty > 0 ? { last_restocked_qty: restocked_qty } : {}),
              last_edited: nowIso,
            }
          }
          return item
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
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
                  .eq('user_id', user.id)
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })
}

export function useInventoryAudit() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['inventory-audit', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const [{ data: items }, { data: sales }] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('user_id', user.id),
        supabase.from('inventory_sales').select('item_name, qty_sold, amount').eq('user_id', user.id),
      ])

      const salesList = (sales || []) as Array<{ item_name: string; qty_sold: number; amount: number }>
      const soldMap: Record<string, { qty: number; revenue: number }> = {}
      salesList.forEach((s) => {
        const key = (s.item_name || '').trim().toLowerCase()
        if (!soldMap[key]) soldMap[key] = { qty: 0, revenue: 0 }
        soldMap[key].qty += Number(s.qty_sold || 0)
        soldMap[key].revenue += Number(s.amount || 0)
      })

      const itemsList = (items || []) as Array<{ id: string; name: string; quantity: number }>
      return itemsList.map((it) => {
        const key = (it.name || '').trim().toLowerCase()
        const sold = soldMap[key] || { qty: 0, revenue: 0 }
        return {
          id: it.id,
          name: it.name,
          dbQuantity: Number(it.quantity || 0),
          totalSold: sold.qty,
          revenue: sold.revenue,
          computedQuantity: Math.max(0, Number(it.quantity || 0) - sold.qty),
        }
      })
    },
    enabled: true,
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

export function useAllInventorySales(startDate?: string, endDate?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['inventory-sales-all', user?.id, startDate, endDate],
    queryFn: async (): Promise<InventorySale[]> => {
      if (user) {
        try {
          let query = supabase
            .from('inventory_sales')
            .select('*')

          if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate)
          } else if (startDate) {
            query = query.gte('date', startDate)
          } else if (endDate) {
            query = query.lte('date', endDate)
          }

          const { data, error } = await query.order('created_at', { ascending: false })
          if (!error && data) return data as InventorySale[]
        } catch (e) {
          console.warn('Supabase range sales fetch failed, using local fallback', e)
        }
      }

      const local = getLocalSales()
      return local.filter(s => {
        if (startDate && endDate) return s.date >= startDate && s.date <= endDate
        if (startDate) return s.date >= startDate
        if (endDate) return s.date <= endDate
        return true
      })
    },
    enabled: true
  })
}

export function useSyncBookingInventorySales() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId,
      date,
      isPaid,
      addOns,
    }: {
      bookingId: string
      date: string
      isPaid: boolean
      addOns: Array<{ name: string; qty: number; price: number }>
    }) => {
      if (user) {
        try {
          // 1. Fetch existing sales for this booking to restore stock
          const { data: existingSales } = await supabase
            .from('inventory_sales')
            .select('*')
            .eq('booking_id', bookingId)

          if (existingSales && existingSales.length > 0) {
              const { data: invItems } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('user_id', user.id)

            if (invItems) {
              for (const oldSale of existingSales) {
                const matched = invItems.find(
                  (i: InventoryItem) => i.name.toLowerCase() === oldSale.item_name.toLowerCase()
                )
                  if (matched) {
                  const restoredQty = matched.quantity + Number(oldSale.qty_sold || 0)
                  await supabase
                    .from('inventory_items')
                    .update({ quantity: restoredQty, last_edited: new Date().toISOString() })
                    .eq('id', matched.id)
                    .eq('user_id', user.id)
                  matched.quantity = restoredQty
                }
              }
            }

            await supabase
              .from('inventory_sales')
              .delete()
              .eq('booking_id', bookingId)
          }

          // 2. Always deduct stock and log sale for active add-ons (even if pending) to keep inventory and stock logs accurate.
          const activeAddOns = addOns.filter((a) => a.qty > 0)
          if (activeAddOns.length > 0) {
            const rows = activeAddOns.map((a) => ({
              user_id: user.id,
              item_name: a.name,
              qty_sold: a.qty,
              amount: a.price * a.qty,
              date,
              booking_id: bookingId,
            }))
            await supabase.from('inventory_sales').insert(rows)

            // Always deduct stock quantity
            const { data: currentItems } = await supabase
              .from('inventory_items')
              .select('*')
              .eq('user_id', user.id)

            if (currentItems) {
              for (const addOn of activeAddOns) {
                const matched = currentItems.find(
                  (i: InventoryItem) => i.name.trim().toLowerCase() === addOn.name.trim().toLowerCase()
                )
                if (matched) {
                  const newQty = Math.max(0, matched.quantity - addOn.qty)
                  await supabase
                    .from('inventory_items')
                    .update({ quantity: newQty, last_edited: new Date().toISOString() })
                    .eq('id', matched.id)
                    .eq('user_id', user.id)
                }
              }
            }
          }
        } catch (e) {
          console.warn('Supabase booking inventory sync failed', e)
        }
      }

      // Sync local storage fallback
      const localSales = getLocalSales()
      const oldBookingSales = localSales.filter((s) => s.booking_id === bookingId)
      const localInv = getLocalInventory()

      // Restore old stock first
      oldBookingSales.forEach((oldSale) => {
        const idx = localInv.findIndex((i) => i.name.trim().toLowerCase() === oldSale.item_name.trim().toLowerCase())
        if (idx >= 0) {
          localInv[idx].quantity += Number(oldSale.qty_sold || 0)
        }
      })

      const filteredSales = localSales.filter((s) => s.booking_id !== bookingId)
      const activeAddOns = addOns.filter((a) => a.qty > 0)

      if (activeAddOns.length > 0) {
        // Always deduct stock and record sale row
        activeAddOns.forEach((a) => {
          const idx = localInv.findIndex((i) => i.name.trim().toLowerCase() === a.name.trim().toLowerCase())
          if (idx >= 0) {
            localInv[idx].quantity = Math.max(0, localInv[idx].quantity - a.qty)
          }

          filteredSales.push({
            id: `local-sale-${Date.now()}-${Math.random()}`,
            created_at: new Date().toISOString(),
            item_name: a.name,
            date,
            qty_sold: a.qty,
            amount: a.price * a.qty,
            booking_id: bookingId,
            user_id: user?.id || 'local',
          })
        })
      }

      saveLocalSales(filteredSales)
      saveLocalInventory(localInv)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useRemoveBookingInventorySales() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (user) {
        try {
          const { data: existingSales } = await supabase
            .from('inventory_sales')
            .select('*')
            .eq('booking_id', bookingId)
            .eq('user_id', user.id)

          if (existingSales && existingSales.length > 0) {
            const { data: invItems } = await supabase
              .from('inventory_items')
              .select('*')

            if (invItems) {
              for (const oldSale of existingSales) {
                const matched = invItems.find(
                  (i: InventoryItem) => i.name.toLowerCase() === oldSale.item_name.toLowerCase()
                )
                if (matched) {
                  const restoredQty = matched.quantity + Number(oldSale.qty_sold || 0)
                  await supabase
                    .from('inventory_items')
                    .update({ quantity: restoredQty, last_edited: new Date().toISOString() })
                    .eq('id', matched.id)
                }
              }
            }

            await supabase
              .from('inventory_sales')
              .delete()
              .eq('booking_id', bookingId)
              .eq('user_id', user.id)
          }
        } catch (e) {
          console.warn('Supabase booking sales remove failed', e)
        }
      }

      const localSales = getLocalSales()
      const oldSales = localSales.filter((s) => s.booking_id === bookingId)
      const localInv = getLocalInventory()

      oldSales.forEach((s) => {
        const idx = localInv.findIndex((i) => i.name.toLowerCase() === s.item_name.toLowerCase())
        if (idx >= 0) {
          localInv[idx].quantity += Number(s.qty_sold || 0)
        }
      })

      const remainingSales = localSales.filter((s) => s.booking_id !== bookingId)
      saveLocalSales(remainingSales)
      saveLocalInventory(localInv)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useResetAllData() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (user) {
        const tablesToDelete = [
          'bookings',
          'expenses',
          'labour_payments',
          'labour',
          'liability_payments',
          'liabilities',
          'other_income',
          'marketing_campaigns',
          'inventory_sales',
          'customers',
        ]

        for (const table of tablesToDelete) {
          try {
            await supabase.from(table).delete().eq('user_id', user.id)
          } catch (e) {
            console.warn(`Failed resetting table ${table}`, e)
          }
        }

        try {
          const { data: invItems } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('user_id', user.id)

          if (invItems && invItems.length > 0) {
            const ids = invItems.map((i) => i.id)
            await supabase
              .from('inventory_items')
              .update({ quantity: 0, last_edited: new Date().toISOString() })
              .in('id', ids)
              .eq('user_id', user.id)
          }
        } catch (e) {
          console.warn('Failed resetting inventory quantities', e)
        }
      }

      const defaults = buildDefaultInventory()
      localStorage.setItem(LOCAL_STORAGE_INVENTORY_KEY, JSON.stringify(defaults))
      localStorage.setItem(LOCAL_STORAGE_INVENTORY_VERSION_KEY, INVENTORY_VERSION)
      localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify([]))
      if (user) {
        localStorage.setItem(`turf_inv_qty_reset_${user.id}`, INVENTORY_VERSION)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

