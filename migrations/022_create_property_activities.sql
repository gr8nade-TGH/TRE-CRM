-- Migration 022: Create Property Activities Table
-- Description: Track all property-related activities (contact updates, specials, etc.)

-- Create property_activities table
CREATE TABLE IF NOT EXISTS public.property_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    community_name VARCHAR NOT NULL,
    activity_type VARCHAR NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    performed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_property_activities_property_id ON public.property_activities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_activities_community_name ON public.property_activities(community_name);
CREATE INDEX IF NOT EXISTS idx_property_activities_type ON public.property_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_property_activities_created_at ON public.property_activities(created_at DESC);

-- Enable RLS
ALTER TABLE public.property_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Managers can see all property activities
CREATE POLICY "Managers can view all property activities"
    ON public.property_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

-- Agents can see property activities for their properties
CREATE POLICY "Agents can view their property activities"
    ON public.property_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'agent'
        )
        AND (
            performed_by = auth.uid()
            OR property_id IN (
                SELECT id FROM public.properties
                WHERE agent_id = auth.uid()
            )
        )
    );

-- All authenticated users can insert property activities
CREATE POLICY "Authenticated users can create property activities"
    ON public.property_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        performed_by = auth.uid()
    );

-- Comment on table
COMMENT ON TABLE public.property_activities IS 'Tracks all property-related activities including contact updates, specials, and other changes';

