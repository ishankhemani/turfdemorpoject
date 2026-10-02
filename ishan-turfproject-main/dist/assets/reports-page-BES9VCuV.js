import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{_ as t}from"./charts-DmA1CST9.js";import{Dn as n,Vt as r,Wt as i,Xt as a,ot as o,qt as s,rn as c,st as l,ut as u}from"./react-vendor-CUaTs3Xn.js";import{d,h as f,l as p,m,p as h,u as g,x as _,y as v}from"./index-DNIjlTfc.js";import{d as y,l as b,u as x}from"./accounts-service-BtJfWGZS.js";import{o as S,r as C,t as w}from"./dashboard-service-giUjxu6H.js";import{n as T}from"./customers-service-Cl7442ca.js";import{a as E}from"./inventory-service-CbYOlp-t.js";var D=e(t(),1),O=n();function k(e,t,n){let r=Number(e||0)+Number(t||0);if(n<=0)return[0,0];if(r<=0){let e=Math.floor(n/2);return[e,n-e]}let i=Number(e||0)/r,a=Math.round(n*i);return[a,n-a]}function A(){let[e,t]=(0,D.useState)(new Date().toISOString().split(`T`)[0]),[n,A]=(0,D.useState)(new Date().toISOString().split(`T`)[0]),{data:j,isLoading:M}=S(),{data:N=[],isLoading:P}=C(void 0,e,n),{data:F}=w(),{data:I}=b(),{data:L}=x(),{data:R}=y(),{data:z}=T(),{data:B=[]}=E(e,n);if(M||P)return(0,O.jsx)(p,{});let V=()=>{let t=[`Date`,`Bookings Count`,`Revenue (INR)`,`Expenses (INR)`,`Daily Profit (INR)`],r=(N||[]).map(e=>[e.date,e.totalBookings,e.revenue,e.expenses,e.profit]),i=[t.join(`,`),...r.map(e=>e.join(`,`))].join(`
`),a=new Blob([i],{type:`text/csv;charset=utf-8;`}),o=URL.createObjectURL(a),s=document.createElement(`a`);s.href=o,s.setAttribute(`download`,`elite_arena_report_${e}_to_${n}.csv`),document.body.appendChild(s),s.click(),document.body.removeChild(s),URL.revokeObjectURL(o)},H=(F||[]).filter(t=>t.booking_date>=e&&t.booking_date<=n),U=0,W=0,G=0,K=0;H.forEach(e=>{let t=!!(e.transaction_id||e.source===`website`||e.payment_mode===`online`),n=e.payment_mode||(t?`online`:`offline`),r=Number(e.amount||0),i=Number(e.paid_amount??0),a=Number(e.pending_amount??Math.max(0,r-i));if(a>0&&(G+=a,K++),i>0)if(n===`split`){let[t,n]=k(Number(e.online_amount||0),Number(e.offline_amount||0),i);U+=t,W+=n}else n===`online`||t?U+=i:W+=i}),B.forEach(e=>{if(!e.booking_id){let t=Number(e.amount||0),n=e.payment_mode||`offline`;n===`split`?(U+=Number(e.online_amount||0),W+=Number(e.offline_amount||0)):n===`online`?U+=t:W+=t}});let q=(N||[]).reduce((e,t)=>e+t.revenue,0),J=(N||[]).reduce((e,t)=>e+t.expenses,0),Y=q-J,X=q>0?(Y/q*100).toFixed(1):`0.0`;return(0,O.jsxs)(`div`,{className:`space-y-6 max-w-7xl mx-auto`,children:[(0,O.jsxs)(`div`,{className:`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`,children:[(0,O.jsxs)(`div`,{children:[(0,O.jsxs)(`h1`,{className:`text-3xl font-bold tracking-tight text-white flex items-center gap-2`,children:[(0,O.jsx)(c,{className:`w-8 h-8 text-emerald-400`}),` Business Reports & Audit Summaries`]}),(0,O.jsx)(`p`,{className:`text-slate-400 text-sm mt-1`,children:`Select a date range to generate comprehensive financial audit reports, track bookings, expenses, and inventory sales.`})]}),(0,O.jsxs)(`div`,{className:`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto`,children:[(0,O.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs w-full sm:w-auto`,children:[(0,O.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-1`,children:[(0,O.jsx)(`span`,{className:`text-slate-400 font-medium`,children:`From:`}),(0,O.jsx)(f,{type:`date`,value:e,onChange:e=>t(e.target.value),className:`h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36`})]}),(0,O.jsxs)(`div`,{className:`flex items-center gap-1.5 flex-1`,children:[(0,O.jsx)(`span`,{className:`text-slate-400 font-medium`,children:`To:`}),(0,O.jsx)(f,{type:`date`,value:n,onChange:e=>A(e.target.value),className:`h-8 bg-slate-950 border-slate-700 text-white text-xs w-full sm:w-36`})]})]}),(0,O.jsxs)(v,{onClick:V,variant:`outline`,className:`border-slate-700 text-slate-200 hover:bg-slate-800 w-full sm:w-auto`,children:[(0,O.jsx)(i,{className:`mr-2 h-4 w-4 text-emerald-400`}),` Export CSV`]}),(0,O.jsxs)(v,{onClick:()=>{let t=t=>t?t>=e&&t<=n:!0,r=(I||[]).filter(e=>t(e.date)),i=r.reduce((e,t)=>e+Number(t.amount||0),0),a=[];(L||[]).forEach(e=>{(e.payments||[]).forEach(n=>{t(n.date)&&a.push({worker:e.name,date:n.date,amount:Number(n.amount||0),notes:n.remarks||void 0})})});let o=a.reduce((e,t)=>e+t.amount,0),s=(R||[]).filter(e=>!e.is_completed),c=s.reduce((e,t)=>e+Number(t.outstanding_amount||0),0),l=`ELITE-AUDIT-${e.replace(/-/g,``)}-${Math.floor(1e3+Math.random()*9e3)}`,u=new Date().toLocaleString(`en-IN`,{day:`2-digit`,month:`short`,year:`numeric`,hour:`2-digit`,minute:`2-digit`,hour12:!0}),d=window.open(``,`_blank`);if(!d){alert(`Pop-up blocked! Please allow pop-ups for this site to view/download the Audit PDF report.`);return}let f=(N||[]).map(e=>{let t=e.revenue>0?(e.profit/e.revenue*100).toFixed(1):`0.0`,n=e.profit>=0?`text-emerald-700`:`text-rose-700`;return`
        <tr>
          <td class="font-medium">${e.date}</td>
          <td>${e.totalBookings} bookings</td>
          <td class="text-emerald-700 font-semibold">${_(e.revenue)}</td>
          <td class="text-rose-700">${_(e.expenses)}</td>
          <td class="${n} font-bold">${_(e.profit)}</td>
          <td><span class="badge ${Number(t)>=0?`badge-emerald`:`badge-rose`}">${t}%</span></td>
        </tr>`}).join(``),p=H.length>0?H.map(e=>{let t=Number(e.paid_amount??0),n=Number(e.pending_amount??Math.max(0,Number(e.amount||0)-t)),r=e.payment_status===`paid`?`<span class="badge badge-emerald">PAID</span>`:n>0?`<span class="badge badge-rose">PENDING</span>`:`<span class="badge badge-blue">PARTIAL</span>`,i=e.payment_mode===`online`?`<span class="badge badge-blue">ONLINE</span>`:e.payment_mode===`split`?`<span class="badge badge-purple">SPLIT</span>`:`<span class="badge badge-amber">CASH</span>`,a=e.start_time&&e.end_time?`${e.start_time} - ${e.end_time}`:e.booking_time||`N/A`;return`
        <tr>
          <td class="font-medium">${e.booking_date}</td>
          <td>
            <div class="font-bold text-slate-900">${e.customer_name||`Guest User`}</div>
            <div class="text-xs text-slate-500">${e.mobile_number||`N/A`}</div>
          </td>
          <td>${e.sport||`Sports Ground`} (${a})</td>
          <td class="font-bold">${_(Number(e.amount||0))}</td>
          <td>${r}</td>
          <td>${i}</td>
          <td class="text-emerald-700 font-semibold">${_(t)}</td>
          <td class="${n>0?`text-rose-700 font-bold`:`text-slate-400`}">${_(n)}</td>
        </tr>`}).join(``):`<tr><td colSpan="8" class="empty-cell">No bookings registered in this period.</td></tr>`,m=r.length>0?r.map(e=>`
      <tr>
        <td>${e.date}</td>
        <td><span class="badge badge-slate">${e.category||`General`}</span></td>
        <td class="font-medium text-slate-900">${e.title||e.description||`Expense Item`}</td>
        <td class="text-rose-700 font-bold">${_(Number(e.amount||0))}</td>
      </tr>`).join(``):`<tr><td colSpan="4" class="empty-cell">No general expenses recorded in this period.</td></tr>`,h=a.length>0?a.map(e=>`
      <tr>
        <td>${e.date}</td>
        <td class="font-semibold text-slate-900">${e.worker}</td>
        <td class="text-slate-600">${e.notes||`Wage Payment`}</td>
        <td class="text-amber-700 font-bold">${_(e.amount)}</td>
      </tr>`).join(``):`<tr><td colSpan="4" class="empty-cell">No staff wage disbursements in this period.</td></tr>`,g=(j||[]).map(e=>`
      <tr>
        <td class="font-bold text-slate-900">${e.month}</td>
        <td class="text-emerald-700 font-semibold">${_(e.revenue)}</td>
        <td class="text-rose-700">${_(e.expenses)}</td>
        <td class="${e.profit>=0?`text-emerald-700 font-bold`:`text-rose-700 font-bold`}">${_(e.profit)}</td>
      </tr>`).join(``);d.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Audit Report - Elite Arena (${e} to ${n})</title>
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
          Filter Range: <strong style="color: #ffffff;">${e}</strong> to <strong style="color: #ffffff;">${n}</strong>
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-ref">${l}</div>
        <div class="meta-date">Generated: ${u}</div>
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
        <div class="kpi-value emerald">${_(q)}</div>
        <div class="kpi-sub">Actual Collected In Flow</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Total Outflows / Expenses</div>
        <div class="kpi-value rose">${_(J)}</div>
        <div class="kpi-sub">General + Labour Wages</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-label">Net Operating Profit</div>
        <div class="kpi-value ${Y>=0?`emerald`:`rose`}">${_(Y)}</div>
        <div class="kpi-sub">Margin: ${X}%</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Pending Receivables</div>
        <div class="kpi-value amber">${_(G)}</div>
        <div class="kpi-sub">${K} Unpaid Booking(s)</div>
      </div>
    </div>

    <!-- Payment Modes KPI Grid -->
    <div class="kpi-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="kpi-card blue">
        <div class="kpi-label">UPI / Online Revenue</div>
        <div class="kpi-value blue">${_(U)}</div>
        <div class="kpi-sub">Digital Payments</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Cash / Offline Revenue</div>
        <div class="kpi-value amber">${_(W)}</div>
        <div class="kpi-sub">Physical Cash</div>
      </div>
    </div>

    <!-- Section 2: Detailed Booking Transactions -->
    <div class="section-title">
      2. Itemized Booking Transactions (${H.length} Bookings)
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
        ${p}
      </tbody>
    </table>



    <!-- Section 4: Expenses & Staff Disbursals -->
    <div class="section-title">
      3. Operational Outflows & Staff Wages
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">General Expenses (${_(i)})</div>
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
            ${m}
          </tbody>
        </table>
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">Labour & Staff Wages (${_(o)})</div>
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
            ${h}
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
        ${f}
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
        ${g}
      </tbody>
    </table>

    <!-- Callout Box for Active Liabilities -->
    <div class="callout-box">
      <div>
        <div class="callout-title">Outstanding Liabilities Status: ${_(c)}</div>
        <div class="callout-desc">${s.length} active credit tracker item(s) pending fulfillment. (Tracked separately from daily cash flow).</div>
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
      Confidential Financial Document • Generated automatically by Elite Arena Turf POS System • ${u}
    </div>

  </div>

  <script>
    setTimeout(function() {
      window.focus();
      window.print();
    }, 250);
  <\/script>
</body>
</html>`),d.document.close()},className:`bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto font-bold shadow-lg shadow-emerald-950`,children:[(0,O.jsx)(s,{className:`mr-2 h-4 w-4`}),` Download Audit PDF`]})]})]}),(0,O.jsxs)(`div`,{className:`grid gap-3 grid-cols-2 lg:grid-cols-4`,children:[(0,O.jsx)(g,{className:`bg-slate-900/80 border-slate-800`,children:(0,O.jsx)(d,{className:`p-4 sm:p-6`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3 sm:gap-4`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shrink-0`,children:(0,O.jsx)(u,{className:`h-5 w-5 sm:h-6 sm:w-6`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Paid Revenue`}),(0,O.jsx)(`p`,{className:`text-lg sm:text-2xl font-bold text-white truncate`,children:_(q)})]})]})})}),(0,O.jsx)(g,{className:`bg-slate-900/80 border-slate-800`,children:(0,O.jsx)(d,{className:`p-4 sm:p-6`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3 sm:gap-4`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-red-950/80 border border-red-800 text-red-400 shrink-0`,children:(0,O.jsx)(r,{className:`h-5 w-5 sm:h-6 sm:w-6`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Expenses`}),(0,O.jsx)(`p`,{className:`text-lg sm:text-2xl font-bold text-white truncate`,children:_(J)})]})]})})}),(0,O.jsx)(g,{className:`bg-slate-900/80 border-slate-800`,children:(0,O.jsx)(d,{className:`p-4 sm:p-6`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3 sm:gap-4`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 shrink-0`,children:(0,O.jsx)(l,{className:`h-5 w-5 sm:h-6 sm:w-6`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Customers`}),(0,O.jsx)(`p`,{className:`text-lg sm:text-2xl font-bold text-white`,children:(z||[]).length})]})]})})}),(0,O.jsx)(g,{className:`bg-slate-900/80 border-slate-800`,children:(0,O.jsx)(d,{className:`p-4 sm:p-6`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3 sm:gap-4`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0`,children:(0,O.jsx)(c,{className:`h-5 w-5 sm:h-6 sm:w-6`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Total Bookings`}),(0,O.jsx)(`p`,{className:`text-lg sm:text-2xl font-bold text-white`,children:H.length})]})]})})})]}),(0,O.jsxs)(`div`,{className:`grid gap-3 grid-cols-1 sm:grid-cols-3`,children:[(0,O.jsx)(g,{className:`bg-slate-900/80 border-blue-900/40`,children:(0,O.jsx)(d,{className:`p-4 sm:p-5`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 shrink-0`,children:(0,O.jsx)(u,{className:`h-5 w-5`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Online Revenue (UPI/Card)`}),(0,O.jsx)(`p`,{className:`text-xl font-bold text-blue-400 truncate`,children:_(U)}),(0,O.jsx)(`p`,{className:`text-[10px] text-slate-500`,children:`Paid via digital`})]})]})})}),(0,O.jsx)(g,{className:`bg-slate-900/80 border-amber-900/40`,children:(0,O.jsx)(d,{className:`p-4 sm:p-5`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 shrink-0`,children:(0,O.jsx)(o,{className:`h-5 w-5`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Cash / Offline Revenue`}),(0,O.jsx)(`p`,{className:`text-xl font-bold text-amber-400 truncate`,children:_(W)}),(0,O.jsx)(`p`,{className:`text-[10px] text-slate-500`,children:`Paid in cash`})]})]})})}),(0,O.jsx)(g,{className:`bg-slate-900/80 border-red-900/40`,children:(0,O.jsx)(d,{className:`p-4 sm:p-5`,children:(0,O.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,O.jsx)(`div`,{className:`flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/80 border border-red-800 text-red-400 shrink-0`,children:(0,O.jsx)(a,{className:`h-5 w-5`})}),(0,O.jsxs)(`div`,{className:`min-w-0`,children:[(0,O.jsx)(`p`,{className:`text-xs text-slate-400`,children:`Pending (Unpaid)`}),(0,O.jsx)(`p`,{className:`text-xl font-bold text-red-400 truncate`,children:_(G)}),(0,O.jsxs)(`p`,{className:`text-[10px] text-slate-500`,children:[K,` booking(s) unpaid`]})]})]})})})]}),(0,O.jsxs)(g,{className:`bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden`,children:[(0,O.jsx)(h,{className:`border-b border-slate-800 pb-4 flex flex-row items-center justify-between`,children:(0,O.jsxs)(m,{className:`text-lg text-white flex items-center gap-2`,children:[(0,O.jsx)(c,{className:`w-5 h-5 text-emerald-400`}),` Daily Financial Summary`,(0,O.jsxs)(`span`,{className:`text-slate-400 text-sm font-normal ml-1`,children:[`(`,e,` to `,n,`)`]})]})}),(0,O.jsx)(d,{className:`p-0`,children:(0,O.jsx)(`div`,{className:`overflow-x-auto`,children:(0,O.jsxs)(`table`,{className:`w-full text-left text-sm text-slate-300`,children:[(0,O.jsx)(`thead`,{className:`bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800`,children:(0,O.jsxs)(`tr`,{children:[(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Date`}),(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Bookings Count`}),(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Revenue`}),(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Expenses`}),(0,O.jsx)(`th`,{className:`px-6 py-4 text-right`,children:`Daily Profit`})]})}),(0,O.jsx)(`tbody`,{className:`divide-y divide-slate-800/60`,children:N.length===0?(0,O.jsx)(`tr`,{children:(0,O.jsx)(`td`,{colSpan:5,className:`px-6 py-8 text-center text-slate-500`,children:`No daily records found for the selected range.`})}):N.map(e=>(0,O.jsxs)(`tr`,{className:`hover:bg-slate-800/40 transition-colors`,children:[(0,O.jsx)(`td`,{className:`px-6 py-4 font-semibold text-white`,children:e.date}),(0,O.jsxs)(`td`,{className:`px-6 py-4 text-slate-300`,children:[e.totalBookings,` bookings`]}),(0,O.jsx)(`td`,{className:`px-6 py-4 text-emerald-400 font-bold`,children:_(e.revenue)}),(0,O.jsx)(`td`,{className:`px-6 py-4 text-red-400 font-medium`,children:_(e.expenses)}),(0,O.jsx)(`td`,{className:e.profit>=0?`px-6 py-4 text-right font-bold text-emerald-400`:`px-6 py-4 text-right font-bold text-red-400`,children:_(e.profit)})]},e.date))})]})})})]}),(0,O.jsxs)(g,{className:`bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden`,children:[(0,O.jsx)(h,{className:`border-b border-slate-800 pb-4`,children:(0,O.jsxs)(m,{className:`text-lg text-white flex items-center gap-2`,children:[(0,O.jsx)(u,{className:`w-5 h-5 text-emerald-400`}),` Monthly Financial Breakdown`]})}),(0,O.jsx)(d,{className:`p-0`,children:(0,O.jsx)(`div`,{className:`overflow-x-auto`,children:(0,O.jsxs)(`table`,{className:`w-full text-left text-sm text-slate-300`,children:[(0,O.jsx)(`thead`,{className:`bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800`,children:(0,O.jsxs)(`tr`,{children:[(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Month`}),(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Revenue`}),(0,O.jsx)(`th`,{className:`px-6 py-4`,children:`Expenses + Labour`}),(0,O.jsx)(`th`,{className:`px-6 py-4 text-right`,children:`Monthly Profit`})]})}),(0,O.jsx)(`tbody`,{className:`divide-y divide-slate-800/60`,children:(j||[]).map(e=>(0,O.jsxs)(`tr`,{className:`hover:bg-slate-800/40 transition-colors`,children:[(0,O.jsx)(`td`,{className:`px-6 py-4 font-semibold text-white`,children:e.month}),(0,O.jsx)(`td`,{className:`px-6 py-4 text-emerald-400 font-bold`,children:_(e.revenue)}),(0,O.jsx)(`td`,{className:`px-6 py-4 text-red-400 font-medium`,children:_(e.expenses)}),(0,O.jsx)(`td`,{className:e.profit>=0?`px-6 py-4 text-right font-bold text-emerald-400`:`px-6 py-4 text-right font-bold text-red-400`,children:_(e.profit)})]},e.month))})]})})})]})]})}export{A as ReportsPage};