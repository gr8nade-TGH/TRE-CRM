# Migration 051: Lease Confirmations Table

## Purpose
Creates the `lease_confirmations` table to store lease confirmation forms and track e-signature status via Documenso integration.

## What This Migration Does

### 1. Creates `lease_confirmations` Table
- Stores all lease confirmation form data
- Tracks signature workflow status
- Links to leads and properties
- Stores Documenso integration data
- Tracks document storage URLs (Supabase + Documenso)

### 2. Status Flow
```
draft → pending_signature → awaiting_signature → signed
                                ↓
                             error (if fails)
```

- **draft**: Form saved but not submitted
- **pending_signature**: Form submitted, ready to send for signature
- **awaiting_signature**: Sent to property contact via Documenso
- **signed**: Property contact has signed the document
- **error**: Failed to send or process

### 3. Indexes Created
- `lead_id` - Fast lookup by lead
- `property_id` - Fast lookup by property
- `status` - Filter by status
- `created_at` - Sort by date
- `documenso_document_id` - Track Documenso documents

### 4. Storage Strategy
- **Primary**: Supabase Storage bucket (`signed_pdf_url`)
- **Backup**: Documenso storage (`documenso_pdf_url`)
- Redundancy ensures documents are never lost

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk
2. Click: **SQL Editor** → **New Query**
3. Copy the contents of `051_add_lease_confirmations.sql`
4. Paste into the editor
5. Click: **Run** (or press Ctrl+Enter)
6. Verify: Should see "Success. No rows returned"

### Option 2: Supabase CLI
```bash
supabase db push
```

## Verification

After running, verify the table exists:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'lease_confirmations';

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lease_confirmations'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'lease_confirmations';
```

## Next Steps

After this migration:
1. Create Supabase Storage bucket for signed PDFs (if not exists)
2. Set up Documenso API credentials
3. Create webhook endpoint for signature completion
4. Update Documents page to show "Prepare Lease" step
5. Implement auto-population from lead data

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS lease_confirmations CASCADE;
DROP FUNCTION IF EXISTS update_lease_confirmations_updated_at() CASCADE;
```

