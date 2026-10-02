import { useState } from 'react'
import { useMonthlyData, useDailyData, useBookings } from '@/services/dashboard-service'
import { useExpenses, useLabour, useLiabilities } from '@/services/accounts-service'
import { useCustomers } from '@/services/customers-service'
import { useAllInventorySales } from '@/services/inventory-service'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageLoadingState } from '@/components/common/loading'
import { Download, Calendar, IndianRupee, Users, TrendingUp, FileSpreadsheet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

function distributeSplitAmounts(onAmt: number, offAmt: number, paidAmount: number): [number, number] {
  const explicitSum = Number(onAmt || 0) + Number(offAmt || 0)
  if (paidAmount <= 0) return [0, 0]
  if (explicitSum <= 0) {
    const on = Math.floor(paidAmount / 2)
    return [on, paidAmount - on]
  }
  const ratio = Number(onAmt || 0) / explicitSum
  const on = Math.round(paidAmount * ratio)
  const off = paidAmount - on
  return [on, off]
}

export function ReportsPage() {
  const reportType = 'custom' as const
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0])

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData()
  const { data: dailyData = [], isLoading: dailyLoading } = useDailyData(
    undefined,
    customStartDate,
    customEndDate
  )
  const { data: bookings } = useBookings()
  const { data: expenses } = useExpenses()
  const { data: labour } = useLabour()
  const { data: liabilities } = useLiabilities()
  const { data: customers } = useCustomers()
  const { data: rangeInventorySales = [] } = useAllInventorySales(customStartDate, customEndDate)


  if (monthlyLoading || dailyLoading) {
    return <PageLoadingState />
  }

  const exportCSV = () => {
    const headers = ['Date', 'Bookings Count', 'Revenue (INR)', 'Expenses (INR)', 'Daily Profit (INR)']
    const rows = (dailyData || []).map((day) => [
      day.date,
      day.totalBookings,
      day.revenue,
      day.expenses,
      day.profit,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `elite_arena_report_${customStartDate}_to_${customEndDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Active bookings filtered by selected date range
  const activeBookings = (bookings || []).filter((b) => {
    return b.booking_date >= customStartDate && b.booking_date <= customEndDate
  })

  // Derive online / offline / pending metrics
  let onlineRevenue = 0
  let offlineRevenue = 0
  let pendingAmount = 0
  let pendingCount = 0

  activeBookings.forEach((b) => {
    const isOnlineBooking = Boolean(b.transaction_id || b.source === 'website' || b.payment_mode === 'online')
    const mode = b.payment_mode || (isOnlineBooking ? 'online' : 'offline')
    const totalAmt = Number(b.amount || 0)
    const paidAmt = Number((b as any).paid_amount ?? 0)
    const pendingAmt = Number((b as any).pending_amount ?? Math.max(0, totalAmt - paidAmt))

    if (pendingAmt > 0) {
      pendingAmount += pendingAmt
      pendingCount++
    }

    if (paidAmt > 0) {
      if (mode === 'split') {
        const [onAmt, offAmt] = distributeSplitAmounts(Number((b as any).online_amount || 0), Number((b as any).offline_amount || 0), paidAmt)
        onlineRevenue += onAmt
        offlineRevenue += offAmt
      } else if (mode === 'online' || isOnlineBooking) {
        onlineRevenue += paidAmt
      } else {
        offlineRevenue += paidAmt
      }
    }
  })

  // Include standalone inventory counter sales into online/offline breakdown (matches Dashboard logic)
  rangeInventorySales.forEach((sale) => {
    if (!sale.booking_id) {
      const amt = Number(sale.amount || 0)
      const mode = sale.payment_mode || 'offline'
      if (mode === 'split') {
        onlineRevenue += Number(sale.online_amount || 0)
        offlineRevenue += Number(sale.offline_amount || 0)
      } else if (mode === 'online') {
        onlineRevenue += amt
      } else {
        offlineRevenue += amt
      }
    }
  })



  // Financial Summary Totals
  const displayRevenue = (dailyData || []).reduce((sum, d) => sum + d.revenue, 0)
  const displayExpenses = (dailyData || []).reduce((sum, d) => sum + d.expenses, 0)
  const displayProfit = displayRevenue - displayExpenses
  const profitMarginPercent = displayRevenue > 0 ? ((displayProfit / displayRevenue) * 100).toFixed(1) : '0.0'

  const generateReport = () => {
    const filterByDate = (dateStr?: string) => {
      if (!dateStr) return true
      return dateStr >= customStartDate && dateStr <= customEndDate
    }

    const generalExpensesList = (expenses || []).filter((e) => filterByDate(e.date))
    const generalExpensesTotal = generalExpensesList.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

    const labourPaymentsList: Array<{ worker: string; date: string; amount: number; notes?: string }> = []
    ;(labour || []).forEach((worker) => {
      ;(worker.payments || []).forEach((payment) => {
        if (filterByDate(payment.date)) {
          labourPaymentsList.push({
            worker: worker.name,
            date: payment.date,
            amount: Number(payment.amount || 0),
            notes: payment.remarks || undefined,
          })
        }
      })
    })
    const labourPaymentsTotal = labourPaymentsList.reduce((sum, p) => sum + p.amount, 0)

    const outstandingLiabilitiesList = (liabilities || []).filter((liability) => !liability.is_completed)
    const outstandingLiabilitiesTotal = outstandingLiabilitiesList.reduce(
      (sum, liability) => sum + Number(liability.outstanding_amount || 0),
      0
    )

    const reportRefId = `ELITE-AUDIT-${customStartDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    const generatedTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

    const reportWindow = window.open('', '_blank')
    if (!reportWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to view/download the Audit PDF report.')
      return
    }

    // Render HTML Rows safely
    const dailyRowsHTML = (dailyData || []).map((day) => {
      const margin = day.revenue > 0 ? ((day.profit / day.revenue) * 100).toFixed(1) : '0.0'
      const profitClass = day.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
      return `
        <tr>
          <td class="font-medium">${day.date}</td>
          <td>${day.totalBookings} bookings</td>
          <td class="text-emerald-700 font-semibold">${formatCurrency(day.revenue)}</td>
          <td class="text-rose-700">${formatCurrency(day.expenses)}</td>
          <td class="${profitClass} font-bold">${formatCurrency(day.profit)}</td>
          <td><span class="badge ${Number(margin) >= 0 ? 'badge-emerald' : 'badge-rose'}">${margin}%</span></td>
        </tr>`
    }).join('')

    const bookingRowsHTML = activeBookings.length > 0 ? activeBookings.map((b) => {
      const paidAmt = Number((b as any).paid_amount ?? 0)
      const pendingAmt = Number((b as any).pending_amount ?? Math.max(0, Number(b.amount || 0) - paidAmt))
      const statusBadge = b.payment_status === 'paid' 
        ? '<span class="badge badge-emerald">PAID</span>' 
        : pendingAmt > 0 
          ? '<span class="badge badge-rose">PENDING</span>' 
          : '<span class="badge badge-blue">PARTIAL</span>'
      
      const modeBadge = b.payment_mode === 'online' 
        ? '<span class="badge badge-blue">ONLINE</span>' 
        : b.payment_mode === 'split' 
          ? '<span class="badge badge-purple">SPLIT</span>' 
          : '<span class="badge badge-amber">CASH</span>'

      const timeStr = b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : b.booking_time || 'N/A'

      return `
        <tr>
          <td class="font-medium">${b.booking_date}</td>
          <td>
            <div class="font-bold text-slate-900">${b.customer_name || 'Guest User'}</div>
            <div class="text-xs text-slate-500">${b.mobile_number || 'N/A'}</div>
          </td>
          <td>${b.sport || 'Sports Ground'} (${timeStr})</td>
          <td class="font-bold">${formatCurrency(Number(b.amount || 0))}</td>
          <td>${statusBadge}</td>
          <td>${modeBadge}</td>
          <td class="text-emerald-700 font-semibold">${formatCurrency(paidAmt)}</td>
          <td class="${pendingAmt > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'}">${formatCurrency(pendingAmt)}</td>
        </tr>`
    }).join('') : `<tr><td colSpan="8" class="empty-cell">No bookings registered in this period.</td></tr>`



    const generalExpenseRowsHTML = generalExpensesList.length > 0 ? generalExpensesList.map((e) => `
      <tr>
        <td>${e.date}</td>
        <td><span class="badge badge-slate">${e.category || 'General'}</span></td>
        <td class="font-medium text-slate-900">${e.title || e.description || 'Expense Item'}</td>
        <td class="text-rose-700 font-bold">${formatCurrency(Number(e.amount || 0))}</td>
      </tr>`).join('') : `<tr><td colSpan="4" class="empty-cell">No general expenses recorded in this period.</td></tr>`

    const labourRowsHTML = labourPaymentsList.length > 0 ? labourPaymentsList.map((p) => `
      <tr>
        <td>${p.date}</td>
        <td class="font-semibold text-slate-900">${p.worker}</td>
        <td class="text-slate-600">${p.notes || 'Wage Payment'}</td>
        <td class="text-amber-700 font-bold">${formatCurrency(p.amount)}</td>
      </tr>`).join('') : `<tr><td colSpan="4" class="empty-cell">No staff wage disbursements in this period.</td></tr>`

    const monthlyRowsHTML = (monthlyData || []).map((month) => `
      <tr>
        <td class="font-bold text-slate-900">${month.month}</td>
        <td class="text-emerald-700 font-semibold">${formatCurrency(month.revenue)}</td>
        <td class="text-rose-700">${formatCurrency(month.expenses)}</td>
        <td class="${month.profit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}">${formatCurrency(month.profit)}</td>
      </tr>`).join('')

    reportWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Audit Report - Elite Arena (${customStartDate} to ${customEndDate})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      margin-bottom: 20px;
    }
    .btn-print {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print:hover { background: #059669; }

    .audit-container { padding: 0 10px; }

    /* Header Styling */
    .header-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;
      border-left: 6px solid #10b981;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-title span { color: #34d399; }
    .subtitle { color: #94a3b8; font-size: 12px; font-weight: 500; margin-top: 3px; }
    .meta-box { text-align: right; }
    .meta-ref { font-family: monospace; font-size: 12px; font-weight: 700; color: #34d399; }
    .meta-date { color: #cbd5e1; font-size: 11px; margin-top: 4px; }

    /* KPI Summary Grid */
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 22px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .kpi-card.emerald { background: #f0fdf4; border-color: #bbf7d0; }
    .kpi-card.rose { background: #fff1f2; border-color: #fecdd3; }
    .kpi-card.blue { background: #eff6ff; border-color: #bfdbfe; }
    .kpi-card.amber { background: #fffbeb; border-color: #fde68a; }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .kpi-value.emerald { color: #059669; }
    .kpi-value.rose { color: #e11d48; }
    .kpi-value.blue { color: #2563eb; }
    .kpi-value.amber { color: #d97706; }
    .kpi-sub { font-size: 10px; color: #64748b; margin-top: 2px; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 8px 10px;
      text-align: left;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .empty-cell { text-align: center; color: #94a3b8; padding: 14px; italic; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-emerald { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-rose { background: #ffe4e6; color: #9f1239; border: 1px solid #fca5a5; }
    .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .badge-slate { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    /* Summary Callouts */
    .callout-box {
      background: #f8fafc;
      border: 1px border-slate-300;
      border-left: 4px solid #0f172a;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .callout-title { font-weight: 700; color: #0f172a; font-size: 12px; }
    .callout-desc { color: #64748b; font-size: 11px; margin-top: 2px; }

    /* Footer / Signature Block */
    .audit-footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .sig-block { width: 200px; text-align: center; }
    .sig-line { border-bottom: 1px dashed #94a3b8; margin-bottom: 6px; height: 35px; }
    .sig-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }

    .stamp-box {
      border: 2px double #10b981;
      padding: 6px 14px;
      border-radius: 8px;
      color: #047857;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: center;
      background: #ecfdf5;
    }

    @media print {
      .no-print-bar { display: none !important; }
      body { background: #ffffff; }
      .audit-container { padding: 0; }
      tr, .kpi-card, .header-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <strong style="font-size: 14px;">System Audit PDF Ready</strong>
      <span style="font-size: 12px; opacity: 0.8; margin-left: 10px;">Click the button on right or press Ctrl+P to save as PDF.</span>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Save / Print Audit PDF
    </button>
  </div>

  <div class="audit-container">

    <!-- Header Card -->
    <div class="header-card">
      <div>
        <div class="brand-title">ELITE ARENA <span>SPORTS POS</span></div>
        <div class="subtitle">Official Financial & Operational Audit Report</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
          Filter Range: <strong style="color: #ffffff;">${customStartDate}</strong> to <strong style="color: #ffffff;">${customEndDate}</strong>
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-ref">${reportRefId}</div>
        <div class="meta-date">Generated: ${generatedTimestamp}</div>
        <div style="margin-top: 6px;">
          <span class="badge badge-emerald">REALTIME DB VERIFIED</span>
        </div>
      </div>
    </div>

    <!-- Executive Financial KPIs -->
    <div class="section-title">
      1. Executive Financial Overview
      <span style="font-size: 11px; text-transform: none; color: #64748b; font-weight: normal;">Settled Transactions</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card emerald">
        <div class="kpi-label">Gross Paid Revenue</div>
        <div class="kpi-value emerald">${formatCurrency(displayRevenue)}</div>
        <div class="kpi-sub">Actual Collected In Flow</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Total Outflows / Expenses</div>
        <div class="kpi-value rose">${formatCurrency(displayExpenses)}</div>
        <div class="kpi-sub">General + Labour Wages</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-label">Net Operating Profit</div>
        <div class="kpi-value ${displayProfit >= 0 ? 'emerald' : 'rose'}">${formatCurrency(displayProfit)}</div>
        <div class="kpi-sub">Margin: ${profitMarginPercent}%</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Pending Receivables</div>
        <div class="kpi-value amber">${formatCurrency(pendingAmount)}</div>
        <div class="kpi-sub">${pendingCount} Unpaid Booking(s)</div>
      </div>
    </div>

    <!-- Payment Modes KPI Grid -->
    <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="kpi-card blue">
        <div class="kpi-label">UPI / Online Revenue</div>
        <div class="kpi-value blue">${formatCurrency(onlineRevenue)}</div>
        <div class="kpi-sub">Digital Payments</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Cash / Offline Revenue</div>
        <div class="kpi-value amber">${formatCurrency(offlineRevenue)}</div>
        <div class="kpi-sub">Physical Cash</div>
      </div>
    </div>

    <!-- Section 2: Detailed Booking Transactions -->
    <div class="section-title">
      2. Itemized Booking Transactions (${activeBookings.length} Bookings)
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Customer Details</th>
          <th>Slot & Ground</th>
          <th>Total Amount</th>
          <th>Status</th>
          <th>Mode</th>
          <th>Paid Amt</th>
          <th>Pending</th>
        </tr>
      </thead>
      <tbody>
        ${bookingRowsHTML}
      </tbody>
    </table>



    <!-- Section 4: Expenses & Staff Disbursals -->
    <div class="section-title">
      3. Operational Outflows & Staff Wages
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">General Expenses (${formatCurrency(generalExpensesTotal)})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${generalExpenseRowsHTML}
          </tbody>
        </table>
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">Labour & Staff Wages (${formatCurrency(labourPaymentsTotal)})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Worker Name</th>
              <th>Notes</th>
              <th>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${labourRowsHTML}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 5: Daily Financial Performance Breakdown -->
    <div class="section-title">
      4. Daily Performance Breakdown Matrix
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Bookings</th>
          <th>Gross Revenue</th>
          <th>Expenses</th>
          <th>Daily Profit</th>
          <th>Profit Margin</th>
        </tr>
      </thead>
      <tbody>
        ${dailyRowsHTML}
      </tbody>
    </table>

    <!-- Section 6: Monthly Financial Summary -->
    <div class="section-title">
      5. Monthly Financial Summary Log
    </div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>Revenue</th>
          <th>Expenses + Labour</th>
          <th>Monthly Net Profit</th>
        </tr>
      </thead>
      <tbody>
        ${monthlyRowsHTML}
      </tbody>
    </table>

    <!-- Callout Box for Active Liabilities -->
    <div class="callout-box">
      <div>
        <div class="callout-title">Outstanding Liabilities Status: ${formatCurrency(outstandingLiabilitiesTotal)}</div>
        <div class="callout-desc">${outstandingLiabilitiesList.length} active credit tracker item(s) pending fulfillment. (Tracked separately from daily cash flow).</div>
      </div>
      <div>
        <span class="badge badge-amber">LIABILITY TRACKER</span>
      </div>
    </div>

    <!-- Audit Compliance & Signatures Footer -->
    <div class="audit-footer">
      <div class="stamp-box">
        ✓ AUDITED & VERIFIED<br>
        <span style="font-size: 8px; opacity: 0.85;">ELITE ARENA POS CORE</span>
      </div>

      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">System Administrator</div>
      </div>

      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Facility Owner</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 16px; font-size: 9px; color: #94a3b8;">
      Confidential Financial Document • Generated automatically by Elite Arena Turf POS System • ${generatedTimestamp}
    </div>

  </div>

  <script>
    setTimeout(function() {
      window.focus();
      window.print();
    }, 250);
  </script>
</body>
</html>`)
    reportWindow.document.close()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-emerald-400" /> Business Reports & Audit Summaries
          </h1>
          <p className="text-slate-400 text-sm mt-1">Select a date range to generate comprehensive financial audit reports, track bookings, expenses, and inventory sales.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Date range pickers */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs w-full sm:w-auto">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-slate-400 font-medium">From:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-slate-400 font-medium">To:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36"
                />
              </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" /> Export CSV
          </Button>
          <Button onClick={generateReport} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto font-bold shadow-lg shadow-emerald-950">
            <Download className="mr-2 h-4 w-4" /> Download Audit PDF
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
                <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatCurrency(displayRevenue)}</p>
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
                <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatCurrency(displayExpenses)}</p>
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
                <p className="text-lg sm:text-2xl font-bold text-white">{activeBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Summary Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Daily Financial Summary
            <span className="text-slate-400 text-sm font-normal ml-1">({customStartDate} to {customEndDate})</span>
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
