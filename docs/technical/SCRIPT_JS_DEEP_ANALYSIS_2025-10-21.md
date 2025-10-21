# Script.js Analysis - Current State
# Generated: 2025-10-21 14:30:14

## Current Size: 4,582 lines
## Target: Below 2,000 lines
## Gap: Need to reduce by ~2,600 lines (57% reduction)

## What's Still in script.js:

### 1. MASSIVE DOMContentLoaded Handler (~1,300 lines)
- Lines 3700-5000+
- Contains ALL event listener setup
- This is the single biggest chunk

### 2. CRUD Functions (~800 lines)
- saveNewLead() - 80 lines
- saveNewSpecial() - 40 lines  
- deleteSpecial() - 12 lines
- createListing() - wrapper
- savePropertyContact() - wrapper
- And many more...

### 3. Rendering Wrapper Functions (~200 lines)
- renderLeads() - wrapper
- renderListings() - wrapper
- renderAgents() - wrapper
- renderDocuments() - wrapper
- renderProperties() - wrapper
- renderBugs() - wrapper
- renderAdmin() - wrapper
- All just call module functions

### 4. Modal Wrapper Functions (~300 lines)
- Already extracted to modules, but wrappers still here
- openLeadDetailsModal, closeLeadDetailsModal
- openListingEditModal, closeListingEditModal
- And 30+ more modal wrappers

### 5. Utility Functions (~400 lines)
- sortTable() - 120 lines
- matchesListingsFilters() - 70 lines
- formatTimeAgo() - 20 lines
- getHealthMessages() - 100 lines
- And many more...

### 6. Map Functions (~150 lines)
- initMap() - 50 lines
- addMarker() - 70 lines
- clearMarkers() - 15 lines
- selectProperty() - 40 lines

### 7. Popover Functions (~100 lines)
- initPopover() - 10 lines
- showPopover() - 50 lines
- hidePopover() - 5 lines

### 8. Routing (~100 lines)
- route() - 80 lines
- initializeRouting() - 15 lines
- updateNavigation() - 10 lines

### 9. Mock Data Arrays (~500 lines)
- mockProgressLeads - 100 lines
- mockSpecials - 50 lines
- mockBugs - 80 lines
- progressSteps - 10 lines

### 10. API Object (~600 lines)
- Huge api object with all CRUD methods
- Lines 900-1500

## STRATEGIES TO GET BELOW 2,000 LINES:

### Strategy 1: Extract DOMContentLoaded to Events Module (HIGH IMPACT)
- Extract ~1,300 lines
- Create src/modules/events/event-handlers.js
- Risk: HIGH (touches everything)
- Impact: Would get us to ~3,300 lines

### Strategy 2: Extract API Object to Module (MEDIUM IMPACT)
- Extract ~600 lines  
- Create src/api/api-facade.js
- Risk: MEDIUM
- Impact: Would get us to ~3,900 lines

### Strategy 3: Extract Utility Functions (MEDIUM IMPACT)
- Extract ~400 lines
- Many already in helpers.js, but some still in script.js
- Risk: LOW
- Impact: Would get us to ~4,200 lines

### Strategy 4: Remove Mock Data (MEDIUM IMPACT)
- Remove ~500 lines
- Move to mockData.js (already exists)
- Risk: LOW
- Impact: Would get us to ~4,100 lines

### Strategy 5: Extract Map Functions (LOW IMPACT)
- Extract ~150 lines
- Create src/modules/listings/map-functions.js
- Risk: LOW
- Impact: Would get us to ~4,400 lines

### Strategy 6: Consolidate Wrappers (MEDIUM IMPACT)
- Remove ~500 lines of wrapper functions
- Use direct module calls in event handlers
- Risk: MEDIUM (requires refactoring event handlers)
- Impact: Would get us to ~4,100 lines

## RECOMMENDED APPROACH:

### Phase 1: Low-Hanging Fruit (Safe, ~650 lines)
1. Move mock data arrays to mockData.js (-500 lines)
2. Extract map functions to module (-150 lines)
**Result: ~3,930 lines**

### Phase 2: Medium Impact (Moderate Risk, ~1,000 lines)
3. Extract API object to api-facade.js (-600 lines)
4. Extract utility functions to helpers.js (-400 lines)
**Result: ~2,930 lines**

### Phase 3: High Impact (Higher Risk, ~1,300 lines)
5. Extract DOMContentLoaded to events module (-1,300 lines)
**Result: ~1,630 lines**  BELOW 2,000!

### Alternative: Consolidate Wrappers Instead of Phase 3
5. Remove wrapper functions, use direct module calls (-500 lines)
**Result: ~2,430 lines**  Still above 2,000

## CONCLUSION:
To get below 2,000 lines, we MUST extract the DOMContentLoaded handler.
There's no way around it - it's 1,300 lines and the single biggest chunk.

However, we can do Phases 1 & 2 first to reduce risk and get to ~2,930 lines,
then tackle the DOMContentLoaded extraction as the final step.
