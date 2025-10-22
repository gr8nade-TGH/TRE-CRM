-- Quick check: How many records do we have now?

SELECT 'properties' as table_name, COUNT(*) as count FROM public.properties
UNION ALL
SELECT 'floor_plans', COUNT(*) FROM public.floor_plans
UNION ALL
SELECT 'units', COUNT(*) FROM public.units;

-- Show the Linden property with its floor plans and units
SELECT 
    p.name AS property,
    fp.name AS floor_plan,
    fp.beds || 'bd/' || fp.baths || 'ba' AS bed_bath,
    fp.sqft || ' sqft' AS size,
    '$' || fp.starting_at AS rent,
    fp.units_available AS available_units
FROM public.properties p
LEFT JOIN public.floor_plans fp ON p.id = fp.property_id
WHERE p.name = 'Linden at The Rim'
ORDER BY fp.beds, fp.baths;

-- Show units for Linden
SELECT 
    u.unit_number,
    fp.name AS floor_plan,
    u.floor AS floor_num,
    '$' || u.rent AS rent,
    u.available_from,
    u.status
FROM public.units u
JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
JOIN public.properties p ON u.property_id = p.id
WHERE p.name = 'Linden at The Rim'
ORDER BY u.unit_number;

