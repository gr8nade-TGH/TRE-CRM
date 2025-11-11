# 🎯 Pre-Integration Checklist: Resend (Email) & Documenso (E-Signing)

**Date:** October 28, 2025  
**Current Commit:** 4a6c210  
**Branch:** feature/page-functions

---

## 📋 Executive Summary

Before integrating **Resend** (email service) and **Documenso** (e-signing), we need to complete several critical tasks to ensure a smooth integration and avoid technical debt.

### **Priority Levels:**
- 🔴 **CRITICAL** - Must be done before integration
- 🟡 **HIGH** - Should be done before integration
- 🟢 **MEDIUM** - Can be done during/after integration
- 🔵 **LOW** - Nice to have, not blocking

---

## 🔴 CRITICAL TASKS (Must Complete First)

### **1. Move Bug Tracker from Mock Data to Supabase** 🔴
**Status:** ❌ Not Started  
**Location:** `src/api/api-wrapper.js` lines 215-239  
**Issue:** Bug tracker still uses mock data instead of real database

**Current State:**
```javascript
// Note: Bugs table exists but no Supabase API methods yet
// Keeping mock data implementation for now (will be fixed later)
async getBugs({ status, priority, page, pageSize } = {}) {
    console.log('Using mock data for bugs, count:', mockBugs.length);
    let filteredBugs = [...mockBugs];
    // ... mock implementation
}
```

**What Needs to Be Done:**
1. ✅ Verify `bugs` table exists in Supabase (already exists)
2. ❌ Create Supabase API functions in `src/api/supabase-api.js`:
   - `getBugs({ status, priority, page, pageSize })`
   - `createBug(bugData)`
   - `updateBug(bugId, updates)`
   - `deleteBug(bugId)`
3. ❌ Update `src/api/api-wrapper.js` to use real API instead of mock
4. ❌ Test bug submission, viewing, editing, deleting
5. ❌ Migrate existing mock bugs to database (if needed)

**Why Critical:**
- Bug tracker is actively being used (you just tested it!)
- Mock data will be lost on page refresh
- Need reliable bug tracking before adding more complexity

**Estimated Time:** 2-3 hours

---

### **2. Create Email Templates Database Table** 🔴
**Status:** ❌ Not Started  
**Issue:** Email templates are hardcoded in JavaScript files

**Current State:**
Email templates scattered across:
- `src/utils/showcase-builder.js` (showcase emails)
- `src/utils/step-modal-content.js` (welcome email placeholder)
- `src/modules/documents/lease-confirmation-modal.js` (lease confirmation)
- Hardcoded HTML in multiple files

**What Needs to Be Done:**
1. ❌ Create migration `036_email_templates.sql`:
   ```sql
   CREATE TABLE email_templates (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       template_key TEXT UNIQUE NOT NULL,
       template_name TEXT NOT NULL,
       subject TEXT NOT NULL,
       html_content TEXT NOT NULL,
       text_content TEXT,
       variables JSONB, -- List of available variables
       category TEXT, -- 'lead', 'showcase', 'document', 'system'
       is_active BOOLEAN DEFAULT true,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. ❌ Create RLS policies for email_templates
3. ❌ Seed initial templates:
   - Welcome email (lead joined)
   - Showcase email (property recommendations)
   - Lease confirmation email
   - Lead response reminder
   - Document signing reminder
4. ❌ Create Supabase API functions:
   - `getEmailTemplate(templateKey)`
   - `getAllEmailTemplates()`
   - `updateEmailTemplate(id, updates)`
5. ❌ Create admin UI for managing email templates

**Why Critical:**
- Resend integration needs templates to send emails
- Templates should be editable without code changes
- Need version control and A/B testing capability

**Estimated Time:** 4-5 hours

---

### **3. Create Email Logs Database Table** 🔴
**Status:** ❌ Not Started  
**Issue:** No tracking of sent emails

**What Needs to Be Done:**
1. ❌ Create migration `037_email_logs.sql`:
   ```sql
   CREATE TABLE email_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       template_key TEXT,
       recipient_email TEXT NOT NULL,
       recipient_name TEXT,
       subject TEXT NOT NULL,
       status TEXT NOT NULL, -- 'queued', 'sent', 'delivered', 'bounced', 'failed'
       resend_id TEXT, -- Resend email ID for tracking
       lead_id UUID REFERENCES leads(id),
       sent_by UUID, -- User who triggered the email
       sent_at TIMESTAMPTZ,
       delivered_at TIMESTAMPTZ,
       opened_at TIMESTAMPTZ,
       clicked_at TIMESTAMPTZ,
       error_message TEXT,
       metadata JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. ❌ Create indexes for performance
3. ❌ Create RLS policies
4. ❌ Create Supabase API functions:
   - `logEmail(emailData)`
   - `updateEmailStatus(emailId, status)`
   - `getEmailLogs({ leadId, status, dateRange })`
5. ❌ Create admin UI to view email logs

**Why Critical:**
- Need to track email delivery for compliance
- Debug email issues
- Monitor email engagement (opens, clicks)
- Prevent duplicate emails

**Estimated Time:** 3-4 hours

---

### **4. Create Documents/Contracts Database Table** 🔴
**Status:** ❌ Not Started  
**Issue:** No database storage for documents/contracts

**What Needs to Be Done:**
1. ❌ Create migration `038_documents_contracts.sql`:
   ```sql
   CREATE TABLE documents (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       document_type TEXT NOT NULL, -- 'lease', 'contract', 'agreement', 'form'
       document_name TEXT NOT NULL,
       lead_id UUID REFERENCES leads(id),
       property_id UUID REFERENCES properties(id),
       status TEXT NOT NULL, -- 'draft', 'sent', 'viewed', 'signed', 'completed', 'voided'
       documenso_id TEXT, -- Documenso document ID
       documenso_url TEXT, -- Signing URL
       pdf_url TEXT, -- Signed PDF URL
       sent_at TIMESTAMPTZ,
       viewed_at TIMESTAMPTZ,
       signed_at TIMESTAMPTZ,
       completed_at TIMESTAMPTZ,
       voided_at TIMESTAMPTZ,
       metadata JSONB, -- Form data, signers, etc.
       created_by UUID,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. ❌ Create RLS policies
3. ❌ Create Supabase API functions:
   - `createDocument(documentData)`
   - `updateDocumentStatus(documentId, status)`
   - `getDocuments({ leadId, propertyId, status })`
   - `getDocument(documentId)`
4. ❌ Update lease confirmation flow to save to database

**Why Critical:**
- Documenso integration needs document tracking
- Legal compliance requires document audit trail
- Need to track signing status

**Estimated Time:** 3-4 hours

---

## 🟡 HIGH PRIORITY TASKS (Should Complete Before Integration)

### **5. Create Serverless Function for Email Sending** 🟡
**Status:** ❌ Not Started  
**Location:** Need to create `api/send-email.js`

**What Needs to Be Done:**
1. ❌ Create `api/send-email.js` serverless function:
   - Accept email data (template_key, recipient, variables)
   - Fetch template from database
   - Replace variables in template
   - Send via Resend API
   - Log to email_logs table
   - Return success/error
2. ❌ Add Resend API key to Vercel environment variables
3. ❌ Test email sending in development
4. ❌ Add rate limiting to prevent abuse
5. ❌ Add email validation

**Why High Priority:**
- Keeps Resend API key secure (server-side only)
- Centralizes email sending logic
- Easier to add features (attachments, scheduling, etc.)

**Estimated Time:** 2-3 hours

---

### **6. Create Serverless Function for Document Signing** 🟡
**Status:** ❌ Not Started  
**Location:** Need to create `api/create-signing-request.js`

**What Needs to Be Done:**
1. ❌ Create `api/create-signing-request.js`:
   - Accept document data (lead_id, document_type, form_data)
   - Generate PDF from form data
   - Create Documenso signing request
   - Save document to database
   - Send signing email via Resend
   - Return signing URL
2. ❌ Create `api/documenso-webhook.js`:
   - Handle Documenso webhooks (viewed, signed, completed)
   - Update document status in database
   - Create lead activities
   - Send notifications
3. ❌ Add Documenso API key to environment variables
4. ❌ Test document creation and signing flow

**Why High Priority:**
- Keeps API keys secure
- Centralizes document logic
- Handles webhooks properly

**Estimated Time:** 4-5 hours

---

### **7. Update Lead Activities for Email/Document Events** 🟡
**Status:** ⚠️ Partially Complete  
**Issue:** Activities exist but need email/document-specific types

**What Needs to Be Done:**
1. ❌ Add new activity types to database enum (if using enum):
   - `email_sent`
   - `email_opened`
   - `email_clicked`
   - `document_sent`
   - `document_viewed`
   - `document_signed`
   - `document_completed`
2. ❌ Update `src/api/supabase-api.js` to handle new activity types
3. ❌ Update activity rendering to show email/document icons
4. ❌ Add activity metadata for email/document details

**Why High Priority:**
- Need complete audit trail
- Activities drive lead health scoring
- Important for compliance

**Estimated Time:** 2 hours

---

### **8. Create Email Preferences System** 🟡
**Status:** ⚠️ Partially Complete  
**Location:** `src/modules/profile/profile-actions.js` has basic structure

**Current State:**
```javascript
// Basic email notification toggle exists
notification_preferences: {
    email_notifications: emailNotifications
}
```

**What Needs to Be Done:**
1. ❌ Expand email preferences:
   - Email frequency (immediate, daily digest, weekly)
   - Email types (showcases, documents, reminders, marketing)
   - Unsubscribe options
2. ❌ Create migration to add preferences to users table
3. ❌ Update profile UI with detailed preferences
4. ❌ Respect preferences in email sending logic
5. ❌ Add unsubscribe link to all emails
6. ❌ Create unsubscribe landing page

**Why High Priority:**
- Legal requirement (CAN-SPAM Act)
- Better user experience
- Reduce spam complaints

**Estimated Time:** 3-4 hours

---

## 🟢 MEDIUM PRIORITY TASKS (Can Do During Integration)

### **9. Migrate Showcase Email to Use Templates** 🟢
**Status:** ❌ Not Started  
**Location:** `src/utils/showcase-builder.js`

**What Needs to Be Done:**
1. ❌ Move hardcoded email HTML to database template
2. ❌ Update showcase sending to use template system
3. ❌ Add variable replacement (lead name, properties, etc.)
4. ❌ Test showcase email rendering

**Estimated Time:** 1-2 hours

---

### **10. Create Email Preview System** 🟢
**Status:** ⚠️ Partially Complete  
**Location:** `index.html` has email preview modal (lines 853-887)

**What Needs to Be Done:**
1. ❌ Connect preview modal to template system
2. ❌ Add real-time variable replacement
3. ❌ Add "Send Test Email" button
4. ❌ Show email in both HTML and text versions

**Estimated Time:** 2 hours

---

### **11. Add PDF Generation for Lease Confirmation** 🟢
**Status:** ❌ Not Started  
**Location:** `src/modules/documents/lease-confirmation-preview.js`

**What Needs to Be Done:**
1. ❌ Choose PDF library (jsPDF, pdfmake, or server-side)
2. ❌ Create PDF template matching preview HTML
3. ❌ Add "Download PDF" button
4. ❌ Store PDF in Supabase Storage
5. ❌ Attach PDF to Documenso signing request

**Estimated Time:** 3-4 hours

---

### **12. Create Admin Email Management Page** 🟢
**Status:** ❌ Not Started

**What Needs to Be Done:**
1. ❌ Add "Email Templates" section to Admin page
2. ❌ List all templates with edit/preview buttons
3. ❌ Add template editor with variable picker
4. ❌ Add "Email Logs" section to view sent emails
5. ❌ Add filters (date range, status, recipient)
6. ❌ Add email statistics dashboard

**Estimated Time:** 4-5 hours

---

## 🔵 LOW PRIORITY TASKS (Nice to Have)

### **13. Add Email Scheduling** 🔵
**Status:** ❌ Not Started

**What Needs to Be Done:**
1. ❌ Add `scheduled_for` column to email_logs
2. ❌ Create cron job to send scheduled emails
3. ❌ Add UI to schedule emails

**Estimated Time:** 2-3 hours

---

### **14. Add Email A/B Testing** 🔵
**Status:** ❌ Not Started

**What Needs to Be Done:**
1. ❌ Create email_template_variants table
2. ❌ Add A/B test tracking
3. ❌ Add winner selection logic

**Estimated Time:** 4-5 hours

---

### **15. Add Document Templates** 🔵
**Status:** ❌ Not Started

**What Needs to Be Done:**
1. ❌ Create document_templates table
2. ❌ Add template editor
3. ❌ Support multiple document types

**Estimated Time:** 5-6 hours

---

## 📊 Summary & Recommendations

### **Total Estimated Time:**
- 🔴 **Critical Tasks:** 12-16 hours
- 🟡 **High Priority:** 11-14 hours
- 🟢 **Medium Priority:** 10-13 hours
- 🔵 **Low Priority:** 11-14 hours

**TOTAL:** 44-57 hours (approximately 1-1.5 weeks of focused work)

### **Recommended Approach:**

#### **Phase 1: Foundation (Week 1)**
1. Complete all 🔴 CRITICAL tasks (12-16 hours)
2. Complete tasks #5, #6, #7 from 🟡 HIGH PRIORITY (8-10 hours)

**After Phase 1, you'll have:**
- ✅ Bug tracker on real database
- ✅ Email templates system
- ✅ Email logging system
- ✅ Documents database
- ✅ Serverless functions for email/documents
- ✅ Updated activity tracking

#### **Phase 2: Integration (Week 2)**
1. Complete task #8 (Email Preferences) - 3-4 hours
2. Integrate Resend API - 2-3 hours
3. Integrate Documenso API - 3-4 hours
4. Complete 🟢 MEDIUM PRIORITY tasks - 10-13 hours

**After Phase 2, you'll have:**
- ✅ Fully functional email system
- ✅ Fully functional e-signing system
- ✅ Email preferences and compliance
- ✅ PDF generation

#### **Phase 3: Polish (Optional)**
1. Complete 🔵 LOW PRIORITY tasks as needed

---

## 🎯 Next Immediate Steps

1. **Push current changes to remote:**
   ```bash
   git push origin feature/page-functions
   ```

2. **Start with Bug Tracker Migration:**
   - Create Supabase API functions for bugs
   - Test thoroughly
   - Remove mock data

3. **Create Email Templates Table:**
   - Write migration
   - Seed initial templates
   - Create API functions

4. **Create Email Logs Table:**
   - Write migration
   - Create API functions
   - Add admin UI

---

**Questions to Consider:**
1. Do you want to tackle these tasks yourself, or should we work through them together?
2. Should we create a new branch for this pre-integration work?
3. Any specific email templates you want to prioritize?
4. Any specific document types beyond lease confirmation?


