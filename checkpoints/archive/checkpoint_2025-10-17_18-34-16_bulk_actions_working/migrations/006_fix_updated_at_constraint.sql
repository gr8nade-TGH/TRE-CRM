-- ============================================================================
-- TRE CRM - Fix updated_at Column Constraint
-- ============================================================================
-- This script makes updated_at nullable and adds a default value
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Make updated_at nullable and add default value
ALTER TABLE public.properties 
ALTER COLUMN updated_at DROP NOT NULL,
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Also fix created_at to have default if it doesn't
ALTER TABLE public.properties 
ALTER COLUMN created_at SET DEFAULT NOW();

-- Fix pricing_last_updated, escort_pct, send_pct if they exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.properties ALTER COLUMN pricing_last_updated DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.properties ALTER COLUMN escort_pct DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.properties ALTER COLUMN send_pct DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================

