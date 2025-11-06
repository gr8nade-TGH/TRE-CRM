# 📧 Guest Card Email - Testing Guide

This guide provides step-by-step instructions for testing the guest card email feature.

---

## 🎯 **What is a Guest Card Email?**

A **guest card email** is an automated notification sent to property owners when their property is included in a Smart Match showcase sent to a lead. It provides the property owner with:

- Lead contact information (name, email, phone)
- Lead preferences (budget, bedrooms, bathrooms, move-in date)
- Agent contact information
- Next steps and expectations

---

## ✅ **Prerequisites**

Before testing, ensure:

1. ✅ Database migrations 054 and 055 have been executed in Supabase
2. ✅ Code has been deployed to Vercel
3. ✅ Property owner emails have been updated to use Gmail+ addresses
4. ✅ You have access to `tucker.harris@gmail.com` inbox

---

## 🧪 **Test Scenarios**

### **Test Scenario 1: Single Property Match** ⭐ **START HERE**

**Purpose:** Verify basic guest card functionality with one property

**Steps:**
1. Go to Leads page in TRE CRM
2. Select a lead with preferences that match at least 1 property
3. Click "Send Smart Match" button
4. Wait for success message
5. Check browser console for guest card logs

**Expected Results:**
- ✅ Smart Match email sent to lead successfully
- ✅ Console shows: `📧 Sending guest cards to property owners...`
- ✅ Console shows: `✅ Guest cards sent: { sent: 1, skipped: 0, failed: 0 }`
- ✅ Console shows: `✅ Guest card sent successfully: [email_log_id]`
- ✅ Console shows: `✅ Lead activity logged`
- ✅ Console shows: `✅ Property activity logged`
- ✅ Email received at `tucker.harris@gmail.com` with subject: `🏠 New Lead Interested in [Property Name]`
- ✅ Email contains lead information (name, email, phone, budget, etc.)
- ✅ Email contains agent information
- ✅ Email has tracking pixel (check HTML source)
- ✅ Email has click tracking URLs (hover over links to verify)

**Database Verification:**
```sql
-- Check email_logs table
SELECT 
    id,
    recipient_email,
    subject,
    status,
    metadata->>'email_type' as email_type,
    metadata->>'lead_id' as lead_id,
    metadata->>'property_id' as property_id,
    created_at
FROM email_logs
WHERE metadata->>'email_type' = 'guest_card'
ORDER BY created_at DESC
LIMIT 5;

-- Check lead_activities table
SELECT 
    id,
    lead_id,
    activity_type,
    description,
    metadata,
    created_at
FROM lead_activities
WHERE activity_type = 'guest_card_sent'
ORDER BY created_at DESC
LIMIT 5;

-- Check property_activities table
SELECT 
    id,
    property_id,
    activity_type,
    description,
    metadata,
    created_at
FROM property_activities
WHERE activity_type = 'guest_card_sent'
ORDER BY created_at DESC
LIMIT 5;
```

---

### **Test Scenario 2: Multiple Property Match**

**Purpose:** Verify guest cards are sent to multiple property owners

**Steps:**
1. Select a lead with preferences that match 3+ properties
2. Click "Send Smart Match" button
3. Wait for success message
4. Check browser console for guest card logs

**Expected Results:**
- ✅ Smart Match email sent to lead successfully
- ✅ Console shows: `✅ Guest cards sent: { sent: 3, skipped: 0, failed: 0 }`
- ✅ 3 separate guest card emails received at `tucker.harris@gmail.com`
- ✅ Each email has different property name in subject
- ✅ Each email has different property owner name (owner1, owner2, owner3)
- ✅ All emails contain same lead information
- ✅ 3 entries in `email_logs` table with `email_type = 'guest_card'`
- ✅ 3 entries in `lead_activities` table with `activity_type = 'guest_card_sent'`
- ✅ 3 entries in `property_activities` table with `activity_type = 'guest_card_sent'`

---

### **Test Scenario 3: Duplicate Prevention (7-Day Window)**

**Purpose:** Verify duplicate prevention works correctly

**Steps:**
1. Send Smart Match to a lead (this will send guest cards)
2. Wait 10 seconds
3. Send Smart Match to the **same lead** again
4. Check browser console for duplicate prevention logs

**Expected Results:**
- ✅ First Smart Match: Guest cards sent successfully
- ✅ Second Smart Match: Console shows: `📧 Guest card already sent for property [id] and lead [id] - skipping`
- ✅ Console shows: `✅ Guest cards sent: { sent: 0, skipped: [N], failed: 0 }`
- ✅ No new guest card emails received
- ✅ No new entries in `email_logs` table for guest cards
- ✅ No new entries in `lead_activities` or `property_activities` tables

**Database Verification:**
```sql
-- Check that only 1 guest card was sent per property-lead combination
SELECT 
    metadata->>'property_id' as property_id,
    metadata->>'lead_id' as lead_id,
    COUNT(*) as guest_card_count,
    MIN(created_at) as first_sent,
    MAX(created_at) as last_sent
FROM email_logs
WHERE metadata->>'email_type' = 'guest_card'
GROUP BY metadata->>'property_id', metadata->>'lead_id'
HAVING COUNT(*) > 1;

-- Should return 0 rows (no duplicates)
```

---

### **Test Scenario 4: Missing Owner Email**

**Purpose:** Verify graceful handling when property has no owner email

**Steps:**
1. In Supabase, update 1 property to have `contact_email = NULL`:
   ```sql
   UPDATE properties 
   SET contact_email = NULL 
   WHERE id = '[property_id]';
   ```
2. Send Smart Match to a lead that matches this property
3. Check browser console for warning logs

**Expected Results:**
- ✅ Smart Match email sent to lead successfully
- ✅ Console shows: `⚠️ Property [id] has no contact_email - skipping guest card`
- ✅ Console shows: `✅ Guest cards sent: { sent: [N-1], skipped: 1, failed: 0 }`
- ✅ Guest cards sent for other properties (with emails)
- ✅ No guest card sent for property without email
- ✅ No error thrown
- ✅ Smart Match not affected

**Cleanup:**
```sql
-- Restore the property owner email
UPDATE properties 
SET contact_email = 'tucker.harris+owner1@gmail.com' 
WHERE id = '[property_id]';
```

---

### **Test Scenario 5: Bulk Send**

**Purpose:** Verify guest cards work correctly with bulk send

**Steps:**
1. Go to Leads page
2. Select 3 leads using checkboxes
3. Click "Bulk Actions" → "Send Smart Match"
4. Wait for success message
5. Check browser console for guest card logs

**Expected Results:**
- ✅ 3 Smart Match emails sent successfully
- ✅ Console shows guest card logs for each lead
- ✅ Guest cards sent for all properties across all 3 leads
- ✅ Duplicate prevention works across bulk send (if same property matches multiple leads)
- ✅ Multiple guest card emails received at `tucker.harris@gmail.com`
- ✅ Each email has correct lead information
- ✅ All emails logged in `email_logs` table
- ✅ All activities logged in `lead_activities` and `property_activities` tables

---

## 📊 **Email Tracking Verification**

After sending guest cards, verify tracking works:

### **Open Tracking:**
1. Open a guest card email in Gmail
2. Wait 5-10 seconds
3. Check Supabase `email_logs` table:
   ```sql
   SELECT 
       id,
       recipient_email,
       opened_at,
       open_count,
       last_opened_at
   FROM email_logs
   WHERE metadata->>'email_type' = 'guest_card'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
4. ✅ `opened_at` should have a timestamp
5. ✅ `open_count` should be `1`
6. ✅ `last_opened_at` should match `opened_at`

### **Click Tracking:**
1. Click on "Contact Agent for Updates" button in email
2. Check Supabase `email_logs` table:
   ```sql
   SELECT 
       id,
       recipient_email,
       clicks,
       click_count,
       first_clicked_at
   FROM email_logs
   WHERE metadata->>'email_type' = 'guest_card'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. ✅ `first_clicked_at` should have a timestamp
4. ✅ `click_count` should be `1`
5. ✅ `clicks` should be a JSON array with click details

---

## 🐛 **Debugging Guide**

### **Problem: Guest cards not being sent**

**Check:**
1. Browser console for error messages
2. Vercel deployment logs for API errors
3. Supabase logs for database errors
4. Email template exists in `email_templates` table:
   ```sql
   SELECT * FROM email_templates WHERE id = 'guest_card_email';
   ```

### **Problem: Duplicate prevention not working**

**Check:**
1. `email_logs` table for duplicate entries
2. Console logs for duplicate prevention logic
3. Verify 7-day window calculation is correct

### **Problem: Activity logging not working**

**Check:**
1. `lead_activities` table for `activity_type = 'guest_card_sent'`
2. `property_activities` table for `activity_type = 'guest_card_sent'`
3. Console logs for activity logging errors

### **Problem: Email tracking not working**

**Check:**
1. Email HTML source for tracking pixel: `<img src="{{trackingPixelUrl}}">`
2. Email HTML source for tracking URLs: `/api/track-email-click?id=...`
3. Verify tracking endpoints are deployed: `/api/track-email-open` and `/api/track-email-click`

---

## ✅ **Success Criteria**

All test scenarios should pass with:
- ✅ Guest cards sent successfully
- ✅ Duplicate prevention working
- ✅ Activity logging working
- ✅ Email tracking working
- ✅ Graceful error handling
- ✅ No impact on Smart Match functionality

---

## 🚀 **Next Steps After Testing**

1. **Update property owner emails to production values** (remove Gmail+ addresses)
2. **Monitor guest card engagement** in Emails dashboard
3. **Gather feedback** from property owners
4. **Consider Phase 2 enhancements:**
   - Update emails when lead selects property
   - Update emails when lead requests tour
   - Weekly digest of all leads viewing properties
   - Property owner dashboard to view all guest cards

---

## 📝 **Notes**

- Guest cards are sent **immediately after** Smart Match email is sent
- Duplicate prevention uses a **7-day window**
- Guest cards **never fail** Smart Match (fail-safe design)
- All guest cards include **email tracking** (open + click)
- Activity logging happens for **both leads and properties**
- Property owners can contact agent directly via email/phone links in guest card

---

**Questions or Issues?** Check the browser console and Supabase logs for detailed error messages.

