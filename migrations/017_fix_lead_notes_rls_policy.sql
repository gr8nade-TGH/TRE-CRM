-- Fix Lead Notes RLS Policy to allow managers to add notes to any lead
-- Run this in Supabase SQL Editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can insert notes for their assigned leads" ON public.lead_notes;

-- Create a new, more permissive policy
CREATE POLICY "Users can insert notes for their assigned leads" ON public.lead_notes
    FOR INSERT WITH CHECK (
        -- Managers and super_users can add notes to any lead
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
        OR
        -- Agents can add notes to their assigned leads
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = lead_notes.lead_id
            AND leads.assigned_agent_id = auth.uid()::text
        )
    );

