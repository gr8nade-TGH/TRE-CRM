-- ============================================================================
-- TRE CRM - Properties Table Updates and Property Notes
-- ============================================================================
-- This script updates the properties table and creates property_notes table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. UPDATE PROPERTIES TABLE
-- ============================================================================
-- Add missing columns for comprehensive listing management

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS community_name VARCHAR,
ADD COLUMN IF NOT EXISTS street_address VARCHAR,
ADD COLUMN IF NOT EXISTS city VARCHAR,
ADD COLUMN IF NOT EXISTS zip_code VARCHAR,
ADD COLUMN IF NOT EXISTS bed_range VARCHAR, -- e.g., "1-3"
ADD COLUMN IF NOT EXISTS bath_range VARCHAR, -- e.g., "1-2"
ADD COLUMN IF NOT EXISTS rent_range_min INTEGER,
ADD COLUMN IF NOT EXISTS rent_range_max INTEGER,
ADD COLUMN IF NOT EXISTS commission_pct DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS amenities TEXT[], -- Array of amenities
ADD COLUMN IF NOT EXISTS is_pumi BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR,
ADD COLUMN IF NOT EXISTS leasing_link VARCHAR,
ADD COLUMN IF NOT EXISTS photos TEXT[], -- Array of photo URLs
ADD COLUMN IF NOT EXISTS map_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS map_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_market ON public.properties(market);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_is_pumi ON public.properties(is_pumi);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties(created_by);

-- ============================================================================
-- 2. PROPERTY_NOTES TABLE
-- ============================================================================
-- For timestamped notes on properties

CREATE TABLE IF NOT EXISTS public.property_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    author_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_notes_property_id ON public.property_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_notes_created_at ON public.property_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_property_notes_author_id ON public.property_notes(author_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on properties table (if not already enabled)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties (all authenticated users can view)
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
CREATE POLICY "Anyone can view properties" ON public.properties
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;
CREATE POLICY "Authenticated users can insert properties" ON public.properties
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Users can update properties" ON public.properties;
CREATE POLICY "Users can update properties" ON public.properties
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Managers can delete properties" ON public.properties;
CREATE POLICY "Managers can delete properties" ON public.properties
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Enable RLS on property_notes table
ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_notes
DROP POLICY IF EXISTS "Anyone can view property notes" ON public.property_notes;
CREATE POLICY "Anyone can view property notes" ON public.property_notes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert property notes" ON public.property_notes;
CREATE POLICY "Authenticated users can insert property notes" ON public.property_notes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Users can update their own property notes" ON public.property_notes;
CREATE POLICY "Users can update their own property notes" ON public.property_notes
    FOR UPDATE USING (author_id = auth.uid()::text);

DROP POLICY IF EXISTS "Managers can update any property notes" ON public.property_notes;
CREATE POLICY "Managers can update any property notes" ON public.property_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own property notes" ON public.property_notes;
CREATE POLICY "Users can delete their own property notes" ON public.property_notes
    FOR DELETE USING (author_id = auth.uid()::text);

DROP POLICY IF EXISTS "Managers can delete any property notes" ON public.property_notes;
CREATE POLICY "Managers can delete any property notes" ON public.property_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;
GRANT SELECT ON public.properties TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_notes TO authenticated;

-- ============================================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for properties table
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON public.properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for property_notes table
DROP TRIGGER IF EXISTS update_property_notes_updated_at ON public.properties;
CREATE TRIGGER update_property_notes_updated_at 
    BEFORE UPDATE ON public.property_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ENABLE REALTIME (OPTIONAL)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.property_notes;

-- ============================================================================
-- DONE!
-- ============================================================================

