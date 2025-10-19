# 🎯 Activity Events Implementation Plan

**Date:** 2025-10-19  
**Status:** Planning Phase

---

## 📊 Current Activity Events

### **Lead Activities (Currently Implemented)**
- ✅ `lead_created` - When a lead is submitted via landing page or manually created
- ✅ `note_added` - When an internal note is added to a lead

### **Property Activities (Currently Implemented)**
- ✅ `property_created` - When a property is added to inventory
- ✅ `note_added` - When a note is added to a property

---

## 🚀 Required New Activity Events

### **LEAD ACTIVITIES (High Priority)**

#### **1. Agent Assignment Changes**
**Event:** `agent_assigned`  
**Trigger:** When `assigned_agent_id` changes  
**Description:** "Agent assigned: [Agent Name]"  
**Metadata:**
```json
{
  "previous_agent_id": "uuid or null",
  "previous_agent_name": "John Doe or 'Unassigned'",
  "new_agent_id": "uuid",
  "new_agent_name": "Jane Smith",
  "assigned_by": "manager@tre.com",
  "assigned_by_name": "Manager Name"
}
```

**Event:** `agent_unassigned`  
**Trigger:** When `assigned_agent_id` changes from a value to null  
**Description:** "Agent unassigned: [Previous Agent Name]"  
**Metadata:**
```json
{
  "previous_agent_id": "uuid",
  "previous_agent_name": "John Doe",
  "unassigned_by": "manager@tre.com",
  "unassigned_by_name": "Manager Name",
  "reason": "Reassignment" // optional
}
```

---

#### **2. Health Status Changes**
**Event:** `health_status_changed`  
**Trigger:** When `health_status` changes (green → yellow → red → closed)  
**Description:** "Health status changed from [Old Status] to [New Status]"  
**Metadata:**
```json
{
  "previous_status": "green",
  "new_status": "yellow",
  "previous_score": 95,
  "new_score": 65,
  "reason": "No activity in 48 hours",
  "auto_calculated": true
}
```

---

#### **3. Inactivity Detection (CRITICAL for Health Status)**
**Event:** `inactivity_detected`  
**Trigger:** Automated check - No new activity in past 24 hours  
**Description:** "No activity detected in past 24 hours"  
**Metadata:**
```json
{
  "hours_since_last_activity": 24,
  "last_activity_type": "note_added",
  "last_activity_date": "2025-10-18T10:30:00Z",
  "current_health_status": "yellow",
  "impact": "Health score decreased by 10 points"
}
```

**Implementation:** 
- Scheduled job (daily or hourly)
- Checks all active leads
- Creates activity if no activity in past 24 hours
- Triggers health status recalculation

---

#### **4. Document Progress Events**
**Event:** `document_step_completed`  
**Trigger:** When a document step is marked complete  
**Description:** "Completed document step: [Step Name]"  
**Metadata:**
```json
{
  "step_name": "Application Submitted",
  "step_number": 1,
  "total_steps": 8,
  "completion_percentage": 12.5,
  "time_to_complete": "2 days 3 hours"
}
```

**Event:** `document_step_started`  
**Trigger:** When a new document step is started  
**Description:** "Started document step: [Step Name]"  
**Metadata:**
```json
{
  "step_name": "Background Check",
  "step_number": 3,
  "previous_step": "Application Submitted"
}
```

---

#### **5. Lead Status Changes**
**Event:** `lead_status_changed`  
**Trigger:** When lead status changes (new → contacted → qualified → closed)  
**Description:** "Lead status changed from [Old] to [New]"  
**Metadata:**
```json
{
  "previous_status": "new",
  "new_status": "contacted",
  "changed_by": "agent@tre.com",
  "changed_by_name": "Agent Name"
}
```

---

#### **6. Communication Events**
**Event:** `email_sent`  
**Trigger:** When an email is sent to the lead  
**Description:** "Email sent: [Subject]"  
**Metadata:**
```json
{
  "subject": "Welcome to TRE!",
  "template_used": "welcome_email",
  "sent_by": "agent@tre.com",
  "sent_by_name": "Agent Name"
}
```

**Event:** `phone_call_logged`  
**Trigger:** When a phone call is logged  
**Description:** "Phone call: [Duration] - [Outcome]"  
**Metadata:**
```json
{
  "duration_minutes": 15,
  "outcome": "Left voicemail",
  "notes": "Called to discuss application",
  "called_by": "agent@tre.com",
  "called_by_name": "Agent Name"
}
```

---

#### **7. Preference Changes**
**Event:** `preferences_updated`  
**Trigger:** When lead preferences are modified  
**Description:** "Lead preferences updated"  
**Metadata:**
```json
{
  "changes": {
    "bedrooms": { "old": "1-2", "new": "2-3" },
    "budget": { "old": "$1000-$1500", "new": "$1500-$2000" }
  },
  "updated_by": "agent@tre.com",
  "updated_by_name": "Agent Name"
}
```

---

### **PROPERTY ACTIVITIES (High Priority)**

#### **1. Property Information Changes**
**Event:** `property_updated`  
**Trigger:** When property details are modified  
**Description:** "Property information updated"  
**Metadata:**
```json
{
  "changes": {
    "rent_range_min": { "old": 1000, "new": 1100 },
    "rent_range_max": { "old": 1500, "new": 1600 },
    "name": { "old": "Sunset Apartments", "new": "Sunset Luxury Apartments" }
  },
  "updated_by": "manager@tre.com",
  "updated_by_name": "Manager Name",
  "timestamp": "2025-10-19T14:30:00Z"
}
```

---

#### **2. Availability Changes**
**Event:** `availability_changed`  
**Trigger:** When `is_available` changes  
**Description:** "Property marked as [available/unavailable]"  
**Metadata:**
```json
{
  "previous_status": true,
  "new_status": false,
  "reason": "All units rented",
  "changed_by": "manager@tre.com",
  "changed_by_name": "Manager Name"
}
```

---

#### **3. PUMI Status Changes**
**Event:** `pumi_status_changed`  
**Trigger:** When `is_pumi` changes  
**Description:** "PUMI status changed to [Yes/No]"  
**Metadata:**
```json
{
  "previous_status": false,
  "new_status": true,
  "changed_by": "manager@tre.com",
  "changed_by_name": "Manager Name",
  "effective_date": "2025-11-01"
}
```

---

#### **4. Property Deletion**
**Event:** `property_deleted`  
**Trigger:** When property is soft-deleted or marked unavailable  
**Description:** "Property removed from active inventory"  
**Metadata:**
```json
{
  "reason": "Property sold",
  "deleted_by": "manager@tre.com",
  "deleted_by_name": "Manager Name",
  "property_snapshot": {
    "name": "Sunset Apartments",
    "address": "123 Main St"
  }
}
```

---

#### **5. Special/Promotion Added**
**Event:** `special_added`  
**Trigger:** When a special is added to the property  
**Description:** "Special added: [Special Name]"  
**Metadata:**
```json
{
  "special_id": "uuid",
  "special_name": "First Month Free",
  "special_value": "$1500 off",
  "start_date": "2025-10-20",
  "end_date": "2025-11-20",
  "added_by": "manager@tre.com"
}
```

---

## 🔄 Implementation Priority

### **Phase 1: Critical Events (Implement First)**
1. ✅ `agent_assigned` / `agent_unassigned` - Track agent changes
2. ✅ `health_status_changed` - Track health transitions
3. ✅ `inactivity_detected` - Critical for health scoring
4. ✅ `property_updated` - Track listing changes

### **Phase 2: Important Events**
5. `document_step_completed` / `document_step_started`
6. `availability_changed`
7. `pumi_status_changed`
8. `preferences_updated`

### **Phase 3: Nice-to-Have Events**
9. `email_sent` / `phone_call_logged`
10. `special_added`
11. `property_deleted`

---

## 🛠️ Implementation Steps

### **Step 1: Update `updateLead` Function**
Add activity logging to `src/api/supabase-api.js`:

```javascript
export async function updateLead(id, leadData, performedBy = null, performedByName = null) {
    const supabase = getSupabase();
    
    // Get current lead data to compare changes
    const { data: currentLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
    
    // Update the lead
    const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating lead:', error);
        throw error;
    }
    
    // Log activities for changes
    try {
        // Check for agent assignment change
        if (leadData.assigned_agent_id !== undefined && 
            currentLead.assigned_agent_id !== leadData.assigned_agent_id) {
            await createLeadActivity({
                lead_id: id,
                activity_type: leadData.assigned_agent_id ? 'agent_assigned' : 'agent_unassigned',
                description: leadData.assigned_agent_id 
                    ? `Agent assigned: ${performedByName || 'Unknown'}`
                    : `Agent unassigned`,
                metadata: {
                    previous_agent_id: currentLead.assigned_agent_id,
                    new_agent_id: leadData.assigned_agent_id
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            });
        }
        
        // Check for health status change
        if (leadData.health_status !== undefined && 
            currentLead.health_status !== leadData.health_status) {
            await createLeadActivity({
                lead_id: id,
                activity_type: 'health_status_changed',
                description: `Health status changed from ${currentLead.health_status} to ${leadData.health_status}`,
                metadata: {
                    previous_status: currentLead.health_status,
                    new_status: leadData.health_status
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            });
        }
    } catch (activityError) {
        console.error('⚠️ Failed to log update activity:', activityError);
    }
    
    return data;
}
```

### **Step 2: Update `updateProperty` Function**
Similar pattern for property updates.

### **Step 3: Create Inactivity Detection Job**
Create a scheduled function to detect inactive leads:

```javascript
// Run this daily or hourly
export async function detectInactiveLeads() {
    const supabase = getSupabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Get all active leads
    const { data: leads } = await supabase
        .from('leads')
        .select('id, last_activity_at')
        .neq('health_status', 'closed')
        .lt('last_activity_at', twentyFourHoursAgo);
    
    // Create inactivity activity for each
    for (const lead of leads) {
        await createLeadActivity({
            lead_id: lead.id,
            activity_type: 'inactivity_detected',
            description: 'No activity detected in past 24 hours',
            metadata: {
                hours_since_last_activity: Math.floor((Date.now() - new Date(lead.last_activity_at)) / (1000 * 60 * 60)),
                last_activity_date: lead.last_activity_at
            },
            performed_by: 'system',
            performed_by_name: 'Automated System'
        });
    }
}
```

---

## 📝 Notes

- All activity events should update `last_activity_at` timestamp on the parent record
- Activity logging should be non-blocking (use try/catch)
- System-generated activities should use `performed_by: 'system'`
- All metadata should be JSON serializable
- Consider adding activity filtering/search in the UI

---

**Next Steps:**
1. Implement Phase 1 critical events
2. Test activity logging for agent assignment
3. Test activity logging for health status changes
4. Create inactivity detection scheduled job
5. Update UI to display new activity types with appropriate icons/colors

