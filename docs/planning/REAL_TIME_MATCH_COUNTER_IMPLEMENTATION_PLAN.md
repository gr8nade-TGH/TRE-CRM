# Real-Time Match Counter - Implementation Plan

## 🎯 Overview

Add a live match counter to the Smart Match Configuration page that shows how many properties would match based on current filter settings, updating in real-time as users adjust controls.

---

## 📋 Requirements Summary

### **Functionality:**
- Display count of properties matching current filter settings
- Update in real-time as user adjusts filter controls
- Query database without running full Smart Match algorithm
- Debounce queries to avoid performance issues
- Show loading states during fetch

### **Visual Design:**
- Match mission control aesthetic
- Color-coded status: green (10+), yellow (1-9), red (0)
- Prominent but not intrusive placement
- Gauge or badge-style indicator

### **Technical:**
- Lightweight COUNT query (not full Smart Match)
- 500ms debounce on filter changes
- Only apply FILTERING criteria (no scoring)
- Handle edge cases (no test lead, database errors)

---

## 🏗️ Technical Architecture

### **1. Database Query Strategy**

**Approach:** Create a new API function that counts matching units using the same filtering logic as Smart Match v2, but returns only a count instead of full data.

**Query Structure:**
```javascript
// Count units that match filter criteria
SELECT COUNT(DISTINCT u.property_id) as property_count
FROM units u
JOIN floor_plans fp ON u.floor_plan_id = fp.id
JOIN properties p ON u.property_id = p.id
WHERE u.is_available = true
  AND u.is_active = true
  AND u.status = 'available'
  -- Apply bedroom filter
  AND (
    CASE 
      WHEN config.bedroom_match_mode = 'exact' THEN fp.beds BETWEEN lead.beds_min AND lead.beds_max
      WHEN config.bedroom_match_mode = 'flexible' THEN fp.beds BETWEEN (lead.beds_min - 1) AND (lead.beds_max + 1)
      ELSE true
    END
  )
  -- Apply bathroom filter
  AND (
    CASE 
      WHEN config.bathroom_match_mode = 'exact' THEN fp.baths BETWEEN lead.baths_min AND lead.baths_max
      WHEN config.bathroom_match_mode = 'flexible' THEN fp.baths BETWEEN (lead.baths_min - 0.5) AND (lead.baths_max + 0.5)
      ELSE true
    END
  )
  -- Apply rent tolerance filter
  AND (
    CASE 
      WHEN config.rent_tolerance_mode = 'percentage' THEN 
        COALESCE(u.rent, fp.starting_at) BETWEEN 
          (lead.price_min * (1 - config.rent_tolerance_percent / 100)) AND 
          (lead.price_max * (1 + config.rent_tolerance_percent / 100))
      ELSE true
    END
  )
  -- Apply availability window filter
  AND u.available_from BETWEEN 
    (lead.move_in_date - INTERVAL '${config.availability_window_days} days') AND 
    (lead.move_in_date + INTERVAL '${config.availability_window_days} days')
```

**Alternative Approach (Recommended):** Use existing JavaScript filtering logic from `smart-match-v2.js` to avoid duplicating filter logic in SQL.

```javascript
// Fetch all available units (cached)
const units = await getAvailableUnits();

// Apply configurable filters (reuse existing logic)
const filteredUnits = applyConfigurableFilters(units, testLead, config);

// Count unique properties
const propertyIds = new Set(filteredUnits.map(u => u.property.id));
return propertyIds.size;
```

**Recommendation:** Use JavaScript approach for consistency and maintainability.

---

### **2. API Function**

**File:** `src/api/smart-match-config-api.js`

**New Function:**
```javascript
/**
 * Count properties that match filter criteria
 * Uses same filtering logic as Smart Match but returns only count
 * 
 * @param {Object} config - Smart Match configuration
 * @param {Object} testLead - Test lead with preferences (optional)
 * @returns {Promise<number>} Count of matching properties
 */
export async function countMatchingProperties(config, testLead = null) {
    try {
        // Use default test lead if none provided
        const lead = testLead || getDefaultTestLead();
        
        // Fetch all available units with details
        const { getSupabase } = await import('./supabase-api.js');
        const supabase = getSupabase();
        
        const { data: units, error } = await supabase
            .from('units')
            .select(`
                *,
                floor_plan:floor_plans(*),
                property:properties(*)
            `)
            .eq('is_available', true)
            .eq('is_active', true)
            .eq('status', 'available');
        
        if (error) throw error;
        
        // Transform to expected format
        const unitsWithDetails = units.map(u => ({
            unit: u,
            floorPlan: u.floor_plan,
            property: u.property
        }));
        
        // Apply configurable filters (reuse existing logic)
        const { applyConfigurableFilters } = await import('../utils/smart-match-v2.js');
        const filteredUnits = applyConfigurableFilters(unitsWithDetails, lead, config);
        
        // Count unique properties
        const propertyIds = new Set(filteredUnits.map(item => item.property.id));
        
        return propertyIds.size;
    } catch (error) {
        console.error('❌ Error counting matching properties:', error);
        return 0; // Return 0 on error
    }
}

/**
 * Get default test lead for filter preview
 * @returns {Object} Test lead object
 */
function getDefaultTestLead() {
    return {
        bedrooms: '2',           // 2 bedrooms
        bathrooms: '2',          // 2 bathrooms
        price_range: '$1500-$2000',
        move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        location_preference: 'San Antonio',
        has_pets: false,
        needs_parking: false
    };
}
```

---

### **3. UI Component**

**File:** `src/modules/admin/mission-control-ui.js`

**New Component:**
```javascript
/**
 * Create match counter indicator
 * @param {Object} options - Configuration options
 * @returns {string} HTML string
 */
export function createMatchCounter(options = {}) {
    const {
        count = 0,
        loading = false,
        error = false
    } = options;
    
    // Determine status color
    let statusClass = 'mc-counter-none';
    let statusText = 'NO MATCHES';
    
    if (count >= 10) {
        statusClass = 'mc-counter-good';
        statusText = 'OPTIMAL';
    } else if (count >= 1) {
        statusClass = 'mc-counter-warning';
        statusText = 'LIMITED';
    }
    
    return `
        <div class="mc-match-counter ${statusClass}" id="matchCounter">
            <div class="mc-counter-header">
                <div class="mc-counter-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <div class="mc-counter-title">
                    <span class="mc-counter-label">FILTER PREVIEW</span>
                    <span class="mc-counter-status">${statusText}</span>
                </div>
            </div>
            <div class="mc-counter-display">
                ${loading ? `
                    <div class="mc-counter-loading">
                        <div class="mc-spinner"></div>
                        <span>SCANNING...</span>
                    </div>
                ` : error ? `
                    <div class="mc-counter-error">
                        <span>ERROR</span>
                    </div>
                ` : `
                    <div class="mc-counter-value">${count}</div>
                    <div class="mc-counter-unit">PROPERTIES</div>
                `}
            </div>
            <div class="mc-counter-help">
                Real-time count based on current filter settings
            </div>
        </div>
    `;
}

/**
 * Initialize match counter functionality
 * Sets up debounced updates when filter controls change
 */
export function initializeMatchCounter() {
    let debounceTimer = null;
    const DEBOUNCE_DELAY = 500; // 500ms
    
    // Function to update counter
    async function updateCounter() {
        const counterEl = document.getElementById('matchCounter');
        if (!counterEl) return;
        
        // Show loading state
        setCounterLoading(true);
        
        try {
            // Extract current config from form
            const config = extractFormData();
            
            // Count matching properties
            const { countMatchingProperties } = await import('../../api/smart-match-config-api.js');
            const count = await countMatchingProperties(config);
            
            // Update display
            setCounterValue(count);
        } catch (error) {
            console.error('❌ Error updating match counter:', error);
            setCounterError(true);
        }
    }
    
    // Debounced update function
    function debouncedUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateCounter, DEBOUNCE_DELAY);
    }
    
    // Attach listeners to all filter controls
    const filterControls = [
        'bedroomMatchMode',
        'bathroomMatchMode',
        'rentTolerancePercent',
        'petPolicyStrict',
        'parkingRequired',
        'availabilityWindowDays'
    ];
    
    filterControls.forEach(controlId => {
        const element = document.getElementById(controlId);
        if (element) {
            element.addEventListener('input', debouncedUpdate);
            element.addEventListener('change', debouncedUpdate);
        }
    });
    
    // Initial update
    updateCounter();
}

/**
 * Helper functions for updating counter display
 */
function setCounterLoading(loading) {
    const counterEl = document.getElementById('matchCounter');
    if (!counterEl) return;
    
    // Update display to show loading state
    // (Implementation details)
}

function setCounterValue(count) {
    const counterEl = document.getElementById('matchCounter');
    if (!counterEl) return;
    
    // Update display with count value
    // (Implementation details)
}

function setCounterError(error) {
    const counterEl = document.getElementById('matchCounter');
    if (!counterEl) return;
    
    // Update display to show error state
    // (Implementation details)
}
```

---

## 🎨 Visual Design

### **CSS Styles**

**File:** `src/styles/mission-control.css`

```css
/* Match Counter Component */
.mc-match-counter {
    background: var(--mc-bg-panel);
    border: 1px solid var(--mc-border-primary);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.mc-counter-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.mc-counter-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mc-counter-icon svg {
    width: 24px;
    height: 24px;
    stroke: var(--mc-accent-cyan);
}

.mc-counter-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.mc-counter-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--mc-text-secondary);
}

.mc-counter-status {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.mc-counter-display {
    text-align: center;
    padding: 20px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    margin-bottom: 12px;
}

.mc-counter-value {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 8px;
}

.mc-counter-unit {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--mc-text-secondary);
}

.mc-counter-help {
    font-size: 11px;
    color: var(--mc-text-secondary);
    text-align: center;
}

/* Status Colors */
.mc-counter-good {
    border-color: var(--mc-accent-green);
}

.mc-counter-good .mc-counter-status {
    color: var(--mc-accent-green);
}

.mc-counter-good .mc-counter-value {
    color: var(--mc-accent-green);
}

.mc-counter-warning {
    border-color: var(--mc-accent-orange);
}

.mc-counter-warning .mc-counter-status {
    color: var(--mc-accent-orange);
}

.mc-counter-warning .mc-counter-value {
    color: var(--mc-accent-orange);
}

.mc-counter-none {
    border-color: #ef4444;
}

.mc-counter-none .mc-counter-status {
    color: #ef4444;
}

.mc-counter-none .mc-counter-value {
    color: #ef4444;
}

/* Loading State */
.mc-counter-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.mc-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--mc-accent-cyan);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

---

## 📍 UI Placement

**Location:** Inside the "FILTERING CONTROLS" panel, at the top before the filter controls.

**HTML Structure:**
```html
<div class="mc-control-panel">
    <div class="mc-panel-header">
        <!-- Panel header -->
    </div>
    
    <!-- NEW: Match Counter -->
    <div id="matchCounterContainer"></div>
    
    <div class="mc-control-grid">
        <!-- Existing filter controls -->
    </div>
</div>
```

---

## 🔄 Data Flow

```
User adjusts filter control
    ↓
Input event fired
    ↓
Debounce timer started (500ms)
    ↓
Timer expires
    ↓
Extract current config from form
    ↓
Call countMatchingProperties(config)
    ↓
Fetch available units from database
    ↓
Apply configurable filters (reuse smart-match-v2.js)
    ↓
Count unique property IDs
    ↓
Update counter display with color coding
```

---

## ✅ Implementation Checklist

### **Phase 1: API Function**
- [ ] Add `countMatchingProperties()` to `smart-match-config-api.js`
- [ ] Add `getDefaultTestLead()` helper function
- [ ] Test function with various filter configurations
- [ ] Add error handling and fallbacks

### **Phase 2: UI Component**
- [ ] Add `createMatchCounter()` to `mission-control-ui.js`
- [ ] Add `initializeMatchCounter()` with debouncing
- [ ] Add helper functions for state updates
- [ ] Test component rendering

### **Phase 3: Styling**
- [ ] Add match counter styles to `mission-control.css`
- [ ] Implement color-coded status (green/yellow/red)
- [ ] Add loading spinner animation
- [ ] Test responsive design

### **Phase 4: Integration**
- [ ] Add counter container to HTML
- [ ] Call `initializeMatchCounter()` in `initializeConfigPage()`
- [ ] Test real-time updates on filter changes
- [ ] Test debouncing behavior

### **Phase 5: Testing**
- [ ] Test with 0 matches (red)
- [ ] Test with 1-9 matches (yellow)
- [ ] Test with 10+ matches (green)
- [ ] Test loading states
- [ ] Test error handling
- [ ] Test performance with rapid filter changes

---

## 🎯 Success Metrics

- ✅ Counter updates within 500ms of filter change
- ✅ No database queries during rapid slider movement
- ✅ Accurate count matches actual Smart Match results
- ✅ Clear visual feedback for all states (loading, error, success)
- ✅ Color coding helps users understand filter effectiveness

---

## 🚀 Future Enhancements

1. **Test Lead Selector:** Allow users to select different test leads to preview matches
2. **Breakdown Display:** Show count by bedroom type (e.g., "5 × 1BR, 3 × 2BR, 2 × 3BR")
3. **Comparison Mode:** Show before/after counts when adjusting filters
4. **Export Preview:** Button to export list of matching properties
5. **Cache Results:** Cache unit data to avoid repeated database queries

---

**Implementation Time Estimate:** 2-3 hours  
**Complexity:** Medium  
**Dependencies:** Existing Smart Match v2 filtering logic

