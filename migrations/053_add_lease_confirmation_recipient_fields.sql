-- Migration: Add recipient tracking fields to lease_confirmations table
-- Date: 2025-11-29
-- Description: Add fields to track Documenso recipient ID and recipient name for better tracking

-- Add documenso_recipient_id field
ALTER TABLE lease_confirmations 
ADD COLUMN IF NOT EXISTS documenso_recipient_id TEXT;

-- Add recipient_name field (for tracking who the document was sent to)
ALTER TABLE lease_confirmations 
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- Add recipient_email field (for tracking recipient email separately from documenso_recipient_email)
ALTER TABLE lease_confirmations 
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN lease_confirmations.documenso_recipient_id IS 'Documenso recipient ID for tracking signing status';
COMMENT ON COLUMN lease_confirmations.recipient_name IS 'Name of the person who received the document for signing';
COMMENT ON COLUMN lease_confirmations.recipient_email IS 'Email of the person who received the document for signing';

-- Create index for faster lookups by Documenso recipient ID
CREATE INDEX IF NOT EXISTS idx_lease_confirmations_documenso_recipient_id 
ON lease_confirmations(documenso_recipient_id);

