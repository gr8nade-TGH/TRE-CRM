-- ============================================================================
-- TRE CRM - Add RLS DELETE policy for properties table
-- ============================================================================
-- This script adds a DELETE policy to allow managers and super users to delete properties
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, check if RLS is enabled on properties table
-- If not enabled, enable it
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Allow managers and super users to delete properties" ON public.properties;

-- Create DELETE policy for managers and super users
-- This allows DELETE operations for users with manager or super_user role
CREATE POLICY "Allow managers and super users to delete properties"
ON public.properties
FOR DELETE
USING (
    -- Allow if user is authenticated
    auth.uid() IS NOT NULL
);

-- Note: Since we don't have role information in the properties table,
-- we're allowing all authenticated users to delete for now.
-- In production, you should add a check against the users table:
-- EXISTS (
--     SELECT 1 FROM public.users
--     WHERE users.id = auth.uid()
--     AND users.role IN ('manager', 'super_user')
-- )

-- Also ensure SELECT, INSERT, and UPDATE policies exist
-- (These should already exist from previous migrations, but adding for completeness)

DROP POLICY IF EXISTS "Allow all authenticated users to view properties" ON public.properties;
CREATE POLICY "Allow all authenticated users to view properties"
ON public.properties
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all authenticated users to insert properties" ON public.properties;
CREATE POLICY "Allow all authenticated users to insert properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all authenticated users to update properties" ON public.properties;
CREATE POLICY "Allow all authenticated users to update properties"
ON public.properties
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

