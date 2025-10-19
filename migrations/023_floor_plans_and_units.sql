-- Migration 023: Floor Plans and Units Tables
-- Creates hierarchical structure: Property → Floor Plans → Units
-- Supports new Listings page requirements

-- ============================================
-- 1. CREATE FLOOR_PLANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.floor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- Floor Plan Details
    name VARCHAR NOT NULL, -- e.g., "A1", "The Madison", "1x1 Classic"
    beds INTEGER NOT NULL,
    baths DECIMAL(3,1) NOT NULL, -- e.g., 1.0, 1.5, 2.0
    sqft INTEGER,
    
    -- Pricing
    market_rent INTEGER NOT NULL, -- Base market rent (no concessions)
    starting_at INTEGER NOT NULL, -- Effective rent after concessions
    
    -- Concessions (for Rent Savings badge)
    has_concession BOOLEAN DEFAULT false,
    concession_type VARCHAR, -- 'free_weeks', 'fee_waiver', 'dollar_off', 'percentage_off'
    concession_value VARCHAR, -- e.g., "2 weeks free", "$500 off", "50% off deposit"
    concession_description TEXT,
    
    -- Availability
    units_available INTEGER DEFAULT 0, -- Count of units available within window
    soonest_available DATE, -- Earliest availability date
    
    -- Metadata
    description TEXT,
    image_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE UNITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- Unit Details
    unit_number VARCHAR NOT NULL, -- e.g., "101", "2A", "Building 3 - 205"
    floor INTEGER,
    
    -- Pricing (can override floor plan pricing)
    rent INTEGER, -- If NULL, use floor_plan.starting_at
    market_rent INTEGER, -- If NULL, use floor_plan.market_rent
    
    -- Availability
    available_from DATE NOT NULL, -- When unit becomes available
    is_available BOOLEAN DEFAULT true,
    status VARCHAR DEFAULT 'available', -- 'available', 'pending', 'leased', 'unavailable'
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one unit number per property
    UNIQUE(property_id, unit_number)
);

-- ============================================
-- 3. UPDATE PROPERTIES TABLE
-- ============================================

-- Add fields for new Listings page requirements
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_source VARCHAR, -- e.g., 'manual', 'api', 'scraper'
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR;

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

-- Floor Plans indexes
CREATE INDEX IF NOT EXISTS idx_floor_plans_property_id ON public.floor_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_beds ON public.floor_plans(beds);
CREATE INDEX IF NOT EXISTS idx_floor_plans_starting_at ON public.floor_plans(starting_at);
CREATE INDEX IF NOT EXISTS idx_floor_plans_has_concession ON public.floor_plans(has_concession);

-- Units indexes
CREATE INDEX IF NOT EXISTS idx_units_floor_plan_id ON public.units(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_available_from ON public.units(available_from);
CREATE INDEX IF NOT EXISTS idx_units_is_available ON public.units(is_available);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_last_refreshed_at ON public.properties(last_refreshed_at);
CREATE INDEX IF NOT EXISTS idx_properties_is_verified ON public.properties(is_verified);

-- ============================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Floor Plans trigger
CREATE OR REPLACE FUNCTION update_floor_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER floor_plans_updated_at
    BEFORE UPDATE ON public.floor_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_floor_plans_updated_at();

-- Units trigger
CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION update_units_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Floor Plans policies
CREATE POLICY "Floor plans are viewable by everyone"
    ON public.floor_plans FOR SELECT
    USING (true);

CREATE POLICY "Managers can insert floor plans"
    ON public.floor_plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can update floor plans"
    ON public.floor_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can delete floor plans"
    ON public.floor_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

-- Units policies
CREATE POLICY "Units are viewable by everyone"
    ON public.units FOR SELECT
    USING (true);

CREATE POLICY "Managers can insert units"
    ON public.units FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can update units"
    ON public.units FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

CREATE POLICY "Managers can delete units"
    ON public.units FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to calculate units available within window (default 60 days)
CREATE OR REPLACE FUNCTION get_units_available_count(
    p_floor_plan_id UUID,
    p_days_window INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.units
        WHERE floor_plan_id = p_floor_plan_id
        AND is_available = true
        AND status = 'available'
        AND available_from <= (CURRENT_DATE + (p_days_window || ' days')::INTERVAL)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get soonest available date for a floor plan
CREATE OR REPLACE FUNCTION get_soonest_available_date(p_floor_plan_id UUID)
RETURNS DATE AS $$
BEGIN
    RETURN (
        SELECT MIN(available_from)
        FROM public.units
        WHERE floor_plan_id = p_floor_plan_id
        AND is_available = true
        AND status = 'available'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE public.floor_plans IS 'Floor plan types for properties (e.g., 1x1, 2x2)';
COMMENT ON TABLE public.units IS 'Individual units within floor plans';
COMMENT ON COLUMN public.floor_plans.market_rent IS 'Base market rent before concessions';
COMMENT ON COLUMN public.floor_plans.starting_at IS 'Effective rent after concessions applied';
COMMENT ON COLUMN public.floor_plans.has_concession IS 'True if any concession/special is active';
COMMENT ON COLUMN public.units.available_from IS 'Date when unit becomes available for move-in';
COMMENT ON COLUMN public.properties.last_refreshed_at IS 'Last time property data was updated/verified';
COMMENT ON COLUMN public.properties.is_verified IS 'True if refreshed ≤30 days OR from trusted source';

