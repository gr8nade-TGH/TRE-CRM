-- Migration 016: Remove foreign key constraints on assigned_agent_id and found_by_agent_id
-- These foreign key constraints are causing RLS policy violations for anonymous users
-- We'll keep the columns but remove the constraints to allow landing page submissions

-- First, find the constraint names
-- Run this to see the constraint names:
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'leads' AND constraint_type = 'FOREIGN KEY';

-- Drop the foreign key constraints
-- Note: The constraint names might be auto-generated, so we need to find them first
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Loop through all foreign key constraints on leads table for agent columns
    FOR constraint_record IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'leads' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND (kcu.column_name = 'assigned_agent_id' OR kcu.column_name = 'found_by_agent_id')
    LOOP
        EXECUTE 'ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- The columns will remain, but without foreign key constraints
-- This allows anonymous users to insert leads without RLS blocking the foreign key check

