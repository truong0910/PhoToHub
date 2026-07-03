-- Migration: Add owner_id to public.equipment, update RLS policies, and setup storage bucket

-- 1. Add owner_id column referencing public.profiles(id)
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Drop existing admin-only insert/update/delete policies
DROP POLICY IF EXISTS "Only admins can insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Only admins can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Only admins can delete equipment" ON public.equipment;

-- 3. Create updated policies allowing users to manage their own equipment
CREATE POLICY "Users can insert equipment" ON public.equipment
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own equipment" ON public.equipment
    FOR UPDATE USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete their own equipment" ON public.equipment
    FOR DELETE USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Setup storage bucket for equipment uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment', 'equipment', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Add storage RLS policies for 'equipment' bucket
DROP POLICY IF EXISTS "Equipment images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own equipment images" ON storage.objects;

CREATE POLICY "Equipment images are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'equipment');

CREATE POLICY "Authenticated users can upload equipment images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'equipment' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own equipment images" ON storage.objects
    FOR DELETE USING (bucket_id = 'equipment' AND auth.role() = 'authenticated');
