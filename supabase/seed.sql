-- Supabase SQL Seed Script for PhotoHub
-- Run this script in the Supabase SQL Editor to populate test data

-- 1. Insert mock users into auth.users (bypass auth flow)
-- NOTE: We use standard Supabase schema details. Extension pgcrypto is required for gen_salt and crypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000000', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'authenticated', 
    'authenticated', 
    'client@example.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name": "Nguyen Van Client", "avatar_url": "https://example.com/client.jpg"}', 
    now(), 
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'authenticated', 
    'authenticated', 
    'photographer@example.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name": "Tran Van Photographer", "avatar_url": "https://example.com/photographer.jpg"}', 
    now(), 
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'authenticated', 
    'authenticated', 
    'admin@example.com', 
    crypt('password123', gen_salt('bf')), 
    now(), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"full_name": "Le Hoang Admin", "avatar_url": "https://example.com/admin.jpg"}', 
    now(), 
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Update profiles fields automatically created by the trigger
UPDATE public.profiles 
SET role = 'client', phone = '0901234567' 
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

UPDATE public.profiles 
SET role = 'photographer', phone = '0907654321' 
WHERE id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

UPDATE public.profiles 
SET role = 'admin', phone = '0909999999' 
WHERE id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

-- 3. Insert mock equipment records
INSERT INTO public.equipment (id, name, category, price_per_day, image_url, status)
VALUES
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 
    'Canon EOS R5', 
    'body', 
    150.00, 
    'https://example.com/canon-r5.jpg', 
    'available'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e22', 
    'Sony FE 70-200mm f/2.8 GM OSS II', 
    'lens', 
    80.00, 
    'https://example.com/sony-70-200.jpg', 
    'available'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e33', 
    'Profoto B10X Plus', 
    'lighting', 
    50.00, 
    'https://example.com/profoto-b10x.jpg', 
    'available'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e44', 
    'Nikon Z9 (Under Maintenance)', 
    'body', 
    200.00, 
    'https://example.com/nikon-z9.jpg', 
    'maintenance'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Pre-insert a booking to test overlapping checks
-- This Canon EOS R5 booking is approved for 2026-07-10 to 2026-07-15
INSERT INTO public.bookings (id, client_id, photographer_id, equipment_id, start_date, end_date, status, total_price)
VALUES
  (
    'b0eebc99-0000-4ef8-bb6d-6bb9bd380b11', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11', 
    '2026-07-10 10:00:00+00', 
    '2026-07-15 10:00:00+00', 
    'approved', 
    750.00
  )
ON CONFLICT (id) DO NOTHING;
