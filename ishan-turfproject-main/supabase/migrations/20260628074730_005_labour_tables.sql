-- Create labour table
CREATE TABLE public.labour (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create labour_payments table
CREATE TABLE public.labour_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  labour_id UUID NOT NULL REFERENCES public.labour(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  remarks TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_labour_user_id ON public.labour(user_id);
CREATE INDEX idx_labour_payments_labour_id ON public.labour_payments(labour_id);
CREATE INDEX idx_labour_payments_user_id ON public.labour_payments(user_id);
CREATE INDEX idx_labour_payments_date ON public.labour_payments(date);

-- Enable RLS
ALTER TABLE public.labour ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_payments ENABLE ROW LEVEL SECURITY;

-- Policies for labour
CREATE POLICY "Users can view own labour" ON public.labour
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own labour" ON public.labour
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labour" ON public.labour
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own labour" ON public.labour
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for labour_payments
CREATE POLICY "Users can view own labour payments" ON public.labour_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own labour payments" ON public.labour_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labour payments" ON public.labour_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own labour payments" ON public.labour_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER labour_updated_at
  BEFORE UPDATE ON public.labour
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER labour_payments_updated_at
  BEFORE UPDATE ON public.labour_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
