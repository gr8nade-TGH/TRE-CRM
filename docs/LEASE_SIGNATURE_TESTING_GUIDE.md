# Lease Signature Workflow - Testing Guide

## Overview
This guide provides comprehensive testing instructions for the complete e-signature workflow using Documenso integration.

## Prerequisites

### Environment Variables (Vercel)
Ensure these are set in Vercel dashboard:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `DOCUMENSO_API_KEY` = `api_rwt8w5uvjer73laz`
- ✅ `DOCUMENSO_WEBHOOK_SECRET` = `bayouW00DZ!2`
- ✅ `RESEND_API_KEY` = `re_FRXB3GYa_3KTfhD6XLf8WPD1KD8zZuQzC`

### Documenso Configuration
- ✅ Webhook URL: `https://tre-crm.vercel.app/api/webhooks/documenso`
- ✅ Webhook ID: `cmjithd7o1mu4ad1wfc2aqhjn`
- ✅ Events: `document.signed`, `document.completed`, `document.declined`

### Database Setup
- ✅ Migration 051: `lease_confirmations` table
- ✅ Migration 052: `lease-documents` storage bucket
- ✅ Migration 053: Recipient tracking fields
- ✅ Additional field: `signed_pdf_storage_path`

---

## Test Scenarios

### 1. Prepare Lease Form

**Steps:**
1. Navigate to Documents page
2. Select a lead with a selected property
3. Verify property has `contact_name` and `contact_email`
4. Click Step 5 "Prepare Lease" dot
5. Modal opens with "Create Lease Confirmation" button
6. Click "Create Lease Confirmation"

**Expected Results:**
- ✅ Redirects to `#/lease-confirmation?leadId={id}`
- ✅ Form loads with auto-populated data:
  - Property name
  - Tenant names from lead
  - Property contact info
  - Locator name
- ✅ All form fields are editable
- ✅ "Save Draft" and "Submit to Property" buttons visible

---

### 2. Save Draft

**Steps:**
1. Fill in required fields (commission, rent, etc.)
2. Click "Save Draft" button

**Expected Results:**
- ✅ Success message appears
- ✅ Data saved to `lease_confirmations` table
- ✅ Status = `draft`
- ✅ "Preview PDF" button appears
- ✅ Form remains editable

---

### 3. Preview PDF

**Steps:**
1. After saving draft, click "📄 Preview PDF" button

**Expected Results:**
- ✅ New tab opens
- ✅ Professional PDF displays with:
  - TRE branding and header
  - All form data populated
  - Proper formatting and layout
  - Print-friendly styling
- ✅ PDF matches physical form exactly
- ✅ No placeholder text ({{...}}) visible

---

### 4. Submit to Property

**Steps:**
1. Review form data
2. Click "Submit to Property" button

**Expected Results:**
- ✅ Success message appears
- ✅ Status changes to `pending_signature`
- ✅ `submitted_at` timestamp recorded
- ✅ Redirects back to Documents page
- ✅ Step 5 shows "Send for Signature" button

---

### 5. Send for Signature

**Steps:**
1. On Documents page, click Step 5 dot
2. Modal shows "Send for Signature" button
3. Click "📧 Send for Signature"
4. Confirmation dialog appears
5. Click "OK" to confirm

**Expected Results:**
- ✅ Loading overlay with spinner appears
- ✅ PDF generated successfully
- ✅ Document uploaded to Documenso
- ✅ Email sent to property contact
- ✅ Database updated:
  - Status = `awaiting_signature`
  - `documenso_document_id` populated
  - `documenso_signing_url` populated
  - `sent_for_signature_at` timestamp
  - `recipient_name` and `recipient_email` stored
- ✅ Activity logged to `lead_activities`
- ✅ Success message shows recipient info
- ✅ Page refreshes automatically

---

### 6. Email Notification

**Steps:**
1. Check property contact's email inbox
2. Open email from "Texas Relocation Experts"

**Expected Results:**
- ✅ Professional HTML email received
- ✅ Subject: "Lease Confirmation Ready for Signature - {Tenant Name}"
- ✅ Email contains:
  - TRE branding
  - Lease details (tenant, property, unit, rent, move-in date)
  - Clear CTA button "Review & Sign Lease Confirmation"
  - Agent contact information
  - Professional footer
- ✅ Email is mobile-responsive
- ✅ All links work correctly

---

### 7. Sign Document (Property Contact)

**Steps:**
1. Click "Review & Sign Lease Confirmation" in email
2. Documenso signing page opens
3. Review document
4. Add signature
5. Submit signature

**Expected Results:**
- ✅ Documenso page loads correctly
- ✅ PDF displays with all data
- ✅ Signature field is clearly marked
- ✅ Signature can be drawn or typed
- ✅ Submit button works
- ✅ Confirmation message appears
- ✅ Confirmation email sent to signer

---

### 8. Webhook Processing

**Steps:**
1. After document is signed, check Vercel function logs
2. Monitor webhook endpoint: `/api/webhooks/documenso`

**Expected Results:**
- ✅ Webhook receives `document.signed` event
- ✅ Signature verified successfully
- ✅ Lease confirmation found by `documenso_document_id`
- ✅ Status updated to `signed`
- ✅ Signed PDF downloaded from Documenso
- ✅ PDF uploaded to Supabase Storage:
  - Bucket: `lease-documents`
  - Path: `{lead_id}/lease_{lead_id}_{timestamp}.pdf`
- ✅ Database updated:
  - `signed_at` timestamp
  - `signed_by_name` and `signed_by_email`
  - `documenso_pdf_url` (Documenso URL)
  - `signed_pdf_url` (Supabase Storage URL)
  - `signed_pdf_storage_path` (file path)
- ✅ Activity logged: `lease_signed`
- ✅ Webhook returns 200 OK

---

### 9. View Signed PDF (Agent)

**Steps:**
1. Return to Documents page
2. Click Step 5 "Prepare Lease" dot
3. Modal shows "Signed" status
4. Click "📄 View Signed PDF" button

**Expected Results:**
- ✅ New tab opens
- ✅ Signed PDF displays from Supabase Storage
- ✅ PDF shows signature
- ✅ All data is correct
- ✅ PDF can be printed
- ✅ If Supabase fails, automatically redirects to Documenso URL

---

### 10. Download Signed PDF

**Steps:**
1. In step modal, click "⬇️ Download PDF" button

**Expected Results:**
- ✅ PDF downloads to computer
- ✅ Filename: `Lease_Confirmation_Signed_{lead_id}.pdf`
- ✅ PDF opens correctly in PDF viewer
- ✅ Signature is visible
- ✅ All data is intact

---

## Error Scenarios

### E1. Missing Property Contact

**Steps:**
1. Select lead with property that has no `contact_email`
2. Try to access Step 5

**Expected Results:**
- ✅ Step 5 shows warning icon
- ✅ Modal displays: "Missing property contact information"
- ✅ Cannot proceed with lease preparation

---

### E2. Send Without Submitting

**Steps:**
1. Save draft (status = `draft`)
2. Try to send for signature

**Expected Results:**
- ✅ Error message: "Please submit the lease confirmation before sending for signature"
- ✅ Status remains `draft`
- ✅ No Documenso document created

---

### E3. Duplicate Send

**Steps:**
1. Send lease for signature successfully
2. Try to send again

**Expected Results:**
- ✅ Error message: "This lease has already been sent to Documenso"
- ✅ No duplicate document created
- ✅ Original document ID preserved

---

### E4. View Unsigned PDF

**Steps:**
1. Try to access `/api/pdf/view-signed-lease?leaseConfirmationId={id}` for unsigned lease

**Expected Results:**
- ✅ Error: "Document not signed"
- ✅ Message: "This lease confirmation has not been signed yet"
- ✅ Current status displayed

---

### E5. Webhook Signature Failure

**Steps:**
1. Send webhook with invalid signature

**Expected Results:**
- ✅ 401 Unauthorized response
- ✅ Error: "Invalid signature"
- ✅ No database changes made

---

### E6. PDF Download Failure

**Steps:**
1. Simulate Supabase Storage failure
2. Try to view signed PDF

**Expected Results:**
- ✅ Automatic fallback to Documenso URL
- ✅ PDF still accessible
- ✅ No error shown to user

---

## Performance Tests

### P1. PDF Generation Speed
- ✅ PDF generates in < 5 seconds
- ✅ Puppeteer launches successfully on Vercel
- ✅ No timeout errors

### P2. Email Delivery
- ✅ Email sent within 10 seconds
- ✅ Email arrives in inbox (not spam)
- ✅ All links work correctly

### P3. Webhook Processing
- ✅ Webhook processes in < 10 seconds
- ✅ PDF download completes successfully
- ✅ Storage upload completes successfully

---

## Data Validation

### Database Checks

**After Saving Draft:**
```sql
SELECT * FROM lease_confirmations WHERE id = '{id}';
-- Verify: status = 'draft', all form data saved
```

**After Sending for Signature:**
```sql
SELECT * FROM lease_confirmations WHERE id = '{id}';
-- Verify: status = 'awaiting_signature', documenso_document_id populated
```

**After Signing:**
```sql
SELECT * FROM lease_confirmations WHERE id = '{id}';
-- Verify: status = 'signed', signed_at populated, both PDF URLs populated
```

**Activity Log:**
```sql
SELECT * FROM lead_activities WHERE lead_id = '{lead_id}' ORDER BY created_at DESC;
-- Verify: lease_sent and lease_signed activities logged
```

**Storage Check:**
```sql
SELECT * FROM storage.objects WHERE bucket_id = 'lease-documents' AND name LIKE '{lead_id}/%';
-- Verify: PDF file exists in storage
```

---

## Troubleshooting

### Issue: PDF Generation Fails
**Check:**
- Vercel function logs for errors
- Template file exists at `src/templates/lease-confirmation-pdf.html`
- All placeholder data is valid
- Puppeteer dependencies installed

### Issue: Email Not Received
**Check:**
- Resend API key is valid
- Property contact email is correct
- Check spam folder
- Verify Resend dashboard for delivery status

### Issue: Webhook Not Triggered
**Check:**
- Webhook URL is correct in Documenso
- Webhook secret matches environment variable
- Vercel function is deployed
- Check Documenso webhook logs

### Issue: PDF Not in Storage
**Check:**
- Supabase Storage bucket exists
- Bucket permissions are correct
- Webhook successfully downloaded PDF
- Check Vercel function logs for upload errors

---

## Success Criteria

✅ **All test scenarios pass**
✅ **No errors in Vercel logs**
✅ **Emails delivered successfully**
✅ **PDFs stored in both locations**
✅ **Webhook processes correctly**
✅ **UI shows correct status at each step**
✅ **Error scenarios handled gracefully**
✅ **Performance meets requirements**

---

## Next Steps After Testing

1. ✅ Document any issues found
2. ✅ Fix critical bugs
3. ✅ Optimize performance if needed
4. ✅ Update user documentation
5. ✅ Train agents on new workflow
6. ✅ Monitor production usage
7. ✅ Gather user feedback
8. ✅ Plan future enhancements

---

**Last Updated:** 2025-11-29
**Version:** 1.0
**Status:** Ready for Testing
