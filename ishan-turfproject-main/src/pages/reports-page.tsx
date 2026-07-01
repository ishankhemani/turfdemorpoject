import { useState } from 'react'
import { useMonthlyData, useBookings } from '@/services/dashboard-service'
import { useExpenses, useLabour, useLiabilities } from '@/services/accounts-service'
import { useCustomers } from '@/services/customers-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoadingState } from '@/components/common/loading'
import { Download, Calendar, IndianRupee, Users, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('monthly')
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData()
  const { data: bookings } = useBookings()
  const { data: expenses } = useExpenses()
  const { data: labour } = useLabour()
  const { data: liabilities } = useLiabilities()
  const { data: customers } = useCustomers()

  if (monthlyLoading) {
    return <PageLoadingState />
  }

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

    const rows = (monthlyData || []).map((month) => `
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
    .card { border:1px solid #dbe4e7; border-radius: 16px; padding: 14px; background: #f8fafc; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color:#64748b; }
    .value { font-size: 18px; font-weight: 800; margin-top: 6px; }
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
    <div class="card"><div class="label">Revenue</div><div class="value">${formatCurrency(totalRevenue)}</div></div>
    <div class="card"><div class="label">Money Out</div><div class="value">${formatCurrency(operatingOut)}</div></div>
    <div class="card"><div class="label">Profit</div><div class="value">${formatCurrency(totalProfit)}</div></div>
    <div class="card"><div class="label">Bookings</div><div class="value">${(bookings || []).length}</div></div>
  </div>
  <h2>Business Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Paid Bookings</td><td>${(bookings || []).filter((booking) => booking.payment_status === 'paid').length}</td></tr>
    <tr><td>Pending Booking Payments</td><td>${formatCurrency(pendingBookingAmount)}</td></tr>
    <tr><td>Total Customers</td><td>${(customers || []).length}</td></tr>
    <tr><td>General Expenses</td><td>${formatCurrency(generalExpenses)}</td></tr>
    <tr><td>Labour Paid</td><td>${formatCurrency(labourPayments)}</td></tr>
    <tr><td>Outstanding Liabilities</td><td>${formatCurrency(outstandingLiabilities)} (tracker only, not deducted from profit)</td></tr>
  </table>
  <h2>Monthly Financial Table</h2>
  <table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses + Labour</th><th>Profit</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="note">Profit formula used: paid bookings + other income - expenses - labour. Liabilities are shown separately as pending payment trackers and never reduce profit.</div>
  <div class="footer">Use your browser Save as PDF option from the print dialog. This report is formatted for A4 PDF export.</div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`)
    reportWindow.document.close()
  }

  const totalRevenue = (monthlyData || []).reduce((sum, m) => sum + m.revenue, 0)
  const totalExpenses = (monthlyData || []).reduce((sum, m) => sum + m.expenses, 0)
  const labourPayments = (labour || []).reduce((sum, l) => sum + (l.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0)
  const outstandingLiabilities = (liabilities || []).filter(l => !l.is_completed).reduce((s, l) => s + Number(l.outstanding_amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">Generate and download business reports</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={generateReport}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <IndianRupee className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpenses + labourPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{(customers || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Calendar className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{(bookings || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Total Revenue</span>
                <span className="font-bold text-success">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Booking Payments</span>
                <span className="font-medium">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Pending Payments</span>
                <span className="font-medium text-warning">{formatCurrency((bookings || []).filter(b => b.payment_status === 'pending').reduce((s, b) => s + Number(b.amount), 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Total Expenses</span>
                <span className="font-bold text-destructive">{formatCurrency(totalExpenses + labourPayments)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">General Expenses</span>
                <span className="font-medium">{formatCurrency((expenses || []).reduce((s, e) => s + Number(e.amount), 0))}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Labour Payments</span>
                <span className="font-medium">{formatCurrency(labourPayments)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="text-sm">Outstanding Liabilities</span>
                <span className="font-medium text-warning">{formatCurrency(outstandingLiabilities)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span>Month</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Expenses</span>
              <span className="text-right">Profit</span>
            </div>
            {(monthlyData || []).map((month) => (
              <div key={month.month} className="grid grid-cols-4 text-sm py-2 border-b border-muted">
                <span className="font-medium">{month.month}</span>
                <span className="text-right text-success">{formatCurrency(month.revenue)}</span>
                <span className="text-right text-destructive">{formatCurrency(month.expenses)}</span>
                <span className={month.profit >= 0 ? 'text-right font-medium text-success' : 'text-right font-medium text-destructive'}>
                  {formatCurrency(month.profit)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
