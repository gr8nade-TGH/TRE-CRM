-- Migration 055: Update Property Owner Emails for Testing
-- Purpose: Set up test property owner emails using Gmail+ trick for guest card testing
-- This allows all test emails to be received in a single inbox

-- ============================================
-- UPDATE PROPERTY OWNER EMAILS FOR TESTING
-- ============================================

-- Strategy: Use Gmail+ trick (tucker.harris+owner1@gmail.com, tucker.harris+owner2@gmail.com, etc.)
-- This allows testing multiple property owners while receiving all emails in one inbox

-- Update first 15 properties with test owner emails
WITH numbered_properties AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY id) as row_num
    FROM public.properties
    WHERE id IS NOT NULL
    LIMIT 15
)
UPDATE public.properties p
SET 
    contact_email = 'tucker.harris+owner' || np.row_num || '@gmail.com',
    contact_name = COALESCE(p.contact_name, 'Property Owner ' || np.row_num),
    contact_phone = COALESCE(p.contact_phone, '(555) 100-' || LPAD(np.row_num::text, 4, '0'))
FROM numbered_properties np
WHERE p.id = np.id;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check updated property owner emails
SELECT 
    id,
    name,
    community_name,
    contact_name,
    contact_email,
    contact_phone
FROM public.properties
WHERE contact_email LIKE '%tucker.harris+owner%'
ORDER BY contact_email;

-- ============================================
-- NOTES
-- ============================================

-- Gmail+ Trick Explanation:
-- - tucker.harris+owner1@gmail.com
-- - tucker.harris+owner2@gmail.com
-- - tucker.harris+owner3@gmail.com
-- All these emails will be delivered to tucker.harris@gmail.com
-- Gmail ignores everything after the + sign
-- This allows testing multiple recipients with a single inbox

-- To reset to production emails later, run:
-- UPDATE public.properties 
-- SET contact_email = NULL 
-- WHERE contact_email LIKE '%tucker.harris+owner%';

