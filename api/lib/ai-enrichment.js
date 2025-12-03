/**
 * AI Property Enrichment Service
 *
 * Uses OpenAI GPT-4 with function calling to search the web via Browserless.io
 * and extract property information from real estate websites.
 *
 * @module lib/ai-enrichment
 */

import puppeteer from 'puppeteer-core';

// Configuration
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// Rotating user agents to avoid detection
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// Random viewport sizes to look more human
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 }
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
 * Scrape a webpage using Browserless.io with stealth mode
 * @param {string} url - URL to scrape
 * @param {string} browserlessToken - Browserless API token
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Page content and metadata
 */
async function scrapePage(url, browserlessToken, retryCount = 0) {
    console.log(`[AI Enrichment] Scraping: ${url} (attempt ${retryCount + 1})`);

    let browser;
    const userAgent = randomChoice(USER_AGENTS);
    const viewport = randomChoice(VIEWPORTS);

    try {
        // Enable stealth mode and block tracking scripts
        const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&stealth&blockAds`;
        browser = await puppeteer.connect({ browserWSEndpoint });

        const page = await browser.newPage();

        // Set random viewport to look more human
        await page.setViewport(viewport);

        // Set realistic user agent
        await page.setUserAgent(userAgent);

        // Set extra headers to appear more legitimate
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        });

        // Override navigator properties to avoid detection
        await page.evaluateOnNewDocument(() => {
            // Hide webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Fake plugins
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            // Fake languages
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            // Hide automation
            window.chrome = { runtime: {} };
        });

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });

        // Random delay to appear human (1-3 seconds)
        await page.waitForTimeout(randomDelay(1000, 3000));

        // Check for blocked/captcha pages
        const pageContent = await page.content();
        if (pageContent.includes('captcha') || pageContent.includes('blocked') || pageContent.includes('Access Denied')) {
            throw new Error('Page appears blocked or has captcha');
        }

        // Extract text content
        const content = await page.evaluate(() => {
            // Remove scripts, styles, and nav elements
            const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, aside, [role="navigation"]');
            elementsToRemove.forEach(el => el.remove());

            // Get main content
            const main = document.querySelector('main, [role="main"], .content, #content, article') || document.body;
            return main.innerText.slice(0, 15000); // Limit to 15k chars
        });

        // Get page title
        const title = await page.title();

        // Take screenshot for review (optional)
        const screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'jpeg',
            quality: 50,
            fullPage: false
        });

        return {
            success: true,
            url,
            title,
            content,
            screenshot: `data:image/jpeg;base64,${screenshot}`,
            userAgent,
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error(`[AI Enrichment] Scrape error for ${url}:`, error.message);

        // Retry with different user agent if blocked (max 2 retries)
        if (retryCount < 2 && (error.message.includes('blocked') || error.message.includes('captcha') || error.message.includes('timeout'))) {
            console.log(`[AI Enrichment] Retrying with different user agent...`);
            if (browser) await browser.close();
            await new Promise(r => setTimeout(r, randomDelay(2000, 4000))); // Wait before retry
            return scrapePage(url, browserlessToken, retryCount + 1);
        }

        return {
            success: false,
            url,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
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
 * Main enrichment function - orchestrates the search and extraction
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

    console.log(`[AI Enrichment] Starting enrichment for: ${fullAddress}`);

    // Analyze what data is missing vs existing
    const dataAnalysis = analyzePropertyData(property);
    console.log(`[AI Enrichment] Missing fields: ${dataAnalysis.missing.join(', ')}`);
    console.log(`[AI Enrichment] Fields to verify: ${dataAnalysis.needsVerification.join(', ')}`);

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

    // Step 1: Search apartments.com first (most reliable for apartments)
    const apartmentsUrl = `https://www.apartments.com/${city.toLowerCase().replace(/ /g, '-')}-${state.toLowerCase()}/?sk=${encodeURIComponent(address)}`;

    let scrapedData = await scrapePage(apartmentsUrl, browserlessToken);
    results.sources_checked.push({ source: 'apartments.com', url: apartmentsUrl, success: scrapedData.success });

    if (!scrapedData.success) {
        results.errors.push(`Failed to scrape apartments.com: ${scrapedData.error}`);
        // Try Google as fallback
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(fullAddress + ' apartment complex leasing office phone')}`;
        const googleData = await scrapePage(googleUrl, browserlessToken);
        results.sources_checked.push({ source: 'google', url: googleUrl, success: googleData.success });

        if (googleData.success) {
            scrapedData = googleData;
        }
    }

    if (!scrapedData.success) {
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Step 2: Build smart prompt based on what's missing
    const missingFieldsList = dataAnalysis.missing.map(f => {
        const fieldInfo = ENRICHABLE_FIELDS[f];
        return `- ${f}: ${fieldInfo?.description || f}`;
    }).join('\n');

    const existingDataList = Object.entries(dataAnalysis.existing).map(([k, v]) => {
        return `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`;
    }).join('\n');

    const verifyFieldsList = dataAnalysis.needsVerification.map(f => {
        return `- ${f}: Currently "${dataAnalysis.existing[f]}" - verify if correct`;
    }).join('\n');

    const systemPrompt = `You are a real estate data extraction specialist. Your job is to:
1. Find MISSING data fields from the webpage
2. VERIFY existing data is still accurate
3. Extract contact information (phone, email, contact name) - this is CRITICAL for agent follow-up

Always respond with valid JSON containing:
{
    "extracted": {
        "property_name": "Official apartment complex name (not address)",
        "contact_phone": "Leasing office phone in format (XXX) XXX-XXXX",
        "contact_email": "Leasing office email",
        "contact_name": "Leasing agent or office manager name",
        "amenities": ["Array", "of", "amenities"],
        "leasing_url": "URL to apply or schedule tour",
        "management_company": "Property management company name"
    },
    "verifications": {
        "field_name": { "current_correct": true/false, "suggested_value": "if different" }
    },
    "confidence": 0.0-1.0
}

Set fields to null if not found. Be conservative - only extract if confident.
PRIORITIZE finding contact_phone - agents need this to confirm manually.`;

    const userPrompt = `Extract and verify property information for:
ADDRESS: ${fullAddress}

MISSING DATA (find these):
${missingFieldsList || 'None - all fields have data'}

EXISTING DATA:
${existingDataList || 'None'}

DATA TO VERIFY:
${verifyFieldsList || 'None'}

WEBPAGE CONTENT:
---
${scrapedData.content?.slice(0, 12000) || 'No content available'}
---

Focus on finding the property name and contact phone number.
Return JSON only.`;

    try {
        const extraction = await callOpenAI(systemPrompt, userPrompt, openaiKey);
        const source = scrapedData.url?.includes('apartments.com') ? 'apartments.com' : 'google';

        // Process extracted data for missing fields
        if (extraction.extracted) {
            const ext = extraction.extracted;

            if (ext.property_name && dataAnalysis.missing.includes('name')) {
                results.suggestions.name = {
                    value: ext.property_name,
                    confidence: extraction.confidence || 0.8,
                    source,
                    reason: 'Missing - found in search'
                };
            }

            if (ext.contact_phone) {
                results.suggestions.contact_phone = {
                    value: ext.contact_phone,
                    confidence: 0.9,
                    source,
                    reason: dataAnalysis.missing.includes('contact_phone') ? 'Missing - found in search' : 'Found - may be updated'
                };
            }

            if (ext.contact_email) {
                results.suggestions.contact_email = {
                    value: ext.contact_email,
                    confidence: 0.85,
                    source,
                    reason: dataAnalysis.missing.includes('contact_email') ? 'Missing - found in search' : 'Found - may be updated'
                };
            }

            if (ext.contact_name) {
                results.suggestions.contact_name = {
                    value: ext.contact_name,
                    confidence: 0.75,
                    source,
                    reason: 'Found leasing contact name'
                };
            }

            if (ext.amenities && Array.isArray(ext.amenities) && ext.amenities.length > 0 && dataAnalysis.missing.includes('amenities')) {
                results.suggestions.amenities = {
                    value: ext.amenities,
                    confidence: extraction.confidence || 0.7,
                    source,
                    reason: 'Missing - found in search'
                };
            }

            if (ext.leasing_url && dataAnalysis.missing.includes('leasing_link')) {
                results.suggestions.leasing_link = {
                    value: ext.leasing_url,
                    confidence: 0.9,
                    source,
                    reason: 'Missing - found in search'
                };
            }

            if (ext.management_company && dataAnalysis.missing.includes('management_company')) {
                results.suggestions.management_company = {
                    value: ext.management_company,
                    confidence: 0.75,
                    source,
                    reason: 'Missing - found in search'
                };
            }
        }

        // Process verifications for existing data
        if (extraction.verifications) {
            for (const [field, verification] of Object.entries(extraction.verifications)) {
                if (!verification.current_correct && verification.suggested_value) {
                    results.verifications[field] = {
                        current: dataAnalysis.existing[field],
                        suggested: verification.suggested_value,
                        source,
                        reason: 'Existing data may be outdated'
                    };
                }
            }
        }

        // Store screenshot for review
        if (scrapedData.screenshot) {
            results.screenshot = scrapedData.screenshot;
        }

    } catch (error) {
        console.error('[AI Enrichment] OpenAI extraction error:', error);
        results.errors.push(`AI extraction failed: ${error.message}`);
    }

    results.completed_at = new Date().toISOString();
    return results;
}

export default {
    checkConfiguration,
    enrichProperty,
    analyzePropertyData
};

