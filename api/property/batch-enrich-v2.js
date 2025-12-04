/**
 * Batch Enrichment API v2 - Two-Phase Property + Unit Enrichment
 *
 * Phase 1: Property Data (rent, amenities, photos, contact)
 * Phase 2: Unit Data (floor plans, availability, unit images)
 *
 * Uses multiple SerpAPI endpoints:
 * - Google Local API: Business data
 * - Google Images API: Property + floor plan photos
 * - Google Maps Reviews API: Resident insights
 * - YouTube Search API: Property video tours
 *
 * Safe Re-Enrichment: Only overwrites NULL/empty fields
 */

import { createClient } from '@supabase/supabase-js';
import { enrichProperty } from '../lib/ai-enrichment.js';
import { smartUnitSearch } from '../lib/smart-unit-search.js';

export const config = {
    maxDuration: 300  // 5 minutes max
};

const SERPAPI_BASE = 'https://serpapi.com/search.json';

/**
 * Search YouTube for property tour videos
 */
async function searchYouTubeTours(propertyName, city, serpApiKey) {
    if (!propertyName || !serpApiKey) return [];

    try {
        const query = `"${propertyName}" apartment tour ${city}`;
        const params = new URLSearchParams({
            engine: 'youtube',
            search_query: query,
            api_key: serpApiKey
        });

        const response = await fetch(`${SERPAPI_BASE}?${params}`);
        if (!response.ok) return [];

        const data = await response.json();
        const videos = (data.video_results || []).slice(0, 3);

        return videos.map(v => ({
            title: v.title,
            link: v.link,
            thumbnail: v.thumbnail?.static,
            duration: v.length?.text,
            channel: v.channel?.name
        }));
    } catch (error) {
        console.error('[YouTube Search] Error:', error.message);
        return [];
    }
}

// NOTE: Floor plan images, unit images, and reviews are now handled by smartUnitSearch

/**
 * Check if a field should be updated (safe re-enrichment)
 * Only overwrites if current value is null/empty/invalid
 */
function shouldUpdate(currentValue, newValue, forceUpdate = false) {
    if (forceUpdate) return newValue != null;

    // Current value is empty/null - safe to update
    if (currentValue === null || currentValue === undefined) return true;
    if (typeof currentValue === 'string' && currentValue.trim() === '') return true;
    if (Array.isArray(currentValue) && currentValue.length === 0) return true;

    // Current value exists - don't overwrite
    return false;
}

/**
 * Build safe update object - only includes fields that should be updated
 */
function buildSafeUpdate(currentData, suggestions, forceFields = []) {
    const updates = {};

    for (const [field, suggestion] of Object.entries(suggestions)) {
        if (suggestion.confidence < 0.6) continue;

        const force = forceFields.includes(field);
        if (shouldUpdate(currentData[field], suggestion.value, force)) {
            updates[field] = suggestion.value;
        }
    }

    return updates;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // GET - Return status and counts
    if (req.method === 'GET') {
        const [pending, enriched, withUnits] = await Promise.all([
            supabase.from('properties').select('*', { count: 'exact', head: true }).eq('enrichment_status', 'pending'),
            supabase.from('properties').select('*', { count: 'exact', head: true }).eq('enrichment_status', 'enriched'),
            supabase.from('floor_plans').select('property_id', { count: 'exact', head: true })
        ]);

        return res.status(200).json({
            pending: pending.count || 0,
            enriched: enriched.count || 0,
            withFloorPlans: withUnits.count || 0,
            configured: !!(process.env.OPENAI_API_KEY && process.env.BROWSERLESS_TOKEN)
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        phase = 'property',  // 'property' | 'units' | 'both'
        limit = 5,
        forceUpdate = false,  // If true, overwrites existing data
        forceFields = []      // Specific fields to force update
    } = req.body;

    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    if (!openaiKey || !browserlessToken) {
        return res.status(503).json({
            error: 'Enrichment not configured',
            message: 'Missing OPENAI_API_KEY or BROWSERLESS_TOKEN'
        });
    }

    try {
        // Get properties to process based on phase
        let query = supabase.from('properties').select('*');

        if (phase === 'property' || phase === 'both') {
            // Phase 1: Get pending properties
            query = query.eq('enrichment_status', 'pending');
        } else if (phase === 'units') {
            // Phase 2: Get enriched properties that have leasing_link but no floor plans yet
            query = query.eq('enrichment_status', 'enriched').not('leasing_link', 'is', null);
        }

        const { data: properties, error: fetchError } = await query.limit(limit);

        if (fetchError) {
            return res.status(500).json({ error: fetchError.message });
        }

        if (!properties || properties.length === 0) {
            return res.status(200).json({
                message: 'No properties to process',
                phase,
                processed: 0
            });
        }

        console.log(`[Batch Enrich v2] Processing ${properties.length} properties (phase: ${phase})`);

        const results = [];
        let enriched = 0;
        let unitsFound = 0;

        for (const prop of properties) {
            const result = { id: prop.id, name: prop.name, phases: {} };

            try {
                // ============ PHASE 1: PROPERTY ENRICHMENT ============
                if (phase === 'property' || phase === 'both') {
                    console.log(`[Phase 1] Enriching: ${prop.name}`);

                    const enrichResult = await enrichProperty(prop);

                    if (enrichResult.suggestions && Object.keys(enrichResult.suggestions).length > 0) {
                        const updates = buildSafeUpdate(prop, enrichResult.suggestions, forceFields);

                        if (Object.keys(updates).length > 0) {
                            updates.enrichment_status = 'enriched';
                            updates.enriched_at = new Date().toISOString();

                            await supabase.from('properties').update(updates).eq('id', prop.id);
                            enriched++;
                            result.phases.property = { status: 'enriched', fieldsUpdated: Object.keys(updates) };
                        } else {
                            await supabase.from('properties').update({ enrichment_status: 'reviewed' }).eq('id', prop.id);
                            result.phases.property = { status: 'no_new_data' };
                        }
                    } else {
                        await supabase.from('properties').update({ enrichment_status: 'reviewed' }).eq('id', prop.id);
                        result.phases.property = { status: 'no_data_found' };
                    }

                    // Bonus: Search YouTube for tours
                    if (serpApiKey && prop.name) {
                        const videos = await searchYouTubeTours(prop.name, prop.city || 'San Antonio', serpApiKey);
                        if (videos.length > 0) {
                            result.phases.youtube = { found: videos.length, videos };
                        }
                    }
                }

                // ============ PHASE 2: UNIT DISCOVERY (Smart 3-Step) ============
                if ((phase === 'units' || phase === 'both') && prop.leasing_link) {
                    console.log(`[Phase 2] Smart Unit Search: ${prop.name}`);

                    // Use smart 3-step unit search: SerpAPI → AI Analysis → Browserless (if needed)
                    const unitResult = await smartUnitSearch({
                        propertyId: prop.id,
                        propertyName: prop.name,
                        leasingUrl: prop.leasing_link,
                        city: prop.city || 'San Antonio',
                        googleDataId: prop.google_data_id
                    });

                    // Insert floor plans into database
                    if (unitResult.floorPlans && unitResult.floorPlans.length > 0) {
                        for (const fp of unitResult.floorPlans) {
                            const { data: existing } = await supabase
                                .from('floor_plans')
                                .select('id')
                                .eq('property_id', prop.id)
                                .eq('name', fp.name)
                                .single();

                            if (!existing) {
                                await supabase.from('floor_plans').insert({
                                    property_id: prop.id,
                                    name: fp.name,
                                    bedrooms: fp.beds,
                                    bathrooms: fp.baths,
                                    square_feet: fp.sqft,
                                    market_rent: fp.rent_max || fp.rent_min,
                                    starting_at: fp.rent_min,
                                    image_url: fp.image_url || unitResult.images?.floorPlans?.[0]?.url || null
                                });
                            }
                        }
                        unitsFound += unitResult.floorPlans.length;
                        result.phases.units = {
                            status: 'found',
                            floorPlans: unitResult.floorPlans.length,
                            sources: unitResult.sources,
                            videos: unitResult.videos?.length || 0,
                            reviews: unitResult.reviews?.length || 0
                        };
                    } else {
                        result.phases.units = {
                            status: 'none_found',
                            videosFound: unitResult.videos?.length || 0,
                            imagesFound: unitResult.images?.floorPlans?.length || 0
                        };
                    }

                    // Store YouTube video links if found
                    if (unitResult.videos?.length > 0) {
                        result.phases.videos = unitResult.videos.slice(0, 3);
                    }

                    // ============ STORE DISCOVERED SPECIALS ============
                    if (unitResult.specials && unitResult.specials.length > 0) {
                        console.log(`[Specials] Found ${unitResult.specials.length} specials for ${prop.name}`);

                        for (const special of unitResult.specials) {
                            // Check if this special already exists (avoid duplicates)
                            const { data: existing } = await supabase
                                .from('property_specials')
                                .select('id')
                                .eq('property_id', prop.id)
                                .ilike('special_text', `%${special.text.slice(0, 30)}%`)
                                .single();

                            if (!existing) {
                                await supabase.from('property_specials').insert({
                                    property_id: prop.id,
                                    special_text: special.text,
                                    source: unitResult.sources.includes('browserless') ? 'browserless' : 'serpapi',
                                    discovered_at: new Date().toISOString(),
                                    expires_at: special.expires ? new Date(special.expires).toISOString() : null,
                                    is_active: true,
                                    confidence: special.confidence || 0.8
                                });
                                console.log(`[Specials] ✅ Saved: "${special.text.slice(0, 50)}..."`);
                            }
                        }

                        result.phases.specials = {
                            found: unitResult.specials.length,
                            specials: unitResult.specials
                        };
                    }
                }

                results.push(result);

            } catch (err) {
                console.error(`[Batch Enrich v2] Error for ${prop.name}:`, err.message);
                results.push({ ...result, error: err.message });

                await supabase.from('properties').update({ enrichment_status: 'failed' }).eq('id', prop.id);
            }
        }

        // Get remaining counts
        const { count: remaining } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('enrichment_status', phase === 'units' ? 'enriched' : 'pending');

        return res.status(200).json({
            success: true,
            phase,
            processed: properties.length,
            enriched,
            unitsFound,
            remaining: remaining || 0,
            results
        });

    } catch (error) {
        console.error('[Batch Enrich v2] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serpApiKey = process.env.SERP_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
}

const supabase = createClient(supabaseUrl, supabaseKey);

