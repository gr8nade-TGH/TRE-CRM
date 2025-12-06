// Auto Unit Scanner API - Enhanced with domain tracking and never-disable logic
import { createClient } from '@supabase/supabase-js';

const BROWSERLESS_BASE = 'https://production-sfo.browserless.io';
const SERPAPI_BASE = 'https://serpapi.com/search.json';

// Scan methods - property methods first (most reliable), then ILS backup
const SCAN_METHODS = [
    { id: 'property-base', path: '', type: 'property', label: 'Property Homepage' },
    { id: 'property-floorplans', path: '/floorplans', type: 'property', label: 'Property /floorplans' },
    { id: 'property-floor-plans', path: '/floor-plans', type: 'property', label: 'Property /floor-plans' },
    { id: 'property-availability', path: '/availability', type: 'property', label: 'Property /availability' },
    { id: 'apartments.com', type: 'ils', searchPattern: 'site:apartments.com', label: 'Apartments.com' },
    { id: 'zillow.com', type: 'ils', searchPattern: 'site:zillow.com/b', label: 'Zillow.com' },
    { id: 'rent.com', type: 'ils', searchPattern: 'site:rent.com', label: 'Rent.com' }
];

// Scrape a page with Browserless /function API (V2 format)
async function scrapePage(url, browserlessToken) {
    console.log(`[scrapePage] Fetching: ${url}`);
    try {
        // Escape URL for use in JavaScript code
        const escapedUrl = url.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

        // V2 Browserless API format - use export default and return { data, type }
        // Note: page.waitForTimeout is deprecated, use Promise-based delay instead
        const code = `
export default async function ({ page }) {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    try {
        await page.goto("${escapedUrl}", {
            waitUntil: 'networkidle2',
            timeout: 45000
        });
    } catch (navError) {
        await page.goto("${escapedUrl}", {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });
    }

    await delay(3000);

    // Scroll to trigger lazy loading
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await delay(1000);
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(2000);

    // Click on various floor plan/unit elements to expand
    const expandSelectors = [
        '.floor-plan-card', '[class*="floor-plan"]', '[class*="floorplan"]',
        '.pricingGridItem', '[data-testid*="floorplan"]', '[data-testid*="unit"]',
        '.availability-card', '.unit-card', '[class*="unit-row"]',
        '.pricing-card', '[class*="pricing"]', 'button[class*="view"]',
        '[class*="expand"]', '[class*="details"]', '.accordion-header'
    ];

    for (const sel of expandSelectors) {
        try {
            const els = await page.$$(sel);
            for (let i = 0; i < Math.min(els.length, 8); i++) {
                await els[i].click().catch(() => {});
                await delay(300);
            }
        } catch (e) {}
    }

    await delay(1500);

    const content = await page.content();
    const finalUrl = page.url();

    return {
        data: { html: content, finalUrl: finalUrl },
        type: "application/json"
    };
}
`;

        const response = await fetch(`${BROWSERLESS_BASE}/function?token=${browserlessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/javascript' },
            body: code
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[scrapePage] Browserless error ${response.status}:`, errText.slice(0, 500));
            // Return more details about the error
            return { html: null, finalUrl: url, error: `HTTP ${response.status}`, browserlessError: errText.slice(0, 500) };
        }

        const text = await response.text();
        console.log(`[scrapePage] Raw response (first 200 chars): ${text?.slice(0, 200)}`);

        try {
            const parsed = JSON.parse(text);
            // V2 format returns { data: { html, finalUrl }, type: "..." }
            const html = parsed.data?.html || parsed.html;
            const finalUrl = parsed.data?.finalUrl || parsed.finalUrl || url;

            console.log(`[scrapePage] Got ${html?.length || 0} chars from ${finalUrl}`);

            if (!html || html.length <= 1000) {
                return {
                    html: null,
                    finalUrl,
                    error: `Page too short (${html?.length || 0} chars)`
                };
            }

            return { html, finalUrl, error: null };
        } catch (e) {
            console.error('[scrapePage] JSON parse error:', e.message, 'Raw:', text?.slice(0, 300));
            // Might be raw HTML (old format)
            return {
                html: text?.length > 1000 ? text : null,
                finalUrl: url,
                error: text?.length <= 1000 ? `Page too short (${text?.length || 0} chars)` : null
            };
        }
    } catch (e) {
        console.error('[scrapePage] Error:', e.message);
        return { html: null, finalUrl: url, error: e.message };
    }
}

// Extract units from HTML using AI - RELAXED prompt that accepts floor plan data
async function extractUnits(html, propertyName, openaiKey) {
    if (!html || html.length < 500) {
        console.log(`[extractUnits] HTML too short: ${html?.length || 0} chars`);
        return { units: [], rawResponse: null, error: 'HTML too short' };
    }

    // Clean HTML to text
    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20000);

    console.log(`[extractUnits] Sending ${text.length} chars to OpenAI for "${propertyName}"`);

    const prompt = `You are extracting apartment availability data from a property website.

PROPERTY: "${propertyName}"

Extract ALL available units. Look for:
- Floor plan names/types (like "A1", "1BR Deluxe", "The Austin")
- Bedroom/bathroom counts
- Square footage
- Monthly rent prices (take the lowest if a range like "$1,200 - $1,400")
- Move-in/availability dates ("Available Now" = today's date, "January" = 2025-01-01)
- Number of units available (like "3 available", "5 units")

CRITICAL RULES:
1. If you find a floor plan with rent + availability, CREATE UNITS for it
2. If it says "3 available" or "3 units" for a floor plan, create 3 separate unit entries
3. Generate unit_number as sequential IDs: "101", "102", "103", etc.
4. Rent should be a NUMBER only (no $ or commas) - use the LOWEST price if range shown
5. Dates as YYYY-MM-DD format. Use 2025-01-01 for "January", 2025-02-01 for "February", etc.
6. "Available Now" or "Immediate" = "${new Date().toISOString().split('T')[0]}"
7. If availability count not specified but floor plan is shown as available, assume 1 unit
8. Maximum 20 units total to avoid duplicates

EXAMPLE: If page shows "The Marina - 1BR/1BA - 650 sqft - $1,195 - 4 Available"
Create 4 units: 101, 102, 103, 104 all with that floor plan data.

Return ONLY valid JSON:
{"units":[{"unit_number":"101","beds":1,"baths":1,"sqft":650,"rent":1195,"available_from":"2025-01-15","floor_plan_name":"The Marina"}],"found_any_unit_data":true,"floor_plans_found":3}

If NO pricing or availability data found at all:
{"units":[],"found_any_unit_data":false,"reason":"No pricing or availability shown"}`;

    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: `${prompt}\n\n---PAGE CONTENT---\n${text}` }],
                temperature: 0.1,
                max_tokens: 4000
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[extractUnits] OpenAI error ${resp.status}:`, errText.slice(0, 200));
            return { units: [], rawResponse: null, error: `OpenAI ${resp.status}` };
        }

        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        console.log(`[extractUnits] OpenAI response: ${content?.slice(0, 300)}`);

        const match = content?.match(/\{[\s\S]*\}/);
        if (!match) {
            return { units: [], rawResponse: content, error: 'No JSON in response' };
        }

        const parsed = JSON.parse(match[0]);
        return {
            units: parsed.units || [],
            rawResponse: content,
            foundAnyData: parsed.found_any_unit_data,
            reason: parsed.reason
        };
    } catch (e) {
        console.error(`[extractUnits] Error:`, e.message);
        return { units: [], rawResponse: null, error: e.message };
    }
}

// Scan a property website URL - returns detailed result
async function scanPropertyUrl(url, prop) {
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    console.log(`[Auto-Scan] Scraping property URL: ${url}`);
    const scrapeResult = await scrapePage(url, browserlessToken);

    if (!scrapeResult.html) {
        return {
            units: [],
            sources: [],
            errors: [scrapeResult.error || 'Failed to scrape page'],
            debug: { url, scrapeError: scrapeResult.error, browserlessError: scrapeResult.browserlessError }
        };
    }

    const extractResult = await extractUnits(scrapeResult.html, prop.community_name, openaiKey);

    return {
        units: extractResult.units.map(u => ({ ...u, status: 'available', is_available: true, is_active: true })),
        sources: extractResult.units.length > 0 ? [new URL(url).hostname] : [],
        errors: extractResult.error ? [extractResult.error] : [],
        debug: {
            url,
            finalUrl: scrapeResult.finalUrl,
            htmlLength: scrapeResult.html.length,
            aiFoundData: extractResult.foundAnyData,
            aiReason: extractResult.reason,
            rawResponse: extractResult.rawResponse?.slice(0, 500)
        }
    };
}

// Scan ILS site (apartments.com, zillow, rent.com) - returns detailed result
async function scanILSSite(ilsSite, prop) {
    const serpApiKey = process.env.SERP_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!serpApiKey) {
        return { units: [], sources: [], errors: ['Missing SERP_API_KEY'], debug: { error: 'No SerpAPI key' } };
    }

    const methodConfig = SCAN_METHODS.find(m => m.id === ilsSite);
    const query = `${methodConfig?.searchPattern || 'site:' + ilsSite} "${prop.community_name}" ${prop.city || ''} ${prop.state || ''}`.trim();

    console.log(`[Auto-Scan] Searching ${ilsSite}: ${query}`);

    try {
        // Search for listing
        const searchResp = await fetch(`${SERPAPI_BASE}?${new URLSearchParams({ engine: 'google', q: query, num: '5', api_key: serpApiKey })}`);
        const searchData = await searchResp.json();

        console.log(`[Auto-Scan] SerpAPI returned ${searchData.organic_results?.length || 0} results`);

        const result = searchData.organic_results?.find(r =>
            r.link?.includes(ilsSite.replace('.com', '')) &&
            !r.link?.includes('/reviews') &&
            !r.link?.includes('/photos') &&
            !r.link?.includes('/ratings')
        );

        if (!result?.link) {
            return {
                units: [],
                sources: [],
                errors: [`No ${ilsSite} listing found`],
                debug: { query, serpResults: searchData.organic_results?.map(r => r.link)?.slice(0, 5) }
            };
        }

        console.log(`[Auto-Scan] Found listing: ${result.link}`);

        // Scrape the listing
        const scrapeResult = await scrapePage(result.link, browserlessToken);
        if (!scrapeResult.html) {
            return {
                units: [],
                sources: [],
                errors: [scrapeResult.error || 'Failed to scrape ILS page'],
                debug: { listingUrl: result.link, scrapeError: scrapeResult.error, browserlessError: scrapeResult.browserlessError }
            };
        }

        const extractResult = await extractUnits(scrapeResult.html, prop.community_name, openaiKey);
        return {
            units: extractResult.units.map(u => ({ ...u, status: 'available', is_available: true, is_active: true })),
            sources: extractResult.units.length > 0 ? [ilsSite] : [],
            errors: extractResult.error ? [extractResult.error] : [],
            debug: {
                listingUrl: result.link,
                htmlLength: scrapeResult.html.length,
                aiFoundData: extractResult.foundAnyData,
                aiReason: extractResult.reason
            }
        };
    } catch (e) {
        console.error(`[scanILSSite] Error:`, e);
        return { units: [], sources: [], errors: [e.message], debug: { exception: e.message } };
    }
}

// NEVER fully disable - just heavily deprioritize failing methods
const MIN_SAMPLE_SIZE = 10;  // Need more samples before making decisions
const LOW_PRIORITY_THRESHOLD = 10; // Methods below 10% get low priority but still run

export default async function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET - Get scan status, method stats, and next property
    if (req.method === 'GET') {
        try {
            // Get properties with leasing URLs
            const { data: properties } = await supabase
                .from('properties')
                .select('id, community_name, leasing_link, city, state')
                .not('leasing_link', 'is', null)
                .neq('leasing_link', '');

            // Get ALL scan history
            const { data: history } = await supabase
                .from('unit_scan_history')
                .select('property_id, scan_method, success, units_found, scanned_at')
                .order('scanned_at', { ascending: false });

            // ========== CALCULATE METHOD PERFORMANCE ==========
            const methodStats = {};
            for (const m of SCAN_METHODS) {
                methodStats[m.id] = {
                    method: m.id,
                    type: m.type,
                    attempts: 0,
                    successes: 0,
                    totalUnitsFound: 0,
                    successRate: 0,
                    avgUnitsPerSuccess: 0,
                    status: 'active', // 'active', 'learning', 'disabled'
                    lastUsed: null
                };
            }

            for (const h of history || []) {
                const stat = methodStats[h.scan_method];
                if (stat) {
                    stat.attempts++;
                    if (h.success) {
                        stat.successes++;
                        stat.totalUnitsFound += h.units_found || 0;
                    }
                    if (!stat.lastUsed || new Date(h.scanned_at) > new Date(stat.lastUsed)) {
                        stat.lastUsed = h.scanned_at;
                    }
                }
            }

            // Calculate rates and determine status - NEVER fully disable
            for (const id of Object.keys(methodStats)) {
                const stat = methodStats[id];
                stat.successRate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : 0;
                stat.avgUnitsPerSuccess = stat.successes > 0 ? Math.round(stat.totalUnitsFound / stat.successes) : 0;

                if (stat.attempts < MIN_SAMPLE_SIZE) {
                    stat.status = 'learning';
                } else if (stat.successRate < LOW_PRIORITY_THRESHOLD) {
                    stat.status = 'low-priority'; // Changed from 'disabled' - still usable
                } else {
                    stat.status = 'active';
                }
            }

            // Sort methods by effectiveness (for UI display)
            const methodStatsArray = Object.values(methodStats).sort((a, b) => {
                // Active > Learning > Low-priority
                const statusOrder = { active: 0, learning: 1, 'low-priority': 2 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                // Then by success rate
                return b.successRate - a.successRate;
            });

            // ========== GROUP HISTORY BY PROPERTY ==========
            const historyByProperty = {};
            for (const h of history || []) {
                if (!historyByProperty[h.property_id]) {
                    historyByProperty[h.property_id] = [];
                }
                historyByProperty[h.property_id].push(h);
            }

            // ========== CALCULATE OVERALL STATS ==========
            const totalProperties = properties?.length || 0;
            const scannedProperties = Object.keys(historyByProperty).length;
            const totalScans = history?.length || 0;
            const successfulScans = (history || []).filter(h => h.success).length;
            const totalUnitsFound = (history || []).reduce((sum, h) => sum + (h.units_found || 0), 0);

            // ========== FIND NEXT PROPERTY & METHOD ==========
            const nextProperty = findNextProperty(properties || [], historyByProperty, methodStats);
            const nextMethod = nextProperty ? findNextMethod(historyByProperty[nextProperty.id] || [], methodStats) : null;

            // ========== BUILD RECENT SCAN HISTORY WITH FAILURE REASONS ==========
            const recentScans = (history || [])
                .slice(0, 20)  // Last 20 scans
                .map(h => {
                    let failureReason = null;
                    if (!h.success) {
                        if (h.error?.includes('HTTP 4')) failureReason = 'Scrape blocked/failed';
                        else if (h.error?.includes('Page too short')) failureReason = 'Empty page';
                        else if (h.error?.includes('No JSON')) failureReason = 'AI extraction failed';
                        else if (h.debug_info?.browserlessError) failureReason = 'Browserless error';
                        else if (h.debug_info?.aiReason) failureReason = h.debug_info.aiReason;
                        else if (h.debug_info?.htmlLength > 1000) failureReason = 'No unit numbers on page';
                        else failureReason = h.error || 'Unknown';
                    }
                    return {
                        propertyId: h.property_id,
                        method: h.scan_method,
                        success: h.success,
                        unitsFound: h.units_found || 0,
                        failureReason,
                        scannedAt: h.scanned_at,
                        htmlLength: h.debug_info?.htmlLength,
                        aiReason: h.debug_info?.aiReason
                    };
                });

            // ========== FAILURE ANALYSIS ==========
            const failureAnalysis = {
                scrapeBlocked: (history || []).filter(h => h.error?.includes('HTTP 4')).length,
                emptyPage: (history || []).filter(h => h.error?.includes('too short')).length,
                noUnitNumbers: (history || []).filter(h => !h.success && h.debug_info?.htmlLength > 1000).length,
                aiExtractionFailed: (history || []).filter(h => h.error?.includes('No JSON')).length,
                browserlessError: (history || []).filter(h => h.debug_info?.browserlessError).length
            };

            return res.status(200).json({
                stats: {
                    totalProperties,
                    scannedProperties,
                    totalScans,
                    successfulScans,
                    totalUnitsFound,
                    successRate: totalScans > 0 ? Math.round((successfulScans / totalScans) * 100) : 0
                },
                methodStats: methodStatsArray,
                next: nextProperty ? {
                    propertyId: nextProperty.id,
                    propertyName: nextProperty.community_name,
                    leasingUrl: nextProperty.leasing_link,
                    method: nextMethod
                } : null,
                recentScans,
                failureAnalysis
            });
        } catch (error) {
            console.error('[auto-scan GET] Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST - Execute next scan
    if (req.method === 'POST') {
        const { propertyId, method } = req.body;

        try {
            // Get property details
            const { data: prop } = await supabase
                .from('properties')
                .select('*')
                .eq('id', propertyId)
                .single();

            if (!prop) {
                return res.status(404).json({ error: 'Property not found' });
            }

            // Get floor plans
            const { data: floorPlans } = await supabase
                .from('floor_plans')
                .select('*')
                .eq('property_id', propertyId);

            console.log(`[Auto-Scan] Scanning ${prop.community_name} with method: ${method}`);

            const methodConfig = SCAN_METHODS.find(m => m.id === method);
            let result;

            if (methodConfig?.type === 'property') {
                // Property website method - use specific path
                const baseUrl = prop.leasing_link.replace(/\/?$/, '');
                const scanUrl = baseUrl + (methodConfig.path || '');
                result = await scanPropertyUrl(scanUrl, prop);
            } else {
                // ILS method - search and scrape specific site
                result = await scanILSSite(method, prop);
            }

            // Record scan history with debug info
            const historyEntry = {
                property_id: propertyId,
                scan_method: method,
                success: result.units.length > 0,
                units_found: result.units.length,
                error: result.errors?.join('; ') || null,
                debug_info: result.debug || null  // Pass as object for JSONB column
            };

            const { error: historyError } = await supabase.from('unit_scan_history').insert(historyEntry);
            if (historyError) {
                console.error('[Auto-Scan] Failed to record history:', historyError);
            }

            // If we found units, track the successful domain for future reference
            if (result.units.length > 0 && result.sources?.length > 0) {
                const successDomain = result.sources[0];
                console.log(`[Auto-Scan] SUCCESS! Found ${result.units.length} units from ${successDomain}`);

                // Update property with successful scrape source
                await supabase
                    .from('properties')
                    .update({
                        last_successful_scrape_source: successDomain,
                        last_unit_scan_at: new Date().toISOString()
                    })
                    .eq('id', propertyId);

                // Upsert units
                for (const unit of result.units) {
                    await supabase.from('units').upsert({
                        property_id: propertyId,
                        unit_number: unit.unit_number,
                        floor_plan_id: unit.floor_plan_id,
                        beds: unit.beds,
                        baths: unit.baths,
                        sqft: unit.sqft,
                        rent: unit.rent,
                        available_from: unit.available_from,
                        status: 'available',
                        is_available: true,
                        is_active: true
                    }, { onConflict: 'property_id,unit_number' });
                }
            }

            return res.status(200).json({
                success: true,
                propertyId,
                propertyName: prop.community_name,
                method,
                unitsFound: result.units.length,
                sources: result.sources,
                debug: result.debug // Include debug info in response
            });

        } catch (error) {
            console.error('[auto-scan POST] Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Get ALL methods sorted by effectiveness - NEVER filter any out
function getAllMethodsSorted(methodStats) {
    return [...SCAN_METHODS].sort((a, b) => {
        const statA = methodStats[a.id];
        const statB = methodStats[b.id];

        // Learning methods (untested) get high priority
        if ((!statA || statA.attempts === 0) && statB?.attempts > 0) return -1;
        if ((!statB || statB.attempts === 0) && statA?.attempts > 0) return 1;

        // Then by success rate (higher = first)
        const rateA = statA?.successRate || 0;
        const rateB = statB?.successRate || 0;
        if (rateA !== rateB) return rateB - rateA;

        // Finally by attempts (fewer = try more)
        return (statA?.attempts || 0) - (statB?.attempts || 0);
    });
}

// Find next property to scan - ALWAYS returns a property if any exist
function findNextProperty(properties, historyByProperty, methodStats) {
    if (properties.length === 0) {
        console.log('[Auto-Scan] No properties with leasing URLs!');
        return null;
    }

    const allMethods = getAllMethodsSorted(methodStats);

    // Score each property: lower = should scan next
    const scored = properties.map(p => {
        const history = historyByProperty[p.id] || [];
        const methodsTried = new Set(history.map(h => h.scan_method));
        const lastScan = history[0]?.scanned_at ? new Date(history[0].scanned_at) : new Date(0);
        const timeSinceLastScan = Date.now() - lastScan.getTime();

        // Check if there are ANY untried methods for this property
        const hasUntriedMethods = allMethods.some(m => !methodsTried.has(m.id));
        const hasAnySuccess = history.some(h => h.success);
        const unitsFound = history.reduce((sum, h) => sum + (h.units_found || 0), 0);

        // Score: lower = higher priority
        let score = 0;

        // Prioritize properties with untried methods
        if (!hasUntriedMethods) score += 5000;

        // Prioritize properties that haven't been scanned recently
        if (timeSinceLastScan > 24 * 60 * 60 * 1000) score -= 100; // Bonus for 24h+ old

        // De-prioritize properties that already found units
        if (hasAnySuccess) score += 1000;
        score += unitsFound * 50;

        // Fewer methods tried = higher priority
        score += methodsTried.size * 100;

        return { property: p, score, hasUntriedMethods, methodsTried: methodsTried.size };
    });

    scored.sort((a, b) => a.score - b.score);

    console.log(`[findNextProperty] Top 3 candidates:`,
        scored.slice(0, 3).map(s => `${s.property.community_name} (score=${s.score}, tried=${s.methodsTried})`));

    return scored[0]?.property || null;
}

// Find next method to try for a property - cycles through ALL methods
function findNextMethod(history, methodStats) {
    const methodsTried = new Set(history.map(h => h.scan_method));
    const allMethods = getAllMethodsSorted(methodStats);

    // Find first untried method (sorted by effectiveness)
    for (const method of allMethods) {
        if (!methodsTried.has(method.id)) {
            console.log(`[findNextMethod] Untried method: ${method.id}`);
            return method.id;
        }
    }

    // All methods have been tried - pick the one with best success rate that was tried longest ago
    const methodsByRecency = history
        .sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at)) // Oldest first
        .map(h => h.scan_method);

    // Return oldest tried method to retry (gives it another chance)
    const oldestMethod = methodsByRecency[0] || allMethods[0]?.id || SCAN_METHODS[0].id;
    console.log(`[findNextMethod] All methods tried, retrying oldest: ${oldestMethod}`);
    return oldestMethod;
}

