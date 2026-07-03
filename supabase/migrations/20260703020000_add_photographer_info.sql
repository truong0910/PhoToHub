-- Migration: Add Photographer Profile Information columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS base_price NUMERIC(12, 2) DEFAULT 150.00,
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 5;
