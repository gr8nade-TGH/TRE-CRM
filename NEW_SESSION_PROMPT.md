# TRE CRM - Auto Unit Scanner Context

## Current Status
We're testing the **Auto Unit Scanner** feature that automatically scans property websites and ILS sites to find available units.

---

## What the Auto Unit Scanner Does
Automatically scans property websites and ILS sites (apartments.com, zillow, rent.com) to find available units with floor plans, pricing, and availability. It runs continuously with 15-second delays between scans.

## 7 Scan Methods (priority order)
1. `property-base` - Scrapes property homepage directly
2. `property-floorplans` - Scrapes /floorplans path
3. `property-floor-plans` - Scrapes /floor-plans path
4. `property-availability` - Scrapes /availability path
5. `apartments.com` - Google search for property on apartments.com
6. `zillow.com` - Google search for property on zillow.com
7. `rent.com` - Google search for property on rent.com

## Adaptive Learning System
- Each method tracks success/failure rates in `unit_scan_history` table
- Methods need 10+ attempts before stats are reliable
- Methods below 10% success become "low-priority" (still run, just less often)
- Methods are NEVER fully disabled - always keeps trying

## Tech Stack
- **Browserless.io** `/function` API - Runs Puppeteer in cloud to scrape JavaScript-heavy sites
- **SerpAPI** - Google search to find property listings on ILS sites
- **OpenAI GPT-4o-mini** - Extracts structured unit data from scraped HTML
- **Supabase** - PostgreSQL database storing properties, units, scan history

## Key Files
| File | Purpose |
|------|---------|
| `api/property/auto-scan.js` | Main API - method rotation, scraping, AI extraction |
| `src/modules/discovery/discovery.js` | Frontend - Auto-Scan UI, debug logging, countdown timer |
| `index.html` | Contains the Auto Unit Scanner panel HTML |

## Database Tables
- `properties` - Property data including `leasing_link` (website URL)
- `units` - Unit data (floor plans, pricing, availability)
- `unit_scan_history` - Scan attempts with success/failure per method

## Recent Fixes Applied (Dec 5, 2025)

### 1. Corrupted Leasing URLs (FIXED in database)
139 properties had Google redirect URLs like `/url?q=http://example.com/&opi=...`
- Fixed via SQL to extract real URLs
- Also decoded URL-encoded characters (%3F, %26, %3D)

### 2. Scan History Cleared
Reset `unit_scan_history` table for fresh start with clean URLs

### 3. Timer Bug (FIXED in code)
Changed from `setInterval` to `setTimeout` chain so countdown only starts AFTER scan completes

### 4. Debug Button (ADDED)
"Copy Debug" button captures last 30 log entries as JSON for troubleshooting

## Testing Steps
1. Go to Discovery page → Auto Unit Scanner panel
2. Click "Start Auto-Scan"
3. Watch for successful unit extraction
4. If failures, click "Copy Debug" and analyze the JSON

## Supabase Project
- **Project ID:** `mevirooooypfjbsrmzrk`
- **Region:** `us-east-2`

## Environment Variables Needed
- `BROWSERLESS_TOKEN` - For cloud browser scraping
- `SERPAPI_KEY` - For Google search API
- `OPENAI_API_KEY` - For AI unit extraction
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Other Active Features
- **Auto Enrich All** - Re-enriches property data (rent ranges, amenities, contacts) for properties not updated in 7+ days
- Both Auto-Scan and Auto-Enrich can run simultaneously

