-- Migration 041: Update property rent_range_min and rent_range_max from units
-- This calculates the min and max rent for each property based on its units

-- Update all properties with min/max rent from their units
UPDATE properties p
SET
    rent_range_min = subquery.min_rent,
    rent_range_max = subquery.max_rent,
    updated_at = NOW()
FROM (
    SELECT
        p.id as property_id,
        MIN(COALESCE(u.rent, fp.starting_at)) as min_rent,
        MAX(COALESCE(u.rent, fp.starting_at)) as max_rent
    FROM properties p
    LEFT JOIN floor_plans fp ON fp.property_id = p.id
    LEFT JOIN units u ON u.floor_plan_id = fp.id
    WHERE u.is_available = true
      AND u.is_active = true
      AND u.status = 'available'
    GROUP BY p.id
) subquery
WHERE p.id = subquery.property_id;

-- Verify the update
SELECT
    name,
    rent_range_min,
    rent_range_max,
    (SELECT COUNT(*) FROM floor_plans WHERE property_id = properties.id) as floor_plan_count,
    (SELECT COUNT(*) FROM units u
     JOIN floor_plans fp ON u.floor_plan_id = fp.id
     WHERE fp.property_id = properties.id
       AND u.is_available = true
       AND u.is_active = true
       AND u.status = 'available') as available_unit_count
FROM properties
ORDER BY name;

