-- Fix Lead Notes RLS Policy to allow authenticated users to add notes
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on lead_notes to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lead_notes' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.lead_notes';
    END LOOP;
END $$;

-- Now create fresh policies matching property_notes pattern

-- SELECT policy - anyone can view notes
CREATE POLICY "Anyone can view lead notes" ON public.lead_notes
    FOR SELECT USING (true);

-- INSERT policy - any authenticated user can insert notes
CREATE POLICY "Authenticated users can insert lead notes" ON public.lead_notes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- UPDATE policy - users can update their own notes
CREATE POLICY "Users can update their own lead notes" ON public.lead_notes
    FOR UPDATE USING (author_id = auth.uid()::text);

-- UPDATE policy - managers can update any notes
CREATE POLICY "Managers can update any lead notes" ON public.lead_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

