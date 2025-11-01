# Smart Match Customizer - Affected Files Analysis

## 📁 Files to Create (8 New Files)

### **1. Database Migration**
**File:** `migrations/043_create_smart_match_config.sql`  
**Purpose:** Create smart_match_config table with RLS policies  
**Lines:** ~150 lines  
**Dependencies:** None

---

### **2. Configuration API Module**
**File:** `src/api/smart-match-config-api.js`  
**Purpose:** CRUD operations for Smart Match configuration  
**Lines:** ~200 lines  
**Exports:**
- `getActiveConfig()` - Fetch active configuration
- `updateConfig(configData)` - Update configuration
- `resetToDefaults()` - Reset to default values
- `createConfig(configData)` - Create new configuration
- `getConfigHistory()` - Get configuration change history

**Dependencies:**
- `src/api/supabase-api.js` (getSupabase)

---

### **3. Default Configuration Values**
**File:** `src/utils/smart-match-config-defaults.js`  
**Purpose:** Define default configuration values as constants  
**Lines:** ~100 lines  
**Exports:**
- `DEFAULT_SMART_MATCH_CONFIG` - Object with all default values
- `FILTER_MODES` - Enum for filter modes
- `SORT_OPTIONS` - Enum for sort options

**Dependencies:** None

---

### **4. Enhanced Smart Match Algorithm**
**File:** `src/utils/smart-match-v2.js`  
**Purpose:** Configurable version of Smart Match algorithm  
**Lines:** ~500 lines  
**Exports:**
- `getSmartMatchesWithConfig(lead, units, config)` - Main function
- `calculateMatchScoreWithConfig(lead, unit, floorPlan, property, config)` - Scoring
- `applyConfigurableFilters(units, lead, config)` - Filtering

**Dependencies:**
- `src/utils/smart-match-config-defaults.js`
- `src/utils/smart-match.js` (for backward compatibility helpers)

---

### **5. Customizer UI Rendering**
**File:** `src/modules/admin/smart-match-customizer-ui.js`  
**Purpose:** Render customizer interface and handle UI updates  
**Lines:** ~400 lines  
**Exports:**
- `renderCustomizerModal()` - Render main modal
- `renderFilteringSection()` - Render filtering controls
- `renderScoringSection()` - Render scoring controls
- `renderDisplaySection()` - Render display settings
- `updatePreview()` - Show live preview of changes

**Dependencies:**
- `src/api/smart-match-config-api.js`
- `src/utils/smart-match-config-defaults.js`

---

### **6. Customizer Logic Module**
**File:** `src/modules/admin/smart-match-customizer.js`  
**Purpose:** Business logic for customizer (save, validate, preview)  
**Lines:** ~300 lines  
**Exports:**
- `openCustomizer()` - Open customizer modal
- `closeCustomizer()` - Close customizer modal
- `saveConfiguration()` - Validate and save config
- `previewConfiguration()` - Show sample matches with new config
- `resetConfiguration()` - Reset to defaults

**Dependencies:**
- `src/api/smart-match-config-api.js`
- `src/modules/admin/smart-match-customizer-ui.js`
- `src/utils/smart-match-v2.js`

---

### **7. User Documentation**
**File:** `docs/SMART_MATCH_CUSTOMIZER_GUIDE.md`  
**Purpose:** User guide for administrators  
**Lines:** ~200 lines  
**Content:**
- How to access customizer
- Explanation of each setting
- Best practices
- Examples and use cases
- Troubleshooting

**Dependencies:** None

---

### **8. Serverless Function (Optional)**
**File:** `api/smart-match-config.js`  
**Purpose:** Serverless endpoint for config management (if needed for service role operations)  
**Lines:** ~150 lines  
**Note:** May not be needed if RLS policies are sufficient

**Dependencies:** Supabase service role key

---

## 📝 Files to Modify (7 Existing Files)

### **1. Admin Page HTML**
**File:** `index.html`  
**Changes:**
- Add "Smart Match Customizer" button to Admin section
- Add customizer modal HTML structure
- Add form inputs for all configuration options

**Location:** Admin section (~line 1200-1400)  
**Lines to Add:** ~300 lines  
**Complexity:** Medium

---

### **2. Admin Module Index**
**File:** `src/modules/admin/index.js`  
**Changes:**
- Import and export customizer functions
- Add to module exports

**Lines to Add:** ~10 lines  
**Complexity:** Low

```javascript
// Add to imports
import * as SmartMatchCustomizer from './smart-match-customizer.js';

// Add to exports
export const {
    openCustomizer,
    closeCustomizer,
    saveConfiguration,
    previewConfiguration,
    resetConfiguration
} = SmartMatchCustomizer;
```

---

### **3. DOM Event Listeners**
**File:** `src/events/dom-event-listeners.js`  
**Changes:**
- Add event listener for "Smart Match Customizer" button
- Add event listeners for customizer form controls
- Add event listeners for save/reset/preview buttons

**Location:** Admin section event listeners  
**Lines to Add:** ~50 lines  
**Complexity:** Medium

```javascript
// Smart Match Customizer button
const smartMatchCustomizerBtn = document.getElementById('smartMatchCustomizerBtn');
if (smartMatchCustomizerBtn) {
    smartMatchCustomizerBtn.addEventListener('click', openCustomizer);
}

// Customizer modal event listeners
const saveConfigBtn = document.getElementById('saveSmartMatchConfig');
if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', saveConfiguration);
}

// ... more event listeners
```

---

### **4. Supabase API Module**
**File:** `src/api/supabase-api.js`  
**Changes:**
- Add `getSmartMatchConfig()` function
- Add `updateSmartMatchConfig()` function
- Modify `getSmartMatches()` to use configuration
- Add config caching mechanism

**Location:** End of file (~line 2400+)  
**Lines to Add:** ~100 lines  
**Complexity:** Medium

```javascript
/**
 * Get active Smart Match configuration
 * @returns {Promise<Object>} Active configuration object
 */
export async function getSmartMatchConfig() {
    const supabase = getSupabase();
    
    // Check cache first
    if (window._smartMatchConfigCache) {
        const cacheAge = Date.now() - window._smartMatchConfigCacheTime;
        if (cacheAge < 60000) { // 1 minute cache
            return window._smartMatchConfigCache;
        }
    }
    
    const { data, error } = await supabase
        .from('smart_match_config')
        .select('*')
        .eq('is_active', true)
        .single();
    
    if (error) throw error;
    
    // Cache the result
    window._smartMatchConfigCache = data;
    window._smartMatchConfigCacheTime = Date.now();
    
    return data;
}
```

---

### **5. API Wrapper**
**File:** `src/api/api-wrapper.js`  
**Changes:**
- Update `getMatches()` to fetch and use configuration
- Pass config to smart-match-v2.js

**Location:** getMatches function (~line 51)  
**Lines to Modify:** ~10 lines  
**Complexity:** Low

```javascript
async getMatches(lead_id, limit = 10) {
    // Fetch active configuration
    const config = await SupabaseAPI.getSmartMatchConfig();
    
    // Use configurable Smart Match algorithm
    const smartMatches = await SupabaseAPI.getSmartMatches(lead_id, config);
    
    // ... rest of function
}
```

---

### **6. Showcase Modals**
**File:** `src/modules/modals/showcase-modals.js`  
**Changes:**
- Update criteria banner to show active configuration settings
- Display which filters are active
- Show scoring weights being used

**Location:** openMatches function (~line 18-43)  
**Lines to Modify:** ~30 lines  
**Complexity:** Medium

```javascript
// Fetch active config to show in banner
const config = await api.getSmartMatchConfig();

const criteriaBanner = `
    <div class="info-banner">
        <div>🎯 How These Matches Were Selected</div>
        <div>
            <strong>Step 1: Hard Filters</strong>
            - Bedrooms: ${config.bedroom_match_mode} match
            - Bathrooms: ${config.bathroom_match_mode} match
            - Rent: Within ${config.rent_tolerance_percent}% of budget
            ${config.pet_policy_mode !== 'ignore' ? '- Pet Policy: ' + config.pet_policy_mode : ''}
            
            <strong>Step 2: Scoring</strong>
            - Price Match: ${config.price_match_perfect_score} pts (perfect), ${config.price_match_close_score} pts (close)
            - Commission: ${config.commission_base_bonus} pts base (${config.commission_threshold_pct}%+)
            - PUMI: ${config.pumi_bonus} pts
            ${config.use_leniency_factor ? '- Leniency: Up to ' + config.leniency_bonus_high + ' pts' : ''}
        </div>
    </div>
`;
```

---

### **7. Styles**
**File:** `styles.css`  
**Changes:**
- Add styles for customizer modal
- Add styles for form controls (sliders, radio groups)
- Add styles for preview section
- Add styles for configuration sections

**Location:** End of file  
**Lines to Add:** ~150 lines  
**Complexity:** Medium

```css
/* Smart Match Customizer Modal */
.smart-match-customizer-modal {
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
}

.config-section {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.config-section h3 {
    margin-top: 0;
    color: #374151;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
}

/* ... more styles */
```

---

## 🔄 Integration Points

### **Data Flow:**
```
User Opens Customizer
    ↓
Fetch Active Config (supabase-api.js)
    ↓
Render UI (smart-match-customizer-ui.js)
    ↓
User Modifies Settings
    ↓
Validate & Save (smart-match-customizer.js)
    ↓
Update Database (smart-match-config-api.js)
    ↓
Clear Cache
    ↓
Next Match Request Uses New Config
    ↓
smart-match-v2.js applies new rules
```

---

## 📊 Complexity Breakdown

| Component | Lines of Code | Complexity | Time Estimate |
|-----------|---------------|------------|---------------|
| Database Migration | 150 | Medium | 4 hours |
| Config API | 200 | Medium | 6 hours |
| Default Values | 100 | Low | 2 hours |
| Smart Match V2 | 500 | High | 16 hours |
| Customizer UI | 400 | High | 12 hours |
| Customizer Logic | 300 | Medium | 8 hours |
| HTML Changes | 300 | Medium | 6 hours |
| Event Listeners | 50 | Low | 2 hours |
| API Integration | 100 | Medium | 4 hours |
| Styles | 150 | Low | 3 hours |
| Documentation | 200 | Low | 3 hours |
| Testing | N/A | High | 8 hours |
| **TOTAL** | **~2,450** | **High** | **74 hours** |

**Estimated Timeline:** 8-10 working days (assuming 8 hours/day)

---

## ⚠️ Risk Factors

1. **Backward Compatibility:** Need to ensure existing Smart Match still works during transition
2. **Performance:** Config fetching on every match request (mitigated by caching)
3. **Data Migration:** Existing leads may not have all required fields for new filters
4. **UI Complexity:** Many configuration options may overwhelm users
5. **Testing Coverage:** Need comprehensive tests for all filter/scoring combinations

---

**Document Created:** 2025-10-31  
**Status:** Complete

