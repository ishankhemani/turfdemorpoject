# Customer Website + Admin Sync Update

This ZIP keeps the existing React + TypeScript + Supabase admin panel and adds a premium customer-facing website in the same project.

## Routes

- `/` customer website
- `/book` customer booking + Razorpay checkout
- `/my-bookings` customer booking history by email
- `/login` existing auth page
- `/admin/dashboard` existing owner/admin dashboard
- `/admin/bookings` existing owner booking panel
- old `/dashboard`, `/bookings`, etc. redirect to `/admin/...`

## Environment variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

Use Razorpay test key for testing. Do not put service-role keys in frontend env.

## Required SQL

Run this new migration after your existing migrations:

```text
supabase/migrations/202606290010_customer_website_sync.sql
```

It does not duplicate booking tables. It adds Supabase RPC functions that allow the public website to:

- read public slots from the existing `slots` table
- read busy slot availability from the existing `bookings` table
- insert successful paid bookings into the existing `bookings` table
- let the owner/admin panel receive the same booking instantly

## Important

Create/login to the owner admin account once before accepting public bookings. The public website writes online bookings to the first owner user in `public.users`.

## Build test

```bash
npm install
npm run build
```

Build passed in this ZIP.
