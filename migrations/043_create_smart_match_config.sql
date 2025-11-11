-- ============================================================================
-- Migration 043: Create Smart Match Configuration Table
-- ============================================================================
-- Creates a table to store configurable Smart Match algorithm settings
-- allowing administrators to customize filtering, scoring, and display options

-- ============================================
-- 1. CREATE SMART_MATCH_CONFIG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.smart_match_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL DEFAULT 'Default Configuration',
    is_active BOOLEAN DEFAULT true,
    
    -- ============================================
    -- FILTERING CRITERIA
    -- ============================================
    
    -- Bedroom Matching
    bedroom_match_mode VARCHAR DEFAULT 'exact', -- 'exact', 'flexible', 'range'
    bedroom_tolerance INTEGER DEFAULT 0, -- +/- bedrooms if flexible (e.g., 1 means ±1 bedroom)
    
    -- Bathroom Matching
    bathroom_match_mode VARCHAR DEFAULT 'exact', -- 'exact', 'flexible', 'range'
    bathroom_tolerance DECIMAL(2,1) DEFAULT 0, -- +/- bathrooms if flexible (e.g., 0.5 means ±0.5 bath)
    
    -- Rent Range Tolerance
    rent_tolerance_percent INTEGER DEFAULT 20, -- % over/under budget to allow
    rent_tolerance_mode VARCHAR DEFAULT 'percentage', -- 'percentage', 'fixed_amount'
    rent_tolerance_fixed INTEGER DEFAULT 0, -- Fixed dollar amount if mode is 'fixed_amount'
    
    -- Move-in Date Flexibility
    move_in_flexibility_days INTEGER DEFAULT 30, -- Days before/after desired move-in date
    
    -- Pet Policy Filtering
    pet_policy_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    
    -- Income Requirements
    income_requirement_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    income_multiplier DECIMAL(3,1) DEFAULT 3.0, -- Rent × multiplier = required income
    
    -- Credit Score Requirements
    credit_score_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    min_credit_score INTEGER DEFAULT 600,
    
    -- Background Check Requirements
    background_check_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    
    -- Leniency Factor
    use_leniency_factor BOOLEAN DEFAULT true, -- Use property.leniency field in scoring
    
    -- ============================================
    -- SCORING WEIGHTS
    -- ============================================
    
    -- Base Scoring (Lead Preference Matching)
    price_match_perfect_score INTEGER DEFAULT 25, -- Points for rent within budget
    price_match_close_score INTEGER DEFAULT 10, -- Points for rent within tolerance
    move_in_date_bonus INTEGER DEFAULT 10, -- Bonus if available by desired date
    
    -- Business Priority Bonuses
    commission_threshold_pct DECIMAL(5,2) DEFAULT 4.0, -- Commission % threshold for bonus
    commission_base_bonus INTEGER DEFAULT 80, -- Base bonus for high commission
    commission_scale_bonus INTEGER DEFAULT 1, -- Points per 1% above threshold
    
    pumi_bonus INTEGER DEFAULT 20, -- Bonus for PUMI properties
    
    -- Leniency Bonuses (if use_leniency_factor is true)
    leniency_bonus_low INTEGER DEFAULT 0, -- Bonus for LOW leniency properties
    leniency_bonus_medium INTEGER DEFAULT 5, -- Bonus for MEDIUM leniency properties
    leniency_bonus_high INTEGER DEFAULT 10, -- Bonus for HIGH leniency properties
    
    -- ============================================
    -- DISPLAY SETTINGS
    -- ============================================
    
    max_properties_to_show INTEGER DEFAULT 10, -- Maximum number of properties to return
    min_score_threshold INTEGER DEFAULT 0, -- Minimum score required to show property
    sort_by VARCHAR DEFAULT 'score', -- 'score', 'rent_low', 'rent_high', 'availability'
    
    -- ============================================
    -- METADATA
    -- ============================================
    
    created_by VARCHAR REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by VARCHAR REFERENCES public.users(id)
);

-- ============================================
-- 2. ADD COLUMN COMMENTS
-- ============================================

COMMENT ON TABLE public.smart_match_config IS 'Configuration settings for Smart Match algorithm';

-- Filtering Criteria Comments
COMMENT ON COLUMN public.smart_match_config.bedroom_match_mode IS 'How to match bedrooms: exact (must match exactly), flexible (±tolerance), range (any within range)';
COMMENT ON COLUMN public.smart_match_config.bedroom_tolerance IS 'Number of bedrooms +/- to allow when bedroom_match_mode is flexible';
COMMENT ON COLUMN public.smart_match_config.bathroom_match_mode IS 'How to match bathrooms: exact (must match exactly), flexible (±tolerance), range (any within range)';
COMMENT ON COLUMN public.smart_match_config.bathroom_tolerance IS 'Number of bathrooms +/- to allow when bathroom_match_mode is flexible';
COMMENT ON COLUMN public.smart_match_config.rent_tolerance_percent IS 'Percentage over/under budget to allow (e.g., 20 = ±20%)';
COMMENT ON COLUMN public.smart_match_config.rent_tolerance_mode IS 'How to calculate rent tolerance: percentage or fixed_amount';
COMMENT ON COLUMN public.smart_match_config.rent_tolerance_fixed IS 'Fixed dollar amount +/- to allow when rent_tolerance_mode is fixed_amount';
COMMENT ON COLUMN public.smart_match_config.move_in_flexibility_days IS 'Days before/after desired move-in date to consider available';
COMMENT ON COLUMN public.smart_match_config.pet_policy_mode IS 'How to filter by pet policy: ignore (no filtering), strict (must match), lenient (use leniency factor)';
COMMENT ON COLUMN public.smart_match_config.income_requirement_mode IS 'How to filter by income: ignore (no filtering), strict (must meet requirement), lenient (use leniency factor)';
COMMENT ON COLUMN public.smart_match_config.income_multiplier IS 'Income requirement multiplier (e.g., 3.0 = rent × 3)';
COMMENT ON COLUMN public.smart_match_config.credit_score_mode IS 'How to filter by credit score: ignore (no filtering), strict (must meet minimum), lenient (use leniency factor)';
COMMENT ON COLUMN public.smart_match_config.min_credit_score IS 'Minimum credit score required when credit_score_mode is strict';
COMMENT ON COLUMN public.smart_match_config.background_check_mode IS 'How to filter by background check: ignore (no filtering), strict (must pass), lenient (use leniency factor)';
COMMENT ON COLUMN public.smart_match_config.use_leniency_factor IS 'Whether to use property leniency field in scoring';

-- Scoring Weights Comments
COMMENT ON COLUMN public.smart_match_config.price_match_perfect_score IS 'Points awarded when rent is within budget';
COMMENT ON COLUMN public.smart_match_config.price_match_close_score IS 'Points awarded when rent is within tolerance but outside budget';
COMMENT ON COLUMN public.smart_match_config.move_in_date_bonus IS 'Bonus points if unit available by desired move-in date';
COMMENT ON COLUMN public.smart_match_config.commission_threshold_pct IS 'Commission percentage threshold for bonus (e.g., 4.0 = 4%)';
COMMENT ON COLUMN public.smart_match_config.commission_base_bonus IS 'Base bonus points for commission above threshold';
COMMENT ON COLUMN public.smart_match_config.commission_scale_bonus IS 'Additional points per 1% above commission threshold';
COMMENT ON COLUMN public.smart_match_config.pumi_bonus IS 'Bonus points for PUMI properties';
COMMENT ON COLUMN public.smart_match_config.leniency_bonus_low IS 'Bonus points for properties with LOW leniency';
COMMENT ON COLUMN public.smart_match_config.leniency_bonus_medium IS 'Bonus points for properties with MEDIUM leniency';
COMMENT ON COLUMN public.smart_match_config.leniency_bonus_high IS 'Bonus points for properties with HIGH leniency';

-- Display Settings Comments
COMMENT ON COLUMN public.smart_match_config.max_properties_to_show IS 'Maximum number of properties to return in Smart Match results';
COMMENT ON COLUMN public.smart_match_config.min_score_threshold IS 'Minimum score required for property to be included in results';
COMMENT ON COLUMN public.smart_match_config.sort_by IS 'How to sort results: score (highest first), rent_low, rent_high, availability';

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_smart_match_config_active ON public.smart_match_config(is_active);
CREATE INDEX IF NOT EXISTS idx_smart_match_config_created_at ON public.smart_match_config(created_at DESC);

-- ============================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_smart_match_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_smart_match_config_updated_at
    BEFORE UPDATE ON public.smart_match_config
    FOR EACH ROW
    EXECUTE FUNCTION update_smart_match_config_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.smart_match_config ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view configurations
DROP POLICY IF EXISTS "Anyone can view smart match config" ON public.smart_match_config;
CREATE POLICY "Anyone can view smart match config" ON public.smart_match_config
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: Only managers and super_users can insert configurations
DROP POLICY IF EXISTS "Managers can insert smart match config" ON public.smart_match_config;
CREATE POLICY "Managers can insert smart match config" ON public.smart_match_config
    FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users 
            WHERE active = true 
            AND role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Policy: Only managers and super_users can update configurations
DROP POLICY IF EXISTS "Managers can update smart match config" ON public.smart_match_config;
CREATE POLICY "Managers can update smart match config" ON public.smart_match_config
    FOR UPDATE
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users 
            WHERE active = true 
            AND role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Policy: Only super_users can delete configurations
DROP POLICY IF EXISTS "Super users can delete smart match config" ON public.smart_match_config;
CREATE POLICY "Super users can delete smart match config" ON public.smart_match_config
    FOR DELETE
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users 
            WHERE active = true 
            AND role = 'SUPER_USER'
        )
    );

-- ============================================
-- 6. INSERT DEFAULT CONFIGURATION
-- ============================================

-- Insert default configuration (matches current hardcoded algorithm)
INSERT INTO public.smart_match_config (
    name,
    is_active,
    bedroom_match_mode,
    bedroom_tolerance,
    bathroom_match_mode,
    bathroom_tolerance,
    rent_tolerance_percent,
    rent_tolerance_mode,
    move_in_flexibility_days,
    pet_policy_mode,
    income_requirement_mode,
    income_multiplier,
    credit_score_mode,
    min_credit_score,
    background_check_mode,
    use_leniency_factor,
    price_match_perfect_score,
    price_match_close_score,
    move_in_date_bonus,
    commission_threshold_pct,
    commission_base_bonus,
    commission_scale_bonus,
    pumi_bonus,
    leniency_bonus_low,
    leniency_bonus_medium,
    leniency_bonus_high,
    max_properties_to_show,
    min_score_threshold,
    sort_by
) VALUES (
    'Default Configuration',
    true,
    'exact',
    0,
    'exact',
    0,
    20,
    'percentage',
    30,
    'ignore',
    'ignore',
    3.0,
    'ignore',
    600,
    'ignore',
    true,
    25,
    10,
    10,
    4.0,
    80,
    1,
    20,
    0,
    5,
    10,
    10,
    0,
    'score'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 7. VERIFICATION QUERY
-- ============================================

-- Verify the configuration was created
SELECT 
    id,
    name,
    is_active,
    bedroom_match_mode,
    bathroom_match_mode,
    rent_tolerance_percent,
    commission_threshold_pct,
    max_properties_to_show,
    created_at
FROM public.smart_match_config
WHERE is_active = true;

