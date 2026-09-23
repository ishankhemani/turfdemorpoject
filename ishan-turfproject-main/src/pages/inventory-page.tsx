import React, { useState } from 'react'
import { Edit2, Package, ShoppingBag, Search, RefreshCw, Layers, Calendar, Filter, Clock, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useInventoryItems, useUpdateInventoryStock, useAllInventorySales } from '@/services/inventory-service'
import type { InventoryItem, InventorySale } from '@/types/database'

function formatDateNice(isoString?: string | null) {
  if (!isoString) return 'Not Restocked Yet'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch (e) {
    return isoString
  }
}

export function InventoryPage() {
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: inventoryItems = [], isLoading, refetch } = useInventoryItems()
  const updateStock = useUpdateInventoryStock()

  // Sales Date Filter State
  const [dateMode, setDateMode] = useState<'today' | 'custom' | 'all'>('today')
  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(todayStr)

  // Fetch all sales for restock calculations & range sales for filter
  const { data: allSales = [] } = useAllInventorySales()
  
  const effectiveStartDate = dateMode === 'today' ? todayStr : dateMode === 'custom' ? startDate : undefined
  const effectiveEndDate = dateMode === 'today' ? todayStr : dateMode === 'custom' ? endDate : undefined
  const { data: rangeSales = [] } = useAllInventorySales(effectiveStartDate, effectiveEndDate)

  const [searchTerm, setSearchTerm] = useState('')
  const [salesSearchTerm, setSalesSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // State for updating stock modal
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [addQty, setAddQty] = useState<number>(0)
  const [newPrice, setNewPrice] = useState<number>(0)

  const categories = Array.from(new Set(inventoryItems.map((item) => item.category)))

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setAddQty(0)
    setNewPrice(item.default_price)
  }

  const handleSaveStock = async () => {
    if (!editingItem) return
    await updateStock.mutateAsync({
      id: editingItem.id,
      quantity: Math.max(0, editingItem.quantity + Number(addQty)),
      default_price: Number(newPrice),
    })
    setEditingItem(null)
  }

  // Filtered sales transaction list for the sales log search
  const filteredSalesLog = rangeSales.filter((s) => {
    const matchesItem = s.item_name.toLowerCase().includes(salesSearchTerm.toLowerCase())
    const matchesDate = s.date.includes(salesSearchTerm)
    return matchesItem || matchesDate
  })

  const totalPeriodRevenue = rangeSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
  const totalPeriodItemsSold = rangeSales.reduce((sum, sale) => sum + Number(sale.qty_sold || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" /> Inventory & Stock Management
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage stock levels, restock dates, and track sales performance across date ranges.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList className="bg-slate-800/80 p-1 border border-slate-700/50 rounded-lg w-full sm:w-auto flex">
          <TabsTrigger value="stock" className="flex-1 sm:flex-initial flex items-center gap-2 data-[state=active]:bg-emerald-600 text-slate-300 text-xs sm:text-sm">
            <Layers className="w-4 h-4" /> Stock Items ({inventoryItems.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex-1 sm:flex-initial flex items-center gap-2 data-[state=active]:bg-emerald-600 text-slate-300 text-xs sm:text-sm">
            <ShoppingBag className="w-4 h-4" /> Sales Records & Analytics
          </TabsTrigger>
        </TabsList>

        {/* STOCK ITEMS TAB */}
        <TabsContent value="stock" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search stock by item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950/50 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}
              >
                All Categories
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat ? 'bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/70 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" /> Stock Inventory List
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Item Name</th>
                      <th className="px-4 sm:px-6 py-4">Category</th>
                      <th className="px-4 sm:px-6 py-4">Default Price</th>
                      <th className="px-4 sm:px-6 py-4">Current Stock</th>
                      <th className="px-4 sm:px-6 py-4">Last Restocked</th>
                      <th className="px-4 sm:px-6 py-4">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          Loading inventory...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No inventory items found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-4 font-medium text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                            {item.name}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-slate-400">{item.category}</td>
                          <td className="px-4 sm:px-6 py-4 text-emerald-400 font-semibold">₹{item.default_price}</td>
                          <td className="px-4 sm:px-6 py-4 font-bold text-white">{item.quantity} units</td>
                          <td className="px-4 sm:px-6 py-4 text-slate-400 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {formatDateNice(item.last_edited)}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            {item.quantity <= 0 ? (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-950/80 text-red-400 border border-red-800/50">
                                Out of Stock (0)
                              </span>
                            ) : item.quantity <= 5 ? (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/50">
                                Low Stock ({item.quantity})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                                In Stock ({item.quantity})
                              </span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Adjust Stock
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES RECORDS TAB */}
        <TabsContent value="sales" className="space-y-6">
          {/* Controls Header */}
          <div className="flex flex-col space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-emerald-400" /> Sales Date Filter
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Filter sales by single date, custom date range, or all-time since restock.</p>
              </div>

              {/* Mode Selector */}
              <div className="flex gap-2 flex-wrap w-full lg:w-auto">
                <Button
                  size="sm"
                  variant={dateMode === 'today' ? 'default' : 'outline'}
                  onClick={() => setDateMode('today')}
                  className={dateMode === 'today' ? 'bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Today
                </Button>
                <Button
                  size="sm"
                  variant={dateMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => setDateMode('custom')}
                  className={dateMode === 'custom' ? 'bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" /> Custom Date Range
                </Button>
                <Button
                  size="sm"
                  variant={dateMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setDateMode('all')}
                  className={dateMode === 'all' ? 'bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1" /> All-Time / Till Date
                </Button>
              </div>
            </div>

            {/* Date Pickers for Custom Range */}
            {dateMode === 'custom' && (
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-400">From Date:</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950/60 border-slate-700 text-white text-xs w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-400">To Date:</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950/60 border-slate-700 text-white text-xs w-36"
                  />
                </div>
              </div>
            )}

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">Total Period Revenue</p>
                <p className="text-lg font-bold text-emerald-400">₹{totalPeriodRevenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">Total Units Sold</p>
                <p className="text-lg font-bold text-white">{totalPeriodItemsSold} units</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">Tracked Stock Items</p>
                <p className="text-lg font-bold text-cyan-400">{inventoryItems.length} items</p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">Active Date Filter</p>
                <p className="text-xs font-semibold text-amber-400 mt-1">
                  {dateMode === 'today' ? `Today (${todayStr})` : dateMode === 'all' ? 'All-Time Sales' : `${startDate} to ${endDate}`}
                </p>
              </div>
            </div>
          </div>

          {/* ITEM-WISE SALES & RESTOCK BREAKDOWN TABLE */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" /> Item-Wise Sold Quantity & Restock Status
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Shows available stock, last restocked timestamp, and sold quantity since last restock date as well as selected date range.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Item Name & Category</th>
                      <th className="px-4 sm:px-6 py-4">Current Stock</th>
                      <th className="px-4 sm:px-6 py-4">Last Restocked Date</th>
                      <th className="px-4 sm:px-6 py-4">Sold Qty (Since Restock)</th>
                      <th className="px-4 sm:px-6 py-4">Sold Qty (Selected Period)</th>
                      <th className="px-4 sm:px-6 py-4 text-right">Revenue (Selected Period)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No inventory items registered.
                        </td>
                      </tr>
                    ) : (
                      inventoryItems.map((item) => {
                        // Calculate sold quantity since last restocked date
                        const restockDateOnly = item.last_edited ? item.last_edited.split('T')[0] : '1970-01-01'
                        const salesSinceRestock = allSales.filter(
                          (s) => s.item_name.trim().toLowerCase() === item.name.trim().toLowerCase() && s.date >= restockDateOnly
                        )
                        const soldSinceRestock = salesSinceRestock.reduce((sum, s) => sum + Number(s.qty_sold || 0), 0)

                        // Calculate sold quantity in currently selected date range / mode
                        const salesInPeriod = rangeSales.filter(
                          (s) => s.item_name.trim().toLowerCase() === item.name.trim().toLowerCase()
                        )
                        const soldInPeriod = salesInPeriod.reduce((sum, s) => sum + Number(s.qty_sold || 0), 0)
                        const revenueInPeriod = salesInPeriod.reduce((sum, s) => sum + Number(s.amount || 0), 0)

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 sm:px-6 py-4 font-medium text-white">
                              <div>
                                <p className="text-slate-100 font-semibold">{item.name}</p>
                                <span className="text-[11px] text-slate-400">{item.category} • ₹{item.default_price}/unit</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4">
                              <span className={`font-bold ${item.quantity <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {item.quantity} units
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-slate-300 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {formatDateNice(item.last_edited)}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 font-semibold text-cyan-400">
                              {soldSinceRestock} units
                            </td>
                            <td className="px-4 sm:px-6 py-4 font-bold text-white">
                              {soldInPeriod} units
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right font-bold text-emerald-400">
                              ₹{revenueInPeriod.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* DETAILED TRANSACTION SALES LOG TABLE */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" /> Detailed Transaction Sales Log
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">List of all add-on sales recorded in the selected period.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Filter by item or date..."
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-950/60 border-slate-700 text-white text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Item Sold</th>
                      <th className="px-4 sm:px-6 py-4">Sale Date</th>
                      <th className="px-4 sm:px-6 py-4">Quantity Sold</th>
                      <th className="px-4 sm:px-6 py-4">Transaction Type</th>
                      <th className="px-4 sm:px-6 py-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSalesLog.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No add-on sales records found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesLog.map((sale, idx) => (
                        <tr key={sale.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-4 font-medium text-white">{sale.item_name}</td>
                          <td className="px-4 sm:px-6 py-4 text-slate-400">{sale.date}</td>
                          <td className="px-4 sm:px-6 py-4 text-white font-semibold">{sale.qty_sold} units</td>
                          <td className="px-4 sm:px-6 py-4">
                            {sale.booking_id ? (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                                Booking Add-on
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50">
                                Direct Counter Sale
                              </span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right text-emerald-400 font-bold">₹{sale.amount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT / ADJUST STOCK DIALOG */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" /> Update Stock — {editingItem?.name}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex justify-between text-sm">
                <span className="text-slate-400">Current Stock Level:</span>
                <span className="font-bold text-white">{editingItem.quantity} units</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400">Last Restocked:</span>
                <span className="font-medium text-slate-200">{formatDateNice(editingItem.last_edited)}</span>
              </div>

              <div>
                <label className="text-sm text-slate-300 font-medium block mb-1">
                  Adjust Quantity (+ to add stock, - to return/subtract)
                </label>
                <Input
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  placeholder="Enter quantity to adjust (+5 or -2)..."
                  className="bg-slate-950/60 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-1">
                  New Stock Total will be: <strong className="text-emerald-400">{Math.max(0, editingItem.quantity + Number(addQty))} units</strong>
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-300 font-medium block mb-1">Default Selling Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="bg-slate-950/60 border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setEditingItem(null)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleSaveStock} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
