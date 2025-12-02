-- Migration 066: Add html_content column to email_logs table
-- Purpose: Store the actual rendered HTML content of sent emails for preview

-- Add html_content column
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS html_content TEXT;

-- Add comment
COMMENT ON COLUMN public.email_logs.html_content IS 'The rendered HTML content of the email after variable substitution';

