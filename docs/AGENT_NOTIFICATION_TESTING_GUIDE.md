# 📧 Agent Notification Email System - Testing Guide

## 📋 **Overview**

This guide provides comprehensive testing scenarios for the Agent Notification Email System. The system automatically sends email notifications to agents about important lead events and milestones.

---

## 🎯 **Email Templates**

The system includes 5 agent notification email templates:

1. **`agent_lead_assignment`** - When agent is assigned a lead
2. **`agent_lead_response`** - When lead submits Property Matcher selections
3. **`agent_more_options_request`** - When lead clicks "Send More Options"
4. **`agent_health_status_changed`** - When health status changes to YELLOW or RED
5. **`agent_inactivity_alert`** - When inactivity detected (36+ hours)

---

## ✅ **Prerequisites**

Before testing, ensure:

1. ✅ All 3 database migrations have been executed:
   - `migrations/056_create_email_alerts_table.sql`
   - `migrations/057_update_agent_emails_for_testing.sql`
   - `migrations/058_create_agent_notification_templates.sql`

2. ✅ Agent emails have been updated to use Gmail+ trick:
   - `tucker.harris+agent1@gmail.com`
   - `tucker.harris+agent2@gmail.com`
   - etc.

3. ✅ Resend API is configured and working

4. ✅ All code changes have been deployed to Vercel

---

## 🧪 **Test Scenarios**

### **Test Scenario 1: Lead Assignment from Landing Page**

**Purpose:** Verify agent receives assignment notification when lead submits landing page form

**Steps:**
1. Navigate to landing page: `https://your-domain.vercel.app/landing.html`
2. Fill out the lead form with test data
3. Submit the form
4. Check `tucker.harris@gmail.com` inbox for email with subject: "🎯 New Lead Assigned: [Lead Name]"

**Expected Results:**
- ✅ Lead created in database
- ✅ Agent assignment email sent to assigned agent
- ✅ Email contains lead details (name, email, phone, preferences)
- ✅ Email contains "View Lead Details" button
- ✅ Activity logged: `agent_notification_sent`
- ✅ Email tracking pixel included
- ✅ All links have click tracking

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_lead_assignment' 
ORDER BY created_at DESC LIMIT 1;

-- Check activity was logged
SELECT * FROM lead_activities 
WHERE activity_type = 'agent_notification_sent' 
AND metadata->>'email_type' = 'agent_lead_assignment'
ORDER BY created_at DESC LIMIT 1;
```

---

### **Test Scenario 2: Manual Lead Assignment**

**Purpose:** Verify agent receives assignment notification when manager manually assigns lead

**Steps:**
1. Log in as Manager/Super User
2. Navigate to Leads page
3. Select a lead that has no assigned agent
4. Assign the lead to an agent using the dropdown
5. Check agent's email inbox for assignment notification

**Expected Results:**
- ✅ Lead assigned in database
- ✅ Agent assignment email sent to assigned agent
- ✅ Email contains "Assigned by: [Manager Name]"
- ✅ Email contains lead details
- ✅ Activity logged: `agent_assigned` and `agent_notification_sent`

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_lead_assignment' 
AND metadata->>'source' = 'manual_assignment'
ORDER BY created_at DESC LIMIT 1;
```

---

### **Test Scenario 3: Lead Responds to Smart Match**

**Purpose:** Verify agent receives notification when lead submits Property Matcher selections

**Steps:**
1. Send a Smart Match email to a test lead
2. Open the Property Matcher link from the email
3. Select 2-3 properties as interested
4. Request a tour for at least 1 property
5. Click "Submit My Selections"
6. Check agent's email inbox for response notification

**Expected Results:**
- ✅ Lead response email sent to assigned agent
- ✅ Email subject: "✅ [Lead Name] Responded to Smart Match!"
- ✅ Email contains list of selected properties with details
- ✅ Email shows which properties have tour requests
- ✅ Email contains "View Lead Details" button
- ✅ Activity logged: `property_matcher_submitted` and `agent_notification_sent`

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_lead_response' 
ORDER BY created_at DESC LIMIT 1;

-- Check properties selected count
SELECT metadata->>'properties_selected' as count
FROM email_logs 
WHERE metadata->>'email_type' = 'agent_lead_response' 
ORDER BY created_at DESC LIMIT 1;
```

---

### **Test Scenario 4: Lead Requests More Options**

**Purpose:** Verify agent receives notification when lead clicks "Send More Options"

**Steps:**
1. Open a Property Matcher link for a test lead
2. Scroll to bottom of page
3. Click "Send Me More Options" button
4. Check agent's email inbox for more options request notification

**Expected Results:**
- ✅ More options request email sent to assigned agent
- ✅ Email subject: "🔄 [Lead Name] Wants More Property Options!"
- ✅ Email contains number of properties viewed
- ✅ Email contains "Send Smart Match" button
- ✅ Activity logged: `wants_more_options` and `agent_notification_sent`
- ✅ Lead's `wants_more_options` flag set to `true`
- ✅ Lead's `last_smart_match_sent_at` reset to `null`

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_more_options_request' 
ORDER BY created_at DESC LIMIT 1;

-- Check lead flags updated
SELECT wants_more_options, last_smart_match_sent_at 
FROM leads 
WHERE id = '[lead_id]';
```

---

### **Test Scenario 5: Health Status Change to Yellow**

**Purpose:** Verify agent receives notification when lead health status changes to yellow

**Steps:**
1. Create a test lead with health status = 'green'
2. Manually update the lead's health status to 'yellow' in the database
3. Check agent's email inbox for health status alert

**SQL to Trigger:**
```sql
UPDATE leads 
SET health_status = 'yellow', health_score = 70 
WHERE id = '[lead_id]';
```

**Expected Results:**
- ✅ Health status alert email sent to assigned agent
- ✅ Email subject: "⚠️ Lead Health Alert: [Lead Name] is now YELLOW"
- ✅ Email contains previous and new status
- ✅ Email contains previous and new score
- ✅ Email contains "View Lead Details" button
- ✅ Activity logged: `health_status_changed` and `agent_notification_sent`

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_health_status_changed' 
ORDER BY created_at DESC LIMIT 1;
```

---

### **Test Scenario 6: Health Status Change to Red**

**Purpose:** Verify agent receives notification when lead health status changes to red

**Steps:**
1. Create a test lead with health status = 'yellow'
2. Manually update the lead's health status to 'red' in the database
3. Check agent's email inbox for health status alert

**SQL to Trigger:**
```sql
UPDATE leads 
SET health_status = 'red', health_score = 40 
WHERE id = '[lead_id]';
```

**Expected Results:**
- ✅ Health status alert email sent to assigned agent
- ✅ Email subject: "⚠️ Lead Health Alert: [Lead Name] is now RED"
- ✅ Email styling reflects critical severity (red gradient)

---

### **Test Scenario 7: Inactivity Detection (36 hours)**

**Purpose:** Verify agent receives notification when lead is inactive for 36+ hours

**Steps:**
1. Create a test lead with health status = 'green'
2. Ensure lead has no activities in the last 36 hours
3. Run the inactivity detection function manually
4. Check agent's email inbox for inactivity alert

**SQL to Trigger:**
```sql
-- Delete recent activities to simulate inactivity
DELETE FROM lead_activities 
WHERE lead_id = '[lead_id]' 
AND created_at > NOW() - INTERVAL '36 hours';

-- Run inactivity detection (call from application)
-- OR manually update health status
UPDATE leads 
SET health_status = 'yellow', health_score = 85 
WHERE id = '[lead_id]';
```

**Expected Results:**
- ✅ Inactivity alert email sent to assigned agent
- ✅ Email subject: "⏰ Inactivity Alert: [Lead Name] Needs Attention"
- ✅ Email contains hours since last activity
- ✅ Email contains last activity date and type
- ✅ Email contains new health status (YELLOW)
- ✅ Activity logged: `inactivity_detected` and `agent_notification_sent`

**Database Verification:**
```sql
-- Check email was logged
SELECT * FROM email_logs 
WHERE metadata->>'email_type' = 'agent_inactivity_alert' 
ORDER BY created_at DESC LIMIT 1;

-- Check inactivity activity logged
SELECT * FROM lead_activities 
WHERE activity_type = 'inactivity_detected' 
ORDER BY created_at DESC LIMIT 1;
```

---

### **Test Scenario 8: Missing Agent Email (Alert Creation)**

**Purpose:** Verify alert is created when agent has no email address

**Steps:**
1. Create a test agent with no email address
2. Assign a lead to this agent
3. Check that no email is sent
4. Navigate to Emails dashboard → Alerts tab
5. Verify alert is displayed

**Expected Results:**
- ✅ No email sent
- ✅ Alert created in `email_alerts` table
- ✅ Alert type: `missing_agent_email`
- ✅ Alert severity: `warning`
- ✅ Alert visible in Emails dashboard Alerts tab
- ✅ Alert contains agent name and lead name

**Database Verification:**
```sql
-- Check alert was created
SELECT * FROM email_alerts 
WHERE alert_type = 'missing_agent_email' 
AND resolved = false 
ORDER BY created_at DESC LIMIT 1;
```

---

## 🚨 **Alerts Dashboard Testing**

### **Test Scenario 9: View Alerts in Dashboard**

**Steps:**
1. Navigate to Emails page
2. Click "🚨 Alerts" tab
3. Verify unresolved alerts are displayed
4. Test filter by alert type
5. Test filter by severity
6. Click "🔄 Refresh" button

**Expected Results:**
- ✅ All unresolved alerts displayed
- ✅ Alerts sorted by created_at (newest first)
- ✅ Severity badges displayed correctly (⚠️ Warning, 🚨 Error)
- ✅ Alert type labels displayed correctly
- ✅ Filters work correctly
- ✅ Refresh button updates the list

---

### **Test Scenario 10: Resolve Alert**

**Steps:**
1. Navigate to Emails page → Alerts tab
2. Click "✅ Mark Resolved" on an alert
3. Verify alert disappears from list
4. Check database to confirm resolution

**Expected Results:**
- ✅ Alert removed from unresolved list
- ✅ Alert's `resolved` field set to `true`
- ✅ Alert's `resolved_at` field set to current timestamp
- ✅ Alert's `resolved_by` field set to current user ID

**Database Verification:**
```sql
-- Check alert was resolved
SELECT resolved, resolved_at, resolved_by 
FROM email_alerts 
WHERE id = '[alert_id]';
```

---

## 📊 **Summary Checklist**

Before marking testing complete, verify:

- [ ] All 5 email templates render correctly
- [ ] All 5 email types send successfully
- [ ] All emails include tracking pixel
- [ ] All links have click tracking
- [ ] All activities are logged correctly
- [ ] Alerts are created for missing agent emails
- [ ] Alerts are created for email send failures
- [ ] Alerts dashboard displays correctly
- [ ] Alerts can be filtered and resolved
- [ ] Duplicate prevention works (1 hour cooldown for most, 24 hours for inactivity)
- [ ] Emails are sent to correct Gmail+ addresses

---

## 🐛 **Troubleshooting**

### **Email Not Received**

1. Check `email_logs` table for the email
2. Check `email_alerts` table for any alerts
3. Check browser console for errors
4. Check Vercel function logs for errors
5. Verify Resend API key is configured
6. Verify agent email address is set

### **Alert Not Created**

1. Check browser console for errors
2. Verify `email_alerts` table exists
3. Verify RLS policies allow inserts
4. Check Supabase logs for errors

### **Email Sent But Not Visible in Dashboard**

1. Check `email_logs` table directly
2. Verify `metadata` field contains `email_type`
3. Check Emails dashboard filters
4. Refresh the page

---

## ✅ **Testing Complete!**

Once all scenarios pass, the Agent Notification Email System is ready for production use! 🎉

