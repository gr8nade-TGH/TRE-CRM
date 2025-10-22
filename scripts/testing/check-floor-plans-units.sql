-- Quick verification script to check floor_plans and units tables
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check if tables exist and their structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('floor_plans', 'units')
ORDER BY table_name, ordinal_position;

-- 2. Count records in each table
SELECT 'properties' as table_name, COUNT(*) as record_count FROM public.properties
UNION ALL
SELECT 'floor_plans', COUNT(*) FROM public.floor_plans
UNION ALL
SELECT 'units', COUNT(*) FROM public.units;

-- 3. Show all floor plans (if any)
SELECT 
    fp.id,
    p.name as property_name,
    fp.name as floor_plan_name,
    fp.beds,
    fp.baths,
    fp.sqft,
    fp.market_rent,
    fp.starting_at,
    fp.has_concession,
    fp.units_available
FROM public.floor_plans fp
LEFT JOIN public.properties p ON fp.property_id = p.id
ORDER BY p.name, fp.beds, fp.baths;

-- 4. Show all units (if any)
SELECT 
    p.name as property_name,
    fp.name as floor_plan_name,
    u.unit_number,
    u.floor,
    u.rent,
    u.available_from,
    u.status,
    u.is_available
FROM public.units u
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN public.properties p ON u.property_id = p.id
ORDER BY p.name, fp.name, u.unit_number;

-- 5. Show properties count
SELECT COUNT(*) as total_properties FROM public.properties;

