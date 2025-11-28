# Migration 050: Add Property Policy Fields

## 📋 What This Migration Does

Adds 16 new policy-related boolean fields to the `properties` table to track acceptance criteria for:

### **Broken Lease Acceptance** (4 fields)
- `accepts_broken_lease_under_1` - Under 1 year old
- `accepts_broken_lease_1_year` - 1 year old
- `accepts_broken_lease_2_year` - 2 years old
- `accepts_broken_lease_3_plus` - 3+ years old

### **Eviction Acceptance** (4 fields)
- `accepts_eviction_under_1` - Under 1 year old
- `accepts_eviction_1_year` - 1 year old
- `accepts_eviction_2_year` - 2 years old
- `accepts_eviction_3_plus` - 3+ years old

### **Criminal Background** (2 fields)
- `accepts_misdemeanor` - Accepts misdemeanor
- `accepts_felony` - Accepts felony

### **Other Policies** (6 fields)
- `accepts_bad_credit` - Accepts bad credit
- `same_day_move_in` - Offers same-day move-in
- `passport_only_accepted` - Accepts passport as only ID
- `visa_required` - Requires visa for international applicants
- `accepts_section_8` - Accepts Section 8 housing vouchers
- `accepts_up_to_3_pets` - Accepts up to 3 pets

---

## 🚀 How to Run This Migration

### **Step 1: Open Supabase SQL Editor**
1. Go to https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### **Step 2: Copy and Paste the Migration**
1. Open `migrations/050_add_property_policies.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor

### **Step 3: Run the Migration**
1. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for success message
3. Verify no errors appear

### **Step 4: Verify the Migration**
Run this query to verify the new columns exist:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'properties'
AND column_name LIKE 'accepts_%' OR column_name IN ('same_day_move_in', 'passport_only_accepted', 'visa_required')
ORDER BY column_name;
```

You should see 16 rows returned.

---

## ✅ What Happens After Migration

1. **All existing properties** will have these fields set to `false` by default
2. **Edit Property modal** will show a new "Policies" section with all checkboxes
3. **Agents can update** policy settings for each property
4. **Future features** can filter properties based on lead requirements (e.g., "Show only properties that accept Section 8")

---

## 🔄 Rollback (If Needed)

If you need to undo this migration, run:

```sql
ALTER TABLE public.properties 
DROP COLUMN IF EXISTS accepts_broken_lease_under_1,
DROP COLUMN IF EXISTS accepts_broken_lease_1_year,
DROP COLUMN IF EXISTS accepts_broken_lease_2_year,
DROP COLUMN IF EXISTS accepts_broken_lease_3_plus,
DROP COLUMN IF EXISTS accepts_eviction_under_1,
DROP COLUMN IF EXISTS accepts_eviction_1_year,
DROP COLUMN IF EXISTS accepts_eviction_2_year,
DROP COLUMN IF EXISTS accepts_eviction_3_plus,
DROP COLUMN IF EXISTS accepts_misdemeanor,
DROP COLUMN IF EXISTS accepts_felony,
DROP COLUMN IF EXISTS accepts_bad_credit,
DROP COLUMN IF EXISTS same_day_move_in,
DROP COLUMN IF EXISTS passport_only_accepted,
DROP COLUMN IF EXISTS visa_required,
DROP COLUMN IF EXISTS accepts_section_8,
DROP COLUMN IF EXISTS accepts_up_to_3_pets;
```

---

## 📝 Notes

- All fields are **boolean** (true/false)
- All fields default to **false**
- Indexes created on commonly queried fields (Section 8, bad credit, pets)
- Comments added to each column for documentation

