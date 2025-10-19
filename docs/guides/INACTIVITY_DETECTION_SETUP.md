# 🔍 Inactivity Detection System - Setup Guide

**Date:** 2025-10-19  
**Status:** Implemented - Ready for Deployment

---

## 📋 Overview

The Inactivity Detection System automatically monitors all active leads and updates their health status based on activity patterns.

### **Rules:**
- ✅ **36 hours** no activity → Health status changes to **YELLOW** (if currently GREEN)
- ✅ **72 hours** no activity → Health status changes to **RED** (if currently YELLOW or GREEN)
- ✅ Inactivity events themselves **DO NOT count** as activity (prevents false positives)
- ✅ Creates `inactivity_detected` activity log entries
- ✅ Automatically decreases health scores

---

## 🎯 How It Works

### **Detection Logic:**

1. **Fetch all active leads** (excludes closed/lost leads)
2. **Check last activity timestamp** for each lead
3. **Ignore `inactivity_detected` events** when calculating time since last real activity
4. **Apply rules:**
   - If 72+ hours since last real activity → Set to RED
   - If 36+ hours since last real activity AND currently GREEN → Set to YELLOW
5. **Create activity log entry** for each status change
6. **Update lead health status** and health score

### **Activity Types That Count:**
- ✅ `lead_created`
- ✅ `note_added`
- ✅ `agent_assigned`
- ✅ `agent_unassigned`
- ✅ `health_status_changed` (manual changes)
- ✅ `preferences_updated`
- ✅ `document_step_completed`
- ❌ `inactivity_detected` (DOES NOT COUNT)

---

## 🧪 Testing (Manual Trigger)

### **Option 1: Browser Console**

Open the browser console and run:

```javascript
window.runInactivityDetection()
```

This will:
- ✅ Check all active leads
- ✅ Update health statuses as needed
- ✅ Create activity log entries
- ✅ Show toast notification with results
- ✅ Refresh the leads display

### **Option 2: Add a Test Button (Temporary)**

Add this button to your admin page for testing:

```html
<button onclick="window.runInactivityDetection()" class="btn btn-secondary">
    🔍 Run Inactivity Check
</button>
```

---

## 🚀 Production Deployment Options

### **Option 1: Supabase Edge Functions (Recommended)**

Create a Supabase Edge Function that runs on a schedule:

1. **Create the Edge Function:**

```bash
supabase functions new inactivity-detection
```

2. **Add the function code:**

```typescript
// supabase/functions/inactivity-detection/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Your inactivity detection logic here
    // (Copy the logic from detectInactiveLeads function)

    return new Response(
      JSON.stringify({ success: true, message: 'Inactivity check complete' }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

3. **Deploy the function:**

```bash
supabase functions deploy inactivity-detection
```

4. **Set up a cron job in Supabase:**

Go to **Database → Cron Jobs** and create:

```sql
SELECT cron.schedule(
  'inactivity-detection-hourly',
  '0 * * * *', -- Run every hour
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/inactivity-detection',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

### **Option 2: Vercel Cron Jobs**

If you're using Vercel for hosting, you can use Vercel Cron:

1. **Create an API route:**

```javascript
// api/cron/inactivity-detection.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized access
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Run inactivity detection logic here
  // (Copy from detectInactiveLeads function)

  res.status(200).json({ success: true });
}
```

2. **Add to vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/cron/inactivity-detection",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

### **Option 3: GitHub Actions (Free)**

Create a scheduled GitHub Action:

```yaml
# .github/workflows/inactivity-detection.yml
name: Inactivity Detection

on:
  schedule:
    - cron: '0 * * * *'  # Run every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  detect-inactivity:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Inactivity Detection
        run: |
          curl -X POST https://your-app.vercel.app/api/inactivity-detection \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

### **Option 4: External Cron Service**

Use a service like **cron-job.org** or **EasyCron**:

1. Create an API endpoint in your app
2. Set up the cron service to hit that endpoint hourly
3. Secure with an API key

---

## 📊 Expected Console Output

When running inactivity detection, you should see:

```
🔍 Starting inactivity detection...
📊 Checking 45 active leads for inactivity...
⚠️ Lead abc-123 (John Doe) - 38.5h inactive → YELLOW
🚨 Lead def-456 (Jane Smith) - 75.2h inactive → RED
✅ Inactivity detection complete. Processed 2 leads.
```

---

## 🔧 Configuration

### **Adjust Timing Thresholds:**

Edit `src/api/supabase-api.js` in the `detectInactiveLeads` function:

```javascript
// Current settings:
const thirtyNineSixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000);  // 36 hours
const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);    // 72 hours

// To change to 24h → yellow, 48h → red:
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
```

### **Adjust Health Score Penalties:**

```javascript
// Current penalties:
health_score: Math.max(0, (lead.health_score || 100) - 30),  // RED: -30 points
health_score: Math.max(0, (lead.health_score || 100) - 15),  // YELLOW: -15 points

// Adjust as needed
```

---

## 🎯 Activity Log Examples

### **Yellow Warning (36 hours):**

```json
{
  "activity_type": "inactivity_detected",
  "description": "No activity detected in past 36 hours - Needs attention",
  "metadata": {
    "hours_since_last_activity": 38,
    "last_activity_date": "2025-10-17T10:30:00Z",
    "previous_health_status": "green",
    "new_health_status": "yellow",
    "severity": "warning"
  },
  "performed_by": "system",
  "performed_by_name": "Automated Inactivity Detection"
}
```

### **Red Alert (72 hours):**

```json
{
  "activity_type": "inactivity_detected",
  "description": "No activity detected in past 72 hours - Critical",
  "metadata": {
    "hours_since_last_activity": 75,
    "last_activity_date": "2025-10-16T08:15:00Z",
    "previous_health_status": "yellow",
    "new_health_status": "red",
    "severity": "critical"
  },
  "performed_by": "system",
  "performed_by_name": "Automated Inactivity Detection"
}
```

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Test manual trigger: `window.runInactivityDetection()`
- [ ] Verify leads with 36+ hours inactivity turn yellow
- [ ] Verify leads with 72+ hours inactivity turn red
- [ ] Verify `inactivity_detected` events don't count as activity
- [ ] Verify activity log entries are created correctly
- [ ] Verify health scores decrease appropriately
- [ ] Verify closed/lost leads are excluded
- [ ] Test with multiple leads at different inactivity levels
- [ ] Verify UI refreshes after detection runs

---

## 🐛 Troubleshooting

### **Issue: No leads being updated**

**Check:**
- Are there any active leads with 36+ hours inactivity?
- Check console for errors
- Verify `last_activity_at` timestamps in database

### **Issue: All leads turning red immediately**

**Check:**
- Verify `last_activity_at` is being set correctly on lead creation
- Check if initial activities are being created

### **Issue: Inactivity events counting as activity**

**Check:**
- Verify the logic that filters out `inactivity_detected` events
- Check the `lastRealActivity` calculation

---

## 📝 Next Steps

1. ✅ Test manually using `window.runInactivityDetection()`
2. ✅ Verify activity logs are created correctly
3. ✅ Choose a deployment option (Supabase Edge Functions recommended)
4. ✅ Set up hourly cron job
5. ✅ Monitor for first 24 hours
6. ✅ Adjust thresholds if needed

---

**Ready to deploy!** 🚀

