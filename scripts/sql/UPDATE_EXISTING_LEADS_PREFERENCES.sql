-- Update existing leads with sample preferences
-- Run this in Supabase SQL Editor to add preferences to your test leads

-- Update "Test new landing page" lead
UPDATE public.leads
SET preferences = jsonb_build_object(
    'bedrooms', '1',
    'bathrooms', '2',
    'priceRange', '1500-2000',
    'areaOfTown', 'Downtown',
    'moveInDate', '2025-11-01',
    'creditHistory', 'good',
    'bestTimeToCall', 'afternoon',
    'comments', 'Looking for a modern apartment with good natural light'
)
WHERE name = 'Test new landing page' AND preferences IS NULL;

-- Update "Test Lead" lead
UPDATE public.leads
SET preferences = jsonb_build_object(
    'bedrooms', '2',
    'bathrooms', '2',
    'priceRange', '2000-2500',
    'areaOfTown', 'Midtown',
    'moveInDate', '2025-12-01',
    'creditHistory', 'excellent',
    'bestTimeToCall', 'morning',
    'comments', 'Need parking space and pet-friendly building'
)
WHERE name = 'Test Lead' AND preferences IS NULL;

-- Update "tete" lead
UPDATE public.leads
SET preferences = jsonb_build_object(
    'bedrooms', 'studio',
    'bathrooms', '1',
    'priceRange', '1000-1500',
    'areaOfTown', 'East Side',
    'moveInDate', '2025-10-15',
    'creditHistory', 'fair',
    'bestTimeToCall', 'evening',
    'comments', 'First time renter, looking for affordable option'
)
WHERE name = 'tete' AND preferences IS NULL;

-- Verify the updates
SELECT 
    id,
    name,
    email,
    preferences,
    preferences->>'bedrooms' as bedrooms,
    preferences->>'bathrooms' as bathrooms,
    preferences->>'priceRange' as price_range
FROM public.leads
WHERE name IN ('Test new landing page', 'Test Lead', 'tete')
ORDER BY name;

