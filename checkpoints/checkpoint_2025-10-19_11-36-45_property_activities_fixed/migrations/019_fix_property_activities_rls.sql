-- ============================================================================
-- MIGRATION 019: Fix Property Activities & Property Notes RLS Policies
-- ============================================================================
-- Purpose: Clean up duplicate/conflicting RLS policies on property_activities
--          and property_notes tables (same fix as migration 007 for lead_activities)
-- Date: 2025-10-19
-- Issue: Activities created by authenticated users not visible due to RLS conflicts
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL EXISTING POLICIES ON property_activities
-- ============================================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'property_activities' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.property_activities', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES ON property_notes
-- ============================================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'property_notes' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.property_notes', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- 3. CREATE CLEAN, SIMPLE POLICIES FOR property_activities
-- ============================================================================

-- SELECT: Allow all authenticated users to view all property activities
CREATE POLICY "property_activities_select_policy"
    ON public.property_activities
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Allow all authenticated users to create property activities
CREATE POLICY "property_activities_insert_policy"
    ON public.property_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Allow authenticated users to update property activities
CREATE POLICY "property_activities_update_policy"
    ON public.property_activities
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Allow authenticated users to delete property activities
CREATE POLICY "property_activities_delete_policy"
    ON public.property_activities
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- 4. CREATE CLEAN, SIMPLE POLICIES FOR property_notes
-- ============================================================================

-- SELECT: Allow all authenticated users to view all property notes
CREATE POLICY "property_notes_select_policy"
    ON public.property_notes
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Allow all authenticated users to create property notes
CREATE POLICY "property_notes_insert_policy"
    ON public.property_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Allow authenticated users to update property notes
CREATE POLICY "property_notes_update_policy"
    ON public.property_notes
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Allow authenticated users to delete property notes
CREATE POLICY "property_notes_delete_policy"
    ON public.property_notes
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- 5. VERIFY POLICIES WERE CREATED
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Check property_activities policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'property_activities'
    AND schemaname = 'public';
    
    RAISE NOTICE 'property_activities now has % policies', policy_count;
    
    -- Check property_notes policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'property_notes'
    AND schemaname = 'public';
    
    RAISE NOTICE 'property_notes now has % policies', policy_count;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration:
-- 1. Removes all duplicate/conflicting RLS policies on property_activities
-- 2. Removes all duplicate/conflicting RLS policies on property_notes
-- 3. Creates simple, permissive policies for authenticated users
-- 4. Allows SELECT, INSERT, UPDATE, DELETE for all authenticated users
-- 
-- After running this migration:
-- - Property activities will be visible in the activity log
-- - Property notes will be created successfully
-- - No more RLS policy violations
-- ============================================================================

