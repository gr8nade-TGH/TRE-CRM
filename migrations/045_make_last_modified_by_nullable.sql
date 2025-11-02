-- ============================================
-- Migration 045: Make last_modified_by nullable and drop foreign key
-- ============================================
-- Purpose: Allow updates without requiring a valid user ID reference
-- The foreign key constraint is blocking updates because the application user IDs
-- don't match the users table IDs
-- ============================================

-- Drop the foreign key constraint on last_modified_by
ALTER TABLE public.smart_match_config
DROP CONSTRAINT IF EXISTS smart_match_config_last_modified_by_fkey;

-- Drop the foreign key constraint on created_by (if it exists)
ALTER TABLE public.smart_match_config
DROP CONSTRAINT IF EXISTS smart_match_config_created_by_fkey;

-- Make last_modified_by nullable (it should already be, but let's ensure it)
ALTER TABLE public.smart_match_config
ALTER COLUMN last_modified_by DROP NOT NULL;

-- Make created_by nullable
ALTER TABLE public.smart_match_config
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'smart_match_config'
AND column_name IN ('created_by', 'last_modified_by')
ORDER BY column_name;

