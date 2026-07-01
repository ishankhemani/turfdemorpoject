-- Production hardening: slot conflicts, customer aggregation, marketing compatibility, other income.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prevent double booking for the same user + date + time + ground/area.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bookings_user_date_time_area
ON public.bookings(user_id, booking_date, booking_time, area);

-- Track other income without mixing it into liabilities or expenses.
CREATE TABLE IF NOT EXISTS public.other_income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_income_user_id ON public.other_income(user_id);
CREATE INDEX IF NOT EXISTS idx_other_income_date ON public.other_income(date);
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own other income" ON public.other_income;
CREATE POLICY "Users can view own other income" ON public.other_income
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own other income" ON public.other_income;
CREATE POLICY "Users can create own other income" ON public.other_income
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own other income" ON public.other_income;
CREATE POLICY "Users can update own other income" ON public.other_income
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own other income" ON public.other_income;
CREATE POLICY "Users can delete own other income" ON public.other_income
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS other_income_updated_at ON public.other_income;
CREATE TRIGGER other_income_updated_at
  BEFORE UPDATE ON public.other_income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Marketing column compatibility for older code/builds.
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'custom';

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_campaign_type_check
  CHECK (campaign_type IN ('seasonal', 'festival', 'tournament', 'membership', 'custom')) NOT VALID;

-- Recalculate customer totals from bookings so create/edit/delete never corrupts customer analytics.
CREATE OR REPLACE FUNCTION public.recalculate_customer_from_bookings(p_user_id UUID, p_phone TEXT)
RETURNS VOID AS $$
DECLARE
  latest_booking RECORD;
  booking_count INTEGER;
  paid_total DECIMAL(10,2);
BEGIN
  SELECT * INTO latest_booking
  FROM public.bookings
  WHERE user_id = p_user_id AND mobile_number = p_phone
  ORDER BY booking_date DESC, booking_time DESC, created_at DESC
  LIMIT 1;

  IF latest_booking IS NULL THEN
    DELETE FROM public.customers WHERE user_id = p_user_id AND phone = p_phone;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0)
  INTO booking_count, paid_total
  FROM public.bookings
  WHERE user_id = p_user_id AND mobile_number = p_phone;

  INSERT INTO public.customers (name, phone, area, total_bookings, total_spent, last_booking_date, user_id)
  VALUES (latest_booking.customer_name, p_phone, latest_booking.area, booking_count, paid_total, latest_booking.booking_date, p_user_id)
  ON CONFLICT (user_id, phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    area = EXCLUDED.area,
    total_bookings = EXCLUDED.total_bookings,
    total_spent = EXCLUDED.total_spent,
    last_booking_date = EXCLUDED.last_booking_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_customer_after_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_customer_from_bookings(OLD.user_id, OLD.mobile_number);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_customer_from_bookings(NEW.user_id, NEW.mobile_number);
  IF TG_OP = 'UPDATE' AND OLD.mobile_number <> NEW.mobile_number THEN
    PERFORM public.recalculate_customer_from_bookings(OLD.user_id, OLD.mobile_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS bookings_customer_sync ON public.bookings;
CREATE TRIGGER bookings_customer_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_after_booking_change();
