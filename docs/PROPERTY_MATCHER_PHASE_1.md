# Property Matcher - Phase 1: Database Setup

## ✅ **Phase 1 Complete!**

This document describes the database schema and API functions created for the Property Matcher feature (personalized "My Matches" page for leads).

---

## 📋 **Overview**

The Property Matcher feature allows leads to:
1. Receive Smart Match emails with a unique link
2. View their matched properties on a personalized page
3. Select properties they're interested in
4. Request tours with preferred dates/times
5. Request "more options" (triggers new Smart Match email with different properties)

---

## 🗄️ **Database Schema**

### **1. New Table: `smart_match_sessions`**

Tracks each Smart Match email sent with a unique token for the "My Matches" page.

```sql
CREATE TABLE public.smart_match_sessions (
    id UUID PRIMARY KEY,
    lead_id VARCHAR NOT NULL,
    token VARCHAR NOT NULL UNIQUE,              -- e.g., "PM-JD123"
    properties_sent JSONB NOT NULL,             -- Array of property IDs
    email_log_id UUID,                          -- Link to email_logs
    sent_by VARCHAR,                            -- Agent who sent email
    viewed_at TIMESTAMPTZ,                      -- When lead opened link
    submitted_at TIMESTAMPTZ,                   -- When lead submitted form
    response_type VARCHAR,                      -- 'tour_request', 'more_options', 'no_response'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    metadata JSONB DEFAULT '{}'
);
```

**Key Features:**
- **Unique token** for each session (e.g., `PM-JD123` = Property Matcher - John Doe + Lead ID)
- **30-day expiration** for security
- **Tracks properties sent** to avoid duplicates
- **Links to email_logs** for tracking
- **Records lead engagement** (viewed, submitted)

---

### **2. New Table: `smart_match_responses`**

Records lead responses from the "My Matches" page.

```sql
CREATE TABLE public.smart_match_responses (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,                   -- Link to session
    lead_id VARCHAR NOT NULL,
    property_id VARCHAR NOT NULL,
    unit_id VARCHAR,                            -- Optional specific unit
    is_interested BOOLEAN DEFAULT true,
    preferred_tour_date TIMESTAMPTZ,            -- When they want to tour
    tour_notes TEXT,                            -- Additional notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

**Key Features:**
- **One record per property selection**
- **Optional tour date/time** selection
- **Unit-level tracking** (if lead selects specific unit)
- **Flexible metadata** for future enhancements

---

### **3. Updated Table: `leads`**

Added columns for Smart Match tracking and "send more options" workflow.

```sql
ALTER TABLE public.leads 
ADD COLUMN last_smart_match_sent_at TIMESTAMPTZ,
ADD COLUMN wants_more_options BOOLEAN DEFAULT false,
ADD COLUMN properties_already_sent JSONB DEFAULT '[]';
```

**New Columns:**
- **`last_smart_match_sent_at`** - Timestamp of last Smart Match email (for cooldown)
- **`wants_more_options`** - Flag when lead clicks "Send Me More Options"
- **`properties_already_sent`** - Array of property IDs to exclude from future sends

---

## 🔐 **Security (RLS Policies)**

### **Public Access (Anonymous Users)**
- ✅ **Read sessions** by valid token (non-expired only)
- ✅ **Insert responses** for valid sessions
- ❌ **No update/delete** permissions

### **Authenticated Users (Agents/Managers)**
- ✅ **Full access** to all sessions and responses
- ✅ **Create sessions** when sending emails
- ✅ **Track engagement** (views, submissions)

---

## 🔧 **Database Functions**

### **`generate_property_matcher_token(lead_id, lead_name)`**

Generates unique tokens in format: `PM-{initials}{leadId}`

**Examples:**
- John Doe (lead_1730674416000) → `PM-JD1730674416000`
- Sarah Smith (lead_1730674500000) → `PM-SS1730674500000`
- Multiple Words Name (lead_123) → `PM-MWN123`

**Features:**
- Extracts initials from lead name
- Uses numeric part of lead ID
- Ensures uniqueness (appends counter if needed)
- Fallback to "XX" if no name provided

---

## 📡 **API Functions**

All functions added to `src/api/supabase-api.js`:

### **1. `createPropertyMatcherSession(params)`**

Creates a new session when sending Smart Match email.

**Parameters:**
```javascript
{
    leadId: string,           // Lead ID
    leadName: string,         // Lead name (for token)
    propertyIds: string[],    // Array of property IDs sent
    emailLogId: string,       // Email log ID
    sentBy: string            // User ID who sent email
}
```

**Returns:**
```javascript
{
    success: true,
    session: { ... },         // Session object
    token: "PM-JD123",        // Generated token
    url: "/matches/PM-JD123"  // URL for "My Matches" page
}
```

**What it does:**
1. Generates unique token
2. Creates session record
3. Updates lead's `last_smart_match_sent_at`
4. Adds properties to `properties_already_sent`

---

### **2. `getPropertyMatcherSession(token)`**

Retrieves session by token (for "My Matches" page).

**Parameters:**
```javascript
token: string  // e.g., "PM-JD123"
```

**Returns:**
```javascript
{
    id: "uuid",
    lead_id: "lead_123",
    token: "PM-JD123",
    properties_sent: ["prop_1", "prop_2"],
    viewed_at: "2025-11-03T...",
    lead: {
        id: "lead_123",
        name: "John Doe",
        email: "john@example.com",
        preferences: { ... }
    },
    ...
}
```

**What it does:**
1. Validates token exists
2. Checks expiration (30 days)
3. Returns session with lead details
4. Returns `null` if not found/expired

---

### **3. `markSessionViewed(sessionId)`**

Records when lead first opens the "My Matches" link.

**Parameters:**
```javascript
sessionId: string  // Session UUID
```

**Returns:**
```javascript
{
    id: "uuid",
    viewed_at: "2025-11-03T...",
    ...
}
```

**What it does:**
1. Sets `viewed_at` timestamp
2. Only updates if not already viewed
3. Used for engagement tracking

---

### **4. `savePropertyMatcherResponses(params)`**

Saves lead's property selections and tour requests.

**Parameters:**
```javascript
{
    sessionId: string,
    leadId: string,
    selections: [
        {
            propertyId: string,
            unitId: string,        // Optional
            tourDate: string,      // ISO timestamp
            notes: string,         // Optional
            metadata: object       // Optional
        }
    ],
    responseType: 'tour_request' | 'more_options'
}
```

**Returns:**
```javascript
{
    success: true,
    responses: [ ... ],        // Created response records
    responseType: "tour_request"
}
```

**What it does:**
1. Inserts response records for each selection
2. Updates session with `submitted_at` and `response_type`
3. If `responseType === 'more_options'`:
   - Sets `wants_more_options = true` on lead
   - Resets `last_smart_match_sent_at` (clears cooldown)
4. Creates activity log entries

---

### **5. `getPropertyMatcherResponses(leadId)`**

Retrieves all responses for a lead (for CRM display).

**Parameters:**
```javascript
leadId: string
```

**Returns:**
```javascript
[
    {
        id: "uuid",
        property_id: "prop_123",
        unit_id: "A101",
        preferred_tour_date: "2025-11-10T14:00:00Z",
        tour_notes: "Prefer afternoon",
        session: { ... },
        property: { ... },
        created_at: "2025-11-03T..."
    },
    ...
]
```

**What it does:**
1. Fetches all responses for lead
2. Includes session and property details
3. Ordered by most recent first

---

## 📊 **Activity Logging**

The following activities are automatically logged to `lead_activities`:

### **When Lead Submits Selections:**
```javascript
{
    activity_type: 'property_matcher_response',
    description: 'Interested in property via Property Matcher - Tour requested',
    metadata: {
        session_id: "uuid",
        property_id: "prop_123",
        unit_id: "A101",
        tour_date: "2025-11-10T14:00:00Z",
        response_type: "tour_request"
    }
}
```

### **When Lead Requests More Options:**
```javascript
{
    activity_type: 'requested_more_options',
    description: 'Requested more property options (3 properties viewed)',
    metadata: {
        session_id: "uuid",
        property_count: 3,
        response_type: "more_options"
    }
}
```

---

## 🧪 **Testing Phase 1**

### **Step 1: Run Migration**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/049_create_property_matcher_tables.sql`
3. Click **Run**
4. Verify success message appears

### **Step 2: Verify Tables Created**

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('smart_match_sessions', 'smart_match_responses');

-- Check leads table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('last_smart_match_sent_at', 'wants_more_options', 'properties_already_sent');
```

### **Step 3: Test Token Generation**

```sql
-- Test token generation function
SELECT generate_property_matcher_token('lead_1730674416000', 'John Doe');
-- Expected: PM-JD1730674416000

SELECT generate_property_matcher_token('lead_123', 'Sarah Smith');
-- Expected: PM-SS123
```

### **Step 4: Test API Functions (Browser Console)**

```javascript
// Test session creation
const session = await window.SupabaseAPI.createPropertyMatcherSession({
    leadId: 'YOUR_LEAD_ID',
    leadName: 'Test Lead',
    propertyIds: ['prop_1', 'prop_2', 'prop_3'],
    emailLogId: null,
    sentBy: window.state.user.id
});
console.log('Session created:', session);

// Test session retrieval
const retrieved = await window.SupabaseAPI.getPropertyMatcherSession(session.token);
console.log('Session retrieved:', retrieved);

// Test mark as viewed
const viewed = await window.SupabaseAPI.markSessionViewed(session.session.id);
console.log('Session viewed:', viewed);

// Test save responses
const responses = await window.SupabaseAPI.savePropertyMatcherResponses({
    sessionId: session.session.id,
    leadId: 'YOUR_LEAD_ID',
    selections: [
        {
            propertyId: 'prop_1',
            unitId: 'A101',
            tourDate: new Date('2025-11-10T14:00:00Z').toISOString(),
            notes: 'Prefer afternoon'
        }
    ],
    responseType: 'tour_request'
});
console.log('Responses saved:', responses);

// Test get responses
const allResponses = await window.SupabaseAPI.getPropertyMatcherResponses('YOUR_LEAD_ID');
console.log('All responses:', allResponses);
```

---

## ✅ **Phase 1 Checklist**

- [x] Migration script created (`049_create_property_matcher_tables.sql`)
- [x] Tables created (`smart_match_sessions`, `smart_match_responses`)
- [x] Leads table updated (3 new columns)
- [x] Indexes created for performance
- [x] RLS policies configured
- [x] Token generation function created
- [x] API functions added to `supabase-api.js`:
  - [x] `createPropertyMatcherSession()`
  - [x] `getPropertyMatcherSession()`
  - [x] `markSessionViewed()`
  - [x] `savePropertyMatcherResponses()`
  - [x] `getPropertyMatcherResponses()`
- [x] Activity logging integration
- [x] Documentation created

---

## 🚀 **Next Steps: Phase 2**

Once Phase 1 is approved and tested:

1. **Update `sendSmartMatchEmail()` function** to create session and include token in email
2. **Update email template** to include "View My Matches" button with token URL
3. **Add token to email variables**
4. **Test end-to-end email flow**

---

**Phase 1 Status:** ✅ **READY FOR REVIEW**  
**Awaiting:** User approval to proceed to Phase 2

