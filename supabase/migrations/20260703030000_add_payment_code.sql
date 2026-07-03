-- Migration: Add payment_code column to bookings and scale existing pricing to VND
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_code TEXT;

-- Convert existing USD prices to VND (e.g., multiply by 10,000 for standard scale)
UPDATE public.equipment SET price_per_day = price_per_day * 10000 WHERE price_per_day < 10000;
UPDATE public.profiles SET base_price = base_price * 10000 WHERE base_price < 10000;
