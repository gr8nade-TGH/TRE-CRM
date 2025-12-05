// ILS (Internet Listing Service) Unit Scraper
// Scrapes unit availability from apartments.com, zillow, rent.com

const SERPAPI_BASE = 'https://serpapi.com/search.json';
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

async function scrapeILSPage(url, browserlessToken, siteName) {
    console.log(`[ILS] Scraping ${siteName}: ${url}`);
    const code = `module.exports = async ({ page }) => {
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        });
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto('${url}', { waitUntil: 'networkidle2', timeout: 25000 });
        await page.waitForTimeout(2000);
        try { await page.click('[class*="show-more"]'); await page.waitForTimeout(1000); } catch(e){}
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(1000);
        return await page.content();
    };`;
    try {
        const resp = await fetch(`https://chrome.browserless.io/function?token=${browserlessToken}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        if (!resp.ok) return null;
        return await resp.text();
    } catch (e) { console.error(`[ILS] Scrape error:`, e.message); return null; }
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

export async function deepScanUnits({ propertyId, propertyName, city, state, floorPlans = [], leasingUrl = null }) {
    const serpApiKey = process.env.SERP_API_KEY, openaiKey = process.env.OPENAI_API_KEY, browserlessToken = process.env.BROWSERLESS_TOKEN;
    console.log(`\n[ILS Deep Scan] ${propertyName} (${floorPlans.length} floor plans)`);
    const results = { propertyId, units: [], newFloorPlans: [], sources: [], errors: [] };
    if (!serpApiKey || !browserlessToken || !openaiKey) { results.errors.push('Missing API keys'); return results; }
    
    const listings = await findILSListings(propertyName, city, state || 'TX', serpApiKey);
    if (listings.length === 0 && leasingUrl) listings.push({ site: 'direct', url: leasingUrl, title: propertyName });
    
    for (let i = 0; i < Math.min(listings.length, 3); i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
        const listing = listings[i];
        const html = await scrapeILSPage(listing.url, browserlessToken, listing.site);
        if (html && html.length > 2000) {
            const extracted = await extractUnitsFromILS(html, propertyName, floorPlans, openaiKey, listing.site);
            if (extracted.units.length > 0) {
                results.units.push(...matchUnitsToFloorPlans(extracted.units, floorPlans));
                results.sources.push(listing.site);
            }
            if (extracted.floorPlans.length > 0) results.newFloorPlans.push(...extracted.floorPlans);
            if (results.units.length >= 5) break;
        }
    }
    const seen = new Set();
    results.units = results.units.filter(u => { const k = `${u.unit_number}-${u.beds}`; if (seen.has(k)) return false; seen.add(k); return true; });
    console.log(`[ILS Complete] ${results.units.length} units from: ${results.sources.join(', ') || 'none'}`);
    return results;
}

