-- ============================================
-- Migration 048: Cleanup All Test Data
-- ============================================
-- Removes all test/seed data created for Smart Match testing
-- Run this before activating real property feeds
--
-- WARNING: This will permanently delete all data where is_test_data = true
-- Make sure you have backups if needed!

-- ============================================
-- 1. DELETE TEST UNITS
-- ============================================
DELETE FROM public.units WHERE is_test_data = true;

-- ============================================
-- 2. DELETE TEST FLOOR PLANS
-- ============================================
DELETE FROM public.floor_plans WHERE is_test_data = true;

-- ============================================
-- 3. DELETE TEST PROPERTIES
-- ============================================
DELETE FROM public.properties WHERE is_test_data = true;

-- ============================================
-- 4. VERIFICATION
-- ============================================
-- Check that all test data has been removed

SELECT 
    'Properties' as table_name,
    COUNT(*) as test_records_remaining
FROM public.properties 
WHERE is_test_data = true

UNION ALL

SELECT 
    'Floor Plans' as table_name,
    COUNT(*) as test_records_remaining
FROM public.floor_plans 
WHERE is_test_data = true

UNION ALL

SELECT 
    'Units' as table_name,
    COUNT(*) as test_records_remaining
FROM public.units 
WHERE is_test_data = true;

-- Expected result: All counts should be 0
-- If any counts are > 0, re-run the DELETE statements above

