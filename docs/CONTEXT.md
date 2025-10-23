# AI Assistant Context

**Purpose:** Quick reference for AI assistants (Augment, Cursor, etc.)  
**Last Updated:** 2025-10-22  
**Project:** TRE CRM (Texas Real Estate CRM)

---

## 🔗 Live Resources

### Supabase Database
- **Project ID:** `mevirooooypfjbsrmzrk`
- **Dashboard URL:** https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk
- **Table Editor:** https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/editor
- **SQL Editor:** https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/sql
- **API Docs:** https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/api
- **Note:** Live schema - always current, check here for table structure, RLS policies, and relationships

### Database Schema (Source of Truth)
- **Location:** Supabase Table Editor (link above)
- **Migrations:** `migrations/` directory (001-029 currently)
- **Key Tables:**
  - `properties` - Property listings
  - `floor_plans` - Floor plan templates for properties
  - `units` - Individual units within properties
  - `unit_notes` - Notes for individual units
  - `unit_activities` - Activity tracking for units
  - `leads` - Lead management
  - `agents` - Agent information
  - `documents` - Document management
  - `users` - User accounts (custom table, separate from auth.users)

---

## 📁 Project Structure

### Source Code Organization
```
src/
├── api/
│   └── supabase-api.js          # All Supabase API functions (SOURCE OF TRUTH)
├── modules/
│   ├── listings/
│   │   ├── listings-rendering.js  # Listings table with units hierarchy
│   │   └── bulk-actions.js        # Bulk selection and actions
│   ├── modals/
│   │   ├── listing-modals.js      # Property edit/delete modals
│   │   ├── unit-modals.js         # Unit notes and activity modals
│   │   └── property-notes.js      # Property notes modal
│   ├── leads/
│   │   ├── leads-rendering.js     # Leads table rendering
│   │   └── leads-health.js        # Lead health scoring
│   ├── agents/
│   │   └── agents-rendering.js    # Agents table rendering
│   ├── documents/
│   │   └── documents-rendering.js # Documents table rendering
│   └── admin/
│       ├── admin-api.js           # Admin API functions
│       ├── admin-rendering.js     # Admin UI rendering
│       └── admin-actions.js       # Admin actions
├── utils/
│   ├── formatters.js              # Currency, date, phone formatting
│   ├── mapbox-autocomplete.js     # Address autocomplete
│   └── validators.js              # Input validation
└── config/
    └── supabase-config.js         # Supabase client configuration

migrations/                         # Database migrations (001-029)
script.js                          # Main application entry point
styles.css                         # Global styles
index.html                         # Main HTML file
```

### Key Files (Source of Truth)

#### API Functions
- **File:** `src/api/supabase-api.js`
- **Purpose:** All Supabase database operations
- **Note:** Read this file directly for current API function signatures and parameters

#### Module Exports
- **Pattern:** Each module folder has files that export functions
- **Example:** `src/modules/listings/listings-rendering.js` exports `renderListings()`
- **Note:** Check individual module files for current exports

#### Database Migrations
- **Location:** `migrations/` directory
- **Current Range:** 001-029
- **Latest:** Migration 029 - Remove notes foreign key constraints
- **Note:** Check migration files for schema history and changes

---

## 🎨 Code Conventions

### Naming Conventions
- **JavaScript Functions:** camelCase (e.g., `getProperties`, `renderListings`)
- **JavaScript Files:** kebab-case (e.g., `listings-rendering.js`, `supabase-api.js`)
- **Database Tables:** snake_case (e.g., `floor_plans`, `unit_notes`)
- **Database Columns:** snake_case (e.g., `property_id`, `created_at`)
- **CSS Classes:** kebab-case (e.g., `.listings-table`, `.unit-row`)
- **Git Branches:** `feature/feature-name`, `bugfix/bug-name`

### Import/Export Pattern
```javascript
// ES6 modules - always use .js extension
import { functionName } from './modules/module-name/file-name.js';
import * as ModuleName from './modules/module-name/file-name.js';

// Named exports (preferred)
export function myFunction() { }
export const myConstant = 'value';

// Default exports (avoid unless necessary)
export default MyClass;
```

### API Call Pattern
```javascript
// ⚠️ CRITICAL RULE: ALWAYS use existing modular APIs instead of direct window.supabase calls
// ✅ CORRECT - Use SupabaseAPI module functions
try {
    const data = await SupabaseAPI.getProperties({ isActive: true });
    await SupabaseAPI.createLeadActivity({ lead_id, activity_type, description, metadata });
    await SupabaseAPI.createPropertyActivity({ property_id, activity_type, description });
    // Handle success
} catch (error) {
    console.error('Error:', error);
    // Handle error
}

// ❌ WRONG - Don't use direct window.supabase calls
// const { data } = await window.supabase.from('leads').insert([...]);

// 📋 WORKFLOW: Before writing ANY database code:
// 1. Check src/api/supabase-api.js for existing functions
// 2. Check src/modules/* for module-specific functions
// 3. Only use direct window.supabase if no API function exists
// 4. If no API exists, consider creating one in supabase-api.js
```

### Modal Pattern
```javascript
// Show modal
const modal = document.getElementById('myModal');
modal.classList.add('active');

// Hide modal
modal.classList.remove('active');
```

---

## 🗄️ Database Information

### Authentication
- **Supabase Auth:** `auth.users` table (managed by Supabase)
- **Custom Users:** `public.users` table (managed by application)
- **Current User:** Access via `window.currentUser` or `supabase.auth.getUser()`
- **User ID:** Use `auth.uid()` in RLS policies

### Row Level Security (RLS)
- **Status:** Enabled on all tables
- **Pattern:** Most tables allow authenticated users to read/write their own data
- **Note:** Check Supabase Dashboard → Authentication → Policies for current RLS rules

### Foreign Keys
- **Note:** Some foreign key constraints removed in migration 029 for flexibility
- **Affected Tables:** `unit_notes.author_id`, `unit_activities.performed_by`
- **Reason:** Allow flexibility with auth.uid() values that may not exist in users table

### Common Query Patterns
```javascript
// Get properties with filters
const properties = await SupabaseAPI.getProperties({ 
    isActive: true, 
    market: 'San Antonio' 
});

// Get units for a property
const units = await SupabaseAPI.getUnits({ 
    propertyId: 'property-123' 
});

// Create a note
await SupabaseAPI.createUnitNote({
    unitId: 'unit-456',
    noteText: 'Note content',
    authorId: window.currentUser.id
});
```

---

## 🔧 Common Workflows

### Adding a New Feature
1. **Create feature branch:**
   ```bash
   git checkout -b feature/feature-name
   ```
2. **Make changes** to code
3. **Test thoroughly** in browser
4. **Commit changes:**
   ```bash
   git add -A
   git commit -m "Description of changes"
   git push origin feature/feature-name
   ```
5. **Create Pull Request** on GitHub
6. **Merge to main** via GitHub PR
7. **Delete feature branch** after merge (optional)

### Creating a Database Migration
1. **Create migration file:**
   - File: `migrations/XXX_description.sql` (XXX = next number)
   - Example: `migrations/030_add_new_table.sql`
2. **Write SQL:**
   ```sql
   -- Migration 030: Add new table
   -- Created: 2025-10-22
   
   CREATE TABLE new_table (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name VARCHAR NOT NULL,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "new_table_select_policy" ON new_table
       FOR SELECT USING (auth.uid() IS NOT NULL);
   ```
3. **Test in Supabase SQL Editor** (link above)
4. **Commit migration file** to feature branch
5. **Document in PR** what the migration does

### Adding a New Modal
1. **Create modal HTML** in `index.html`:
   ```html
   <div id="myModal" class="modal">
       <div class="modal-content">
           <span class="close">&times;</span>
           <!-- Modal content -->
       </div>
   </div>
   ```
2. **Add modal styles** in `styles.css`
3. **Create modal functions** in appropriate module file:
   ```javascript
   export function showMyModal(data) {
       const modal = document.getElementById('myModal');
       // Populate modal with data
       modal.classList.add('active');
   }
   ```
4. **Add event listeners** for open/close
5. **Import and use** in `script.js` or other modules

### Adding a New API Function
1. **Open** `src/api/supabase-api.js`
2. **Add function** following existing patterns:
   ```javascript
   async getMyData(filters = {}) {
       try {
           let query = supabase.from('my_table').select('*');
           
           if (filters.someFilter) {
               query = query.eq('column', filters.someFilter);
           }
           
           const { data, error } = await query;
           if (error) throw error;
           return data;
       } catch (error) {
           console.error('Error in getMyData:', error);
           throw error;
       }
   }
   ```
3. **Export function** at bottom of file
4. **Use in modules:**
   ```javascript
   import { SupabaseAPI } from './api/supabase-api.js';
   const data = await SupabaseAPI.getMyData({ someFilter: 'value' });
   ```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Test in browser (hard refresh: Ctrl+Shift+R)
- [ ] Check browser console for errors
- [ ] Test all CRUD operations (Create, Read, Update, Delete)
- [ ] Test with different user roles (if applicable)
- [ ] Test edge cases (empty data, long text, special characters)
- [ ] Test on different screen sizes (responsive design)

### Database Testing
- [ ] Test queries in Supabase SQL Editor first
- [ ] Verify RLS policies work correctly
- [ ] Check foreign key constraints
- [ ] Verify data types and constraints

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "X is not a function"**
- **Cause:** Function not exported or imported correctly
- **Fix:** Check export in source file and import statement

**Issue: API call returns 401/403**
- **Cause:** RLS policy blocking access or user not authenticated
- **Fix:** Check RLS policies in Supabase Dashboard

**Issue: Foreign key constraint violation**
- **Cause:** Referenced record doesn't exist
- **Fix:** Check if parent record exists, or remove FK constraint if needed

**Issue: Changes not showing in browser**
- **Cause:** Browser cache
- **Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

---

## 📊 Current Project Status

### Completed Features
- ✅ Property → Floor Plans → Units hierarchy
- ✅ Unit notes system with yellow icons and count badges
- ✅ Unit activities logging
- ✅ Commission badge in property header
- ✅ Mapbox address autocomplete
- ✅ Rent range auto-calculation from units
- ✅ Optimized table layout (no horizontal scrolling)
- ✅ Lead management
- ✅ Agent management
- ✅ Document management
- ✅ Admin panel

### Active Branch
- **Current:** `feature/mod-enhance`
- **Purpose:** Modularization and enhancements

### Database Migrations
- **Total:** 29 migrations (001-029)
- **Latest:** Migration 029 - Remove notes foreign key constraints

---

## 💡 Tips for AI Assistants

### Before Making Code Changes
1. ✅ Check `src/api/supabase-api.js` for existing API functions
2. ✅ Check Supabase Table Editor for current database schema
3. ✅ Check module files for existing functionality
4. ✅ Follow naming conventions above

### When Adding New Features
1. ✅ Create feature branch first
2. ✅ Follow existing code patterns
3. ✅ Test thoroughly before committing
4. ✅ Create PR for review

### When Debugging
1. ✅ Check browser console for errors
2. ✅ Check Supabase logs for database errors
3. ✅ Verify RLS policies in Supabase Dashboard
4. ✅ Check this CONTEXT.md file for common issues

---

**This file is the source of truth for AI assistants working on this project.**  
**Keep it updated as major changes occur.**

