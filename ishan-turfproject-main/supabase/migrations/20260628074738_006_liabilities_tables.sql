-- Create liabilities table
CREATE TABLE public.liabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_name TEXT NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create liability_payments table
CREATE TABLE public.liability_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX idx_liabilities_is_completed ON public.liabilities(is_completed);
CREATE INDEX idx_liability_payments_liability_id ON public.liability_payments(liability_id);
CREATE INDEX idx_liability_payments_user_id ON public.liability_payments(user_id);

-- Enable RLS
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_payments ENABLE ROW LEVEL SECURITY;

-- Policies for liabilities
CREATE POLICY "Users can view own liabilities" ON public.liabilities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own liabilities" ON public.liabilities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own liabilities" ON public.liabilities
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own liabilities" ON public.liabilities
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for liability_payments
CREATE POLICY "Users can view own liability payments" ON public.liability_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own liability payments" ON public.liability_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own liability payments" ON public.liability_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
