-- Remove foreign key constraint from lead_notes.author_id
-- This allows any email/string to be used as author_id without requiring it to exist in users table
-- Run this in Supabase SQL Editor

-- Drop the foreign key constraint
ALTER TABLE public.lead_notes 
DROP CONSTRAINT IF EXISTS lead_notes_author_id_fkey;

-- The author_id column will remain as VARCHAR, but without the foreign key constraint
-- This matches how we want to use it - storing email addresses that may not be in users table

