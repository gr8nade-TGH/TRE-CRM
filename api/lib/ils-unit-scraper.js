// ILS (Internet Listing Service) Unit Scraper
// Scrapes unit availability from apartments.com, zillow, rent.com
// Uses Browserless /unblock + /scrape APIs with residential proxy for bot detection bypass

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const BROWSERLESS_BASE = 'https://production-sfo.browserless.io';

// Site-specific configurations with CSS selectors for structured extraction
const ILS_SITES = [
    {
        name: 'apartments.com',
        searchPattern: 'site:apartments.com',
        // apartments.com uses React, units are in floor plan cards
        selectors: {
            floorPlanCard: '[data-testid="floorplan-card"], .pricingGridItem, .floorplan-card, [class*="FloorplanCard"]',
            unitRow: '[data-testid="unit-row"], .unitRow, .pricingGridItemRow, [class*="UnitRow"]',
            unitNumber: '[data-testid="unit-number"], .unitColumn, [class*="unitNumber"], .unit-number',
            beds: '[data-testid="beds"], .beds, [class*="bedroom"], .bed',
            baths: '[data-testid="baths"], .baths, [class*="bathroom"], .bath',
            sqft: '[data-testid="sqft"], .sqft, [class*="squareFeet"], .sqft',
            rent: '[data-testid="rent"], .pricingColumn, [class*="rent"], .price',
            available: '[data-testid="availability"], .availabilityColumn, [class*="avail"], .date'
        },
        floorPlanPath: '' // Units often on same page
    },
    {
        name: 'zillow.com',
        searchPattern: 'site:zillow.com/b',
        selectors: {
            floorPlanCard: '[data-testid="floor-plan-card"], .FloorPlanCard, [class*="floorplan"]',
            unitRow: '[data-testid="unit-availability-row"], .UnitRow, [class*="unit-row"]',
            unitNumber: '[class*="unit-number"], [class*="unitNumber"]',
            beds: '[class*="bed"]',
            baths: '[class*="bath"]',
            sqft: '[class*="sqft"], [class*="squareFeet"]',
            rent: '[class*="price"], [class*="rent"]',
            available: '[class*="avail"], [class*="date"]'
        },
        floorPlanPath: ''
    },
    {
        name: 'rent.com',
        searchPattern: 'site:rent.com',
        selectors: {
            floorPlanCard: '.floor-plan-card, [class*="FloorPlan"]',
            unitRow: '.unit-item, [class*="UnitItem"]',
            unitNumber: '[class*="unit-number"]',
            beds: '[class*="bed"]',
            baths: '[class*="bath"]',
            sqft: '[class*="sqft"]',
            rent: '[class*="price"]',
            available: '[class*="avail"]'
        },
        floorPlanPath: '/floor-plans'
    }
];

/**
 * Search for ILS listings with multiple query strategies
 * Uses property name, address variations, and simplified searches
 */
async function findILSListings(propertyName, city, state, serpApiKey, address = null) {
    const listings = [];

    // Normalize property name - remove common suffixes
    const cleanName = propertyName
        .replace(/\s*(apartments?|apts?|at\s+\w+|by\s+\w+|living|residences?|lofts?|flats?)$/i, '')
        .trim();

    for (const ils of ILS_SITES) {
        try {
            // Try multiple search strategies
            const searchQueries = [
                // Exact name with quotes
                `${ils.searchPattern} "${propertyName}" ${city} ${state}`,
                // Cleaned name (more flexible)
                `${ils.searchPattern} ${cleanName} apartments ${city} ${state}`,
            ];

            // Add address-based search if available
            if (address) {
                const streetPart = address.split(',')[0].trim();
                searchQueries.push(`${ils.searchPattern} "${streetPart}" ${city} ${state}`);
            }

            for (const query of searchQueries) {
                const params = new URLSearchParams({
                    engine: 'google',
                    q: query,
                    num: '5',  // Get more results
                    api_key: serpApiKey
                });

                const resp = await fetch(`${SERPAPI_BASE}?${params}`);
                if (!resp.ok) continue;

                const data = await resp.json();

                for (const r of (data.organic_results || []).slice(0, 3)) {
                    const siteDomain = ils.name.replace('.com', '');
                    if (r.link && r.link.includes(siteDomain)) {
                        // Avoid duplicates
                        const exists = listings.some(l => l.url === r.link);
                        if (!exists) {
                            // Ensure we have the main property page URL (not review or photo pages)
                            let url = r.link;
                            if (url.includes('/reviews') || url.includes('/photos') || url.includes('/videos')) {
                                url = url.replace(/\/(reviews|photos|videos)\/?.*$/, '/');
                            }

                            listings.push({
                                site: ils.name,
                                url: url,
                                title: r.title,
                                selectors: ils.selectors,
                                floorPlanPath: ils.floorPlanPath
                            });
                            console.log(`[ILS] Found: ${ils.name} - ${url}`);
                        }
                    }
                }

                // If we found a listing for this site, don't try other queries
                if (listings.some(l => l.site === ils.name)) break;
            }
        } catch (e) {
            console.error(`[ILS] Search error ${ils.name}:`, e.message);
        }
    }

    console.log(`[ILS] Found ${listings.length} listings across ${[...new Set(listings.map(l => l.site))].join(', ') || 'none'}`);
    return listings;
}

/**
 * Use Browserless /scrape API for structured CSS selector-based extraction
 * This is more reliable than parsing raw HTML for sites with known structure
 */
async function scrapeWithSelectors(url, browserlessToken, selectors) {
    console.log(`[ILS] CSS selector scrape: ${url}`);

    try {
        // Build elements array from selectors
        const elements = [
            { selector: selectors.floorPlanCard },
            { selector: selectors.unitRow },
            { selector: selectors.rent },
            { selector: selectors.beds },
            { selector: selectors.sqft },
            { selector: selectors.available },
            { selector: selectors.unitNumber }
        ].filter(e => e.selector);

        const resp = await fetch(`${BROWSERLESS_BASE}/scrape?token=${browserlessToken}&proxy=residential`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                elements: elements,
                waitForTimeout: 5000,
                waitForSelector: { selector: selectors.floorPlanCard || selectors.rent, timeout: 10000 },
                gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 }
            })
        });

        if (!resp.ok) {
            console.log(`[ILS] Scrape API returned ${resp.status}`);
            return null;
        }

        const data = await resp.json();
        console.log(`[ILS] Scrape API returned ${JSON.stringify(data).length} chars of structured data`);
        return data;

    } catch (e) {
        console.error(`[ILS] Scrape API error:`, e.message);
        return null;
    }
}

/**
 * Scrape ILS page using Browserless /unblock API with residential proxy
 * This API is specifically designed to bypass bot detection (Datadome, CAPTCHAs)
 */
async function scrapeILSPage(url, browserlessToken, siteName) {
    console.log(`[ILS] Unblock scraping ${siteName}: ${url}`);

    try {
        // Use /unblock API with residential proxy for best bot bypass
        const resp = await fetch(`${BROWSERLESS_BASE}/unblock?token=${browserlessToken}&proxy=residential`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                content: true,
                cookies: false,
                screenshot: false,
                browserWSEndpoint: false,
                waitForTimeout: 5000, // Increased wait for dynamic content
                gotoOptions: {
                    waitUntil: 'networkidle0', // Wait for full network quiet
                    timeout: 45000 // Increased timeout
                }
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[ILS] Unblock API error (${resp.status}):`, errText.slice(0, 200));
            return null;
        }

        const data = await resp.json();

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

/**
 * Extract units from scraped HTML using AI with enhanced prompts
 * Handles both raw HTML and structured selector data
 */
async function extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, siteName, structuredData = null) {
    if ((!html || html.length < 500) && !structuredData) return { units: [], floorPlans: [] };

    // Clean HTML and extract text, preserving some structure
    let content = '';
    if (structuredData) {
        // If we have structured selector data, format it nicely
        content = JSON.stringify(structuredData, null, 2).slice(0, 20000);
    } else {
        // Clean HTML more carefully - preserve numbers and key text
        content = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            // Keep class names that might indicate unit data
            .replace(/class="([^"]*(?:unit|bed|bath|sqft|price|rent|avail|floor)[^"]*)"/gi, ' [$1] ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 25000); // Increase limit to capture more data
    }

    const fpContext = floorPlans.length > 0
        ? `\nKNOWN FLOOR PLANS TO MATCH:\n${floorPlans.map(fp => `- "${fp.name}": ${fp.beds}bd/${fp.baths}ba, ~${fp.sqft || '?'}sqft`).join('\n')}`
        : '';

    const systemPrompt = `You are an expert at extracting apartment unit availability data from ${siteName}.

TASK: Extract ALL available apartment units from this property listing for "${propertyName}".
${fpContext}

LOOK FOR patterns like:
- "Unit 101" or "Apt 101" or "#101" = unit_number
- "$1,250/mo" or "$1250" = rent (number only)
- "1 Bed" or "1 BR" or "1bd" = beds (number only)
- "1 Bath" or "1 BA" = baths (number only)
- "750 sq ft" or "750 SF" = sqft (number only)
- "Available Now" = available_from: today's date
- "Available 01/15/25" or "Jan 15" = available_from: "2025-01-15"
- Floor plan names like "A1", "The Oak", "Studio", etc.

IMPORTANT RULES:
1. Extract EVERY unit that has availability shown - even if just a count like "3 units available"
2. If unit numbers aren't shown but floor plan has "X units available", create entries with unit_number like "FP-A1-1", "FP-A1-2"
3. Parse dates to YYYY-MM-DD format (assume 2025 for ambiguous dates)
4. rent should be numeric (1250 not "$1,250")
5. If beds/baths/sqft aren't specified, infer from floor plan name or leave as null
6. Include ALL price points if a range is shown (create multiple units)

OUTPUT FORMAT (JSON only, no explanation):
{
  "units": [
    {"unit_number": "101", "beds": 1, "baths": 1, "sqft": 750, "rent": 1250, "available_from": "2025-01-15", "floor_plan_name": "A1"}
  ],
  "summary": "Found X units across Y floor plans"
}`;

    try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Extract units from this ${siteName} page:\n\n${content}` }
                ],
                temperature: 0.1, // Lower temp for more consistent extraction
                max_tokens: 4000  // More tokens for larger unit lists
            })
        });

        if (!resp.ok) {
            console.error('[ILS AI] API error:', resp.status);
            return { units: [], floorPlans: [] };
        }

        const data = await resp.json();
        const aiContent = data.choices?.[0]?.message?.content || '';
        console.log(`[ILS AI] Response preview: ${aiContent.slice(0, 200)}...`);

        const match = aiContent.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            console.log(`[ILS AI] Extracted ${parsed.units?.length || 0} units. ${parsed.summary || ''}`);
            return {
                units: parsed.units || [],
                floorPlans: parsed.newFloorPlans || [],
                summary: parsed.summary
            };
        }
    } catch (e) {
        console.error('[ILS AI] Error:', e.message);
    }
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
 * Enhanced strategy:
 * 1. Search apartments.com, zillow, rent.com using multiple query strategies
 * 2. Try CSS selector extraction first (faster, more reliable)
 * 3. Fall back to /unblock with residential proxy for bot-protected sites
 * 4. Use enhanced AI prompts to extract unit data
 * 5. Match units to existing floor plans
 */
export async function deepScanUnits({ propertyId, propertyName, city, state, floorPlans = [], leasingUrl = null, address = null }) {
    const serpApiKey = process.env.SERP_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[ILS Deep Scan] ${propertyName}`);
    console.log(`[ILS Deep Scan] City: ${city}, State: ${state || 'TX'}`);
    console.log(`[ILS Deep Scan] Floor plans: ${floorPlans.length}, Leasing URL: ${leasingUrl ? 'Yes' : 'No'}`);
    console.log(`${'='.repeat(60)}`);

    const results = {
        propertyId,
        units: [],
        newFloorPlans: [],
        sources: [],
        errors: [],
        searchStats: { queriesRun: 0, pagesScraped: 0, extractionAttempts: 0 }
    };

    if (!serpApiKey || !browserlessToken || !openaiKey) {
        results.errors.push('Missing API keys: ' + [
            !serpApiKey && 'SERP_API_KEY',
            !browserlessToken && 'BROWSERLESS_TOKEN',
            !openaiKey && 'OPENAI_API_KEY'
        ].filter(Boolean).join(', '));
        return results;
    }

    // Step 1: Find property listings on ILS sites with enhanced search
    const listings = await findILSListings(propertyName, city, state || 'TX', serpApiKey, address);
    results.searchStats.queriesRun = listings.length > 0 ? ILS_SITES.length : 0;

    // Add direct property URL as high-priority fallback
    if (leasingUrl) {
        // Check if direct URL already in listings
        const hasDirectUrl = listings.some(l => leasingUrl.includes(l.url) || l.url.includes(leasingUrl.split('/')[2]));
        if (!hasDirectUrl) {
            // Insert at beginning - direct property site is often most reliable
            listings.unshift({
                site: 'property-website',
                url: leasingUrl,
                title: propertyName,
                selectors: null // Will use generic scraping
            });
        }
    }

    if (listings.length === 0) {
        results.errors.push(`No listings found for "${propertyName}" in ${city}, ${state || 'TX'}`);
        return results;
    }

    console.log(`[ILS] Processing ${listings.length} listing(s)...`);

    // Step 2: Scrape each listing with multiple strategies
    for (let i = 0; i < Math.min(listings.length, 4); i++) {
        // Random delay between requests (1-3 seconds)
        if (i > 0) {
            const delay = 1000 + Math.random() * 2000;
            console.log(`[ILS] Waiting ${Math.round(delay / 1000)}s...`);
            await new Promise(r => setTimeout(r, delay));
        }

        const listing = listings[i];
        console.log(`\n[ILS] Scraping (${i + 1}/${Math.min(listings.length, 4)}): ${listing.site}`);
        console.log(`[ILS] URL: ${listing.url}`);

        let html = null;
        let structuredData = null;

        // Strategy 1: Try CSS selector scraping first (if we have selectors for this site)
        if (listing.selectors) {
            structuredData = await scrapeWithSelectors(listing.url, browserlessToken, listing.selectors);
            results.searchStats.pagesScraped++;
        }

        // Strategy 2: Try /unblock with residential proxy
        if (!structuredData || (structuredData.data && structuredData.data.every(d => d.results.length === 0))) {
            html = await scrapeILSPage(listing.url, browserlessToken, listing.site);
            results.searchStats.pagesScraped++;

            // Also try the /floor-plans page for some sites
            if ((!html || html.length < 3000) && listing.floorPlanPath) {
                const fpUrl = listing.url.replace(/\/?$/, listing.floorPlanPath);
                console.log(`[ILS] Trying floor plans page: ${fpUrl}`);
                html = await scrapeILSPage(fpUrl, browserlessToken, listing.site);
                results.searchStats.pagesScraped++;
            }
        }

        // Strategy 3: Fall back to /content API if /unblock fails
        if (!html || html.length < 2000) {
            console.log(`[ILS] /unblock insufficient, trying /content API...`);
            html = await scrapeWithContentAPI(listing.url, browserlessToken, listing.site);
            results.searchStats.pagesScraped++;
        }

        // Step 3: Extract units using AI
        if ((html && html.length > 2000) || structuredData) {
            results.searchStats.extractionAttempts++;
            const extracted = await extractUnitsFromILS(
                html,
                propertyName,
                floorPlans,
                openaiKey,
                listing.site,
                structuredData
            );

            if (extracted.units && extracted.units.length > 0) {
                // Match units to floor plans
                const matchedUnits = matchUnitsToFloorPlans(extracted.units, floorPlans);
                results.units.push(...matchedUnits);
                results.sources.push(listing.site);
                console.log(`[ILS] ✅ Extracted ${matchedUnits.length} units from ${listing.site}`);
            } else {
                console.log(`[ILS] ⚠️ No units extracted from ${listing.site}`);
                results.errors.push(`No units found on ${listing.site}`);
            }

            if (extracted.floorPlans && extracted.floorPlans.length > 0) {
                results.newFloorPlans.push(...extracted.floorPlans);
            }

            // Stop if we have enough units
            if (results.units.length >= 20) {
                console.log(`[ILS] Got ${results.units.length} units, stopping early`);
                break;
            }
        } else {
            console.log(`[ILS] ❌ Failed to get content from ${listing.site}`);
            results.errors.push(`Failed to scrape ${listing.site}: insufficient content`);
        }
    }

    // Step 5: Deduplicate units by unit_number + beds + rent
    const seen = new Set();
    results.units = results.units.filter(u => {
        // Use multiple fields for deduplication
        const key = `${u.unit_number}-${u.beds}-${u.rent || 0}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Step 6: Sort by unit number for cleaner output
    results.units.sort((a, b) => {
        const numA = parseInt(a.unit_number) || 0;
        const numB = parseInt(b.unit_number) || 0;
        return numA - numB;
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[ILS Complete] ${results.units.length} unique units from: ${results.sources.join(', ') || 'none'}`);
    console.log(`[ILS Stats] Queries: ${results.searchStats.queriesRun}, Pages: ${results.searchStats.pagesScraped}, Extractions: ${results.searchStats.extractionAttempts}`);
    if (results.errors.length > 0) {
        console.log(`[ILS Errors] ${results.errors.join('; ')}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return results;
}
