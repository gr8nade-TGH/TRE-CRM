-- Migration 039: Add default_sender field to email_templates
-- Purpose: Allow each template to have a pre-configured default sender address

-- ============================================
-- 1. ADD DEFAULT_SENDER COLUMN
-- ============================================

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS default_sender TEXT DEFAULT 'noreply@tre-crm.com';

-- ============================================
-- 2. UPDATE EXISTING TEMPLATES WITH DEFAULTS
-- ============================================

-- Welcome email - use noreply
UPDATE public.email_templates
SET default_sender = 'noreply@tre-crm.com'
WHERE id = 'welcome_lead';

-- Agent assignment - use noreply
UPDATE public.email_templates
SET default_sender = 'noreply@tre-crm.com'
WHERE id = 'agent_assignment';

-- Showcase email - use noreply
UPDATE public.email_templates
SET default_sender = 'noreply@tre-crm.com'
WHERE id = 'showcase_email';

-- ============================================
-- 3. ADD SENDER_EMAIL COLUMN TO EMAIL_LOGS
-- ============================================

-- Track which sender address was used for each email
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN public.email_templates.default_sender IS 'Default sender email address for this template (e.g., noreply@tre-crm.com, support@tre-crm.com)';
COMMENT ON COLUMN public.email_logs.sender_email IS 'Sender email address used for this email';

