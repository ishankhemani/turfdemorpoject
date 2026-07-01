# Demo Seed Data

Use this only for prototype recording/demo.

## Steps

1. Run all files in `supabase/migrations/` first.
2. Create/register one user in the app.
3. Open Supabase SQL Editor.
4. Run `supabase/seed_demo.sql`.
5. Refresh the app.

It fills:

- Bookings
- Customers automatically via booking trigger
- Expenses
- Labour + payment history
- Liabilities + partial payments
- Other income
- Marketing campaigns
- Slots

The seed is repeat-safe for the included demo records: running it again resets only the demo records listed inside the file.
