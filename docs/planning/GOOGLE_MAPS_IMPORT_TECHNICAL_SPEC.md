# Google Maps Property Import - Technical Specification

**Created:** 2025-11-01  
**Status:** Technical Design  
**Related:** `GOOGLE_MAPS_PROPERTY_IMPORT_PLAN.md`

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin UI (#/import-properties)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search Form  │  │ Preview Table│  │ Import Status│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Module (property-import.js)            │
│  • Search configuration                                      │
│  • Duplicate detection                                       │
│  • Import orchestration                                      │
│  • Progress tracking                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Google Maps API Service (google-maps-api.js)       │
│  • searchPlaces(query, location, radius)                    │
│  • getPlaceDetails(placeId)                                 │
│  • getPhotoUrl(photoReference)                              │
│  • Rate limiting (1 req/sec)                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Maps Places API                    │
│  • Text Search API                                          │
│  • Place Details API                                        │
│  • Place Photos API                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  • properties table (imported properties)                   │
│  • property_import_logs table (audit trail)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
src/
├── api/
│   └── google-maps-api.js          # NEW: Google Maps API service
├── modules/
│   └── admin/
│       ├── property-import.js      # NEW: Import tool logic
│       └── property-import-page.js # NEW: Import page controller
├── utils/
│   ├── address-parser.js           # NEW: Parse Google address components
│   └── duplicate-detector.js       # NEW: Detect duplicate properties
└── config/
    └── google-maps-config.js       # NEW: API key and configuration

migrations/
└── 044_property_import_tables.sql  # NEW: Import logs table

index.html
└── <!-- Property Import page HTML -->
```

---

## 🗄️ Database Schema

### **Migration 044: Property Import Tables**

```sql
-- ============================================
-- Migration 044: Property Import Support
-- ============================================

-- 1. Add Google Maps fields to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS google_place_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS google_review_count INTEGER,
ADD COLUMN IF NOT EXISTS needs_unit_data BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_google_place_id 
ON public.properties(google_place_id);

CREATE INDEX IF NOT EXISTS idx_properties_needs_unit_data 
ON public.properties(needs_unit_data);

-- 2. Create property import logs table
CREATE TABLE IF NOT EXISTS public.property_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    google_place_id VARCHAR,
    property_name VARCHAR,
    status VARCHAR NOT NULL, -- 'success', 'skipped_duplicate', 'error'
    error_message TEXT,
    api_calls_made INTEGER DEFAULT 0,
    imported_by VARCHAR REFERENCES public.users(id),
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_batch_id 
ON public.property_import_logs(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_import_logs_status 
ON public.property_import_logs(status);

CREATE INDEX IF NOT EXISTS idx_import_logs_imported_at 
ON public.property_import_logs(imported_at);

-- 3. Create import batches table (for tracking import sessions)
CREATE TABLE IF NOT EXISTS public.property_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query TEXT NOT NULL,
    search_location VARCHAR, -- e.g., "San Antonio, TX"
    search_radius INTEGER, -- in meters
    total_found INTEGER DEFAULT 0,
    total_imported INTEGER DEFAULT 0,
    total_skipped INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    started_by VARCHAR REFERENCES public.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add comments
COMMENT ON TABLE public.property_import_logs IS 'Audit trail for property imports from Google Maps';
COMMENT ON TABLE public.property_import_batches IS 'Tracks import sessions and their results';
COMMENT ON COLUMN public.properties.google_place_id IS 'Google Maps Place ID for this property';
COMMENT ON COLUMN public.properties.needs_unit_data IS 'True if property needs floor plans and units added';
```

---

## 🔌 API Service Module

### **File: `src/api/google-maps-api.js`**

```javascript
/**
 * Google Maps Places API Service
 * Handles all interactions with Google Maps Places API
 */

import { GOOGLE_MAPS_CONFIG } from '../config/google-maps-config.js';

// Rate limiter: 1 request per second to avoid hitting QPS limits
class RateLimiter {
    constructor(requestsPerSecond = 1) {
        this.delay = 1000 / requestsPerSecond;
        this.lastRequestTime = 0;
    }

    async throttle() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.delay) {
            const waitTime = this.delay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }
}

const rateLimiter = new RateLimiter(1); // 1 request per second

/**
 * Search for places using Text Search API
 * @param {string} query - Search query (e.g., "apartments in San Antonio")
 * @param {object} location - {lat, lng} center point
 * @param {number} radius - Search radius in meters
 * @param {number} maxResults - Max results to return (default: 20)
 * @returns {Promise<Array>} Array of place objects
 */
export async function searchPlaces(query, location, radius = 50000, maxResults = 20) {
    await rateLimiter.throttle();
    
    console.log(`🔍 Searching Google Maps: "${query}"`);
    
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestBody = {
        textQuery: query,
        maxResultCount: maxResults,
        locationBias: {
            circle: {
                center: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                radius: radius
            }
        }
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Maps API error: ${error.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Found ${data.places?.length || 0} places`);
        
        return data.places || [];
    } catch (error) {
        console.error('❌ Error searching places:', error);
        throw error;
    }
}

/**
 * Get detailed information for a place
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} Place details object
 */
export async function getPlaceDetails(placeId) {
    await rateLimiter.throttle();
    
    console.log(`📍 Fetching details for place: ${placeId}`);
    
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    // Field mask: specify which fields to return (affects pricing)
    const fieldMask = [
        'id',
        'displayName',
        'formattedAddress',
        'addressComponents',
        'location',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'photos',
        'rating',
        'userRatingCount',
        'editorialSummary',
        'types'
    ].join(',');
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.apiKey,
                'X-Goog-FieldMask': fieldMask
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Maps API error: ${error.error?.message || response.statusText}`);
        }
        
        const place = await response.json();
        console.log(`✅ Got details for: ${place.displayName?.text}`);
        
        return place;
    } catch (error) {
        console.error('❌ Error fetching place details:', error);
        throw error;
    }
}

/**
 * Get photo URL for a place photo
 * @param {string} photoName - Photo resource name from place.photos[].name
 * @param {number} maxWidth - Maximum width in pixels (default: 800)
 * @returns {string} Photo URL
 */
export function getPhotoUrl(photoName, maxWidth = 800) {
    // Photo URL format: https://places.googleapis.com/v1/{photoName}/media?key={API_KEY}&maxWidthPx={WIDTH}
    return `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_CONFIG.apiKey}&maxWidthPx=${maxWidth}`;
}

/**
 * Extract photo URLs from place photos array
 * @param {Array} photos - Array of photo objects from place.photos
 * @param {number} maxPhotos - Maximum number of photos to extract (default: 10)
 * @returns {Array<string>} Array of photo URLs
 */
export function extractPhotoUrls(photos, maxPhotos = 10) {
    if (!photos || !Array.isArray(photos)) return [];
    
    return photos
        .slice(0, maxPhotos)
        .map(photo => getPhotoUrl(photo.name));
}
```

---

## 🧩 Utility Modules

### **File: `src/utils/address-parser.js`**

```javascript
/**
 * Parse Google Maps address components into structured data
 */

/**
 * Extract street address from address components
 * @param {Array} components - Google Maps address components
 * @returns {string} Street address
 */
export function extractStreetAddress(components) {
    if (!components) return '';
    
    const streetNumber = components.find(c => c.types.includes('street_number'))?.longText || '';
    const route = components.find(c => c.types.includes('route'))?.longText || '';
    
    return `${streetNumber} ${route}`.trim();
}

/**
 * Extract city from address components
 * @param {Array} components - Google Maps address components
 * @returns {string} City name
 */
export function extractCity(components) {
    if (!components) return '';
    
    return components.find(c => c.types.includes('locality'))?.longText || '';
}

/**
 * Extract state from address components
 * @param {Array} components - Google Maps address components
 * @returns {string} State abbreviation (e.g., "TX")
 */
export function extractState(components) {
    if (!components) return '';
    
    return components.find(c => c.types.includes('administrative_area_level_1'))?.shortText || '';
}

/**
 * Extract ZIP code from address components
 * @param {Array} components - Google Maps address components
 * @returns {string} ZIP code
 */
export function extractZipCode(components) {
    if (!components) return '';
    
    return components.find(c => c.types.includes('postal_code'))?.longText || '';
}

/**
 * Extract neighborhood from address components
 * @param {Array} components - Google Maps address components
 * @returns {string} Neighborhood name
 */
export function extractNeighborhood(components) {
    if (!components) return '';
    
    // Try sublocality first, then neighborhood
    return components.find(c => c.types.includes('sublocality'))?.longText ||
           components.find(c => c.types.includes('neighborhood'))?.longText ||
           '';
}
```

### **File: `src/utils/duplicate-detector.js`**

```javascript
/**
 * Detect duplicate properties before importing
 */

import { getSupabase } from '../api/supabase-api.js';

/**
 * Check if a property already exists in the database
 * @param {string} googlePlaceId - Google Place ID
 * @param {string} address - Street address
 * @param {string} name - Property name
 * @returns {Promise<object|null>} Existing property or null
 */
export async function findDuplicateProperty(googlePlaceId, address, name) {
    const supabase = getSupabase();
    
    // Check 1: Exact match by Google Place ID
    if (googlePlaceId) {
        const { data: byPlaceId } = await supabase
            .from('properties')
            .select('*')
            .eq('google_place_id', googlePlaceId)
            .single();
        
        if (byPlaceId) {
            console.log(`🔍 Duplicate found by Google Place ID: ${name}`);
            return byPlaceId;
        }
    }
    
    // Check 2: Fuzzy match by address
    if (address) {
        const { data: byAddress } = await supabase
            .from('properties')
            .select('*')
            .ilike('street_address', `%${address}%`)
            .limit(1);
        
        if (byAddress && byAddress.length > 0) {
            console.log(`🔍 Potential duplicate found by address: ${name}`);
            return byAddress[0];
        }
    }
    
    // Check 3: Fuzzy match by name + city
    if (name) {
        const { data: byName } = await supabase
            .from('properties')
            .select('*')
            .ilike('name', `%${name}%`)
            .limit(1);
        
        if (byName && byName.length > 0) {
            console.log(`🔍 Potential duplicate found by name: ${name}`);
            return byName[0];
        }
    }
    
    return null;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}
```

---

## 🎨 UI Components

### **Property Import Page Structure**

```html
<!-- Property Import Page (#/import-properties) -->
<section id="importPropertiesView" class="route-view hidden">
    <div class="page-header">
        <h1>🏢 Import Properties from Google Maps</h1>
        <p class="subtitle">Bulk import apartment complexes from Google Maps Places API</p>
    </div>
    
    <!-- Step 1: Search Configuration -->
    <div class="import-card">
        <h2>Step 1: Configure Search</h2>
        <form id="importSearchForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="searchQuery">Search Query</label>
                    <input type="text" id="searchQuery" class="form-input" 
                           placeholder="e.g., luxury apartments in Alamo Heights"
                           value="apartment complexes in San Antonio, TX" required>
                    <small>Tip: Be specific to get better results</small>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="searchLat">Center Latitude</label>
                    <input type="number" id="searchLat" class="form-input" 
                           value="29.4241" step="0.0001" required>
                </div>
                <div class="form-group">
                    <label for="searchLng">Center Longitude</label>
                    <input type="number" id="searchLng" class="form-input" 
                           value="-98.4936" step="0.0001" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="searchRadius">Search Radius (meters)</label>
                    <input type="range" id="searchRadius" min="5000" max="100000" 
                           value="50000" step="5000">
                    <output id="radiusOutput">50 km</output>
                </div>
                <div class="form-group">
                    <label for="maxResults">Max Results</label>
                    <select id="maxResults" class="form-select">
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <svg>...</svg> Search Google Maps
            </button>
        </form>
    </div>
    
    <!-- Step 2: Preview Results -->
    <div id="importPreviewCard" class="import-card hidden">
        <h2>Step 2: Review & Select Properties</h2>
        <p id="previewSummary"></p>
        
        <div class="table-wrapper">
            <table id="importPreviewTable" class="data-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAllImport"></th>
                        <th>Property Name</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>Rating</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="importPreviewTbody"></tbody>
            </table>
        </div>
        
        <button id="startImportBtn" class="btn btn-success">
            <svg>...</svg> Import Selected Properties
        </button>
    </div>
    
    <!-- Step 3: Import Progress -->
    <div id="importProgressCard" class="import-card hidden">
        <h2>Step 3: Importing...</h2>
        <div class="progress-bar">
            <div id="importProgressBar" class="progress-fill"></div>
        </div>
        <p id="importProgressText">Importing 0 of 0 properties...</p>
        <div id="importLog" class="import-log"></div>
    </div>
    
    <!-- Step 4: Import Summary -->
    <div id="importSummaryCard" class="import-card hidden">
        <h2>✅ Import Complete!</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-value" id="importedCount">0</div>
                <div class="stat-label">Imported</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="skippedCount">0</div>
                <div class="stat-label">Skipped (Duplicates)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="errorCount">0</div>
                <div class="stat-label">Errors</div>
            </div>
        </div>
        
        <div class="action-buttons">
            <button id="viewImportedBtn" class="btn btn-primary">
                View Imported Properties
            </button>
            <button id="newImportBtn" class="btn btn-secondary">
                Start New Import
            </button>
        </div>
    </div>
</section>
```

---

**End of Technical Specification**

**Next Document:** Implementation code samples and step-by-step guide

