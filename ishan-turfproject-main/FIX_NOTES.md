# Fix Notes

Fixed issues reported during prototype testing:

- Accounts amount fields now submit correctly for Expenses, Labour Payments, Liabilities, and Liability Payments.
- Numeric fields use React Hook Form `valueAsNumber`, so Zod receives real numbers instead of strings.
- Added min/step on money inputs to prevent invalid amount entries.
- Forms reset cleanly after successful add/payment actions.
- Booking times no longer show `Invalid Date`.
- Added safe time formatting for `HH:mm` database values.
- Booking slot labels now show real readable ranges like `1:00 PM - 2:00 PM`.
- Build verified with `npm run build`.
