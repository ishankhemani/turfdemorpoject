-- Add missing payment and time columns to bookings table
-- Run this in your Supabase SQL Editor to fix the schema cache error

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'offline'
    CHECK (payment_mode IN ('offline', 'online', 'split')),
  ADD COLUMN IF NOT EXISTS online_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offline_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS actual_end_time TEXT,
  ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin';

-- Backfill offline_amount for existing offline/cash bookings
UPDATE public.bookings
SET offline_amount = amount
WHERE payment_mode = 'offline' AND offline_amount = 0;

-- Backfill online_amount for existing online bookings
UPDATE public.bookings
SET online_amount = amount
WHERE payment_mode = 'online' AND online_amount = 0;

-- Backfill split amounts for existing split bookings (50/50 default)
UPDATE public.bookings
SET
  online_amount = FLOOR(amount / 2),
  offline_amount = amount - FLOOR(amount / 2)
WHERE payment_mode = 'split' AND online_amount = 0 AND offline_amount = 0;
