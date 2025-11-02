-- ============================================
-- Migration 044: Fix Smart Match Config RLS Policies
-- ============================================
-- Purpose: Fix RLS policies to allow authenticated users to update smart_match_config
-- The previous policy was checking auth.uid() against application user IDs which don't match
-- 
-- Issue: auth.uid() returns Supabase auth UUID, but our users table has different UUIDs
-- Solution: Allow all authenticated users to update (can be restricted later if needed)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can update smart match config" ON public.smart_match_config;
DROP POLICY IF EXISTS "Super users can delete smart match config" ON public.smart_match_config;

-- Policy: Allow authenticated users to update configurations
-- (In production, you may want to restrict this to specific roles)
CREATE POLICY "Authenticated users can update smart match config" ON public.smart_match_config
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Allow authenticated users to delete configurations
-- (In production, you may want to restrict this to super users only)
CREATE POLICY "Authenticated users can delete smart match config" ON public.smart_match_config
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Verify policies are active
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'smart_match_config'
ORDER BY policyname;

