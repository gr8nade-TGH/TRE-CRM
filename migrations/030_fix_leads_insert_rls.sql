-- Migration 030: Fix leads INSERT RLS policy
-- This ensures authenticated users can insert leads from the CRM app

-- Drop all existing INSERT policies on leads table
DROP POLICY IF EXISTS "Anonymous users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Agents can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

-- Create a single INSERT policy that allows EVERYONE (authenticated AND anonymous)
CREATE POLICY "Anyone can insert leads" ON public.leads
FOR INSERT
WITH CHECK (true);

-- Ensure table permissions are granted
GRANT INSERT ON public.leads TO anon;
GRANT INSERT ON public.leads TO authenticated;

-- Verify RLS is enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

