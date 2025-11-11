-- Migration 056: Create email_alerts table for tracking failed/skipped agent notification emails
-- This table tracks when agent notification emails fail to send or are skipped due to missing data

-- ============================================
-- 1. CREATE EMAIL_ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Alert Classification
    alert_type VARCHAR NOT NULL, 
    -- Types: 'missing_agent_email', 'email_send_failed', 'no_assigned_agent', 'api_error'
    severity VARCHAR NOT NULL, -- 'warning', 'error'
    
    -- Related Entities
    lead_id VARCHAR REFERENCES public.leads(id) ON DELETE CASCADE,
    agent_id VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Email Details
    email_type VARCHAR NOT NULL, 
    -- Types: 'agent_lead_assignment', 'agent_lead_response', 'agent_more_options_request', 
    --        'agent_health_status_changed', 'agent_inactivity_alert'
    message TEXT NOT NULL, -- Human-readable error message
    metadata JSONB, -- Additional context (error details, email variables, etc.)
    
    -- Resolution Tracking
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Index for fetching unresolved alerts (most common query)
CREATE INDEX idx_email_alerts_unresolved ON public.email_alerts(resolved, created_at DESC);

-- Index for filtering by lead
CREATE INDEX idx_email_alerts_lead ON public.email_alerts(lead_id);

-- Index for filtering by agent
CREATE INDEX idx_email_alerts_agent ON public.email_alerts(agent_id);

-- Index for filtering by alert type
CREATE INDEX idx_email_alerts_type ON public.email_alerts(alert_type);

-- Index for filtering by email type
CREATE INDEX idx_email_alerts_email_type ON public.email_alerts(email_type);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.email_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all email alerts
CREATE POLICY "Authenticated users can view email alerts"
ON public.email_alerts FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert email alerts
CREATE POLICY "Authenticated users can insert email alerts"
ON public.email_alerts FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update email alerts (for resolution)
CREATE POLICY "Authenticated users can update email alerts"
ON public.email_alerts FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.email_alerts TO authenticated;

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON TABLE public.email_alerts IS 'Tracks failed or skipped agent notification emails for monitoring and resolution';
COMMENT ON COLUMN public.email_alerts.alert_type IS 'Type of alert: missing_agent_email, email_send_failed, no_assigned_agent, api_error';
COMMENT ON COLUMN public.email_alerts.severity IS 'Severity level: warning or error';
COMMENT ON COLUMN public.email_alerts.email_type IS 'Type of email that failed: agent_lead_assignment, agent_lead_response, etc.';
COMMENT ON COLUMN public.email_alerts.metadata IS 'JSONB field containing error details, email variables, and other context';
COMMENT ON COLUMN public.email_alerts.resolved IS 'Whether the alert has been resolved/acknowledged';

