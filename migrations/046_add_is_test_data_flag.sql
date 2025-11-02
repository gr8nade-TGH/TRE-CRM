-- ============================================
-- Migration 046: Add is_test_data Flag for Easy Cleanup
-- ============================================
-- Adds is_test_data boolean flag to properties, floor_plans, and units tables
-- This allows us to easily identify and delete test data when real feeds go live

-- Add is_test_data flag to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Add is_test_data flag to floor_plans table
ALTER TABLE public.floor_plans 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Add is_test_data flag to units table
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Create indexes for faster test data queries
CREATE INDEX IF NOT EXISTS idx_properties_is_test_data ON public.properties(is_test_data);
CREATE INDEX IF NOT EXISTS idx_floor_plans_is_test_data ON public.floor_plans(is_test_data);
CREATE INDEX IF NOT EXISTS idx_units_is_test_data ON public.units(is_test_data);

-- Add comments
COMMENT ON COLUMN public.properties.is_test_data IS 'True if this is test/seed data that should be deleted before production';
COMMENT ON COLUMN public.floor_plans.is_test_data IS 'True if this is test/seed data that should be deleted before production';
COMMENT ON COLUMN public.units.is_test_data IS 'True if this is test/seed data that should be deleted before production';

