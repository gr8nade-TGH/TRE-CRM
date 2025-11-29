# Lease Confirmation E-Signature Implementation Plan

## ✅ Phase 1: Database & Storage (COMPLETE)

### What's Done:
- ✅ Created `lease_confirmations` table with all form fields
- ✅ Added status tracking: `draft` → `pending_signature` → `awaiting_signature` → `signed`
- ✅ Created protected `lease-documents` storage bucket (10MB limit, PDF only)
- ✅ Added Documenso integration fields (document_id, signing_url, recipient_email)
- ✅ Dual storage strategy: Supabase (primary) + Documenso (backup)
- ✅ RLS policies for authenticated access
- ✅ Indexes on lead_id, property_id, status, created_at
- ✅ Auto-update trigger for updated_at timestamp

---

## 📋 Phase 2: Documents Page Integration (NEXT)

### Goal:
Add "Prepare Lease" step to Documents page progress bar with property contact validation

### Tasks:

#### 2.1 Add "Prepare Lease" Step to Progress Bar
**File:** `src/modules/documents/index.js` or wherever progress steps are defined

**New Step:**
```javascript
{
  id: 'prepare_lease',
  label: 'Prepare Lease',
  icon: '📄',
  order: 6, // After "Application Submitted", before "Move-In Complete"
  requiresPropertyContact: true // NEW FLAG
}
```

#### 2.2 Property Contact Validation
**Logic:**
1. Check if lead has `property_id` assigned
2. Query `properties` table for property contact info
3. If missing `contact_name` OR `contact_email`:
   - Show ⚠️ warning flag on "Prepare Lease" step
   - Display tooltip: "Property contact info required"
   - Click step → Show modal: "Please add property contact info to proceed"
   - Button: "Update Property Contact" → Opens property edit modal

**Required Property Fields:**
- `contact_name` (or similar field)
- `contact_email` (or similar field)
- `contact_phone` (optional but recommended)

**Action Items:**
- [ ] Check if properties table has contact fields
- [ ] If not, add migration to add contact fields
- [ ] Update property edit modal to include contact fields
- [ ] Add validation logic to Documents page

#### 2.3 Click Handler for "Prepare Lease" Step
**When clicked:**
1. Validate property contact exists
2. If missing → Show warning modal
3. If exists → Check for existing lease confirmation draft
4. If draft exists → Load draft data
5. If no draft → Create new draft with auto-populated fields
6. Navigate to `#/lease-confirmation?leadId={leadId}`

---

## 📋 Phase 3: Auto-Population from Lead Data

### Goal:
Pre-fill Lease Confirmation form with data from lead and property records

### Auto-Population Mapping:

| Form Field | Data Source | Table.Column |
|------------|-------------|--------------|
| `date` | Today's date | `new Date()` |
| `locator` | Current user | `auth.users.full_name` |
| `locatorContact` | Current user | `auth.users.email` or `phone` |
| `propertyName` | Property | `properties.name` |
| `propertyPhone` | Property | `properties.contact_phone` |
| `faxEmail` | Property | `properties.contact_email` |
| `tenantNames` | Lead | `leads.name` |
| `tenantPhone` | Lead | `leads.phone` |
| `moveInDate` | Lead | `leads.move_in_date` (if exists) |
| `attn` | Property Contact | `properties.contact_name` |

**Implementation:**
```javascript
async function loadLeaseConfirmationData(leadId) {
  // Fetch lead data
  const lead = await SupabaseAPI.getLeadById(leadId);
  
  // Fetch property data
  const property = await SupabaseAPI.getPropertyById(lead.property_id);
  
  // Fetch current user
  const user = await SupabaseAPI.getCurrentUser();
  
  // Check for existing draft
  const existingDraft = await SupabaseAPI.getLeaseConfirmationByLeadId(leadId);
  
  if (existingDraft && existingDraft.status === 'draft') {
    // Load draft data
    return existingDraft;
  }
  
  // Auto-populate new form
  return {
    lead_id: leadId,
    property_id: lead.property_id,
    date: new Date().toISOString().split('T')[0],
    locator: user.full_name,
    locator_contact: user.email,
    property_name: property.name,
    property_phone: property.contact_phone,
    fax_email: property.contact_email,
    tenant_names: lead.name,
    tenant_phone: lead.phone,
    move_in_date: lead.move_in_date,
    attn: property.contact_name,
    status: 'draft'
  };
}
```

---

## 📋 Phase 4: Save Draft & Submit Functionality

### Goal:
Allow agents to save progress and submit for signature

### 4.1 Save Draft
**Button:** "Save Draft"
**Action:**
1. Collect all form data
2. Validate required fields (minimal validation for draft)
3. Save to `lease_confirmations` table with `status = 'draft'`
4. Show toast: "Draft saved successfully"
5. Stay on form (don't navigate away)

### 4.2 Submit for Review
**Button:** "Save & Send for Signature"
**Action:**
1. Collect all form data
2. Validate ALL required fields
3. Save to `lease_confirmations` table with `status = 'pending_signature'`
4. Update `submitted_at` timestamp
5. Show confirmation modal with property contact info
6. Navigate to Documents page
7. Show "Send for Signature" button on Documents page

---

## 📋 Phase 5: Documenso Integration

### Goal:
Send lease confirmation to property contact for e-signature

### 5.1 Documenso Setup
**Required:**
- [ ] Documenso API key (from Documenso dashboard)
- [ ] Documenso webhook URL (for signature completion)
- [ ] Store API key in environment variables

### 5.2 "Send for Signature" Button
**Location:** Documents page, next to "Prepare Lease" step
**Visibility:** Only show when `status = 'pending_signature'`

**Click Handler:**
1. Fetch lease confirmation data
2. Generate PDF from form data (using jsPDF or similar)
3. Upload PDF to Documenso via API
4. Create signing request with property contact email
5. Receive signing URL from Documenso
6. Update lease confirmation:
   - `status = 'awaiting_signature'`
   - `documenso_document_id = {id}`
   - `documenso_signing_url = {url}`
   - `documenso_recipient_email = {property.contact_email}`
   - `sent_for_signature_at = NOW()`
7. Send email to property contact with signing link
8. Show toast: "Lease sent to {property.contact_name} for signature"

### 5.3 Documenso Webhook
**Endpoint:** `/api/webhooks/documenso`
**Events:** `document.signed`, `document.declined`

**On `document.signed`:**
1. Verify webhook signature
2. Extract document_id from payload
3. Find lease confirmation by `documenso_document_id`
4. Download signed PDF from Documenso
5. Upload to Supabase Storage (`lease-documents` bucket)
6. Update lease confirmation:
   - `status = 'signed'`
   - `signed_pdf_url = {supabase_url}`
   - `documenso_pdf_url = {documenso_url}`
   - `signed_at = NOW()`
   - `signed_by_name = {signer_name}`
   - `signed_by_email = {signer_email}`
7. Update Documents page progress bar (show ✅ green checkmark)

---

## 📋 Phase 6: View Signed Documents

### Goal:
Allow agents to view and download signed lease confirmations

### 6.1 Documents Page Display
**When `status = 'signed'`:**
- Show ✅ green checkmark on "Prepare Lease" step
- Show "View Signed Lease" button
- Click → Download PDF from Supabase Storage

### 6.2 Lease Confirmation Page
**When viewing existing signed lease:**
- Show all form fields as readonly
- Display signature information
- Show "Download Signed PDF" button
- Show signature date and signer info

---

## 🔧 Technical Requirements

### API Functions Needed:
```javascript
// In src/api/supabase-api.js
export async function getLeaseConfirmationByLeadId(leadId)
export async function saveLeaseConfirmation(data)
export async function updateLeaseConfirmationStatus(id, status, metadata)
export async function uploadSignedPDF(file, leaseId)
export async function getSignedPDFUrl(leaseId)
```

### Documenso API Functions:
```javascript
// In src/api/documenso-api.js (NEW FILE)
export async function createDocument(pdfBuffer, recipientEmail, recipientName)
export async function getDocumentStatus(documentId)
export async function downloadSignedDocument(documentId)
```

---

## 📊 Status Flow Diagram

```
┌─────────┐
│  Draft  │ ← Agent saves progress
└────┬────┘
     │ Agent clicks "Save & Send for Signature"
     ▼
┌──────────────────┐
│ Pending Signature│ ← Ready to send, waiting for agent to click "Send"
└────┬─────────────┘
     │ Agent clicks "Send for Signature" on Documents page
     ▼
┌────────────────────┐
│ Awaiting Signature │ ← Sent to property contact via Documenso
└────┬───────────────┘
     │ Property contact signs document
     ▼
┌────────┐
│ Signed │ ← Webhook updates status, PDF stored
└────────┘
```

---

## ⚠️ Error Handling

### Scenarios:
1. **Property contact missing** → Show warning, prevent sending
2. **Documenso API failure** → Set `status = 'error'`, log error, show retry button
3. **Webhook failure** → Implement retry logic, manual status check
4. **PDF generation failure** → Log error, show user-friendly message
5. **Storage upload failure** → Retry 3 times, fallback to Documenso-only storage

---

## 🎯 Next Immediate Steps:

1. **Check properties table schema** - Verify contact fields exist
2. **Add "Prepare Lease" step to Documents page** - Update progress bar
3. **Implement property contact validation** - Flag missing contacts
4. **Update LeaseConfirmationPage** - Add auto-population logic
5. **Create Supabase API functions** - CRUD for lease_confirmations
6. **Test the workflow** - End-to-end without Documenso first
7. **Integrate Documenso** - API setup and webhook
8. **Test e-signature flow** - Full workflow with real signatures

---

**Ready to proceed with Phase 2: Documents Page Integration?**

