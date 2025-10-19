-- ============================================================================
-- TRE CRM - Fix created_by Foreign Key Constraint
-- ============================================================================
-- This migration makes created_by nullable and removes the foreign key constraint
-- because state.agentId contains Supabase Auth UUID, but public.users uses email as PK
-- ============================================================================

-- Drop the foreign key constraint on properties.created_by
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_created_by_fkey;

-- Make created_by nullable
ALTER TABLE public.properties 
ALTER COLUMN created_by DROP NOT NULL;

-- Do the same for property_notes.author_id
ALTER TABLE public.property_notes 
DROP CONSTRAINT IF EXISTS property_notes_author_id_fkey;

ALTER TABLE public.property_notes 
ALTER COLUMN author_id DROP NOT NULL;

-- Add a comment explaining the situation
COMMENT ON COLUMN public.properties.created_by IS 'Supabase Auth user UUID - no FK constraint because public.users uses email as PK';
COMMENT ON COLUMN public.property_notes.author_id IS 'Supabase Auth user UUID - no FK constraint because public.users uses email as PK';

-- ============================================================================
-- DONE!
-- ============================================================================

