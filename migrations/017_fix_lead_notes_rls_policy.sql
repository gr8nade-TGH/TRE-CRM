-- Fix Lead Notes RLS Policy to allow managers to add notes to any lead
-- Run this in Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert notes for their assigned leads" ON public.lead_notes;

-- Create a new, more permissive policy
-- Allow all authenticated users to insert notes (we'll handle permissions in the app)
CREATE POLICY "Users can insert notes for their assigned leads" ON public.lead_notes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

