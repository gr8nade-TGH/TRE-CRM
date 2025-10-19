-- ============================================================================
-- MIGRATION 020: Remove Foreign Key Constraints on Property Activities & Notes
-- ============================================================================
-- Purpose: Remove foreign key constraints on performed_by and author_id fields
--          to allow storing email addresses instead of requiring UUID references
-- Date: 2025-10-19
-- Issue: Foreign key constraint violations when creating activities/notes
--        Error: "insert or update on table violates foreign key constraint"
-- ============================================================================

-- ============================================================================
-- 1. DROP FOREIGN KEY CONSTRAINTS ON property_activities.performed_by
-- ============================================================================

DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Loop through all foreign key constraints on property_activities table for performed_by column
    FOR constraint_record IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'property_activities' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'performed_by'
    LOOP
        EXECUTE 'ALTER TABLE public.property_activities DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint on property_activities: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- ============================================================================
-- 2. DROP FOREIGN KEY CONSTRAINTS ON property_notes.author_id
-- ============================================================================

DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Loop through all foreign key constraints on property_notes table for author_id column
    FOR constraint_record IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'property_notes' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'author_id'
    LOOP
        EXECUTE 'ALTER TABLE public.property_notes DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint on property_notes: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- ============================================================================
-- 3. VERIFY CONSTRAINTS WERE REMOVED
-- ============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Check property_activities constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'property_activities' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'performed_by';
    
    RAISE NOTICE 'property_activities.performed_by now has % foreign key constraints (should be 0)', constraint_count;
    
    -- Check property_notes constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'property_notes' 
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'author_id';
    
    RAISE NOTICE 'property_notes.author_id now has % foreign key constraints (should be 0)', constraint_count;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration:
-- 1. Removes foreign key constraint on property_activities.performed_by
-- 2. Removes foreign key constraint on property_notes.author_id
-- 3. Allows storing email addresses instead of requiring UUID references
-- 4. Fixes "violates foreign key constraint" errors
-- 
-- The columns will remain, but without foreign key constraints.
-- This allows authenticated users to create activities/notes using email addresses.
-- ============================================================================

