# Test Data Generation Guide

## 📋 Overview

This guide explains how to generate comprehensive test data for validating the Smart Match algorithm. The test data includes properties, floor plans, and units with diverse configurations to test all filter combinations.

---

## 🎯 Purpose

**Why Generate Test Data?**
- Validate Smart Match filtering logic across all configuration options
- Test bedroom/bathroom matching (exact and flexible modes)
- Test rent tolerance filtering (percentage-based)
- Test move-in date flexibility
- Test pet policy filtering
- Test commission and PUMI bonuses
- Ensure real-time match counter works correctly

**Test Data Coverage:**
- ✅ **Bedrooms:** 0 (studio), 1, 2, 3, 4
- ✅ **Bathrooms:** 1.0, 1.5, 2.0, 2.5, 3.0
- ✅ **Rent Range:** $750 - $5,200
- ✅ **Availability:** Current date to 90+ days out
- ✅ **Pet Policy:** Mix of pet-friendly and non-pet-friendly
- ✅ **PUMI:** Multiple PUMI properties
- ✅ **Commission:** 3.0% to 7.0%
- ✅ **Markets:** Austin and San Antonio

---

## 🚀 Quick Start

### Option 1: SQL Migration (Recommended for Initial Setup)

**Step 1: Add is_test_data Flag**
```sql
-- Run in Supabase SQL Editor
-- File: migrations/046_add_is_test_data_flag.sql
```

This adds an `is_test_data` boolean column to `properties`, `floor_plans`, and `units` tables.

**Step 2: Generate Test Data**
```sql
-- Run in Supabase SQL Editor
-- File: migrations/047_generate_comprehensive_test_data.sql
```

This creates:
- 10 test properties (5 Austin, 5 San Antonio)
- 34 floor plans (various bed/bath configurations)
- 30+ units with diverse availability dates

**Step 3: Verify Data**
```sql
-- Check test properties
SELECT name, city, is_pumi, commission_pct, amenities
FROM public.properties
WHERE is_test_data = true
ORDER BY name;

-- Check test floor plans
SELECT p.name AS property, fp.name AS floor_plan, fp.beds, fp.baths, fp.starting_at
FROM public.floor_plans fp
JOIN public.properties p ON fp.property_id = p.id
WHERE fp.is_test_data = true
ORDER BY p.name, fp.beds;

-- Check test units
SELECT p.name AS property, fp.name AS floor_plan, u.unit_number, u.rent, u.available_from
FROM public.units u
JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
JOIN public.properties p ON u.property_id = p.id
WHERE u.is_test_data = true
ORDER BY p.name, fp.name, u.unit_number;
```

---

### Option 2: JavaScript Utility (For Additional Data)

**Step 1: Open Browser Console**
- Navigate to your deployed app (e.g., `https://your-app.netlify.app`)
- Open browser console (F12)

**Step 2: Load the Script**
```javascript
// Copy and paste the entire contents of scripts/generate-test-data.js
// into the browser console
```

**Step 3: Generate Data**
```javascript
// Generate test data
await generateTestData();

// Expected output:
// 🎉 Test data generation complete!
// 📊 Summary:
//    Properties: 5
//    Floor Plans: 15
//    Units: 50+
```

**Step 4: Verify in Smart Match Config**
- Navigate to `#/manage` (Smart Match Configuration page)
- Adjust filter settings
- Watch the "FILTER PREVIEW" counter update in real-time
- Try different combinations:
  - Bedroom Mode: Exact vs Flexible
  - Bathroom Mode: Exact vs Flexible
  - Rent Tolerance: 0% to 100%
  - Move-In Flexibility: 0 to 365 days

---

## 🧹 Cleanup Test Data

### When to Cleanup
- Before activating real property feeds
- Before going to production
- When you want to start fresh

### Option 1: SQL Migration
```sql
-- Run in Supabase SQL Editor
-- File: migrations/048_cleanup_test_data.sql
```

This will:
1. Delete all units where `is_test_data = true`
2. Delete all floor plans where `is_test_data = true`
3. Delete all properties where `is_test_data = true`
4. Verify all test data has been removed

### Option 2: JavaScript Utility
```javascript
// In browser console
await cleanupTestData();

// Expected output:
// ✅ Deleted test units
// ✅ Deleted test floor plans
// ✅ Deleted test properties
// 🎉 Test data cleanup complete!
```

### Option 3: Manual Cleanup
```sql
-- Delete test data manually
DELETE FROM public.units WHERE is_test_data = true;
DELETE FROM public.floor_plans WHERE is_test_data = true;
DELETE FROM public.properties WHERE is_test_data = true;

-- Verify cleanup
SELECT COUNT(*) FROM public.properties WHERE is_test_data = true; -- Should be 0
SELECT COUNT(*) FROM public.floor_plans WHERE is_test_data = true; -- Should be 0
SELECT COUNT(*) FROM public.units WHERE is_test_data = true; -- Should be 0
```

---

## 📊 Test Data Structure

### Properties Created

| Property Name | City | Pet Friendly | PUMI | Commission | Bed Range |
|--------------|------|--------------|------|------------|-----------|
| Budget Oaks Apartments | Austin | ✅ | ❌ | 3.5% | 0-2 |
| Midtown Heights | Austin | ❌ | ❌ | 4.0% | 1-3 |
| Luxury Towers PUMI | Austin | ✅ | ✅ | 5.0% | 1-4 |
| Riverwalk Budget Suites | San Antonio | ✅ | ❌ | 3.0% | 0-2 |
| Alamo Plaza | San Antonio | ❌ | ❌ | 4.5% | 1-3 |
| Pearl District Luxury | San Antonio | ✅ | ❌ | 4.8% | 1-3 |
| Studio Central | Austin | ✅ | ❌ | 3.8% | 0 only |
| Family Estates | Austin | ❌ | ❌ | 4.2% | 3-4 |
| High Commission Heights | Austin | ✅ | ❌ | 6.0% | 1-3 |
| PUMI Paradise | San Antonio | ✅ | ✅ | 5.5% | 0-3 |

### Floor Plan Variety

- **Studios (0 bed):** 1.0 bath - $750-$1,400/month
- **1 Bedroom:** 1.0, 1.5 bath - $950-$2,400/month
- **2 Bedroom:** 1.0, 2.0 bath - $1,250-$3,400/month
- **3 Bedroom:** 2.0, 2.5 bath - $2,500-$4,500/month
- **4 Bedroom:** 2.5, 3.0 bath - $3,400-$5,500/month

### Unit Availability Spread

Units are distributed across different availability dates:
- **Immediate:** Available today
- **1 Week:** Available in 7 days
- **2 Weeks:** Available in 14 days
- **1 Month:** Available in 30 days
- **2 Months:** Available in 60 days
- **3 Months:** Available in 90 days

This allows testing of the `move_in_flexibility_days` filter setting.

---

## 🧪 Testing Scenarios

### Scenario 1: Exact Bedroom Match
**Config:**
- Bedroom Mode: `exact`
- Lead wants: 2 bedrooms

**Expected Results:**
- Should match only 2BR units
- Should NOT match 1BR or 3BR units

### Scenario 2: Flexible Bedroom Match
**Config:**
- Bedroom Mode: `flexible`
- Lead wants: 2 bedrooms

**Expected Results:**
- Should match 1BR, 2BR, and 3BR units (±1 bedroom)
- Should NOT match studios or 4BR units

### Scenario 3: Rent Tolerance
**Config:**
- Rent Tolerance: 20%
- Lead budget: $1,000-$1,500

**Expected Results:**
- Should match units from $800-$1,800 (±20%)
- Should NOT match units outside this range

### Scenario 4: Move-In Flexibility
**Config:**
- Move-In Flexibility: 30 days
- Lead move-in date: Today

**Expected Results:**
- Should match units available within 30 days
- Should NOT match units available 60+ days out

### Scenario 5: Pet Policy
**Config:**
- Pet Policy Mode: `strict`
- Lead has pets: Yes

**Expected Results:**
- Should match only pet-friendly properties
- Should NOT match non-pet-friendly properties

### Scenario 6: PUMI Bonus
**Config:**
- PUMI Bonus: 20 points

**Expected Results:**
- PUMI properties should score higher
- Should appear at top of results (if sorting by score)

---

## 📝 Notes

### Test Data Identification
All test data is marked with:
- `is_test_data = true` flag in database
- `[TEST]` prefix in property names

### Safety
- Test data is isolated from real data
- Can be deleted at any time without affecting real properties
- Cleanup is reversible (just re-run generation scripts)

### Performance
- Test data generation takes ~30 seconds for full dataset
- Cleanup takes ~5 seconds
- No impact on production data

---

## 🔧 Troubleshooting

### Issue: "is_test_data column does not exist"
**Solution:** Run migration 046 first to add the column

### Issue: "Property name already exists"
**Solution:** Run cleanup script first, then regenerate

### Issue: "Match counter shows 0"
**Solution:** 
1. Check that test data was created successfully
2. Verify filter settings aren't too restrictive
3. Check browser console for errors

### Issue: "Can't delete test data"
**Solution:**
1. Check RLS policies allow deletion
2. Make sure you're authenticated
3. Try manual DELETE queries in Supabase SQL Editor

---

## 📚 Related Documentation

- [Smart Match Configuration Guide](../SMART_MATCH_CUSTOMIZER_GAMEPLAN.md)
- [Database Schema](../CONTEXT.md)
- [Migration Instructions](../guides/RUN_MIGRATION_INSTRUCTIONS.md)

---

## ✅ Checklist

Before testing Smart Match:
- [ ] Run migration 046 (add is_test_data flag)
- [ ] Run migration 047 (generate test data)
- [ ] Verify test data in Supabase Table Editor
- [ ] Navigate to Smart Match Configuration page
- [ ] Test filter preview counter with different settings
- [ ] Run Smart Match test with test lead
- [ ] Verify results match expected filter criteria

Before production:
- [ ] Run migration 048 (cleanup test data)
- [ ] Verify all test data removed
- [ ] Activate real property feeds
- [ ] Test with real data

---

**Questions?** Check the browser console for detailed logs during generation and cleanup operations.

