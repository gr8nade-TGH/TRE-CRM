# 📧 Email Tracking Implementation Guide

## Overview

This guide covers the complete implementation of email open tracking and click tracking for the TRE CRM email system.

---

## 🎯 Features Implemented

### 1. **Email Open Tracking**
- Tracking pixel (1x1 transparent GIF) embedded in all emails
- Logs when email is first opened (`opened_at`)
- Counts total opens (`open_count`)
- Tracks most recent open (`last_opened_at`)

### 2. **Email Click Tracking**
- All CTAs wrapped with tracking URLs
- Logs each click event with timestamp
- Counts total clicks (`click_count`)
- Tracks first click (`first_clicked_at`)
- Stores detailed click history in JSONB array

### 3. **Enhanced Email Dashboard**
- **Open Rate** - Percentage of sent emails that were opened
- **Click Rate** - Percentage of sent emails where a CTA was clicked
- **Engagement Rate** - Percentage of emails that were opened OR clicked
- **Avg Time to Open** - Average hours between send and first open

### 4. **Enhanced Email Logs Table**
- New "Engagement" column showing:
  - 📧 icon with open count (green)
  - 🔗 icon with click count (blue)
  - Hover tooltips with details

---

## 📁 Files Created/Modified

### **New Files:**
1. `migrations/052_add_email_tracking_columns.sql` - Database schema changes
2. `migrations/053_add_tracking_to_welcome_email.sql` - Updated welcome email template
3. `api/track-email-open.js` - Tracking pixel endpoint
4. `api/track-email-click.js` - Click tracking endpoint

### **Modified Files:**
1. `api/send-email.js` - Generate tracking URLs before sending
2. `src/modules/emails/emails-rendering.js` - Display engagement metrics
3. `index.html` - Added "Engagement" column to email logs table

---

## 🗄️ Database Schema Changes

### **New Columns in `email_logs` Table:**

```sql
-- Open tracking
opened_at TIMESTAMPTZ           -- When email was first opened
open_count INTEGER DEFAULT 0    -- Number of times opened
last_opened_at TIMESTAMPTZ      -- Most recent open

-- Click tracking
clicks JSONB DEFAULT '[]'       -- Array of click events
click_count INTEGER DEFAULT 0   -- Total number of clicks
first_clicked_at TIMESTAMPTZ    -- When first CTA was clicked
```

### **Example Click Event:**
```json
{
  "link": "cta_button",
  "clicked_at": "2025-11-06T12:34:56Z"
}
```

---

## 🔧 How It Works

### **Email Sending Flow:**

1. **Create Email Log Entry** (get ID for tracking)
2. **Generate Tracking URLs:**
   - Tracking pixel: `/api/track-email-open?id={email_log_id}`
   - Click tracking: `/api/track-email-click?id={email_log_id}&link={link_name}&url={target_url}`
3. **Replace Template Variables** (including tracking URLs)
4. **Send Email via Resend**
5. **Update Email Log** (status = 'sent')

### **Tracking Pixel:**
```html
<img src="https://tre-crm.vercel.app/api/track-email-open?id=abc-123" 
     width="1" height="1" style="display:none;" alt="" />
```

### **Tracking URL:**
```html
<a href="https://tre-crm.vercel.app/api/track-email-click?id=abc-123&link=cta_button&url=mailto%3Aagent%40example.com">
  Contact Your Agent
</a>
```

---

## 📊 Metrics Calculations

### **Open Rate:**
```javascript
openRate = (emails_with_opened_at / total_sent_emails) * 100
```

### **Click Rate:**
```javascript
clickRate = (emails_with_first_clicked_at / total_sent_emails) * 100
```

### **Engagement Rate:**
```javascript
engagementRate = (emails_with_opened_at_OR_clicked / total_sent_emails) * 100
```

### **Average Time to Open:**
```javascript
avgTimeToOpen = SUM(opened_at - created_at) / COUNT(opened_emails)
// Result in hours
```

---

## 🧪 Testing Checklist

### **Step 1: Run Database Migrations** 🔴 **REQUIRED**

1. Go to Supabase SQL Editor
2. Run migration: `migrations/052_add_email_tracking_columns.sql`
3. Verify columns were added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'email_logs' 
   AND column_name IN ('opened_at', 'open_count', 'clicks', 'click_count');
   ```
4. Run migration: `migrations/053_add_tracking_to_welcome_email.sql`
5. Verify template was updated:
   ```sql
   SELECT id, updated_at 
   FROM email_templates 
   WHERE id = 'welcome_lead';
   ```

### **Step 2: Deploy to Vercel** 🔴 **REQUIRED**

1. Commit all changes:
   ```bash
   git add -A
   git commit -m "Implement email open and click tracking"
   git push origin feature/page-functions
   ```
2. Wait 1-2 minutes for Vercel auto-deploy
3. Verify deployment status in Vercel dashboard

### **Step 3: Test Welcome Email Tracking**

1. Go to: `https://tre-crm.vercel.app/landing.html`
2. Submit test lead with email: `tucker.harris+tracking-test-1@gmail.com`
3. Check Gmail inbox for welcome email
4. **DO NOT OPEN THE EMAIL YET**
5. Check Supabase `email_logs` table:
   ```sql
   SELECT id, recipient_email, opened_at, open_count, click_count
   FROM email_logs
   WHERE recipient_email = 'tucker.harris+tracking-test-1@gmail.com'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - ✅ `opened_at` should be `NULL`
   - ✅ `open_count` should be `0`

### **Step 4: Test Open Tracking**

1. **Open the welcome email** in Gmail
2. Wait 5-10 seconds for tracking pixel to load
3. Check Supabase `email_logs` table again:
   ```sql
   SELECT id, recipient_email, opened_at, open_count, last_opened_at
   FROM email_logs
   WHERE recipient_email = 'tucker.harris+tracking-test-1@gmail.com'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - ✅ `opened_at` should have a timestamp
   - ✅ `open_count` should be `1`
   - ✅ `last_opened_at` should match `opened_at`

4. **Open the email again** (refresh or close/reopen)
5. Wait 5-10 seconds
6. Check database:
   - ✅ `opened_at` should NOT change (still first open time)
   - ✅ `open_count` should be `2`
   - ✅ `last_opened_at` should be updated to new timestamp

### **Step 5: Test Click Tracking**

1. In the welcome email, **click "Contact Your Agent" button**
2. This should open your email client with a new message to the agent
3. Check Supabase `email_logs` table:
   ```sql
   SELECT id, recipient_email, clicks, click_count, first_clicked_at
   FROM email_logs
   WHERE recipient_email = 'tucker.harris+tracking-test-1@gmail.com'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - ✅ `first_clicked_at` should have a timestamp
   - ✅ `click_count` should be `1`
   - ✅ `clicks` should be a JSONB array with one event:
     ```json
     [{"link": "cta_button", "clicked_at": "2025-11-06T12:34:56Z"}]
     ```

4. **Click the agent email link** in the agent contact card
5. Check database:
   - ✅ `click_count` should be `2`
   - ✅ `clicks` array should have two events:
     ```json
     [
       {"link": "cta_button", "clicked_at": "2025-11-06T12:34:56Z"},
       {"link": "agent_email", "clicked_at": "2025-11-06T12:35:10Z"}
     ]
     ```

### **Step 6: Test Emails Dashboard**

1. Go to: `https://tre-crm.vercel.app` (login as agent/manager)
2. Navigate to **Emails** page
3. Check metric cards:
   - ✅ **Open Rate** should show percentage > 0%
   - ✅ **Click Rate** should show percentage > 0%
   - ✅ **Engagement Rate** should show percentage > 0%
   - ✅ **Avg Time to Open** should show hours (e.g., "2h")

4. Check email logs table:
   - ✅ Find the test email in the table
   - ✅ **Engagement** column should show:
     - 📧 2 (green) - opened 2 times
     - 🔗 2 (blue) - clicked 2 times
   - ✅ Hover over icons to see tooltips

### **Step 7: Test Multiple Emails**

1. Send 3 more test emails with different behaviors:
   - Email 2: Open but don't click
   - Email 3: Click without opening (if possible)
   - Email 4: Don't open or click

2. Verify dashboard metrics update correctly:
   - Open rate should reflect emails 1 and 2
   - Click rate should reflect emails 1 and 3
   - Engagement rate should reflect emails 1, 2, and 3

---

## 🐛 Debugging Guide

### **Tracking Pixel Not Working:**

1. Check browser console for errors
2. Verify tracking pixel URL is correct:
   ```
   https://tre-crm.vercel.app/api/track-email-open?id={valid-uuid}
   ```
3. Test endpoint directly in browser (should return 1x1 GIF)
4. Check Supabase logs for errors

### **Click Tracking Not Working:**

1. Check if link redirects properly
2. Verify tracking URL format:
   ```
   https://tre-crm.vercel.app/api/track-email-click?id={uuid}&link={name}&url={encoded-url}
   ```
3. Test endpoint directly (should redirect to target URL)
4. Check Supabase logs for errors

### **Metrics Not Showing:**

1. Hard refresh the Emails page (Ctrl+Shift+R)
2. Check browser console for JavaScript errors
3. Verify database columns exist
4. Check if emails have tracking data

---

## ✅ Success Criteria

- ✅ Database migrations run successfully
- ✅ Tracking pixel loads in emails
- ✅ Open tracking updates database correctly
- ✅ Click tracking updates database correctly
- ✅ Dashboard shows accurate metrics
- ✅ Email logs table shows engagement indicators
- ✅ No errors in browser console
- ✅ No errors in Vercel logs

---

## 📝 Notes

- **Gmail Caching:** Gmail may cache images, so open tracking might not work perfectly in all cases
- **Privacy:** Some email clients block tracking pixels by default
- **Click Tracking:** Works more reliably than open tracking
- **Mailto Links:** Click tracking works for mailto: links but won't track the actual email send

---

## 🚀 Next Steps (Optional Enhancements)

1. **A/B Testing** - Test different subject lines and track which performs better
2. **Email Preview** - Show email preview before sending
3. **Scheduled Sending** - Delay email sending by X hours
4. **Unsubscribe Functionality** - Add unsubscribe links and preference center
5. **Email Templates** - Create more templates for different scenarios
6. **Resend Webhooks** - Use Resend webhooks for delivery/bounce tracking

