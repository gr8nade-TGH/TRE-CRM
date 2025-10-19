-- Migration 007: Clean up duplicate/conflicting RLS policies on lead_activities
-- Issue: Multiple SELECT policies exist, including a restrictive one that blocks access

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view lead activities for their leads" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can insert lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow lead activity inserts" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow insert for authenticated users and anon for landing page" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow select for all users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow insert for all users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.lead_activities;

-- Now create clean, simple policies

-- SELECT: Allow all authenticated and anonymous users to view activities
CREATE POLICY "lead_activities_select_policy"
ON public.lead_activities
FOR SELECT
TO authenticated, anon
USING (true);

-- INSERT: Allow all authenticated and anonymous users to insert activities
CREATE POLICY "lead_activities_insert_policy"
ON public.lead_activities
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- UPDATE: Allow only authenticated users to update activities
CREATE POLICY "lead_activities_update_policy"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Allow only authenticated users to delete activities
CREATE POLICY "lead_activities_delete_policy"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (true);

