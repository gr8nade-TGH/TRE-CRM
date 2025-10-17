# 🗄️ How to Run the Properties Migration

## Quick Steps

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk
   - Login if needed

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy & Paste the Migration SQL**
   - Open the file: `migrations/002_properties_and_notes.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for success message

5. **Verify Success**
   - You should see: "Success. No rows returned"
   - Check the "Table Editor" to see the new columns in `properties` table
   - Check for the new `property_notes` table

---

## ✅ What This Migration Does

- **Adds 19 new columns to `properties` table:**
  - `community_name`, `street_address`, `city`, `zip_code`
  - `bed_range`, `bath_range`, `rent_range_min`, `rent_range_max`
  - `commission_pct`, `amenities`, `is_pumi`, `last_updated`
  - `contact_email`, `leasing_link`, `photos`
  - `map_lat`, `map_lng`, `created_by`, `updated_at`

- **Creates `property_notes` table:**
  - For timestamped notes on properties
  - Includes author tracking

- **Sets up security:**
  - Row Level Security (RLS) policies
  - Proper permissions for authenticated users

- **Optimizes performance:**
  - Indexes on frequently queried columns
  - Triggers for auto-updating timestamps

---

## 🚨 Troubleshooting

**If you get an error about "function update_updated_at_column does not exist":**

Run this first:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Then run the main migration again.

---

**If you get an error about "table already exists":**

That's OK! The migration uses `IF NOT EXISTS` so it won't break anything. The columns that don't exist will be added.

---

## ✅ After Migration

Once the migration is complete:
1. Refresh your TRE CRM app
2. The "Add Listing" button should work
3. You can start adding listings!

---

**Need help?** Check the console for any errors and let me know!

