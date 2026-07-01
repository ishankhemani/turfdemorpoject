# Ecommerce + Admin Sync Audit

## Build
- `npm run build` passed.

## Verified sync path
1. Customer opens `/book`.
2. Slots are loaded from existing `public.slots` through `get_public_slots()`.
3. Busy slots are loaded from existing `public.bookings` through `get_public_availability(date)`.
4. Razorpay checkout opens with `VITE_RAZORPAY_KEY_ID`.
5. On Razorpay success, `create_public_paid_booking()` inserts into existing `public.bookings`.
6. Insert includes: customer name, phone, email, sport, date, time, duration, amount, paid status, booking status, Razorpay transaction id, and source = website.
7. Unique indexes prevent duplicate slot booking and duplicate transaction id.
8. Supabase Realtime invalidates admin dashboard/bookings/customers/analytics queries instantly.
9. Admin navbar shows a toast notification for new website bookings.
10. Dashboard revenue updates because paid bookings are included in cash-in.
11. Booking appears in existing Bookings section because it uses the same `bookings` table.
12. Slot becomes busy because availability is computed from `bookings`.

## Required SQL
Run `supabase/migrations/202606290010_customer_website_sync.sql` once after the existing migrations. It is additive and does not duplicate tables.

## Required env
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`

## Important production note
This frontend-only Razorpay flow records successful Razorpay checkout responses. For full payment-grade production verification, add a server-side verification layer using Razorpay order creation + signature verification through Supabase Edge Functions or another secure backend before marking a booking paid.
