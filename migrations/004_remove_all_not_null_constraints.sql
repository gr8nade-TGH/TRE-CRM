-- ============================================================================
-- TRE CRM - Remove ALL NOT NULL Constraints from Properties Table
-- ============================================================================
-- This script removes ALL NOT NULL constraints from old columns
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Get list of all columns with NOT NULL constraints
-- Run this first to see what we're dealing with:
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'properties' AND is_nullable = 'NO';

-- Remove NOT NULL from ALL old columns that might have it
DO $$ 
DECLARE
    col_name TEXT;
BEGIN
    -- Loop through all columns and try to drop NOT NULL
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'properties'
        AND column_name NOT IN ('id', 'created_at') -- Keep NOT NULL on id and created_at
        AND is_nullable = 'NO'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.properties ALTER COLUMN %I DROP NOT NULL', col_name);
            RAISE NOTICE 'Dropped NOT NULL from column: %', col_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop NOT NULL from column %: %', col_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================

