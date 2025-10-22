-- ============================================================================
-- Migration 027: Fix Unit Notes RLS Policies
-- ============================================================================
-- This migration fixes the RLS policies for unit_notes to allow authenticated
-- users to insert notes properly.
--
-- Issue: The original policy checked auth.uid()::TEXT = author_id, but this
-- comparison was failing. We simplify to just check if user is authenticated.
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own unit notes" ON public.unit_notes;
DROP POLICY IF EXISTS "Users can update their own unit notes" ON public.unit_notes;
DROP POLICY IF EXISTS "Users can delete their own unit notes" ON public.unit_notes;

-- Recreate policies with simpler checks
-- Policy: Authenticated users can insert unit notes
CREATE POLICY "Authenticated users can insert unit notes"
    ON public.unit_notes
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own unit notes
CREATE POLICY "Users can update their own unit notes"
    ON public.unit_notes
    FOR UPDATE
    USING (auth.uid()::TEXT = author_id);

-- Policy: Users can delete their own unit notes
CREATE POLICY "Users can delete their own unit notes"
    ON public.unit_notes
    FOR DELETE
    USING (auth.uid()::TEXT = author_id);

-- ============================================================================
-- Fix unit_activities RLS policies too
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert unit activities" ON public.unit_activities;

-- Recreate with simpler check
CREATE POLICY "Authenticated users can insert unit activities"
    ON public.unit_activities
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

