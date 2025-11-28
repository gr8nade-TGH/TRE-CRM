-- ============================================
-- Migration 050: Add Property Policy Fields
-- ============================================
-- Description: Add policy-related fields to properties table for tracking
--              acceptance criteria (broken lease, eviction, criminal background, etc.)

-- Add policy fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS accepts_broken_lease_under_1 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_broken_lease_1_year BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_broken_lease_2_year BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_broken_lease_3_plus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_eviction_under_1 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_eviction_1_year BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_eviction_2_year BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_eviction_3_plus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_misdemeanor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_felony BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_bad_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS same_day_move_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS passport_only_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visa_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_section_8 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_up_to_3_pets BOOLEAN DEFAULT false;

-- Create indexes for commonly queried policy fields
CREATE INDEX IF NOT EXISTS idx_properties_accepts_section_8 ON public.properties(accepts_section_8);
CREATE INDEX IF NOT EXISTS idx_properties_accepts_bad_credit ON public.properties(accepts_bad_credit);
CREATE INDEX IF NOT EXISTS idx_properties_accepts_up_to_3_pets ON public.properties(accepts_up_to_3_pets);

-- Add comment to document the purpose
COMMENT ON COLUMN public.properties.accepts_broken_lease_under_1 IS 'Property accepts applicants with broken lease less than 1 year old';
COMMENT ON COLUMN public.properties.accepts_broken_lease_1_year IS 'Property accepts applicants with broken lease 1 year old';
COMMENT ON COLUMN public.properties.accepts_broken_lease_2_year IS 'Property accepts applicants with broken lease 2 years old';
COMMENT ON COLUMN public.properties.accepts_broken_lease_3_plus IS 'Property accepts applicants with broken lease 3+ years old';
COMMENT ON COLUMN public.properties.accepts_eviction_under_1 IS 'Property accepts applicants with eviction less than 1 year old';
COMMENT ON COLUMN public.properties.accepts_eviction_1_year IS 'Property accepts applicants with eviction 1 year old';
COMMENT ON COLUMN public.properties.accepts_eviction_2_year IS 'Property accepts applicants with eviction 2 years old';
COMMENT ON COLUMN public.properties.accepts_eviction_3_plus IS 'Property accepts applicants with eviction 3+ years old';
COMMENT ON COLUMN public.properties.accepts_misdemeanor IS 'Property accepts applicants with misdemeanor criminal record';
COMMENT ON COLUMN public.properties.accepts_felony IS 'Property accepts applicants with felony criminal record';
COMMENT ON COLUMN public.properties.accepts_bad_credit IS 'Property accepts applicants with bad credit';
COMMENT ON COLUMN public.properties.same_day_move_in IS 'Property offers same-day move-in';
COMMENT ON COLUMN public.properties.passport_only_accepted IS 'Property accepts passport as only form of ID';
COMMENT ON COLUMN public.properties.visa_required IS 'Property requires visa for international applicants';
COMMENT ON COLUMN public.properties.accepts_section_8 IS 'Property accepts Section 8 housing vouchers';
COMMENT ON COLUMN public.properties.accepts_up_to_3_pets IS 'Property accepts up to 3 pets';

