-- Create marketing_campaigns table
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'custom' CHECK (campaign_type IN ('seasonal', 'festival', 'tournament', 'membership', 'custom')),
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_marketing_campaigns_user_id ON public.marketing_campaigns(user_id);
CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns(campaign_type);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for marketing_campaigns
CREATE POLICY "Users can view own campaigns" ON public.marketing_campaigns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns" ON public.marketing_campaigns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON public.marketing_campaigns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.marketing_campaigns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
