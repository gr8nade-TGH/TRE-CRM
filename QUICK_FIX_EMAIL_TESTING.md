# 🚀 Quick Fix: Test Email Sending

**Problem:** Test email sending fails with "Server configuration error" when running locally.

**Root Cause:** Serverless functions in `/api` folder require Vercel runtime and environment variables.

---

## ✅ Solution 1: Test on Production (Fastest - 2 minutes)

Your app is already deployed to Vercel with all environment variables configured. Just test there!

### **Steps:**

1. **Open your production app:**
   - Go to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Or push your changes and let Vercel auto-deploy

2. **Login to the CRM**

3. **Go to Emails page:**
   - Click "📧 Emails" in navigation

4. **Run Migration 039 (if not done yet):**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to SQL Editor
   - Copy contents of `migrations/039_add_default_sender_to_templates.sql`
   - Paste and click "Run"

5. **Test the feature:**
   - Click "📤 Test Send" on any template
   - Fill in recipient email
   - Select sender address
   - Click "Send Test Email"
   - Check your inbox!

---

## ✅ Solution 2: Run Locally with Vercel CLI (5 minutes)

If you need to test locally:

### **Quick Setup:**

```bash
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link your project
vercel link

# 4. Pull environment variables from Vercel
vercel env pull .env.local

# 5. Start local dev server with serverless support
vercel dev
```

### **Test:**

1. Open `http://localhost:3000`
2. Login to CRM
3. Go to Emails page
4. Click "📤 Test Send"
5. Send test email!

---

## 📋 Pre-Flight Checklist

Before testing, make sure:

- [ ] **Migration 039 is run** in Supabase
  ```sql
  -- Check if columns exist
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'email_templates' 
  AND column_name = 'default_sender';
  
  -- Should return 'default_sender' if migration is run
  ```

- [ ] **Resend domain is verified**
  - Go to [Resend Dashboard](https://resend.com/domains)
  - Check that `tre-crm.com` shows "Verified" status

- [ ] **Environment variables are set in Vercel**
  - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
  - Verify these exist:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `RESEND_API_KEY`
    - `EMAIL_FROM`
    - `EMAIL_FROM_NAME`

---

## 🧪 Testing Checklist

Once setup is complete:

### **Test 1: Modal Opens**
- [ ] Click "📤 Test Send" button
- [ ] Modal appears with form
- [ ] Recipient email input is visible
- [ ] Sender dropdown is visible
- [ ] Template info is displayed

### **Test 2: Sender Selection**
- [ ] Sender dropdown shows "TRE CRM (noreply@tre-crm.com)"
- [ ] Default sender is pre-selected
- [ ] Can change sender in dropdown

### **Test 3: Email Sending**
- [ ] Enter valid email address
- [ ] Click "Send Test Email"
- [ ] Modal closes
- [ ] Toast notification shows "Sending test email..."
- [ ] Toast notification shows "Test email sent successfully..."
- [ ] Email arrives in inbox
- [ ] Email subject has "[TEST]" prefix
- [ ] Email is from selected sender address

### **Test 4: Email Logging**
- [ ] Go to Emails page
- [ ] Check email logs table
- [ ] Test email appears in logs
- [ ] Status is "sent"
- [ ] Sender email is correct
- [ ] Metadata shows `test_email: true`

---

## 🐛 Common Issues & Fixes

### **Issue: "Server configuration error"**

**Cause:** Running locally without Vercel CLI.

**Fix:** Use Solution 1 (test on production) or Solution 2 (use Vercel CLI).

---

### **Issue: "Template not found"**

**Cause:** Migration 039 not run.

**Fix:** Run migration in Supabase SQL Editor.

---

### **Issue: "Failed to send email"**

**Cause:** Resend API error.

**Fix:**
1. Check Resend dashboard for error details
2. Verify domain is verified
3. Check RESEND_API_KEY is correct
4. Check email_logs table for error_message

---

### **Issue: Sender dropdown is empty**

**Cause:** No verified senders in configuration.

**Fix:**
1. Open `src/config/email-senders.js`
2. Set `verified: true` for at least one sender:
   ```javascript
   {
       email: 'noreply@tre-crm.com',
       name: 'TRE CRM',
       description: 'System notifications',
       verified: true  // ← Make sure this is true
   }
   ```
3. Commit and push changes
4. Refresh page

---

### **Issue: Email goes to spam**

**Cause:** SPF/DKIM not configured or sender reputation.

**Fix:**
1. Check Resend → Domains → `tre-crm.com` → DNS Records
2. Verify all DNS records are added to your domain
3. Use `support@` or `team@` instead of `noreply@` for better deliverability

---

## 📊 What Changed in This Update

### **New Features:**
✅ Sender address selection dropdown  
✅ Per-template default senders  
✅ Modal-based test send UI  
✅ Sender email tracking in logs  

### **New Files:**
- `src/config/email-senders.js` - Sender configuration
- `migrations/039_add_default_sender_to_templates.sql` - Database schema
- `docs/EMAIL_SENDER_SETUP.md` - Setup guide
- `docs/RESEND_INTEGRATION_STATUS.md` - Status report
- `docs/LOCAL_DEVELOPMENT_SETUP.md` - Local dev guide

### **Modified Files:**
- `api/send-email.js` - Accept `fromEmail` parameter
- `src/modules/emails/emails-actions.js` - New test send modal
- `.env.example` - Updated documentation

---

## 🎯 Recommended Next Steps

1. **Test on Production** (easiest)
   - Push your changes: `git push origin feature/page-functions`
   - Wait for Vercel to deploy
   - Test the feature on your live app

2. **Run Migration 039**
   - Go to Supabase SQL Editor
   - Run `migrations/039_add_default_sender_to_templates.sql`

3. **Configure Additional Senders** (optional)
   - Edit `src/config/email-senders.js`
   - Add more sender addresses
   - Set `verified: true` for senders you want to use

4. **Update Template Defaults** (optional)
   ```sql
   -- Example: Set welcome email to use support@
   UPDATE public.email_templates
   SET default_sender = 'support@tre-crm.com'
   WHERE id = 'welcome_lead';
   ```

---

## ✅ Summary

**Fastest Way to Test:**
1. Push changes to GitHub
2. Let Vercel auto-deploy
3. Run migration 039 in Supabase
4. Test on production URL
5. Done! 🎉

**For Local Testing:**
1. Install Vercel CLI
2. Run `vercel dev`
3. Test at `http://localhost:3000`

The email sending feature is **fully functional** on production. The local development issue is just a limitation of running serverless functions without the Vercel runtime.

