import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{_ as t}from"./charts-DmA1CST9.js";import{Kt as n,Zt as r,gt as i,kn as a,mt as o,on as s}from"./react-vendor-DoylO473.js";import{a as c,i as l,n as u,s as d,t as f}from"./card-aZx9jeaT.js";import{C as p,b as m,d as h,g,l as _,p as v}from"./index-CARpkhEC.js";import{d as y,l as b,u as x}from"./accounts-service-xJi6G5OH.js";import{i as S,r as C,t as w}from"./tabs-Dnn1rpEc.js";import{n as T}from"./customers-service-BcDKnCN8.js";var E=e(t(),1),D=a();function O(){let[e,t]=(0,E.useState)(`daily`),[a,O]=(0,E.useState)(new Date().toISOString().split(`T`)[0]),[k,A]=(0,E.useState)(new Date().toISOString().split(`T`)[0]),{data:j,isLoading:M}=g(),{data:N=[],isLoading:P}=v(e===`custom`?void 0:10,e===`custom`?a:void 0,e===`custom`?k:void 0),{data:F}=h(),{data:I}=b(),{data:L}=x(),{data:R}=y(),{data:z}=T();if(M||P)return(0,D.jsx)(_,{});let B=()=>{let t=(j||[]).reduce((e,t)=>e+t.revenue,0),n=(j||[]).reduce((e,t)=>e+t.expenses,0),r=t-n,i=(I||[]).reduce((e,t)=>e+Number(t.amount),0),o=(L||[]).reduce((e,t)=>e+(t.payments||[]).reduce((e,t)=>e+Number(t.amount),0),0),s=(F||[]).filter(e=>e.payment_status===`pending`).reduce((e,t)=>e+Number(t.amount),0),c=(R||[]).filter(e=>!e.is_completed).reduce((e,t)=>e+Number(t.outstanding_amount),0),l=window.open(``,`_blank`,`noopener,noreferrer`);if(!l)return;let u=(N||[]).map(e=>`
      <tr>
        <td>${e.date}</td>
        <td>${e.totalBookings}</td>
        <td>${d(e.revenue)}</td>
        <td>${d(e.expenses)}</td>
        <td>${d(e.profit)}</td>
      </tr>`).join(``),f=(j||[]).map(e=>`
      <tr>
        <td>${e.month}</td>
        <td>${d(e.revenue)}</td>
        <td>${d(e.expenses)}</td>
        <td>${d(e.profit)}</td>
      </tr>`).join(``);l.document.write(`<!doctype html>
<html>
<head>
  <title>Turf POS ${e} report</title>
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
      <div class="muted">${e.toUpperCase()} REPORT • Generated ${new Date().toLocaleString()}</div>
    </div>
    <div class="muted">Production financial summary</div>
  </div>
  <div class="grid">
    <div class="card"><div class="label">Revenue</div><div class="value">${d(t)}</div></div>
    <div class="card"><div class="label">Money Out</div><div class="value">${d(n)}</div></div>
    <div class="card"><div class="label">Profit</div><div class="value">${d(r)}</div></div>
    <div class="card"><div class="label">Bookings</div><div class="value">${(F||[]).length}</div></div>
  </div>
  <h2>Business Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Paid Bookings</td><td>${(F||[]).filter(e=>e.payment_status===`paid`).length}</td></tr>
    <tr><td>Pending Booking Payments</td><td>${d(s)}</td></tr>
    <tr><td>Total Customers</td><td>${(z||[]).length}</td></tr>
    <tr><td>General Expenses</td><td>${d(i)}</td></tr>
    <tr><td>Labour Paid</td><td>${d(o)}</td></tr>
    <tr><td>Outstanding Liabilities</td><td>${d(c)} (tracker only, not deducted from profit)</td></tr>
  </table>

  <h2>Daily Summary (${e===`custom`?`${a} to ${k}`:`Recent Days`})</h2>
  <table><thead><tr><th>Date</th><th>Bookings</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead><tbody>${u}</tbody></table>

  <h2>Monthly Financial Table</h2>
  <table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses + Labour</th><th>Profit</th></tr></thead><tbody>${f}</tbody></table>

  <div class="note">Profit formula used: paid bookings + other income - expenses - labour.</div>
  <div class="footer">Formatted for A4 PDF export. Use browser print options.</div>
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`),l.document.close()},V=(j||[]).reduce((e,t)=>e+t.revenue,0),H=(j||[]).reduce((e,t)=>e+t.expenses,0),U=(L||[]).reduce((e,t)=>e+(t.payments||[]).reduce((e,t)=>e+Number(t.amount),0),0);return(R||[]).filter(e=>!e.is_completed).reduce((e,t)=>e+Number(t.outstanding_amount),0),(0,D.jsxs)(`div`,{className:`space-y-6 max-w-7xl mx-auto`,children:[(0,D.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`,children:[(0,D.jsxs)(`div`,{children:[(0,D.jsxs)(`h1`,{className:`text-3xl font-bold tracking-tight text-white flex items-center gap-2`,children:[(0,D.jsx)(s,{className:`w-8 h-8 text-emerald-400`}),` Business Reports & Summaries`]}),(0,D.jsx)(`p`,{className:`text-slate-400 text-sm mt-1`,children:`View daily breakdown, monthly performance, and custom date range reports.`})]}),(0,D.jsxs)(`div`,{className:`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto`,children:[e===`custom`&&(0,D.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs w-full sm:w-auto`,children:[(0,D.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-1`,children:[(0,D.jsx)(`span`,{className:`text-slate-400`,children:`From:`}),(0,D.jsx)(m,{type:`date`,value:a,onChange:e=>O(e.target.value),className:`h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36`})]}),(0,D.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-1`,children:[(0,D.jsx)(`span`,{className:`text-slate-400`,children:`To:`}),(0,D.jsx)(m,{type:`date`,value:k,onChange:e=>A(e.target.value),className:`h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36`})]})]}),(0,D.jsx)(w,{value:e,onValueChange:e=>t(e),className:`w-full sm:w-auto`,children:(0,D.jsxs)(C,{className:`bg-slate-800/80 w-full justify-start overflow-x-auto`,children:[(0,D.jsx)(S,{value:`daily`,className:`flex-1 sm:flex-initial data-[state=active]:bg-emerald-600`,children:`Daily Summary`}),(0,D.jsx)(S,{value:`monthly`,className:`flex-1 sm:flex-initial data-[state=active]:bg-emerald-600`,children:`Monthly Summary`}),(0,D.jsx)(S,{value:`custom`,className:`flex-1 sm:flex-initial data-[state=active]:bg-emerald-600`,children:`Custom Search`})]})}),(0,D.jsxs)(p,{onClick:B,className:`bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto`,children:[(0,D.jsx)(r,{className:`mr-2 h-4 w-4`}),` Download PDF`]})]})]}),(0,D.jsxs)(`div`,{className:`grid gap-3 grid-cols-2 lg:grid-cols-4`,children:[(0,D.jsx)(f,{className:`bg-slate-900/80 border-slate-800`,children:(0,D.jsx)(u,{className:`p-6`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,D.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400`,children:(0,D.jsx)(i,{className:`h-6 w-6`})}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Revenue`}),(0,D.jsx)(`p`,{className:`text-2xl font-bold text-white`,children:d(V)})]})]})})}),(0,D.jsx)(f,{className:`bg-slate-900/80 border-slate-800`,children:(0,D.jsx)(u,{className:`p-6`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,D.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-red-950/80 border border-red-800 text-red-400`,children:(0,D.jsx)(n,{className:`h-6 w-6`})}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Expenses`}),(0,D.jsx)(`p`,{className:`text-2xl font-bold text-white`,children:d(H+U)})]})]})})}),(0,D.jsx)(f,{className:`bg-slate-900/80 border-slate-800`,children:(0,D.jsx)(u,{className:`p-6`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,D.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400`,children:(0,D.jsx)(o,{className:`h-6 w-6`})}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Customers`}),(0,D.jsx)(`p`,{className:`text-2xl font-bold text-white`,children:(z||[]).length})]})]})})}),(0,D.jsx)(f,{className:`bg-slate-900/80 border-slate-800`,children:(0,D.jsx)(u,{className:`p-6`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,D.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400`,children:(0,D.jsx)(s,{className:`h-6 w-6`})}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Bookings`}),(0,D.jsx)(`p`,{className:`text-2xl font-bold text-white`,children:(F||[]).length})]})]})})})]}),(0,D.jsxs)(f,{className:`bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden`,children:[(0,D.jsx)(l,{className:`border-b border-slate-800 pb-4 flex flex-row items-center justify-between`,children:(0,D.jsxs)(c,{className:`text-lg text-white flex items-center gap-2`,children:[(0,D.jsx)(s,{className:`w-5 h-5 text-emerald-400`}),` Daily Financial Summary`,e===`custom`?` (${a} to ${k})`:` (Last 10 Days)`]})}),(0,D.jsx)(u,{className:`p-0`,children:(0,D.jsx)(`div`,{className:`overflow-x-auto`,children:(0,D.jsxs)(`table`,{className:`w-full text-left text-sm text-slate-300`,children:[(0,D.jsx)(`thead`,{className:`bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800`,children:(0,D.jsxs)(`tr`,{children:[(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Date`}),(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Bookings Count`}),(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Revenue`}),(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Expenses`}),(0,D.jsx)(`th`,{className:`px-6 py-4 text-right`,children:`Daily Profit`})]})}),(0,D.jsx)(`tbody`,{className:`divide-y divide-slate-800/60`,children:N.length===0?(0,D.jsx)(`tr`,{children:(0,D.jsx)(`td`,{colSpan:5,className:`px-6 py-8 text-center text-slate-500`,children:`No daily records found for the selected range.`})}):N.map(e=>(0,D.jsxs)(`tr`,{className:`hover:bg-slate-800/40 transition-colors`,children:[(0,D.jsx)(`td`,{className:`px-6 py-4 font-semibold text-white`,children:e.date}),(0,D.jsxs)(`td`,{className:`px-6 py-4 text-slate-300`,children:[e.totalBookings,` bookings`]}),(0,D.jsx)(`td`,{className:`px-6 py-4 text-emerald-400 font-bold`,children:d(e.revenue)}),(0,D.jsx)(`td`,{className:`px-6 py-4 text-red-400 font-medium`,children:d(e.expenses)}),(0,D.jsx)(`td`,{className:e.profit>=0?`px-6 py-4 text-right font-bold text-emerald-400`:`px-6 py-4 text-right font-bold text-red-400`,children:d(e.profit)})]},e.date))})]})})})]}),(0,D.jsxs)(f,{className:`bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden`,children:[(0,D.jsx)(l,{className:`border-b border-slate-800 pb-4`,children:(0,D.jsxs)(c,{className:`text-lg text-white flex items-center gap-2`,children:[(0,D.jsx)(i,{className:`w-5 h-5 text-emerald-400`}),` Monthly Financial Breakdown`]})}),(0,D.jsx)(u,{className:`p-0`,children:(0,D.jsx)(`div`,{className:`overflow-x-auto`,children:(0,D.jsxs)(`table`,{className:`w-full text-left text-sm text-slate-300`,children:[(0,D.jsx)(`thead`,{className:`bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800`,children:(0,D.jsxs)(`tr`,{children:[(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Month`}),(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Revenue`}),(0,D.jsx)(`th`,{className:`px-6 py-4`,children:`Expenses + Labour`}),(0,D.jsx)(`th`,{className:`px-6 py-4 text-right`,children:`Monthly Profit`})]})}),(0,D.jsx)(`tbody`,{className:`divide-y divide-slate-800/60`,children:(j||[]).map(e=>(0,D.jsxs)(`tr`,{className:`hover:bg-slate-800/40 transition-colors`,children:[(0,D.jsx)(`td`,{className:`px-6 py-4 font-semibold text-white`,children:e.month}),(0,D.jsx)(`td`,{className:`px-6 py-4 text-emerald-400 font-bold`,children:d(e.revenue)}),(0,D.jsx)(`td`,{className:`px-6 py-4 text-red-400 font-medium`,children:d(e.expenses)}),(0,D.jsx)(`td`,{className:e.profit>=0?`px-6 py-4 text-right font-bold text-emerald-400`:`px-6 py-4 text-right font-bold text-red-400`,children:d(e.profit)})]},e.month))})]})})})]})]})}export{O as ReportsPage};