# 📧 Email Sender Address Setup Guide

**Last Updated:** 2025-10-29  
**Domain:** tre-crm.com  
**Email Service:** Resend

---

## 🎯 Overview

This guide explains how to add and configure additional sender email addresses for TRE CRM. By default, the system uses `noreply@tre-crm.com`, but you can add more sender addresses like `support@tre-crm.com`, `team@tre-crm.com`, etc.

---

## 📋 Current Sender Addresses

### **Verified Senders:**
- ✅ `noreply@tre-crm.com` - System notifications and automated emails

### **Available (Not Yet Verified):**
- ⏳ `support@tre-crm.com` - Customer support and help emails
- ⏳ `team@tre-crm.com` - Team communications and updates

---

## 🚀 How to Add a New Sender Address

### **Step 1: Verify Email Address in Resend**

1. **Log in to Resend Dashboard**
   - Go to https://resend.com/login
   - Sign in with your account

2. **Navigate to Domains**
   - Click on "Domains" in the left sidebar
   - Select your domain: `tre-crm.com`

3. **Add Email Address**
   - Resend automatically allows you to send from any email address on a verified domain
   - No additional verification needed for `*@tre-crm.com` addresses!
   - Just make sure the domain `tre-crm.com` is verified (it should be)

4. **Test the Address** (Optional but Recommended)
   - Use Resend's API testing tool to send a test email from the new address
   - Or use the TRE CRM "Test Send" feature after configuration

---

### **Step 2: Add to Email Senders Configuration**

1. **Open the configuration file:**
   ```
   src/config/email-senders.js
   ```

2. **Add your new sender to the `EMAIL_SENDERS` array:**
   ```javascript
   export const EMAIL_SENDERS = [
       {
           email: 'noreply@tre-crm.com',
           name: 'TRE CRM',
           description: 'System notifications and automated emails',
           verified: true
       },
       {
           email: 'support@tre-crm.com',
           name: 'TRE Support',
           description: 'Customer support and help emails',
           verified: true  // ← Change to true after verifying
       },
       {
           email: 'team@tre-crm.com',
           name: 'TRE Team',
           description: 'Team communications and updates',
           verified: true  // ← Change to true after verifying
       },
       // Add your new sender here:
       {
           email: 'agents@tre-crm.com',
           name: 'TRE Agents',
           description: 'Agent-to-lead communications',
           verified: true
       }
   ];
   ```

3. **Save the file**

---

### **Step 3: Update Template Default Senders (Optional)**

If you want specific templates to use specific sender addresses by default:

1. **Run the migration to add the `default_sender` field:**
   ```sql
   -- migrations/039_add_default_sender_to_templates.sql
   -- This should already be run
   ```

2. **Update templates in Supabase:**
   - Go to Supabase → Table Editor → `email_templates`
   - Find the template you want to update
   - Set the `default_sender` field to your desired sender email
   - Example: Set `welcome_lead` template to use `support@tre-crm.com`

3. **Or update via SQL:**
   ```sql
   UPDATE public.email_templates
   SET default_sender = 'support@tre-crm.com'
   WHERE id = 'welcome_lead';
   ```

---

## 🧪 Testing New Sender Addresses

### **Method 1: Use Test Send Feature**

1. Go to the Emails page in TRE CRM (`#/emails`)
2. Find any email template
3. Click "📤 Test Send" button
4. In the modal:
   - Enter your email address as recipient
   - Select the new sender from the "From" dropdown
   - Click "Send Test Email"
5. Check your inbox to verify the email was sent from the correct address

### **Method 2: Use Resend Dashboard**

1. Go to Resend Dashboard → Emails → Send Test Email
2. Fill in:
   - **From:** Your new sender address (e.g., `support@tre-crm.com`)
   - **To:** Your test email
   - **Subject:** Test Email
   - **HTML:** `<p>This is a test</p>`
3. Click "Send"
4. Check your inbox

---

## 📊 Sender Address Best Practices

### **Recommended Sender Addresses:**

| Sender Address | Use Case | Display Name |
|----------------|----------|--------------|
| `noreply@tre-crm.com` | System notifications, automated emails | TRE CRM |
| `support@tre-crm.com` | Customer support, help requests | TRE Support |
| `team@tre-crm.com` | Team updates, internal communications | TRE Team |
| `agents@tre-crm.com` | Agent-to-lead communications | TRE Agents |
| `hello@tre-crm.com` | Welcome emails, onboarding | TRE Team |

### **Naming Conventions:**

- **noreply@** - Use for automated emails where replies are not monitored
- **support@** - Use for emails where you want recipients to reply
- **team@** - Use for general team communications
- **hello@** - Use for friendly, welcoming emails

---

## 🔧 Troubleshooting

### **Email Not Sending from New Address**

1. **Check domain verification:**
   - Go to Resend → Domains → `tre-crm.com`
   - Ensure status is "Verified" (green checkmark)

2. **Check sender configuration:**
   - Open `src/config/email-senders.js`
   - Ensure `verified: true` for your sender

3. **Check email logs:**
   - Go to Supabase → Table Editor → `email_logs`
   - Look for error messages in the `error_message` column
   - Check the `sender_email` column to see what address was used

4. **Check browser console:**
   - Open DevTools → Console
   - Look for errors when sending test email

### **Sender Not Appearing in Dropdown**

1. **Check verified status:**
   - Only senders with `verified: true` appear in the dropdown
   - Update `src/config/email-senders.js`

2. **Clear cache and refresh:**
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache if needed

### **Emails Going to Spam**

1. **Check SPF/DKIM records:**
   - Go to Resend → Domains → `tre-crm.com`
   - Verify all DNS records are properly configured

2. **Use appropriate sender:**
   - Don't use `noreply@` for emails where you want engagement
   - Use `support@` or `team@` for better deliverability

3. **Warm up new senders:**
   - Start with small volumes (10-20 emails/day)
   - Gradually increase over 2-3 weeks

---

## 📝 Summary

✅ **To add a new sender address:**
1. Verify domain in Resend (already done for `tre-crm.com`)
2. Add sender to `src/config/email-senders.js` with `verified: true`
3. Optionally update template defaults in database
4. Test using "Test Send" feature

✅ **Current setup:**
- Domain: `tre-crm.com` (verified)
- Default sender: `noreply@tre-crm.com`
- Additional senders: Configure in `src/config/email-senders.js`

✅ **Features:**
- Per-template default senders
- User-selectable sender in test emails
- Automatic sender tracking in email logs

---

## 🔗 Related Documentation

- [Email Setup Guide](../EMAIL_SETUP_GUIDE.md) - Initial Resend integration setup
- [Resend Documentation](https://resend.com/docs) - Official Resend API docs
- [Email Templates Guide](../migrations/037_create_email_tables.sql) - Database schema

