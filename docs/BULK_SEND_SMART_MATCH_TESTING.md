# Bulk Send Smart Match - Testing Guide

## Overview

This guide provides comprehensive testing instructions for the bulk send Smart Match feature with rate limiting.

## Features Implemented

### ✅ Task 1: Smart Match Email Template
- Modern, responsive HTML email template
- Shows 4-6 properties with images, specs, and specials
- Personalized with lead name and agent info
- Template stored in database (`smart_match_email`)

### ✅ Task 2: Rate Limiting (12-Hour Cooldown)
- Checks `email_logs` table for last Smart Match email send time
- Prevents duplicate sends within 12 hours
- Shows detailed cooldown information in confirmation dialog
- Lists skipped leads with time remaining

### ✅ Task 3: Bulk Send UI
- Checkbox column in Leads table
- "Select All" checkbox in header
- "Bulk Send Smart Matches" button (appears when leads selected)
- Selection counter (e.g., "3 selected")

---

## Testing Prerequisites

### 1. Database Setup
Run these migrations in Supabase SQL Editor:

**Migration 040: Smart Match Email Template**
```sql
-- Already run if you see the template in email_templates table
SELECT * FROM email_templates WHERE id = 'smart_match_email';
```

**Migration 041: Update Property Rent Ranges**
```sql
-- Already run if properties show correct rent ranges
SELECT name, rent_range_min, rent_range_max FROM properties;
```

### 2. Test Data
- **Properties**: 6 properties with 56 units imported via CSV
- **Leads**: At least 3-4 test leads with valid email addresses
- **Agents**: At least one agent assigned to leads

### 3. Vercel Deployment
- Wait for latest deployment to complete (2-3 minutes after push)
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## Test Scenarios

### Scenario 1: First-Time Send (No Cooldown)

**Setup:**
- Select 2-3 leads who have NEVER received a Smart Match email

**Expected Behavior:**
1. Click checkboxes next to leads
2. "Bulk Send Smart Matches" button appears with count
3. Click button → Shows "Checking..." state
4. Confirmation dialog appears:
   ```
   ✅ Ready to send Smart Match emails to 3 leads.
   
   Do you want to proceed with sending 3 emails?
   ```
5. Click OK → Shows "Sending 3/3..." state
6. Success message: "✅ Successfully sent Smart Match emails to 3 leads!"
7. Checkboxes auto-uncheck
8. Leads table refreshes

**Verification:**
- Check browser console for detailed logs
- Check `email_logs` table in Supabase:
  ```sql
  SELECT * FROM email_logs 
  WHERE template_id = 'smart_match_email' 
  ORDER BY created_at DESC 
  LIMIT 10;
  ```
- Check `lead_activities` table:
  ```sql
  SELECT * FROM lead_activities 
  WHERE activity_type = 'email_sent' 
  ORDER BY created_at DESC 
  LIMIT 10;
  ```

---

### Scenario 2: Rate Limiting (Some Leads in Cooldown)

**Setup:**
- Select 3 leads:
  - 2 who just received emails (Scenario 1)
  - 1 who has never received an email

**Expected Behavior:**
1. Click checkboxes next to all 3 leads
2. Click "Bulk Send Smart Matches" → Shows "Checking..." state
3. Confirmation dialog appears:
   ```
   ⚠️ 1 lead will receive emails.
   ⏳ 2 leads will be skipped (cooldown period).
   
   📋 Leads in cooldown (12-hour period):
     • John Doe - Available in 11.9 hours
     • Jane Smith - Available in 11.8 hours
   
   Do you want to proceed with sending 1 email?
   ```
4. Click OK → Sends to 1 lead only
5. Warning message: "⚠️ Sent 1 email, 2 skipped (cooldown). Check console for details."

**Verification:**
- Only 1 new email in `email_logs`
- Console shows skipped leads with cooldown info

---

### Scenario 3: All Leads in Cooldown

**Setup:**
- Select only leads who received emails within last 12 hours

**Expected Behavior:**
1. Click checkboxes next to leads
2. Click "Bulk Send Smart Matches" → Shows "Checking..." state
3. Confirmation dialog appears:
   ```
   ❌ All 2 selected leads are in cooldown period.
   
   📋 Leads in cooldown (12-hour period):
     • John Doe - Available in 11.5 hours
     • Jane Smith - Available in 11.3 hours
   
   No emails will be sent. Please try again later.
   ```
4. Click OK → No emails sent
5. Warning message: "⏳ All selected leads are in cooldown period. Please try again later."

**Verification:**
- No new emails in `email_logs`
- Console shows all leads skipped

---

### Scenario 4: Mixed Success/Failure

**Setup:**
- Select leads with various conditions:
  - Valid email, can send
  - Invalid email (will fail)
  - In cooldown (will skip)

**Expected Behavior:**
1. Confirmation dialog shows accurate counts
2. After sending, shows detailed summary:
   ```
   ⚠️ Sent 1 email, 1 skipped (cooldown), 1 failed. Check console for details.
   ```
3. Console shows detailed error messages

---

## Testing Checklist

### UI/UX Tests
- [ ] Checkboxes appear in Leads table
- [ ] Checkboxes are clickable and show blue checkmark when checked
- [ ] "Select All" checkbox works correctly
- [ ] Bulk actions button appears/hides based on selection
- [ ] Selection counter updates correctly
- [ ] Button shows loading states ("Checking...", "Sending X/Y...")
- [ ] Confirmation dialog is readable and informative
- [ ] Success/warning/error messages are clear

### Rate Limiting Tests
- [ ] First-time send works (no cooldown)
- [ ] Second send within 12 hours is blocked
- [ ] Cooldown time is calculated correctly
- [ ] Time remaining is displayed in human-readable format
- [ ] Mixed scenarios (some can send, some can't) work correctly
- [ ] All-in-cooldown scenario prevents sending

### Database Tests
- [ ] `email_logs` table records all sent emails
- [ ] `metadata->>'lead_id'` is populated correctly
- [ ] `template_id` is 'smart_match_email'
- [ ] `status` is 'sent' or 'delivered'
- [ ] `lead_activities` table records email_sent activity

### Error Handling Tests
- [ ] Invalid lead ID handled gracefully
- [ ] Database errors don't crash the app
- [ ] Network errors show appropriate messages
- [ ] Missing agent info handled (uses current user)
- [ ] No Smart Match properties available handled

---

## Console Debugging

### Useful Console Commands

**Check last email send time for a lead:**
```javascript
const leadId = 'YOUR_LEAD_ID_HERE';
const result = await window.SupabaseAPI.getLastSmartMatchEmailTime(leadId);
console.log('Last email:', result);
```

**Check cooldown status:**
```javascript
const leadId = 'YOUR_LEAD_ID_HERE';
const cooldown = await window.SupabaseAPI.checkSmartMatchCooldown(leadId);
console.log('Cooldown:', cooldown);
```

**Manually send Smart Match email (skip cooldown):**
```javascript
const leadId = 'YOUR_LEAD_ID_HERE';
const result = await window.SupabaseAPI.sendSmartMatchEmail(leadId, {
    propertyCount: 5,
    sentBy: window.state.user.id,
    skipCooldownCheck: true // WARNING: Bypasses rate limiting!
});
console.log('Result:', result);
```

**Query email logs:**
```sql
-- In Supabase SQL Editor
SELECT 
    el.id,
    el.recipient_email,
    el.status,
    el.sent_at,
    el.metadata->>'lead_id' as lead_id,
    l.name as lead_name
FROM email_logs el
LEFT JOIN leads l ON l.id = (el.metadata->>'lead_id')::uuid
WHERE el.template_id = 'smart_match_email'
ORDER BY el.created_at DESC
LIMIT 20;
```

---

## Known Limitations

1. **No UI indicators for cooldown status** (Task 5 - not yet implemented)
   - Checkboxes don't show which leads are in cooldown
   - No countdown timer or "Available in X hours" badge
   - Must click "Bulk Send" to see cooldown status

2. **Browser confirm() dialog** (Task 4 - partially implemented)
   - Uses native browser confirm dialog (not custom modal)
   - No preview of email content
   - Limited formatting options

3. **Sequential sending** (by design)
   - Emails sent one at a time to avoid rate limiting
   - May be slow for large batches (10+ leads)
   - Progress indicator shows count but not individual lead names

---

## Next Steps (Future Tasks)

### Task 4: Improve Confirmation Dialog
- [ ] Create custom modal instead of browser confirm()
- [ ] Show email preview
- [ ] Better formatting and styling
- [ ] Expandable sections for skipped leads

### Task 5: Add UI Indicators for Cooldown Status
- [ ] Disable checkboxes for leads in cooldown
- [ ] Show countdown timer or "Available in X hours" badge
- [ ] Add visual indicator (icon) for leads who received emails
- [ ] Disable "Matches" button if in cooldown

### Task 6: Testing and Refinement
- [ ] Test with real production data
- [ ] Verify Smart Match algorithm accuracy
- [ ] Add "Preview" option in confirmation dialog
- [ ] Performance optimization for large batches

---

## Troubleshooting

### Issue: Checkboxes not clickable
**Solution:** Hard refresh browser (Ctrl+Shift+R)

### Issue: "SupabaseAPI is not defined"
**Solution:** Check browser console for errors, ensure latest deployment is live

### Issue: All emails fail
**Solution:** 
1. Check Resend API key in Vercel environment variables
2. Check email template exists in database
3. Check browser console for detailed error messages

### Issue: Cooldown not working
**Solution:**
1. Check `email_logs` table has data
2. Verify `template_id` is 'smart_match_email'
3. Check `metadata->>'lead_id'` is populated
4. Run manual cooldown check in console (see above)

### Issue: Wrong time remaining shown
**Solution:**
1. Check server time vs local time (timezone issues)
2. Verify `sent_at` timestamp in `email_logs`
3. Check calculation in browser console

---

## Success Criteria

✅ **Feature is working correctly if:**
1. Checkboxes are clickable and functional
2. Bulk send button appears when leads selected
3. Rate limiting prevents duplicate sends within 12 hours
4. Confirmation dialog shows accurate cooldown information
5. Success/warning/error messages are clear and accurate
6. Email logs and lead activities are recorded correctly
7. No JavaScript errors in console
8. UI updates correctly after sending

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Check Vercel logs for serverless function errors
4. Review this testing guide for troubleshooting steps
5. Contact development team with detailed error messages and steps to reproduce

