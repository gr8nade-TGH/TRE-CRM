# Smart Match Customizer - Detailed Task Breakdown

## 📋 Implementation Phases

---

## **PHASE 1: Database & Data Layer** (Estimated: 8 hours)

### Task 1.1: Create Database Migration
**File:** `migrations/043_create_smart_match_config.sql`  
**Time:** 3 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Define `smart_match_config` table schema with all configuration columns
- [ ] Add comments to all columns explaining their purpose
- [ ] Create indexes for performance (is_active, created_at)
- [ ] Add RLS policies (SELECT for all authenticated, INSERT/UPDATE/DELETE for managers/super_users only)
- [ ] Create trigger for auto-updating `updated_at` timestamp
- [ ] Add seed data with default configuration

**Acceptance Criteria:**
- Migration runs successfully in Supabase
- Default configuration is inserted
- Only managers/super_users can modify config
- All users can read active config

---

### Task 1.2: Create Default Configuration Constants
**File:** `src/utils/smart-match-config-defaults.js`  
**Time:** 2 hours  
**Complexity:** Low

**Subtasks:**
- [ ] Define `DEFAULT_SMART_MATCH_CONFIG` object with all default values
- [ ] Create enums for filter modes (EXACT, FLEXIBLE, RANGE)
- [ ] Create enums for policy modes (IGNORE, STRICT, LENIENT)
- [ ] Create enums for sort options (SCORE, RENT_LOW, RENT_HIGH, AVAILABILITY)
- [ ] Add JSDoc comments for all constants
- [ ] Export all constants

**Acceptance Criteria:**
- All default values match current hardcoded algorithm
- Enums are properly typed
- Documentation is clear

---

### Task 1.3: Create Configuration API Module
**File:** `src/api/smart-match-config-api.js`  
**Time:** 3 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Implement `getActiveConfig()` - fetch active configuration
- [ ] Implement `updateConfig(configData)` - update configuration
- [ ] Implement `resetToDefaults()` - reset to default values
- [ ] Implement `createConfig(configData)` - create new configuration
- [ ] Add error handling for all functions
- [ ] Add JSDoc comments

**Acceptance Criteria:**
- All CRUD operations work correctly
- Errors are properly handled and logged
- Functions return consistent data structures

---

## **PHASE 2: Enhanced Algorithm** (Estimated: 16 hours)

### Task 2.1: Create Configurable Filtering Functions
**File:** `src/utils/smart-match-v2.js` (Part 1)  
**Time:** 6 hours  
**Complexity:** High

**Subtasks:**
- [ ] Implement `meetsBedroomRequirement(lead, floorPlan, config)` with flexible/range modes
- [ ] Implement `meetsBathroomRequirement(lead, floorPlan, config)` with flexible/range modes
- [ ] Implement `meetsRentRequirement(lead, unit, floorPlan, config)` with tolerance
- [ ] Implement `meetsMoveInDateRequirement(lead, unit, config)` with flexibility window
- [ ] Implement `meetsPetPolicyRequirement(lead, property, config)` (new)
- [ ] Implement `meetsIncomeRequirement(lead, unit, floorPlan, config)` (new)
- [ ] Implement `meetsCreditScoreRequirement(lead, property, config)` (new)
- [ ] Implement `meetsBackgroundCheckRequirement(lead, property, config)` (new)
- [ ] Implement `applyConfigurableFilters(units, lead, config)` - main filter function

**Acceptance Criteria:**
- All filter modes work correctly (exact, flexible, range, ignore, strict, lenient)
- Edge cases handled (null values, missing data)
- Backward compatible with current algorithm when using default config

---

### Task 2.2: Create Configurable Scoring Functions
**File:** `src/utils/smart-match-v2.js` (Part 2)  
**Time:** 6 hours  
**Complexity:** High

**Subtasks:**
- [ ] Implement `scorePriceMatch(lead, unit, floorPlan, config)` with configurable weights
- [ ] Implement `scoreMoveInDate(lead, unit, config)` with configurable bonus
- [ ] Implement `scoreCommissionBonus(property, config)` with configurable threshold/weights
- [ ] Implement `scorePumiBonus(property, config)` with configurable bonus
- [ ] Implement `scoreLeniencyBonus(property, config)` (new)
- [ ] Implement `calculateMatchScoreWithConfig(lead, unit, floorPlan, property, config)`
- [ ] Add score breakdown for debugging

**Acceptance Criteria:**
- All scoring weights are configurable
- Score breakdown shows contribution of each factor
- Total scores match expected values

---

### Task 2.3: Create Main Smart Match Function
**File:** `src/utils/smart-match-v2.js` (Part 3)  
**Time:** 4 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Implement `getSmartMatchesWithConfig(lead, units, config)` - main function
- [ ] Apply configurable filters
- [ ] Calculate scores with config
- [ ] Apply configurable sorting (score, rent, availability)
- [ ] Apply configurable limit and minimum score threshold
- [ ] Maintain "one unit per property" rule
- [ ] Add comprehensive logging for debugging

**Acceptance Criteria:**
- Function returns correct matches based on config
- Sorting works for all modes
- Limit and threshold are respected
- Performance is acceptable (< 500ms for 1000 units)

---

## **PHASE 3: UI Development** (Estimated: 20 hours)

### Task 3.1: Create Customizer Modal HTML
**File:** `index.html`  
**Time:** 4 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Add "Smart Match Customizer" button to Admin page (managers/super_users only)
- [ ] Create modal structure with header, body, footer
- [ ] Add filtering criteria section with all controls
- [ ] Add scoring weights section with all inputs
- [ ] Add display settings section
- [ ] Add action buttons (Save, Reset, Preview, Cancel)
- [ ] Add loading states and error messages

**Acceptance Criteria:**
- Modal is accessible and keyboard-navigable
- All form controls are properly labeled
- Layout is responsive
- Button visibility respects user role

---

### Task 3.2: Create Customizer UI Rendering Module
**File:** `src/modules/admin/smart-match-customizer-ui.js`  
**Time:** 8 hours  
**Complexity:** High

**Subtasks:**
- [ ] Implement `renderCustomizerModal(config)` - render main modal
- [ ] Implement `renderFilteringSection(config)` - render filtering controls
- [ ] Implement `renderScoringSection(config)` - render scoring controls
- [ ] Implement `renderDisplaySection(config)` - render display settings
- [ ] Implement `populateFormWithConfig(config)` - fill form with current values
- [ ] Implement `getFormData()` - extract form data as config object
- [ ] Implement `validateFormData(formData)` - validate user input
- [ ] Implement `showValidationErrors(errors)` - display validation errors
- [ ] Add real-time input validation
- [ ] Add tooltips/help text for complex settings

**Acceptance Criteria:**
- Form renders correctly with current config
- All controls work as expected
- Validation prevents invalid values
- User-friendly error messages

---

### Task 3.3: Create Customizer Logic Module
**File:** `src/modules/admin/smart-match-customizer.js`  
**Time:** 6 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Implement `openCustomizer()` - fetch config and open modal
- [ ] Implement `closeCustomizer()` - close modal and cleanup
- [ ] Implement `saveConfiguration()` - validate, save, and update cache
- [ ] Implement `previewConfiguration()` - show sample matches with new config
- [ ] Implement `resetConfiguration()` - reset to defaults with confirmation
- [ ] Add success/error toast notifications
- [ ] Add confirmation dialogs for destructive actions

**Acceptance Criteria:**
- Customizer opens with current config loaded
- Save updates database and clears cache
- Preview shows realistic sample matches
- Reset requires confirmation

---

### Task 3.4: Add Styles for Customizer
**File:** `styles.css`  
**Time:** 2 hours  
**Complexity:** Low

**Subtasks:**
- [ ] Add modal styles (max-width, height, overflow)
- [ ] Add section styles (background, borders, spacing)
- [ ] Add form control styles (inputs, sliders, radio buttons)
- [ ] Add button styles (primary, secondary, danger)
- [ ] Add preview section styles
- [ ] Add responsive styles for mobile
- [ ] Add loading/disabled states

**Acceptance Criteria:**
- Customizer looks professional and polished
- Consistent with existing app design
- Responsive on all screen sizes
- Accessible (focus states, contrast)

---

## **PHASE 4: Integration** (Estimated: 12 hours)

### Task 4.1: Update Supabase API Module
**File:** `src/api/supabase-api.js`  
**Time:** 4 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Add `getSmartMatchConfig()` function with caching
- [ ] Add `updateSmartMatchConfig(configData)` function
- [ ] Modify `getSmartMatches(leadId, config)` to accept config parameter
- [ ] Update `getSmartMatches()` to use smart-match-v2.js
- [ ] Add cache invalidation on config update
- [ ] Add error handling

**Acceptance Criteria:**
- Config is cached for 1 minute to reduce DB calls
- Cache is cleared when config is updated
- getSmartMatches uses new algorithm

---

### Task 4.2: Update Admin Module
**File:** `src/modules/admin/index.js`  
**Time:** 1 hour  
**Complexity:** Low

**Subtasks:**
- [ ] Import customizer functions
- [ ] Export customizer functions
- [ ] Add to module exports

**Acceptance Criteria:**
- Customizer functions are accessible from admin module

---

### Task 4.3: Add Event Listeners
**File:** `src/events/dom-event-listeners.js`  
**Time:** 2 hours  
**Complexity:** Low

**Subtasks:**
- [ ] Add event listener for "Smart Match Customizer" button
- [ ] Add event listeners for customizer form controls
- [ ] Add event listeners for save/reset/preview buttons
- [ ] Add event listener for modal close
- [ ] Add event delegation for dynamic controls

**Acceptance Criteria:**
- All buttons and controls are interactive
- Event listeners are properly cleaned up

---

### Task 4.4: Update Showcase Modals
**File:** `src/modules/modals/showcase-modals.js`  
**Time:** 3 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Fetch active config in `openMatches()`
- [ ] Update criteria banner to show active configuration
- [ ] Display which filters are enabled
- [ ] Show scoring weights being used
- [ ] Add "Customizer" link for managers

**Acceptance Criteria:**
- Criteria banner accurately reflects active config
- Users understand how matches were selected
- Managers can easily access customizer

---

### Task 4.5: Update API Wrapper
**File:** `src/api/api-wrapper.js`  
**Time:** 2 hours  
**Complexity:** Low

**Subtasks:**
- [ ] Update `getMatches()` to fetch config
- [ ] Pass config to `getSmartMatches()`
- [ ] Handle config fetch errors gracefully

**Acceptance Criteria:**
- Matches use active configuration
- Fallback to defaults if config fetch fails

---

## **PHASE 5: Testing & Documentation** (Estimated: 12 hours)

### Task 5.1: Write Unit Tests
**Time:** 6 hours  
**Complexity:** High

**Subtasks:**
- [ ] Test all filtering functions with different modes
- [ ] Test all scoring functions with different weights
- [ ] Test edge cases (null values, missing data, extreme values)
- [ ] Test configuration validation
- [ ] Test cache behavior
- [ ] Test backward compatibility

**Acceptance Criteria:**
- All tests pass
- Code coverage > 80%
- Edge cases are handled

---

### Task 5.2: End-to-End Testing
**Time:** 4 hours  
**Complexity:** Medium

**Subtasks:**
- [ ] Test opening customizer as manager
- [ ] Test modifying each configuration option
- [ ] Test saving configuration
- [ ] Test preview functionality
- [ ] Test reset to defaults
- [ ] Test that matches reflect new configuration
- [ ] Test access control (agents cannot access)

**Acceptance Criteria:**
- All user flows work correctly
- Configuration changes are applied immediately
- Access control works as expected

---

### Task 5.3: Write Documentation
**File:** `docs/SMART_MATCH_CUSTOMIZER_GUIDE.md`  
**Time:** 2 hours  
**Complexity:** Low

**Subtasks:**
- [ ] Write user guide for administrators
- [ ] Explain each configuration option
- [ ] Provide examples and use cases
- [ ] Add troubleshooting section
- [ ] Update CONTEXT.md with new files

**Acceptance Criteria:**
- Documentation is clear and comprehensive
- Examples are realistic and helpful
- CONTEXT.md is up to date

---

## 📊 Summary

| Phase | Tasks | Time Estimate | Complexity |
|-------|-------|---------------|------------|
| Phase 1: Database & Data Layer | 3 | 8 hours | Medium |
| Phase 2: Enhanced Algorithm | 3 | 16 hours | High |
| Phase 3: UI Development | 4 | 20 hours | High |
| Phase 4: Integration | 5 | 12 hours | Medium |
| Phase 5: Testing & Documentation | 3 | 12 hours | Medium-High |
| **TOTAL** | **18** | **68 hours** | **High** |

**Estimated Timeline:** 8-9 working days (8 hours/day)

---

## 🎯 MVP vs. Full Feature Set

### **MVP (Minimum Viable Product) - 40 hours**
Focus on core functionality:
- ✅ Database migration with basic config
- ✅ Configurable bedroom/bathroom matching (exact vs. flexible)
- ✅ Configurable rent tolerance
- ✅ Configurable scoring weights (price, commission, PUMI)
- ✅ Basic customizer UI (no preview)
- ✅ Integration with existing Smart Match

### **Full Feature Set - 68 hours**
Includes all advanced features:
- ✅ All MVP features
- ✅ Pet policy filtering
- ✅ Income requirement filtering
- ✅ Credit score filtering
- ✅ Background check filtering
- ✅ Leniency factor integration
- ✅ Live preview functionality
- ✅ Configuration history/versioning
- ✅ Comprehensive testing

---

**Document Created:** 2025-10-31  
**Status:** Ready for Implementation

