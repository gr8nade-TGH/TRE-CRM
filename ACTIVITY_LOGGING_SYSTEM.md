# 📊 Activity Logging System - Comprehensive Design

## Overview
A robust activity logging system to track every action on leads and listings with timestamps, enabling:
- **Health Status Calculation** - Based on actual tracked activities
- **Document Tracking** - Complete audit trail
- **Performance Analytics** - Agent activity metrics
- **Compliance** - Full audit trail for legal/compliance

---

## 🎯 What We're Currently Tracking (Functional Now)

### **LEAD ACTIVITIES** (Currently Functional)
1. ✅ **Lead Created** - When lead submits form or manually added
   - Timestamp: `submitted_at` / `created_at`
   - Source: Landing page, manual entry, API
   - Agent: `found_by_agent_id`

2. ✅ **Agent Assigned** - When lead assigned to agent
   - Timestamp: When assignment changes
   - Previous agent → New agent
   - Assigned by: Manager/system

3. ✅ **Health Status Changed** - When health status updates
   - Timestamp: `health_updated_at`
   - Previous status → New status
   - Reason: Auto-calculated or manual

4. ✅ **Note Added** - When internal note added
   - Timestamp: `created_at` in `lead_notes` table
   - Author: `author_id`, `author_name`
   - Content: Note text

5. ✅ **Lead Details Updated** - When lead info edited
   - Timestamp: `updated_at`
   - Fields changed: Track specific fields
   - Updated by: Current user

6. ⚠️ **Showcase Sent** - PARTIALLY TRACKED
   - Currently: `showcase_sent_at` field exists in mock data
   - Need: Full tracking with showcase_id, properties sent, response tracking

### **LISTING ACTIVITIES** (Currently Functional)
1. ✅ **Listing Created** - When property added
   - Timestamp: `created_at`
   - Method: Manual, API, bulk import
   - Created by: `created_by` (user email)

2. ✅ **Listing Updated** - When property details changed
   - Timestamp: `updated_at`
   - Fields changed: Track what changed
   - Updated by: Current user

3. ✅ **Note Added** - When property note added
   - Timestamp: `created_at` in `property_notes` table
   - Author: `author_id`, `author_name`
   - Content: Note text

4. ✅ **PUMI Status Changed** - When marked as PUMI
   - Timestamp: When `is_pumi` changes
   - Changed by: Current user

---

## 📋 Database Schema

### **New Table: `lead_activities`**
```sql
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL, -- 'created', 'assigned', 'health_changed', 'note_added', 'updated', 'showcase_sent', 'showcase_responded', 'email_sent', 'call_logged'
    description TEXT NOT NULL, -- Human-readable description
    metadata JSONB, -- Flexible storage for activity-specific data
    performed_by VARCHAR REFERENCES public.users(id), -- Who performed the action
    performed_by_name VARCHAR, -- Cached name for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_lead_activities_lead_id (lead_id),
    INDEX idx_lead_activities_type (activity_type),
    INDEX idx_lead_activities_created_at (created_at),
    INDEX idx_lead_activities_performed_by (performed_by)
);

-- Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view lead activities for their leads"
    ON public.lead_activities FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

CREATE POLICY "Users can insert lead activities"
    ON public.lead_activities FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );
```

### **New Table: `property_activities`**
```sql
CREATE TABLE IF NOT EXISTS public.property_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL, -- 'created', 'updated', 'note_added', 'pumi_changed', 'pricing_updated', 'deleted'
    description TEXT NOT NULL,
    metadata JSONB,
    performed_by VARCHAR REFERENCES public.users(id),
    performed_by_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_property_activities_property_id (property_id),
    INDEX idx_property_activities_type (activity_type),
    INDEX idx_property_activities_created_at (created_at)
);

-- Enable RLS
ALTER TABLE public.property_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view property activities"
    ON public.property_activities FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );

CREATE POLICY "Users can insert property activities"
    ON public.property_activities FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users WHERE active = true
        )
    );
```

---

## 🔧 Activity Types & Metadata Structure

### **Lead Activity Types**

#### 1. `created`
```javascript
{
  activity_type: 'created',
  description: 'Lead created via landing page',
  metadata: {
    source: 'landing_page', // 'landing_page', 'manual', 'api', 'import'
    landing_page_url: 'https://...',
    agent_landing_page: 'agent_1',
    initial_preferences: { beds: 2, baths: 2, budget: 2000 }
  }
}
```

#### 2. `assigned`
```javascript
{
  activity_type: 'assigned',
  description: 'Assigned to Alex Agent',
  metadata: {
    previous_agent_id: 'agent_2',
    previous_agent_name: 'Bailey Broker',
    new_agent_id: 'agent_1',
    new_agent_name: 'Alex Agent',
    assigned_by: 'manager_1',
    reason: 'manual' // 'manual', 'auto_assignment', 'reassignment'
  }
}
```

#### 3. `health_changed`
```javascript
{
  activity_type: 'health_changed',
  description: 'Health status changed from Green to Yellow',
  metadata: {
    previous_status: 'green',
    new_status: 'yellow',
    previous_score: 100,
    new_score: 65,
    reason: 'no_response_48h', // Auto-calculated reason
    trigger: 'auto' // 'auto', 'manual'
  }
}
```

#### 4. `note_added`
```javascript
{
  activity_type: 'note_added',
  description: 'Added internal note',
  metadata: {
    note_id: 'uuid',
    note_preview: 'First 100 chars of note...',
    note_length: 250
  }
}
```

#### 5. `updated`
```javascript
{
  activity_type: 'updated',
  description: 'Updated lead details',
  metadata: {
    fields_changed: ['phone', 'email', 'preferences.budget'],
    changes: {
      phone: { old: '555-1234', new: '555-5678' },
      email: { old: 'old@email.com', new: 'new@email.com' },
      'preferences.budget': { old: 2000, new: 2500 }
    }
  }
}
```

#### 6. `showcase_sent`
```javascript
{
  activity_type: 'showcase_sent',
  description: 'Sent showcase with 5 properties',
  metadata: {
    showcase_id: 'showcase_123',
    property_ids: ['prop_1', 'prop_2', 'prop_3', 'prop_4', 'prop_5'],
    property_count: 5,
    landing_page_url: 'https://...',
    email_sent: true,
    include_referral_bonus: true,
    include_moving_bonus: false
  }
}
```

### **Property Activity Types**

#### 1. `created`
```javascript
{
  activity_type: 'created',
  description: 'Property added manually',
  metadata: {
    method: 'manual', // 'manual', 'api', 'bulk_import'
    import_batch_id: null,
    initial_data: { /* snapshot of property data */ }
  }
}
```

#### 2. `updated`
```javascript
{
  activity_type: 'updated',
  description: 'Updated pricing and commission',
  metadata: {
    fields_changed: ['rent_range_min', 'rent_range_max', 'commission_pct'],
    changes: {
      rent_range_min: { old: 1000, new: 1100 },
      rent_range_max: { old: 2000, new: 2200 },
      commission_pct: { old: 2.5, new: 3.0 }
    }
  }
}
```

#### 3. `pumi_changed`
```javascript
{
  activity_type: 'pumi_changed',
  description: 'Marked as PUMI',
  metadata: {
    previous_value: false,
    new_value: true,
    reason: 'High commission special'
  }
}
```

---

## 🎨 UI Components

### **Activity Log Icon** (Next to each lead/listing)
- Icon: 📋 or 🕒 (clock/history icon)
- Color: Gray normally, blue when clicked
- Position: Next to note icon in leads table
- Click: Opens activity log modal

### **Activity Log Modal**
```
┌─────────────────────────────────────────────┐
│  📋 Activity Log: Sarah Johnson             │
│  ─────────────────────────────────────────  │
│                                             │
│  🟢 Today, 2:30 PM                          │
│  Note Added by Alex Agent                   │
│  "Called lead, very interested in..."      │
│                                             │
│  📧 Today, 10:15 AM                         │
│  Showcase Sent                              │
│  5 properties sent via email                │
│  [View Showcase]                            │
│                                             │
│  👤 Yesterday, 3:45 PM                      │
│  Assigned to Alex Agent                     │
│  Previously: Unassigned                     │
│  Assigned by: Manager                       │
│                                             │
│  ⚠️ 2 days ago                              │
│  Health Status Changed                      │
│  Green → Yellow (No response in 48h)        │
│                                             │
│  ✨ 3 days ago                              │
│  Lead Created                               │
│  Source: Landing Page (Alex Agent)          │
│  Preferences: 2 bed, 2 bath, $2000/mo       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔌 Integration Points

### **Where to Log Activities**

1. **Lead Created** → `createLead()` in supabase-api.js
2. **Agent Assigned** → `assignLead()` in script.js
3. **Health Changed** → `calculateHealthStatus()` in script.js
4. **Note Added** → `createLeadNote()` in supabase-api.js
5. **Lead Updated** → `updateLead()` in supabase-api.js
6. **Showcase Sent** → `sendShowcaseEmail()` in script.js
7. **Property Created** → `createProperty()` in script.js
8. **Property Updated** → `updateProperty()` in script.js
9. **Property Note Added** → `createPropertyNote()` in supabase-api.js

---

## 📊 Benefits for Health Status

With activity logging, health status can be calculated based on:
- **Time since last activity** - Auto-decay if no activity
- **Response time** - How quickly agent responds
- **Showcase engagement** - Did lead respond to showcase?
- **Document progress** - Are documents being submitted?
- **Communication frequency** - Regular touchpoints?

**Example Health Calculation:**
```javascript
function calculateHealthScore(leadId, activities) {
  let score = 100;
  
  // Get last activity
  const lastActivity = activities[0];
  const hoursSinceActivity = (Date.now() - new Date(lastActivity.created_at)) / (1000 * 60 * 60);
  
  // Decay based on inactivity
  if (hoursSinceActivity > 72) score -= 30; // 3 days
  else if (hoursSinceActivity > 48) score -= 20; // 2 days
  else if (hoursSinceActivity > 24) score -= 10; // 1 day
  
  // Check for showcase sent
  const showcaseSent = activities.find(a => a.activity_type === 'showcase_sent');
  if (!showcaseSent && hoursSinceActivity > 24) score -= 20;
  
  // Check for notes (agent engagement)
  const recentNotes = activities.filter(a => 
    a.activity_type === 'note_added' && 
    (Date.now() - new Date(a.created_at)) < 7 * 24 * 60 * 60 * 1000 // Last 7 days
  );
  if (recentNotes.length === 0) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}
```

---

## 🚀 Next Steps

1. ✅ Create migration SQL file
2. ✅ Add API functions to log activities
3. ✅ Create UI components (activity log icon + modal)
4. ✅ Integrate logging into existing functions
5. ✅ Update health status calculation to use activity data
6. ✅ Add activity filtering/search in modal

