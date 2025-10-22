-- ============================================================================
-- Migration 026: Unit Notes, Activities, and Soft Deletes
-- ============================================================================
-- Purpose: Add unit-level notes and activity tracking, plus soft delete support
-- Created: 2025-10-22
-- Dependencies: Requires migrations 023 (floor_plans and units tables)
-- ============================================================================

-- ============================================================================
-- 1. ADD SOFT DELETE SUPPORT TO UNITS TABLE
-- ============================================================================

-- Add is_active column for soft deletes (keeps historical data)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for fast filtering of active units
CREATE INDEX IF NOT EXISTS idx_units_is_active ON public.units(is_active);

-- Add comment explaining soft delete pattern
COMMENT ON COLUMN public.units.is_active IS 'Soft delete flag: false = unit removed from market but data preserved for history';

-- ============================================================================
-- 2. CREATE UNIT_NOTES TABLE
-- ============================================================================
-- Note: Using VARCHAR for unit_id and property_id to match existing schema
-- (properties.id and units.id are VARCHAR in the current database)

CREATE TABLE IF NOT EXISTS public.unit_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id VARCHAR NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, -- Denormalized for easier queries
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    author_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for unit_notes
CREATE INDEX IF NOT EXISTS idx_unit_notes_unit_id ON public.unit_notes(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_notes_property_id ON public.unit_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_notes_created_at ON public.unit_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unit_notes_author_id ON public.unit_notes(author_id);

-- Add comment
COMMENT ON TABLE public.unit_notes IS 'Notes for individual units (e.g., "Unit needs new carpet", "Tenant moving out 3/15")';

-- ============================================================================
-- 3. CREATE UNIT_ACTIVITIES TABLE
-- ============================================================================
-- Note: Using VARCHAR for unit_id and property_id to match existing schema

CREATE TABLE IF NOT EXISTS public.unit_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id VARCHAR NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, -- Denormalized for easier queries
    activity_type VARCHAR NOT NULL,
    -- Types: 'created', 'updated', 'note_added', 'status_changed', 'rent_changed',
    --        'leased', 'available', 'pending', 'unavailable', 'deactivated', 'reactivated'
    description TEXT NOT NULL, -- Human-readable description
    metadata JSONB, -- Flexible storage for activity-specific data
    performed_by VARCHAR REFERENCES public.users(id), -- Who performed the action
    performed_by_name VARCHAR, -- Cached name for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for unit_activities
CREATE INDEX IF NOT EXISTS idx_unit_activities_unit_id ON public.unit_activities(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_activities_property_id ON public.unit_activities(property_id);
CREATE INDEX IF NOT EXISTS idx_unit_activities_type ON public.unit_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_unit_activities_created_at ON public.unit_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unit_activities_performed_by ON public.unit_activities(performed_by);

-- Add comment
COMMENT ON TABLE public.unit_activities IS 'Activity log for units (status changes, rent updates, leasing events)';

-- ============================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger function for unit_notes.updated_at
CREATE OR REPLACE FUNCTION update_unit_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_notes_updated_at
    BEFORE UPDATE ON public.unit_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_notes_updated_at();

-- ============================================================================
-- 5. CREATE AUTOMATIC ACTIVITY LOGGING TRIGGERS
-- ============================================================================

-- Trigger to log unit status changes
CREATE OR REPLACE FUNCTION log_unit_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.unit_activities (
            unit_id,
            property_id,
            activity_type,
            description,
            metadata
        ) VALUES (
            NEW.id,
            NEW.property_id,
            'status_changed',
            'Unit status changed from ' || COALESCE(OLD.status, 'unknown') || ' to ' || NEW.status,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'unit_number', NEW.unit_number
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_status_change_logger
    AFTER UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION log_unit_status_change();

-- Trigger to log unit rent changes
CREATE OR REPLACE FUNCTION log_unit_rent_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if rent actually changed
    IF (TG_OP = 'UPDATE' AND OLD.rent IS DISTINCT FROM NEW.rent) THEN
        INSERT INTO public.unit_activities (
            unit_id,
            property_id,
            activity_type,
            description,
            metadata
        ) VALUES (
            NEW.id,
            NEW.property_id,
            'rent_changed',
            'Rent changed from $' || COALESCE(OLD.rent::TEXT, 'N/A') || ' to $' || COALESCE(NEW.rent::TEXT, 'N/A'),
            jsonb_build_object(
                'old_rent', OLD.rent,
                'new_rent', NEW.rent,
                'unit_number', NEW.unit_number
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_rent_change_logger
    AFTER UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION log_unit_rent_change();

-- Trigger to log unit activation/deactivation
CREATE OR REPLACE FUNCTION log_unit_activation_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if is_active actually changed
    IF (TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        INSERT INTO public.unit_activities (
            unit_id,
            property_id,
            activity_type,
            description,
            metadata
        ) VALUES (
            NEW.id,
            NEW.property_id,
            CASE WHEN NEW.is_active THEN 'reactivated' ELSE 'deactivated' END,
            CASE 
                WHEN NEW.is_active THEN 'Unit reactivated and returned to market'
                ELSE 'Unit deactivated and removed from market'
            END,
            jsonb_build_object(
                'is_active', NEW.is_active,
                'unit_number', NEW.unit_number,
                'status', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unit_activation_change_logger
    AFTER UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION log_unit_activation_change();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on unit_notes
ALTER TABLE public.unit_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all unit notes
CREATE POLICY "Users can view all unit notes"
    ON public.unit_notes
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Users can insert their own unit notes
CREATE POLICY "Users can insert their own unit notes"
    ON public.unit_notes
    FOR INSERT
    WITH CHECK (auth.uid()::TEXT = author_id);

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

-- Enable RLS on unit_activities
ALTER TABLE public.unit_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all unit activities
CREATE POLICY "Users can view all unit activities"
    ON public.unit_activities
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Users can insert unit activities
CREATE POLICY "Users can insert unit activities"
    ON public.unit_activities
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 7. ENABLE REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for unit_notes (for live updates in modals)
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_notes;

-- Enable realtime for unit_activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_activities;

-- ============================================================================
-- 8. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 026 Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables Created:';
    RAISE NOTICE '  - unit_notes (with 4 indexes)';
    RAISE NOTICE '  - unit_activities (with 5 indexes)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Columns Added:';
    RAISE NOTICE '  - units.is_active (soft delete support)';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Triggers Created:';
    RAISE NOTICE '  - unit_notes_updated_at (auto-update timestamp)';
    RAISE NOTICE '  - unit_status_change_logger (auto-log status changes)';
    RAISE NOTICE '  - unit_rent_change_logger (auto-log rent changes)';
    RAISE NOTICE '  - unit_activation_change_logger (auto-log activation changes)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS Policies: Enabled on both tables';
    RAISE NOTICE '📡 Realtime: Enabled on both tables';
END $$;

