// ILS (Internet Listing Service) Unit Scraper
// Scrapes unit availability from apartments.com, zillow, rent.com
// Uses Browserless /unblock API for bot detection bypass

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const BROWSERLESS_BASE = 'https://production-sfo.browserless.io';

const ILS_SITES = [
    { name: 'apartments.com', searchPattern: 'site:apartments.com' },
    { name: 'zillow.com', searchPattern: 'site:zillow.com/b' },
    { name: 'rent.com', searchPattern: 'site:rent.com' }
];

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
                    listings.push({ site: ils.name, url: r.link, title: r.title });
                }
            }
        } catch (e) { console.error(`[ILS] Search error ${ils.name}:`, e.message); }
    }
    console.log(`[ILS] Found ${listings.length} listings`);
    return listings;
}

/**
 * Scrape ILS page using Browserless /unblock API
 * This API is specifically designed to bypass bot detection (Datadome, CAPTCHAs)
 * and works best with residential proxies
 */
async function scrapeILSPage(url, browserlessToken, siteName) {
    console.log(`[ILS] Scraping ${siteName}: ${url}`);

    try {
        // Use /unblock API with content: true to get HTML after bypassing bot detection
        // This is the recommended approach for sites with bot protection
        const resp = await fetch(`${BROWSERLESS_BASE}/unblock?token=${browserlessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                content: true,           // Return HTML content
                cookies: false,           // Don't need cookies
                screenshot: false,        // Don't need screenshot
                browserWSEndpoint: false, // Don't need WebSocket
                // Wait for dynamic content to load
                waitForTimeout: 3000,
                // Navigation options
                gotoOptions: {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                }
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[ILS] Unblock API error (${resp.status}):`, errText.slice(0, 200));
            return null;
        }

        const data = await resp.json();

        // /unblock returns { content: "<!DOCTYPE html>...", cookies: [], ... }
        if (data.content && data.content.length > 1000) {
            console.log(`[ILS] Got ${data.content.length} chars from ${siteName}`);
            return data.content;
        }

        console.log(`[ILS] Empty or short content from ${siteName}`);
        return null;

    } catch (e) {
        console.error(`[ILS] Scrape error:`, e.message);
        return null;
    }
}

/**
 * Alternative: Use /content API for simpler sites without heavy bot detection
 * Falls back to this if /unblock fails
 */
async function scrapeWithContentAPI(url, browserlessToken, siteName) {
    console.log(`[ILS] Fallback to /content API for ${siteName}`);

    try {
        const resp = await fetch(`${BROWSERLESS_BASE}/content?token=${browserlessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                waitForTimeout: 2000,
                gotoOptions: {
                    waitUntil: 'networkidle2',
                    timeout: 25000
                }
            })
        });

        if (!resp.ok) return null;

        // /content returns raw HTML as text/html
        const html = await resp.text();
        if (html && html.length > 1000) {
            console.log(`[ILS] Content API got ${html.length} chars`);
            return html;
        }
        return null;

    } catch (e) {
        console.error(`[ILS] Content API error:`, e.message);
        return null;
    }
}

async function extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, siteName) {
    if (!html || html.length < 1000) return { units: [], floorPlans: [] };
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 15000);
    const fpCtx = floorPlans.length > 0 ? `\nFLOOR PLANS:\n${floorPlans.map(fp => `- "${fp.name}": ${fp.beds}bd/${fp.baths}ba`).join('\n')}` : '';
    const prompt = `Extract units from ${siteName} for "${propertyName}".${fpCtx}
Return JSON: {"units":[{"unit_number":"101","beds":1,"baths":1,"sqft":750,"rent":1250,"available_from":"2025-01-15","floor_plan_name":"A1"}]}
Rules: unit_number=specific apt#, available_from=YYYY-MM-DD or null, skip if no unit numbers shown`;
    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: prompt }, { role: 'user', content: text }], temperature: 0.2, max_tokens: 2000 })
        });
        if (!resp.ok) return { units: [], floorPlans: [] };
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) { const p = JSON.parse(match[0]); return { units: p.units || [], floorPlans: p.newFloorPlans || [] }; }
    } catch (e) { console.error('[ILS AI] Error:', e.message); }
    return { units: [], floorPlans: [] };
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
 * Deep scan for unit availability using ILS aggregator sites
 * Strategy:
 * 1. Search apartments.com, zillow, rent.com for the property using SerpAPI
 * 2. Use Browserless /unblock API to bypass bot detection and get HTML
 * 3. Fall back to /content API if /unblock fails
 * 4. Use AI to extract unit-level data from the HTML
 * 5. Match units to existing floor plans
 */
export async function deepScanUnits({ propertyId, propertyName, city, state, floorPlans = [], leasingUrl = null }) {
    const serpApiKey = process.env.SERP_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    console.log(`\n[ILS Deep Scan] ${propertyName} (${floorPlans.length} floor plans)`);
    const results = { propertyId, units: [], newFloorPlans: [], sources: [], errors: [] };

    if (!serpApiKey || !browserlessToken || !openaiKey) {
        results.errors.push('Missing API keys');
        return results;
    }

    // Step 1: Find property listings on ILS sites
    const listings = await findILSListings(propertyName, city, state || 'TX', serpApiKey);

    // Add direct property URL as fallback if no ILS listings found
    if (listings.length === 0 && leasingUrl) {
        listings.push({ site: 'direct', url: leasingUrl, title: propertyName });
    }

    if (listings.length === 0) {
        results.errors.push('No ILS listings found');
        return results;
    }

    // Step 2: Scrape each listing (max 3) with delays to avoid rate limiting
    for (let i = 0; i < Math.min(listings.length, 3); i++) {
        // Random delay between requests (2-5 seconds)
        if (i > 0) {
            const delay = 2000 + Math.random() * 3000;
            console.log(`[ILS] Waiting ${Math.round(delay / 1000)}s before next request...`);
            await new Promise(r => setTimeout(r, delay));
        }

        const listing = listings[i];

        // Try /unblock API first (best for bot-protected sites)
        let html = await scrapeILSPage(listing.url, browserlessToken, listing.site);

        // Fall back to /content API if /unblock fails
        if (!html || html.length < 2000) {
            console.log(`[ILS] /unblock returned insufficient content, trying /content API...`);
            html = await scrapeWithContentAPI(listing.url, browserlessToken, listing.site);
        }

        if (html && html.length > 2000) {
            // Step 3: Extract units using AI
            const extracted = await extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, listing.site);

            if (extracted.units.length > 0) {
                // Step 4: Match units to floor plans
                const matchedUnits = matchUnitsToFloorPlans(extracted.units, floorPlans);
                results.units.push(...matchedUnits);
                results.sources.push(listing.site);
                console.log(`[ILS] Extracted ${matchedUnits.length} units from ${listing.site}`);
            }

            if (extracted.floorPlans.length > 0) {
                results.newFloorPlans.push(...extracted.floorPlans);
            }

            // Stop if we have enough units
            if (results.units.length >= 10) break;
        } else {
            results.errors.push(`Failed to scrape ${listing.site}`);
        }
    }

    // Step 5: Deduplicate units by unit_number + beds
    const seen = new Set();
    results.units = results.units.filter(u => {
        const key = `${u.unit_number}-${u.beds}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log(`[ILS Complete] ${results.units.length} units from: ${results.sources.join(', ') || 'none'}`);
    return results;
}

