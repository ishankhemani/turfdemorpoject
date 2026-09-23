import React, { useState } from 'react'
import { Plus, Edit2, Package, ShoppingBag, Search, RefreshCw, Layers } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useInventoryItems, useUpdateInventoryStock, useInventorySales } from '@/services/inventory-service'
import type { InventoryItem } from '@/types/database'

export function InventoryPage() {
  const { data: inventoryItems = [], isLoading, refetch } = useInventoryItems()
  const updateStock = useUpdateInventoryStock()

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const { data: sales = [] } = useInventorySales(selectedDate)

  const [searchTerm, setSearchTerm] = useState('')
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

  const totalSalesRevenue = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
  const totalItemsSold = sales.reduce((sum, sale) => sum + Number(sale.qty_sold || 0), 0)

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-emerald-400" /> Inventory & Stock Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage drinks, beverages, and equipment stock and track daily sales.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList className="bg-slate-800/80 p-1 border border-slate-700/50 rounded-lg">
          <TabsTrigger value="stock" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 text-slate-300">
            <Layers className="w-4 h-4" /> Stock Items ({inventoryItems.length})
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 text-slate-300">
            <ShoppingBag className="w-4 h-4" /> Daily Add-on Sales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search items by name..."
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

          {/* Table */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-white">Stock List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Default Price</th>
                      <th className="px-6 py-4">Stock Quantity</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Loading inventory...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No inventory items found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            {item.name}
                          </td>
                          <td className="px-6 py-4 text-slate-400">{item.category}</td>
                          <td className="px-6 py-4 text-emerald-400 font-semibold">₹{item.default_price}</td>
                          <td className="px-6 py-4 font-bold text-white">{item.quantity} units</td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Edit / Add Stock
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

        <TabsContent value="sales" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">Select Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950/60 border-slate-700 text-white w-44"
              />
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-950/60 px-4 py-2 rounded-lg border border-slate-800 text-right">
                <p className="text-xs text-slate-400">Total Add-on Sales</p>
                <p className="text-lg font-bold text-emerald-400">₹{totalSalesRevenue}</p>
              </div>
              <div className="bg-slate-950/60 px-4 py-2 rounded-lg border border-slate-800 text-right">
                <p className="text-xs text-slate-400">Items Sold</p>
                <p className="text-lg font-bold text-white">{totalItemsSold} items</p>
              </div>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/70 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg text-white">Sales Log for {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Item Sold</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Quantity Sold</th>
                      <th className="px-6 py-4">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          No add-on sales recorded for this date.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale, idx) => (
                        <tr key={sale.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{sale.item_name}</td>
                          <td className="px-6 py-4 text-slate-400">{sale.date}</td>
                          <td className="px-6 py-4 text-white font-semibold">{sale.qty_sold}</td>
                          <td className="px-6 py-4 text-emerald-400 font-bold">₹{sale.amount}</td>
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

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" /> Update Stock — {editingItem?.name}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex justify-between text-sm">
                <span className="text-slate-400">Current Stock:</span>
                <span className="font-bold text-white">{editingItem.quantity} units</span>
              </div>

              <div>
                <label className="text-sm text-slate-300 font-medium block mb-1">Adjust Quantity (+ to add, - to subtract/return)</label>
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
