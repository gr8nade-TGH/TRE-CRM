-- ============================================================================
-- VERIFY MIGRATION - Run this to check if migration was successful
-- ============================================================================

-- Check if all new columns exist in properties table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'properties'
ORDER BY ordinal_position;

-- Check if property_notes table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'property_notes'
ORDER BY ordinal_position;

