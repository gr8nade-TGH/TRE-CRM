-- Migration: Fix RLS policies for lead_activities to allow anonymous inserts
-- The issue is that Supabase by default tries to return inserted rows,
-- but anonymous users don't have SELECT permission

-- First, let's see what policies exist
-- DROP all existing policies on lead_activities
DROP POLICY IF EXISTS "Allow insert for authenticated users and anon for landing page" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.lead_activities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.lead_activities;

-- Create a permissive SELECT policy for anonymous users to see activities they just created
CREATE POLICY "Allow select for all users"
ON public.lead_activities
FOR SELECT
TO authenticated, anon
USING (true);

-- Create INSERT policy that allows both authenticated and anonymous users
CREATE POLICY "Allow insert for all users"
ON public.lead_activities
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create UPDATE policy for authenticated users only
CREATE POLICY "Allow update for authenticated users"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create DELETE policy for authenticated users only
CREATE POLICY "Allow delete for authenticated users"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (true);

