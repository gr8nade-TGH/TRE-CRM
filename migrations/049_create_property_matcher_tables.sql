-- ============================================
-- Migration 049: Create Property Matcher (Smart Match Sessions) Tables
-- ============================================
-- Purpose: Enable personalized "My Matches" page for leads to select properties and schedule tours
-- 
-- Features:
-- - Unique token-based URLs (e.g., tre-crm.com/matches/PM-JD123)
-- - Track which properties were sent to each lead
-- - Record lead responses (interested properties, tour requests)
-- - Support "send more options" workflow (excludes previously sent properties)
-- - 30-day token expiration
-- - Activity logging integration
-- ============================================

-- ============================================
-- 1. CREATE SMART_MATCH_SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.smart_match_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Lead and Token Info
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL UNIQUE, -- e.g., "PM-JD123" (Property Matcher - Initials + Lead ID)
    
    -- Properties Sent
    properties_sent JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of property IDs sent in this session
    -- Example: ["prop_123", "prop_456", "prop_789"]
    
    -- Email Info
    email_log_id UUID REFERENCES public.email_logs(id), -- Link to email_logs table
    sent_by VARCHAR REFERENCES public.users(id), -- Agent who sent the email
    
    -- Tracking
    viewed_at TIMESTAMPTZ, -- When lead first opened the link
    submitted_at TIMESTAMPTZ, -- When lead submitted their selections
    response_type VARCHAR, -- 'tour_request', 'more_options', 'no_response'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Token expires after 30 days
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb -- Additional context (user agent, IP, etc.)
);

-- ============================================
-- 2. CREATE SMART_MATCH_RESPONSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.smart_match_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session and Lead Info
    session_id UUID NOT NULL REFERENCES public.smart_match_sessions(id) ON DELETE CASCADE,
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Property Selection
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id VARCHAR, -- Specific unit they're interested in (optional, can be NULL for property-level interest)
    is_interested BOOLEAN DEFAULT true, -- Whether they selected this property
    
    -- Tour Request
    preferred_tour_date TIMESTAMPTZ, -- When they want to tour (if specified)
    tour_notes TEXT, -- Any notes about the tour request
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb -- Additional context (ranking, comments, etc.)
);

-- ============================================
-- 3. UPDATE LEADS TABLE
-- ============================================

-- Add columns to track Smart Match email history and "send more options" workflow
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_smart_match_sent_at TIMESTAMPTZ, -- When last Smart Match email was sent
ADD COLUMN IF NOT EXISTS wants_more_options BOOLEAN DEFAULT false, -- Flag for "send more options" request
ADD COLUMN IF NOT EXISTS properties_already_sent JSONB DEFAULT '[]'::jsonb; -- Array of property IDs to exclude from future sends

-- Add comments
COMMENT ON COLUMN public.leads.last_smart_match_sent_at IS 'Timestamp of last Smart Match email sent to this lead';
COMMENT ON COLUMN public.leads.wants_more_options IS 'True if lead clicked "Send Me More Options" button';
COMMENT ON COLUMN public.leads.properties_already_sent IS 'Array of property IDs already sent to this lead (to avoid duplicates)';

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

-- Smart Match Sessions indexes
CREATE INDEX IF NOT EXISTS idx_smart_match_sessions_lead_id ON public.smart_match_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_smart_match_sessions_token ON public.smart_match_sessions(token);
CREATE INDEX IF NOT EXISTS idx_smart_match_sessions_created_at ON public.smart_match_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_match_sessions_expires_at ON public.smart_match_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_smart_match_sessions_email_log_id ON public.smart_match_sessions(email_log_id);

-- Smart Match Responses indexes
CREATE INDEX IF NOT EXISTS idx_smart_match_responses_session_id ON public.smart_match_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_smart_match_responses_lead_id ON public.smart_match_responses(lead_id);
CREATE INDEX IF NOT EXISTS idx_smart_match_responses_property_id ON public.smart_match_responses(property_id);
CREATE INDEX IF NOT EXISTS idx_smart_match_responses_created_at ON public.smart_match_responses(created_at DESC);

-- Leads table indexes for new columns
CREATE INDEX IF NOT EXISTS idx_leads_last_smart_match_sent_at ON public.leads(last_smart_match_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_wants_more_options ON public.leads(wants_more_options) WHERE wants_more_options = true;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.smart_match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_match_responses ENABLE ROW LEVEL SECURITY;

-- Smart Match Sessions Policies
-- Allow anonymous users to read sessions by token (for public "My Matches" page)
CREATE POLICY "Anyone can read sessions by valid token" ON public.smart_match_sessions
FOR SELECT
USING (
    expires_at > NOW() -- Only allow access to non-expired sessions
);

-- Allow authenticated users to read all sessions
CREATE POLICY "Authenticated users can read all sessions" ON public.smart_match_sessions
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- Allow authenticated users to insert sessions (when sending emails)
CREATE POLICY "Authenticated users can insert sessions" ON public.smart_match_sessions
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Allow authenticated users to update sessions (for tracking views/submissions)
CREATE POLICY "Authenticated users can update sessions" ON public.smart_match_sessions
FOR UPDATE
USING (
    auth.uid() IS NOT NULL
);

-- Smart Match Responses Policies
-- Allow anonymous users to insert responses (for public "My Matches" page submissions)
CREATE POLICY "Anyone can insert responses for valid sessions" ON public.smart_match_responses
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.smart_match_sessions
        WHERE id = session_id
        AND expires_at > NOW()
    )
);

-- Allow authenticated users to read all responses
CREATE POLICY "Authenticated users can read all responses" ON public.smart_match_responses
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant table permissions to anon (for public "My Matches" page)
GRANT SELECT ON public.smart_match_sessions TO anon;
GRANT INSERT ON public.smart_match_responses TO anon;

-- Grant table permissions to authenticated users
GRANT ALL ON public.smart_match_sessions TO authenticated;
GRANT ALL ON public.smart_match_responses TO authenticated;

-- ============================================
-- 7. ADD TABLE COMMENTS
-- ============================================

COMMENT ON TABLE public.smart_match_sessions IS 'Tracks Smart Match email sessions with unique tokens for personalized "My Matches" pages';
COMMENT ON TABLE public.smart_match_responses IS 'Records lead responses from "My Matches" page (property selections, tour requests)';

COMMENT ON COLUMN public.smart_match_sessions.token IS 'Unique token for accessing "My Matches" page (e.g., PM-JD123)';
COMMENT ON COLUMN public.smart_match_sessions.properties_sent IS 'Array of property IDs sent in this email session';
COMMENT ON COLUMN public.smart_match_sessions.viewed_at IS 'Timestamp when lead first opened the "My Matches" link';
COMMENT ON COLUMN public.smart_match_sessions.submitted_at IS 'Timestamp when lead submitted their property selections';
COMMENT ON COLUMN public.smart_match_sessions.response_type IS 'Type of response: tour_request, more_options, or no_response';

COMMENT ON COLUMN public.smart_match_responses.is_interested IS 'Whether lead selected this property as interesting';
COMMENT ON COLUMN public.smart_match_responses.preferred_tour_date IS 'When lead wants to tour this property';
COMMENT ON COLUMN public.smart_match_responses.tour_notes IS 'Additional notes about tour request';

-- ============================================
-- 8. CREATE HELPER FUNCTION FOR TOKEN GENERATION
-- ============================================

-- Function to generate unique Property Matcher token
-- Format: PM-{initials}{leadId} (e.g., PM-JD123)
CREATE OR REPLACE FUNCTION generate_property_matcher_token(
    p_lead_id VARCHAR,
    p_lead_name VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_initials VARCHAR;
    v_token VARCHAR;
    v_counter INTEGER := 0;
BEGIN
    -- Extract initials from lead name (first letter of each word)
    SELECT string_agg(substring(word FROM 1 FOR 1), '')
    INTO v_initials
    FROM regexp_split_to_table(UPPER(p_lead_name), '\s+') AS word;
    
    -- If no initials found, use 'XX'
    IF v_initials IS NULL OR v_initials = '' THEN
        v_initials := 'XX';
    END IF;
    
    -- Generate token: PM-{initials}{leadId}
    -- Extract numeric part from lead_id (e.g., 'lead_1730674416000' -> '1730674416000')
    v_token := 'PM-' || v_initials || regexp_replace(p_lead_id, '[^0-9]', '', 'g');
    
    -- Check if token already exists, if so, append counter
    WHILE EXISTS (SELECT 1 FROM public.smart_match_sessions WHERE token = v_token) LOOP
        v_counter := v_counter + 1;
        v_token := 'PM-' || v_initials || regexp_replace(p_lead_id, '[^0-9]', '', 'g') || '-' || v_counter;
    END LOOP;
    
    RETURN v_token;
END;
$$;

COMMENT ON FUNCTION generate_property_matcher_token IS 'Generates unique Property Matcher token from lead ID and name (e.g., PM-JD123)';

-- ============================================
-- 9. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 049 completed successfully!';
    RAISE NOTICE '📋 Created tables: smart_match_sessions, smart_match_responses';
    RAISE NOTICE '📝 Updated leads table with Smart Match tracking columns';
    RAISE NOTICE '🔒 RLS policies configured for public access to "My Matches" page';
    RAISE NOTICE '🔑 Token generation function created: generate_property_matcher_token()';
END $$;

