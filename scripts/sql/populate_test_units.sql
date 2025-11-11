-- Populate Test Units and Floor Plans for Smart Match Testing
-- This script adds multiple floor plans and units to existing properties

-- First, let's get the property IDs (you'll need to replace these with actual UUIDs from your database)
-- Run this query first to get your property IDs:
-- SELECT id, name FROM properties LIMIT 5;

-- Example: Add floor plans and units to "Linden at The Rim" property
-- Replace 'YOUR_PROPERTY_ID_HERE' with the actual UUID from your database

-- ============================================================================
-- FLOOR PLANS for Property 1 (Linden at The Rim or your first property)
-- ============================================================================

-- 1x1 Floor Plan (Studio/1 Bedroom)
INSERT INTO floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    concession_description,
    units_available
) VALUES (
    'YOUR_PROPERTY_ID_1',  -- Replace with actual property UUID
    '1x1 Classic',
    1,
    1.0,
    650,
    1100,
    1050,
    true,
    'First month $65 off market rent',
    3
) RETURNING id;

-- 2x1 Floor Plan
INSERT INTO floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    concession_description,
    units_available
) VALUES (
    'YOUR_PROPERTY_ID_1',
    '2x1 Deluxe',
    2,
    1.0,
    850,
    1300,
    1250,
    true,
    'First month $65 off market rent',
    4
) RETURNING id;

-- 2x2 Floor Plan
INSERT INTO floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    concession_description,
    units_available
) VALUES (
    'YOUR_PROPERTY_ID_1',
    '2x2 Premium',
    2,
    2.0,
    950,
    1450,
    1400,
    true,
    'First month $65 off market rent',
    5
) RETURNING id;

-- 3x2 Floor Plan
INSERT INTO floor_plans (
    property_id,
    name,
    beds,
    baths,
    sqft,
    market_rent,
    starting_at,
    has_concession,
    concession_description,
    units_available
) VALUES (
    'YOUR_PROPERTY_ID_1',
    '3x2 Executive',
    3,
    2.0,
    1200,
    1750,
    1700,
    false,
    null,
    2
) RETURNING id;

-- ============================================================================
-- UNITS for the floor plans above
-- ============================================================================

-- Units for 1x1 Classic (Replace 'FLOOR_PLAN_ID_1x1' with the UUID returned above)
INSERT INTO units (property_id, floor_plan_id, unit_number, rent, market_rent, available_from, is_available, is_active, status)
VALUES 
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_1x1', '101', 1050, 1100, '2025-11-01', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_1x1', '201', 1075, 1100, '2025-11-15', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_1x1', '301', 1050, 1100, '2025-12-01', true, true, 'available');

-- Units for 2x1 Deluxe
INSERT INTO units (property_id, floor_plan_id, unit_number, rent, market_rent, available_from, is_available, is_active, status)
VALUES 
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x1', '102', 1250, 1300, '2025-11-01', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x1', '202', 1275, 1300, '2025-11-10', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x1', '302', 1250, 1300, '2025-11-20', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x1', '402', 1250, 1300, '2025-12-01', true, true, 'available');

-- Units for 2x2 Premium
INSERT INTO units (property_id, floor_plan_id, unit_number, rent, market_rent, available_from, is_available, is_active, status)
VALUES 
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x2', '103', 1400, 1450, '2025-11-01', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x2', '203', 1425, 1450, '2025-11-05', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x2', '303', 1400, 1450, '2025-11-15', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x2', '403', 1400, 1450, '2025-12-01', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_2x2', '503', 1450, 1450, '2025-12-15', true, true, 'available');

-- Units for 3x2 Executive
INSERT INTO units (property_id, floor_plan_id, unit_number, rent, market_rent, available_from, is_available, is_active, status)
VALUES 
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_3x2', '104', 1700, 1750, '2025-11-01', true, true, 'available'),
    ('YOUR_PROPERTY_ID_1', 'FLOOR_PLAN_ID_3x2', '204', 1750, 1750, '2025-12-01', true, true, 'available');

-- ============================================================================
-- INSTRUCTIONS FOR USE:
-- ============================================================================
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Run this query to get your property IDs:
--    SELECT id, name, city FROM properties ORDER BY created_at DESC LIMIT 5;
-- 
-- 3. Copy a property ID and replace all instances of 'YOUR_PROPERTY_ID_1' above
-- 
-- 4. Run the floor plan INSERT statements ONE AT A TIME
--    Each will return an ID - copy that ID
-- 
-- 5. Replace the FLOOR_PLAN_ID placeholders with the actual IDs returned
-- 
-- 6. Run the unit INSERT statements
-- 
-- 7. Repeat for additional properties if needed
--
-- ============================================================================
-- EASIER ALTERNATIVE: Use the CSV import feature!
-- ============================================================================
-- Instead of running SQL, you can create a CSV with this structure:
-- 
-- community_name,street_address,city,state,zip,market,beds,baths,sqft,market_rent,starting_at,unit_number,available_from,commission_pct,is_pumi
-- "Linden at The Rim","17803 La Cantera Pkwy","San Antonio","TX","78257","San Antonio",1,1,650,1100,1050,"101","2025-11-01",4.5,true
-- "Linden at The Rim","17803 La Cantera Pkwy","San Antonio","TX","78257","San Antonio",1,1,650,1100,1050,"201","2025-11-15",4.5,true
-- "Linden at The Rim","17803 La Cantera Pkwy","San Antonio","TX","78257","San Antonio",2,1,850,1300,1250,"102","2025-11-01",4.5,true
-- ... etc
--
-- Then use the CSV Import feature on the Listings page!

