-- ============================================================================
-- Migration 036: Create Bugs Table
-- ============================================================================
-- This migration creates the bugs table for the bug tracker feature
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create bugs table
CREATE TABLE IF NOT EXISTS public.bugs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    expected TEXT,
    steps TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL,
    page TEXT NOT NULL,
    page_url TEXT,
    reported_by TEXT NOT NULL,
    reported_by_name TEXT NOT NULL,
    assigned_to TEXT,
    resolution_notes TEXT,
    screenshot_url TEXT,
    technical_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bugs_status ON public.bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_priority ON public.bugs(priority);
CREATE INDEX IF NOT EXISTS idx_bugs_category ON public.bugs(category);
CREATE INDEX IF NOT EXISTS idx_bugs_page ON public.bugs(page);
CREATE INDEX IF NOT EXISTS idx_bugs_reported_by ON public.bugs(reported_by);
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON public.bugs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bugs
-- Anyone can view bugs (for transparency)
CREATE POLICY "Anyone can view bugs" ON public.bugs
    FOR SELECT USING (true);

-- Authenticated users can insert bugs
CREATE POLICY "Authenticated users can insert bugs" ON public.bugs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Authenticated users can update bugs
CREATE POLICY "Authenticated users can update bugs" ON public.bugs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );

-- Only managers and super_users can delete bugs
CREATE POLICY "Managers can delete bugs" ON public.bugs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_bugs_updated_at
    BEFORE UPDATE ON public.bugs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.bugs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.bugs TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bugs;

-- ============================================================================
-- Migration Complete
-- ============================================================================

