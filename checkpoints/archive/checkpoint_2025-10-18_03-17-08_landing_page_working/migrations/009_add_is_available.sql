-- ============================================================================
-- TRE CRM - Add is_available column to properties table
-- ============================================================================
-- This script adds the is_available column to track listing availability
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add is_available column (default true for existing listings)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_properties_is_available ON public.properties(is_available);

-- Add comment
COMMENT ON COLUMN public.properties.is_available IS 'Whether the listing is currently available (false = removed from listings table)';

