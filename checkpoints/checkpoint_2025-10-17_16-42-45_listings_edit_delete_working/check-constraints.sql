-- ============================================================================
-- CHECK WHICH COLUMNS STILL HAVE NOT NULL CONSTRAINTS
-- ============================================================================
-- Run this to see which columns are causing problems
-- ============================================================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'properties'
  AND is_nullable = 'NO'  -- Only show columns with NOT NULL
ORDER BY ordinal_position;

-- This will show you ALL columns that still have NOT NULL constraints
-- If you see columns like sqft_min, beds_min, etc., the migration didn't run

