# 📊 Activity Tracking - Implementation Plan

## ✅ What's Been Created

### 1. **Database Schema** (`migrations/003_activity_logging.sql`)
- ✅ `lead_activities` table with full RLS policies
- ✅ `property_activities` table with full RLS policies
- ✅ Automatic triggers to log updates
- ✅ Indexes for performance
- ✅ Realtime subscriptions enabled

### 2. **API Functions** (`src/api/supabase-api.js`)
- ✅ `getLeadActivities(leadId)` - Fetch all activities for a lead
- ✅ `createLeadActivity(activityData)` - Log a new lead activity
- ✅ `getPropertyActivities(propertyId)` - Fetch all activities for a property
- ✅ `createPropertyActivity(activityData)` - Log a new property activity

### 3. **Documentation**
- ✅ `ACTIVITY_LOGGING_SYSTEM.md` - Comprehensive design document
- ✅ This implementation plan

---

## 🎯 What We're Tracking (Currently Functional)

### **LEAD ACTIVITIES**

| Activity Type | When It Happens | Data Captured | Status |
|--------------|-----------------|---------------|--------|
| **created** | Lead submits form or manually added | Source (landing page/manual/API), agent, initial preferences | ⏳ Need to integrate |
| **assigned** | Agent assigned/reassigned | Previous agent → New agent, assigned by whom | ⏳ Need to integrate |
| **health_changed** | Health status updates | Old status → New status, score, reason | ⏳ Need to integrate |
| **note_added** | Internal note added | Note ID, preview, author | ⏳ Need to integrate |
| **updated** | Lead details edited | Fields changed, old/new values | ✅ Auto-logged by trigger |
| **showcase_sent** | Showcase email sent | Showcase ID, properties, landing page URL | ⏳ Need to integrate |

### **PROPERTY ACTIVITIES**

| Activity Type | When It Happens | Data Captured | Status |
|--------------|-----------------|---------------|--------|
| **created** | Property added | Method (manual/API/import), created by | ⏳ Need to integrate |
| **updated** | Property details changed | Fields changed, old/new values | ✅ Auto-logged by trigger |
| **note_added** | Property note added | Note ID, preview, author | ⏳ Need to integrate |
| **pumi_changed** | PUMI status toggled | Old value → New value, reason | ✅ Auto-logged by trigger |
| **pricing_updated** | Rent/commission changed | Old prices → New prices | ✅ Auto-logged by trigger |

---

## 🚀 Next Steps to Complete Implementation

### **Step 1: Run Migration** ⏳
```bash
# In Supabase SQL Editor, run:
migrations/003_activity_logging.sql
```

### **Step 2: Add Activity Log Icon to UI** ⏳
**Location:** Leads table and Listings table

**Icon Design:**
- 📋 or 🕒 icon next to note icon
- Gray normally, blue when has activities
- Click opens activity log modal

**Code to add in `script.js` (renderLeads function):**
```javascript
const activityIcon = `<span class="activity-icon" data-lead-id="${lead.id}" style="cursor: pointer; font-size: 16px; color: #6b7280; margin-left: 8px;" title="View activity log">📋</span>`;
```

### **Step 3: Create Activity Log Modal** ⏳
**Location:** `index.html`

```html
<!-- Activity Log Modal -->
<div id="activityLogModal" class="modal hidden">
    <div class="modal-card" style="max-width: 800px;">
        <div class="modal-header">
            <h3 id="activityLogTitle">📋 Activity Log</h3>
            <button id="closeActivityLog" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
            <div id="activityLogContent" style="max-height: 600px; overflow-y: auto;">
                <!-- Activities will be populated here -->
            </div>
        </div>
        <div class="modal-footer">
            <button id="closeActivityLogBtn" class="btn btn-secondary">Close</button>
        </div>
    </div>
</div>
```

### **Step 4: Create Activity Rendering Functions** ⏳
**Location:** `script.js`

```javascript
async function openActivityLogModal(entityId, entityType) {
    // entityType: 'lead' or 'property'
    const activities = entityType === 'lead' 
        ? await SupabaseAPI.getLeadActivities(entityId)
        : await SupabaseAPI.getPropertyActivities(entityId);
    
    const title = entityType === 'lead' ? 'Lead Activity Log' : 'Property Activity Log';
    document.getElementById('activityLogTitle').textContent = `📋 ${title}`;
    
    const content = renderActivityLog(activities);
    document.getElementById('activityLogContent').innerHTML = content;
    
    showModal('activityLogModal');
}

function renderActivityLog(activities) {
    if (activities.length === 0) {
        return '<p class="subtle">No activities recorded yet</p>';
    }
    
    return activities.map(activity => {
        const icon = getActivityIcon(activity.activity_type);
        const timeAgo = formatTimeAgo(activity.created_at);
        
        return `
            <div class="activity-item" style="padding: 16px; border-bottom: 1px solid #e4e7ec;">
                <div style="display: flex; align-items: start; gap: 12px;">
                    <span style="font-size: 24px;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1a202c;">${activity.description}</div>
                        <div style="font-size: 0.875rem; color: #6b7280; margin-top: 4px;">
                            ${activity.performed_by_name || 'System'} · ${timeAgo}
                        </div>
                        ${renderActivityMetadata(activity)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getActivityIcon(activityType) {
    const icons = {
        'created': '✨',
        'assigned': '👤',
        'health_changed': '⚠️',
        'note_added': '📝',
        'updated': '✏️',
        'showcase_sent': '📧',
        'showcase_responded': '💬',
        'pumi_changed': '⭐',
        'pricing_updated': '💰'
    };
    return icons[activityType] || '📋';
}

function renderActivityMetadata(activity) {
    if (!activity.metadata) return '';
    
    const metadata = activity.metadata;
    let html = '<div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 6px; font-size: 0.875rem;">';
    
    // Render based on activity type
    if (activity.activity_type === 'assigned' && metadata.new_agent_name) {
        html += `<div>Assigned to: <strong>${metadata.new_agent_name}</strong></div>`;
        if (metadata.previous_agent_name) {
            html += `<div>Previously: ${metadata.previous_agent_name}</div>`;
        }
    }
    
    if (activity.activity_type === 'health_changed') {
        html += `<div>Status: ${metadata.previous_status} → ${metadata.new_status}</div>`;
        html += `<div>Score: ${metadata.previous_score} → ${metadata.new_score}</div>`;
    }
    
    if (activity.activity_type === 'showcase_sent' && metadata.property_count) {
        html += `<div>${metadata.property_count} properties sent</div>`;
        if (metadata.landing_page_url) {
            html += `<div><a href="${metadata.landing_page_url}" target="_blank">View Showcase</a></div>`;
        }
    }
    
    if (activity.activity_type === 'updated' && metadata.fields_changed) {
        html += `<div>Fields changed: ${metadata.fields_changed.filter(f => f).join(', ')}</div>`;
    }
    
    html += '</div>';
    return html;
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return then.toLocaleDateString();
}
```

### **Step 5: Integrate Activity Logging** ⏳

**5.1 Log Lead Creation**
```javascript
// In createLead function (when lead is created)
await SupabaseAPI.createLeadActivity({
    lead_id: newLead.id,
    activity_type: 'created',
    description: 'Lead created via landing page',
    metadata: {
        source: 'landing_page',
        landing_page_url: window.location.href,
        agent_landing_page: agentId,
        initial_preferences: newLead.prefs
    },
    performed_by: window.currentUser?.email,
    performed_by_name: window.currentUser?.user_metadata?.name || 'System'
});
```

**5.2 Log Agent Assignment**
```javascript
// In assignLead function
await SupabaseAPI.createLeadActivity({
    lead_id: leadId,
    activity_type: 'assigned',
    description: `Assigned to ${newAgentName}`,
    metadata: {
        previous_agent_id: oldAgentId,
        previous_agent_name: oldAgentName,
        new_agent_id: newAgentId,
        new_agent_name: newAgentName,
        assigned_by: window.currentUser?.email,
        reason: 'manual'
    },
    performed_by: window.currentUser?.email,
    performed_by_name: window.currentUser?.user_metadata?.name
});
```

**5.3 Log Note Added**
```javascript
// In createLeadNote function (after note is created)
await SupabaseAPI.createLeadActivity({
    lead_id: noteData.lead_id,
    activity_type: 'note_added',
    description: 'Added internal note',
    metadata: {
        note_id: result.id,
        note_preview: noteData.content.substring(0, 100),
        note_length: noteData.content.length
    },
    performed_by: noteData.author_id,
    performed_by_name: noteData.author_name
});
```

**5.4 Log Showcase Sent**
```javascript
// In sendShowcaseEmail function (after showcase is sent)
await SupabaseAPI.createLeadActivity({
    lead_id: lead.id,
    activity_type: 'showcase_sent',
    description: `Sent showcase with ${selectedProperties.length} properties`,
    metadata: {
        showcase_id: showcaseId,
        property_ids: selectedProperties.map(p => p.id),
        property_count: selectedProperties.length,
        landing_page_url: landingUrl,
        email_sent: true,
        include_referral_bonus: includeReferralBonus,
        include_moving_bonus: includeMovingBonus
    },
    performed_by: window.currentUser?.email,
    performed_by_name: window.currentUser?.user_metadata?.name
});
```

**5.5 Log Property Creation**
```javascript
// In createProperty function (after property is created)
await SupabaseAPI.createPropertyActivity({
    property_id: propertyData.id,
    activity_type: 'created',
    description: 'Property added manually',
    metadata: {
        method: 'manual',
        initial_data: propertyData
    },
    performed_by: window.currentUser?.email,
    performed_by_name: window.currentUser?.user_metadata?.name
});
```

---

## 🎨 UI Styling

Add to `styles.css`:

```css
/* Activity Log Icon */
.activity-icon {
    display: inline-block;
    transition: all 0.2s ease;
}

.activity-icon:hover {
    transform: scale(1.15);
    color: #3b82f6 !important;
}

/* Activity Item */
.activity-item {
    transition: background 0.2s ease;
}

.activity-item:hover {
    background: #f9fafb;
}

.activity-item:last-child {
    border-bottom: none !important;
}
```

---

## 📊 Benefits

### **For Health Status Calculation**
- Track time since last activity
- Monitor agent response time
- Detect showcase engagement
- Measure communication frequency

### **For Document Tracking**
- Complete audit trail
- See who uploaded what and when
- Track document status changes
- Compliance and legal protection

### **For Performance Analytics**
- Agent activity metrics
- Response time analysis
- Conversion funnel tracking
- Identify bottlenecks

---

## 🔍 Testing Checklist

- [ ] Run migration in Supabase
- [ ] Test `getLeadActivities()` API call
- [ ] Test `createLeadActivity()` API call
- [ ] Test `getPropertyActivities()` API call
- [ ] Test `createPropertyActivity()` API call
- [ ] Add activity log icon to leads table
- [ ] Add activity log icon to listings table
- [ ] Create activity log modal
- [ ] Test opening activity log modal
- [ ] Test activity rendering
- [ ] Integrate logging into lead creation
- [ ] Integrate logging into agent assignment
- [ ] Integrate logging into note creation
- [ ] Integrate logging into showcase sending
- [ ] Integrate logging into property creation
- [ ] Test automatic update logging (triggers)
- [ ] Verify timestamps are correct
- [ ] Verify metadata is captured correctly
- [ ] Test activity filtering/search (future)

---

## 🚀 Ready to Implement?

**Next immediate steps:**
1. Run the migration in Supabase SQL Editor
2. Add activity log icons to the UI
3. Create the activity log modal
4. Integrate logging into existing functions

**Want me to proceed with implementation?**

