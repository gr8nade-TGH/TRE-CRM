# Property Data Acquisition Strategy - Final Recommendation

**Created:** 2025-11-01  
**Status:** ✅ **READY FOR APPROVAL**  
**Decision:** Use RentCast API + GPT-5 Deep Search (Hybrid Approach)

---

## 🎯 Executive Summary

After comprehensive research of the RentCast API, I have a **GAME-CHANGING RECOMMENDATION** that completely changes our approach:

### **❌ ABANDON Google Maps Places API**
### **✅ USE RentCast API Instead**

**Why?** RentCast provides **EVERYTHING** we need:
- ✅ Property names, addresses, phone numbers, coordinates
- ✅ **Bedrooms, bathrooms, rent prices** (Google Maps doesn't have this!)
- ✅ Active rental listings with availability status
- ✅ Listing agent contact information
- ✅ Square footage, year built, property features
- ✅ 140+ million properties nationwide

**Cost:** $149/month (vs. Google Maps $20/month)  
**ROI:** 970-2,040% (saves 40-80 hours of manual data entry worth $1,600-$3,200)

---

## 📊 Three-Way Comparison

| Feature | Google Maps API | RentCast API | GPT-5 Deep Search |
|---------|----------------|--------------|-------------------|
| **Property Name** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Address** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Phone** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Website** | ✅ Yes | ❌ No | ✅ Yes |
| **Photos** | ✅ Yes | ✅ Yes (via listings) | ✅ Yes |
| **Bedrooms** | ❌ **NO** | ✅ **YES** | ✅ Yes |
| **Bathrooms** | ❌ **NO** | ✅ **YES** | ✅ Yes |
| **Rent Prices** | ❌ **NO** | ✅ **YES** | ✅ Yes |
| **Availability** | ❌ No | ✅ Yes | ✅ Yes |
| **Square Footage** | ❌ No | ✅ Yes | ✅ Yes |
| **Listing Agent** | ❌ No | ✅ Yes | ❌ No |
| **Coverage** | ~100% | ~60-70% | ~100% |
| **Data Quality** | High | Very High | Medium-High |
| **Cost (500 properties)** | $10-20 | $149/month | $10-20 |
| **Manual Work Required** | 40-80 hours | 0 hours | 5-10 hours |
| **Legal/Compliance** | ✅ 100% legal | ✅ 100% legal | ✅ 100% legal |
| **Scalability** | High | Very High | Medium |

---

## 🏆 Recommended Strategy: Three-Tier Hybrid Approach

### **Tier 1: RentCast API (Primary Source)** - 60-70% of properties

**Use For:** Properties with active rental listings

**Data Obtained:**
- ✅ Complete property information
- ✅ Bedrooms, bathrooms, rent prices
- ✅ Listing agent contact information
- ✅ Availability status
- ✅ Square footage, year built

**Workflow:**
1. Search RentCast for San Antonio apartment listings
2. Import property + floor plan + unit data in one pass
3. Mark as `data_source = 'rentcast_api'`
4. Set `needs_unit_data = false`

**Cost:** $149/month (Professional plan, 2,000 requests)

**Expected Results:** 300-400 properties with complete unit data

---

### **Tier 2: GPT-5 Deep Search (Secondary Source)** - 20-30% of properties

**Use For:** Properties NOT in RentCast (no active listings)

**Data Obtained:**
- ✅ Property name, address, phone, website
- ✅ Bedrooms, bathrooms (from property website)
- ✅ Rent ranges (from property website)
- ✅ Amenities, features
- ✅ Contact information

**Workflow:**
1. Identify properties missing from RentCast
2. Use GPT-5 Deep Search to research each property's website
3. Extract unit-level data from website
4. Create structured data for import
5. Mark as `data_source = 'gpt5_research'`
6. Set `needs_unit_data = false` (if complete) or `true` (if partial)

**Cost:** $10-20 (user confirmed "won't cost much")

**Expected Results:** 100-150 properties with complete or partial unit data

---

### **Tier 3: Manual Outreach (Tertiary Source)** - 5-10% of properties

**Use For:** High-priority properties (PUMI, high commission) without data

**Data Obtained:**
- ✅ Direct data feed from property
- ✅ Real-time availability
- ✅ Partnership agreement

**Workflow:**
1. Identify high-value properties without data
2. Contact property management directly
3. Request data feed or manual data sharing
4. Import data manually or via API
5. Mark as `data_source = 'manual_feed'`

**Cost:** Manual labor (5-10 hours)

**Expected Results:** 25-50 high-priority properties with complete data

---

## 💰 Cost-Benefit Analysis

### **Total Investment**

| Component | Cost | Notes |
|-----------|------|-------|
| **RentCast API** | $149/month | Professional plan (2,000 requests) |
| **GPT-5 Deep Search** | $10-20/month | User's existing access |
| **Development (Phase 1)** | $960-$1,280 | 24-32 hours @ $40/hr |
| **Manual Outreach** | $200-$400 | 5-10 hours @ $40/hr |
| **Total First Month** | $1,319-$1,849 | One-time + recurring |
| **Ongoing Monthly** | $159-$169 | RentCast + GPT-5 |

### **Expected Returns**

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|------------|
| **Properties Imported** | 400 | 450 | 500 |
| **Properties with Units** | 350 | 400 | 450 |
| **Smart Match Coverage** | 70% | 80% | 90% |
| **Additional Leads Matched** | 50/month | 75/month | 100/month |
| **Conversion Rate** | 10% | 15% | 20% |
| **Closed Deals** | 5/month | 11/month | 20/month |
| **Revenue per Deal** | $500 | $1,000 | $1,500 |
| **Monthly Revenue** | $2,500 | $11,000 | $30,000 |
| **First Month ROI** | 90% | 495% | 1,522% |
| **Ongoing Monthly ROI** | 1,471% | 6,409% | 17,661% |

**Conclusion:** Even in the conservative scenario, this is a **no-brainer investment**.

---

## 📋 Revised Implementation Plan

### **Phase 1: RentCast API Integration** (Week 1-2)

**Goal:** Import 300-400 properties with complete unit data from RentCast

**Tasks:**
1. ✅ Create RentCast account and get API key
2. ✅ Build RentCast API service module (`src/api/rentcast-api.js`)
3. ✅ Implement rental listings search
4. ✅ Implement property records search
5. ✅ Build data mapping functions
6. ✅ Create database migration for RentCast fields
7. ✅ Build Property Import page (reuse Google Maps design)
8. ✅ Test with 10 sample properties
9. ✅ Import all San Antonio rental listings

**Deliverables:**
- RentCast API service module
- Property Import page
- 300-400 properties with complete unit data
- Database migration

**Time:** 24-32 hours

**Cost:** $149 (RentCast) + $960-$1,280 (development)

---

### **Phase 2: GPT-5 Deep Search Integration** (Week 3)

**Goal:** Research and import 100-150 properties missing from RentCast

**Tasks:**
1. ✅ Identify properties not in RentCast (compare with known San Antonio apartments)
2. ✅ Build GPT-5 Deep Search integration
3. ✅ Create research prompt template
4. ✅ Build data extraction and validation
5. ✅ Create import workflow for GPT-5 data
6. ✅ Research 100-150 properties
7. ✅ Import extracted data

**Deliverables:**
- GPT-5 Deep Search integration
- 100-150 additional properties
- Research quality validation

**Time:** 16-24 hours

**Cost:** $10-20 (GPT-5) + $640-$960 (development)

---

### **Phase 3: Manual Outreach & Partnership** (Week 4)

**Goal:** Secure data feeds for 25-50 high-priority properties

**Tasks:**
1. ✅ Identify high-priority properties (PUMI, high commission)
2. ✅ Create outreach email templates
3. ✅ Contact property management companies
4. ✅ Negotiate data sharing agreements
5. ✅ Build manual data import workflow
6. ✅ Import data from partnerships

**Deliverables:**
- Outreach templates
- 5-10 partnership agreements
- 25-50 high-priority properties with data

**Time:** 8-12 hours

**Cost:** $320-$480 (development + outreach)

---

### **Phase 4: Validation & Optimization** (Week 5)

**Goal:** Verify all data, test Smart Match, optimize performance

**Tasks:**
1. ✅ Verify all properties display correctly
2. ✅ Test Smart Match with imported properties
3. ✅ Verify map markers and property details
4. ✅ Test filtering and search
5. ✅ Optimize database queries
6. ✅ Set up monthly data refresh schedule

**Deliverables:**
- 450-500 properties total
- Smart Match coverage 80%+
- All features validated
- Monthly refresh automation

**Time:** 8-12 hours

**Cost:** $320-$480 (development)

---

## 🎯 Data Source Priority Matrix

### **Decision Tree: Which Data Source to Use?**

```
START: Need data for San Antonio apartment property
    ↓
    Is property in RentCast API?
    ├─ YES → Use RentCast (Tier 1)
    │         ├─ Has active listing? → Import complete data
    │         └─ No active listing? → Use Property Records + Rent Estimate
    │
    └─ NO → Is property high-priority (PUMI or high commission)?
              ├─ YES → Manual Outreach (Tier 3)
              │         └─ Contact property directly for data feed
              │
              └─ NO → GPT-5 Deep Search (Tier 2)
                        ├─ Property has website? → Research website
                        ├─ Extract unit data → Import
                        └─ No website? → Mark as needs_unit_data = true
```

---

## 📊 Database Schema Updates

### **New Fields for Properties Table**

```sql
-- Migration 043: Multi-Source Data Acquisition Tracking
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS data_source_id VARCHAR,
ADD COLUMN IF NOT EXISTS data_last_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_sync_frequency VARCHAR DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS needs_unit_data BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_quality_score INTEGER,
ADD COLUMN IF NOT EXISTS rentcast_property_id VARCHAR,
ADD COLUMN IF NOT EXISTS rentcast_listing_id VARCHAR,
ADD COLUMN IF NOT EXISTS gpt5_research_notes TEXT,
ADD COLUMN IF NOT EXISTS gpt5_research_date TIMESTAMP;

-- Create index for data source queries
CREATE INDEX IF NOT EXISTS idx_properties_data_source ON public.properties(data_source);
CREATE INDEX IF NOT EXISTS idx_properties_needs_unit_data ON public.properties(needs_unit_data);
CREATE INDEX IF NOT EXISTS idx_properties_rentcast_id ON public.properties(rentcast_property_id);

-- Add check constraint for data_source
ALTER TABLE public.properties
ADD CONSTRAINT chk_data_source CHECK (
    data_source IN ('manual', 'rentcast_api', 'gpt5_research', 'google_maps', 'manual_feed', 'third_party_api')
);

-- Add check constraint for data_sync_frequency
ALTER TABLE public.properties
ADD CONSTRAINT chk_data_sync_frequency CHECK (
    data_sync_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'manual', 'never')
);
```

---

## 🔄 Data Refresh Strategy

### **Monthly Sync Schedule**

| Data Source | Sync Frequency | Reason |
|-------------|---------------|--------|
| **RentCast API** | Monthly | Listing status changes, new listings |
| **GPT-5 Deep Search** | Quarterly | Website updates, new floor plans |
| **Manual Feeds** | Real-time | Direct API integration |

### **Sync Workflow**

1. **Week 1 of Month:** Re-sync all RentCast properties
   - Update listing status (Active → Inactive)
   - Add new listings
   - Update rent prices
   - Update availability

2. **Week 2 of Month:** Identify new properties
   - Search for new San Antonio apartments
   - Add to import queue

3. **Week 3 of Month:** GPT-5 research for new properties
   - Research properties not in RentCast
   - Extract unit data
   - Import new data

4. **Week 4 of Month:** Manual outreach
   - Contact properties without data
   - Follow up on partnership requests
   - Import manual data feeds

---

## ⚠️ Risk Mitigation

### **Risk 1: RentCast Coverage Gaps**

**Risk:** Only 60-70% of properties have active listings in RentCast

**Mitigation:**
- ✅ Use GPT-5 Deep Search for remaining 30-40%
- ✅ Use RentCast Property Records + Rent Estimate for properties without listings
- ✅ Manual outreach for high-priority properties

**Impact:** Low (multiple fallback options)

---

### **Risk 2: Data Quality Issues**

**Risk:** GPT-5 may extract incorrect data from websites

**Mitigation:**
- ✅ Manual review of GPT-5 extracted data
- ✅ Confidence scoring for GPT-5 data
- ✅ Flag low-confidence data for manual verification
- ✅ User feedback loop to improve extraction

**Impact:** Medium (requires manual review)

---

### **Risk 3: API Cost Overruns**

**Risk:** RentCast or GPT-5 costs exceed budget

**Mitigation:**
- ✅ Set API request limits
- ✅ Cache data locally (1-month TTL)
- ✅ Monitor usage weekly
- ✅ Set billing alerts at $100, $150, $200

**Impact:** Low (predictable pricing, caching reduces requests)

---

### **Risk 4: Data Staleness**

**Risk:** Imported data becomes outdated

**Mitigation:**
- ✅ Monthly sync schedule
- ✅ Last synced timestamp on each property
- ✅ Visual indicator for stale data (>60 days)
- ✅ Automated sync reminders

**Impact:** Low (monthly sync keeps data fresh)

---

## 📈 Success Metrics

### **Week 2 Targets**
- ✅ 300+ properties imported from RentCast
- ✅ 80%+ have complete unit data
- ✅ Smart Match coverage 60%+

### **Week 4 Targets**
- ✅ 400+ properties total
- ✅ 85%+ have complete unit data
- ✅ Smart Match coverage 75%+

### **Week 6 Targets**
- ✅ 450+ properties total
- ✅ 90%+ have complete unit data
- ✅ Smart Match coverage 80%+
- ✅ 5-10 partnership agreements

### **Month 3 Targets**
- ✅ 500 properties total
- ✅ 95%+ have complete unit data
- ✅ Smart Match coverage 85%+
- ✅ 10-20 partnership agreements
- ✅ 20%+ increase in closed deals

---

## 🚀 Next Steps - Awaiting Your Approval

### **Option 1: Full Approval - Proceed with All Phases**

**Action:** Approve entire strategy (RentCast + GPT-5 + Manual Outreach)

**Timeline:** 5 weeks to complete all phases

**Investment:** $1,319-$1,849 first month, $159-$169/month ongoing

**Expected Outcome:** 450-500 properties with 90%+ complete unit data

---

### **Option 2: Phased Approval - Start with RentCast Only**

**Action:** Approve Phase 1 only (RentCast API integration)

**Timeline:** 2 weeks to complete Phase 1

**Investment:** $1,109-$1,429 first month

**Expected Outcome:** 300-400 properties with complete unit data, then evaluate before proceeding

---

### **Option 3: Proof of Concept - Test with 50 Properties**

**Action:** Build minimal RentCast integration, import 50 properties

**Timeline:** 1 week

**Investment:** $149 (RentCast) + $320-$480 (8-12 hours development)

**Expected Outcome:** Validate approach before full implementation

---

## ❓ Questions for You

Before I proceed with implementation, please confirm:

1. **Which option do you prefer?**
   - Option 1: Full approval (all phases)
   - Option 2: Phased approval (RentCast only first)
   - Option 3: Proof of concept (50 properties test)

2. **Do you have GPT-5 Deep Search API access?**
   - If yes, what's the API endpoint and authentication method?
   - If no, should we skip Tier 2 and focus on RentCast + Manual Outreach?

3. **What's your budget approval limit?**
   - Can you approve $1,319-$1,849 for first month?
   - Can you approve $159-$169/month ongoing?

4. **What's your timeline?**
   - Need this ASAP (2-3 weeks)?
   - Can wait for full implementation (5-6 weeks)?
   - Want proof of concept first (1 week)?

5. **Any specific San Antonio neighborhoods to prioritize?**
   - Should we focus on specific zip codes first?
   - Any known high-performing properties to include?

---

**This is a planning document only. No code has been implemented yet. Awaiting your approval to proceed.** 🚀

