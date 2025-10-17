-- ============================================================================
-- TRE CRM - Create Missing Tables
-- ============================================================================
-- This script creates the missing tables needed for the CRM application
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. LEAD_NOTES TABLE
-- ============================================================================
-- For internal notes on leads

CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    author_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_notes_author_id ON public.lead_notes(author_id);

-- Enable Row Level Security
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_notes
CREATE POLICY "Users can view notes for their assigned leads" ON public.lead_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = lead_notes.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('MANAGER', 'SUPER_USER')
                 ))
        )
    );

CREATE POLICY "Users can insert notes for their assigned leads" ON public.lead_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = lead_notes.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('MANAGER', 'SUPER_USER')
                 ))
        )
    );

CREATE POLICY "Users can update their own notes" ON public.lead_notes
    FOR UPDATE USING (author_id = auth.uid()::text);

CREATE POLICY "Managers can update any notes" ON public.lead_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.lead_notes TO authenticated;

-- ============================================================================
-- 2. SPECIALS TABLE
-- ============================================================================
-- For promotional specials and offers

CREATE TABLE IF NOT EXISTS public.specials (
    id VARCHAR PRIMARY KEY,
    property_id VARCHAR REFERENCES public.properties(id) ON DELETE CASCADE,
    property_name VARCHAR NOT NULL,
    market VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_specials_property_id ON public.specials(property_id);
CREATE INDEX IF NOT EXISTS idx_specials_market ON public.specials(market);
CREATE INDEX IF NOT EXISTS idx_specials_active ON public.specials(active);
CREATE INDEX IF NOT EXISTS idx_specials_valid_until ON public.specials(valid_until);

-- Enable Row Level Security
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for specials (public read, authenticated write)
CREATE POLICY "Anyone can view active specials" ON public.specials
    FOR SELECT USING (active = true);

CREATE POLICY "Managers can view all specials" ON public.specials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

CREATE POLICY "Managers can insert specials" ON public.specials
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

CREATE POLICY "Managers can update specials" ON public.specials
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

CREATE POLICY "Managers can delete specials" ON public.specials
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('MANAGER', 'SUPER_USER')
        )
    );

-- Grant permissions
GRANT SELECT ON public.specials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specials TO authenticated;

-- ============================================================================
-- 3. DOCUMENTS TABLE
-- ============================================================================
-- For document tracking and management

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id VARCHAR REFERENCES public.leads(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL, -- 'application', 'lease', 'id', 'paystub', etc.
    status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'received', 'approved', 'rejected'
    url VARCHAR,
    notes TEXT,
    uploaded_by VARCHAR REFERENCES public.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view documents for their assigned leads" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = documents.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('MANAGER', 'SUPER_USER')
                 ))
        )
    );

CREATE POLICY "Users can insert documents for their assigned leads" ON public.documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = documents.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('MANAGER', 'SUPER_USER')
                 ))
        )
    );

CREATE POLICY "Users can update documents for their assigned leads" ON public.documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = documents.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('MANAGER', 'SUPER_USER')
                 ))
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.documents TO authenticated;

-- ============================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for all tables
CREATE TRIGGER update_lead_notes_updated_at 
    BEFORE UPDATE ON public.lead_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specials_updated_at 
    BEFORE UPDATE ON public.specials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENABLE REALTIME (OPTIONAL)
-- ============================================================================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.specials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- ============================================================================
-- DONE!
-- ============================================================================

