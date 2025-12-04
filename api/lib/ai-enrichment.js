/**
 * AI Property Enrichment Service - PRO Edition 2025
 *
 * Best practices implementation:
 * 1. Use SerpApi.com for Google searches (7+ years established, 50+ APIs)
 * 2. Use Google Local API for direct business data (phone, website, hours)
 * 3. Smart scraping: fetch first, Browserless for JS-heavy sites
 * 4. Target property's own website (skip aggregators)
 * 5. AI extraction with OpenAI GPT-4o-mini
 *
 * @module lib/ai-enrichment
 */

import puppeteer from 'puppeteer-core';

// Configuration
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// User agents - 2024/2025 Chrome versions
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];

// Realistic viewport sizes
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 }
];

/**
 * Check if a value is valid (not null, undefined, empty, or literal "null" string)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is valid/usable
 */
function isValidValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        // Filter out null-like strings and common placeholder patterns
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' ||
            trimmed === 'n/a' || trimmed === 'na' || trimmed === 'none' ||
            trimmed === 'not available' || trimmed === 'not found') {
            return false;
        }
    }
    return true;
}

// All enrichable fields - organized by category
const ENRICHABLE_FIELDS = {
    // === CORE IDENTITY ===
    name: { dbColumn: 'name', priority: 1, category: 'identity', description: 'Property/community name' },
    leasing_link: { dbColumn: 'leasing_link', priority: 2, category: 'identity', description: 'Leasing/apply URL' },
    description: { dbColumn: 'description', priority: 3, category: 'identity', description: 'AI-generated property description' },

    // === CONTACT INFO ===
    contact_phone: { dbColumn: 'contact_phone', priority: 4, category: 'contact', description: 'Leasing office phone' },
    contact_email: { dbColumn: 'contact_email', priority: 5, category: 'contact', description: 'Leasing office email' },
    contact_name: { dbColumn: 'contact_name', priority: 6, category: 'contact', description: 'Leasing contact name' },
    office_hours: { dbColumn: 'office_hours', priority: 7, category: 'contact', description: 'Leasing office hours (e.g., Mon-Fri 9am-6pm)' },

    // === LOCATION ===
    neighborhood: { dbColumn: 'neighborhood', priority: 8, category: 'location', description: 'Neighborhood/area name' },

    // === FEATURES & AMENITIES ===
    amenities: { dbColumn: 'amenities', priority: 9, category: 'features', description: 'Property amenities (detailed list)' },
    amenities_tags: { dbColumn: 'amenities', priority: 9, category: 'features', description: 'Short amenity tags (Pool, Gym, etc.)' },

    // === PRICING ===
    rent_min: { dbColumn: 'rent_min', priority: 10, category: 'pricing', description: 'Minimum rent price' },
    rent_max: { dbColumn: 'rent_max', priority: 10, category: 'pricing', description: 'Maximum rent price' },
    specials_text: { dbColumn: 'specials_text', priority: 11, category: 'pricing', description: 'Current specials/promotions' },

    // === UNIT INFO (property-level ranges) ===
    beds_min: { dbColumn: 'beds_min', priority: 12, category: 'units', description: 'Minimum bedrooms offered' },
    beds_max: { dbColumn: 'beds_max', priority: 12, category: 'units', description: 'Maximum bedrooms offered' },
    sqft_min: { dbColumn: 'sqft_min', priority: 13, category: 'units', description: 'Minimum sqft' },
    sqft_max: { dbColumn: 'sqft_max', priority: 13, category: 'units', description: 'Maximum sqft' },

    // === PET POLICY ===
    accepts_up_to_3_pets: { dbColumn: 'accepts_up_to_3_pets', priority: 14, category: 'pets', description: 'Accepts 3+ pets' },
    pet_policy: { dbColumn: null, priority: 14, category: 'pets', description: 'Pet policy details (breed restrictions, weight limits, fees)' },

    // === QUALIFICATION REQUIREMENTS ===
    accepts_bad_credit: { dbColumn: 'accepts_bad_credit', priority: 15, category: 'qualifications', description: 'Accepts applicants with bad credit' },
    accepts_section_8: { dbColumn: 'accepts_section_8', priority: 15, category: 'qualifications', description: 'Accepts Section 8/Housing vouchers' },
    accepts_broken_lease_under_1: { dbColumn: 'accepts_broken_lease_under_1', priority: 15, category: 'qualifications', description: 'Accepts broken lease < 1 year' },
    accepts_broken_lease_1_year: { dbColumn: 'accepts_broken_lease_1_year', priority: 15, category: 'qualifications', description: 'Accepts broken lease 1-2 years' },
    accepts_eviction_under_1: { dbColumn: 'accepts_eviction_under_1', priority: 15, category: 'qualifications', description: 'Accepts eviction < 1 year' },
    accepts_eviction_1_year: { dbColumn: 'accepts_eviction_1_year', priority: 15, category: 'qualifications', description: 'Accepts eviction 1-2 years' },
    accepts_felony: { dbColumn: 'accepts_felony', priority: 16, category: 'qualifications', description: 'Accepts felony record' },
    accepts_misdemeanor: { dbColumn: 'accepts_misdemeanor', priority: 16, category: 'qualifications', description: 'Accepts misdemeanor record' },
    income_requirement: { dbColumn: null, priority: 16, category: 'qualifications', description: 'Income requirement (e.g., 2.5x or 3x rent)' },

    // === MOVE-IN ===
    same_day_move_in: { dbColumn: 'same_day_move_in', priority: 17, category: 'movein', description: 'Offers same-day move-in' },

    // === MANAGEMENT ===
    management_company: { dbColumn: null, priority: 18, category: 'management', description: 'Management company name' }
};

// Domains to skip (aggregators that block scrapers or have stale data)
const SKIP_DOMAINS = [
    'apartments.com', 'zillow.com', 'realtor.com', 'trulia.com',
    'redfin.com', 'facebook.com', 'yelp.com', 'bbb.org',
    'yellowpages.com', 'manta.com', 'mapquest.com', 'google.com',
    'apartmentguide.com', 'rent.com', 'hotpads.com', 'zumper.com',
    'padmapper.com', 'forrent.com', 'rentcafe.com'
];

// Preferred domains (property websites, management companies)
const PREFERRED_DOMAINS = [
    '.com', '.net', '.org', // Generic TLDs (likely official sites)
    'greystar.com', 'lincolnapts.com', 'maac.com', 'nfrp.com',
    'equityapartments.com', 'avalonbay.com', 'udr.com', 'camden.com'
];

// Indicators that a property is NOT an apartment complex (for-sale, small multifamily, single-family)
const NON_APARTMENT_INDICATORS = {
    // Words in property name/title/URL that suggest it's NOT an apartment complex
    titlePatterns: [
        /\bMLS\s*#?\s*\d+/i,              // MLS listing number
        /\bfor\s+sale\b/i,                 // For sale
        /\bsold\b/i,                       // Already sold
        /\bforeclosure\b/i,                // Foreclosure
        /\bauction\b/i,                    // Auction
        /\best\.?\s+\d{4}\b/i              // Established year (often for-sale listings)
    ],
    // Small multifamily / non-complex property types (for rent OR sale)
    smallPropertyPatterns: [
        /\bduplex\b/i,                     // Duplex (2 units)
        /\btriplex\b/i,                    // Triplex (3 units)
        /\bfourplex\b/i,                   // Fourplex (4 units)
        /\bquadplex\b/i,                   // Quadplex (4 units)
        /\b4[\-\s]?plex\b/i,               // 4-plex variation
        /\bsingle\s*family\b/i,            // Single family home
        /\btownhome\b/i,                   // Townhome
        /\btownhouse\b/i,                  // Townhouse
        /\bcondo\b/i,                      // Condo (individual unit)
        /\bhouse\s+for\s+rent\b/i,         // House for rent
        /\bhome\s+for\s+rent\b/i,          // Home for rent
        /\b[1-4]\s*bed(?:room)?s?\s+house\b/i,  // "3 bedroom house"
        /\bsingle\s+unit\b/i,              // Single unit
        /\bprivate\s+home\b/i,             // Private home
        /\brental\s+home\b/i,              // Rental home
        /\brental\s+house\b/i              // Rental house
    ],
    // Domains that indicate for-sale listings
    saleDomains: [
        'zillow.com', 'realtor.com', 'redfin.com', 'trulia.com',
        'homecity.com', 'har.com', 'coldwellbanker.com', 'century21.com',
        'kw.com', 'sothebysrealty.com', 'compass.com', 'opendoor.com'
    ],
    // Domains that list small rentals (duplexes, single-family, etc.)
    smallRentalDomains: [
        'ahrn.com',           // Military housing - often duplexes/single family
        'militarybyowner.com',
        'craigslist.org',     // Usually individual rentals
        'turbotenant.com',    // Landlord platform for small properties
        'avail.co',           // Small landlord platform
        'cozy.co',            // Small rentals
        'rentler.com'         // Often small properties
    ]
};

/**
 * Check if AI enrichment is configured
 * @returns {Object} Configuration status
 */
export function checkConfiguration() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const serpApiKey = process.env.SERP_API_KEY;

    return {
        configured: !!(openaiKey && browserlessToken),
        openai: !!openaiKey,
        browserless: !!browserlessToken,
        serpapi: !!serpApiKey,
        openaiPreview: openaiKey ? `${openaiKey.slice(0, 8)}...` : null,
        browserlessPreview: browserlessToken ? `${browserlessToken.slice(0, 8)}...` : null,
        serpapiPreview: serpApiKey ? `${serpApiKey.slice(0, 8)}...` : null,
        // SerpApi is optional but recommended for reliability
        recommendation: !serpApiKey ? 'Add SERP_API_KEY for faster, more reliable Google searches via SerpApi.com' : null
    };
}

/**
 * Get random element from array
 */
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Add random delay to appear more human
 */
function randomDelay(min = 500, max = 2000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Search Google using SerpApi.com (7+ years established, reliable)
 * @param {string} query - Search query
 * @param {string} serpApiKey - SerpApi API key
 * @returns {Promise<Object>} Search results with organic links
 */
async function serpApiSearch(query, serpApiKey) {
    console.log(`[AI Enrichment] SerpApi search: "${query}"`);
    try {
        const params = new URLSearchParams({
            engine: 'google',
            q: query,
            num: '10',
            gl: 'us',
            hl: 'en',
            api_key: serpApiKey
        });

        const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[AI Enrichment] SerpApi returned ${data.organic_results?.length || 0} organic results`);

        return {
            success: true,
            organic: (data.organic_results || []).map(r => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet
            })),
            knowledgeGraph: data.knowledge_graph || null,
            answerBox: data.answer_box || null
        };
    } catch (error) {
        console.log(`[AI Enrichment] SerpApi search failed: ${error.message}`);
        return { success: false, error: error.message, organic: [] };
    }
}

/**
 * Search Google Local using SerpApi.com for direct business data
 * This is perfect for apartment properties - returns phone, website, address, hours
 * @param {string} query - Search query (property name + city)
 * @param {string} location - Location string (e.g., "Austin, Texas")
 * @param {string} serpApiKey - SerpApi API key
 * @returns {Promise<Object>} Local business results
 */
async function serpApiLocalSearch(query, location, serpApiKey) {
    console.log(`[AI Enrichment] SerpApi Local search: "${query}" in "${location}"`);
    try {
        const params = new URLSearchParams({
            engine: 'google_local',
            q: query,
            location: location,
            hl: 'en',
            gl: 'us',
            api_key: serpApiKey
        });

        const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi Local error: ${response.status}`);
        }

        const data = await response.json();
        const localResults = data.local_results || [];
        console.log(`[AI Enrichment] SerpApi Local returned ${localResults.length} local results`);

        // Extract structured business data from local results
        return {
            success: true,
            localResults: localResults.map(r => ({
                title: r.title,
                rating: r.rating,
                reviews: r.reviews,
                type: r.type,
                address: r.address,
                phone: r.phone,
                website: r.website || (r.links?.website),
                hours: r.hours,
                thumbnail: r.thumbnail,
                placeId: r.place_id,
                gpsCoordinates: r.gps_coordinates
            }))
        };
    } catch (error) {
        console.log(`[AI Enrichment] SerpApi Local search failed: ${error.message}`);
        return { success: false, error: error.message, localResults: [] };
    }
}

/**
 * Search Google Maps using SerpApi for detailed place information
 * Returns reviews, hours, and more detailed business data
 * @param {string} placeId - Google Place ID (from local search)
 * @param {string} serpApiKey - SerpApi API key
 * @returns {Promise<Object>} Place details
 */
async function serpApiMapsSearch(placeId, serpApiKey) {
    console.log(`[AI Enrichment] SerpApi Maps search for place: ${placeId}`);
    try {
        const params = new URLSearchParams({
            engine: 'google_maps',
            place_id: placeId,
            hl: 'en',
            api_key: serpApiKey
        });

        const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`SerpApi Maps error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[AI Enrichment] SerpApi Maps returned place data`);

        // Extract useful data from place details
        const place = data.place_results || {};
        return {
            success: true,
            place: {
                title: place.title,
                rating: place.rating,
                reviews: place.reviews,
                reviewsCount: place.reviews_count || place.user_reviews_total,
                type: place.type,
                address: place.address,
                phone: place.phone,
                website: place.website,
                hours: place.hours || place.operating_hours,
                priceRange: place.price,
                description: place.description,
                amenities: place.amenities,
                serviceOptions: place.service_options
            }
        };
    } catch (error) {
        console.log(`[AI Enrichment] SerpApi Maps search failed: ${error.message}`);
        return { success: false, error: error.message, place: null };
    }
}

/**
 * Run multiple targeted SerpApi searches for specific data types
 * @param {Object} property - Property data
 * @param {string} serpApiKey - SerpApi API key
 * @returns {Promise<Object>} Combined search results
 */
async function runTargetedSearches(property, serpApiKey) {
    const address = property.street_address || property.address;
    const city = property.city || 'San Antonio';
    const state = property.state || 'TX';
    const propertyName = property.name || '';

    const results = {
        petPolicy: null,
        specials: null,
        qualifications: null,
        reviews: null
    };

    // Build search queries for different data types
    const queries = [];

    // Pet policy search
    if (propertyName) {
        queries.push({
            type: 'petPolicy',
            query: `"${propertyName}" ${city} ${state} pet policy dogs cats allowed`
        });
    }

    // Specials/promotions search
    if (propertyName) {
        queries.push({
            type: 'specials',
            query: `"${propertyName}" ${city} ${state} move-in specials promotions deals`
        });
    }

    // Qualification requirements search
    if (propertyName) {
        queries.push({
            type: 'qualifications',
            query: `"${propertyName}" ${city} ${state} income requirements credit score application`
        });
    }

    // Run searches in parallel (max 3 to avoid rate limits)
    const searchPromises = queries.slice(0, 3).map(async ({ type, query }) => {
        try {
            const params = new URLSearchParams({
                engine: 'google',
                q: query,
                num: '5',
                gl: 'us',
                hl: 'en',
                api_key: serpApiKey
            });

            const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
            if (!response.ok) return { type, success: false };

            const data = await response.json();
            return {
                type,
                success: true,
                organic: (data.organic_results || []).map(r => ({
                    title: r.title,
                    link: r.link,
                    snippet: r.snippet
                })),
                answerBox: data.answer_box || null
            };
        } catch (error) {
            console.log(`[AI Enrichment] Targeted search (${type}) failed: ${error.message}`);
            return { type, success: false };
        }
    });

    const searchResults = await Promise.all(searchPromises);

    // Organize results by type
    for (const result of searchResults) {
        if (result.success) {
            results[result.type] = {
                snippets: result.organic.map(r => r.snippet).filter(Boolean),
                answerBox: result.answerBox
            };
        }
    }

    console.log(`[AI Enrichment] Targeted searches completed: ${searchResults.filter(r => r.success).length}/${queries.length} successful`);
    return results;
}

/**
 * Search for property images using SerpAPI Google Images
 * Returns clean image URLs with no source tracking
 *
 * @param {string} propertyName - Property name
 * @param {string} city - City
 * @param {string} state - State
 * @param {string} serpApiKey - SerpAPI key
 * @returns {Promise<string[]>} Array of image URLs
 */
async function searchPropertyImages(propertyName, city, state, serpApiKey) {
    if (!propertyName || !serpApiKey) return [];

    console.log(`[AI Enrichment] Searching for property images: ${propertyName}`);

    try {
        const params = new URLSearchParams({
            engine: 'google_images',
            q: `"${propertyName}" apartments ${city} ${state} exterior building`,
            num: '10',
            gl: 'us',
            hl: 'en',
            safe: 'active',
            api_key: serpApiKey
        });

        const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
        if (!response.ok) {
            console.log(`[AI Enrichment] Image search failed: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const images = data.images_results || [];

        // Extract only the original image URLs - no source/attribution
        const imageUrls = images
            .slice(0, 6) // Limit to 6 images
            .map(img => img.original)
            .filter(url => {
                if (!url) return false;
                // Filter out small/icon images and known bad sources
                const lowerUrl = url.toLowerCase();
                return !lowerUrl.includes('icon') &&
                    !lowerUrl.includes('logo') &&
                    !lowerUrl.includes('avatar') &&
                    !lowerUrl.includes('favicon') &&
                    !lowerUrl.includes('placeholder') &&
                    (lowerUrl.endsWith('.jpg') ||
                        lowerUrl.endsWith('.jpeg') ||
                        lowerUrl.endsWith('.png') ||
                        lowerUrl.endsWith('.webp') ||
                        lowerUrl.includes('.jpg') ||
                        lowerUrl.includes('.jpeg') ||
                        lowerUrl.includes('.png'));
            });

        console.log(`[AI Enrichment] Found ${imageUrls.length} property images`);
        return imageUrls;

    } catch (error) {
        console.error('[AI Enrichment] Image search error:', error.message);
        return [];
    }
}

/**
 * Simple fetch-based scrape for property websites (fast, no browser needed)
 * @param {string} url - URL to scrape
 * @param {number} timeoutMs - Timeout in milliseconds (default 15000)
 * @returns {Promise<Object>} Page content
 */
async function simpleFetch(url, timeoutMs = 15000) {
    console.log(`[AI Enrichment] Simple fetch: ${url} (timeout: ${timeoutMs}ms)`);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
            headers: {
                'User-Agent': randomChoice(USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();

        // Extract text content (simple regex-based extraction)
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
            .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '') // Remove noscript
            .replace(/<[^>]+>/g, ' ')                          // Remove HTML tags
            .replace(/&nbsp;/g, ' ')                           // Replace nbsp
            .replace(/\s+/g, ' ')                              // Normalize whitespace
            .trim()
            .slice(0, 20000);

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const description = descMatch ? descMatch[1].trim() : '';

        return {
            success: true,
            url,
            title,
            description,
            content: textContent,
            contentLength: textContent.length,
            method: 'fetch',
            scrapedAt: new Date().toISOString()
        };
    } catch (error) {
        console.log(`[AI Enrichment] Simple fetch failed: ${error.message}`);
        return { success: false, url, error: error.message };
    }
}

/**
 * Scrape using Browserless.io (for JS-heavy sites)
 * Uses stealth mode, blocks unnecessary resources, randomizes fingerprint
 * @param {string} url - URL to scrape
 * @param {string} browserlessToken - Browserless API token
 * @param {number} timeout - Timeout in ms (default 30000)
 * @returns {Promise<Object>} Page content and metadata
 */
async function browserlessScrape(url, browserlessToken, timeout = 30000) {
    console.log(`[AI Enrichment] Browserless scrape: ${url} (timeout: ${timeout}ms)`);

    let browser;
    const userAgent = randomChoice(USER_AGENTS);
    const viewport = randomChoice(VIEWPORTS);

    try {
        // Use stealth mode and block ads via Browserless params
        const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&stealth&blockAds`;
        browser = await puppeteer.connect({ browserWSEndpoint });

        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.setUserAgent(userAgent);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache'
        });

        // Block unnecessary resources (images, fonts, stylesheets) for faster loading
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            const blockedTypes = ['image', 'stylesheet', 'font', 'media'];
            if (blockedTypes.includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Enhanced stealth settings
        await page.evaluateOnNewDocument(() => {
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Fake plugins
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            // Fake chrome runtime
            window.chrome = { runtime: {} };
            // Override permissions query
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

        // Short delay to appear human (reduced for faster scraping)
        await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

        // Extract image URLs BEFORE removing elements (for floor plan images)
        const imageUrls = await page.evaluate((pageUrl) => {
            const baseOrigin = new URL(pageUrl).origin;
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
                .map(img => {
                    let src = img.src || img.dataset.src || img.dataset.lazySrc || '';
                    // Convert relative URLs to absolute
                    if (src && !src.startsWith('http')) {
                        src = src.startsWith('/') ? baseOrigin + src : baseOrigin + '/' + src;
                    }
                    const alt = img.alt || '';
                    return { src, alt };
                })
                .filter(img => {
                    if (!img.src) return false;
                    const lowerSrc = img.src.toLowerCase();
                    const lowerAlt = img.alt.toLowerCase();
                    // Filter for floor plan related images
                    const isFloorPlan =
                        lowerAlt.includes('floor') ||
                        lowerAlt.includes('plan') ||
                        lowerAlt.includes('layout') ||
                        lowerSrc.includes('floor') ||
                        lowerSrc.includes('plan') ||
                        lowerSrc.includes('layout') ||
                        lowerSrc.includes('fp_') ||
                        lowerSrc.includes('floorplan');
                    // Also accept large images that might be floor plans
                    const isLargeImage =
                        (img.width >= 300 || lowerSrc.includes('large') || lowerSrc.includes('full'));
                    return isFloorPlan || isLargeImage;
                })
                .map(img => img.src)
                .slice(0, 20); // Limit to 20 images
        }, url);

        // Extract content
        const content = await page.evaluate(() => {
            // Remove non-content elements
            document.querySelectorAll('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"]').forEach(el => el.remove());
            // Find main content area
            const main = document.querySelector('main, [role="main"], .content, article, .main-content') || document.body;
            return main.innerText.slice(0, 20000);
        });

        const title = await page.title();

        // Try to get meta description
        const description = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') : '';
        });

        return {
            success: true,
            url,
            title,
            description,
            content,
            contentLength: content.length,
            imageUrls, // Include extracted image URLs
            method: 'browserless',
            scrapedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error(`[AI Enrichment] Browserless error:`, error.message);
        return { success: false, url, error: error.message };
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Smart scrape - tries simple fetch first, falls back to Browserless
 * @param {string} url - URL to scrape
 * @param {string} browserlessToken - Browserless API token
 * @param {number} timeout - Optional timeout in ms (default 30000)
 * @returns {Promise<Object>} Page content
 */
async function scrapePage(url, browserlessToken, timeout = 30000) {
    // First try simple fetch (fast, cheap)
    let result = await simpleFetch(url, timeout);

    // If content is too short or failed, try Browserless (handles JS rendering)
    if (!result.success || (result.content && result.content.length < 500)) {
        console.log(`[AI Enrichment] Falling back to Browserless for: ${url}`);
        result = await browserlessScrape(url, browserlessToken, timeout);
    }

    return result;
}

/**
 * Call OpenAI API for extraction or text generation
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User message with context
 * @param {string} apiKey - OpenAI API key
 * @param {Object} options - Optional settings
 * @param {boolean} options.returnRaw - Return raw text instead of parsing JSON
 * @returns {Promise<Object|string>} AI response
 */
async function callOpenAI(systemPrompt, userPrompt, apiKey, options = {}) {
    const { returnRaw = false } = options;

    const requestBody = {
        model: 'gpt-4o-mini', // Cost-effective, good at extraction
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: returnRaw ? 0.7 : 0.1, // Higher temp for creative descriptions
        max_tokens: returnRaw ? 300 : 1000
    };

    // Only use JSON response format when not returning raw text
    if (!returnRaw) {
        requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Return raw text or parse JSON
    return returnRaw ? content : JSON.parse(content);
}

/**
 * Determine which fields are missing or need verification
 * @param {Object} property - Current property data
 * @returns {Object} Missing and existing fields analysis
 */
function analyzePropertyData(property) {
    const address = property.street_address || property.address || '';
    const name = property.community_name || property.name || '';

    const analysis = {
        missing: [],
        existing: {},
        needsVerification: []
    };

    // Check each enrichable field
    // Name - missing if empty or same as address
    if (!name || name === address || name.includes(address.split(',')[0])) {
        analysis.missing.push('name');
    } else {
        analysis.existing.name = name;
    }

    // Contact info - critical for agent confirmation
    if (!property.contact_phone) {
        analysis.missing.push('contact_phone');
    } else {
        analysis.existing.contact_phone = property.contact_phone;
        analysis.needsVerification.push('contact_phone');
    }

    if (!property.contact_email) {
        analysis.missing.push('contact_email');
    } else {
        analysis.existing.contact_email = property.contact_email;
        analysis.needsVerification.push('contact_email');
    }

    if (!property.contact_name) {
        analysis.missing.push('contact_name');
    } else {
        analysis.existing.contact_name = property.contact_name;
    }

    // Amenities
    if (!property.amenities || property.amenities.length === 0) {
        analysis.missing.push('amenities');
    } else {
        analysis.existing.amenities = property.amenities;
    }

    // Neighborhood
    if (!property.neighborhood) {
        analysis.missing.push('neighborhood');
    } else {
        analysis.existing.neighborhood = property.neighborhood;
    }

    // Description
    if (!property.description) {
        analysis.missing.push('description');
    } else {
        analysis.existing.description = property.description;
    }

    // Leasing link
    if (!property.leasing_link) {
        analysis.missing.push('leasing_link');
    } else {
        analysis.existing.leasing_link = property.leasing_link;
    }

    // Management company
    if (!property.management_company) {
        analysis.missing.push('management_company');
    } else {
        analysis.existing.management_company = property.management_company;
    }

    return analysis;
}

/**
 * Find property name and website from SerpApi search results
 * Uses structured data from SerpApi (no scraping needed)
 * @param {Array} organicResults - SerpApi organic search results
 * @param {Object} knowledgeGraph - SerpApi knowledge graph data
 * @param {string} address - Property address for matching
 * @returns {Object} Property name and website URL
 */
function findPropertyFromSerpApiResults(organicResults, knowledgeGraph, address) {
    let propertyName = null;
    let websiteUrl = null;
    let confidence = 0;

    // Check knowledge graph first (most reliable)
    if (knowledgeGraph) {
        if (knowledgeGraph.title && !knowledgeGraph.title.toLowerCase().includes('apartments.com')) {
            propertyName = knowledgeGraph.title;
            confidence = 0.95;
        }
        if (knowledgeGraph.website) {
            const isSkip = SKIP_DOMAINS.some(d => knowledgeGraph.website.includes(d));
            if (!isSkip) {
                websiteUrl = knowledgeGraph.website;
            }
        }
    }

    // Search organic results for property website
    for (const result of organicResults || []) {
        const link = result.link || '';
        const title = result.title || '';

        // Skip aggregator domains
        const isSkip = SKIP_DOMAINS.some(d => link.includes(d));
        if (isSkip) continue;

        // Found a non-aggregator result
        if (!websiteUrl) {
            websiteUrl = link;
        }

        // Try to extract property name from title
        if (!propertyName && title) {
            // Clean up title (remove " | Apartments" etc)
            const cleanTitle = title
                .replace(/\s*[\|\-–]\s*(Apartments?|Homes?|Living|Leasing|Contact|Apply).*$/i, '')
                .replace(/\s*[\|\-–]\s*[A-Z]{2}\s*$/i, '') // Remove state abbreviations
                .trim();

            if (cleanTitle && cleanTitle.length > 3 && cleanTitle.length < 60) {
                propertyName = cleanTitle;
                confidence = 0.85;
            }
        }

        // If we have both, we're done
        if (propertyName && websiteUrl) break;
    }

    return { property_name: propertyName, website_url: websiteUrl, confidence };
}

/**
 * Detect if search results indicate this is NOT an apartment complex
 * (e.g., single-family home, duplex, triplex, for-sale listing)
 * @param {Array} organicResults - SerpApi organic search results
 * @param {Object} knowledgeGraph - SerpApi knowledge graph data
 * @param {string} propertyName - Extracted property name
 * @param {string} websiteUrl - Found website URL
 * @returns {Object} Detection result with isNonApartment flag and reason
 */
function detectNonApartmentProperty(organicResults, knowledgeGraph, propertyName, websiteUrl) {
    const reasons = [];
    let confidence = 0;
    let propertyType = 'unknown';

    // Check property name for for-sale indicators (MLS, sold, etc.)
    if (propertyName) {
        for (const pattern of NON_APARTMENT_INDICATORS.titlePatterns) {
            if (pattern.test(propertyName)) {
                const match = propertyName.match(pattern)?.[0] || 'for-sale indicator';
                reasons.push(`Property name contains "${match}"`);
                confidence = Math.max(confidence, 0.85);
                propertyType = 'for_sale';
            }
        }
        // Check for small multifamily patterns in property name
        for (const pattern of NON_APARTMENT_INDICATORS.smallPropertyPatterns) {
            if (pattern.test(propertyName)) {
                const match = propertyName.match(pattern)?.[0] || 'small property';
                reasons.push(`Property appears to be a ${match} (not an apartment complex)`);
                confidence = Math.max(confidence, 0.85);
                propertyType = 'small_multifamily';
            }
        }
    }

    // Check website URL for small property patterns (e.g., /duplex/ in URL)
    if (websiteUrl) {
        const urlLower = websiteUrl.toLowerCase();

        // Check for for-sale domains
        const isSaleDomain = NON_APARTMENT_INDICATORS.saleDomains.some(d => urlLower.includes(d));
        if (isSaleDomain) {
            reasons.push(`Found on for-sale website: ${websiteUrl}`);
            confidence = Math.max(confidence, 0.8);
            propertyType = 'for_sale';
        }

        // Check for small rental domains (duplexes, single-family, etc.)
        const isSmallRentalDomain = NON_APARTMENT_INDICATORS.smallRentalDomains.some(d => urlLower.includes(d));
        if (isSmallRentalDomain) {
            reasons.push(`Found on small rental listing site: ${websiteUrl}`);
            confidence = Math.max(confidence, 0.75);
            propertyType = 'small_multifamily';
        }

        // Check URL path for small property indicators
        for (const pattern of NON_APARTMENT_INDICATORS.smallPropertyPatterns) {
            if (pattern.test(urlLower)) {
                const match = urlLower.match(pattern)?.[0] || 'small property';
                reasons.push(`URL indicates ${match} listing`);
                confidence = Math.max(confidence, 0.8);
                propertyType = 'small_multifamily';
            }
        }
    }

    // Check organic results for patterns
    let forSaleCount = 0;
    let smallPropertyCount = 0;
    let apartmentCount = 0;

    for (const result of organicResults || []) {
        const title = (result.title || '').toLowerCase();
        const snippet = (result.snippet || '').toLowerCase();
        const link = (result.link || '').toLowerCase();
        const combined = `${title} ${snippet} ${link}`;

        // Check for for-sale indicators
        if (/for\s+sale|mls|sold|listing|realtor|buy\s+this|home\s+value/i.test(combined)) {
            forSaleCount++;
        }

        // Check for small property indicators
        for (const pattern of NON_APARTMENT_INDICATORS.smallPropertyPatterns) {
            if (pattern.test(combined)) {
                smallPropertyCount++;
                break; // Only count once per result
            }
        }

        // Check for apartment complex indicators
        if (/apartment\s*(complex|community|homes)|leasing\s+office|floor\s*plans?|studio.*1\s*bed.*2\s*bed|move-in\s+special/i.test(combined)) {
            apartmentCount++;
        }

        // Check link for for-sale or small rental domains
        const isSaleLink = NON_APARTMENT_INDICATORS.saleDomains.some(d => link.includes(d));
        const isSmallLink = NON_APARTMENT_INDICATORS.smallRentalDomains.some(d => link.includes(d));
        if (isSaleLink) forSaleCount++;
        if (isSmallLink) smallPropertyCount++;
    }

    // Analyze search results distribution
    if (forSaleCount > 2 && forSaleCount > apartmentCount * 2) {
        reasons.push(`Search results indicate for-sale property (${forSaleCount} sale indicators vs ${apartmentCount} apartment indicators)`);
        confidence = Math.max(confidence, 0.75);
        propertyType = 'for_sale';
    }

    if (smallPropertyCount > 2 && smallPropertyCount > apartmentCount) {
        reasons.push(`Search results indicate small property (${smallPropertyCount} small property indicators vs ${apartmentCount} apartment indicators)`);
        confidence = Math.max(confidence, 0.75);
        propertyType = propertyType === 'unknown' ? 'small_multifamily' : propertyType;
    }

    // Check knowledge graph type if available
    if (knowledgeGraph) {
        const kgType = (knowledgeGraph.type || '').toLowerCase();

        if (kgType.includes('real estate') && !kgType.includes('apartment')) {
            reasons.push('Google identifies this as a real estate listing, not an apartment complex');
            confidence = Math.max(confidence, 0.7);
        }
    }

    return {
        isNonApartment: confidence >= 0.7,
        confidence,
        reasons,
        propertyType
    };
}

/**
 * Use AI to extract property name and website from search content (fallback)
 * @param {string} content - Scraped search results content
 * @param {string} address - Property address
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Property name and website URL
 */
async function extractPropertyFromContent(content, address, apiKey) {
    const prompt = `From this webpage content, find the apartment complex at: "${address}"

Extract:
1. The official property/apartment name (NOT the address)
2. The property's own website URL (NOT aggregator sites like apartments.com, zillow, etc)

Content:
${content.slice(0, 8000)}

Respond with JSON only:
{
    "property_name": "The official name or null if not found",
    "website_url": "The property's own website URL or null",
    "confidence": 0.0-1.0
}`;

    try {
        const result = await callOpenAI(
            'You extract property information from search results. Return valid JSON only.',
            prompt,
            apiKey
        );
        return result;
    } catch (error) {
        console.error('[AI Enrichment] Content extraction error:', error.message);
        return { property_name: null, website_url: null, confidence: 0 };
    }
}

/**
 * Main enrichment function - PRO multi-step approach
 * Step 1: SerpApi Google Local for direct business data (phone, website, hours)
 * Step 2: SerpApi Google Search for property name and website
 * Step 3: Scrape property's own website for accurate data
 * Step 4: AI extraction of structured information
 *
 * @param {Object} property - Property data to enrich
 * @param {Object} options - Enrichment options
 * @returns {Promise<Object>} Enrichment suggestions
 */
export async function enrichProperty(property, options = {}) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const serpApiKey = process.env.SERP_API_KEY;

    if (!openaiKey || !browserlessToken) {
        throw new Error('AI enrichment not configured. Add OPENAI_API_KEY and BROWSERLESS_TOKEN to environment.');
    }

    const address = property.street_address || property.address;
    const city = property.city || 'San Antonio';
    const state = property.state || 'TX';
    const zip_code = property.zip_code || '';
    const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
    const locationString = `${city}, ${state}`;

    console.log(`[AI Enrichment] Starting PRO enrichment for: ${fullAddress}`);
    console.log(`[AI Enrichment] SerpApi: ${serpApiKey ? 'configured' : 'not configured (will use fallback)'}`);

    const dataAnalysis = analyzePropertyData(property);
    console.log(`[AI Enrichment] Missing fields: ${dataAnalysis.missing.join(', ')}`);

    const results = {
        property_id: property.id,
        address: fullAddress,
        dataAnalysis,
        suggestions: {},
        verifications: {},
        sources_checked: [],
        errors: [],
        started_at: new Date().toISOString()
    };

    // ============================================================
    // STEP 1: Search for property using SerpApi
    // First try Google Local API (direct business data), then Google Search
    // ============================================================
    console.log('[AI Enrichment] Step 1: Searching for property...');

    const searchQuery = `${fullAddress} apartments leasing office`;
    let searchExtract = { property_name: null, website_url: null, confidence: 0, phone: null };

    if (serpApiKey) {
        // Try Google Local API first (best for business data like phone, website)
        console.log('[AI Enrichment] Using SerpApi Google Local for business data...');
        const localQuery = property.name || `apartments ${address}`;
        const localResults = await serpApiLocalSearch(localQuery, locationString, serpApiKey);
        results.sources_checked.push({
            source: 'serpapi_local',
            query: localQuery,
            location: locationString,
            success: localResults.success,
            resultsCount: localResults.localResults?.length || 0
        });

        // Check if we found a matching local result
        if (localResults.success && localResults.localResults.length > 0) {
            const bestMatch = localResults.localResults[0];
            console.log(`[AI Enrichment] Google Local found: ${bestMatch.title}`);

            // Extract data from local result
            if (bestMatch.phone && dataAnalysis.missing.includes('contact_phone')) {
                results.suggestions.contact_phone = {
                    value: bestMatch.phone,
                    confidence: 0.9,
                    source: 'serpapi_local',
                    reason: 'Found via Google Local business data'
                };
                searchExtract.phone = bestMatch.phone;
            }
            if (bestMatch.website) {
                searchExtract.website_url = bestMatch.website;
            }
            if (bestMatch.title && !bestMatch.title.toLowerCase().includes('apartments.com')) {
                searchExtract.property_name = bestMatch.title;
                searchExtract.confidence = 0.9;
            }
        }

        // Also do a regular Google search for more context
        console.log('[AI Enrichment] Using SerpApi Google Search...');
        const serpApiResults = await serpApiSearch(searchQuery, serpApiKey);
        results.sources_checked.push({
            source: 'serpapi_search',
            query: searchQuery,
            success: serpApiResults.success,
            resultsCount: serpApiResults.organic?.length || 0
        });

        if (serpApiResults.success) {
            const searchData = findPropertyFromSerpApiResults(
                serpApiResults.organic,
                serpApiResults.knowledgeGraph,
                fullAddress
            );
            // Use search results if we don't have data from local
            if (!searchExtract.property_name && searchData.property_name) {
                searchExtract.property_name = searchData.property_name;
                searchExtract.confidence = searchData.confidence;
            }
            if (!searchExtract.website_url && searchData.website_url) {
                searchExtract.website_url = searchData.website_url;
            }
            console.log(`[AI Enrichment] SerpApi found: ${searchExtract.property_name}, website: ${searchExtract.website_url}`);
        } else {
            results.errors.push(`SerpApi search failed: ${serpApiResults.error}`);
        }
    } else {
        // Fallback: Scrape Google directly (slower, less reliable)
        console.log('[AI Enrichment] SerpApi not configured, falling back to Google scrape...');
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
        const googleData = await scrapePage(googleUrl, browserlessToken);
        results.sources_checked.push({ source: 'google_scrape', url: googleUrl, success: googleData.success });

        if (googleData.success) {
            searchExtract = await extractPropertyFromContent(googleData.content, fullAddress, openaiKey);
            console.log(`[AI Enrichment] Google scrape found: ${searchExtract.property_name}, website: ${searchExtract.website_url}`);
        } else {
            results.errors.push(`Google search failed: ${googleData.error}`);
            results.completed_at = new Date().toISOString();
            return results;
        }
    }

    // ============================================================
    // NON-APARTMENT DETECTION: Check if this is a for-sale property
    // ============================================================
    if (serpApiKey) {
        // Get the search results we stored for analysis
        const lastSearch = results.sources_checked.find(s => s.source === 'serpapi_search');
        if (lastSearch?.success) {
            // Re-fetch organic results for detection (they're in memory from serpApiSearch)
            const serpApiResults = await serpApiSearch(searchQuery, serpApiKey);

            const nonApartmentCheck = detectNonApartmentProperty(
                serpApiResults.organic || [],
                serpApiResults.knowledgeGraph,
                searchExtract.property_name,
                searchExtract.website_url
            );

            if (nonApartmentCheck.isNonApartment) {
                const typeLabel = nonApartmentCheck.propertyType === 'for_sale'
                    ? 'for-sale listing'
                    : 'small property (duplex/single-family)';
                console.log(`[AI Enrichment] ⚠️ NON-APARTMENT DETECTED (${typeLabel}): ${nonApartmentCheck.reasons.join('; ')}`);

                results.suggest_delete = true;
                results.non_apartment_detection = {
                    confidence: nonApartmentCheck.confidence,
                    reasons: nonApartmentCheck.reasons,
                    property_name: searchExtract.property_name,
                    website_url: searchExtract.website_url,
                    property_type: nonApartmentCheck.propertyType,
                    type_label: typeLabel
                };
                results.completed_at = new Date().toISOString();

                // Still include the found name so user can see what was detected
                if (searchExtract.property_name) {
                    results.suggestions.name = {
                        value: searchExtract.property_name,
                        confidence: searchExtract.confidence || 0.8,
                        source: 'serpapi',
                        reason: `⚠️ This appears to be a ${typeLabel}, not an apartment complex`
                    };
                }

                return results;
            }
        }
    }

    // Save property name suggestion if found
    if (searchExtract.property_name && dataAnalysis.missing.includes('name')) {
        results.suggestions.name = {
            value: searchExtract.property_name,
            confidence: searchExtract.confidence || 0.8,
            source: serpApiKey ? 'serpapi' : 'google',
            reason: 'Found via Google search'
        };
    }

    // ============================================================
    // STEP 1B: Run targeted searches for specific data types
    // ============================================================
    let targetedSearchData = null;
    if (serpApiKey && searchExtract.property_name) {
        console.log('[AI Enrichment] Step 1B: Running targeted searches for pet policy, specials, qualifications...');
        targetedSearchData = await runTargetedSearches(
            { ...property, name: searchExtract.property_name },
            serpApiKey
        );
        results.sources_checked.push({
            source: 'serpapi_targeted',
            types: ['petPolicy', 'specials', 'qualifications'],
            success: true
        });
    }

    // ============================================================
    // STEP 2: Scrape property's own website (most accurate source)
    // ============================================================
    let propertyWebsiteData = null;

    if (searchExtract.website_url) {
        console.log(`[AI Enrichment] Step 2: Scraping property website: ${searchExtract.website_url}`);

        // Check if it's a skip domain
        const isSkipDomain = SKIP_DOMAINS.some(d => searchExtract.website_url.includes(d));

        if (!isSkipDomain) {
            propertyWebsiteData = await scrapePage(searchExtract.website_url, browserlessToken);
            results.sources_checked.push({
                source: 'property_website',
                url: searchExtract.website_url,
                success: propertyWebsiteData.success
            });

            if (propertyWebsiteData.success && dataAnalysis.missing.includes('leasing_link')) {
                results.suggestions.leasing_link = {
                    value: searchExtract.website_url,
                    confidence: 0.95,
                    source: 'property_website',
                    reason: 'Property official website'
                };
            }
        } else {
            console.log(`[AI Enrichment] Skipping aggregator domain: ${searchExtract.website_url}`);
        }
    }

    // ============================================================
    // STEP 3: AI extraction from best available content
    // ============================================================
    console.log('[AI Enrichment] Step 3: AI extraction of property details...');

    // Use property website content if available
    const contentToAnalyze = propertyWebsiteData?.success
        ? propertyWebsiteData.content
        : null;
    const contentSource = propertyWebsiteData?.success
        ? 'property_website'
        : 'search';

    // If no content to analyze, we're done
    if (!contentToAnalyze) {
        console.log('[AI Enrichment] No property website content to analyze, skipping AI extraction');
        results.completed_at = new Date().toISOString();
        console.log(`[AI Enrichment] Complete. Found ${Object.keys(results.suggestions).length} suggestions.`);
        return results;
    }

    const missingFieldsList = dataAnalysis.missing
        .filter(f => f !== 'name' || !results.suggestions.name) // Skip name if already found
        .filter(f => f !== 'description') // Description is generated separately
        .map(f => `- ${f}: ${ENRICHABLE_FIELDS[f]?.description || f}`)
        .join('\n');

    const systemPrompt = `You are a real estate data extraction expert. Extract apartment property information from webpage content.

IMPORTANT RULES:
1. Only extract data you're confident about
2. Phone format: (XXX) XXX-XXXX
3. Don't make up data - use null if not found
4. Prioritize contact info - agents need this for follow-up
5. For amenities: provide BOTH a detailed description AND short tags
6. For boolean fields: use true/false/null (null if not mentioned)
7. For pricing: extract minimum and maximum values if shown

Respond with JSON:
{
    "extracted": {
        "property_name": "Official apartment name or null",
        "contact_phone": "(XXX) XXX-XXXX or null",
        "contact_email": "email@domain.com or null",
        "contact_name": "Leasing agent/manager name or null",
        "office_hours": "Mon-Fri 9am-6pm, Sat 10am-5pm or null",
        "neighborhood": "Neighborhood name (Stone Oak, The Rim) or null",
        "management_company": "Management company name or null",

        "amenities": "Detailed amenities description or null",
        "amenities_tags": ["Pool", "Gym", "Pet Friendly"] or [],

        "rent_min": 900 or null,
        "rent_max": 2500 or null,
        "beds_min": 0 or null,
        "beds_max": 3 or null,
        "sqft_min": 500 or null,
        "sqft_max": 1500 or null,
        "specials_text": "Current specials/promotions or null",

        "pet_policy": "Pet policy details or null",
        "accepts_up_to_3_pets": true/false/null,

        "income_requirement": "2.5x or 3x rent or null",
        "accepts_bad_credit": true/false/null,
        "accepts_section_8": true/false/null,
        "accepts_broken_lease": true/false/null,
        "accepts_eviction": true/false/null,
        "accepts_felony": true/false/null,
        "same_day_move_in": true/false/null
    },
    "confidence": 0.0-1.0
}`;

    // Build additional context from targeted searches
    let targetedContext = '';
    if (targetedSearchData) {
        if (targetedSearchData.petPolicy?.snippets?.length) {
            targetedContext += `\nPet Policy Search Results:\n${targetedSearchData.petPolicy.snippets.slice(0, 3).join('\n')}\n`;
        }
        if (targetedSearchData.specials?.snippets?.length) {
            targetedContext += `\nSpecials/Promotions Search Results:\n${targetedSearchData.specials.snippets.slice(0, 3).join('\n')}\n`;
        }
        if (targetedSearchData.qualifications?.snippets?.length) {
            targetedContext += `\nQualification Requirements Search Results:\n${targetedSearchData.qualifications.snippets.slice(0, 3).join('\n')}\n`;
        }
    }

    const userPrompt = `Property: ${fullAddress}
${searchExtract.property_name ? `Known Name: ${searchExtract.property_name}` : ''}

Find these MISSING fields:
${missingFieldsList || 'None'}

Content from ${contentSource}:
---
${contentToAnalyze.slice(0, 10000)}
---
${targetedContext ? `\nAdditional Search Context:\n${targetedContext}` : ''}

Return JSON only.`;

    try {
        const extraction = await callOpenAI(systemPrompt, userPrompt, openaiKey);

        if (extraction.extracted) {
            const ext = extraction.extracted;
            const conf = extraction.confidence || 0.7;

            // Property name (if not already found) - only add if valid value
            if (isValidValue(ext.property_name) && !results.suggestions.name && dataAnalysis.missing.includes('name')) {
                results.suggestions.name = {
                    value: ext.property_name,
                    confidence: conf,
                    source: contentSource,
                    reason: 'Extracted from content'
                };
            }

            // Contact phone - only add if valid value
            if (isValidValue(ext.contact_phone)) {
                results.suggestions.contact_phone = {
                    value: ext.contact_phone,
                    confidence: 0.9,
                    source: contentSource,
                    reason: dataAnalysis.missing.includes('contact_phone')
                        ? 'Found leasing office phone'
                        : 'Updated phone number'
                };
            }

            // Contact email - only add if valid value
            if (isValidValue(ext.contact_email)) {
                results.suggestions.contact_email = {
                    value: ext.contact_email,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found leasing email'
                };
            }

            // Contact name - only add if valid value (not "null" or empty)
            if (isValidValue(ext.contact_name)) {
                results.suggestions.contact_name = {
                    value: ext.contact_name,
                    confidence: 0.75,
                    source: contentSource,
                    reason: 'Found leasing contact'
                };
            }

            // Amenities (detailed description) - only add if valid value
            if (isValidValue(ext.amenities) && dataAnalysis.missing.includes('amenities')) {
                // If it's an array, join into description
                const amenitiesValue = Array.isArray(ext.amenities)
                    ? ext.amenities.join(', ')
                    : ext.amenities;
                results.suggestions.amenities = {
                    value: amenitiesValue,
                    confidence: conf,
                    source: contentSource,
                    reason: 'Extracted amenities description'
                };
            }

            // Amenities tags (short array for badges)
            if (ext.amenities_tags?.length > 0) {
                // Filter out any null-like values from the array
                const validTags = ext.amenities_tags.filter(tag => isValidValue(tag));
                if (validTags.length > 0) {
                    results.suggestions.amenities_tags = {
                        value: validTags,
                        confidence: conf,
                        source: contentSource,
                        reason: 'Extracted amenity tags'
                    };
                }
            }

            // Neighborhood - only add if valid value
            if (isValidValue(ext.neighborhood) && dataAnalysis.missing.includes('neighborhood')) {
                results.suggestions.neighborhood = {
                    value: ext.neighborhood,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found neighborhood/area name'
                };
            }

            // Management company - only add if valid value
            if (isValidValue(ext.management_company) && dataAnalysis.missing.includes('management_company')) {
                results.suggestions.management_company = {
                    value: ext.management_company,
                    confidence: 0.75,
                    source: contentSource,
                    reason: 'Found management company'
                };
            }

            // Office hours - only add if valid value
            if (isValidValue(ext.office_hours) && dataAnalysis.missing.includes('office_hours')) {
                results.suggestions.office_hours = {
                    value: ext.office_hours,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found office hours'
                };
            }

            // === PRICING FIELDS ===
            if (typeof ext.rent_min === 'number' && ext.rent_min > 0) {
                results.suggestions.rent_min = {
                    value: ext.rent_min,
                    confidence: 0.9,
                    source: contentSource,
                    reason: 'Found minimum rent'
                };
            }
            if (typeof ext.rent_max === 'number' && ext.rent_max > 0) {
                results.suggestions.rent_max = {
                    value: ext.rent_max,
                    confidence: 0.9,
                    source: contentSource,
                    reason: 'Found maximum rent'
                };
            }
            if (isValidValue(ext.specials_text)) {
                results.suggestions.specials_text = {
                    value: ext.specials_text,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found current specials/promotions'
                };
            }

            // === UNIT INFO FIELDS ===
            if (typeof ext.beds_min === 'number' && ext.beds_min >= 0) {
                results.suggestions.beds_min = {
                    value: ext.beds_min,
                    confidence: 0.9,
                    source: contentSource,
                    reason: 'Found minimum bedrooms'
                };
            }
            if (typeof ext.beds_max === 'number' && ext.beds_max > 0) {
                results.suggestions.beds_max = {
                    value: ext.beds_max,
                    confidence: 0.9,
                    source: contentSource,
                    reason: 'Found maximum bedrooms'
                };
            }
            if (typeof ext.sqft_min === 'number' && ext.sqft_min > 0) {
                results.suggestions.sqft_min = {
                    value: ext.sqft_min,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found minimum sqft'
                };
            }
            if (typeof ext.sqft_max === 'number' && ext.sqft_max > 0) {
                results.suggestions.sqft_max = {
                    value: ext.sqft_max,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found maximum sqft'
                };
            }

            // === PET POLICY ===
            if (typeof ext.accepts_up_to_3_pets === 'boolean') {
                results.suggestions.accepts_up_to_3_pets = {
                    value: ext.accepts_up_to_3_pets,
                    confidence: 0.8,
                    source: contentSource,
                    reason: ext.accepts_up_to_3_pets ? 'Accepts multiple pets' : 'Pet restrictions apply'
                };
            }
            if (isValidValue(ext.pet_policy)) {
                results.suggestions.pet_policy = {
                    value: ext.pet_policy,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found pet policy details'
                };
            }

            // === QUALIFICATION FIELDS ===
            if (isValidValue(ext.income_requirement)) {
                results.suggestions.income_requirement = {
                    value: ext.income_requirement,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found income requirement'
                };
            }
            if (typeof ext.accepts_bad_credit === 'boolean') {
                results.suggestions.accepts_bad_credit = {
                    value: ext.accepts_bad_credit,
                    confidence: 0.75,
                    source: contentSource,
                    reason: ext.accepts_bad_credit ? 'Second chance property' : 'Standard credit requirements'
                };
            }
            if (typeof ext.accepts_section_8 === 'boolean') {
                results.suggestions.accepts_section_8 = {
                    value: ext.accepts_section_8,
                    confidence: 0.85,
                    source: contentSource,
                    reason: ext.accepts_section_8 ? 'Accepts housing vouchers' : 'Does not accept Section 8'
                };
            }
            if (typeof ext.accepts_broken_lease === 'boolean') {
                results.suggestions.accepts_broken_lease_1_year = {
                    value: ext.accepts_broken_lease,
                    confidence: 0.7,
                    source: contentSource,
                    reason: ext.accepts_broken_lease ? 'May work with broken leases' : 'No broken lease history accepted'
                };
            }
            if (typeof ext.accepts_eviction === 'boolean') {
                results.suggestions.accepts_eviction_1_year = {
                    value: ext.accepts_eviction,
                    confidence: 0.7,
                    source: contentSource,
                    reason: ext.accepts_eviction ? 'May work with eviction history' : 'No eviction history accepted'
                };
            }
            if (typeof ext.accepts_felony === 'boolean') {
                results.suggestions.accepts_felony = {
                    value: ext.accepts_felony,
                    confidence: 0.7,
                    source: contentSource,
                    reason: ext.accepts_felony ? 'May work with felony records' : 'Background check required'
                };
            }
            if (typeof ext.same_day_move_in === 'boolean') {
                results.suggestions.same_day_move_in = {
                    value: ext.same_day_move_in,
                    confidence: 0.8,
                    source: contentSource,
                    reason: ext.same_day_move_in ? 'Same-day move-in available' : 'Standard move-in process'
                };
            }
        }
    } catch (error) {
        console.error('[AI Enrichment] Extraction error:', error);
        results.errors.push(`AI extraction failed: ${error.message}`);
    }

    // ============================================================
    // STEP 4: Generate AI Property Description
    // ============================================================
    if (dataAnalysis.missing.includes('description')) {
        console.log('[AI Enrichment] Step 4: Generating AI property description...');
        try {
            const propertyName = results.suggestions.name?.value || searchExtract.property_name || 'This property';
            const neighborhood = results.suggestions.neighborhood?.value || '';
            const amenitiesDesc = results.suggestions.amenities?.value || '';
            const amenitiesTags = results.suggestions.amenities_tags?.value || [];

            const descPrompt = `Write a compelling 2-3 sentence property description for a real estate listing.

Property: ${propertyName}
Location: ${city}, ${state}
${neighborhood ? `Neighborhood: ${neighborhood}` : ''}
${amenitiesTags.length > 0 ? `Key Amenities: ${amenitiesTags.join(', ')}` : ''}
${amenitiesDesc ? `Full Amenities: ${amenitiesDesc.slice(0, 500)}` : ''}

Guidelines:
- Start with location context (e.g., "Located in the ${neighborhood || 'heart of ' + city}...")
- Highlight 2-3 standout amenities
- Keep it professional but inviting
- 2-3 sentences max

Return ONLY the description text, no quotes or formatting.`;

            const descResult = await callOpenAI(
                'You write professional real estate property descriptions. Return only the description text.',
                descPrompt,
                openaiKey,
                { returnRaw: true }
            );

            if (descResult && typeof descResult === 'string' && descResult.length > 20) {
                results.suggestions.description = {
                    value: descResult.trim(),
                    confidence: 0.85,
                    source: 'ai_generated',
                    reason: 'AI-generated property description'
                };
            }
        } catch (error) {
            console.error('[AI Enrichment] Description generation error:', error);
            // Non-critical, continue without description
        }
    }

    // ============================================================
    // STEP 6: Search for property images (if photos field is empty)
    // ============================================================
    const hasExistingPhotos = property.photos && Array.isArray(property.photos) && property.photos.length > 0;
    if (!hasExistingPhotos && serpApiKey && (searchExtract.property_name || property.name)) {
        console.log('[AI Enrichment] Step 6: Searching for property images...');
        try {
            const propertyNameForSearch = searchExtract.property_name || property.name;
            const propertyImages = await searchPropertyImages(propertyNameForSearch, city, state, serpApiKey);

            if (propertyImages.length > 0) {
                results.suggestions.photos = {
                    value: propertyImages,
                    confidence: 0.75,
                    source: 'image_search',
                    reason: `Found ${propertyImages.length} property photos`
                };
                console.log(`[AI Enrichment] Found ${propertyImages.length} property photos`);
            }
        } catch (error) {
            console.error('[AI Enrichment] Image search error:', error.message);
            // Non-critical, continue without images
        }
    }

    results.completed_at = new Date().toISOString();
    console.log(`[AI Enrichment] Complete. Found ${Object.keys(results.suggestions).length} suggestions.`);
    return results;
}

// ============================================================
// DEEP SEARCH: Scrape subpages for missing contact info
// ============================================================

/**
 * Common subpages to check for contact information and specials
 */
const DEEP_SEARCH_SUBPAGES = [
    // Contact pages (most likely to have contact info)
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/team',
    '/staff',
    // Leasing pages (may have specials and contact info)
    '/apply',
    '/leasing',
    '/schedule-tour',
    '/schedule-a-tour',
    // Specials/promotions pages
    '/specials',
    '/promotions',
    '/move-in-specials',
    '/deals',
    '/offers',
    '/current-specials',
    '/incentives'
];

/**
 * Deep search property website subpages for missing information
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Found suggestions
 */
export async function deepSearchProperty(options) {
    const { id, leasing_url, address, city, state, missing_fields } = options;

    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    if (!openaiKey || !browserlessToken) {
        throw new Error('Deep search not configured. Add OPENAI_API_KEY and BROWSERLESS_TOKEN.');
    }

    const results = {
        started_at: new Date().toISOString(),
        suggestions: {},
        pages_scraped: [],
        errors: []
    };

    console.log(`[Deep Search] Starting for ${leasing_url}`);
    console.log(`[Deep Search] Looking for: ${missing_fields.join(', ')}`);

    // Parse the base URL
    let baseUrl;
    try {
        baseUrl = new URL(leasing_url);
    } catch (e) {
        results.errors.push(`Invalid URL: ${leasing_url}`);
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Build list of URLs to scrape based on what we're looking for
    // Prioritize specials pages if looking for specials_text
    const lookingForSpecials = missing_fields.includes('specials_text');
    const urlsToScrape = DEEP_SEARCH_SUBPAGES
        .filter(path => {
            // If looking for specials, include all pages
            if (lookingForSpecials) return true;
            // Otherwise skip specials-specific pages
            const specialsPaths = ['/specials', '/promotions', '/move-in-specials', '/deals', '/offers', '/current-specials', '/incentives'];
            return !specialsPaths.includes(path);
        })
        .map(path => `${baseUrl.origin}${path}`);

    // Scrape each subpage
    for (const url of urlsToScrape) {
        // Stop if we found all missing fields
        const stillMissing = missing_fields.filter(f => !results.suggestions[f]);
        if (stillMissing.length === 0) {
            console.log('[Deep Search] All missing fields found, stopping search');
            break;
        }

        console.log(`[Deep Search] Scraping: ${url}`);

        try {
            const pageData = await browserlessScrape(url, browserlessToken);

            results.pages_scraped.push({
                url,
                success: pageData.success,
                content_length: pageData.success ? pageData.content?.length : 0
            });

            if (pageData.success && pageData.content?.length > 200) {
                // Extract contact info and specials from this page
                const extraction = await extractDeepSearchInfo(
                    pageData.content,
                    stillMissing,
                    address,
                    openaiKey
                );

                // Merge any found suggestions
                if (extraction.extracted) {
                    for (const [field, value] of Object.entries(extraction.extracted)) {
                        if (isValidValue(value) && stillMissing.includes(field) && !results.suggestions[field]) {
                            results.suggestions[field] = {
                                value,
                                confidence: 0.85,
                                source: 'deep_search',
                                reason: `Found on ${new URL(url).pathname}`
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Deep Search] Error scraping ${url}:`, error.message);
            results.pages_scraped.push({ url, success: false, error: error.message });
        }
    }

    results.completed_at = new Date().toISOString();
    console.log(`[Deep Search] Complete. Found ${Object.keys(results.suggestions).length} additional fields.`);
    return results;
}

/**
 * Extract contact information and specials from page content
 */
async function extractDeepSearchInfo(content, missingFields, address, openaiKey) {
    const truncatedContent = content.slice(0, 12000);

    // Build dynamic extraction based on what's missing
    const lookingForSpecials = missingFields.includes('specials_text');
    const lookingForContact = missingFields.some(f => ['contact_phone', 'contact_email', 'contact_name'].includes(f));

    const systemPrompt = `You are extracting property information from an apartment website.
Look for: ${missingFields.join(', ')}

Return ONLY valid JSON:
{
  "extracted": {
    ${lookingForContact ? `"contact_phone": "(XXX) XXX-XXXX or null",
    "contact_email": "email@domain.com or null",
    "contact_name": "Person's name or null",` : ''}
    ${lookingForSpecials ? `"specials_text": "Current move-in specials, promotions, or deals - include specific amounts/months if mentioned. Example: '$500 off first month' or '2 months free on 12-month lease'. Return null if no specials found.",` : ''}
    "office_hours": "Office hours if shown or null"
  }
}

Rules:
- Only extract real data, not placeholder text
- Phone must be a real phone number format
- Email must be a valid email address
- Contact name should be a real person's name (not "Leasing Office")
- For specials: Look for move-in specials, rent concessions, free months, waived fees, etc.
- Be specific about specials amounts/terms when found
- Return null for any field not found or uncertain`;

    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Property: ${address}\n\nPage content:\n${truncatedContent}` }
                ],
                temperature: 0.1,
                max_tokens: 600,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        return JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch (error) {
        console.error('[Deep Search] AI extraction error:', error.message);
        return { extracted: {} };
    }
}

/**
 * Search for available units on a property website
 * Scrapes floor plans and availability pages
 *
 * @param {Object} params - Search parameters
 * @param {string} params.propertyId - Property ID
 * @param {string} params.propertyName - Property name
 * @param {string} params.leasingUrl - Property leasing URL
 * @param {string} params.address - Property address
 * @returns {Promise<Object>} Unit search results
 */
export async function searchUnits({ propertyId, propertyName, leasingUrl, address }) {
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!browserlessToken || !openaiKey) {
        throw new Error('Unit search requires BROWSERLESS_TOKEN and OPENAI_API_KEY');
    }

    console.log(`[Unit Search] Starting search for: ${propertyName}`);
    console.log(`[Unit Search] Base URL: ${leasingUrl}`);

    const results = {
        propertyId,
        propertyName,
        units: [],
        floorPlans: [],
        sources_checked: [],
        errors: [],
        started_at: new Date().toISOString()
    };

    // Parse base URL for building subpage URLs
    let baseUrl;
    try {
        baseUrl = new URL(leasingUrl);
    } catch (e) {
        results.errors.push(`Invalid leasing URL: ${leasingUrl}`);
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Try the main/provided URL FIRST (most reliable for small property sites)
    // Then try common subpaths if the main page doesn't have unit data
    let contentToAnalyze = '';
    let successfulUrl = null;
    let collectedImageUrls = [];
    const MAX_PAGES = 3;
    let pagesScraped = 0;

    // Helper to check if content has unit/floor plan data
    const hasUnitIndicators = (content) => {
        const lower = content.toLowerCase();
        return (
            lower.includes('bedroom') ||
            lower.includes('bed/bath') ||
            lower.includes('1 bed') ||
            lower.includes('2 bed') ||
            lower.includes('studio') ||
            lower.includes('sq ft') ||
            lower.includes('sqft') ||
            lower.includes('square feet') ||
            lower.includes('floor plan') ||
            lower.includes('floorplan') ||
            lower.includes('/month') ||
            lower.includes('per month') ||
            lower.includes('starting at $') ||
            lower.includes('rent:') ||
            lower.includes('price:') ||
            lower.includes('available units') ||
            lower.includes('availability')
        );
    };

    // STEP 1: Try the main/provided URL first
    console.log(`[Unit Search] Step 1 - Trying main URL: ${leasingUrl}`);
    try {
        const pageData = await scrapePage(leasingUrl, browserlessToken, 15000);
        pagesScraped++;

        results.sources_checked.push({
            url: leasingUrl,
            success: pageData.success
        });

        if (pageData.success && pageData.content) {
            if (pageData.imageUrls && pageData.imageUrls.length > 0) {
                collectedImageUrls = [...collectedImageUrls, ...pageData.imageUrls];
                console.log(`[Unit Search] Found ${pageData.imageUrls.length} images on main page`);
            }

            if (hasUnitIndicators(pageData.content)) {
                contentToAnalyze = `--- Content from ${leasingUrl} ---\n${pageData.content}`;
                successfulUrl = leasingUrl;
                console.log(`[Unit Search] Found unit data on main page!`);
            } else {
                console.log(`[Unit Search] Main page has no unit indicators, will try subpages`);
            }
        }
    } catch (error) {
        console.log(`[Unit Search] Error on main page: ${error.message}`);
    }

    // STEP 2: If main page didn't have unit data, try common subpaths
    if (!contentToAnalyze) {
        const unitPaths = [
            '/floor-plans',
            '/floorplans',
            '/apartments',
            '/availability',
            '/units',
            '/rentals',
            '/properties',
            '/our-apartments'
        ];

        for (const path of unitPaths) {
            if (pagesScraped >= MAX_PAGES || contentToAnalyze) {
                break;
            }

            const fullUrl = `${baseUrl.origin}${path}`;
            console.log(`[Unit Search] Step 2 - Trying: ${fullUrl}`);

            try {
                const pageData = await scrapePage(fullUrl, browserlessToken, 12000);
                pagesScraped++;

                results.sources_checked.push({
                    url: fullUrl,
                    success: pageData.success
                });

                if (pageData.success && pageData.content) {
                    if (pageData.imageUrls && pageData.imageUrls.length > 0) {
                        collectedImageUrls = [...collectedImageUrls, ...pageData.imageUrls];
                    }

                    if (hasUnitIndicators(pageData.content)) {
                        contentToAnalyze = `--- Content from ${fullUrl} ---\n${pageData.content}`;
                        successfulUrl = fullUrl;
                        console.log(`[Unit Search] Found unit data at: ${fullUrl}`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`[Unit Search] Error scraping ${fullUrl}: ${error.message}`);
            }
        }
    }

    // STEP 3: If still no content but we have images, use main page content anyway
    // (Some sites have unit info but don't match our keyword patterns)
    if (!contentToAnalyze && collectedImageUrls.length > 0) {
        console.log(`[Unit Search] No keyword matches but found ${collectedImageUrls.length} images - trying AI extraction anyway`);
        try {
            const pageData = await scrapePage(leasingUrl, browserlessToken, 10000);
            if (pageData.success && pageData.content && pageData.content.length > 500) {
                contentToAnalyze = `--- Content from ${leasingUrl} (forced) ---\n${pageData.content}`;
                successfulUrl = leasingUrl;
            }
        } catch (e) {
            console.log(`[Unit Search] Fallback scrape failed: ${e.message}`);
        }
    }

    if (!contentToAnalyze) {
        console.log('[Unit Search] No unit content found on any page');
        results.errors.push('No floor plan or availability pages found');
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Dedupe image URLs
    collectedImageUrls = [...new Set(collectedImageUrls)];
    console.log(`[Unit Search] Total unique floor plan images found: ${collectedImageUrls.length}`);

    // Use AI to extract unit data from content
    console.log('[Unit Search] Extracting unit data with AI...');
    const extracted = await extractUnitsFromContent(contentToAnalyze, propertyName, collectedImageUrls, openaiKey);

    if (extracted.floorPlans && extracted.floorPlans.length > 0) {
        results.floorPlans = extracted.floorPlans;
        console.log(`[Unit Search] Found ${extracted.floorPlans.length} floor plans`);
    }

    if (extracted.units && extracted.units.length > 0) {
        results.units = extracted.units;
        console.log(`[Unit Search] Found ${extracted.units.length} individual units`);
    }

    results.sourceUrl = successfulUrl;
    results.completed_at = new Date().toISOString();
    return results;
}

/**
 * Extract unit/floor plan data from scraped content using AI
 * Now includes image URL matching for floor plans
 */
async function extractUnitsFromContent(content, propertyName, imageUrls, openaiKey) {
    const truncatedContent = content.slice(0, 15000);
    const hasImages = imageUrls && imageUrls.length > 0;

    const systemPrompt = `You are an expert at extracting apartment unit and floor plan data from websites.

Extract ALL floor plans and available units from this apartment property website.

Return JSON in this exact format:
{
  "floorPlans": [
    {
      "name": "A1 or The Madison or 1x1 Classic",
      "beds": 1,
      "baths": 1.0,
      "sqft": 650,
      "rent_min": 1050,
      "rent_max": 1200,
      "units_available": 3${hasImages ? `,
      "image_url": "URL from provided image list that best matches this floor plan or null"` : ''}
    }
  ],
  "units": [
    {
      "unit_number": "101 or A or Unit 1",
      "floor_plan_name": "A1 (link to floor plan above)",
      "beds": 1,
      "baths": 1.0,
      "sqft": 650,
      "rent": 1095,
      "available_from": "2025-01-15 or null if move-in ready",
      "floor": 1,
      "status": "available or pending or leased"
    }
  ]
}

IMPORTANT RULES:
1. Extract ALL floor plans you can find (A1, A2, B1, etc.)
2. Extract ALL individual units if shown (101, 102, 201, etc.)
3. Rent should be numeric only (no $ or commas)
4. Sqft should be numeric only
5. available_from should be YYYY-MM-DD format or null
6. If only floor plans are shown (not individual units), return empty units array
7. baths can be decimals like 1.5, 2.0
8. beds 0 = studio
9. Don't make up data - only extract what's clearly shown${hasImages ? `
10. For image_url: Match floor plan names to image URLs. Look for floor plan name (A1, B2, etc.) in the URL. If uncertain, use null.` : ''}`;

    let userPrompt = `Property: ${propertyName}

Extract floor plans and units from this content:
---
${truncatedContent}
---`;

    if (hasImages) {
        userPrompt += `

Available floor plan image URLs (match these to floor plans if possible):
${imageUrls.join('\n')}`;
    }

    userPrompt += '\n\nReturn JSON only.';

    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 2500,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        console.log('[Unit Search] Raw AI response length:', rawContent.length);

        const result = JSON.parse(rawContent);
        console.log('[Unit Search] Parsed floor plans:', result.floorPlans?.length || 0);
        console.log('[Unit Search] Parsed units:', result.units?.length || 0);

        // Clean and validate the results - be more lenient
        const cleanedFloorPlans = (result.floorPlans || []).filter(fp => {
            // Must have name and beds (can be 0 for studio)
            const valid = fp.name && typeof fp.beds === 'number';
            if (!valid && fp.name) {
                console.log(`[Unit Search] Filtered out floor plan: ${fp.name} (beds: ${fp.beds})`);
            }
            return valid;
        }).map(fp => ({
            ...fp,
            // Only include image_url if it's a valid URL
            image_url: fp.image_url && fp.image_url.startsWith('http') ? fp.image_url : null
        }));

        const cleanedUnits = (result.units || []).filter(u => {
            // Must have unit_number and rent
            const valid = u.unit_number && typeof u.rent === 'number';
            if (!valid && u.unit_number) {
                console.log(`[Unit Search] Filtered out unit: ${u.unit_number} (rent: ${u.rent})`);
            }
            return valid;
        });

        console.log('[Unit Search] Final cleaned floor plans:', cleanedFloorPlans.length);
        console.log('[Unit Search] Final cleaned units:', cleanedUnits.length);

        return {
            floorPlans: cleanedFloorPlans,
            units: cleanedUnits
        };
    } catch (error) {
        console.error('[Unit Search] AI extraction error:', error.message);
        console.error('[Unit Search] Error stack:', error.stack);
        return { floorPlans: [], units: [] };
    }
}

export default {
    checkConfiguration,
    enrichProperty,
    analyzePropertyData,
    deepSearchProperty,
    searchUnits
};

