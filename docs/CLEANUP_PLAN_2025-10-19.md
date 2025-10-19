# 🧹 Cleanup Plan - 2025-10-19

## 📋 Current State Analysis

The project has accumulated many documentation files, old checkpoints, and utility scripts in the root directory. This plan organizes everything into a clean, maintainable structure.

---

## 🎯 Proposed Directory Structure

```
TRE App/
├── docs/                          # All documentation
│   ├── planning/                  # Planning documents
│   ├── guides/                    # User guides
│   └── technical/                 # Technical documentation
├── scripts/                       # Utility scripts
│   ├── migration/                 # Migration runners
│   ├── setup/                     # Setup scripts
│   └── testing/                   # Testing utilities
├── checkpoints/                   # Organized checkpoints
│   ├── 2025-10-17/               # By date
│   ├── 2025-10-18/
│   └── 2025-10-19/
├── migrations/                    # Database migrations (keep as-is)
├── src/                          # Source code (keep as-is)
├── api/                          # API endpoints (keep as-is)
├── assets/                       # Static assets (keep as-is)
├── images/                       # Images (keep as-is)
├── logs/                         # Application logs (keep as-is)
├── node_modules/                 # Dependencies (keep as-is)
├── supabase/                     # Supabase config (keep as-is)
├── index.html                    # Main app
├── landing.html                  # Landing page
├── script.js                     # Main script
├── styles.css                    # Main styles
├── auth.js                       # Auth logic
├── auth-styles.css               # Auth styles
├── package.json                  # Dependencies
├── vercel.json                   # Vercel config
└── README.md                     # Main readme
```

---

## 📦 Files to Organize

### **Documentation Files (Move to docs/):**

#### Planning Documents → `docs/planning/`
- ACTIVITY_EVENTS_PLAN.md
- ACTIVITY_TRACKING_IMPLEMENTATION_PLAN.md
- FEATURES_BREAKDOWN.md
- LISTINGS_ADD_FEATURE_PLAN.md
- PHASE_2A_PROGRESS.md

#### Guides → `docs/guides/`
- INACTIVITY_DETECTION_SETUP.md
- RUN_MIGRATION_INSTRUCTIONS.md
- SUPABASE_QUERY_GUIDE.md
- TESTING_GUIDE.md
- QUICK_REFERENCE.md

#### Technical Documentation → `docs/technical/`
- ACTIVITY_LOGGING_SYSTEM.md
- CODEBASE_RESEARCH.md
- MODULARIZATION_ANALYSIS_2025-10-17.md
- MODULARIZATION_PROGRESS.md
- SCRIPT_JS_ANALYSIS_2025-10-17.md
- TECHNICAL_IMPLEMENTATION.md
- README_RESEARCH.md

#### Completion Reports → `docs/completion/`
- CLEANUP_SUMMARY_2025-10-17.md
- FUTURE_PROOFING_ANALYSIS_2025-10-17.md
- LISTINGS_IMPLEMENTATION_COMPLETE.md
- MOCK_DATA_CLEANUP_SUMMARY_2025-10-17.md

### **Utility Scripts (Move to scripts/):**

#### Migration Scripts → `scripts/migration/`
- db-migration-runner.js
- run-migration-automated.js
- run-migration-now.js
- run-migration.js
- run-migration.html

#### Setup Scripts → `scripts/setup/`
- create-auth-user.js
- populate-specials.js
- upload-to-supabase.js

#### Testing Scripts → `scripts/testing/`
- check-auth-users.js
- check-database.html
- check-supabase-schema.js
- query-supabase.js
- test-landing.html
- test-modules.html

### **SQL Files (Move to migrations/ or scripts/):**

#### One-time SQL Scripts → `scripts/sql/`
- ADD_SAMPLE_ACTIVITIES.sql
- check-constraints.sql
- create-missing-tables.sql
- RUN_THIS_IN_SUPABASE.sql
- supabase-schema-updates.sql
- UPDATE_EXISTING_LEADS_PREFERENCES.sql
- verify-migration.sql

### **Checkpoints (Reorganize by date):**

#### Keep Recent, Archive Old
- **Keep:** Last 3 checkpoints (most recent)
- **Archive:** Older checkpoints to `checkpoints/archive/`

Current checkpoints to organize:
- checkpoint_2025-10-19_12-28-57_phase1_activity_events ✅ KEEP
- checkpoint_2025-10-19_property_activities_fixed ✅ KEEP
- checkpoint_2025-10-19_11-36-45_property_activities_fixed → Archive
- checkpoint_2025-10-19_11-35-34_property_activities_fixed → Archive
- checkpoint_2025-10-19_04-01-31_activity_logging_agents_improvements → Archive
- checkpoint_2025-10-18_03-17-08_landing_page_working → Archive
- checkpoint_2025-10-17_* → Archive (all old ones)

### **Old/Unused Files (Consider Removing):**

These appear to be old/unused:
- agent.html (if not used)
- guest-card.html (if not used)
- supabase-client.js (if superseded by src/api/supabase-api.js)
- supabase-config.js (if superseded)
- supabase-helpers.js (if superseded)

---

## ✅ Action Items

### **Phase 1: Create Directory Structure**
```powershell
New-Item -Path "docs/planning" -ItemType Directory -Force
New-Item -Path "docs/guides" -ItemType Directory -Force
New-Item -Path "docs/technical" -ItemType Directory -Force
New-Item -Path "docs/completion" -ItemType Directory -Force
New-Item -Path "scripts/migration" -ItemType Directory -Force
New-Item -Path "scripts/setup" -ItemType Directory -Force
New-Item -Path "scripts/testing" -ItemType Directory -Force
New-Item -Path "scripts/sql" -ItemType Directory -Force
New-Item -Path "checkpoints/archive" -ItemType Directory -Force
```

### **Phase 2: Move Documentation**
Move all .md files to appropriate docs/ subdirectories

### **Phase 3: Move Scripts**
Move all .js and .html utility files to scripts/ subdirectories

### **Phase 4: Move SQL Files**
Move one-time SQL scripts to scripts/sql/

### **Phase 5: Archive Old Checkpoints**
Move old checkpoints to checkpoints/archive/

### **Phase 6: Clean Up Root**
Root directory should only contain:
- Core app files (index.html, script.js, styles.css, etc.)
- Configuration files (package.json, vercel.json, eslint.config.js)
- README.md
- Core directories (src/, api/, migrations/, checkpoints/, docs/, scripts/)

---

## 🎯 Expected Result

### **Clean Root Directory:**
```
TRE App/
├── docs/                    # All documentation organized
├── scripts/                 # All utility scripts organized
├── checkpoints/             # Only recent checkpoints
├── migrations/              # Database migrations
├── src/                     # Source code
├── api/                     # API endpoints
├── assets/                  # Static assets
├── images/                  # Images
├── logs/                    # Logs
├── node_modules/            # Dependencies
├── supabase/                # Supabase config
├── index.html               # Main app
├── landing.html             # Landing page
├── script.js                # Main script
├── styles.css               # Main styles
├── auth.js                  # Auth
├── auth-styles.css          # Auth styles
├── package.json             # Config
├── vercel.json              # Config
├── eslint.config.js         # Config
└── README.md                # Main readme
```

### **Benefits:**
- ✅ Easy to find documentation
- ✅ Easy to find utility scripts
- ✅ Clean root directory
- ✅ Better organization for new developers
- ✅ Easier to maintain
- ✅ Professional structure

---

## 📝 Notes

- Keep .gitignore to exclude node_modules, logs, etc.
- Update any hardcoded paths in scripts after moving
- Test that moved scripts still work
- Update README.md with new structure
- Commit changes with clear message

---

**Ready to execute cleanup!**

