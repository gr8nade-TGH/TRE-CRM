-- ============================================================================
-- TRE CRM - Fix Properties Table Constraints
-- ============================================================================
-- This script removes NOT NULL constraints from old columns
-- and makes new columns the primary ones
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Make old columns nullable (for backward compatibility)
ALTER TABLE public.properties 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN address DROP NOT NULL;

-- Update existing records to use new columns if they have old data
UPDATE public.properties 
SET 
    community_name = COALESCE(community_name, name),
    street_address = COALESCE(street_address, address)
WHERE community_name IS NULL OR street_address IS NULL;

-- ============================================================================
-- DONE!
-- ============================================================================

