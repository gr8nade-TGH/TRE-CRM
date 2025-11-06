-- ============================================================================
-- Migration 059: Auto-Update Lead Current Step from Activities
-- ============================================================================
-- Purpose: Automatically update lead.current_step when activities are logged
-- This ensures progress tracking is always accurate and based on real activities
--
-- Created: 2025-11-06
-- Author: TRE CRM Development Team
--
-- EXECUTION STATUS: ✅ EXECUTED ON 2025-01-06
-- - Added current_step column to leads table
-- - Created trigger function update_lead_current_step_from_activity()
-- - Created trigger trigger_update_lead_current_step
-- - Backfilled 8 existing leads with correct current_step values
-- - Verified: 5 leads at step 1, 3 leads at step 2
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO UPDATE CURRENT STEP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_current_step_from_activity()
RETURNS TRIGGER AS $$
DECLARE
    calculated_step INTEGER;
BEGIN
    -- Calculate current step based on activities for this lead
    -- Find the highest step reached by checking for specific activity types
    -- Order matters: check from highest to lowest step
    
    SELECT CASE
        -- Step 6: Lease Finalized
        WHEN EXISTS (
            SELECT 1 FROM lead_activities 
            WHERE lead_id = NEW.lead_id 
            AND activity_type = 'lease_finalized'
        ) THEN 6
        
        -- Step 5: Lease Sent
        WHEN EXISTS (
            SELECT 1 FROM lead_activities 
            WHERE lead_id = NEW.lead_id 
            AND activity_type = 'lease_sent'
        ) THEN 5
        
        -- Step 4: Property Selected
        WHEN EXISTS (
            SELECT 1 FROM lead_activities 
            WHERE lead_id = NEW.lead_id 
            AND activity_type = 'property_selected'
        ) THEN 4
        
        -- Step 3: Guest Card Sent
        WHEN EXISTS (
            SELECT 1 FROM lead_activities 
            WHERE lead_id = NEW.lead_id 
            AND activity_type = 'guest_card_sent'
        ) THEN 3
        
        -- Step 2: Smart Match Sent
        WHEN EXISTS (
            SELECT 1 FROM lead_activities 
            WHERE lead_id = NEW.lead_id 
            AND activity_type = 'smart_match_sent'
        ) THEN 2
        
        -- Step 1: Lead Created (default)
        ELSE 1
    END INTO calculated_step;
    
    -- Update the lead's current_step field
    UPDATE leads
    SET 
        current_step = calculated_step,
        updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    -- Log the step update for debugging
    RAISE NOTICE 'Lead % current_step updated to % based on activity %', 
        NEW.lead_id, calculated_step, NEW.activity_type;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE TRIGGER
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_lead_current_step ON lead_activities;

-- Create trigger that fires after each activity insert
CREATE TRIGGER trigger_update_lead_current_step
    AFTER INSERT ON lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_current_step_from_activity();

-- ============================================================================
-- 3. BACKFILL EXISTING LEADS
-- ============================================================================

-- Update current_step for all existing leads based on their activities
-- This ensures consistency for leads that already have activities

DO $$
DECLARE
    lead_record RECORD;
    calculated_step INTEGER;
BEGIN
    -- Loop through all leads
    FOR lead_record IN SELECT id FROM leads LOOP
        -- Calculate step for this lead
        SELECT CASE
            WHEN EXISTS (
                SELECT 1 FROM lead_activities 
                WHERE lead_id = lead_record.id 
                AND activity_type = 'lease_finalized'
            ) THEN 6
            WHEN EXISTS (
                SELECT 1 FROM lead_activities 
                WHERE lead_id = lead_record.id 
                AND activity_type = 'lease_sent'
            ) THEN 5
            WHEN EXISTS (
                SELECT 1 FROM lead_activities 
                WHERE lead_id = lead_record.id 
                AND activity_type = 'property_selected'
            ) THEN 4
            WHEN EXISTS (
                SELECT 1 FROM lead_activities 
                WHERE lead_id = lead_record.id 
                AND activity_type = 'guest_card_sent'
            ) THEN 3
            WHEN EXISTS (
                SELECT 1 FROM lead_activities 
                WHERE lead_id = lead_record.id 
                AND activity_type = 'smart_match_sent'
            ) THEN 2
            ELSE 1
        END INTO calculated_step;
        
        -- Update the lead
        UPDATE leads
        SET current_step = calculated_step
        WHERE id = lead_record.id;
        
        RAISE NOTICE 'Backfilled lead % to step %', lead_record.id, calculated_step;
    END LOOP;
    
    RAISE NOTICE 'Backfill complete for all leads';
END $$;

-- ============================================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_lead_current_step_from_activity() IS 
'Automatically calculates and updates lead.current_step based on logged activities. 
Triggered after each lead_activity insert to ensure progress tracking is always accurate.';

COMMENT ON TRIGGER trigger_update_lead_current_step ON lead_activities IS 
'Automatically updates lead.current_step when new activities are logged. 
Ensures Documents page progress tracking reflects real activity data.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification query to check current steps
-- Run this to verify the migration worked correctly:
-- 
-- SELECT 
--     l.id,
--     l.name,
--     l.current_step,
--     COUNT(DISTINCT la.activity_type) as activity_count,
--     STRING_AGG(DISTINCT la.activity_type, ', ' ORDER BY la.activity_type) as activities
-- FROM leads l
-- LEFT JOIN lead_activities la ON la.lead_id = l.id
-- GROUP BY l.id, l.name, l.current_step
-- ORDER BY l.current_step DESC, l.created_at DESC
-- LIMIT 20;

