# Script.js Modularization Plan

**Created:** 2025-10-22  
**Branch:** `feature/mod-enhance`  
**Current Size:** 2,184 lines  
**Target Size:** ~500-800 lines (orchestration layer only)

---

## 📊 Current State Analysis

### File Breakdown
- **Total Lines:** 2,184
- **Imports:** ~75 lines
- **Global Functions:** ~1,900 lines (needs extraction)
- **IIFE Wrapper:** ~1,800 lines
- **Admin Wrappers:** ~100 lines
- **Initialization:** ~200 lines

### Already Modularized ✅
- ✅ Leads rendering (`src/modules/leads/`)
- ✅ Listings rendering (`src/modules/listings/`)
- ✅ Agents rendering (`src/modules/agents/`)
- ✅ Documents rendering (`src/modules/documents/`)
- ✅ Admin functionality (`src/modules/admin/`)
- ✅ Modals (`src/modules/modals/`)
- ✅ Utilities (`src/utils/`)
- ✅ State management (`src/state/`)
- ✅ API layer (`src/api/`)

### Still in script.js ❌
- ❌ Specials functionality (~80 lines)
- ❌ Lead form handling (~100 lines)
- ❌ Health popover (~100 lines)
- ❌ Listings filters (~60 lines)
- ❌ Progress/Documents UI (~200 lines)
- ❌ Routing logic (~400 lines)
- ❌ App initialization (~200 lines)
- ❌ Wrapper functions (~400 lines)
- ❌ Event listener setup (~200 lines)

---

## 🎯 Extraction Plan (9 Phases)

### **Phase 1: Extract Specials Module** 
**Lines:** 208-286 (~80 lines)  
**Target:** `src/modules/specials/`  
**Risk:** Low  
**Dependencies:** None

**Files to Create:**
- `src/modules/specials/specials-api.js` - API functions
- `src/modules/specials/specials-rendering.js` - Rendering
- `src/modules/specials/specials-actions.js` - CRUD actions
- `src/modules/specials/index.js` - Barrel export

**Functions to Extract:**
- `saveNewSpecial()` - Create special
- `createSpecialAPI()` - API call
- `deleteSpecial()` - Delete special
- `deleteSpecialAPI()` - API call
- `renderSpecials()` - Render specials table

---

### **Phase 2: Extract Lead Forms Module**
**Lines:** 95-205 (~110 lines)  
**Target:** `src/modules/leads/lead-forms.js`  
**Risk:** Low  
**Dependencies:** SupabaseAPI, state, toast, hideModal

**Functions to Extract:**
- `saveNewLead()` - Create lead from form
- `checkDuplicateLead()` - Validation
- `createLeadAPI()` - Legacy API call (can be removed)

**Integration:**
- Import into `src/modules/leads/index.js`
- Export from leads module

---

### **Phase 3: Extract Health Popover Module**
**Lines:** 415-490 (~75 lines)  
**Target:** `src/modules/leads/health-popover.js`  
**Risk:** Low  
**Dependencies:** SupabaseAPI, getHealthMessages, STATUS_LABEL

**Functions to Extract:**
- `initPopover()` - Initialize popover elements
- `showPopover()` - Show health status popover
- `hidePopover()` - Hide popover

**Integration:**
- Import into `src/modules/leads/index.js`
- Export from leads module

---

### **Phase 4: Extract Listings Filters Module**
**Lines:** 352-413 (~60 lines)  
**Target:** `src/modules/listings/listings-filters.js`  
**Risk:** Low  
**Dependencies:** None (pure function)

**Functions to Extract:**
- `matchesListingsFilters()` - Filter properties

**Integration:**
- Import into `src/modules/listings/listings-rendering.js`
- Use in renderListings function

---

### **Phase 5: Extract Progress/Documents Module**
**Lines:** 587-700 (~200 lines)  
**Target:** `src/modules/documents/`  
**Risk:** Medium  
**Dependencies:** createLeadTableUtil, formatDate, progressSteps

**Files to Create:**
- `src/modules/documents/progress-config.js` - progressSteps config
- `src/modules/documents/progress-rendering.js` - Rendering functions
- `src/modules/documents/document-steps.js` - Document step rendering

**Functions to Extract:**
- `progressSteps` - Configuration
- `renderProgressTable()` - Render progress table
- `createLeadTable()` - Wrapper function
- `toggleLeadTable()` - Toggle expand/collapse
- `renderDocumentSteps()` - Render document steps
- `renderDocumentStepStatus()` - Render step status

---

### **Phase 6: Extract Routing Module**
**Lines:** ~400 lines (scattered throughout)  
**Target:** `src/routing/router.js`  
**Risk:** High (core functionality)  
**Dependencies:** All render functions, state

**Functions to Extract:**
- `route()` - Main routing function
- `initializeRouting()` - Initialize routing
- All route handlers

**Strategy:**
- Extract carefully with comprehensive testing
- Keep route() accessible globally initially
- Test each route after extraction

---

### **Phase 7: Extract Initialization Module**
**Lines:** ~200 lines  
**Target:** `src/init/app-init.js`  
**Risk:** High (core functionality)  
**Dependencies:** Everything

**Functions to Extract:**
- `initializeApp()` - Main initialization
- `loadInitialData()` - Load data
- `setupEventListeners()` - Setup listeners

**Strategy:**
- Extract last (depends on all other modules)
- Keep minimal initialization in script.js
- Test thoroughly

---

### **Phase 8: Clean Up Wrapper Functions**
**Lines:** ~400 lines  
**Target:** Remove or consolidate  
**Risk:** Medium  
**Dependencies:** All modules

**Actions:**
- Remove unnecessary wrapper functions
- Consolidate similar wrappers
- Direct imports where possible
- Keep only essential global functions

---

### **Phase 9: Final Cleanup**
**Target:** script.js should be ~500-800 lines  
**Risk:** Low  
**Dependencies:** All previous phases

**Actions:**
- Remove all extracted code
- Update imports
- Add comments for remaining code
- Verify all functionality works
- Create checkpoint

---

## 📋 Execution Order

**Recommended Order (Low Risk → High Risk):**

1. ✅ **Phase 1:** Specials Module (Low risk, isolated)
2. ✅ **Phase 2:** Lead Forms (Low risk, isolated)
3. ✅ **Phase 3:** Health Popover (Low risk, isolated)
4. ✅ **Phase 4:** Listings Filters (Low risk, pure function)
5. ✅ **Phase 5:** Progress/Documents (Medium risk, some dependencies)
6. ⚠️ **Phase 6:** Routing (High risk, core functionality)
7. ⚠️ **Phase 7:** Initialization (High risk, core functionality)
8. ✅ **Phase 8:** Wrapper Cleanup (Medium risk, refactoring)
9. ✅ **Phase 9:** Final Cleanup (Low risk, verification)

---

## 🎯 Success Criteria

### Per Phase
- [ ] Code extracted to new module
- [ ] Imports updated in script.js
- [ ] Extracted code removed from script.js
- [ ] No console errors
- [ ] Functionality tested and working
- [ ] Commit created with descriptive message

### Overall
- [ ] script.js reduced to ~500-800 lines
- [ ] All functionality working
- [ ] No regressions
- [ ] Clean module structure
- [ ] Comprehensive testing completed
- [ ] Documentation updated

---

## 🧪 Testing Checklist (After Each Phase)

### Quick Tests
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check console for errors
- [ ] Navigate to all pages (Leads, Listings, Agents, Documents, Admin)
- [ ] Test extracted functionality specifically

### Comprehensive Tests (After All Phases)
- [ ] **Leads Page:**
  - [ ] Add new lead
  - [ ] View lead details
  - [ ] Add lead note
  - [ ] View activity log
  - [ ] Health status popover
  - [ ] Assign agent
- [ ] **Listings Page:**
  - [ ] View properties
  - [ ] Filter properties
  - [ ] Expand units
  - [ ] Add unit note
  - [ ] Edit property
  - [ ] Delete property
- [ ] **Agents Page:**
  - [ ] View agents
  - [ ] Edit agent
  - [ ] View agent stats
- [ ] **Documents Page:**
  - [ ] View progress table
  - [ ] Expand/collapse lead
  - [ ] View step details
  - [ ] Upload document
- [ ] **Admin Page:**
  - [ ] View users
  - [ ] Create user
  - [ ] Edit user
  - [ ] Delete user
  - [ ] View audit log

---

## 📦 Expected File Structure After Completion

```
src/
├── modules/
│   ├── specials/                    # NEW
│   │   ├── specials-api.js
│   │   ├── specials-rendering.js
│   │   ├── specials-actions.js
│   │   └── index.js
│   ├── leads/
│   │   ├── lead-forms.js            # NEW
│   │   ├── health-popover.js        # NEW
│   │   ├── leads-rendering.js       # EXISTING
│   │   ├── leads-health.js          # EXISTING
│   │   └── index.js                 # UPDATED
│   ├── listings/
│   │   ├── listings-filters.js      # NEW
│   │   ├── listings-rendering.js    # EXISTING
│   │   └── index.js                 # UPDATED
│   ├── documents/
│   │   ├── progress-config.js       # NEW
│   │   ├── progress-rendering.js    # NEW
│   │   ├── document-steps.js        # NEW
│   │   └── index.js                 # UPDATED
│   └── ...
├── routing/                         # NEW
│   └── router.js
├── init/                            # NEW
│   └── app-init.js
└── ...

script.js                            # REDUCED to ~500-800 lines
```

---

## ⚠️ Risks and Mitigation

### Risk 1: Breaking Functionality
**Mitigation:**
- Test after each phase
- Create git commits after each phase
- Keep checkpoints for easy rollback

### Risk 2: Circular Dependencies
**Mitigation:**
- Plan imports carefully
- Use dependency injection where needed
- Avoid tight coupling

### Risk 3: Global Scope Issues
**Mitigation:**
- Keep necessary functions in global scope initially
- Gradually remove global dependencies
- Use window.functionName for onclick handlers

---

## 💾 Checkpoint Strategy

**After Each Phase:**
```bash
git add -A
git commit -m "Phase X: Extract [module name] to module"
git push origin feature/mod-enhance
```

**After All Phases:**
```bash
git tag -a modularization-complete-v2 -m "Modularization complete: script.js reduced to 500-800 lines"
git push origin modularization-complete-v2
```

---

## 📈 Progress Tracking

- [ ] Phase 1: Specials Module
- [ ] Phase 2: Lead Forms
- [ ] Phase 3: Health Popover
- [ ] Phase 4: Listings Filters
- [ ] Phase 5: Progress/Documents
- [ ] Phase 6: Routing
- [ ] Phase 7: Initialization
- [ ] Phase 8: Wrapper Cleanup
- [ ] Phase 9: Final Cleanup

**Estimated Time:** 4-6 hours  
**Estimated Commits:** 9-12  
**Estimated Lines Extracted:** ~1,400 lines  
**Target script.js Size:** ~500-800 lines

---

**Ready to start with Phase 1: Specials Module!** 🚀

