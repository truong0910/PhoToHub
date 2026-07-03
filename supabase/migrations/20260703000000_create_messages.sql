-- Create Messages Table for Customer-Photographer Realtime Chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow select and insert for authenticated users
CREATE POLICY "Everyone can view messages" 
    ON public.messages FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert messages" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid() = sender_id);

-- Add messages table to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
