-- Create slots table for default time slots
CREATE TABLE public.slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_slots_user_id ON public.slots(user_id);

-- Enable RLS
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- Policies for slots
CREATE POLICY "Users can view own slots" ON public.slots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own slots" ON public.slots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slots" ON public.slots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own slots" ON public.slots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
