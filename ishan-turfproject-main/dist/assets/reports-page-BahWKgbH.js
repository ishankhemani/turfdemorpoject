import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{_ as t}from"./charts-DmA1CST9.js";import{$t as n,Kt as r,_t as i,dn as a,jn as o,mt as s}from"./react-vendor-Cd36EnAK.js";import{a as c,i as l,n as u,s as d,t as f}from"./card-PhZEBhej.js";import{c as p,h as m,i as h,n as g}from"./index-DegRzY7S.js";import{d as _,l as v,u as y}from"./accounts-service-Crrrnytl.js";import{i as b,r as x,t as S}from"./tabs-DCljgQVd.js";import{n as C}from"./customers-service-BevqIpIj.js";var w=e(t(),1),T=o();function E(){let[e,t]=(0,w.useState)(`monthly`),{data:o,isLoading:E}=p(),{data:D}=h(),{data:O}=v(),{data:k}=y(),{data:A}=_(),{data:j}=C();if(E)return(0,T.jsx)(g,{});let M=()=>{let t=(o||[]).reduce((e,t)=>e+t.revenue,0),n=(o||[]).reduce((e,t)=>e+t.expenses,0),r=t-n,i=(O||[]).reduce((e,t)=>e+Number(t.amount),0),a=(k||[]).reduce((e,t)=>e+(t.payments||[]).reduce((e,t)=>e+Number(t.amount),0),0),s=(D||[]).filter(e=>e.payment_status===`pending`).reduce((e,t)=>e+Number(t.amount),0),c=(A||[]).filter(e=>!e.is_completed).reduce((e,t)=>e+Number(t.outstanding_amount),0),l=window.open(``,`_blank`,`noopener,noreferrer`);if(!l)return;let u=(o||[]).map(e=>`
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
    <div class="card"><div class="label">Bookings</div><div class="value">${(D||[]).length}</div></div>
  </div>
  <h2>Business Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Paid Bookings</td><td>${(D||[]).filter(e=>e.payment_status===`paid`).length}</td></tr>
    <tr><td>Pending Booking Payments</td><td>${d(s)}</td></tr>
    <tr><td>Total Customers</td><td>${(j||[]).length}</td></tr>
    <tr><td>General Expenses</td><td>${d(i)}</td></tr>
    <tr><td>Labour Paid</td><td>${d(a)}</td></tr>
    <tr><td>Outstanding Liabilities</td><td>${d(c)} (tracker only, not deducted from profit)</td></tr>
  </table>
  <h2>Monthly Financial Table</h2>
  <table><thead><tr><th>Month</th><th>Revenue</th><th>Expenses + Labour</th><th>Profit</th></tr></thead><tbody>${u}</tbody></table>
  <div class="note">Profit formula used: paid bookings + other income - expenses - labour. Liabilities are shown separately as pending payment trackers and never reduce profit.</div>
  <div class="footer">Use your browser Save as PDF option from the print dialog. This report is formatted for A4 PDF export.</div>
  <script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`),l.document.close()},N=(o||[]).reduce((e,t)=>e+t.revenue,0),P=(o||[]).reduce((e,t)=>e+t.expenses,0),F=(k||[]).reduce((e,t)=>e+(t.payments||[]).reduce((e,t)=>e+Number(t.amount),0),0),I=(A||[]).filter(e=>!e.is_completed).reduce((e,t)=>e+Number(t.outstanding_amount),0);return(0,T.jsxs)(`div`,{className:`space-y-6`,children:[(0,T.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`,children:[(0,T.jsxs)(`div`,{children:[(0,T.jsx)(`h1`,{className:`text-2xl font-bold tracking-tight`,children:`Reports`}),(0,T.jsx)(`p`,{className:`text-muted-foreground text-sm`,children:`Generate and download business reports`})]}),(0,T.jsxs)(`div`,{className:`flex gap-2`,children:[(0,T.jsx)(S,{value:e,onValueChange:e=>t(e),children:(0,T.jsxs)(x,{children:[(0,T.jsx)(b,{value:`daily`,children:`Daily`}),(0,T.jsx)(b,{value:`monthly`,children:`Monthly`}),(0,T.jsx)(b,{value:`yearly`,children:`Yearly`})]})}),(0,T.jsxs)(m,{onClick:M,children:[(0,T.jsx)(n,{className:`mr-2 h-4 w-4`}),`Download`]})]})]}),(0,T.jsxs)(`div`,{className:`grid gap-4 md:grid-cols-4`,children:[(0,T.jsx)(f,{children:(0,T.jsx)(u,{className:`p-6`,children:(0,T.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,T.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-success/10`,children:(0,T.jsx)(i,{className:`h-6 w-6 text-success`})}),(0,T.jsxs)(`div`,{children:[(0,T.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Total Revenue`}),(0,T.jsx)(`p`,{className:`text-2xl font-bold`,children:d(N)})]})]})})}),(0,T.jsx)(f,{children:(0,T.jsx)(u,{className:`p-6`,children:(0,T.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,T.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10`,children:(0,T.jsx)(r,{className:`h-6 w-6 text-destructive`})}),(0,T.jsxs)(`div`,{children:[(0,T.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Total Expenses`}),(0,T.jsx)(`p`,{className:`text-2xl font-bold`,children:d(P+F)})]})]})})}),(0,T.jsx)(f,{children:(0,T.jsx)(u,{className:`p-6`,children:(0,T.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,T.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10`,children:(0,T.jsx)(s,{className:`h-6 w-6 text-primary`})}),(0,T.jsxs)(`div`,{children:[(0,T.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Total Customers`}),(0,T.jsx)(`p`,{className:`text-2xl font-bold`,children:(j||[]).length})]})]})})}),(0,T.jsx)(f,{children:(0,T.jsx)(u,{className:`p-6`,children:(0,T.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,T.jsx)(`div`,{className:`flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10`,children:(0,T.jsx)(a,{className:`h-6 w-6 text-warning`})}),(0,T.jsxs)(`div`,{children:[(0,T.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Total Bookings`}),(0,T.jsx)(`p`,{className:`text-2xl font-bold`,children:(D||[]).length})]})]})})})]}),(0,T.jsxs)(`div`,{className:`grid gap-6 lg:grid-cols-2`,children:[(0,T.jsxs)(f,{children:[(0,T.jsx)(l,{children:(0,T.jsx)(c,{className:`text-base`,children:`Revenue Breakdown`})}),(0,T.jsx)(u,{children:(0,T.jsxs)(`div`,{className:`space-y-4`,children:[(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Total Revenue`}),(0,T.jsx)(`span`,{className:`font-bold text-success`,children:d(N)})]}),(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Booking Payments`}),(0,T.jsx)(`span`,{className:`font-medium`,children:d(N)})]}),(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Pending Payments`}),(0,T.jsx)(`span`,{className:`font-medium text-warning`,children:d((D||[]).filter(e=>e.payment_status===`pending`).reduce((e,t)=>e+Number(t.amount),0))})]})]})})]}),(0,T.jsxs)(f,{children:[(0,T.jsx)(l,{children:(0,T.jsx)(c,{className:`text-base`,children:`Expense Breakdown`})}),(0,T.jsx)(u,{children:(0,T.jsxs)(`div`,{className:`space-y-4`,children:[(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Total Expenses`}),(0,T.jsx)(`span`,{className:`font-bold text-destructive`,children:d(P+F)})]}),(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`General Expenses`}),(0,T.jsx)(`span`,{className:`font-medium`,children:d((O||[]).reduce((e,t)=>e+Number(t.amount),0))})]}),(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Labour Payments`}),(0,T.jsx)(`span`,{className:`font-medium`,children:d(F)})]}),(0,T.jsxs)(`div`,{className:`flex items-center justify-between p-3 rounded-xl bg-muted/50`,children:[(0,T.jsx)(`span`,{className:`text-sm`,children:`Outstanding Liabilities`}),(0,T.jsx)(`span`,{className:`font-medium text-warning`,children:d(I)})]})]})})]})]}),(0,T.jsxs)(f,{children:[(0,T.jsx)(l,{children:(0,T.jsx)(c,{className:`text-base`,children:`Monthly Summary`})}),(0,T.jsx)(u,{children:(0,T.jsxs)(`div`,{className:`grid gap-2`,children:[(0,T.jsxs)(`div`,{className:`grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b`,children:[(0,T.jsx)(`span`,{children:`Month`}),(0,T.jsx)(`span`,{className:`text-right`,children:`Revenue`}),(0,T.jsx)(`span`,{className:`text-right`,children:`Expenses`}),(0,T.jsx)(`span`,{className:`text-right`,children:`Profit`})]}),(o||[]).map(e=>(0,T.jsxs)(`div`,{className:`grid grid-cols-4 text-sm py-2 border-b border-muted`,children:[(0,T.jsx)(`span`,{className:`font-medium`,children:e.month}),(0,T.jsx)(`span`,{className:`text-right text-success`,children:d(e.revenue)}),(0,T.jsx)(`span`,{className:`text-right text-destructive`,children:d(e.expenses)}),(0,T.jsx)(`span`,{className:e.profit>=0?`text-right font-medium text-success`:`text-right font-medium text-destructive`,children:d(e.profit)})]},e.month))]})})]})]})}export{E as ReportsPage};