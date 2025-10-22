-- Migration 024: Sample Properties, Floor Plans, and Units
-- Adds realistic test data for the new Listings page
-- Run this AFTER migration 023

-- ============================================
-- 1. INSERT SAMPLE PROPERTIES
-- ============================================

-- Property 1: Linden at The Rim (from your mockup)
INSERT INTO public.properties (
    id,
    name,
    community_name,
    street_address,
    city,
    zip_code,
    market,
    neighborhood,
    phone,
    contact_email,
    map_lat,
    map_lng,
    amenities,
    is_pumi,
    is_verified,
    description,
    data_source,
    last_refreshed_at
) VALUES (
    gen_random_uuid(),
    'Linden at The Rim',
    'Linden at The Rim',
    '19622 Vance Jackson Road',
    'San Antonio',
    'TX 78240',
    'San Antonio',
    'The Rim',
    '(256) 380-4163',
    'leasing@lindenattherim.com',
    29.5149,
    -98.6208,
    ARRAY['Pool', 'Gym', 'In-Unit W/D', 'Parking', 'Pet Friendly'],
    true, -- PUMI property
    true,
    'Luxury apartments in the heart of The Rim shopping district',
    'manual',
    NOW()
) ON CONFLICT DO NOTHING
RETURNING id AS linden_property_id;

-- Property 2: The Howard (Austin)
INSERT INTO public.properties (
    id,
    name,
    community_name,
    street_address,
    city,
    zip_code,
    market,
    neighborhood,
    phone,
    contact_email,
    map_lat,
    map_lng,
    amenities,
    is_pumi,
    is_verified,
    description,
    data_source,
    last_refreshed_at
) VALUES (
    gen_random_uuid(),
    'The Howard',
    'The Howard',
    '1234 Congress Ave',
    'Austin',
    'TX 78701',
    'Austin',
    'Downtown',
    '(512) 555-0100',
    'leasing@thehoward.com',
    30.2672,
    -97.7431,
    ARRAY['Pool', 'Gym', 'Parking', 'Rooftop Deck'],
    false,
    true,
    'Modern downtown living with skyline views',
    'manual',
    NOW()
) ON CONFLICT DO NOTHING;

-- Property 3: Riverside Lofts (Dallas)
INSERT INTO public.properties (
    id,
    name,
    community_name,
    street_address,
    city,
    zip_code,
    market,
    neighborhood,
    phone,
    contact_email,
    map_lat,
    map_lng,
    amenities,
    is_pumi,
    is_verified,
    description,
    data_source,
    last_refreshed_at
) VALUES (
    gen_random_uuid(),
    'Riverside Lofts',
    'Riverside Lofts',
    '5678 Riverfront Blvd',
    'Dallas',
    'TX 75207',
    'Dallas',
    'Uptown',
    '(214) 555-0200',
    'leasing@riversidelofts.com',
    32.7767,
    -96.7970,
    ARRAY['Pool', 'Gym', 'In-Unit W/D', 'Parking'],
    false,
    true,
    'Industrial-chic lofts along the Trinity River',
    'manual',
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. INSERT FLOOR PLANS FOR LINDEN AT THE RIM
-- ============================================

-- Get the Linden property ID (we'll need to do this manually or use a variable)
-- For now, we'll use a subquery

-- Floor Plan 1: 1 Bed / 1 Bath
INSERT INTO public.floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    concession_type,
    concession_value,
    concession_description,
    units_available,
    description,
    image_url
) 
SELECT 
    id,
    '1x1 Classic',
    1,
    1.0,
    830,
    1300,
    1235,
    true,
    'dollar_off',
    '$65 off',
    'First month $65 off market rent',
    4,
    'Spacious 1 bedroom with modern finishes',
    'https://example.com/floorplans/1x1.jpg'
FROM public.properties 
WHERE name = 'Linden at The Rim'
LIMIT 1;

-- Floor Plan 2: 2 Bed / 2 Bath
INSERT INTO public.floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    units_available,
    description
) 
SELECT 
    id,
    '2x2 Deluxe',
    2,
    2.0,
    1150,
    1800,
    1800,
    false,
    2,
    'Two bedroom with walk-in closets'
FROM public.properties 
WHERE name = 'Linden at The Rim'
LIMIT 1;

-- ============================================
-- 3. INSERT UNITS FOR LINDEN AT THE RIM
-- ============================================

-- Units for 1x1 Classic floor plan
INSERT INTO public.units (
    floor_plan_id,
    property_id,
    unit_number,
    floor,
    rent,
    available_from,
    is_available,
    status,
    notes
)
SELECT 
    fp.id,
    fp.property_id,
    '02305',
    2,
    1235,
    CURRENT_DATE,
    true,
    'available',
    'Corner unit with great natural light'
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE p.name = 'Linden at The Rim' AND fp.name = '1x1 Classic'
LIMIT 1;

INSERT INTO public.units (
    floor_plan_id,
    property_id,
    unit_number,
    floor,
    rent,
    available_from,
    is_available,
    status
)
SELECT 
    fp.id,
    fp.property_id,
    '12306',
    12,
    1235,
    CURRENT_DATE,
    true,
    'available'
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE p.name = 'Linden at The Rim' AND fp.name = '1x1 Classic'
LIMIT 1;

INSERT INTO public.units (
    floor_plan_id,
    property_id,
    unit_number,
    floor,
    rent,
    market_rent,
    available_from,
    is_available,
    status
)
SELECT 
    fp.id,
    fp.property_id,
    '05303',
    5,
    1240,
    1305,
    CURRENT_DATE + INTERVAL '22 days',
    true,
    'available'
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE p.name = 'Linden at The Rim' AND fp.name = '1x1 Classic'
LIMIT 1;

INSERT INTO public.units (
    floor_plan_id,
    property_id,
    unit_number,
    floor,
    rent,
    market_rent,
    available_from,
    is_available,
    status
)
SELECT 
    fp.id,
    fp.property_id,
    '09301',
    9,
    1240,
    1305,
    CURRENT_DATE + INTERVAL '18 days',
    true,
    'available'
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE p.name = 'Linden at The Rim' AND fp.name = '1x1 Classic'
LIMIT 1;

INSERT INTO public.units (
    floor_plan_id,
    property_id,
    unit_number,
    floor,
    rent,
    market_rent,
    available_from,
    is_available,
    status
)
SELECT 
    fp.id,
    fp.property_id,
    '11203',
    11,
    1245,
    1310,
    CURRENT_DATE,
    true,
    'available'
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE p.name = 'Linden at The Rim' AND fp.name = '1x1 Classic'
LIMIT 1;

-- ============================================
-- 4. UPDATE FLOOR PLAN AVAILABILITY COUNTS
-- ============================================

-- Update units_available and soonest_available for all floor plans
UPDATE public.floor_plans fp
SET 
    units_available = (
        SELECT COUNT(*)
        FROM public.units u
        WHERE u.floor_plan_id = fp.id
        AND u.is_available = true
        AND u.status = 'available'
        AND u.available_from <= (CURRENT_DATE + INTERVAL '60 days')
    ),
    soonest_available = (
        SELECT MIN(available_from)
        FROM public.units u
        WHERE u.floor_plan_id = fp.id
        AND u.is_available = true
        AND u.status = 'available'
    );

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check properties
SELECT 
    name,
    community_name,
    city,
    is_pumi,
    is_verified
FROM public.properties
ORDER BY name;

-- Check floor plans
SELECT 
    p.name AS property_name,
    fp.name AS floor_plan_name,
    fp.beds,
    fp.baths,
    fp.sqft,
    fp.starting_at,
    fp.has_concession,
    fp.units_available
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
ORDER BY p.name, fp.name;

-- Check units
SELECT 
    p.name AS property_name,
    fp.name AS floor_plan_name,
    u.unit_number,
    u.floor,
    u.rent,
    u.available_from,
    u.status
FROM public.units u
JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
JOIN public.properties p ON u.property_id = p.id
ORDER BY p.name, fp.name, u.unit_number;

