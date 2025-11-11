-- Migration 062: Fix Test Lead Email Addresses
-- Date: 2025-01-10
-- Purpose: Fix test lead emails to use tucker.harris+[descriptor]@gmail.com format
-- 
-- CRITICAL ISSUE: Migration 060 created test leads with fake email addresses like:
-- - david.tech+test@gmail.com
-- - jennifer.family+test@gmail.com (BOUNCED!)
-- - sam.student+test@gmail.com
-- 
-- These are NOT real email addresses and caused bounces, potentially hurting sender reputation!
-- 
-- CORRECT FORMAT: All test emails should use Gmail+ trick with tucker.harris@gmail.com:
-- - tucker.harris+downtown@gmail.com
-- - tucker.harris+student@gmail.com
-- - tucker.harris+familykids@gmail.com
-- etc.
-- 
-- This way all test emails go to tucker.harris@gmail.com inbox for testing!

-- Update all test leads to use tucker.harris+[descriptor]@gmail.com format
UPDATE leads 
SET email = CASE id
    WHEN 'lead_young_prof_1' THEN 'tucker.harris+downtown@gmail.com'
    WHEN 'lead_student_budget_1' THEN 'tucker.harris+student@gmail.com'
    WHEN 'lead_family_kids_1' THEN 'tucker.harris+familykids@gmail.com'
    WHEN 'lead_tech_worker_1' THEN 'tucker.harris+tech@gmail.com'
    WHEN 'lead_luxury_seeker_1' THEN 'tucker.harris+luxuryseeker@gmail.com'
    WHEN 'lead_dog_owner_1' THEN 'tucker.harris+dogowner@gmail.com'
    WHEN 'lead_roommates_1' THEN 'tucker.harris+roommates@gmail.com'
    WHEN 'lead_retiree_couple_1' THEN 'tucker.harris+retirees@gmail.com'
    WHEN 'lead_single_parent_1' THEN 'tucker.harris+singleparent@gmail.com'
    WHEN 'lead_minimalist_1' THEN 'tucker.harris+minimalist@gmail.com'
    WHEN 'lead_remote_worker_1' THEN 'tucker.harris+remote@gmail.com'
    WHEN 'lead_fitness_fan_1' THEN 'tucker.harris+fitness@gmail.com'
    WHEN 'lead_large_family_1' THEN 'tucker.harris+largefamily@gmail.com'
    WHEN 'lead_artist_1' THEN 'tucker.harris+artist@gmail.com'
    WHEN 'lead_commuter_1' THEN 'tucker.harris+commuter@gmail.com'
    WHEN 'lead_nature_lover_1' THEN 'tucker.harris+nature@gmail.com'
    WHEN 'lead_grad_student_1' THEN 'tucker.harris+gradstudent@gmail.com'
    WHEN 'lead_couple_modern_1' THEN 'tucker.harris+couple@gmail.com'
    WHEN 'lead_flexible_1' THEN 'tucker.harris+flexibletest@gmail.com'
    WHEN 'lead_executive_1' THEN 'tucker.harris+executive@gmail.com'
END
WHERE id IN (
    'lead_young_prof_1', 'lead_student_budget_1', 'lead_family_kids_1', 
    'lead_tech_worker_1', 'lead_luxury_seeker_1', 'lead_dog_owner_1',
    'lead_roommates_1', 'lead_retiree_couple_1', 'lead_single_parent_1',
    'lead_minimalist_1', 'lead_remote_worker_1', 'lead_fitness_fan_1',
    'lead_large_family_1', 'lead_artist_1', 'lead_commuter_1',
    'lead_nature_lover_1', 'lead_grad_student_1', 'lead_couple_modern_1',
    'lead_flexible_1', 'lead_executive_1'
);

-- Verification: Check that all test leads now have tucker.harris email addresses
SELECT 
    id, 
    name, 
    email
FROM leads 
WHERE email LIKE 'tucker.harris+%@gmail.com'
ORDER BY name;

-- Expected Result: 20 test leads all with tucker.harris+[descriptor]@gmail.com format

