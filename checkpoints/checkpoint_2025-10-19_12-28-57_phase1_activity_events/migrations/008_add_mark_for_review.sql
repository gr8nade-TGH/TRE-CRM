-- ============================================================================
-- TRE CRM - Add mark_for_review column to properties table
-- ============================================================================
-- This script adds the mark_for_review column for agents to flag listings
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add mark_for_review column
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS mark_for_review BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_properties_mark_for_review ON public.properties(mark_for_review);

-- Add comment
COMMENT ON COLUMN public.properties.mark_for_review IS 'Flag for agents to mark listings that need manager review';

