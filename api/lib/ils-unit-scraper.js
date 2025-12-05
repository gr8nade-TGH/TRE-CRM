// ILS (Internet Listing Service) Unit Scraper
// Deep scan for unit availability - tries property website first, then ILS sites
// Uses Browserless /function API with Puppeteer for interactive scraping

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const BROWSERLESS_BASE = 'https://chrome.browserless.io'; // Use main endpoint, not production-sfo

// ILS sites to search (as backup sources)
const ILS_SITES = [
    { name: 'apartments.com', searchPattern: 'site:apartments.com' },
    { name: 'zillow.com', searchPattern: 'site:zillow.com/b' },
    { name: 'rent.com', searchPattern: 'site:rent.com' }
];

/**
 * Search for property on ILS aggregator sites
 */
async function findILSListings(propertyName, city, state, serpApiKey) {
    const listings = [];

    for (const ils of ILS_SITES) {
        try {
            const query = `${ils.searchPattern} "${propertyName}" ${city} ${state}`;
            const params = new URLSearchParams({ engine: 'google', q: query, num: '3', api_key: serpApiKey });
            const resp = await fetch(`${SERPAPI_BASE}?${params}`);
            if (!resp.ok) continue;

            const data = await resp.json();
            for (const r of (data.organic_results || []).slice(0, 2)) {
                if (r.link && r.link.includes(ils.name.replace('.com', ''))) {
                    // Skip review/photo pages
                    if (!r.link.includes('/reviews') && !r.link.includes('/photos')) {
                        listings.push({ site: ils.name, url: r.link, title: r.title });
                        console.log(`[ILS] Found: ${ils.name} - ${r.link}`);
                        break; // One per site is enough
                    }
                }
            }
        } catch (e) {
            console.error(`[ILS] Search error ${ils.name}:`, e.message);
        }
    }
    return listings;
}

/**
 * Scrape a page using Browserless /function API with Puppeteer
 * This clicks on floor plan cards to expand them and reveal unit data
 * Same approach that works in smart-unit-search.js
 */
async function scrapePage(url, browserlessToken, siteName) {
    console.log(`[Deep Scan] Scraping ${siteName}: ${url}`);

    try {
        // Use /function API with custom Puppeteer code - this is what works!
        const response = await fetch(`${BROWSERLESS_BASE}/function?token=${browserlessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: `
                    module.exports = async ({ page }) => {
                        await page.goto('${url}', { waitUntil: 'networkidle2', timeout: 30000 });
                        await page.waitForTimeout(3000);

                        // Click on floor plan cards to expand them and reveal units
                        const clickSelectors = [
                            '.floor-plan-card', '.floorplan-card', '.fp-card',
                            '[class*="floor-plan"]', '[class*="floorplan"]', '[class*="FloorPlan"]',
                            '.pricingGridItem', '.unit-type', '.plan-item',
                            '[data-testid*="floorplan"]', '[data-testid*="floor-plan"]',
                            'button:has-text("View")', 'button:has-text("Details")', 'button:has-text("See Details")',
                            '.availability-button', '[class*="availability"]'
                        ];

                        for (const selector of clickSelectors) {
                            try {
                                const elements = await page.$$(selector);
                                for (let i = 0; i < Math.min(elements.length, 8); i++) {
                                    await elements[i].click().catch(() => {});
                                    await page.waitForTimeout(800);
                                }
                            } catch (e) {}
                        }

                        await page.waitForTimeout(2000);
                        return await page.content();
                    };
                `
            })
        });

        if (!response.ok) {
            console.log(`[Deep Scan] /function API returned ${response.status}`);
            return null;
        }

        const html = await response.text();
        if (html && html.length > 2000) {
            console.log(`[Deep Scan] Got ${html.length} chars from ${siteName}`);
            return html;
        }

        console.log(`[Deep Scan] Short/empty content from ${siteName}`);
        return null;

    } catch (e) {
        console.error(`[Deep Scan] Scrape error:`, e.message);
        return null;
    }
}

/**
 * Extract units from scraped HTML using AI
 */
async function extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, siteName) {
    if (!html || html.length < 500) return { units: [] };

    // Clean HTML - remove scripts/styles, keep text
    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 15000);

    const fpList = floorPlans.length > 0
        ? `Known floor plans: ${floorPlans.map(fp => `${fp.name}(${fp.beds}bd)`).join(', ')}`
        : '';

    const prompt = `Extract apartment units from "${propertyName}" page. ${fpList}

Look for: Unit numbers (101, #205, Apt 3B), rent ($1,250), beds/baths, sqft, availability dates.

Return ONLY JSON:
{"units":[{"unit_number":"101","beds":1,"baths":1,"sqft":750,"rent":1250,"available_from":"2025-01-15","floor_plan_name":"A1"}]}

Rules:
- unit_number must be specific apt number (not floor plan name)
- rent as number only (1250 not $1,250)
- available_from as YYYY-MM-DD or null
- If "3 units available" for a floor plan, create 3 entries like "FP-A1-1", "FP-A1-2", "FP-A1-3"
- Skip if no actual unit numbers or availability shown`;

    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: `${prompt}\n\nPage content:\n${text}` }],
                temperature: 0.1,
                max_tokens: 3000
            })
        });

        if (!resp.ok) return { units: [] };

        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            console.log(`[AI] Extracted ${parsed.units?.length || 0} units from ${siteName}`);
            return { units: parsed.units || [] };
        }
    } catch (e) {
        console.error('[AI] Error:', e.message);
    }
    return { units: [] };
}

function matchUnitsToFloorPlans(units, floorPlans) {
    return units.map(u => {
        let fp = u.floor_plan_name ? floorPlans.find(f => f.name.toLowerCase() === u.floor_plan_name.toLowerCase()) : null;
        if (!fp && u.beds !== undefined) fp = floorPlans.find(f => f.beds === u.beds && f.baths === u.baths);
        if (!fp && u.beds !== undefined) fp = floorPlans.find(f => f.beds === u.beds);
        return { ...u, floor_plan_id: fp?.id || null, floor_plan_name: fp?.name || u.floor_plan_name || `${u.beds}BR`, status: 'available', is_available: true, is_active: true };
    });
}

/**
 * Deep scan for unit availability
 * SIMPLIFIED STRATEGY - Property website FIRST, then ILS sites as backup
 *
 * 1. Scrape property website directly (most reliable - they WANT to show units)
 * 2. Try multiple pages: /floorplans, /floor-plans, /availability
 * 3. Use ILS sites (apartments.com, etc) only as backup
 * 4. Extract with AI
 */
export async function deepScanUnits({ propertyId, propertyName, city, state, floorPlans = [], leasingUrl = null }) {
    const serpApiKey = process.env.SERP_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`[Deep Scan] ${propertyName}`);
    console.log(`[Deep Scan] Leasing URL: ${leasingUrl || 'none'}`);
    console.log(`${'='.repeat(50)}`);

    const results = { propertyId, units: [], newFloorPlans: [], sources: [], errors: [] };

    if (!browserlessToken || !openaiKey) {
        results.errors.push('Missing BROWSERLESS_TOKEN or OPENAI_API_KEY');
        return results;
    }

    // ============ STEP 1: PROPERTY WEBSITE FIRST (most reliable) ============
    if (leasingUrl) {
        console.log(`\n[Step 1] 🏠 Scraping property website...`);

        // Build list of URLs to try
        const baseUrl = leasingUrl.replace(/\/$/, '');
        const urlsToTry = [
            baseUrl + '/floorplans',
            baseUrl + '/floor-plans',
            baseUrl + '/availability',
            baseUrl + '/units',
            leasingUrl
        ];

        for (const url of urlsToTry) {
            console.log(`[Step 1] Trying: ${url}`);
            const html = await scrapePage(url, browserlessToken, 'property-website');

            if (html && html.length > 3000) {
                // Check if it looks like it has unit data
                const hasUnitData = /unit|apt|#\s*\d+|available|move.?in|bedroom|bath/i.test(html);
                if (hasUnitData) {
                    console.log(`[Step 1] ✅ Got ${html.length} chars with unit-like content`);

                    const extracted = await extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, 'property-website');
                    if (extracted.units?.length > 0) {
                        const matchedUnits = matchUnitsToFloorPlans(extracted.units, floorPlans);
                        results.units.push(...matchedUnits);
                        results.sources.push('property-website');
                        console.log(`[Step 1] 🎉 Extracted ${matchedUnits.length} units from property website!`);
                        break; // Got units, no need to try more URLs
                    }
                }
            }
        }
    }

    // ============ STEP 2: ILS SITES AS BACKUP ============
    if (results.units.length === 0 && serpApiKey) {
        console.log(`\n[Step 2] 🔍 Searching ILS sites (backup)...`);

        const listings = await findILSListings(propertyName, city, state || 'TX', serpApiKey);

        if (listings.length > 0) {
            for (const listing of listings.slice(0, 2)) { // Max 2 ILS sites
                console.log(`[Step 2] Trying ${listing.site}: ${listing.url}`);

                // Small delay between ILS requests
                await new Promise(r => setTimeout(r, 1500));

                const html = await scrapePage(listing.url, browserlessToken, listing.site);

                if (html && html.length > 3000) {
                    const extracted = await extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, listing.site);
                    if (extracted.units?.length > 0) {
                        const matchedUnits = matchUnitsToFloorPlans(extracted.units, floorPlans);
                        results.units.push(...matchedUnits);
                        results.sources.push(listing.site);
                        console.log(`[Step 2] ✅ Got ${matchedUnits.length} units from ${listing.site}`);
                        break; // Got units, done
                    }
                }
            }
        } else {
            console.log(`[Step 2] No ILS listings found for "${propertyName}"`);
        }
    }

    // ============ DEDUPLICATE & SORT ============
    const seen = new Set();
    results.units = results.units.filter(u => {
        const key = `${u.unit_number}-${u.beds}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    results.units.sort((a, b) => {
        const numA = parseInt(a.unit_number) || 0;
        const numB = parseInt(b.unit_number) || 0;
        return numA - numB;
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`[Deep Scan Complete] ${results.units.length} units from: ${results.sources.join(', ') || 'none'}`);
    console.log(`${'='.repeat(50)}\n`);

    return results;
}
