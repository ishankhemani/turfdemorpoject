import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_URL_RAW
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!url || !key) {
  console.error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your shell.')
  process.exit(2)
}

const supabase = createClient(url, key)

async function auditItem(itemName) {
  const nameLower = itemName.trim().toLowerCase()
  const { data: items, error: itemsErr } = await supabase
    .from('inventory_items')
    .select('*')
    .ilike('name', itemName)

  if (itemsErr) {
    console.error('Failed fetching inventory_items', itemsErr.message)
    return
  }

  if (!items || items.length === 0) {
    console.log(`No inventory item found matching '${itemName}'.`)
    return
  }

  const item = items[0]
  const { data: sales, error: salesErr } = await supabase
    .from('inventory_sales')
    .select('qty_sold, amount, date, booking_id')
    .ilike('item_name', itemName)

  if (salesErr) {
    console.error('Failed fetching inventory_sales', salesErr.message)
    return
  }

  const totalSold = (sales || []).reduce((s, r) => s + Number(r.qty_sold || 0), 0)
  const revenue = (sales || []).reduce((s, r) => s + Number(r.amount || 0), 0)

  console.log('--- Inventory Audit ---')
  console.log('Item:', item.name)
  console.log('DB Quantity:', item.quantity)
  console.log('Total Sold (all time):', totalSold)
  console.log('Revenue from item:', revenue)
  console.log('Last restocked:', item.last_restocked_qty || 'N/A', 'last_edited:', item.last_edited || 'N/A')
  console.log('Computed remaining (dbQuantity - totalSold):', Math.max(0, Number(item.quantity || 0) - totalSold))
  console.log('Recent sales rows:')
  ;(sales || []).slice(0, 10).forEach((r) => console.log(`  - date:${r.date} qty:${r.qty_sold} amt:${r.amount} booking:${r.booking_id}`))
}

const arg = process.argv[2] || 'Kesar Doodh'

auditItem(arg).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
