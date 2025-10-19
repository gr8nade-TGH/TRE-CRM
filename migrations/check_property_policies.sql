-- ============================================================================
-- DIAGNOSTIC QUERY: Check Property Activities & Property Notes RLS Policies
-- ============================================================================
-- Purpose: View all current RLS policies on property_activities and property_notes
-- Run this BEFORE migration 019 to see what policies exist
-- ============================================================================

-- Check property_activities policies
SELECT 
    'property_activities' as table_name,
    policyname as policy_name,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression,
    roles
FROM pg_policies
WHERE tablename = 'property_activities'
AND schemaname = 'public'
ORDER BY policyname;

-- Separator
SELECT '---' as separator, '---' as separator2, '---' as separator3, '---' as separator4, '---' as separator5, '---' as separator6;

-- Check property_notes policies
SELECT 
    'property_notes' as table_name,
    policyname as policy_name,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression,
    roles
FROM pg_policies
WHERE tablename = 'property_notes'
AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- Expected output AFTER running migration 019:
-- ============================================================================
-- property_activities should have 4 policies:
--   1. property_activities_select_policy (SELECT)
--   2. property_activities_insert_policy (INSERT)
--   3. property_activities_update_policy (UPDATE)
--   4. property_activities_delete_policy (DELETE)
--
-- property_notes should have 4 policies:
--   1. property_notes_select_policy (SELECT)
--   2. property_notes_insert_policy (INSERT)
--   3. property_notes_update_policy (UPDATE)
--   4. property_notes_delete_policy (DELETE)
-- ============================================================================

