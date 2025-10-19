-- ============================================
-- Add sample activity log entries for testing
-- ============================================
-- This script adds sample activities to your existing leads and properties
-- so you can see how the activity log feature works.

-- ============================================
-- STEP 1: Add activities for ALL existing leads
-- ============================================

-- This will add sample activities to each lead in your database
DO $$
DECLARE
    lead_record RECORD;
    agent_record RECORD;
BEGIN
    -- Get the first agent to use as the performer
    SELECT id, full_name INTO agent_record
    FROM public.users
    WHERE role IN ('agent', 'manager')
    LIMIT 1;

    -- Loop through all leads and add sample activities
    FOR lead_record IN
        SELECT id, name, created_at
        FROM public.leads
        ORDER BY created_at DESC
    LOOP
        -- Activity 1: Lead created
        INSERT INTO public.lead_activities (
            lead_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            lead_record.id,
            'lead_created',
            'Lead submitted via landing page',
            jsonb_build_object(
                'source', 'landing_page',
                'initial_status', 'new'
            ),
            agent_record.id,
            agent_record.full_name,
            lead_record.created_at
        );

        -- Activity 2: First contact attempt (1 hour after creation)
        INSERT INTO public.lead_activities (
            lead_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            lead_record.id,
            'call_logged',
            'Initial contact attempt - left voicemail',
            jsonb_build_object(
                'call_duration', '0:00',
                'outcome', 'voicemail',
                'notes', 'Left message introducing myself and asking for callback'
            ),
            agent_record.id,
            agent_record.full_name,
            lead_record.created_at + INTERVAL '1 hour'
        );

        -- Activity 3: Follow-up email (2 hours after creation)
        INSERT INTO public.lead_activities (
            lead_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            lead_record.id,
            'email_sent',
            'Sent welcome email with property options',
            jsonb_build_object(
                'email_type', 'welcome',
                'properties_included', 3,
                'subject', 'Welcome! Here are some great options for you'
            ),
            agent_record.id,
            agent_record.full_name,
            lead_record.created_at + INTERVAL '2 hours'
        );

        RAISE NOTICE 'Added activities for lead: %', lead_record.name;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Add activities for ALL existing properties
-- ============================================

DO $$
DECLARE
    property_record RECORD;
    agent_record RECORD;
BEGIN
    -- Get the first agent to use as the performer
    SELECT id, full_name INTO agent_record
    FROM public.users
    WHERE role IN ('agent', 'manager')
    LIMIT 1;

    -- Loop through all properties and add sample activities
    FOR property_record IN
        SELECT id, name, created_at
        FROM public.properties
        ORDER BY created_at DESC
        LIMIT 10  -- Only do first 10 properties
    LOOP
        -- Activity 1: Property added
        INSERT INTO public.property_activities (
            property_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            property_record.id,
            'property_created',
            'Property added to inventory',
            jsonb_build_object(
                'source', 'manual_entry',
                'initial_status', 'available'
            ),
            agent_record.id,
            agent_record.full_name,
            property_record.created_at
        );

        -- Activity 2: Photos uploaded (1 day after creation)
        INSERT INTO public.property_activities (
            property_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            property_record.id,
            'updated',
            'Property photos uploaded',
            jsonb_build_object(
                'photos_added', 8,
                'update_type', 'media'
            ),
            agent_record.id,
            agent_record.full_name,
            property_record.created_at + INTERVAL '1 day'
        );

        -- Activity 3: Pricing updated (2 days after creation)
        INSERT INTO public.property_activities (
            property_id, activity_type, description, metadata,
            performed_by, performed_by_name, created_at
        ) VALUES (
            property_record.id,
            'pricing_updated',
            'Special pricing added for move-in',
            jsonb_build_object(
                'old_price', 2000,
                'new_price', 1850,
                'reason', 'Move-in special'
            ),
            agent_record.id,
            agent_record.full_name,
            property_record.created_at + INTERVAL '2 days'
        );

        RAISE NOTICE 'Added activities for property: %', property_record.name;
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Verify the activities were created
-- ============================================

-- Check lead activities
SELECT
    l.name as lead_name,
    la.activity_type,
    la.description,
    la.performed_by_name,
    la.created_at
FROM public.lead_activities la
JOIN public.leads l ON l.id = la.lead_id
ORDER BY la.created_at DESC
LIMIT 20;

-- Check property activities
SELECT
    p.name as property_name,
    pa.activity_type,
    pa.description,
    pa.performed_by_name,
    pa.created_at
FROM public.property_activities pa
JOIN public.properties p ON p.id = pa.property_id
ORDER BY pa.created_at DESC
LIMIT 20;

