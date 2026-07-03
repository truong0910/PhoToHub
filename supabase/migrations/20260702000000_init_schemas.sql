-- Create custom roles or check if role enum/constraint is set.
-- We use a check constraint on profiles.role to restrict roles.

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'client' NOT NULL CONSTRAINT check_profile_role CHECK (role IN ('client', 'photographer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Equipment Table
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CONSTRAINT check_equipment_category CHECK (category IN ('body', 'lens', 'lighting')),
    price_per_day NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT check_equipment_price CHECK (price_per_day >= 0),
    image_url TEXT,
    status TEXT DEFAULT 'available' NOT NULL CONSTRAINT check_equipment_status CHECK (status IN ('available', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    photographer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CONSTRAINT check_booking_status CHECK (status IN ('pending', 'approved', 'ongoing', 'completed', 'cancelled')),
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT check_booking_price CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: end_date > start_date
    CONSTRAINT check_booking_dates CHECK (end_date > start_date)
);

-- Enable Realtime for the bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 4. Automatically Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'client'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Equipment policies
CREATE POLICY "Equipment is viewable by everyone" 
    ON public.equipment FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can insert equipment" 
    ON public.equipment FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update equipment" 
    ON public.equipment FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete equipment" 
    ON public.equipment FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Bookings policies
CREATE POLICY "Clients can view their own bookings" 
    ON public.bookings FOR SELECT 
    USING (auth.uid() = client_id);

CREATE POLICY "Photographers can view bookings assigned to them" 
    ON public.bookings FOR SELECT 
    USING (auth.uid() = photographer_id);

CREATE POLICY "Admins can view all bookings" 
    ON public.bookings FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Clients can create bookings for themselves" 
    ON public.bookings FOR INSERT 
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients/Admins can update their own bookings" 
    ON public.bookings FOR UPDATE 
    USING (
        auth.uid() = client_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
