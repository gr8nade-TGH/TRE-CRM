-- Migration 025: Cleanup Mock Properties
-- Removes old mock "Community X" properties and keeps only real properties with floor plans/units
-- Run this to clean up the database

-- ============================================
-- 1. DELETE OLD MOCK PROPERTIES
-- ============================================

-- Delete properties that match the mock naming pattern "Community [number]"
-- This will cascade delete related floor_plans, units, notes, activities, etc.
DELETE FROM public.properties
WHERE name ~ '^Community [0-9]+$';

-- Delete other test/mock properties (adjust as needed)
DELETE FROM public.properties
WHERE name IN (
    'Activity test 2',
    'hello',
    'test',
    'Test',
    'test after moding',
    'working?',
    'The Monkey'
);

-- ============================================
-- 2. VERIFY CLEANUP
-- ============================================

-- Show remaining properties
SELECT 
    id,
    name,
    community_name,
    street_address,
    city,
    market,
    is_pumi,
    created_at
FROM public.properties
ORDER BY name;

-- Show count of properties, floor plans, and units
SELECT 'properties' as table_name, COUNT(*) as count FROM public.properties
UNION ALL
SELECT 'floor_plans', COUNT(*) FROM public.floor_plans
UNION ALL
SELECT 'units', COUNT(*) FROM public.units;

-- Show properties with their floor plan and unit counts
SELECT 
    p.name,
    p.market,
    COUNT(DISTINCT fp.id) as floor_plan_count,
    COUNT(DISTINCT u.id) as unit_count
FROM public.properties p
LEFT JOIN public.floor_plans fp ON p.id = fp.property_id
LEFT JOIN public.units u ON p.id = u.property_id
GROUP BY p.id, p.name, p.market
ORDER BY p.name;

