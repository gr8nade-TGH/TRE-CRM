-- Migration 052: Add Email Tracking Columns
-- Purpose: Add open tracking and click tracking to email_logs table
-- - Track when emails are opened (tracking pixel)
-- - Track when CTAs are clicked (tracking URLs)
-- - Enable engagement metrics on Emails dashboard

-- ============================================
-- 1. ADD TRACKING COLUMNS TO EMAIL_LOGS
-- ============================================

-- Open tracking columns
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;

-- Click tracking columns
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS clicks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMPTZ;

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for open tracking queries
CREATE INDEX IF NOT EXISTS idx_email_logs_opened_at 
ON public.email_logs(opened_at) 
WHERE opened_at IS NOT NULL;

-- Index for click tracking queries
CREATE INDEX IF NOT EXISTS idx_email_logs_first_clicked_at 
ON public.email_logs(first_clicked_at) 
WHERE first_clicked_at IS NOT NULL;

-- Index for engagement queries (emails that were opened OR clicked)
CREATE INDEX IF NOT EXISTS idx_email_logs_engagement 
ON public.email_logs(id) 
WHERE opened_at IS NOT NULL OR first_clicked_at IS NOT NULL;

-- ============================================
-- 3. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN public.email_logs.opened_at IS 'Timestamp when email was first opened (via tracking pixel)';
COMMENT ON COLUMN public.email_logs.open_count IS 'Number of times email was opened';
COMMENT ON COLUMN public.email_logs.last_opened_at IS 'Timestamp of most recent email open';
COMMENT ON COLUMN public.email_logs.clicks IS 'JSONB array of click events: [{"link": "cta_button", "clicked_at": "2025-11-06T12:00:00Z"}, ...]';
COMMENT ON COLUMN public.email_logs.click_count IS 'Total number of CTA clicks';
COMMENT ON COLUMN public.email_logs.first_clicked_at IS 'Timestamp when first CTA was clicked';

-- ============================================
-- 4. EXAMPLE QUERIES FOR METRICS
-- ============================================

-- Calculate open rate
-- SELECT 
--     COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / COUNT(*) AS open_rate_percent
-- FROM email_logs
-- WHERE status = 'sent' AND created_at >= NOW() - INTERVAL '30 days';

-- Calculate click rate
-- SELECT 
--     COUNT(*) FILTER (WHERE first_clicked_at IS NOT NULL) * 100.0 / COUNT(*) AS click_rate_percent
-- FROM email_logs
-- WHERE status = 'sent' AND created_at >= NOW() - INTERVAL '30 days';

-- Calculate engagement rate (opened OR clicked)
-- SELECT 
--     COUNT(*) FILTER (WHERE opened_at IS NOT NULL OR first_clicked_at IS NOT NULL) * 100.0 / COUNT(*) AS engagement_rate_percent
-- FROM email_logs
-- WHERE status = 'sent' AND created_at >= NOW() - INTERVAL '30 days';

-- Average time to open
-- SELECT 
--     AVG(EXTRACT(EPOCH FROM (opened_at - created_at)) / 3600) AS avg_hours_to_open
-- FROM email_logs
-- WHERE opened_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days';

