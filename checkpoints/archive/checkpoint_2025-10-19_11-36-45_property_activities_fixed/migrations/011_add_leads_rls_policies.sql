-- ============================================================================
-- TRE CRM - Add RLS policies for leads table
-- ============================================================================
-- This script adds RLS policies to allow:
-- 1. Anonymous users to INSERT leads (from landing pages)
-- 2. Authenticated users to view/update their assigned leads
-- 3. Managers to view/update all leads
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable RLS on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Drop existing SELECT policies if they exist
DROP POLICY IF EXISTS "Agents can view their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can view all leads" ON public.leads;

-- Agents can view leads assigned to them or found by them
CREATE POLICY "Agents can view their assigned leads" ON public.leads
FOR SELECT
USING (
    auth.uid()::text = assigned_agent_id 
    OR auth.uid()::text = found_by_agent_id
);

-- Managers and super users can view all leads
CREATE POLICY "Managers can view all leads" ON public.leads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('manager', 'super_user')
    )
);

-- ============================================================================
-- INSERT POLICIES
-- ============================================================================

-- Drop existing INSERT policies if they exist
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

-- Allow anonymous users to insert leads (for landing page submissions)
-- This is critical for the landing page form to work
CREATE POLICY "Anyone can insert leads" ON public.leads
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Drop existing UPDATE policies if they exist
DROP POLICY IF EXISTS "Agents can update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can update all leads" ON public.leads;

-- Agents can update leads assigned to them
CREATE POLICY "Agents can update their assigned leads" ON public.leads
FOR UPDATE
USING (
    auth.uid()::text = assigned_agent_id 
    OR auth.uid()::text = found_by_agent_id
)
WITH CHECK (
    auth.uid()::text = assigned_agent_id 
    OR auth.uid()::text = found_by_agent_id
);

-- Managers and super users can update all leads
CREATE POLICY "Managers can update all leads" ON public.leads
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('manager', 'super_user')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('manager', 'super_user')
    )
);

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Drop existing DELETE policies if they exist
DROP POLICY IF EXISTS "Managers can delete leads" ON public.leads;

-- Only managers and super users can delete leads
CREATE POLICY "Managers can delete leads" ON public.leads
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('manager', 'super_user')
    )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to anonymous users (for landing page submissions)
GRANT INSERT ON public.leads TO anon;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- To verify the policies were created, run:
-- SELECT * FROM pg_policies WHERE tablename = 'leads';

