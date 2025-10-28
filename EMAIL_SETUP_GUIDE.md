# 📧 Email Integration Setup Guide

**Date:** 2025-10-28  
**Domain:** tre-crm.com  
**Email Service:** Resend  
**Sender:** noreply@tre-crm.com

---

## 🎯 Overview

This guide walks you through setting up the Resend email integration for TRE CRM.

**What's Been Built:**
- ✅ Database tables for email templates and logs
- ✅ Serverless function for sending emails (`api/send-email.js`)
- ✅ Email API functions in `src/api/supabase-api.js`
- ✅ Email helper functions for welcome and agent assignment emails
- ✅ Environment configuration for API keys
- ✅ Two email templates ready to use

---

## 📋 Setup Steps

### **Step 1: Run Database Migration** 🔴 REQUIRED

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `migrations/037_create_email_tables.sql`
3. Click **Run**
4. ✅ This creates:
   - `email_templates` table with 2 templates (welcome, agent assignment)
   - `email_logs` table for tracking sent emails
   - RLS policies for security
   - Indexes for performance

---

### **Step 2: Configure Domain in Resend** 🔴 REQUIRED

**Wait for DNS to propagate first** (your SSL cert is generating now - usually 15-30 minutes)

Once DNS is ready:

1. **Go to Resend Dashboard** → https://resend.com/domains
2. **Click "Add Domain"**
3. **Enter:** `tre-crm.com`
4. **Add DNS Records** - Resend will provide DNS records like:
   ```
   Type: TXT
   Name: @
   Value: resend-verification=xxxxx
   
   Type: MX
   Name: @
   Value: feedback-smtp.us-east-1.amazonses.com
   Priority: 10
   
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; ...
   ```

5. **Add these DNS records in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Click on `tre-crm.com` → DNS Records
   - Add each record Resend provides

6. **Wait for verification** (usually 5-15 minutes)
7. ✅ Once verified, you can send from `noreply@tre-crm.com`!

---

### **Step 3: Update Environment Variables** 🔴 REQUIRED

**Local Development (.env file):**

The `.env` file has been created with your Resend API key. You need to add your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend Email API
RESEND_API_KEY=re_FRXB3GYa_3KTfhD6XLf8WPD1KD8zZuQzC

# Email Configuration
EMAIL_FROM=noreply@tre-crm.com
EMAIL_FROM_NAME=TRE CRM
```

**Vercel Production:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `SUPABASE_URL` = Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
   - `RESEND_API_KEY` = `re_FRXB3GYa_3KTfhD6XLf8WPD1KD8zZuQzC`
   - `EMAIL_FROM` = `noreply@tre-crm.com`
   - `EMAIL_FROM_NAME` = `TRE CRM`

3. **Redeploy** your app after adding environment variables

---

### **Step 4: Test Email Sending** 🧪

Once domain is verified and environment variables are set:

**Option 1: Test via Browser Console**

Open your TRE CRM app and run in console:

```javascript
// Test welcome email
await api.sendEmail({
    templateId: 'welcome_lead',
    recipientEmail: 'your-email@example.com',
    recipientName: 'Test User',
    variables: {
        leadName: 'John Doe',
        agentName: 'Jane Smith',
        agentEmail: 'jane@tre-crm.com',
        agentPhone: '(555) 123-4567'
    },
    metadata: {
        test: true
    }
});
```

**Option 2: Test via Creating a Lead**

Once integrated (Step 5), just create a new lead in the CRM and it will automatically send emails!

---

## 🔌 Integration Points

### **Where to Add Email Sending**

**1. When Creating a New Lead** (Recommended)

File: `src/modules/leads/leads-actions.js` → `saveLead()` function

After successfully creating the lead, add:

```javascript
// Send welcome email to lead and assignment email to agent
if (lead.email && lead.assigned_agent_id) {
    try {
        const agent = await api.getUser(lead.assigned_agent_id);
        await sendLeadCreatedEmails({
            lead: lead,
            agent: agent,
            api: api,
            sentBy: window.currentUser?.id
        });
        console.log('✅ Welcome and assignment emails sent');
    } catch (error) {
        console.error('❌ Error sending emails:', error);
        // Don't fail the lead creation if email fails
    }
}
```

**2. When Assigning/Reassigning a Lead**

File: `src/modules/leads/leads-actions.js` → `assignLead()` or similar

After assigning the lead, send agent assignment email:

```javascript
// Send assignment email to new agent
try {
    const agent = await api.getUser(newAgentId);
    await sendAgentAssignmentEmail({
        lead: lead,
        agent: agent,
        api: api,
        sentBy: window.currentUser?.id
    });
    console.log('✅ Assignment email sent to agent');
} catch (error) {
    console.error('❌ Error sending assignment email:', error);
}
```

---

## 📧 Email Templates

### **Template 1: Welcome Email** (`welcome_lead`)

**Sent to:** New leads  
**When:** Lead is created  
**Variables:**
- `leadName` - Lead's name
- `agentName` - Assigned agent's name
- `agentEmail` - Agent's email
- `agentPhone` - Agent's phone

**Preview:** Beautiful gradient header, agent info card, next steps list

---

### **Template 2: Agent Assignment** (`agent_assignment`)

**Sent to:** Agents  
**When:** Lead is assigned to them  
**Variables:**
- `agentName` - Agent's name
- `leadName` - Lead's name
- `leadEmail` - Lead's email
- `leadPhone` - Lead's phone
- `moveInDate` - Formatted move-in date
- `budget` - Formatted budget
- `notes` - Lead notes
- `crmUrl` - Link to CRM

**Preview:** Professional lead card with all details, CTA button to view in CRM

---

## 📊 Monitoring Emails

### **View Email Logs in Supabase**

1. Go to Supabase Dashboard → Table Editor → `email_logs`
2. See all sent emails with status, timestamps, recipients
3. Filter by status: `pending`, `sent`, `delivered`, `failed`, `bounced`

### **View Email Logs in Code**

```javascript
// Get all email logs
const logs = await api.getEmailLogs({ page: 1, pageSize: 50 });

// Get failed emails
const failed = await api.getEmailLogs({ status: 'failed' });

// Get emails to specific recipient
const userEmails = await api.getEmailLogs({ recipientEmail: 'user@example.com' });
```

---

## 🎨 Customizing Email Templates

### **Option 1: Update in Database** (Recommended)

1. Go to Supabase → Table Editor → `email_templates`
2. Find the template (e.g., `welcome_lead`)
3. Edit the `html_content` or `subject` fields
4. Changes take effect immediately!

### **Option 2: Create New Templates**

```sql
INSERT INTO public.email_templates (id, name, subject, html_content, text_content, description, variables, category, active)
VALUES (
    'document_reminder',
    'Document Upload Reminder',
    'Action Required: Upload Your Documents',
    '<html>Your HTML here with {{variables}}</html>',
    'Plain text version',
    'Reminder email for pending documents',
    '["leadName", "documentType", "dueDate"]'::jsonb,
    'document',
    true
);
```

---

## 🚨 Troubleshooting

### **Email Not Sending**

1. **Check domain verification** - Go to Resend → Domains → Verify status
2. **Check environment variables** - Make sure `RESEND_API_KEY` is set
3. **Check email logs** - Look in `email_logs` table for error messages
4. **Check console** - Look for errors in browser console or Vercel logs

### **Domain Not Verifying**

1. **Wait longer** - DNS can take up to 48 hours (usually 15 minutes)
2. **Check DNS records** - Use https://dnschecker.org to verify records are propagated
3. **Check Vercel DNS** - Make sure records are added correctly in Vercel

### **Emails Going to Spam**

1. **Add SPF/DKIM records** - Resend provides these, make sure they're added
2. **Add DMARC record** - Resend provides this too
3. **Warm up domain** - Send gradually increasing volumes over first week
4. **Avoid spam words** - Don't use "FREE", "URGENT", excessive caps

---

## 📈 Next Steps

Once welcome and agent assignment emails are working:

**Priority 2 Emails:**
- 📄 Document upload reminder
- 🏠 Property showcase/recommendations
- ✅ Lease confirmation
- 📊 Weekly lead summary for managers

**Advanced Features:**
- Email scheduling (send later)
- Email templates editor UI in CRM
- Email analytics dashboard
- Unsubscribe management
- Email preferences per lead

---

## 🎉 You're Ready!

Once you complete Steps 1-3:
1. ✅ Run migration
2. ✅ Verify domain in Resend
3. ✅ Set environment variables

You'll be able to send beautiful, professional emails from your TRE CRM! 🚀

**Questions?** Check the code comments or Resend documentation: https://resend.com/docs

