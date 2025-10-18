-- ============================================================================
-- ACTIVITY LOGGING SYSTEM - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"
-- ============================================================================

-- 1. CREATE LEAD ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL, 
    description TEXT NOT NULL,
    metadata JSONB,
    performed_by VARCHAR REFERENCES public.users(id),
    performed_by_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON public.lead_activities(performed_by);

-- Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view lead activities for their leads"
    ON public.lead_activities FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

CREATE POLICY "Users can insert lead activities"
    ON public.lead_activities FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

-- 2. CREATE PROPERTY ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.property_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    performed_by VARCHAR REFERENCES public.users(id),
    performed_by_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_activities_property_id ON public.property_activities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_activities_type ON public.property_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_property_activities_created_at ON public.property_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_property_activities_performed_by ON public.property_activities(performed_by);

-- Enable RLS
ALTER TABLE public.property_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view property activities"
    ON public.property_activities FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

CREATE POLICY "Users can insert property activities"
    ON public.property_activities FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

-- 3. CREATE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION log_lead_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id) OR
       (OLD.health_status IS DISTINCT FROM NEW.health_status) OR
       (OLD.email IS DISTINCT FROM NEW.email) OR
       (OLD.phone IS DISTINCT FROM NEW.phone) THEN
        
        INSERT INTO public.lead_activities (
            lead_id,
            activity_type,
            description,
            metadata,
            performed_by,
            performed_by_name
        ) VALUES (
            NEW.id,
            'updated',
            'Lead details updated',
            jsonb_build_object(
                'fields_changed', ARRAY[
                    CASE WHEN OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN 'assigned_agent_id' END,
                    CASE WHEN OLD.health_status IS DISTINCT FROM NEW.health_status THEN 'health_status' END,
                    CASE WHEN OLD.email IS DISTINCT FROM NEW.email THEN 'email' END,
                    CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'phone' END
                ],
                'changes', jsonb_build_object(
                    'assigned_agent_id', CASE WHEN OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id 
                        THEN jsonb_build_object('old', OLD.assigned_agent_id, 'new', NEW.assigned_agent_id) END,
                    'health_status', CASE WHEN OLD.health_status IS DISTINCT FROM NEW.health_status 
                        THEN jsonb_build_object('old', OLD.health_status, 'new', NEW.health_status) END,
                    'email', CASE WHEN OLD.email IS DISTINCT FROM NEW.email 
                        THEN jsonb_build_object('old', OLD.email, 'new', NEW.email) END,
                    'phone', CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone 
                        THEN jsonb_build_object('old', OLD.phone, 'new', NEW.phone) END
                )
            ),
            auth.uid()::text,
            (SELECT name FROM public.users WHERE id = auth.uid()::text)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_property_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.rent_range_min IS DISTINCT FROM NEW.rent_range_min) OR
       (OLD.rent_range_max IS DISTINCT FROM NEW.rent_range_max) OR
       (OLD.commission_pct IS DISTINCT FROM NEW.commission_pct) OR
       (OLD.is_pumi IS DISTINCT FROM NEW.is_pumi) THEN
        
        INSERT INTO public.property_activities (
            property_id,
            activity_type,
            description,
            metadata,
            performed_by,
            performed_by_name
        ) VALUES (
            NEW.id,
            'updated',
            'Property details updated',
            jsonb_build_object(
                'fields_changed', ARRAY[
                    CASE WHEN OLD.rent_range_min IS DISTINCT FROM NEW.rent_range_min THEN 'rent_range_min' END,
                    CASE WHEN OLD.rent_range_max IS DISTINCT FROM NEW.rent_range_max THEN 'rent_range_max' END,
                    CASE WHEN OLD.commission_pct IS DISTINCT FROM NEW.commission_pct THEN 'commission_pct' END,
                    CASE WHEN OLD.is_pumi IS DISTINCT FROM NEW.is_pumi THEN 'is_pumi' END
                ],
                'changes', jsonb_build_object(
                    'rent_range_min', CASE WHEN OLD.rent_range_min IS DISTINCT FROM NEW.rent_range_min 
                        THEN jsonb_build_object('old', OLD.rent_range_min, 'new', NEW.rent_range_min) END,
                    'rent_range_max', CASE WHEN OLD.rent_range_max IS DISTINCT FROM NEW.rent_range_max 
                        THEN jsonb_build_object('old', OLD.rent_range_max, 'new', NEW.rent_range_max) END,
                    'commission_pct', CASE WHEN OLD.commission_pct IS DISTINCT FROM NEW.commission_pct 
                        THEN jsonb_build_object('old', OLD.commission_pct, 'new', NEW.commission_pct) END,
                    'is_pumi', CASE WHEN OLD.is_pumi IS DISTINCT FROM NEW.is_pumi 
                        THEN jsonb_build_object('old', OLD.is_pumi, 'new', NEW.is_pumi) END
                )
            ),
            auth.uid()::text,
            (SELECT name FROM public.users WHERE id = auth.uid()::text)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGERS
DROP TRIGGER IF EXISTS trigger_log_lead_update ON public.leads;
CREATE TRIGGER trigger_log_lead_update
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_update();

DROP TRIGGER IF EXISTS trigger_log_property_update ON public.properties;
CREATE TRIGGER trigger_log_property_update
    AFTER UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION log_property_update();

-- 5. ENABLE REALTIME (Optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_activities;

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT ON public.lead_activities TO authenticated;
GRANT SELECT, INSERT ON public.property_activities TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================

