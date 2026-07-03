-- 1. Enable btree_gist extension to allow GIST indexes on UUID columns
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Pre-cleanup: Transition conflicting overlapping equipment bookings to 'cancelled' status
UPDATE public.bookings 
SET status = 'cancelled'
WHERE id IN (
  SELECT b2.id
  FROM public.bookings b1
  JOIN public.bookings b2 ON b1.equipment_id = b2.equipment_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'approved', 'ongoing')
    AND b2.status IN ('pending', 'approved', 'ongoing')
    AND tstzrange(b1.start_date, b1.end_date) && tstzrange(b2.start_date, b2.end_date)
);

-- 3. Pre-cleanup: Transition conflicting overlapping photographer bookings to 'cancelled' status
UPDATE public.bookings 
SET status = 'cancelled'
WHERE id IN (
  SELECT b2.id
  FROM public.bookings b1
  JOIN public.bookings b2 ON b1.photographer_id = b2.photographer_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'approved', 'ongoing')
    AND b2.status IN ('pending', 'approved', 'ongoing')
    AND tstzrange(b1.start_date, b1.end_date) && tstzrange(b2.start_date, b2.end_date)
);

-- 2. Add overlap exclusion constraint for equipment bookings
-- Restrict to pending, approved, and ongoing status rows to prevent double booking active slots
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_equipment_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_equipment_overlap EXCLUDE USING gist (
  equipment_id WITH =,
  tstzrange(start_date, end_date) WITH &&
) WHERE (equipment_id IS NOT NULL AND status IN ('approved', 'ongoing', 'pending'));

-- 3. Add overlap exclusion constraint for photographer bookings
-- Restrict to pending, approved, and ongoing status rows
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_photographer_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_photographer_overlap EXCLUDE USING gist (
  photographer_id WITH =,
  tstzrange(start_date, end_date) WITH &&
) WHERE (photographer_id IS NOT NULL AND status IN ('approved', 'ongoing', 'pending'));
