-- Migration 051: Add Lease Confirmations Table and Storage
-- Purpose: Store lease confirmation forms and track signature status
-- Created: 2025-11-29

-- ============================================================================
-- 1. CREATE LEASE CONFIRMATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS lease_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Form Data - Header Info
    date DATE,
    attn TEXT,
    locator TEXT,
    property_name TEXT,
    locator_contact TEXT,
    property_phone TEXT,
    fax_email TEXT,
    split_agent TEXT,
    split_cut TEXT, -- '50/50' or '75/25'
    
    -- Form Data - Tenant Info
    tenant_names TEXT,
    tenant_phone TEXT,
    move_in_date DATE,
    expected_unit TEXT,
    
    -- Form Data - Property Personnel
    tenants_correct TEXT, -- 'yes' or 'no'
    tenant_corrections TEXT,
    unit_number TEXT,
    rent_amount DECIMAL(10,2),
    rent_with_concessions DECIMAL(10,2),
    commission TEXT, -- '25', '50', '75', '100', 'other', 'flat'
    commission_other_percent DECIMAL(5,2),
    commission_flat_amount DECIMAL(10,2),
    lease_term INTEGER, -- months
    po_number TEXT,
    actual_move_in_date DATE,
    locator_on_app TEXT,
    escorted TEXT, -- 'yes' or 'no'
    
    -- Form Data - Signature
    printed_name TEXT,
    signature_date DATE,
    
    -- Form Data - Accounting (Internal Use)
    invoice_number TEXT,
    pay_status TEXT,
    db_ref_number TEXT,
    
    -- Status Tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'awaiting_signature', 'signed', 'error')),
    
    -- Documenso Integration
    documenso_document_id TEXT,
    documenso_signing_url TEXT,
    documenso_recipient_email TEXT,
    
    -- Document Storage
    signed_pdf_url TEXT, -- Supabase Storage URL
    documenso_pdf_url TEXT, -- Documenso PDF URL (redundancy)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    sent_for_signature_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    signed_by_name TEXT,
    signed_by_email TEXT,
    
    -- Error Tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_lease_confirmations_lead_id ON lease_confirmations(lead_id);
CREATE INDEX idx_lease_confirmations_property_id ON lease_confirmations(property_id);
CREATE INDEX idx_lease_confirmations_status ON lease_confirmations(status);
CREATE INDEX idx_lease_confirmations_created_at ON lease_confirmations(created_at DESC);
CREATE INDEX idx_lease_confirmations_documenso_id ON lease_confirmations(documenso_document_id) WHERE documenso_document_id IS NOT NULL;

-- ============================================================================
-- 3. ADD UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lease_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lease_confirmations_updated_at
    BEFORE UPDATE ON lease_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION update_lease_confirmations_updated_at();

-- ============================================================================
-- 4. ADD RLS POLICIES
-- ============================================================================

ALTER TABLE lease_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all lease confirmations
CREATE POLICY "Allow authenticated users to read lease confirmations"
    ON lease_confirmations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert lease confirmations
CREATE POLICY "Allow authenticated users to insert lease confirmations"
    ON lease_confirmations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update lease confirmations
CREATE POLICY "Allow authenticated users to update lease confirmations"
    ON lease_confirmations
    FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================================
-- 5. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE lease_confirmations IS 'Stores lease confirmation forms and tracks signature status via Documenso';
COMMENT ON COLUMN lease_confirmations.status IS 'draft = saved but not submitted, pending_signature = ready to send, awaiting_signature = sent to property, signed = completed, error = failed';
COMMENT ON COLUMN lease_confirmations.documenso_document_id IS 'Documenso document ID for tracking signature status';
COMMENT ON COLUMN lease_confirmations.signed_pdf_url IS 'Supabase Storage URL for signed PDF (primary storage)';
COMMENT ON COLUMN lease_confirmations.documenso_pdf_url IS 'Documenso PDF URL (redundant backup)';

