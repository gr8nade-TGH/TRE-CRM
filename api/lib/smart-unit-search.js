/**
 * Smart Unit Search - 3-Step Discovery + Specials
 * Step 1: SerpAPI Blitz - Fast structured data from multiple APIs
 * Step 2: AI Analysis - Extract unit data + specials from what we found
 * Step 3: Browserless Scrape - Only if still missing critical data
 */

const SERPAPI_BASE = 'https://serpapi.com/search.json';

// ============================================================
// SPECIALS SEARCH
// ============================================================

async function searchSpecials(propertyName, city, apiKey) {
    try {
        const queries = [
            `"${propertyName}" move-in special ${city}`,
            `"${propertyName}" apartment specials deals ${city}`
        ];
        const allSnippets = [];

        for (const query of queries) {
            const params = new URLSearchParams({ engine: 'google', q: query, num: '5', api_key: apiKey });
            const response = await fetch(`${SERPAPI_BASE}?${params}`);
            if (!response.ok) continue;

            const data = await response.json();
            for (const result of (data.organic_results || []).slice(0, 5)) {
                if (result.snippet) allSnippets.push(result.snippet);
                if (result.rich_snippet?.top?.detected_extensions) {
                    allSnippets.push(JSON.stringify(result.rich_snippet.top.detected_extensions));
                }
            }
        }
        return allSnippets;
    } catch (e) { console.error('[Specials Search]', e.message); return []; }
}

async function searchYouTube(propertyName, city, apiKey) {
    try {
        const queries = [`"${propertyName}" apartment tour`, `"${propertyName}" ${city} apartments`];
        const allVideos = [], descriptions = [];
        for (const query of queries) {
            const params = new URLSearchParams({ engine: 'youtube', search_query: query, api_key: apiKey });
            const response = await fetch(`${SERPAPI_BASE}?${params}`);
            if (!response.ok) continue;
            const data = await response.json();
            for (const v of (data.video_results || []).slice(0, 5)) {
                allVideos.push({ title: v.title, link: v.link, thumbnail: v.thumbnail?.static, duration: v.length?.text, channel: v.channel?.name, description: v.description });
                if (v.title) descriptions.push(v.title);
                if (v.description) descriptions.push(v.description);
            }
        }
        return { videos: allVideos, descriptions };
    } catch (e) { console.error('[YouTube]', e.message); return { videos: [], descriptions: [] }; }
}

async function searchFloorPlanImages(propertyName, city, apiKey) {
    try {
        const params = new URLSearchParams({ engine: 'google_images', q: `"${propertyName}" floor plan ${city}`, num: '15', api_key: apiKey });
        const response = await fetch(`${SERPAPI_BASE}?${params}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.images_results || []).slice(0, 10).map(img => ({ url: img.original, thumbnail: img.thumbnail, title: img.title, source: img.source })).filter(img => img.url && !img.url.includes('logo'));
    } catch (e) { console.error('[FloorPlanImages]', e.message); return []; }
}

async function searchUnitTypeImages(propertyName, city, apiKey) {
    try {
        const unitTypes = ['1 bedroom', '2 bedroom', 'studio'], allImages = [];
        for (const unitType of unitTypes) {
            const params = new URLSearchParams({ engine: 'google_images', q: `"${propertyName}" ${unitType} ${city}`, num: '5', api_key: apiKey });
            const response = await fetch(`${SERPAPI_BASE}?${params}`);
            if (!response.ok) continue;
            const data = await response.json();
            for (const img of (data.images_results || []).slice(0, 3)) allImages.push({ url: img.original, thumbnail: img.thumbnail, unitType, title: img.title });
        }
        return allImages.filter(img => img.url && !img.url.includes('logo'));
    } catch (e) { console.error('[UnitImages]', e.message); return []; }
}

async function getGoogleReviews(dataId, apiKey) {
    try {
        const params = new URLSearchParams({ engine: 'google_maps_reviews', data_id: dataId, sort_by: 'newestFirst', api_key: apiKey });
        const response = await fetch(`${SERPAPI_BASE}?${params}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.reviews || []).slice(0, 15).map(r => ({ rating: r.rating, text: r.snippet || r.text, date: r.date, author: r.user?.name }));
    } catch (e) { console.error('[Reviews]', e.message); return []; }
}

async function extractUnitsAndSpecials(textContent, specialsContent, propertyName, openaiKey) {
    if ((!textContent || textContent.length < 50) && (!specialsContent || specialsContent.length < 20)) {
        return { floorPlans: [], specials: [] };
    }
    try {
        const combinedContent = `UNIT/FLOOR PLAN INFO:\n${textContent?.slice(0, 3000) || 'None'}\n\nSPECIALS/PROMOTIONS:\n${specialsContent?.slice(0, 1500) || 'None'}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'system', content: `Extract floor plans AND specials from "${propertyName}" content. Return JSON:
{
  "floorPlans": [{"name":"A1","beds":1,"baths":1,"sqft":750,"rent_min":1200,"rent_max":1400}],
  "specials": [{"text":"$500 off first month","expires":"2025-01-31","confidence":0.9}]
}
For specials: Extract move-in specials, rent concessions, free months, waived fees. Include expiration date if mentioned (YYYY-MM-DD format). Set confidence 0.9 if clear current offer, 0.7 if might be outdated, 0.5 if uncertain.` },
                { role: 'user', content: combinedContent }],
                temperature: 0.3
            })
        });
        if (!response.ok) return { floorPlans: [], specials: [] };
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) { console.error('[AI Extract]', e.message); }
    return { floorPlans: [], specials: [] };
}

async function scrapeForUnits(leasingUrl, browserlessToken, openaiKey, propertyName) {
    const urls = [leasingUrl, leasingUrl.replace(/\/$/, '') + '/floor-plans', leasingUrl.replace(/\/$/, '') + '/floorplans', leasingUrl.replace(/\/$/, '') + '/specials'];
    let allText = '', allImages = [];
    for (const url of urls) {
        try {
            console.log(`[Browserless] Trying: ${url}`);
            const response = await fetch(`https://chrome.browserless.io/content?token=${browserlessToken}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, waitFor: 3000 })
            });
            if (!response.ok) continue;
            const html = await response.text();
            if (html.length < 1000) continue;

            // Extract text
            const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000);
            allText += `\n--- ${url} ---\n${textContent}`;

            // Extract images from HTML
            const imgMatches = html.match(/src=["']([^"']+(?:floor|plan|unit|bedroom)[^"']*\.(?:jpg|png|webp))["']/gi) || [];
            allImages.push(...imgMatches.map(m => m.match(/src=["']([^"']+)["']/)?.[1]).filter(Boolean));
        } catch (e) { console.error(`[Browserless] ${url}:`, e.message); }
    }
    // Extract both units and specials from all scraped content
    const extracted = await extractUnitsAndSpecials(allText, allText, propertyName, openaiKey);
    return { ...extracted, images: allImages };
}

export async function smartUnitSearch({ propertyId, propertyName, leasingUrl, city, googleDataId }) {
    const serpApiKey = process.env.SERP_API_KEY, openaiKey = process.env.OPENAI_API_KEY, browserlessToken = process.env.BROWSERLESS_TOKEN;
    console.log(`\n${'='.repeat(50)}\n[Smart Unit Search] ${propertyName}\n${'='.repeat(50)}`);

    const results = { propertyId, propertyName, floorPlans: [], specials: [], units: [], images: { floorPlans: [], units: [] }, videos: [], reviews: [], sources: [], steps: {} };

    // STEP 1: SerpAPI Blitz (parallel: YouTube, Images, Reviews, AND Specials)
    console.log(`[Step 1] 🚀 SerpAPI Blitz...`);
    results.steps.serpapi = { started: new Date().toISOString() };
    if (serpApiKey) {
        const [youtubeData, floorPlanImages, unitImages, reviews, specialsSnippets] = await Promise.all([
            searchYouTube(propertyName, city || 'San Antonio', serpApiKey),
            searchFloorPlanImages(propertyName, city || 'San Antonio', serpApiKey),
            searchUnitTypeImages(propertyName, city || 'San Antonio', serpApiKey),
            googleDataId ? getGoogleReviews(googleDataId, serpApiKey) : Promise.resolve([]),
            searchSpecials(propertyName, city || 'San Antonio', serpApiKey)
        ]);
        results.videos = youtubeData.videos || [];
        results.images.floorPlans = floorPlanImages || [];
        results.images.units = unitImages || [];
        results.reviews = reviews || [];
        results.steps.serpapi.textContent = [...(youtubeData.descriptions || []), ...reviews.map(r => r.text).filter(Boolean)].join('\n\n');
        results.steps.serpapi.specialsContent = specialsSnippets.join('\n');
        results.sources.push('serpapi');
        console.log(`[Step 1] Found: ${results.videos.length} videos, ${results.images.floorPlans.length} floor plan images, ${results.reviews.length} reviews, ${specialsSnippets.length} specials snippets`);
    }
    results.steps.serpapi.completed = new Date().toISOString();

    // STEP 2: AI Analysis (extract BOTH floor plans AND specials)
    console.log(`[Step 2] 🧠 AI Analysis...`);
    const hasUnitContent = results.steps.serpapi.textContent?.length > 50;
    const hasSpecialsContent = results.steps.serpapi.specialsContent?.length > 20;
    if (openaiKey && (hasUnitContent || hasSpecialsContent)) {
        const extracted = await extractUnitsAndSpecials(results.steps.serpapi.textContent || '', results.steps.serpapi.specialsContent || '', propertyName, openaiKey);
        if (extracted.floorPlans?.length > 0) { results.floorPlans = extracted.floorPlans; results.sources.push('ai_extraction'); console.log(`[Step 2] ✅ Extracted ${extracted.floorPlans.length} floor plans`); }
        if (extracted.specials?.length > 0) { results.specials = extracted.specials; console.log(`[Step 2] 🔥 Found ${extracted.specials.length} specials`); }
    }

    // STEP 3: Browserless (only if missing floor plans OR specials)
    const needsBrowserless = results.floorPlans.length === 0 || results.specials.length === 0;
    if (needsBrowserless && leasingUrl && browserlessToken) {
        console.log(`[Step 3] 🌐 Browserless (need: ${results.floorPlans.length === 0 ? 'floor plans' : ''}${results.specials.length === 0 ? ' specials' : ''})...`);
        const scrapeResult = await scrapeForUnits(leasingUrl, browserlessToken, openaiKey, propertyName);
        if (scrapeResult.floorPlans?.length > 0 && results.floorPlans.length === 0) {
            results.floorPlans = scrapeResult.floorPlans; results.sources.push('browserless');
            console.log(`[Step 3] ✅ Scraped ${scrapeResult.floorPlans.length} floor plans`);
        }
        if (scrapeResult.specials?.length > 0 && results.specials.length === 0) {
            results.specials = scrapeResult.specials;
            console.log(`[Step 3] 🔥 Scraped ${scrapeResult.specials.length} specials`);
        }
        if (scrapeResult.images?.length > 0) results.images.floorPlans.push(...scrapeResult.images);
    } else if (!needsBrowserless) { console.log(`[Step 3] ⏭️ Skipped - already have floor plans and specials`); }

    console.log(`\n[Complete] Floor Plans: ${results.floorPlans.length}, Specials: ${results.specials.length}, Videos: ${results.videos.length}, Sources: ${results.sources.join(', ')}\n`);
    return results;
}

