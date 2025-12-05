// Auto Unit Scanner API
// Continuous scanning with method rotation
import { createClient } from '@supabase/supabase-js';

const BROWSERLESS_BASE = 'https://chrome.browserless.io';
const SERPAPI_BASE = 'https://serpapi.com/search.json';

// Scan methods in rotation order
const SCAN_METHODS = [
    { id: 'property-floorplans', path: '/floorplans', type: 'property' },
    { id: 'property-floor-plans', path: '/floor-plans', type: 'property' },
    { id: 'property-availability', path: '/availability', type: 'property' },
    { id: 'apartments.com', type: 'ils', searchPattern: 'site:apartments.com' },
    { id: 'zillow.com', type: 'ils', searchPattern: 'site:zillow.com/b' },
    { id: 'rent.com', type: 'ils', searchPattern: 'site:rent.com' }
];

// Scrape a page with Browserless /function API (clicks floor plan cards)
async function scrapePage(url, browserlessToken) {
    try {
        const response = await fetch(`${BROWSERLESS_BASE}/function?token=${browserlessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: `
                    module.exports = async ({ page }) => {
                        await page.goto('${url}', { waitUntil: 'networkidle2', timeout: 30000 });
                        await page.waitForTimeout(3000);

                        // Click floor plan cards to expand
                        const selectors = ['.floor-plan-card', '[class*="floor-plan"]', '[class*="floorplan"]',
                                           '.pricingGridItem', '[data-testid*="floorplan"]'];
                        for (const sel of selectors) {
                            try {
                                const els = await page.$$(sel);
                                for (let i = 0; i < Math.min(els.length, 5); i++) {
                                    await els[i].click().catch(() => {});
                                    await page.waitForTimeout(500);
                                }
                            } catch (e) {}
                        }
                        await page.waitForTimeout(2000);
                        return await page.content();
                    };
                `
            })
        });

        if (!response.ok) return null;
        const html = await response.text();
        return html?.length > 2000 ? html : null;
    } catch (e) {
        console.error('[scrapePage] Error:', e.message);
        return null;
    }
}

// Extract units from HTML using AI
async function extractUnits(html, propertyName, floorPlans, openaiKey) {
    if (!html || html.length < 500) return [];

    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 15000);

    const prompt = `Extract apartment units from "${propertyName}". Return ONLY JSON:
{"units":[{"unit_number":"101","beds":1,"baths":1,"sqft":750,"rent":1250,"available_from":"2025-01-15","floor_plan_name":"A1"}]}
Rules: unit_number must be specific apt number, rent as number only, available_from as YYYY-MM-DD or null.`;

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
        if (!resp.ok) return [];
        const data = await resp.json();
        const match = data.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]).units || [] : [];
    } catch (e) {
        return [];
    }
}

// Scan a property website URL
async function scanPropertyUrl(url, prop, floorPlans) {
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    console.log(`[Auto-Scan] Scraping property URL: ${url}`);
    const html = await scrapePage(url, browserlessToken);

    if (!html) return { units: [], sources: [], errors: ['Failed to scrape page'] };

    const units = await extractUnits(html, prop.community_name, floorPlans, openaiKey);
    return {
        units: units.map(u => ({ ...u, status: 'available', is_available: true, is_active: true })),
        sources: units.length > 0 ? ['property-website'] : [],
        errors: []
    };
}

// Scan ILS site (apartments.com, zillow, rent.com)
async function scanILSSite(ilsSite, prop, floorPlans) {
    const serpApiKey = process.env.SERP_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!serpApiKey) return { units: [], sources: [], errors: ['Missing SERP_API_KEY'] };

    const methodConfig = SCAN_METHODS.find(m => m.id === ilsSite);
    const query = `${methodConfig?.searchPattern || 'site:' + ilsSite} "${prop.community_name}" ${prop.city || 'San Antonio'} ${prop.state || 'TX'}`;

    console.log(`[Auto-Scan] Searching ${ilsSite}: ${query}`);

    try {
        // Search for listing
        const searchResp = await fetch(`${SERPAPI_BASE}?${new URLSearchParams({ engine: 'google', q: query, num: '3', api_key: serpApiKey })}`);
        const searchData = await searchResp.json();

        const result = searchData.organic_results?.find(r =>
            r.link?.includes(ilsSite.replace('.com', '')) &&
            !r.link?.includes('/reviews') &&
            !r.link?.includes('/photos')
        );

        if (!result?.link) return { units: [], sources: [], errors: [`No ${ilsSite} listing found`] };

        console.log(`[Auto-Scan] Found listing: ${result.link}`);

        // Scrape the listing
        const html = await scrapePage(result.link, browserlessToken);
        if (!html) return { units: [], sources: [], errors: ['Failed to scrape ILS page'] };

        const units = await extractUnits(html, prop.community_name, floorPlans, openaiKey);
        return {
            units: units.map(u => ({ ...u, status: 'available', is_available: true, is_active: true })),
            sources: units.length > 0 ? [ilsSite] : [],
            errors: []
        };
    } catch (e) {
        return { units: [], sources: [], errors: [e.message] };
    }
}

// Minimum attempts before a method's success rate matters
const MIN_SAMPLE_SIZE = 5;
// Methods with this success rate or below after MIN_SAMPLE_SIZE attempts get disabled
const DISABLE_THRESHOLD = 0;

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

            // Calculate rates and determine status
            for (const id of Object.keys(methodStats)) {
                const stat = methodStats[id];
                stat.successRate = stat.attempts > 0 ? Math.round((stat.successes / stat.attempts) * 100) : 0;
                stat.avgUnitsPerSuccess = stat.successes > 0 ? Math.round(stat.totalUnitsFound / stat.successes) : 0;

                if (stat.attempts < MIN_SAMPLE_SIZE) {
                    stat.status = 'learning';
                } else if (stat.successRate <= DISABLE_THRESHOLD) {
                    stat.status = 'disabled';
                } else {
                    stat.status = 'active';
                }
            }

            // Sort methods by effectiveness (for UI display)
            const methodStatsArray = Object.values(methodStats).sort((a, b) => {
                // Active > Learning > Disabled
                const statusOrder = { active: 0, learning: 1, disabled: 2 };
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
                } : null
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
                const scanUrl = prop.leasing_link.replace(/\/?$/, '') + (methodConfig.path || '');
                result = await scanPropertyUrl(scanUrl, prop, floorPlans || []);
            } else {
                // ILS method - search and scrape specific site
                result = await scanILSSite(method, prop, floorPlans || []);
            }

            // Record scan history
            await supabase.from('unit_scan_history').insert({
                property_id: propertyId,
                scan_method: method,
                success: result.units.length > 0,
                units_found: result.units.length,
                error: result.errors?.join('; ') || null
            });

            // Save units if found
            if (result.units.length > 0) {
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
                sources: result.sources
            });

        } catch (error) {
            console.error('[auto-scan POST] Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// Get active methods sorted by effectiveness
function getActiveMethods(methodStats) {
    return SCAN_METHODS
        .filter(m => {
            const stat = methodStats[m.id];
            // Include if: still learning OR has some success
            return !stat || stat.status !== 'disabled';
        })
        .sort((a, b) => {
            const statA = methodStats[a.id];
            const statB = methodStats[b.id];

            // Untested methods get medium priority (let them learn)
            if (!statA || statA.attempts === 0) return 0;
            if (!statB || statB.attempts === 0) return 0;

            // Sort by success rate (higher = first)
            return (statB?.successRate || 0) - (statA?.successRate || 0);
        });
}

// Find next property to scan
function findNextProperty(properties, historyByProperty, methodStats) {
    const activeMethods = getActiveMethods(methodStats);

    if (activeMethods.length === 0) {
        console.log('[Auto-Scan] All methods disabled!');
        return null;
    }

    // Score each property: lower = should scan next
    const scored = properties.map(p => {
        const history = historyByProperty[p.id] || [];
        const methodsTried = new Set(history.map(h => h.scan_method));
        const lastScan = history[0]?.scanned_at ? new Date(history[0].scanned_at) : new Date(0);

        // Check if there are untried ACTIVE methods for this property
        const hasUntriedActiveMethods = activeMethods.some(m => !methodsTried.has(m.id));
        const hasAnySuccess = history.some(h => h.success);
        const unitsFound = history.reduce((sum, h) => sum + (h.units_found || 0), 0);

        return {
            property: p,
            score: (hasUntriedActiveMethods ? 0 : 1000) + // Prioritize properties with untried methods
                (hasAnySuccess ? 500 : 0) +               // De-prioritize ones that already have units
                (unitsFound * 2) +                        // De-prioritize by units found
                methodsTried.size * 10 +                  // Fewer methods tried = higher priority
                (Date.now() - lastScan.getTime()) / -86400000 // Older = higher priority
        };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.property || null;
}

// Find next method to try for a property (uses smart prioritization)
function findNextMethod(history, methodStats) {
    const methodsTried = new Set(history.map(h => h.scan_method));
    const activeMethods = getActiveMethods(methodStats);

    // Find first untried ACTIVE method (already sorted by effectiveness)
    for (const method of activeMethods) {
        if (!methodsTried.has(method.id)) {
            return method.id;
        }
    }

    // All active methods tried - return the most effective one that was tried longest ago
    const activeMethodIds = new Set(activeMethods.map(m => m.id));
    const triedActiveMethods = [...methodsTried].filter(m => activeMethodIds.has(m));

    if (triedActiveMethods.length === 0) {
        // Fallback: try first active method anyway
        return activeMethods[0]?.id || SCAN_METHODS[0].id;
    }

    // Sort by: effectiveness first, then by recency (oldest first)
    triedActiveMethods.sort((a, b) => {
        const statA = methodStats[a];
        const statB = methodStats[b];

        // First by success rate
        const rateDiff = (statB?.successRate || 0) - (statA?.successRate || 0);
        if (Math.abs(rateDiff) > 10) return rateDiff; // Significant difference

        // Then by recency (oldest first to retry)
        const aLast = history.find(h => h.scan_method === a)?.scanned_at || '';
        const bLast = history.find(h => h.scan_method === b)?.scanned_at || '';
        return aLast.localeCompare(bLast);
    });

    return triedActiveMethods[0];
}

