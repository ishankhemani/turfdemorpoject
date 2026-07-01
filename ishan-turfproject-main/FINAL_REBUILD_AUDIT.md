# Premium Turf POS Rebuild Audit

## Build
- `npm install` completed successfully.
- `npm run build` completed successfully.

## Production fixes applied
- Fixed Marketing/Supabase schema mismatch: app now writes `campaign_type` to `marketing_campaigns`.
- Added real slot conflict prevention in frontend service.
- Added DB-level unique index to prevent double booking for same user/date/time/area.
- Added customer recalculation logic after booking create, edit, phone change, payment-status change, and delete.
- Added PostgreSQL trigger + function to keep customer totals correct even if data changes outside the frontend.
- Added 5-minute upcoming booking notification hook and notification bell integration.
- Replaced fake notification data with real today-booking reminders.
- Added A4 browser-PDF report generation flow with formatted business report, summary, tables, and print-to-PDF support.
- Added `other_income` table and included other income in dashboard/monthly revenue calculations.
- Kept liabilities separate from profit calculations.
- Fixed booking amount form parsing with `valueAsNumber`.
- Verified no `any` keyword usage in `src`.

## Business logic now covered
- Paid bookings count as Money In.
- Other income counts as Money In.
- Expenses + labour count as Money Out.
- Profit = Money In - Expenses - Labour.
- Liabilities never reduce profit.
- Partial liability payments reduce outstanding amount.
- Completed liabilities are marked when outstanding reaches zero.
- Customer records are generated from bookings and recalculated from source truth.
- Same slot cannot be double-booked.

## Supabase setup
Run migrations in order from `supabase/migrations/`.
The most important production hardening migration is:
`20260628074820_009_production_hardening.sql`

## Commands verified
```bash
npm install
npm run build
```
