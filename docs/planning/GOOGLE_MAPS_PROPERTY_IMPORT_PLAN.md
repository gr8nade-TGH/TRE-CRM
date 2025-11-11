# Google Maps API Property Import - Implementation Plan

**Created:** 2025-11-01  
**Status:** Planning Phase  
**Goal:** Import 500+ San Antonio apartment complexes using Google Maps Places API

---

## 📊 Executive Summary

### **The Challenge**
Google Maps Places API provides **property-level data only** (name, address, phone, photos, ratings), but our Smart Match algorithm requires **unit-level data** (bedrooms, bathrooms, rent prices, availability dates, floor plans).

### **The Gap**
| Data Type | Google Maps Provides | TRE CRM Requires | Status |
|-----------|---------------------|------------------|--------|
| Property Name | ✅ Yes | ✅ Required | ✅ Available |
| Address | ✅ Yes | ✅ Required | ✅ Available |
| Phone | ✅ Yes | ⚠️ Optional | ✅ Available |
| Website | ✅ Yes | ⚠️ Optional | ✅ Available |
| Photos | ✅ Yes | ⚠️ Optional | ✅ Available |
| Ratings/Reviews | ✅ Yes | ⚠️ Optional | ✅ Available |
| Coordinates (lat/lng) | ✅ Yes | ⚠️ Optional | ✅ Available |
| **Bedrooms** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |
| **Bathrooms** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |
| **Rent Prices** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |
| **Floor Plans** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |
| **Units** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |
| **Availability Dates** | ❌ No | ✅ **REQUIRED** | ❌ **MISSING** |

### **The Solution**
Implement a **two-phase import strategy**:
1. **Phase 1:** Import property-level data from Google Maps (name, address, phone, photos)
2. **Phase 2:** Manual data entry or scraping for unit-level data (bedrooms, bathrooms, rent, floor plans)

---

## 🏗️ Database Schema Analysis

### **Current Schema Requirements**

#### **1. Properties Table** (Can be populated from Google Maps)
```sql
-- ✅ Fields Google Maps CAN provide:
- name / community_name          ✅ From place.name
- street_address                 ✅ From place.formatted_address
- city                          ✅ From place.address_components
- state                         ✅ From place.address_components
- zip_code                      ✅ From place.address_components
- phone                         ✅ From place.formatted_phone_number
- website / leasing_link        ✅ From place.website
- photos[]                      ✅ From place.photos (URLs)
- map_lat / lat                 ✅ From place.geometry.location.lat
- map_lng / lng                 ✅ From place.geometry.location.lng
- description                   ✅ From place.editorial_summary or reviews
- neighborhood                  ✅ From place.vicinity or address_components
- data_source                   ✅ Set to 'google_maps_api'
- is_verified                   ✅ Set to false (needs manual verification)
- last_refreshed_at             ✅ Set to NOW()

-- ❌ Fields Google Maps CANNOT provide:
- bed_range                     ❌ Not available
- bath_range                    ❌ Not available
- rent_range_min                ❌ Not available
- rent_range_max                ❌ Not available
- commission_pct                ❌ Not available
- is_pumi                       ❌ Not available (business-specific)
- amenities[]                   ⚠️ Partial (from reviews/description)
- contact_email                 ❌ Not available
- leniency                      ❌ Not available (business-specific)
```

#### **2. Floor Plans Table** (CANNOT be populated from Google Maps)
```sql
-- ❌ ALL fields require manual entry or scraping:
- property_id                   ✅ Link to imported property
- name                          ❌ e.g., "1x1 Classic", "2x2 Deluxe"
- beds                          ❌ REQUIRED for Smart Match
- baths                         ❌ REQUIRED for Smart Match
- sqft                          ❌ Optional but recommended
- market_rent                   ❌ REQUIRED for Smart Match
- starting_at                   ❌ REQUIRED for Smart Match
- has_concession                ❌ Optional
- concession_type               ❌ Optional
- units_available               ❌ Optional
- soonest_available             ❌ Optional
```

#### **3. Units Table** (CANNOT be populated from Google Maps)
```sql
-- ❌ ALL fields require manual entry or scraping:
- floor_plan_id                 ✅ Link to floor plan
- property_id                   ✅ Link to imported property
- unit_number                   ❌ e.g., "101", "2A"
- floor                         ❌ Optional
- rent                          ❌ REQUIRED for Smart Match
- available_from                ❌ REQUIRED for Smart Match
- is_available                  ❌ REQUIRED for Smart Match
- status                        ❌ REQUIRED for Smart Match
```

---

## 🔍 Google Maps Places API Research

### **API Endpoints Needed**

#### **1. Places Search API (Text Search)**
**Purpose:** Find apartment complexes in San Antonio

**Endpoint:**
```
POST https://places.googleapis.com/v1/places:searchText
```

**Request Body:**
```json
{
  "textQuery": "apartment complexes in San Antonio, TX",
  "maxResultCount": 20,
  "locationBias": {
    "circle": {
      "center": {
        "latitude": 29.4241,
        "longitude": -98.4936
      },
      "radius": 50000.0
    }
  }
}
```

**Response Fields:**
- `places[].id` - Unique place ID
- `places[].displayName.text` - Property name
- `places[].formattedAddress` - Full address
- `places[].location` - Lat/lng coordinates

#### **2. Place Details API**
**Purpose:** Get detailed information for each property

**Endpoint:**
```
GET https://places.googleapis.com/v1/places/{PLACE_ID}
```

**Field Mask (specify which fields to return):**
```
displayName,formattedAddress,addressComponents,location,
phoneNumber,websiteUri,photos,rating,userRatingCount,
editorialSummary,types
```

**Response Example:**
```json
{
  "displayName": {"text": "Linden at The Rim"},
  "formattedAddress": "17803 La Cantera Pkwy, San Antonio, TX 78257",
  "addressComponents": [...],
  "location": {"latitude": 29.5994, "longitude": -98.6506},
  "phoneNumber": "(210) 555-1234",
  "websiteUri": "https://lindenattherim.com",
  "photos": [{...}],
  "rating": 4.2,
  "userRatingCount": 156,
  "editorialSummary": {"text": "Modern apartments near The Rim shopping center"}
}
```

#### **3. Places Photos API**
**Purpose:** Retrieve property images

**Endpoint:**
```
GET https://places.googleapis.com/v1/{PHOTO_RESOURCE_NAME}/media
```

**Parameters:**
- `maxHeightPx` or `maxWidthPx` - Image dimensions
- `skipHttpRedirect` - Get photo URL instead of binary data

---

## 💰 API Pricing & Rate Limits

### **Google Maps Platform Pricing (as of 2024)**

| API Call | Cost per Request | Free Tier | Notes |
|----------|-----------------|-----------|-------|
| Text Search | $32 per 1000 requests | $200/month credit | ~6 free requests |
| Place Details (Basic) | $17 per 1000 requests | $200/month credit | ~11 free requests |
| Place Details (Contact) | $3 per 1000 requests | $200/month credit | ~66 free requests |
| Place Details (Atmosphere) | $5 per 1000 requests | $200/month credit | ~40 free requests |
| Place Photos | $7 per 1000 requests | $200/month credit | ~28 free requests |

### **Cost Estimate for 500 Properties**

**Scenario 1: Basic Import (Name, Address, Phone)**
- Text Search: 25 requests × $0.032 = **$0.80**
- Place Details (Basic + Contact): 500 × $0.020 = **$10.00**
- **Total: $10.80** (within free tier)

**Scenario 2: Full Import (+ Photos, Ratings)**
- Text Search: 25 requests × $0.032 = **$0.80**
- Place Details (All fields): 500 × $0.025 = **$12.50**
- Place Photos: 500 × $0.007 = **$3.50**
- **Total: $16.80** (within free tier)

### **Rate Limits**
- **Queries Per Second (QPS):** 100 QPS default
- **Daily Quota:** Unlimited (pay-as-you-go after free tier)
- **Recommendation:** Implement rate limiting (1-2 requests/second) to avoid hitting QPS limits

---

## 🎯 Implementation Strategy

### **Recommended Approach: Two-Phase Import**

#### **Phase 1: Property Shell Import (Google Maps API)**
**Goal:** Create property records with basic information

**What Gets Imported:**
- ✅ Property name
- ✅ Full address (street, city, state, zip)
- ✅ Phone number
- ✅ Website URL
- ✅ Coordinates (lat/lng)
- ✅ Photos (up to 10 per property)
- ✅ Google rating & review count
- ✅ Description (from editorial summary)

**What Gets Set as Defaults:**
- `data_source` = 'google_maps_api'
- `is_verified` = false
- `market` = 'San Antonio'
- `bed_range` = NULL (to be filled later)
- `rent_range_min` = NULL (to be filled later)
- `rent_range_max` = NULL (to be filled later)
- `commission_pct` = NULL
- `is_pumi` = false

**Database State After Phase 1:**
```
properties: 500 records ✅
floor_plans: 0 records ❌
units: 0 records ❌
```

#### **Phase 2: Unit Data Entry (Manual or Scraping)**
**Goal:** Add floor plans and units to make properties usable for Smart Match

**Options:**

**Option A: Manual Data Entry (Recommended for MVP)**
- Create admin tool for bulk unit entry
- Managers can add floor plans and units one property at a time
- Prioritize PUMI properties and high-commission properties first
- Estimated time: 5-10 minutes per property = 40-80 hours for 500 properties

**Option B: Web Scraping (Advanced)**
- Scrape property websites for floor plan data
- Requires custom scraper for each property management company
- Legal considerations (check robots.txt, terms of service)
- Estimated development time: 40-80 hours
- Maintenance burden: High (websites change frequently)

**Option C: Third-Party Data Provider (Expensive)**
- Services like RentPath, Apartments.com API, Zillow Rental Manager
- Cost: $500-$5000/month for data access
- Data quality: High
- Legal: Fully compliant

**Recommendation:** Start with **Option A** (manual entry) for 50-100 priority properties, then evaluate Option B or C based on ROI.

---

## 🛠️ Technical Implementation Plan

### **Architecture Decision: Admin Tool vs. One-Time Script**

**Recommendation:** Build an **Admin Tool** (not a one-time script)

**Rationale:**
1. **Ongoing Updates:** Property data changes (new properties open, old ones close)
2. **Incremental Imports:** Can import properties in batches (e.g., by neighborhood)
3. **Error Recovery:** Can retry failed imports without re-running entire script
4. **Audit Trail:** Track which properties were imported, when, and by whom
5. **User-Friendly:** Managers can trigger imports without developer intervention

### **Proposed Admin Tool: "Property Import Manager"**

**Location:** New page at `#/import-properties` (manager/super_user only)

**Features:**
1. **Search Configuration**
   - Search query input (e.g., "luxury apartments in Alamo Heights")
   - Location bias (center point + radius)
   - Max results slider (20-100)
   - Preview search results before importing

2. **Import Preview**
   - Table showing properties that will be imported
   - Columns: Name, Address, Phone, Website, Rating, Photos Count
   - Checkboxes to select/deselect properties
   - Duplicate detection (highlight properties already in database)

3. **Import Execution**
   - Progress bar showing import status
   - Real-time log of API calls and database inserts
   - Error handling with retry logic
   - Summary report (X imported, Y skipped, Z errors)

4. **Post-Import Actions**
   - View imported properties
   - Mark properties for priority data entry
   - Export list of properties needing unit data

### **Database Schema Additions**

**New Table: `property_import_logs`**
```sql
CREATE TABLE IF NOT EXISTS public.property_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL, -- Group imports by batch
    property_id UUID REFERENCES public.properties(id),
    google_place_id VARCHAR, -- Google Maps Place ID
    status VARCHAR NOT NULL, -- 'success', 'skipped', 'error'
    error_message TEXT,
    imported_by VARCHAR REFERENCES public.users(id),
    imported_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Properties Table Additions:**
```sql
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_review_count INTEGER,
ADD COLUMN IF NOT EXISTS needs_unit_data BOOLEAN DEFAULT true;
```

---

## 📝 Data Mapping Strategy

### **Google Maps → TRE CRM Properties Table**

```javascript
// Mapping function
function mapGooglePlaceToProperty(place, userId) {
    return {
        id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        
        // Google Maps data
        name: place.displayName?.text || 'Unknown Property',
        community_name: place.displayName?.text || 'Unknown Property',
        street_address: extractStreetAddress(place.addressComponents),
        city: extractCity(place.addressComponents) || 'San Antonio',
        state: extractState(place.addressComponents) || 'TX',
        zip_code: extractZipCode(place.addressComponents),
        phone: place.phoneNumber || null,
        website: place.websiteUri || null,
        leasing_link: place.websiteUri || null,
        map_lat: place.location?.latitude || null,
        map_lng: place.location?.longitude || null,
        lat: place.location?.latitude || null,
        lng: place.location?.longitude || null,
        photos: extractPhotoUrls(place.photos) || [],
        description: place.editorialSummary?.text || null,
        neighborhood: place.vicinity || extractNeighborhood(place.addressComponents),
        google_place_id: place.id,
        google_rating: place.rating || null,
        google_review_count: place.userRatingCount || null,
        
        // Default values
        market: 'San Antonio',
        data_source: 'google_maps_api',
        is_verified: false,
        needs_unit_data: true,
        last_refreshed_at: new Date().toISOString(),
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // NULL values (to be filled later)
        bed_range: null,
        bath_range: null,
        rent_range_min: null,
        rent_range_max: null,
        commission_pct: null,
        is_pumi: false,
        amenities: [],
        contact_email: null,
        leniency: null
    };
}
```

---

## ⚠️ Critical Limitations & Workarounds

### **Limitation 1: No Unit-Level Data**
**Impact:** Properties cannot be used for Smart Match until units are added  
**Workaround:**  
- Display imported properties on Listings page with "Needs Unit Data" badge
- Filter out properties with `needs_unit_data = true` from Smart Match algorithm
- Create admin workflow to prioritize unit data entry for high-value properties

### **Limitation 2: No Rent Prices**
**Impact:** Cannot calculate rent ranges or match leads by budget  
**Workaround:**  
- Scrape rent prices from property websites (if available)
- Use third-party data providers (RentPath, Apartments.com)
- Manual entry by managers

### **Limitation 3: No Floor Plan Details**
**Impact:** Cannot match leads by bedroom/bathroom preferences  
**Workaround:**  
- Scrape floor plan pages from property websites
- Manual entry using standardized floor plan templates
- Import from CSV if property provides data

### **Limitation 4: Duplicate Detection**
**Impact:** May import properties that already exist in database  
**Workaround:**  
- Check for duplicates by address before importing
- Use fuzzy matching on property name + address
- Store `google_place_id` to prevent re-importing same property

---

## 🧪 Testing Plan

### **Phase 1: API Integration Testing**
1. Test Google Maps API authentication
2. Test Text Search with various queries
3. Test Place Details for sample properties
4. Test Photo URL extraction
5. Verify rate limiting works correctly

### **Phase 2: Data Mapping Testing**
1. Test address component extraction (street, city, state, zip)
2. Test photo URL generation
3. Test duplicate detection logic
4. Verify all required fields are populated

### **Phase 3: Import Tool Testing**
1. Import 5 test properties
2. Verify properties appear on Listings page
3. Verify "Needs Unit Data" badge displays
4. Test error handling (invalid API key, rate limit exceeded)
5. Test import log creation

### **Phase 4: Integration Testing**
1. Verify imported properties don't break existing features
2. Verify Smart Match excludes properties without units
3. Verify map markers display correctly
4. Verify property details modal works

---

## 📋 Implementation Checklist

### **Backend (API & Database)**
- [ ] Create `property_import_logs` table migration
- [ ] Add `google_place_id`, `google_rating`, `google_review_count`, `needs_unit_data` columns to properties
- [ ] Create Google Maps API service module (`src/api/google-maps-api.js`)
- [ ] Implement Text Search function
- [ ] Implement Place Details function
- [ ] Implement Photo URL extraction
- [ ] Create property import API endpoint (`/api/import-properties`)
- [ ] Implement duplicate detection logic
- [ ] Add rate limiting middleware

### **Frontend (Admin Tool)**
- [ ] Create Property Import page (`#/import-properties`)
- [ ] Build search configuration form
- [ ] Build import preview table
- [ ] Build import progress UI
- [ ] Build import summary report
- [ ] Add "Needs Unit Data" badge to Listings page
- [ ] Filter Smart Match to exclude properties with `needs_unit_data = true`

### **Documentation**
- [ ] API key setup instructions
- [ ] Import workflow guide for managers
- [ ] Unit data entry workflow guide
- [ ] Troubleshooting guide

---

## 🚀 Next Steps

1. **Get Stakeholder Approval** on two-phase approach
2. **Obtain Google Maps API Key** and enable Places API
3. **Build Phase 1:** Property Import Tool (estimated 16-24 hours)
4. **Import 50 Test Properties** and validate data quality
5. **Build Phase 2:** Unit Data Entry Tool (estimated 8-16 hours)
6. **Manually Add Units** for 10-20 priority properties
7. **Evaluate ROI** of web scraping vs. continued manual entry

---

## 💡 Alternative Approaches Considered

### **Approach 1: Apartments.com API** ❌ Rejected
- **Pros:** Has unit-level data, rent prices, floor plans
- **Cons:** Expensive ($500-$5000/month), requires partnership agreement
- **Verdict:** Too expensive for MVP

### **Approach 2: Web Scraping Only** ❌ Rejected
- **Pros:** Can get unit-level data directly
- **Cons:** Legally risky, high maintenance, fragile (breaks when sites change)
- **Verdict:** Too risky and time-consuming

### **Approach 3: Manual Entry Only** ❌ Rejected
- **Pros:** Full control, no API costs
- **Cons:** 40-80 hours of manual work for 500 properties
- **Verdict:** Too slow, doesn't scale

### **Approach 4: Google Maps + Manual Entry** ✅ **SELECTED**
- **Pros:** Fast property discovery, legal, low cost, scalable
- **Cons:** Requires two-phase approach
- **Verdict:** Best balance of speed, cost, and data quality

---

**End of Plan**

