/**
 * AI Property Enrichment Service - PRO Edition 2025
 *
 * Best practices implementation:
 * 1. Use Serper.dev API for Google searches (fast, reliable, structured)
 * 2. Smart scraping: fetch first, Browserless for JS-heavy sites
 * 3. Target property's own website (skip aggregators)
 * 4. AI extraction with OpenAI GPT-4o-mini
 *
 * @module lib/ai-enrichment
 */

import puppeteer from 'puppeteer-core';

// Configuration
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const SERPER_API_URL = 'https://google.serper.dev/search';

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

// All enrichable fields
const ENRICHABLE_FIELDS = {
    name: { dbColumn: 'name', priority: 1, description: 'Property/community name' },
    contact_phone: { dbColumn: 'contact_phone', priority: 2, description: 'Leasing office phone' },
    contact_email: { dbColumn: 'contact_email', priority: 3, description: 'Leasing office email' },
    contact_name: { dbColumn: 'contact_name', priority: 4, description: 'Leasing contact name' },
    amenities: { dbColumn: 'amenities', priority: 5, description: 'Property amenities' },
    leasing_link: { dbColumn: 'leasing_link', priority: 6, description: 'Leasing/apply URL' },
    management_company: { dbColumn: 'management_company', priority: 7, description: 'Management company' }
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

/**
 * Check if AI enrichment is configured
 * @returns {Object} Configuration status
 */
export function checkConfiguration() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const serperApiKey = process.env.SERPER_API_KEY;

    return {
        configured: !!(openaiKey && browserlessToken),
        openai: !!openaiKey,
        browserless: !!browserlessToken,
        serper: !!serperApiKey,
        openaiPreview: openaiKey ? `${openaiKey.slice(0, 8)}...` : null,
        browserlessPreview: browserlessToken ? `${browserlessToken.slice(0, 8)}...` : null,
        serperPreview: serperApiKey ? `${serperApiKey.slice(0, 8)}...` : null,
        // Serper is optional but recommended for reliability
        recommendation: !serperApiKey ? 'Add SERPER_API_KEY for faster, more reliable Google searches' : null
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
 * Search Google using Serper.dev API (fast, reliable, structured results)
 * @param {string} query - Search query
 * @param {string} serperApiKey - Serper API key
 * @returns {Promise<Object>} Search results with organic links
 */
async function serperSearch(query, serperApiKey) {
    console.log(`[AI Enrichment] Serper search: "${query}"`);
    try {
        const response = await fetch(SERPER_API_URL, {
            method: 'POST',
            headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: query,
                num: 10,
                gl: 'us',
                hl: 'en'
            })
        });

        if (!response.ok) {
            throw new Error(`Serper API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[AI Enrichment] Serper returned ${data.organic?.length || 0} results`);

        return {
            success: true,
            organic: data.organic || [],
            knowledgeGraph: data.knowledgeGraph || null,
            answerBox: data.answerBox || null
        };
    } catch (error) {
        console.log(`[AI Enrichment] Serper search failed: ${error.message}`);
        return { success: false, error: error.message, organic: [] };
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
 * Call OpenAI API with function calling
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User message with context
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} AI response
 */
async function callOpenAI(systemPrompt, userPrompt, apiKey) {
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini', // Cost-effective, good at extraction
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1, // Low temp for consistent extraction
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
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
 * Find property name and website from Serper search results
 * Uses structured data from Serper API (no scraping needed)
 * @param {Array} organicResults - Serper organic search results
 * @param {Object} knowledgeGraph - Serper knowledge graph data
 * @param {string} address - Property address for matching
 * @returns {Object} Property name and website URL
 */
function findPropertyFromSerperResults(organicResults, knowledgeGraph, address) {
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
 * Step 1: Serper API for Google search (fast, reliable, structured)
 * Step 2: Scrape property's own website for accurate data
 * Step 3: AI extraction of structured information
 *
 * @param {Object} property - Property data to enrich
 * @param {Object} options - Enrichment options
 * @returns {Promise<Object>} Enrichment suggestions
 */
export async function enrichProperty(property, options = {}) {
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const serperApiKey = process.env.SERPER_API_KEY;

    if (!openaiKey || !browserlessToken) {
        throw new Error('AI enrichment not configured. Add OPENAI_API_KEY and BROWSERLESS_TOKEN to environment.');
    }

    const address = property.street_address || property.address;
    const city = property.city || 'San Antonio';
    const state = property.state || 'TX';
    const zip_code = property.zip_code || '';
    const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;

    console.log(`[AI Enrichment] Starting PRO enrichment for: ${fullAddress}`);
    console.log(`[AI Enrichment] Serper API: ${serperApiKey ? 'configured' : 'not configured (will use fallback)'}`);

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
    // STEP 1: Search for property name and website
    // Use Serper API if available (fast, reliable), otherwise scrape Google
    // ============================================================
    console.log('[AI Enrichment] Step 1: Searching for property...');

    const searchQuery = `${fullAddress} apartments leasing office`;
    let searchExtract = { property_name: null, website_url: null, confidence: 0 };

    if (serperApiKey) {
        // Use Serper API (recommended - fast, structured, reliable)
        console.log('[AI Enrichment] Using Serper API for search...');
        const serperResults = await serperSearch(searchQuery, serperApiKey);
        results.sources_checked.push({
            source: 'serper_api',
            query: searchQuery,
            success: serperResults.success,
            resultsCount: serperResults.organic?.length || 0
        });

        if (serperResults.success) {
            searchExtract = findPropertyFromSerperResults(
                serperResults.organic,
                serperResults.knowledgeGraph,
                fullAddress
            );
            console.log(`[AI Enrichment] Serper found: ${searchExtract.property_name}, website: ${searchExtract.website_url}`);
        } else {
            results.errors.push(`Serper search failed: ${serperResults.error}`);
        }
    } else {
        // Fallback: Scrape Google directly (slower, less reliable)
        console.log('[AI Enrichment] Serper not configured, falling back to Google scrape...');
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

    // Save property name suggestion if found
    if (searchExtract.property_name && dataAnalysis.missing.includes('name')) {
        results.suggestions.name = {
            value: searchExtract.property_name,
            confidence: searchExtract.confidence || 0.8,
            source: serperApiKey ? 'serper_api' : 'google',
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
        .map(f => `- ${f}: ${ENRICHABLE_FIELDS[f]?.description || f}`)
        .join('\n');

    const systemPrompt = `You are a real estate data extraction expert. Extract property information from webpage content.

IMPORTANT RULES:
1. Only extract data you're confident about
2. Phone format: (XXX) XXX-XXXX
3. Don't make up data - use null if not found
4. Prioritize contact_phone - agents need this for follow-up

Respond with JSON:
{
    "extracted": {
        "property_name": "Official apartment name",
        "contact_phone": "(XXX) XXX-XXXX or null",
        "contact_email": "email@domain.com or null",
        "contact_name": "Leasing agent name or null",
        "amenities": ["array", "of", "amenities"] or [],
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

            // Property name (if not already found)
            if (ext.property_name && !results.suggestions.name && dataAnalysis.missing.includes('name')) {
                results.suggestions.name = {
                    value: ext.property_name,
                    confidence: conf,
                    source: contentSource,
                    reason: 'Extracted from content'
                };
            }

            // Contact phone
            if (ext.contact_phone) {
                results.suggestions.contact_phone = {
                    value: ext.contact_phone,
                    confidence: 0.9,
                    source: contentSource,
                    reason: dataAnalysis.missing.includes('contact_phone')
                        ? 'Found leasing office phone'
                        : 'Updated phone number'
                };
            }

            // Contact email
            if (ext.contact_email) {
                results.suggestions.contact_email = {
                    value: ext.contact_email,
                    confidence: 0.85,
                    source: contentSource,
                    reason: 'Found leasing email'
                };
            }

            // Contact name
            if (ext.contact_name) {
                results.suggestions.contact_name = {
                    value: ext.contact_name,
                    confidence: 0.75,
                    source: contentSource,
                    reason: 'Found leasing contact'
                };
            }

            // Amenities
            if (ext.amenities?.length > 0 && dataAnalysis.missing.includes('amenities')) {
                results.suggestions.amenities = {
                    value: ext.amenities,
                    confidence: conf,
                    source: contentSource,
                    reason: 'Extracted amenities list'
                };
            }

            // Management company
            if (ext.management_company && dataAnalysis.missing.includes('management_company')) {
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

    results.completed_at = new Date().toISOString();
    console.log(`[AI Enrichment] Complete. Found ${Object.keys(results.suggestions).length} suggestions.`);
    return results;
}

export default {
    checkConfiguration,
    enrichProperty,
    analyzePropertyData
};

