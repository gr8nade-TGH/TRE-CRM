/**
 * Apartment Discovery API - Uses SerpAPI Google Maps to find apartment complexes
 *
 * Strategy: Grid-based GPS search with pagination
 * - Divide San Antonio metro into grid points
 * - Search at each point with high zoom
 * - Paginate to get more results
 * - Deduplicate by google_place_id
 *
 * POST /api/property/discover
 * Body: { gridIndex: 0, page: 0 } - Grid point and pagination page
 *
 * GET /api/property/discover
 * Returns: List of grid points for staged scanning
 */

import { createClient } from '@supabase/supabase-js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// San Antonio metro GPS grid - 36 points covering the metro area
// Each point will search with 14z zoom (~10 mile radius)
const SAN_ANTONIO_GRID = [
    // Row 1: North (Stone Oak, Hollywood Park, Schertz)
    { name: 'Stone Oak', lat: 29.6280, lng: -98.4806 },
    { name: 'Hollywood Park', lat: 29.6000, lng: -98.4300 },
    { name: 'Schertz', lat: 29.5770, lng: -98.2690 },
    { name: 'Cibolo', lat: 29.5720, lng: -98.2260 },

    // Row 2: North-Central (Shavano Park, North Central, Live Oak, Converse)
    { name: 'Shavano Park', lat: 29.5850, lng: -98.5500 },
    { name: 'North Central', lat: 29.5400, lng: -98.4900 },
    { name: 'Alamo Heights', lat: 29.4830, lng: -98.4610 },
    { name: 'Live Oak', lat: 29.5650, lng: -98.3370 },
    { name: 'Converse', lat: 29.5180, lng: -98.3160 },

    // Row 3: Northwest (Helotes, UTSA, Medical Center)
    { name: 'Helotes', lat: 29.5780, lng: -98.6920 },
    { name: 'The Dominion', lat: 29.5630, lng: -98.6200 },
    { name: 'UTSA Area', lat: 29.5850, lng: -98.5600 },
    { name: 'Medical Center', lat: 29.5100, lng: -98.5700 },
    { name: 'Leon Valley', lat: 29.4950, lng: -98.6140 },

    // Row 4: Central (Downtown and surrounding)
    { name: 'Downtown', lat: 29.4260, lng: -98.4900 },
    { name: 'Midtown', lat: 29.4400, lng: -98.4750 },
    { name: 'Southtown', lat: 29.4150, lng: -98.4900 },
    { name: 'Monte Vista', lat: 29.4650, lng: -98.5020 },
    { name: 'Fort Sam Houston', lat: 29.4490, lng: -98.4340 },

    // Row 5: West Side
    { name: 'SeaWorld Area', lat: 29.4590, lng: -98.7000 },
    { name: 'Westover Hills', lat: 29.4800, lng: -98.6400 },
    { name: 'Culebra', lat: 29.4600, lng: -98.6100 },
    { name: 'Lackland AFB Area', lat: 29.3840, lng: -98.6160 },

    // Row 6: South Side
    { name: 'Brooks City Base', lat: 29.3400, lng: -98.4400 },
    { name: 'South San Antonio', lat: 29.3600, lng: -98.5200 },
    { name: 'Mission', lat: 29.3750, lng: -98.4600 },
    { name: 'Somerset', lat: 29.2260, lng: -98.6580 },

    // Row 7: East Side
    { name: 'East Side', lat: 29.4400, lng: -98.4200 },
    { name: 'Kirby', lat: 29.4630, lng: -98.3860 },
    { name: 'Windcrest', lat: 29.5150, lng: -98.3800 },
    { name: 'Randolph AFB', lat: 29.5290, lng: -98.2790 },

    // Row 8: Outer suburbs
    { name: 'Selma', lat: 29.5850, lng: -98.3060 },
    { name: 'Universal City', lat: 29.5480, lng: -98.2910 },
    { name: 'New Braunfels', lat: 29.7030, lng: -98.1245 },
    { name: 'Boerne', lat: 29.7945, lng: -98.7320 },
    { name: 'Fair Oaks Ranch', lat: 29.7460, lng: -98.6430 },
];

// Search query - just apartment complex for precision
const SEARCH_QUERIES = [
    'apartment complex',
];

/**
 * Search Google Maps at a specific GPS location using SerpAPI
 */
async function searchAtLocation(lat, lng, query, serpApiKey, start = 0, zoom = '14z') {
    console.log(`[Discovery] Searching "${query}" at ${lat},${lng} (start: ${start})`);

    const params = new URLSearchParams({
        engine: 'google_maps',
        q: query,
        ll: `@${lat},${lng},${zoom}`,
        type: 'search',
        start: start.toString(),
        hl: 'en',
        api_key: serpApiKey
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Discovery] SerpAPI error: ${response.status}`, errorText);
        throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API errors in response
    if (data.error) {
        console.error(`[Discovery] SerpAPI returned error:`, data.error);
        throw new Error(data.error);
    }

    return {
        results: data.local_results || [],
        hasMore: (data.local_results || []).length >= 20,
        serpapi_pagination: data.serpapi_pagination
    };
}

/**
 * Normalize address for deduplication
 */
function normalizeAddress(address) {
    if (!address) return '';
    return address
        .toLowerCase()
        .replace(/[.,#]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|place|pl)\b/gi, '')
        .replace(/\b(apartment|apt|suite|ste|unit)\s*#?\d*/gi, '')
        .trim();
}

/**
 * Generate a unique ID from place data
 */
function generatePropertyId(place) {
    const addr = place.address || place.street_address || '';
    const normalized = normalizeAddress(addr);
    return `disc_${normalized.replace(/\s+/g, '_').substring(0, 40)}`;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // Return list of grid points for staged scanning
        return res.status(200).json({
            success: true,
            market: 'San Antonio, TX',
            grid: SAN_ANTONIO_GRID.map((g, i) => ({ index: i, name: g.name, lat: g.lat, lng: g.lng })),
            totalGridPoints: SAN_ANTONIO_GRID.length,
            searchQueries: SEARCH_QUERIES,
            pagesPerPoint: 3, // We'll search pages 0, 20, 40 at each point
            estimatedTotalSearches: SAN_ANTONIO_GRID.length * SEARCH_QUERIES.length * 3
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const serpApiKey = process.env.SERP_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serpApiKey) {
        return res.status(500).json({ error: 'SERP_API_KEY not configured' });
    }

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parameters: gridIndex (which grid point), queryIndex (which search query), page (0, 20, 40)
    const { gridIndex = 0, queryIndex = 0, page = 0 } = req.body;

    try {
        const gridPoint = SAN_ANTONIO_GRID[gridIndex];
        const searchQuery = SEARCH_QUERIES[queryIndex] || 'apartments';

        if (!gridPoint) {
            return res.status(400).json({ error: 'Invalid grid index' });
        }

        console.log(`[Discovery] Grid: ${gridPoint.name} | Query: "${searchQuery}" | Page: ${page}`);

        // Search at this GPS location
        const { results, hasMore } = await searchAtLocation(
            gridPoint.lat,
            gridPoint.lng,
            searchQuery,
            serpApiKey,
            page,
            '14z' // 14z zoom = ~10 mile radius
        );

        console.log(`[Discovery] Found ${results.length} results`);

        // Process and filter results
        const apartments = [];
        const skipped = [];

        for (const place of results) {
            // Skip non-apartment results
            const type = (place.type || '').toLowerCase();
            const title = (place.title || '').toLowerCase();

            // Filter out non-apartments
            if (type.includes('real estate') || type.includes('property management') ||
                type.includes('realtor') || type.includes('insurance') ||
                title.includes('realtor') || title.includes('realty') ||
                title.includes('real estate')) {
                skipped.push({ title: place.title, reason: 'Real estate/management company' });
                continue;
            }

            // Use google_place_id as primary deduplication key
            const placeId = place.place_id || place.data_id;

            const coordLat = place.gps_coordinates?.latitude || null;
            const coordLng = place.gps_coordinates?.longitude || null;

            apartments.push({
                name: place.title,
                community_name: place.title,
                street_address: place.address,
                city: extractCity(place.address) || 'San Antonio',
                state: 'TX',
                market: 'San Antonio',
                leasing_link: place.website || null,
                contact_phone: place.phone || null,
                google_place_id: placeId,
                google_data_id: place.data_id || null, // For photos API later
                google_rating: place.rating || null,
                google_reviews_count: place.reviews || null,
                // Store coordinates in BOTH column sets for map compatibility
                lat: coordLat,
                lng: coordLng,
                latitude: coordLat,
                longitude: coordLng,
                thumbnail: place.thumbnail || null,
                discovered_at: new Date().toISOString(),
                enrichment_status: 'pending',
                source: 'serpapi_discovery',
                discovery_area: gridPoint.name
            });
        }

        // Insert into database using google_place_id for deduplication
        let inserted = 0;
        let duplicates = 0;
        let errors = 0;

        for (const apt of apartments) {
            // First check if this google_place_id already exists
            if (apt.google_place_id) {
                const { data: existing } = await supabase
                    .from('properties')
                    .select('id')
                    .eq('google_place_id', apt.google_place_id)
                    .single();

                if (existing) {
                    duplicates++;
                    continue;
                }
            }

            // Generate ID from normalized address
            apt.id = generatePropertyId(apt);

            const { error } = await supabase
                .from('properties')
                .upsert(apt, { onConflict: 'id', ignoreDuplicates: true });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    duplicates++;
                } else {
                    console.error(`[Discovery] Insert error for ${apt.name}:`, error.message);
                    errors++;
                }
            } else {
                inserted++;
            }
        }

        // Calculate next search parameters
        const nextPage = hasMore && page < 40 ? page + 20 : null;
        const nextQueryIndex = nextPage === null && queryIndex < SEARCH_QUERIES.length - 1 ? queryIndex + 1 : null;
        const nextGridIndex = nextPage === null && nextQueryIndex === null && gridIndex < SAN_ANTONIO_GRID.length - 1 ? gridIndex + 1 : null;
        const isComplete = nextPage === null && nextQueryIndex === null && nextGridIndex === null;

        return res.status(200).json({
            success: true,
            gridPoint: gridPoint.name,
            gridIndex,
            totalGridPoints: SAN_ANTONIO_GRID.length,
            searchQuery,
            queryIndex,
            page,
            found: results.length,
            apartments: apartments.length,
            inserted,
            duplicates,
            errors,
            skipped: skipped.length,
            hasMore,
            // Next search parameters
            next: isComplete ? null : {
                gridIndex: nextGridIndex !== null ? nextGridIndex : gridIndex,
                queryIndex: nextQueryIndex !== null ? nextQueryIndex : (nextPage !== null ? queryIndex : 0),
                page: nextPage !== null ? nextPage : 0
            },
            isComplete,
            progress: {
                currentSearch: gridIndex * SEARCH_QUERIES.length * 3 + queryIndex * 3 + Math.floor(page / 20) + 1,
                totalSearches: SAN_ANTONIO_GRID.length * SEARCH_QUERIES.length * 3
            }
        });

    } catch (error) {
        console.error('[Discovery] Error:', error);
        return res.status(500).json({
            error: 'Discovery failed',
            message: error.message
        });
    }
}

/**
 * Extract city from address string
 */
function extractCity(address) {
    if (!address) return null;
    // Try to extract city from "123 Main St, San Antonio, TX" format
    const parts = address.split(',');
    if (parts.length >= 2) {
        return parts[parts.length - 2].trim();
    }
    return null;
}

