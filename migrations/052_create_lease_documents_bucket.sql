-- Migration 052: Create Lease Documents Storage Bucket
-- Purpose: Create protected storage bucket for signed lease confirmation PDFs
-- Created: 2025-11-29

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lease-documents',
    'lease-documents',
    false, -- Private bucket, requires authentication
    10485760, -- 10MB max file size
    ARRAY['application/pdf']::text[] -- Only allow PDFs
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE STORAGE POLICIES
-- ============================================================================

-- Allow authenticated users to upload lease documents
CREATE POLICY "Allow authenticated users to upload lease documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'lease-documents');

-- Allow authenticated users to read lease documents
CREATE POLICY "Allow authenticated users to read lease documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'lease-documents');

-- Allow authenticated users to update lease documents (for versioning)
CREATE POLICY "Allow authenticated users to update lease documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'lease-documents');

-- Allow authenticated users to delete lease documents (admin only in practice)
CREATE POLICY "Allow authenticated users to delete lease documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'lease-documents');

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify bucket was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'lease-documents') THEN
        RAISE NOTICE '✅ Storage bucket "lease-documents" created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create storage bucket "lease-documents"';
    END IF;
END $$;

