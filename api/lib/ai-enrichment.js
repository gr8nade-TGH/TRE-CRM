/**
 * AI Property Enrichment Service
 *
 * Smart multi-step enrichment:
 * 1. Google Search to find property name + official website
 * 2. Scrape property's own website (most accurate data)
 * 3. Use AI to extract structured information
 *
 * @module lib/ai-enrichment
 */

import puppeteer from 'puppeteer-core';

// Configuration
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// User agent for simple fetch requests
const FETCH_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Rotating user agents for Browserless
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

// Random viewport sizes
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
];

// All enrichable fields with their database column mappings
const ENRICHABLE_FIELDS = {
    name: { dbColumn: 'name', priority: 1, description: 'Property/community name' },
    contact_phone: { dbColumn: 'contact_phone', priority: 2, description: 'Leasing office phone' },
    contact_email: { dbColumn: 'contact_email', priority: 3, description: 'Leasing office email' },
    contact_name: { dbColumn: 'contact_name', priority: 4, description: 'Leasing contact name' },
    amenities: { dbColumn: 'amenities', priority: 5, description: 'Property amenities' },
    leasing_link: { dbColumn: 'leasing_link', priority: 6, description: 'Leasing/apply URL' },
    management_company: { dbColumn: 'management_company', priority: 7, description: 'Management company' }
};

// Domains to skip (aggregators that block/are unreliable)
const SKIP_DOMAINS = [
    'apartments.com', 'zillow.com', 'realtor.com', 'trulia.com',
    'redfin.com', 'facebook.com', 'yelp.com', 'bbb.org',
    'yellowpages.com', 'manta.com', 'mapquest.com'
];

/**
 * Check if AI enrichment is configured
 * @returns {Object} Configuration status
 */
export function checkConfiguration() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    return {
        configured: !!(openaiKey && browserlessToken),
        openai: !!openaiKey,
        browserless: !!browserlessToken,
        openaiPreview: openaiKey ? `${openaiKey.slice(0, 8)}...` : null,
        browserlessPreview: browserlessToken ? `${browserlessToken.slice(0, 8)}...` : null
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
                'User-Agent': FETCH_USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
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
            .replace(/<[^>]+>/g, ' ')                          // Remove HTML tags
            .replace(/\s+/g, ' ')                              // Normalize whitespace
            .trim()
            .slice(0, 15000);

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        return {
            success: true,
            url,
            title,
            content: textContent,
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
        const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&stealth&blockAds`;
        browser = await puppeteer.connect({ browserWSEndpoint });

        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.setUserAgent(userAgent);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        });

        // Stealth settings
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // Wait for content to load (use setTimeout instead of deprecated waitForTimeout)
        await new Promise(r => setTimeout(r, randomDelay(1500, 3000)));

        const content = await page.evaluate(() => {
            document.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
            const main = document.querySelector('main, [role="main"], .content, article') || document.body;
            return main.innerText.slice(0, 15000);
        });

        const title = await page.title();

        return {
            success: true,
            url,
            title,
            content,
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
 * Use AI to extract property name and website from Google search results
 * @param {string} content - Scraped Google search results
 * @param {string} address - Property address
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Object>} Property name and website URL
 */
async function extractPropertyFromGoogle(content, address, apiKey) {
    const prompt = `From these Google search results, find the apartment complex at this address: "${address}"

Extract:
1. The official property/apartment name (NOT the address)
2. The property's own website URL (NOT aggregator sites like apartments.com, zillow, etc)

Search results:
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
        console.error('[AI Enrichment] Google extraction error:', error.message);
        return { property_name: null, website_url: null, confidence: 0 };
    }
}

/**
 * Main enrichment function - smart multi-step approach
 * Step 1: Google search to find property name + official website
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

    if (!openaiKey || !browserlessToken) {
        throw new Error('AI enrichment not configured. Add OPENAI_API_KEY and BROWSERLESS_TOKEN to environment.');
    }

    const address = property.street_address || property.address;
    const city = property.city || 'San Antonio';
    const state = property.state || 'TX';
    const zip_code = property.zip_code || '';
    const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;

    console.log(`[AI Enrichment] Starting smart enrichment for: ${fullAddress}`);

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
    // STEP 1: Google Search to find property name and website
    // ============================================================
    console.log('[AI Enrichment] Step 1: Google search for property...');

    const googleQuery = `${fullAddress} apartments leasing office`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

    const googleData = await scrapePage(googleUrl, browserlessToken);
    results.sources_checked.push({ source: 'google', url: googleUrl, success: googleData.success });

    if (!googleData.success) {
        results.errors.push(`Google search failed: ${googleData.error}`);
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Use AI to extract property name and website from Google results
    const googleExtract = await extractPropertyFromGoogle(googleData.content, fullAddress, openaiKey);
    console.log(`[AI Enrichment] Found property: ${googleExtract.property_name}, website: ${googleExtract.website_url}`);

    // Save property name suggestion if found
    if (googleExtract.property_name && dataAnalysis.missing.includes('name')) {
        results.suggestions.name = {
            value: googleExtract.property_name,
            confidence: googleExtract.confidence || 0.8,
            source: 'google',
            reason: 'Found via Google search'
        };
    }

    // ============================================================
    // STEP 2: Scrape property's own website (most accurate source)
    // ============================================================
    let propertyWebsiteData = null;

    if (googleExtract.website_url) {
        console.log(`[AI Enrichment] Step 2: Scraping property website: ${googleExtract.website_url}`);

        // Check if it's a skip domain
        const isSkipDomain = SKIP_DOMAINS.some(d => googleExtract.website_url.includes(d));

        if (!isSkipDomain) {
            propertyWebsiteData = await scrapePage(googleExtract.website_url, browserlessToken);
            results.sources_checked.push({
                source: 'property_website',
                url: googleExtract.website_url,
                success: propertyWebsiteData.success
            });

            if (propertyWebsiteData.success && dataAnalysis.missing.includes('leasing_link')) {
                results.suggestions.leasing_link = {
                    value: googleExtract.website_url,
                    confidence: 0.95,
                    source: 'google',
                    reason: 'Property official website'
                };
            }
        } else {
            console.log(`[AI Enrichment] Skipping aggregator domain: ${googleExtract.website_url}`);
        }
    }

    // ============================================================
    // STEP 3: AI extraction from best available content
    // ============================================================
    console.log('[AI Enrichment] Step 3: AI extraction of property details...');

    // Use property website content if available, otherwise use Google results
    const contentToAnalyze = propertyWebsiteData?.success
        ? propertyWebsiteData.content
        : googleData.content;
    const contentSource = propertyWebsiteData?.success
        ? 'property_website'
        : 'google';

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
${googleExtract.property_name ? `Known Name: ${googleExtract.property_name}` : ''}

Find these MISSING fields:
${missingFieldsList || 'None'}

Content from ${contentSource}:
---
${contentToAnalyze?.slice(0, 10000) || 'No content'}
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

