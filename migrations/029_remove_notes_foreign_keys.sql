-- ============================================================================
-- Migration 029: Remove Foreign Key Constraints from Notes Tables
-- ============================================================================
-- Purpose: Remove foreign key constraints on author_id from unit_notes and 
--          property_notes to allow more flexibility (matching lead_notes pattern)
-- Created: 2025-10-22
-- Reason: Foreign key to users(id) requires exact UUID match, but Supabase Auth
--         users may not always be in the public.users table. Removing the 
--         constraint allows us to use auth.uid() directly without sync issues.
-- ============================================================================

-- ============================================================================
-- 1. REMOVE FOREIGN KEY FROM UNIT_NOTES
-- ============================================================================

-- Drop the foreign key constraint on unit_notes.author_id
ALTER TABLE public.unit_notes 
DROP CONSTRAINT IF EXISTS unit_notes_author_id_fkey;

-- The author_id column will remain as VARCHAR, but without the foreign key constraint
-- This matches the lead_notes pattern and allows storing auth.uid() values
COMMENT ON COLUMN public.unit_notes.author_id IS 'User ID from auth.uid() - no FK constraint for flexibility';

-- ============================================================================
-- 2. REMOVE FOREIGN KEY FROM PROPERTY_NOTES
-- ============================================================================

-- Drop the foreign key constraint on property_notes.author_id
ALTER TABLE public.property_notes 
DROP CONSTRAINT IF EXISTS property_notes_author_id_fkey;

-- The author_id column will remain as VARCHAR, but without the foreign key constraint
COMMENT ON COLUMN public.property_notes.author_id IS 'User ID from auth.uid() - no FK constraint for flexibility';

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify constraints were removed
DO $$
DECLARE
    unit_notes_fk_exists BOOLEAN;
    property_notes_fk_exists BOOLEAN;
BEGIN
    -- Check if unit_notes foreign key still exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unit_notes_author_id_fkey'
        AND table_name = 'unit_notes'
    ) INTO unit_notes_fk_exists;
    
    -- Check if property_notes foreign key still exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'property_notes_author_id_fkey'
        AND table_name = 'property_notes'
    ) INTO property_notes_fk_exists;
    
    -- Report results
    RAISE NOTICE '✅ Migration 029 Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Foreign Key Constraints Removed:';
    
    IF NOT unit_notes_fk_exists THEN
        RAISE NOTICE '  ✅ unit_notes.author_id - FK removed';
    ELSE
        RAISE WARNING '  ⚠️ unit_notes.author_id - FK still exists!';
    END IF;
    
    IF NOT property_notes_fk_exists THEN
        RAISE NOTICE '  ✅ property_notes.author_id - FK removed';
    ELSE
        RAISE WARNING '  ⚠️ property_notes.author_id - FK still exists!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 Notes tables now match lead_notes pattern:';
    RAISE NOTICE '   - author_id can store any auth.uid() value';
    RAISE NOTICE '   - No dependency on public.users table';
    RAISE NOTICE '   - More flexible for Supabase Auth integration';
END $$;

