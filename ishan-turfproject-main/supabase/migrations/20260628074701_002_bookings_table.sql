-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  area TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  sport TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending')),
  notes TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
