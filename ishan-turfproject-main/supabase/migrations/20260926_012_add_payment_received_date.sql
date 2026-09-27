-- Add receipt-tracking date for booking payment collections.
-- This preserves the original booking date while allowing revenue to be counted on the date a payment was actually received.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_received_date DATE;

UPDATE public.bookings
SET payment_received_date = booking_date
WHERE payment_received_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_received_date
  ON public.bookings (payment_received_date);
