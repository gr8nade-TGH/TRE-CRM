-- ============================================
-- Migration 028: Add state column and fix coordinate column names
-- ============================================

-- Add state column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS state VARCHAR(2) DEFAULT 'TX';

-- Add lat/lng columns (in addition to map_lat/map_lng for backward compatibility)
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11,8);

-- Copy existing map_lat/map_lng to lat/lng if they exist
UPDATE public.properties 
SET lat = map_lat, lng = map_lng 
WHERE map_lat IS NOT NULL AND map_lng IS NOT NULL AND lat IS NULL;

-- Create index on state for filtering
CREATE INDEX IF NOT EXISTS idx_properties_state ON public.properties(state);

-- Update existing properties to have state = 'TX' if city is in Texas
UPDATE public.properties 
SET state = 'TX' 
WHERE state IS NULL AND city IN ('Austin', 'Dallas', 'Houston', 'San Antonio');

-- Remove market column dependency - we'll use city instead
-- (Don't drop the column yet in case there's data we need)
COMMENT ON COLUMN public.properties.market IS 'DEPRECATED: Use city column instead';

