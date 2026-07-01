-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
