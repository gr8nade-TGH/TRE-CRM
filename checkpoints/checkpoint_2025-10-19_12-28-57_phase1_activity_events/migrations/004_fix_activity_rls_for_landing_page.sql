-- ============================================================================
-- MIGRATION 004: Fix Activity Logging RLS for Landing Page
-- ============================================================================
-- Purpose: Allow anonymous users (landing page) to insert lead activities
-- Date: 2025-10-19
-- ============================================================================

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert lead activities" ON public.lead_activities;

-- Create a new policy that allows both authenticated users AND anonymous inserts
-- This is needed because the landing page is public and creates leads + activities
CREATE POLICY "Allow lead activity inserts"
    ON public.lead_activities FOR INSERT
    WITH CHECK (
        -- Allow if user is authenticated and active
        (auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        ))
        OR
        -- Allow anonymous inserts (for landing page submissions)
        (auth.uid() IS NULL)
    );

-- Note: The SELECT policy remains restrictive - only authenticated users can view activities
-- This is correct because the landing page doesn't need to read activities, only create them

