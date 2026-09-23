import React, { useState } from 'react'
import { useMonthlyData, useDailyData, useBookings } from '@/services/dashboard-service'
import { useExpenses, useLabour, useLiabilities } from '@/services/accounts-service'
import { useCustomers } from '@/services/customers-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageLoadingState } from '@/components/common/loading'
import { Download, Calendar, IndianRupee, Users, TrendingUp, Wallet, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('daily')
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0])

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData()
  const { data: dailyData = [], isLoading: dailyLoading } = useDailyData(
    reportType === 'custom' ? undefined : 10,
    reportType === 'custom' ? customStartDate : undefined,
    reportType === 'custom' ? customEndDate : undefined
  )
  const { data: bookings } = useBookings()
  const { data: expenses } = useExpenses()
  const { data: labour } = useLabour()
  const { data: liabilities } = useLiabilities()
  const { data: customers } = useCustomers()

  if (monthlyLoading || dailyLoading) {
    return <PageLoadingState />
  }

  // ---- Revenue breakdown calculations ----
  const paidBookings = (bookings || []).filter((b) => b.payment_status === 'paid')
  const pendingBookings = (bookings || []).filter((b) => b.payment_status === 'pending')

  let onlineRevenue = 0
  let offlineRevenue = 0
  paidBookings.forEach((b) => {
    const mode = b.payment_mode || (b.transaction_id || b.source === 'website' ? 'online' : 'offline')
    const amt = Number(b.amount || 0)
    if (mode === 'split') {
      let onAmt = Number(b.online_amount || 0)
      let offAmt = Number(b.offline_amount || 0)
      if (onAmt === 0 && offAmt === 0) {
        onAmt = Math.floor(amt / 2)
        offAmt = amt - onAmt
      }
      onlineRevenue += onAmt
      offlineRevenue += offAmt
    } else if (mode === 'online') {
      onlineRevenue += amt
    } else {
      offlineRevenue += amt
    }
  })

  const pendingAmount = pendingBookings.reduce((s, b) => s + Number(b.amount || 0), 0)
  const generateReport = () => {
    const totalRevenue = (monthlyData || []).reduce((sum, month) => sum + month.revenue, 0)
    const operatingOut = (monthlyData || []).reduce((sum, month) => sum + month.expenses, 0)
    const totalProfit = totalRevenue - operatingOut
    const generalExpenses = (expenses || []).reduce((sum, expense) => sum + Number(expense.amount), 0)
    const labourPayments = (labour || []).reduce((sum, worker) => sum + (worker.payments || []).reduce((workerSum, payment) => workerSum + Number(payment.amount), 0), 0)
    const pendingBookingAmount = (bookings || []).filter((booking) => booking.payment_status === 'pending').reduce((sum, booking) => sum + Number(booking.amount), 0)
    const outstandingLiabilities = (liabilities || []).filter((liability) => !liability.is_completed).reduce((sum, liability) => sum + Number(liability.outstanding_amount), 0)
    const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!reportWindow) return

    const dailyRows = (dailyData || []).map((day) => `
      <tr>
        <td>${day.date}</td>
        <td>${day.totalBookings}</td>
        <td>${formatCurrency(day.revenue)}</td>
        <td>${formatCurrency(day.expenses)}</td>
        <td>${formatCurrency(day.profit)}</td>
      </tr>`).join('')

    const monthlyRows = (monthlyData || []).map((month) => `
      <tr>
        <td>${month.month}</td>
        <td>${formatCurrency(month.revenue)}</td>
        <td>${formatCurrency(month.expenses)}</td>
        <td>${formatCurrency(month.profit)}</td>
      </tr>`).join('')

    reportWindow.document.write(`<!doctype html>
<html>
<head>
  <title>Turf POS ${reportType} report</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Inter, Arial, sans-serif; color: #0f172a; background: #fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 18px; margin-bottom: 22px; }
    .brand { font-size: 24px; font-weight: 800; color: #0f766e; letter-spacing: -0.04em; }
    .muted { color: #64748b; font-size: 12px; }
    .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
    .grid6 { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
    .card { border:1px solid #dbe4e7; border-radius: 16px; padding: 14px; background: #f8fafc; }
    .card.online { border-color: #bfdbfe; background: #eff6ff; }
    .card.offline { border-color: #fde68a; background: #fffbeb; }
    .card.pending { border-color: #fca5a5; background: #fef2f2; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color:#64748b; }
    .value { font-size: 18px; font-weight: 800; margin-top: 6px; }
    .value.blue { color: #1d4ed8; }
    .value.amber { color: #d97706; }
    .value.red { color: #dc2626; }
    h2 { font-size: 15px; margin-top: 24px; color:#0f172a; }
    table { width:100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { text-align:left; background:#0f766e; color:#fff; padding:10px; }
    td { border-bottom:1px solid #e2e8f0; padding:10px; }
    .note { padding: 12px; border-radius: 12px; background:#ecfdf5; color:#065f46; font-size: 12px; margin-top: 16px; }
    .footer { margin-top: 28px; border-top:1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color:#64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Turf POS Business Report</div>
      <div class="muted">${reportType.toUpperCase()} REPORT • Generated ${new Date().toLocaleString()}</div>
    </div>
    <div class="muted">Production financial summary</div>
  </div>
  <div class="grid">
    <div class="card"><div class="label">Total Revenue (Paid)</div><div class="value">${formatCurrency(totalRevenue)}</div></div>
    <div class="card"><div class="label">Money Out</div><div class="value">${formatCurrency(operatingOut)}</div></div>
    <div class="card"><div class="label">Net Profit</div><div class="value">${formatCurrency(totalProfit)}</div></div>
    <div class="card"><div class="label">Total Bookings</div><div class="value">${(bookings || []).length}</div></div>
  </div>
  <div class="grid6">
    <div class="card online"><div class="label">Online Revenue (UPI/Card)</div><div class="value blue">${formatCurrency(onlineRevenue)}</div></div>
    <div class="card offline"><div class="label">Cash / Offline Revenue</div><div class="value amber">${formatCurrency(offlineRevenue)}</div></div>
    <div class="card pending"><div class="label">Pending (Unpaid)</div><div class="value red">${formatCurrency(pendingBookingAmount)}</div></div>
  </div>
  <h2>Business Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Paid Bookings</td><td>${(bookings || []).filter((booking) => booking.payment_status === 'paid').length}</td></tr>
    <tr><td>Pending Bookings (Unpaid Amount)</td><td>${formatCurrency(pendingBookingAmount)}</td></tr>
    <tr><td>Online Revenue (UPI/Card)</td><td>${formatCurrency(onlineRevenue)}</td></tr>
    <tr><td>Cash / Offline Revenue</td><td>${formatCurrency(offlineRevenue)}</td></tr>
    <tr><td>Total Customers</td><td>${(customers || []).length}</td></tr>
    <tr><td>General Expenses</td><td>${formatCurrency(generalExpenses)}</td></tr>
    <tr><td>Labour Paid</td><td>${formatCurrency(labourPayments)}</td></tr>
    <tr><td>Outstanding Liabilities</td><td>${formatCurrency(outstandingLiabilities)} (tracker only, not deducted from profit)</td></tr>
  </table>

  <h2>Daily Summary (${reportType === 'custom' ? `${customStartDate} to ${customEndDate}` : 'Recent Days'})</h2>
  <table><thead><tr><th>Date</th><th>Bookings</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead><tbody>${dailyRows}</tbody></table>

  <h2>Monthly Financial Table</h2>
  <table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses + Labour</th><th>Profit</th></tr></thead><tbody>${monthlyRows}</tbody></table>

  <div class="note">Revenue = PAID bookings only. Pending bookings are shown separately and NOT included in revenue.</div>
  <div class="footer">Formatted for A4 PDF export. Use browser print options.</div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`)
    reportWindow.document.close()
  }

  const totalRevenue = (monthlyData || []).reduce((sum, m) => sum + m.revenue, 0)
  const totalExpenses = (monthlyData || []).reduce((sum, m) => sum + m.expenses, 0)
  const labourPayments = (labour || []).reduce((sum, l) => sum + (l.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0)
  const outstandingLiabilities = (liabilities || []).filter((l) => !l.is_completed).reduce((s, l) => s + Number(l.outstanding_amount), 0)
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-emerald-400" /> Business Reports & Summaries
          </h1>
          <p className="text-slate-400 text-sm mt-1">View daily breakdown, monthly performance, and custom date range reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {reportType === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs w-full sm:w-auto">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-slate-400">From:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-slate-400">To:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36"
                />
              </div>
            </div>
          )}
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'monthly' | 'custom')} className="w-full sm:w-auto">
            <TabsList className="bg-slate-800/80 w-full justify-start overflow-x-auto">
              <TabsTrigger value="daily" className="flex-1 sm:flex-initial data-[state=active]:bg-emerald-600">Daily Summary</TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1 sm:flex-initial data-[state=active]:bg-emerald-600">Monthly Summary</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 sm:flex-initial data-[state=active]:bg-emerald-600">Custom Search</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={generateReport} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Paid Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-red-950/80 border border-red-800 text-red-400 shrink-0">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Expenses</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatCurrency(totalExpenses + labourPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Total Customers</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{(customers || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Total Bookings</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{(bookings || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Mode Breakdown */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-slate-900/80 border-blue-900/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Online Revenue (UPI/Card)</p>
                <p className="text-xl font-bold text-blue-400 truncate">{formatCurrency(onlineRevenue)}</p>
                <p className="text-[10px] text-slate-500">Paid via digital</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-amber-900/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Cash / Offline Revenue</p>
                <p className="text-xl font-bold text-amber-400 truncate">{formatCurrency(offlineRevenue)}</p>
                <p className="text-[10px] text-slate-500">Paid in cash</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-red-900/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/80 border border-red-800 text-red-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Pending (Unpaid)</p>
                <p className="text-xl font-bold text-red-400 truncate">{formatCurrency(pendingAmount)}</p>
                <p className="text-[10px] text-slate-500">{pendingBookings.length} booking(s) unpaid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Summary Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Daily Financial Summary
            {reportType === 'custom' ? ` (${customStartDate} to ${customEndDate})` : ' (Last 10 Days)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Bookings Count</th>
                  <th className="px-6 py-4">Revenue</th>
                  <th className="px-6 py-4">Expenses</th>
                  <th className="px-6 py-4 text-right">Daily Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dailyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No daily records found for the selected range.
                    </td>
                  </tr>
                ) : (
                  dailyData.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{day.date}</td>
                      <td className="px-6 py-4 text-slate-300">{day.totalBookings} bookings</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold">{formatCurrency(day.revenue)}</td>
                      <td className="px-6 py-4 text-red-400 font-medium">{formatCurrency(day.expenses)}</td>
                      <td className={day.profit >= 0 ? 'px-6 py-4 text-right font-bold text-emerald-400' : 'px-6 py-4 text-right font-bold text-red-400'}>
                        {formatCurrency(day.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Monthly Financial Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Revenue</th>
                  <th className="px-6 py-4">Expenses + Labour</th>
                  <th className="px-6 py-4 text-right">Monthly Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(monthlyData || []).map((month) => (
                  <tr key={month.month} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{month.month}</td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">{formatCurrency(month.revenue)}</td>
                    <td className="px-6 py-4 text-red-400 font-medium">{formatCurrency(month.expenses)}</td>
                    <td className={month.profit >= 0 ? 'px-6 py-4 text-right font-bold text-emerald-400' : 'px-6 py-4 text-right font-bold text-red-400'}>
                      {formatCurrency(month.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
