-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  area TEXT NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_booking_date DATE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

-- Create index for faster queries
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
