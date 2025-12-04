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

// All enrichable fields
const ENRICHABLE_FIELDS = {
    name: { dbColumn: 'name', priority: 1, description: 'Property/community name' },
    contact_phone: { dbColumn: 'contact_phone', priority: 2, description: 'Leasing office phone' },
    contact_email: { dbColumn: 'contact_email', priority: 3, description: 'Leasing office email' },
    contact_name: { dbColumn: 'contact_name', priority: 4, description: 'Leasing contact name' },
    amenities: { dbColumn: 'amenities', priority: 5, description: 'Property amenities (detailed list)' },
    amenities_tags: { dbColumn: 'amenities', priority: 5, description: 'Short amenity tags (Pool, Gym, etc.)' },
    neighborhood: { dbColumn: 'neighborhood', priority: 6, description: 'Neighborhood/area name' },
    description: { dbColumn: 'description', priority: 7, description: 'AI-generated property description' },
    leasing_link: { dbColumn: 'leasing_link', priority: 8, description: 'Leasing/apply URL' },
    management_company: { dbColumn: 'management_company', priority: 9, description: 'Management company' }
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
 * Simple fetch-based scrape for property websites (fast, no browser needed)
 * @param {string} url - URL to scrape
 * @returns {Promise<Object>} Page content
 */
async function simpleFetch(url) {
    console.log(`[AI Enrichment] Simple fetch: ${url}`);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

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
 * @returns {Promise<Object>} Page content and metadata
 */
async function browserlessScrape(url, browserlessToken) {
    console.log(`[AI Enrichment] Browserless scrape: ${url}`);

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

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Random delay to appear human
        await new Promise(r => setTimeout(r, randomDelay(1500, 3000)));

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
 * @returns {Promise<Object>} Page content
 */
async function scrapePage(url, browserlessToken) {
    // First try simple fetch (fast, cheap)
    let result = await simpleFetch(url);

    // If content is too short or failed, try Browserless (handles JS rendering)
    if (!result.success || (result.content && result.content.length < 500)) {
        console.log(`[AI Enrichment] Falling back to Browserless for: ${url}`);
        result = await browserlessScrape(url, browserlessToken);
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

    const systemPrompt = `You are a real estate data extraction expert. Extract property information from webpage content.

IMPORTANT RULES:
1. Only extract data you're confident about
2. Phone format: (XXX) XXX-XXXX
3. Don't make up data - use null if not found
4. Prioritize contact_phone - agents need this for follow-up
5. For amenities: provide BOTH a detailed description AND short tags
6. For neighborhood: extract the neighborhood/area name if mentioned (e.g., "The Rim", "Stone Oak", "Hidden Forest")

Respond with JSON:
{
    "extracted": {
        "property_name": "Official apartment name",
        "contact_phone": "(XXX) XXX-XXXX or null",
        "contact_email": "email@domain.com or null",
        "contact_name": "Leasing agent name or null",
        "amenities": "Detailed amenities description as a paragraph or comma-separated list",
        "amenities_tags": ["Pool", "Gym", "Pet Friendly", "Parking", "In-Unit W/D"],
        "neighborhood": "Neighborhood or area name (e.g., Stone Oak, The Rim) or null",
        "management_company": "Company name or null"
    },
    "confidence": 0.0-1.0
}`;

    const userPrompt = `Property: ${fullAddress}
${searchExtract.property_name ? `Known Name: ${searchExtract.property_name}` : ''}

Find these MISSING fields:
${missingFieldsList || 'None'}

Content from ${contentSource}:
---
${contentToAnalyze.slice(0, 12000)}
---

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

    results.completed_at = new Date().toISOString();
    console.log(`[AI Enrichment] Complete. Found ${Object.keys(results.suggestions).length} suggestions.`);
    return results;
}

export default {
    checkConfiguration,
    enrichProperty,
    analyzePropertyData
};

