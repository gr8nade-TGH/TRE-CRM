-- Migration 015: Allow anonymous users to insert leads from landing pages
-- This enables the landing page forms to submit leads without authentication

-- First, let's see what policies exist and drop all INSERT policies
DROP POLICY IF EXISTS "Anonymous users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

-- Create a single INSERT policy that allows both authenticated users AND anonymous users
CREATE POLICY "Anyone can insert leads" ON public.leads
FOR INSERT
WITH CHECK (true);

-- Grant INSERT permission to anonymous users on leads table
GRANT INSERT ON public.leads TO anon;

-- Grant INSERT permission to authenticated users on leads table
GRANT INSERT ON public.leads TO authenticated;

