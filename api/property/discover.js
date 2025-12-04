/**
 * Apartment Discovery API - Uses SerpAPI Google Maps to find apartment complexes
 * 
 * POST /api/property/discover
 * Body: { market: "San Antonio, TX", area?: "Stone Oak", start?: 0 }
 */

import { createClient } from '@supabase/supabase-js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// San Antonio zip codes for comprehensive coverage
const SAN_ANTONIO_ZIP_CODES = [
    // Central
    '78201', '78202', '78203', '78204', '78205', '78206', '78207', '78208', '78209', '78210',
    '78211', '78212', '78213', '78214', '78215', '78216', '78217', '78218', '78219', '78220',
    '78221', '78222', '78223', '78224', '78225', '78226', '78227', '78228', '78229', '78230',
    '78231', '78232', '78233', '78234', '78235', '78236', '78237', '78238', '78239', '78240',
    '78241', '78242', '78243', '78244', '78245', '78246', '78247', '78248', '78249', '78250',
    '78251', '78252', '78253', '78254', '78255', '78256', '78257', '78258', '78259', '78260',
    '78261', '78263', '78264', '78266',
    // Surrounding areas
    '78023', '78015', '78154', '78108', '78109', '78148', '78150', '78152', '78073'
];

// Build search areas from zip codes + neighborhoods
const SAN_ANTONIO_AREAS = [
    // ZIP code searches - most comprehensive (each can return different results)
    ...SAN_ANTONIO_ZIP_CODES.map(zip => ({
        name: `ZIP ${zip}`,
        query: `apartment complex ${zip}`,
        zip: zip
    })),

    // Neighborhood searches as backup
    { name: 'Downtown', query: 'apartments downtown San Antonio TX' },
    { name: 'Stone Oak', query: 'apartments Stone Oak San Antonio TX' },
    { name: 'Alamo Heights', query: 'apartments Alamo Heights TX' },
    { name: 'Medical Center', query: 'apartments Medical Center San Antonio TX' },
    { name: 'UTSA Area', query: 'apartments near UTSA San Antonio TX' },
    { name: 'The Rim', query: 'apartments The Rim San Antonio TX' },
    { name: 'La Cantera', query: 'apartments La Cantera San Antonio TX' },
    { name: 'Helotes', query: 'apartments Helotes TX' },
    { name: 'Leon Valley', query: 'apartments Leon Valley TX' },
    { name: 'Schertz', query: 'apartments Schertz TX' },
    { name: 'Converse', query: 'apartments Converse TX' },
    { name: 'Live Oak', query: 'apartments Live Oak TX' },
    { name: 'Selma', query: 'apartments Selma TX' },
    { name: 'Universal City', query: 'apartments Universal City TX' },
    { name: 'Cibolo', query: 'apartments Cibolo TX' },
    { name: 'New Braunfels', query: 'apartments New Braunfels TX' },
    { name: 'Boerne', query: 'apartments Boerne TX' },

    // Catch-all searches
    { name: 'Luxury', query: 'luxury apartments San Antonio TX' },
    { name: 'Affordable', query: 'affordable apartments San Antonio TX' },
    { name: 'Pet Friendly', query: 'pet friendly apartments San Antonio TX' },
    { name: 'New Construction', query: 'new apartment complex San Antonio TX' },
    { name: 'Senior Living', query: 'senior apartments San Antonio TX' },
    { name: 'Student Housing', query: 'student apartments San Antonio TX' },
];

/**
 * Search Google Maps for apartments using SerpAPI
 */
async function searchApartments(query, serpApiKey, start = 0) {
    console.log(`[Discovery] Searching: "${query}" (start: ${start})`);

    const params = new URLSearchParams({
        engine: 'google_maps',
        q: query,
        ll: '@29.4241219,-98.4936282,11z', // San Antonio center
        type: 'search',
        start: start.toString(),
        hl: 'en',
        api_key: serpApiKey
    });

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    return data.local_results || [];
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
    const normalized = normalizeAddress(place.address);
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
        // Return list of areas for staged scanning
        return res.status(200).json({
            success: true,
            market: 'San Antonio, TX',
            areas: SAN_ANTONIO_AREAS.map((a, i) => ({ index: i, name: a.name })),
            totalAreas: SAN_ANTONIO_AREAS.length
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
    const { areaIndex, start = 0 } = req.body;

    try {
        // Get the area to search
        const areaIdx = typeof areaIndex === 'number' ? areaIndex : 0;
        const area = SAN_ANTONIO_AREAS[areaIdx];

        if (!area) {
            return res.status(400).json({ error: 'Invalid area index' });
        }

        console.log(`[Discovery] Scanning area: ${area.name}`);

        // Search for apartments
        const results = await searchApartments(area.query, serpApiKey, start);
        console.log(`[Discovery] Found ${results.length} results`);

        // Process and filter results
        const apartments = [];
        const skipped = [];

        for (const place of results) {
            // Skip non-apartment results
            const type = (place.type || '').toLowerCase();
            const title = (place.title || '').toLowerCase();

            if (type.includes('real estate') || type.includes('property management') ||
                title.includes('realtor') || title.includes('realty')) {
                skipped.push({ title: place.title, reason: 'Real estate/management company' });
                continue;
            }

            apartments.push({
                id: generatePropertyId(place),
                name: place.title,
                community_name: place.title,
                street_address: place.address,
                city: 'San Antonio',
                state: 'TX',
                market: 'San Antonio',
                leasing_link: place.website || null,
                contact_phone: place.phone || null,
                google_place_id: place.place_id || null,
                google_rating: place.rating || null,
                google_reviews_count: place.reviews || null,
                latitude: place.gps_coordinates?.latitude || null,
                longitude: place.gps_coordinates?.longitude || null,
                thumbnail: place.thumbnail || null,
                discovered_at: new Date().toISOString(),
                enrichment_status: 'pending',
                source: 'serpapi_discovery',
                discovery_area: area.name
            });
        }

        // Insert into database (upsert to avoid duplicates)
        let inserted = 0;
        let duplicates = 0;

        for (const apt of apartments) {
            const { error } = await supabase
                .from('properties')
                .upsert(apt, { onConflict: 'id', ignoreDuplicates: true });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    duplicates++;
                } else {
                    console.error(`[Discovery] Insert error for ${apt.name}:`, error);
                }
            } else {
                inserted++;
            }
        }

        return res.status(200).json({
            success: true,
            area: area.name,
            areaIndex: areaIdx,
            totalAreas: SAN_ANTONIO_AREAS.length,
            hasNextPage: results.length >= 20,
            nextStart: start + results.length,
            found: results.length,
            apartments: apartments.length,
            inserted,
            duplicates,
            skipped: skipped.length,
            skippedDetails: skipped
        });

    } catch (error) {
        console.error('[Discovery] Error:', error);
        return res.status(500).json({
            error: 'Discovery failed',
            message: error.message
        });
    }
}

