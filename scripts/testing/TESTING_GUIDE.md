# Smart Match End-to-End Testing Guide

## 📋 Overview

This guide provides step-by-step instructions for testing the Smart Match system, Customer View mode, and bulk email functionality.

---

## 🎯 Test Data Summary

### Properties: 11 Properties
- [TEST] Alamo Plaza
- [TEST] Budget Oaks Apartments
- [TEST] Family Estates
- [TEST] High Commission Heights
- [TEST] Luxury Towers PUMI
- [TEST] Midtown Heights
- [TEST] Pearl District Luxury
- [TEST] PUMI Paradise
- [TEST] Riverwalk Budget Suites
- [TEST] Studio Central
- Linden at The Rim

### Units: 221 Units
- Diverse configurations: Studio, 1BR, 2BR, 3BR
- Rent range: $800 - $3500
- Availability: Immediate to 90 days out
- Floor levels: 1-5
- Square footage: 450 - 1500+ sqft

### Test Leads: 8 Leads

| Lead Name | Email | Profile | Bedrooms | Budget | Credit | Special Needs |
|-----------|-------|---------|----------|--------|--------|---------------|
| **Budget Betty** | tucker.harris+budget@gmail.com | Budget-conscious, flexible | Studio | Under $1000 | Good | None |
| **Luxury Larry** | tucker.harris+luxury@gmail.com | High-end seeker | 2BR | $2500-3000 | Excellent | Pool, Gym, Concierge |
| **Family Frank** | tucker.harris+family@gmail.com | Family with kids | 3BR | $1500-2000 | Good | Pet-friendly, Ground floor |
| **Professional Paula** | tucker.harris+professional@gmail.com | Young professional | 1BR | $1000-1500 | Excellent | Downtown, Immediate move-in |
| **Pet Owner Pete** | tucker.harris+petowner@gmail.com | Dog owner | 2BR | $1000-1500 | Fair | Pet-friendly REQUIRED |
| **Credit Challenged Charlie** | tucker.harris+creditchallenged@gmail.com | Credit issues | 1BR | Under $1000 | Poor | Flexible on location |
| **Flexible Fiona** | tucker.harris+flexible@gmail.com | Very flexible | 1BR | $1000-1500 | Good | Open to anything |
| **Picky Patricia** | tucker.harris+picky@gmail.com | Very specific | 2BR/2BA exactly | $1500-2000 | Excellent | Top floor, specific amenities |

---

## 🧪 Test Scenarios

### Test 1: Customer View Mode - Basic Functionality

**Objective:** Verify Customer View mode toggle and lead selection works correctly.

**Steps:**
1. Navigate to Listings page (`#/listings`)
2. Click "Customer View" toggle in top-right corner
3. Verify:
   - ✅ Toggle switches to "ON" state
   - ✅ Lead selector dropdown appears
   - ✅ Commission badges are hidden
   - ✅ Commission filter is hidden
4. Select "Budget Betty" from dropdown
5. Verify:
   - ✅ Properties display with star ratings
   - ✅ Star ratings are visible and color-coded
   - ✅ Properties are sorted by match score (highest first)

**Expected Results:**
- Budget Betty should see high scores for:
  - Studio Central (studio units under $1000)
  - Budget Oaks Apartments (affordable options)
  - Riverwalk Budget Suites (budget-friendly)

---

### Test 2: Smart Match Scoring - Luxury Lead

**Objective:** Verify Smart Match scores correctly for high-end requirements.

**Steps:**
1. In Customer View, select "Luxury Larry"
2. Verify star ratings appear on properties
3. Expand top-rated property
4. Verify:
   - ✅ Individual units show star ratings
   - ✅ "BEST MATCH" badge appears on highest-scoring unit
   - ✅ Units are sorted by match score

**Expected Results:**
- Luxury Larry should see high scores for:
  - Luxury Towers PUMI (2BR, high-end amenities)
  - Pearl District Luxury (luxury units)
  - Properties with pool, gym, concierge amenities

---

### Test 3: Smart Match Scoring - Family Lead

**Objective:** Verify Smart Match handles family-specific requirements.

**Steps:**
1. In Customer View, select "Family Frank"
2. Verify star ratings
3. Check which properties score highest
4. Expand top property and verify unit-level scores

**Expected Results:**
- Family Frank should see high scores for:
  - Family Estates (3BR, pet-friendly)
  - Properties with ground floor units
  - Properties with family amenities (playground, etc.)

---

### Test 4: Smart Match Scoring - Pet Owner

**Objective:** Verify pet-friendly filtering works correctly.

**Steps:**
1. In Customer View, select "Pet Owner Pete"
2. Verify star ratings
3. Check if non-pet-friendly properties score low/zero

**Expected Results:**
- Pet Owner Pete should see:
  - High scores ONLY for pet-friendly properties
  - Zero or very low scores for non-pet-friendly properties

---

### Test 5: Smart Match Scoring - Credit Challenged

**Objective:** Verify credit tier affects scoring.

**Steps:**
1. In Customer View, select "Credit Challenged Charlie"
2. Verify star ratings
3. Check if properties with leniency score higher

**Expected Results:**
- Credit Challenged Charlie should see:
  - Higher scores for properties with HIGH leniency
  - Lower scores for properties with LOW leniency

---

### Test 6: Unit-Level Scoring

**Objective:** Verify unit-level match scores display correctly.

**Steps:**
1. In Customer View, select "Picky Patricia"
2. Find a property with multiple units
3. Expand the property row
4. Verify:
   - ✅ Each unit shows its own star rating
   - ✅ "BEST MATCH" badge appears on highest-scoring unit
   - ✅ Units are sorted by match score (highest first)

**Expected Results:**
- Picky Patricia (2BR/2BA, top floor) should see:
  - High scores for 2BR/2BA units on top floors
  - Lower scores for 1BR or ground floor units

---

### Test 7: Missing Data Warning

**Objective:** Verify missing data warning appears when lead has incomplete preferences.

**Steps:**
1. Create a new lead with minimal preferences (only name and email)
2. In Customer View, select this new lead
3. Verify:
   - ✅ Warning banner appears
   - ✅ Warning explains what data is missing
   - ✅ "Edit Lead" button is clickable
4. Click "Edit Lead" button
5. Verify:
   - ✅ Lead details modal opens
   - ✅ Modal is in edit mode
   - ✅ Can update preferences

**Expected Results:**
- Warning should list missing fields (bedrooms, budget, etc.)
- After updating preferences, warning should disappear

---

### Test 8: Bulk Email Functionality

**Objective:** Verify bulk email sending works with test leads.

**Steps:**
1. Navigate to Listings page (Agent View)
2. Select multiple properties (3-5 properties)
3. Click "Bulk Email" button
4. In the modal:
   - Select "Budget Betty" as recipient
   - Verify email preview shows selected properties
   - Click "Send Email"
5. Check Gmail inbox for `tucker.harris+budget@gmail.com`
6. Verify:
   - ✅ Email arrives in inbox
   - ✅ Email contains all selected properties
   - ✅ Email formatting looks professional
   - ✅ Property details are accurate

**Expected Results:**
- Email should arrive within 1-2 minutes
- Email should be well-formatted and mobile-responsive
- All selected properties should be included

---

### Test 9: Bulk Email - Multiple Recipients

**Objective:** Test sending emails to multiple test leads.

**Steps:**
1. Select 2-3 properties
2. Click "Bulk Email"
3. Select multiple leads:
   - Budget Betty
   - Luxury Larry
   - Professional Paula
4. Send email
5. Check Gmail inbox and search for:
   - `+budget`
   - `+luxury`
   - `+professional`
6. Verify each lead received their email

**Expected Results:**
- All selected leads should receive emails
- Each email should be personalized with lead's name
- Emails should arrive separately (one per lead)

---

### Test 10: Email Filtering by Lead Inbox

**Objective:** Verify Gmail+ trick allows filtering emails by lead.

**Steps:**
1. Send bulk emails to all 8 test leads
2. In Gmail, search for each lead:
   - `to:tucker.harris+budget@gmail.com`
   - `to:tucker.harris+luxury@gmail.com`
   - `to:tucker.harris+family@gmail.com`
   - etc.
3. Verify:
   - ✅ Each search shows only emails for that specific lead
   - ✅ Emails are properly filtered
   - ✅ Can easily view "inbox" for each test lead

**Expected Results:**
- Gmail search should isolate emails for each lead
- Easy to see exactly what each lead received

---

## 📊 Testing Checklist

### Customer View Mode
- [ ] Toggle switches between Agent View and Customer View
- [ ] Lead selector appears in Customer View
- [ ] Commission badges hidden in Customer View
- [ ] Commission filter hidden in Customer View
- [ ] Star ratings display on properties
- [ ] Star ratings display on units
- [ ] "BEST MATCH" badge appears on top unit
- [ ] Properties sorted by match score
- [ ] Units sorted by match score within property

### Smart Match Scoring
- [ ] Budget Betty scores high for affordable studios
- [ ] Luxury Larry scores high for luxury 2BR units
- [ ] Family Frank scores high for 3BR pet-friendly properties
- [ ] Professional Paula scores high for downtown 1BR units
- [ ] Pet Owner Pete scores high ONLY for pet-friendly properties
- [ ] Credit Challenged Charlie scores higher for lenient properties
- [ ] Flexible Fiona scores reasonably for many properties
- [ ] Picky Patricia scores high only for exact matches (2BR/2BA, top floor)

### Missing Data Handling
- [ ] Warning appears when lead has incomplete preferences
- [ ] Warning lists specific missing fields
- [ ] "Edit Lead" button opens modal
- [ ] Modal allows editing preferences
- [ ] Warning disappears after updating preferences

### Bulk Email
- [ ] Can select multiple properties
- [ ] Bulk Email button appears
- [ ] Email preview modal shows selected properties
- [ ] Can select single lead
- [ ] Can select multiple leads
- [ ] Emails send successfully
- [ ] Emails arrive in Gmail inbox
- [ ] Email formatting is professional
- [ ] Property details are accurate
- [ ] Gmail+ filtering works correctly

---

## 🐛 Known Issues / Notes

- Document any bugs or unexpected behavior here during testing
- Note any performance issues
- Record any UX improvements needed

---

## ✅ Sign-Off

**Tester:** ___________________  
**Date:** ___________________  
**Status:** [ ] PASS [ ] FAIL [ ] NEEDS WORK  

**Notes:**

