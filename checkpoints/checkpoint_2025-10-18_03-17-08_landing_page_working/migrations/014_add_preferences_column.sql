-- Migration 014: Add preferences column to leads table
-- This column will store JSON data with all the lead preferences from landing page forms

-- Add preferences column as JSONB for better querying
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Add a comment explaining the column
COMMENT ON COLUMN public.leads.preferences IS 'JSON object containing lead preferences: bedrooms, bathrooms, priceRange, areaOfTown, moveInDate, creditHistory, bestTimeToCall, comments';

