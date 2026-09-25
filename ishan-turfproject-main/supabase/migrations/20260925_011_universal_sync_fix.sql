-- ============================================================
-- ELITE ARENA — UNIVERSAL SYNC FIX MIGRATION
-- Run this entire script in: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- FIX 1: Add paid_amount + pending_amount to bookings
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(10,2) DEFAULT 0;

UPDATE public.bookings
SET paid_amount = amount, pending_amount = 0
WHERE payment_status = 'paid' AND paid_amount = 0;

UPDATE public.bookings
SET paid_amount = 0, pending_amount = amount
WHERE payment_status = 'pending' AND pending_amount = 0;


-- ============================================================
-- FIX 2: Open RLS Policies for Universal Sync
-- ============================================================

-- Use DO blocks with existence checks to avoid errors when some tables don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
      DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
      DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
      DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
      CREATE POLICY "Authenticated can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customers') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
      DROP POLICY IF EXISTS "Users can create own customers" ON public.customers;
      DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
      DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
      CREATE POLICY "Authenticated can view all customers" ON public.customers FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update customers" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
      DROP POLICY IF EXISTS "Users can create own expenses" ON public.expenses;
      DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
      DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
      CREATE POLICY "Authenticated can view all expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
      DROP POLICY IF EXISTS "Users can create own inventory items" ON public.inventory_items;
      DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
      DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;
      CREATE POLICY "Authenticated can view all inventory items" ON public.inventory_items FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create inventory items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update inventory items" ON public.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete inventory items" ON public.inventory_items FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_sales') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own inventory sales" ON public.inventory_sales;
      DROP POLICY IF EXISTS "Users can create own inventory sales" ON public.inventory_sales;
      DROP POLICY IF EXISTS "Users can update own inventory sales" ON public.inventory_sales;
      DROP POLICY IF EXISTS "Users can delete own inventory sales" ON public.inventory_sales;
      CREATE POLICY "Authenticated can view all inventory sales" ON public.inventory_sales FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create inventory sales" ON public.inventory_sales FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update inventory sales" ON public.inventory_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete inventory sales" ON public.inventory_sales FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'labour') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own labour" ON public.labour;
      DROP POLICY IF EXISTS "Users can create own labour" ON public.labour;
      DROP POLICY IF EXISTS "Users can update own labour" ON public.labour;
      DROP POLICY IF EXISTS "Users can delete own labour" ON public.labour;
      CREATE POLICY "Authenticated can view all labour" ON public.labour FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create labour" ON public.labour FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update labour" ON public.labour FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete labour" ON public.labour FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'labour_payments') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own labour payments" ON public.labour_payments;
      DROP POLICY IF EXISTS "Users can create own labour payments" ON public.labour_payments;
      DROP POLICY IF EXISTS "Users can update own labour payments" ON public.labour_payments;
      DROP POLICY IF EXISTS "Users can delete own labour payments" ON public.labour_payments;
      CREATE POLICY "Authenticated can view all labour payments" ON public.labour_payments FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create labour payments" ON public.labour_payments FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update labour payments" ON public.labour_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete labour payments" ON public.labour_payments FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'liabilities') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own liabilities" ON public.liabilities;
      DROP POLICY IF EXISTS "Users can create own liabilities" ON public.liabilities;
      DROP POLICY IF EXISTS "Users can update own liabilities" ON public.liabilities;
      DROP POLICY IF EXISTS "Users can delete own liabilities" ON public.liabilities;
      CREATE POLICY "Authenticated can view all liabilities" ON public.liabilities FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create liabilities" ON public.liabilities FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update liabilities" ON public.liabilities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete liabilities" ON public.liabilities FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'liability_payments') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own liability payments" ON public.liability_payments;
      DROP POLICY IF EXISTS "Users can create own liability payments" ON public.liability_payments;
      DROP POLICY IF EXISTS "Users can update own liability payments" ON public.liability_payments;
      DROP POLICY IF EXISTS "Users can delete own liability payments" ON public.liability_payments;
      CREATE POLICY "Authenticated can view all liability payments" ON public.liability_payments FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create liability payments" ON public.liability_payments FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update liability payments" ON public.liability_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete liability payments" ON public.liability_payments FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'other_income') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own other income" ON public.other_income;
      DROP POLICY IF EXISTS "Users can create own other income" ON public.other_income;
      DROP POLICY IF EXISTS "Users can update own other income" ON public.other_income;
      DROP POLICY IF EXISTS "Users can delete own other income" ON public.other_income;
      CREATE POLICY "Authenticated can view all other income" ON public.other_income FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create other income" ON public.other_income FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update other income" ON public.other_income FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete other income" ON public.other_income FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_campaigns') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own marketing campaigns" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "Users can create own marketing campaigns" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "Users can update own marketing campaigns" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "Users can delete own marketing campaigns" ON public.marketing_campaigns;
      CREATE POLICY "Authenticated can view all marketing campaigns" ON public.marketing_campaigns FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create marketing campaigns" ON public.marketing_campaigns FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update marketing campaigns" ON public.marketing_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete marketing campaigns" ON public.marketing_campaigns FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'slots') THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can view own slots" ON public.slots;
      DROP POLICY IF EXISTS "Users can create own slots" ON public.slots;
      DROP POLICY IF EXISTS "Users can update own slots" ON public.slots;
      DROP POLICY IF EXISTS "Users can delete own slots" ON public.slots;
      CREATE POLICY "Authenticated can view all slots" ON public.slots FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Authenticated can create slots" ON public.slots FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "Authenticated can update slots" ON public.slots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "Authenticated can delete slots" ON public.slots FOR DELETE TO authenticated USING (true);
    $policy$;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FIX 3: Fix customer unique constraint to phone-only
-- ============================================================

-- Remove duplicates before adding constraint (keep highest booking count)
DELETE FROM public.customers a
USING public.customers b
WHERE a.phone = b.phone AND a.id > b.id AND a.total_bookings <= b.total_bookings;

-- Drop old constraint
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_user_id_phone_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;

-- Add phone-only unique constraint
ALTER TABLE public.customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);


-- ============================================================
-- FIX 4: Update DB stored procedure — universal customer sync
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_customer_from_bookings(p_user_id UUID, p_phone TEXT)
RETURNS VOID AS $$
DECLARE
  latest_booking RECORD;
  booking_count INTEGER;
  paid_total DECIMAL(10,2);
BEGIN
  SELECT * INTO latest_booking
  FROM public.bookings
  WHERE mobile_number = p_phone
  ORDER BY booking_date DESC, booking_time DESC, created_at DESC
  LIMIT 1;

  IF latest_booking IS NULL THEN
    DELETE FROM public.customers WHERE phone = p_phone;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0)
  INTO booking_count, paid_total
  FROM public.bookings
  WHERE mobile_number = p_phone;

  INSERT INTO public.customers (name, phone, area, total_bookings, total_spent, last_booking_date, user_id)
  VALUES (
    latest_booking.customer_name,
    p_phone,
    latest_booking.area,
    booking_count,
    paid_total,
    latest_booking.booking_date,
    latest_booking.user_id
  )
  ON CONFLICT (phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    area = EXCLUDED.area,
    total_bookings = EXCLUDED.total_bookings,
    total_spent = EXCLUDED.total_spent,
    last_booking_date = EXCLUDED.last_booking_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS bookings_customer_sync ON public.bookings;
CREATE TRIGGER bookings_customer_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_customer_after_booking_change();
