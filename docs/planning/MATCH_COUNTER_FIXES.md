# Match Counter Fixes - Implementation Plan

## Issues to Fix

### **Issue 1: Match Counter Height** ✅
**Problem:** Counter takes up too much vertical space  
**Solution:** Reduce padding and font sizes in CSS

**Changes:**
- Reduce `.mc-match-counter` padding from 20px to 12px
- Reduce `.mc-counter-display` padding from 24px to 16px
- Reduce `.mc-counter-display` min-height from 120px to 80px
- Reduce `.mc-counter-value` font-size from 56px to 42px
- Reduce `.mc-counter-header` margin-bottom from 16px to 12px
- Reduce `.mc-counter-display` margin-bottom from 12px to 8px

---

### **Issue 2: Save Button Behavior** ✅
**Problem:** Unclear save workflow and missing top save button  
**Solution:** 
1. Clarify that match counter updates in real-time WITHOUT saving
2. Add duplicate "SAVE CONFIGURATION" button at top of page (near counter)
3. Fix save button error

**Workflow Clarification:**
- ✅ Match counter updates in real-time as you adjust filters (NO SAVE REQUIRED)
- ✅ Counter uses test lead to preview how many properties would match
- ❌ Configuration is NOT saved to database until you click "SAVE CONFIGURATION"
- ✅ After saving, the new config becomes active for all Smart Match operations

**Changes:**
- Add "SAVE CONFIGURATION" button in match counter component
- Update counter help text to clarify real-time preview behavior
- Fix save button error (database table issue)

---

### **Issue 3: Missing Database Table** ✅
**Problem:** `smart_match_config` table doesn't exist in Supabase  
**Error:** `PGRST205 - Could not find the table 'public.smart_match_config'`

**Root Cause:** Migration `043_create_smart_match_config.sql` exists but hasn't been run in Supabase

**Solution:**
1. Run migration in Supabase SQL Editor
2. Verify table creation
3. Verify RLS policies
4. Verify default configuration inserted

**Migration File:** `migrations/043_create_smart_match_config.sql`

**Table Schema:**
```sql
CREATE TABLE public.smart_match_config (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Filtering Criteria
    bedroom_match_mode VARCHAR DEFAULT 'exact',
    bedroom_tolerance INTEGER DEFAULT 0,
    bathroom_match_mode VARCHAR DEFAULT 'exact',
    bathroom_tolerance DECIMAL(2,1) DEFAULT 0,
    rent_tolerance_percent INTEGER DEFAULT 20,
    rent_tolerance_mode VARCHAR DEFAULT 'percentage',
    rent_tolerance_fixed INTEGER DEFAULT 0,
    move_in_flexibility_days INTEGER DEFAULT 30,
    pet_policy_mode VARCHAR DEFAULT 'ignore',
    income_requirement_mode VARCHAR DEFAULT 'ignore',
    income_multiplier DECIMAL(3,1) DEFAULT 3.0,
    credit_score_mode VARCHAR DEFAULT 'ignore',
    min_credit_score INTEGER DEFAULT 600,
    background_check_mode VARCHAR DEFAULT 'ignore',
    use_leniency_factor BOOLEAN DEFAULT true,
    
    -- Scoring Weights
    price_match_perfect_score INTEGER DEFAULT 25,
    price_match_close_score INTEGER DEFAULT 10,
    move_in_date_bonus INTEGER DEFAULT 10,
    commission_threshold_pct DECIMAL(5,2) DEFAULT 4.0,
    commission_base_bonus INTEGER DEFAULT 80,
    commission_scale_bonus INTEGER DEFAULT 1,
    pumi_bonus INTEGER DEFAULT 20,
    leniency_bonus_low INTEGER DEFAULT 0,
    leniency_bonus_medium INTEGER DEFAULT 5,
    leniency_bonus_high INTEGER DEFAULT 10,
    
    -- Display Settings
    max_properties_to_show INTEGER DEFAULT 10,
    min_score_threshold INTEGER DEFAULT 0,
    sort_by VARCHAR DEFAULT 'score',
    
    -- Metadata
    created_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by VARCHAR REFERENCES users(id)
);
```

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Managers and Super Users only
- UPDATE: Managers and Super Users only
- DELETE: Super Users only

---

### **Issue 4: Duplicate HTML IDs** ✅
**Problem:** Console shows duplicate ID warnings  
**Root Cause:** Old Smart Match modal (lines 2900-3000) has same IDs as new Mission Control page

**Duplicate IDs Found:**
- `bedroomMatchMode` (line 1015 and 2915)
- `bathroomMatchMode` (line 1027 and 2927)
- `rentTolerancePercent` (line 1039 and 2939)
- And more...

**Solution:** Remove old Smart Match modal entirely (it's been replaced by full-page Mission Control UI)

**Lines to Remove:** ~2900-3000 in index.html (old Smart Match Configuration modal)

---

## Implementation Steps

### **Step 1: Run Database Migration** (PRIORITY)
```sql
-- Copy entire contents of migrations/043_create_smart_match_config.sql
-- Paste into Supabase SQL Editor
-- Execute
```

### **Step 2: Fix Match Counter Height**
File: `src/styles/mission-control.css`
- Reduce padding and font sizes as specified above

### **Step 3: Add Top Save Button**
File: `src/modules/admin/mission-control-ui.js`
- Add save button to `createMatchCounter()` HTML
- Update help text to clarify real-time preview

File: `src/modules/admin/smart-match-page.js`
- Add event listener for top save button

### **Step 4: Remove Duplicate IDs**
File: `index.html`
- Remove old Smart Match Configuration modal (lines ~2900-3000)

### **Step 5: Update API to Match Migration Schema**
File: `src/api/smart-match-config-api.js`
- Verify field names match migration schema
- Update `extractFormData()` to use correct field names

**Field Name Mapping:**
```javascript
// Form uses these names:
bedroom_match_mode
bathroom_match_mode
rent_tolerance_percent
pet_policy_strict  // ❌ WRONG - not in migration
parking_required   // ❌ WRONG - not in migration
availability_window_days  // ❌ WRONG - should be move_in_flexibility_days

// Migration uses these names:
bedroom_match_mode ✅
bathroom_match_mode ✅
rent_tolerance_percent ✅
pet_policy_mode  // ✅ CORRECT (not pet_policy_strict)
move_in_flexibility_days  // ✅ CORRECT (not availability_window_days)
```

**CRITICAL:** The form field names don't match the database column names!

---

## Field Name Mismatches to Fix

### **Current Form Fields → Database Columns**

| Form Field Name | Database Column Name | Status |
|----------------|---------------------|--------|
| `bedroom_match_mode` | `bedroom_match_mode` | ✅ Match |
| `bathroom_match_mode` | `bathroom_match_mode` | ✅ Match |
| `rent_tolerance_percent` | `rent_tolerance_percent` | ✅ Match |
| `pet_policy_strict` | `pet_policy_mode` | ❌ Mismatch |
| `parking_required` | *(doesn't exist)* | ❌ Missing |
| `availability_window_days` | `move_in_flexibility_days` | ❌ Mismatch |
| `price_match_weight` | `price_match_perfect_score` | ❌ Mismatch |
| `move_in_date_weight` | `move_in_date_bonus` | ❌ Mismatch |
| `commission_weight` | `commission_base_bonus` | ❌ Mismatch |
| `pumi_weight` | `pumi_bonus` | ❌ Mismatch |
| `leniency_weight` | *(doesn't exist)* | ❌ Missing |
| `commission_threshold` | `commission_threshold_pct` | ✅ Match |
| `max_results` | `max_properties_to_show` | ❌ Mismatch |
| `sort_by` | `sort_by` | ✅ Match |
| `min_score_threshold` | `min_score_threshold` | ✅ Match |

**Decision:** Update form field names and IDs to match database schema exactly

---

## Testing Checklist

- [ ] Database migration runs successfully in Supabase
- [ ] Default configuration is inserted
- [ ] RLS policies allow managers to save config
- [ ] Match counter height is reduced
- [ ] Top save button appears and works
- [ ] Bottom save button works
- [ ] No duplicate ID warnings in console
- [ ] Configuration saves to database successfully
- [ ] Match counter updates in real-time without saving
- [ ] Saved configuration persists after page reload

