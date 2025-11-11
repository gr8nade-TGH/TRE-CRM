# Smart Match Customizer - Implementation Gameplan

## 📋 Executive Summary

**Goal:** Create a comprehensive Smart Match Customization system that allows administrators to configure how the Smart Match algorithm filters and scores properties for leads.

**Status:** Planning Phase  
**Estimated Complexity:** High (8-10 days of work)  
**Files to Create:** 8-10 new files  
**Files to Modify:** 5-7 existing files  
**Database Changes:** 1 new table + migration

---

## 🔍 Current Smart Match Analysis

### **How It Works Now (Fixed Algorithm)**

**Location:** `src/utils/smart-match.js` (314 lines)

#### **Hard Filters (Must Match - Binary Pass/Fail):**
1. **Bedrooms:** Exact match required (lead.bedrooms must match floorPlan.beds)
2. **Bathrooms:** Exact match required (lead.bathrooms must match floorPlan.baths)
3. **Location:** Must match city/area (lead.area_of_town or desired_neighborhoods must match property.city)

#### **Scoring System (Applied After Hard Filters):**

**Base Scoring (0-35 points):**
- **Price Match:** 25 points (within budget), 10 points (within 20% of budget)
- **Move-in Date:** 10 points (if unit available by desired date)

**Business Priority Bonuses (0-100+ points):**
- **PUMI Property:** +20 points
- **High Commission:** +80 points base (4%+), +1 point per 1% above 4%

**Display Settings:**
- **Limit:** 10 properties max (hardcoded in `getSmartMatches()`)
- **Minimum Score:** 0 (all units that pass hard filters are considered)
- **Sorting:** By total score (highest first)

#### **Current Limitations:**
- ❌ No pet policy filtering
- ❌ No income requirement checking
- ❌ No credit score filtering
- ❌ No background check consideration
- ❌ No leniency factor integration
- ❌ All thresholds are hardcoded (20% budget tolerance, 4% commission threshold, etc.)
- ❌ No admin control over scoring weights
- ❌ No ability to adjust display limits or minimum scores

---

## 🎯 Proposed Solution Architecture

### **1. Data Model - Configuration Storage**

**Approach:** Create a new `smart_match_config` table in Supabase

**Why Database Table vs. JSON/Environment Variables:**
- ✅ Allows real-time updates without code deployment
- ✅ Can be modified through UI by managers
- ✅ Supports versioning and audit trail
- ✅ Can have multiple configurations (future: per-market or per-agent)
- ✅ Integrates with existing Supabase RLS policies

**Schema Design:**

```sql
CREATE TABLE public.smart_match_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL DEFAULT 'Default Configuration',
    is_active BOOLEAN DEFAULT true,
    
    -- FILTERING CRITERIA
    bedroom_match_mode VARCHAR DEFAULT 'exact', -- 'exact', 'flexible', 'range'
    bedroom_tolerance INTEGER DEFAULT 0, -- +/- bedrooms if flexible
    
    bathroom_match_mode VARCHAR DEFAULT 'exact', -- 'exact', 'flexible', 'range'
    bathroom_tolerance DECIMAL(2,1) DEFAULT 0, -- +/- bathrooms if flexible
    
    rent_tolerance_percent INTEGER DEFAULT 20, -- % over/under budget to allow
    rent_tolerance_mode VARCHAR DEFAULT 'percentage', -- 'percentage', 'fixed_amount'
    rent_tolerance_fixed INTEGER DEFAULT 0, -- Fixed dollar amount if mode is 'fixed_amount'
    
    move_in_flexibility_days INTEGER DEFAULT 30, -- Days before/after desired move-in date
    
    pet_policy_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    
    income_requirement_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    income_multiplier DECIMAL(3,1) DEFAULT 3.0, -- Rent * multiplier = required income
    
    credit_score_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    min_credit_score INTEGER DEFAULT 600,
    
    background_check_mode VARCHAR DEFAULT 'ignore', -- 'ignore', 'strict', 'lenient'
    
    use_leniency_factor BOOLEAN DEFAULT true, -- Use property.leniency field
    
    -- SCORING WEIGHTS
    price_match_perfect_score INTEGER DEFAULT 25,
    price_match_close_score INTEGER DEFAULT 10,
    move_in_date_bonus INTEGER DEFAULT 10,
    
    commission_threshold_pct DECIMAL(5,2) DEFAULT 4.0,
    commission_base_bonus INTEGER DEFAULT 80,
    commission_scale_bonus INTEGER DEFAULT 1, -- Points per 1% above threshold
    
    pumi_bonus INTEGER DEFAULT 20,
    
    leniency_bonus_low INTEGER DEFAULT 0,
    leniency_bonus_medium INTEGER DEFAULT 5,
    leniency_bonus_high INTEGER DEFAULT 10,
    
    -- DISPLAY SETTINGS
    max_properties_to_show INTEGER DEFAULT 10,
    min_score_threshold INTEGER DEFAULT 0,
    sort_by VARCHAR DEFAULT 'score', -- 'score', 'rent_low', 'rent_high', 'availability'
    
    -- METADATA
    created_by VARCHAR REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by VARCHAR REFERENCES public.users(id)
);
```

---

### **2. UI/UX Design - Smart Match Customizer Page**

**Access Point:** Admin page → "Smart Match Customizer" button (managers/super_users only)

**Interface Type:** Dedicated modal or full-page interface

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Smart Match Customizer                          [Save]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 FILTERING CRITERIA                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Bedroom Matching                                       │  │
│  │ ○ Exact Match  ○ Flexible (±1)  ○ Range              │  │
│  │                                                        │  │
│  │ Bathroom Matching                                      │  │
│  │ ○ Exact Match  ○ Flexible (±0.5)  ○ Range            │  │
│  │                                                        │  │
│  │ Rent Range Tolerance                                   │  │
│  │ [20]% over/under budget  OR  $[___] fixed amount      │  │
│  │                                                        │  │
│  │ Move-in Date Flexibility                               │  │
│  │ ±[30] days from desired date                          │  │
│  │                                                        │  │
│  │ Pet Policy                                             │  │
│  │ ○ Ignore  ○ Strict Match  ○ Lenient                  │  │
│  │                                                        │  │
│  │ Income Requirements                                    │  │
│  │ ○ Ignore  ○ Strict (Rent × [3.0])  ○ Lenient         │  │
│  │                                                        │  │
│  │ Credit Score                                           │  │
│  │ ○ Ignore  ○ Require Min: [600]  ○ Lenient            │  │
│  │                                                        │  │
│  │ Background Checks                                      │  │
│  │ ○ Ignore  ○ Strict  ○ Lenient                        │  │
│  │                                                        │  │
│  │ ☑ Use Property Leniency Factor                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ⚖️ SCORING WEIGHTS                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Base Scoring                                           │  │
│  │ Perfect Price Match:  [25] points                     │  │
│  │ Close Price Match:    [10] points                     │  │
│  │ Move-in Date Bonus:   [10] points                     │  │
│  │                                                        │  │
│  │ Business Priority Bonuses                              │  │
│  │ Commission Threshold: [4.0]%                          │  │
│  │ Commission Base:      [80] points                     │  │
│  │ Commission Scale:     [1] point per 1% above          │  │
│  │ PUMI Bonus:           [20] points                     │  │
│  │                                                        │  │
│  │ Leniency Bonuses                                       │  │
│  │ Low Leniency:    [0] points                           │  │
│  │ Medium Leniency: [5] points                           │  │
│  │ High Leniency:   [10] points                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  📊 DISPLAY SETTINGS                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Max Properties to Show: [10]                          │  │
│  │ Minimum Score Threshold: [0]                          │  │
│  │ Sort Results By:                                       │  │
│  │ ○ Score (Highest First)  ○ Rent (Low to High)        │  │
│  │ ○ Rent (High to Low)     ○ Availability Date         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [Reset to Defaults]  [Preview Changes]  [Save Configuration]│
└─────────────────────────────────────────────────────────────┘
```

**UI Controls:**
- **Radio Buttons:** For mode selection (exact/flexible/range, ignore/strict/lenient)
- **Number Inputs:** For thresholds, tolerances, scores
- **Sliders:** For percentage values (rent tolerance, commission threshold)
- **Checkboxes:** For boolean flags (use leniency factor)
- **Dropdowns:** For sort options

---

### **3. Files to Create**

1. **`migrations/043_create_smart_match_config.sql`** (Database migration)
2. **`src/modules/admin/smart-match-customizer.js`** (Main customizer logic)
3. **`src/modules/admin/smart-match-customizer-ui.js`** (UI rendering)
4. **`src/api/smart-match-config-api.js`** (API calls for config CRUD)
5. **`src/utils/smart-match-v2.js`** (New configurable algorithm)
6. **`docs/SMART_MATCH_CUSTOMIZER_GUIDE.md`** (User documentation)
7. **`src/utils/smart-match-config-defaults.js`** (Default configuration values)
8. **`api/smart-match-config.js`** (Serverless function for config management - if needed)

---

### **4. Files to Modify**

1. **`index.html`** - Add Smart Match Customizer modal/button
2. **`src/modules/admin/index.js`** - Export new customizer functions
3. **`src/events/dom-event-listeners.js`** - Add event listeners for customizer
4. **`src/api/supabase-api.js`** - Add config fetch/update functions
5. **`src/api/api-wrapper.js`** - Update getMatches() to use configurable algorithm
6. **`src/modules/modals/showcase-modals.js`** - Update to show config-aware criteria banner
7. **`styles.css`** - Add styles for customizer UI

---

## 📝 Implementation Task Breakdown

### **Phase 1: Database & Data Layer (2 days)**
- [ ] Create migration `043_create_smart_match_config.sql`
- [ ] Add RLS policies for config table (managers/super_users only)
- [ ] Create default configuration seed data
- [ ] Test migration in Supabase

### **Phase 2: API Layer (1-2 days)**
- [ ] Create `src/api/smart-match-config-api.js`
- [ ] Add CRUD functions: `getActiveConfig()`, `updateConfig()`, `resetToDefaults()`
- [ ] Add config caching mechanism (avoid DB call on every match)
- [ ] Test API functions

### **Phase 3: Algorithm Enhancement (2-3 days)**
- [ ] Create `src/utils/smart-match-v2.js` (configurable version)
- [ ] Implement configurable hard filters (bedroom/bathroom flexibility)
- [ ] Implement configurable rent tolerance
- [ ] Implement move-in date flexibility window
- [ ] Add pet policy filtering logic
- [ ] Add income requirement filtering logic
- [ ] Add credit score filtering logic
- [ ] Add background check filtering logic
- [ ] Integrate leniency factor into scoring
- [ ] Make all scoring weights configurable
- [ ] Add configurable display settings (limit, min score, sorting)
- [ ] Write unit tests for new algorithm

### **Phase 4: UI Development (2-3 days)**
- [ ] Design customizer modal/page HTML structure
- [ ] Create `src/modules/admin/smart-match-customizer-ui.js`
- [ ] Build filtering criteria section with controls
- [ ] Build scoring weights section with sliders/inputs
- [ ] Build display settings section
- [ ] Add "Reset to Defaults" functionality
- [ ] Add "Preview Changes" functionality (show sample matches)
- [ ] Add form validation
- [ ] Style customizer interface

### **Phase 5: Integration (1 day)**
- [ ] Add "Smart Match Customizer" button to Admin page
- [ ] Wire up event listeners
- [ ] Update `getMatches()` to use new algorithm
- [ ] Update criteria banner to show active configuration
- [ ] Test end-to-end flow

### **Phase 6: Testing & Documentation (1 day)**
- [ ] Test all filtering modes
- [ ] Test all scoring configurations
- [ ] Test edge cases (missing data, null values)
- [ ] Write user documentation
- [ ] Create admin training guide
- [ ] Update CONTEXT.md

---

## 🚀 Next Steps

1. **Review and approve this gameplan**
2. **Prioritize features** (MVP vs. nice-to-have)
3. **Create detailed task list** with subtasks
4. **Begin Phase 1** (Database & Data Layer)

---

**Document Created:** 2025-10-31  
**Status:** Awaiting Approval

