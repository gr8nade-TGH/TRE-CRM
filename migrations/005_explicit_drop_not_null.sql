-- ============================================================================
-- TRE CRM - Explicitly Remove NOT NULL Constraints
-- ============================================================================
-- This script explicitly removes NOT NULL from all old columns
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Remove NOT NULL from all old columns (ignore errors if column doesn't exist)
ALTER TABLE public.properties ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN beds_min DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN beds_max DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN baths_min DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN baths_max DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN rent_min DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN rent_max DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN sqft_min DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN sqft_max DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN market DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN lng DROP NOT NULL;

-- Update existing records to use new columns if they have old data
UPDATE public.properties 
SET 
    community_name = COALESCE(community_name, name),
    street_address = COALESCE(street_address, address)
WHERE community_name IS NULL OR street_address IS NULL;

-- ============================================================================
-- DONE!
-- ============================================================================

