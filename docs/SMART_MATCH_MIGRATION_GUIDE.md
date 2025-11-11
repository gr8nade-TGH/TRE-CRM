# Smart Match Customizer - Database Migration Guide

**Migration File:** `migrations/043_create_smart_match_config.sql`  
**Estimated Time:** 2-3 minutes  
**Risk Level:** Low (creates new table, no existing data affected)

---

## 📋 Pre-Migration Checklist

- [ ] Backup your database (recommended but optional for new table creation)
- [ ] Ensure you have admin access to Supabase SQL Editor
- [ ] Verify you're in the correct project/environment
- [ ] Review the migration file to understand what will be created

---

## 🚀 Migration Steps

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### **Step 2: Copy Migration SQL**

1. Open the file: `migrations/043_create_smart_match_config.sql`
2. Copy the entire contents of the file
3. Paste into the Supabase SQL Editor

### **Step 3: Review the Migration**

The migration will create:

1. **Table: `smart_match_config`**
   - 30+ configuration columns
   - UUID primary key
   - Timestamps and audit fields

2. **Row Level Security (RLS) Policies:**
   - **Read Access:** All authenticated users can read configurations
   - **Write Access:** Only managers and super_users can create/update/delete configurations

3. **Indexes:**
   - Index on `is_active` for fast active config lookup

4. **Default Configuration:**
   - Inserts one default configuration matching current hardcoded behavior
   - Marked as active (`is_active = true`)

### **Step 4: Execute the Migration**

1. Click **"Run"** button in the SQL Editor
2. Wait for execution to complete (should take 1-2 seconds)
3. Check for success message

### **Step 5: Verify Migration Success**

Run this query to verify the table was created and default config inserted:

```sql
-- Check table exists
SELECT * FROM smart_match_config;

-- Should return 1 row with default configuration
-- Verify is_active = true
```

Expected result:
- 1 row returned
- `name` = 'Default Configuration'
- `is_active` = true
- All default values populated

---

## ✅ Post-Migration Verification

### **Test 1: Check RLS Policies**

```sql
-- View all policies on smart_match_config table
SELECT * FROM pg_policies WHERE tablename = 'smart_match_config';
```

Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

### **Test 2: Test Read Access (as any authenticated user)**

```sql
SELECT id, name, is_active FROM smart_match_config WHERE is_active = true;
```

Expected: Returns the default configuration

### **Test 3: Test Write Access (as manager/super_user)**

```sql
-- Update a non-critical field to test write access
UPDATE smart_match_config 
SET name = 'Default Configuration (Verified)' 
WHERE is_active = true;

-- Verify update
SELECT name FROM smart_match_config WHERE is_active = true;

-- Revert if desired
UPDATE smart_match_config 
SET name = 'Default Configuration' 
WHERE is_active = true;
```

Expected: Update succeeds if you're a manager/super_user, fails otherwise

---

## 🔧 Troubleshooting

### **Error: "relation 'smart_match_config' already exists"**

**Cause:** Table was already created in a previous migration attempt.

**Solution:**
1. Check if the table has the correct schema:
   ```sql
   \d smart_match_config
   ```
2. If schema is correct, skip migration
3. If schema is incorrect, drop and recreate:
   ```sql
   DROP TABLE IF EXISTS smart_match_config CASCADE;
   -- Then re-run migration
   ```

### **Error: "permission denied for table smart_match_config"**

**Cause:** RLS policies are blocking your access.

**Solution:**
1. Verify you're logged in as a manager or super_user
2. Check your user role:
   ```sql
   SELECT id, email, role FROM auth.users WHERE id = auth.uid();
   ```
3. If role is not 'manager' or 'super_user', update it:
   ```sql
   UPDATE auth.users SET role = 'manager' WHERE id = auth.uid();
   ```

### **Error: "column 'X' does not exist"**

**Cause:** Migration was partially executed or interrupted.

**Solution:**
1. Drop the table and start fresh:
   ```sql
   DROP TABLE IF EXISTS smart_match_config CASCADE;
   ```
2. Re-run the full migration

---

## 🎯 Next Steps After Migration

1. **Refresh the Admin page** in your application
2. **Navigate to Admin → Smart Match Configuration**
3. **Verify the info card** shows "Default Configuration"
4. **Click "Configure Smart Match"** to open the customizer
5. **Test saving a configuration change**
6. **Test resetting to defaults**
7. **Test Smart Match** with a lead to verify it uses the configuration

---

## 📊 Default Configuration Values

The migration inserts these default values (matching current hardcoded behavior):

| Setting | Default Value |
|---------|---------------|
| **Bedroom Match Mode** | Exact |
| **Bathroom Match Mode** | Exact |
| **Rent Tolerance** | 20% |
| **Move-in Flexibility** | 30 days |
| **Pet Policy** | Ignore |
| **Income Requirements** | Ignore |
| **Credit Score** | Ignore |
| **Background Check** | Ignore |
| **Price Match (Perfect)** | 25 points |
| **Price Match (Close)** | 10 points |
| **Move-in Date Bonus** | 10 points |
| **Commission Threshold** | 4.0% |
| **Commission Base Bonus** | 80 points |
| **Commission Scale Bonus** | 1 point per % |
| **PUMI Bonus** | 20 points |
| **Leniency Bonus (LOW)** | 0 points |
| **Leniency Bonus (MEDIUM)** | 5 points |
| **Leniency Bonus (HIGH)** | 10 points |
| **Max Properties** | 10 |
| **Min Score Threshold** | 0 |
| **Sort Order** | Score (highest first) |

---

## 🔄 Rollback Plan

If you need to rollback the migration:

```sql
-- Drop the table and all associated objects
DROP TABLE IF EXISTS smart_match_config CASCADE;

-- Verify table is gone
SELECT * FROM smart_match_config;
-- Should return: ERROR: relation "smart_match_config" does not exist
```

**Note:** The application will automatically fall back to hardcoded defaults if the table doesn't exist, so rollback is safe.

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the migration file for syntax errors
3. Verify your Supabase project permissions
4. Check the browser console for JavaScript errors
5. Review the Supabase logs for database errors

---

**Migration Status:** ⏳ **READY TO RUN**

Once migration is complete, update this document with:
- [ ] Migration executed successfully
- [ ] Date/time of migration
- [ ] Executed by (user)
- [ ] Any issues encountered

