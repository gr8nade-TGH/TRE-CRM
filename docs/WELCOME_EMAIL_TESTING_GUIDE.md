# 📧 Welcome Email Testing Guide

**Feature:** Automated welcome email sent to new leads when they submit the landing page form  
**Date:** 2025-11-06  
**Status:** ✅ Implemented, Ready for Testing

---

## 🎯 Overview

The welcome email feature automatically sends a personalized welcome email to new leads when they submit the landing page form. The email includes:

- ✅ Personalized greeting with lead's name
- ✅ Agent contact information (name, email, phone)
- ✅ Clickable CTAs (email agent button)
- ✅ Next steps timeline
- ✅ Clean white card design matching Smart Match emails
- ✅ Mobile-responsive layout
- ✅ Duplicate prevention (won't send twice within 24 hours)
- ✅ Activity logging to `lead_activities` table
- ✅ Email logging to `email_logs` table

---

## 🧪 Testing Strategy

### **Method 1: Gmail+ Trick (Recommended)**

Use Gmail's `+` feature to create multiple test email addresses that all go to your inbox:

```
tucker.harris+welcome-test-1@gmail.com
tucker.harris+welcome-test-2@gmail.com
tucker.harris+welcome-test-3@gmail.com
```

**Benefits:**
- All emails go to the same Gmail inbox
- Easy to test multiple scenarios
- Can see how emails render in real Gmail client
- No need for separate test accounts

---

## 📋 Test Scenarios

### **Test 1: New Lead Submission → Welcome Email Sent**

**Steps:**
1. Go to landing page: `https://tre-crm.vercel.app/landing.html`
2. Fill out the form with test data:
   - Name: `Test Lead 1`
   - Phone: `(555) 123-4567`
   - Email: `tucker.harris+welcome-test-1@gmail.com`
   - Complete all preference fields
3. Submit the form
4. Check browser console for logs:
   ```
   ✅ Lead created successfully
   📧 Attempting to send welcome email...
   ✅ Welcome email sent successfully!
   ```

**Expected Results:**
- ✅ Form submission succeeds
- ✅ Success alert shown: "🎉 Thank you! We'll be in touch with you TODAY!"
- ✅ Email appears in Gmail inbox within 1-2 minutes
- ✅ Subject: "Welcome to TRE - Your Texas Real Estate Journey Starts Here! 🏠"
- ✅ Email contains lead's name and agent's contact info
- ✅ "Contact Your Agent" button is clickable and opens email client

**Verification:**
1. Check Gmail inbox for welcome email
2. Check Supabase `lead_activities` table for entry:
   - `activity_type`: `'welcome_email_sent'`
   - `lead_id`: matches the created lead
3. Check Supabase `email_logs` table for entry:
   - `status`: `'sent'`
   - `template_id`: `'welcome_lead'`
   - `recipient_email`: `tucker.harris+welcome-test-1@gmail.com`
4. Check Resend dashboard for delivery confirmation

---

### **Test 2: Email Rendering (Desktop & Mobile)**

**Steps:**
1. Open the welcome email in Gmail (desktop)
2. Check the following:
   - ✅ Header displays correctly (no purple gradient, clean white design)
   - ✅ Lead name is personalized
   - ✅ Agent info card displays correctly
   - ✅ "Contact Your Agent" button is visible and has white text
   - ✅ Next steps section is readable
   - ✅ Footer displays correctly
3. Open the same email on mobile Gmail app
4. Check the same elements on mobile

**Expected Results:**
- ✅ Email renders correctly on desktop
- ✅ Email renders correctly on mobile
- ✅ All text is readable
- ✅ Button text is white on colored background
- ✅ Layout is responsive and doesn't break

---

### **Test 3: Duplicate Prevention**

**Steps:**
1. Submit a lead with email: `tucker.harris+duplicate-test@gmail.com`
2. Wait for welcome email to be sent
3. **Immediately** submit another lead with the **same email address**
4. Check browser console for logs:
   ```
   ⏭️ Welcome email skipped (already sent)
   ```

**Expected Results:**
- ✅ First submission sends welcome email
- ✅ Second submission skips welcome email
- ✅ Console shows "Welcome email already sent within 24 hours - skipping"
- ✅ Only ONE welcome email received in Gmail
- ✅ Lead creation still succeeds (email failure doesn't block lead creation)

---

### **Test 4: Clickable CTAs**

**Steps:**
1. Open the welcome email in Gmail
2. Click the "📧 Contact Your Agent" button
3. Verify it opens your default email client with:
   - To: Agent's email address
   - Subject: (blank or pre-filled)

**Expected Results:**
- ✅ Button is clickable
- ✅ Opens email client (Gmail compose, Outlook, etc.)
- ✅ Agent's email is pre-filled in "To" field

---

### **Test 5: Activity Logging**

**Steps:**
1. Submit a test lead
2. Go to Supabase → Table Editor → `lead_activities`
3. Filter by the lead's ID
4. Look for activity with `activity_type = 'welcome_email_sent'`

**Expected Results:**
- ✅ Activity entry exists
- ✅ `activity_type`: `'welcome_email_sent'`
- ✅ `description`: `'Welcome email sent to [email]'`
- ✅ `metadata` contains:
  - `email_id`: Email log ID
  - `template_id`: `'welcome_lead'`
  - `agent_id`: Agent's ID
  - `agent_name`: Agent's name
  - `sent_at`: Timestamp

---

### **Test 6: Email Logging**

**Steps:**
1. Submit a test lead
2. Go to Supabase → Table Editor → `email_logs`
3. Filter by `template_id = 'welcome_lead'`
4. Find the most recent entry

**Expected Results:**
- ✅ Email log entry exists
- ✅ `status`: `'sent'`
- ✅ `template_id`: `'welcome_lead'`
- ✅ `recipient_email`: Test lead's email
- ✅ `recipient_name`: Test lead's name
- ✅ `metadata` contains:
  - `lead_id`: Lead's ID
  - `agent_id`: Agent's ID
  - `email_type`: `'welcome'`
  - `source`: `'landing_page'`

---

### **Test 7: Resend Dashboard Verification**

**Steps:**
1. Submit a test lead
2. Go to Resend dashboard: https://resend.com/emails
3. Find the most recent email sent
4. Check delivery status

**Expected Results:**
- ✅ Email appears in Resend dashboard
- ✅ Status: "Delivered"
- ✅ Recipient: Test lead's email
- ✅ Subject: "Welcome to TRE - Your Texas Real Estate Journey Starts Here! 🏠"
- ✅ No bounce or error messages

---

### **Test 8: Error Handling (Email Fails)**

**Steps:**
1. Temporarily break the email sending (e.g., invalid Resend API key)
2. Submit a test lead
3. Check browser console for error logs
4. Verify lead creation still succeeds

**Expected Results:**
- ✅ Lead is created successfully
- ✅ Console shows error: "⚠️ Welcome email failed: [error message]"
- ✅ Success alert still shown to user
- ✅ Lead appears in CRM
- ✅ Activity log entry for "lead_created" exists
- ✅ No "welcome_email_sent" activity (since email failed)

---

## 🔍 Debugging Checklist

If welcome email is not being sent, check:

1. **Browser Console:**
   - Look for errors in console after form submission
   - Check for "📧 Attempting to send welcome email..." log
   - Check for success or error messages

2. **Supabase Email Logs:**
   - Go to `email_logs` table
   - Filter by `template_id = 'welcome_lead'`
   - Check `status` field (should be `'sent'`)
   - Check `error_message` field if status is `'failed'`

3. **Resend Dashboard:**
   - Check if email appears in Resend
   - Check delivery status
   - Check for bounce/error messages

4. **Environment Variables:**
   - Verify `RESEND_API_KEY` is set in Vercel
   - Verify `EMAIL_FROM` is set to `noreply@tre-crm.com`
   - Verify domain is verified in Resend

5. **Email Template:**
   - Go to Supabase → `email_templates` table
   - Verify `welcome_lead` template exists
   - Verify `active = true`

---

## 📊 Success Criteria

All tests must pass:

- ✅ Welcome email sent on new lead submission
- ✅ Email renders correctly on desktop and mobile
- ✅ Duplicate prevention works (no second email within 24 hours)
- ✅ All CTAs are clickable
- ✅ Activity logged to `lead_activities`
- ✅ Email logged to `email_logs`
- ✅ Resend dashboard shows delivery success
- ✅ Error handling works (lead creation succeeds even if email fails)

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Update Email Template (if needed):**
   - Run migration: `migrations/051_update_welcome_email_template.sql`
   - Verify template updated in Supabase

2. **Deploy to Production:**
   - Commit changes to GitHub
   - Push to `feature/page-functions` branch
   - Verify Vercel auto-deploys

3. **Monitor Production:**
   - Check Resend dashboard for delivery rates
   - Check Supabase `email_logs` for any failures
   - Monitor user feedback

4. **Optional Enhancements:**
   - Add A/B testing for email subject lines
   - Add email open tracking
   - Add click tracking for CTAs
   - Add follow-up email sequence (Day 3, Day 7, etc.)

---

## 📞 Support

If you encounter issues during testing:

1. Check browser console for errors
2. Check Supabase `email_logs` table for error messages
3. Check Resend dashboard for delivery status
4. Review this testing guide for troubleshooting steps

**Questions?** Contact the development team or refer to:
- `EMAIL_SETUP_GUIDE.md` - Email integration setup
- `docs/RESEND_INTEGRATION_STATUS.md` - Resend integration status
- `src/utils/welcome-email.js` - Welcome email implementation

