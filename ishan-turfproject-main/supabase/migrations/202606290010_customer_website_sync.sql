-- Customer-facing website sync for existing Turf POS booking tables.
-- Run this after the previous admin migrations. It does not create duplicate booking tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_user_date_time_area
ON public.bookings(user_id, booking_date, booking_time, area);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'confirmed';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_transaction_id
ON public.bookings(transaction_id)
WHERE transaction_id IS NOT NULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_owner_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT id INTO v_owner
  FROM public.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'No owner account found. Sign up/login once in the admin panel before accepting public bookings.';
  END IF;

  RETURN v_owner;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_slots()
RETURNS TABLE (
  id UUID,
  booking_time TEXT,
  duration_minutes INTEGER,
  price DECIMAL(10,2),
  is_active BOOLEAN,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := public.get_public_owner_user_id();

  RETURN QUERY
  SELECT
    s.id,
    s."time"::TEXT AS booking_time,
    COALESCE(s.duration_minutes, 60)::INTEGER AS duration_minutes,
    COALESCE(s.price, 0)::DECIMAL(10,2) AS price,
    COALESCE(s.is_active, TRUE)::BOOLEAN AS is_active,
    s.user_id,
    s.created_at,
    s.updated_at
  FROM public.slots s
  WHERE s.user_id = v_owner
    AND COALESCE(s.is_active, TRUE) = TRUE
  ORDER BY s."time" ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_availability(p_date DATE)
RETURNS TABLE (
  booking_time TEXT,
  area TEXT,
  sport TEXT,
  payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := public.get_public_owner_user_id();

  RETURN QUERY
  SELECT
    b.booking_time::TEXT,
    b.area::TEXT,
    b.sport::TEXT,
    b.payment_status::TEXT
  FROM public.bookings b
  WHERE b.user_id = v_owner
    AND b.booking_date = p_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_paid_booking(
  p_customer_name TEXT,
  p_mobile_number TEXT,
  p_email TEXT,
  p_area TEXT,
  p_booking_date DATE,
  p_booking_time TEXT,
  p_sport TEXT,
  p_duration_minutes INTEGER,
  p_amount DECIMAL,
  p_transaction_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_booking_id UUID;
BEGIN
  IF p_transaction_id IS NULL OR LENGTH(TRIM(p_transaction_id)) < 6 THEN
    RAISE EXCEPTION 'Valid Razorpay transaction id is required.';
  END IF;

  v_owner := public.get_public_owner_user_id();

  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE user_id = v_owner
      AND booking_date = p_booking_date
      AND booking_time = p_booking_time
      AND area = p_area
  ) THEN
    RAISE EXCEPTION 'This slot was just booked. Please choose another available slot.';
  END IF;

  INSERT INTO public.bookings (
    customer_name,
    mobile_number,
    area,
    booking_date,
    booking_time,
    sport,
    amount,
    payment_status,
    customer_email,
    duration_minutes,
    transaction_id,
    booking_status,
    source,
    notes,
    user_id
  ) VALUES (
    p_customer_name,
    p_mobile_number,
    p_area,
    p_booking_date,
    p_booking_time,
    p_sport,
    p_amount,
    'paid',
    p_email,
    COALESCE(p_duration_minutes, 60),
    p_transaction_id,
    'confirmed',
    'website',
    CONCAT(
      'Online website booking • Email: ',
      COALESCE(p_email, ''),
      ' • Duration: ',
      COALESCE(p_duration_minutes, 60),
      ' minutes • Razorpay: ',
      p_transaction_id
    ),
    v_owner
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_bookings_by_email(p_email TEXT)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  v_owner := public.get_public_owner_user_id();

  RETURN QUERY
  SELECT *
  FROM public.bookings b
  WHERE b.user_id = v_owner
    AND (
      b.customer_email = p_email
      OR b.notes ILIKE CONCAT('%Email: ', p_email, '%')
    )
  ORDER BY b.booking_date DESC, b.booking_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_owner_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_slots() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_availability(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_paid_booking(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, INTEGER, DECIMAL, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_bookings_by_email(TEXT) TO authenticated;