-- Migration 015: Allow anonymous users to insert leads from landing pages
-- This enables the landing page forms to submit leads without authentication

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Anonymous users can insert leads" ON public.leads;

-- Allow anonymous users to insert leads (for landing page forms)
CREATE POLICY "Anonymous users can insert leads" ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Grant INSERT permission to anonymous users on leads table
GRANT INSERT ON public.leads TO anon;

