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
const SEARCH_SOURCES = [
    { name: 'apartments.com', priority: 1, searchUrl: (addr) => `https://www.apartments.com/san-antonio-tx/?sk=${encodeURIComponent(addr)}` },
    { name: 'zillow', priority: 2, searchUrl: (addr) => `https://www.zillow.com/homes/${encodeURIComponent(addr.replace(/,/g, '').replace(/ /g, '-'))}_rb/` },
    { name: 'google', priority: 3, searchUrl: (addr) => `https://www.google.com/search?q=${encodeURIComponent(addr + ' apartments')}` }
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
 * Scrape a webpage using Browserless.io
 * @param {string} url - URL to scrape
 * @param {string} browserlessToken - Browserless API token
 * @returns {Promise<Object>} Page content and metadata
 */
async function scrapePage(url, browserlessToken) {
    console.log(`[AI Enrichment] Scraping: ${url}`);

    let browser;
    try {
        const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}`;
        browser = await puppeteer.connect({ browserWSEndpoint });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);

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
            scrapedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error(`[AI Enrichment] Scrape error for ${url}:`, error.message);
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

    const { address, city, state, zip_code, coordinates } = property;
    const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;

    console.log(`[AI Enrichment] Starting enrichment for: ${fullAddress}`);

    const results = {
        property_id: property.id,
        address: fullAddress,
        suggestions: {},
        sources_checked: [],
        errors: [],
        started_at: new Date().toISOString()
    };

    // Step 1: Search apartments.com first (most reliable for apartments)
    const apartmentsUrl = `https://www.apartments.com/${city.toLowerCase().replace(/ /g, '-')}-${state.toLowerCase()}/?sk=${encodeURIComponent(address)}`;

    const scrapedData = await scrapePage(apartmentsUrl, browserlessToken);
    results.sources_checked.push({ source: 'apartments.com', url: apartmentsUrl, success: scrapedData.success });

    if (!scrapedData.success) {
        results.errors.push(`Failed to scrape apartments.com: ${scrapedData.error}`);
        // Try Google as fallback
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(fullAddress + ' apartment complex name')}`;
        const googleData = await scrapePage(googleUrl, browserlessToken);
        results.sources_checked.push({ source: 'google', url: googleUrl, success: googleData.success });

        if (googleData.success) {
            scrapedData.content = googleData.content;
            scrapedData.success = true;
        }
    }

    if (!scrapedData.success) {
        results.completed_at = new Date().toISOString();
        return results;
    }

    // Step 2: Use AI to extract property information
    const systemPrompt = `You are a real estate data extraction specialist. Extract property information from webpage content.
Always respond with valid JSON containing these fields:
- property_name: The official name of the apartment complex (not the address)
- amenities: Array of amenities mentioned
- contact_phone: Leasing office phone number
- contact_email: Leasing office email (if found)
- leasing_url: Link to the property's leasing page
- management_company: Name of the property management company
- year_built: Year the property was built (if mentioned)
- total_units: Total number of units (if mentioned)
- confidence: Your confidence level (0-1) in the extracted data

For each field, set to null if not found. Be conservative - only extract if confident.`;

    const userPrompt = `Extract property information for the apartment at this address:
${fullAddress}

Here is the webpage content:
---
${scrapedData.content?.slice(0, 10000) || 'No content available'}
---

Look for the official property name (like "Indigo Apartments", "The Reserve at...", etc.), not the street address.
If you find amenities, list them as an array.
Return JSON only.`;

    try {
        const extraction = await callOpenAI(systemPrompt, userPrompt, openaiKey);

        // Build suggestions with confidence scores
        if (extraction.property_name && extraction.property_name !== address) {
            results.suggestions.name = {
                value: extraction.property_name,
                confidence: extraction.confidence || 0.8,
                source: 'apartments.com'
            };
        }

        if (extraction.amenities && Array.isArray(extraction.amenities) && extraction.amenities.length > 0) {
            results.suggestions.amenities = {
                value: extraction.amenities,
                confidence: extraction.confidence || 0.7,
                source: 'apartments.com'
            };
        }

        if (extraction.contact_phone) {
            results.suggestions.contact_phone = {
                value: extraction.contact_phone,
                confidence: 0.85,
                source: 'apartments.com'
            };
        }

        if (extraction.contact_email) {
            results.suggestions.contact_email = {
                value: extraction.contact_email,
                confidence: 0.85,
                source: 'apartments.com'
            };
        }

        if (extraction.leasing_url) {
            results.suggestions.leasing_link = {
                value: extraction.leasing_url,
                confidence: 0.9,
                source: 'apartments.com'
            };
        }

        if (extraction.management_company) {
            results.suggestions.management_company = {
                value: extraction.management_company,
                confidence: 0.75,
                source: 'apartments.com'
            };
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
    enrichProperty
};

