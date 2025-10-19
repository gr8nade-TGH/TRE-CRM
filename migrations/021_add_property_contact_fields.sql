-- ============================================================================
-- Migration 021: Add Property Contact Fields
-- ============================================================================
-- Adds additional contact information fields to properties table
-- for managing property contact details (name, phone, office hours, notes)

-- Add contact fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS contact_name VARCHAR,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR,
ADD COLUMN IF NOT EXISTS office_hours VARCHAR,
ADD COLUMN IF NOT EXISTS contact_notes TEXT;

-- Create index for faster lookups by community name
CREATE INDEX IF NOT EXISTS idx_properties_community_name ON public.properties(community_name);

-- Update timestamp
COMMENT ON COLUMN public.properties.contact_name IS 'Primary contact person name for the property';
COMMENT ON COLUMN public.properties.contact_phone IS 'Primary contact phone number for the property';
COMMENT ON COLUMN public.properties.office_hours IS 'Office hours for property management (e.g., Mon-Fri 9am-5pm)';
COMMENT ON COLUMN public.properties.contact_notes IS 'Additional notes about contacting this property';

