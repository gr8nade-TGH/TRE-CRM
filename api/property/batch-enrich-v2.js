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

// NOTE: YouTube search removed - data wasn't being saved and wasted API calls
// Floor plan images, unit images, and reviews are handled by smartUnitSearch

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

// Valid database columns - only these will be saved
const VALID_DB_COLUMNS = new Set([
    'name', 'description', 'neighborhood', 'amenities', 'rent_min', 'rent_max',
    'beds_min', 'beds_max', 'baths_min', 'baths_max', 'sqft_min', 'sqft_max',
    'specials_text', 'pet_policy', 'contact_phone', 'contact_email', 'contact_name',
    'office_hours', 'leasing_link', 'website', 'photos', 'management_company',
    'enrichment_status', 'enriched_at'
]);

// Field name mapping (AI field -> DB column)
const FIELD_MAPPING = {
    'amenities_tags': 'amenities',  // amenities_tags should save to amenities column
};

/**
 * Build safe update object - only includes fields that should be updated
 */
function buildSafeUpdate(currentData, suggestions, forceFields = []) {
    const updates = {};

    for (const [field, suggestion] of Object.entries(suggestions)) {
        if (suggestion.confidence < 0.6) continue;

        // Map field name to DB column if needed
        const dbColumn = FIELD_MAPPING[field] || field;

        // Skip fields that don't exist in the database
        if (!VALID_DB_COLUMNS.has(dbColumn)) {
            console.log(`[buildSafeUpdate] Skipping unknown column: ${field} -> ${dbColumn}`);
            continue;
        }

        const force = forceFields.includes(field);
        if (shouldUpdate(currentData[dbColumn], suggestion.value, force)) {
            updates[dbColumn] = suggestion.value;
        }
    }

    return updates;
}

// Initialize Supabase client at module level
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serpApiKey = process.env.SERP_API_KEY;

function getSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase not configured');
    }
    // Use service role key with auth bypass to skip RLS policies
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Initialize supabase for this request
    let supabase;
    try {
        supabase = getSupabase();
    } catch (e) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    // GET - Return status and counts
    if (req.method === 'GET') {
        try {
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
        } catch (error) {
            console.error('[batch-enrich-v2 GET] Error:', error);
            return res.status(500).json({ error: 'Failed to get status', message: error.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        phase = 'property',  // 'property' | 'units' | 'both'
        limit = 5,
        forceUpdate = false,  // If true, overwrites existing data
        forceFields = [],     // Specific fields to force update
        area = null,          // Filter by discovery_area
        propertyIds = null,   // Specific property IDs to process
        overrideUrl = null    // Override URL for unit scanning (when URL entered manually)
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
        let properties;

        // If specific property IDs provided, fetch those directly
        if (propertyIds && propertyIds.length > 0) {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .in('id', propertyIds);

            if (error) {
                return res.status(500).json({ error: error.message });
            }
            properties = data;
        } else {
            // Get properties to process based on phase
            let query = supabase.from('properties').select('*');

            if (phase === 'property' || phase === 'both') {
                // Phase 1: Get pending properties
                query = query.eq('enrichment_status', 'pending');
            } else if (phase === 'units') {
                // Phase 2: Get enriched properties that have leasing_link but no floor plans yet
                query = query.eq('enrichment_status', 'enriched').not('leasing_link', 'is', null);
            }

            // Filter by area if specified
            if (area) {
                query = query.eq('discovery_area', area);
            }

            const { data, error: fetchError } = await query.limit(limit);

            if (fetchError) {
                return res.status(500).json({ error: fetchError.message });
            }
            properties = data;
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

                            console.log(`[Enrich] Updating ${prop.id} with:`, JSON.stringify(Object.keys(updates)));

                            const { data: updateData, error: updateError } = await supabase
                                .from('properties')
                                .update(updates)
                                .eq('id', prop.id)
                                .select('id, enrichment_status');

                            if (updateError) {
                                console.error(`[Enrich] Update FAILED for ${prop.id}:`, updateError);
                                result.phases.property = { status: 'update_failed', error: updateError.message };
                            } else if (!updateData || updateData.length === 0) {
                                console.error(`[Enrich] Update returned NO DATA for ${prop.id} - row not found?`);
                                result.phases.property = { status: 'update_failed', error: 'No rows updated' };
                            } else {
                                console.log(`[Enrich] SUCCESS - ${prop.id} now has status: ${updateData[0].enrichment_status}`);
                                enriched++;
                                result.phases.property = { status: 'enriched', fieldsUpdated: Object.keys(updates) };
                            }
                        } else {
                            const { error: reviewError } = await supabase
                                .from('properties')
                                .update({ enrichment_status: 'reviewed' })
                                .eq('id', prop.id);

                            if (reviewError) {
                                console.error(`[Enrich] Review status update failed for ${prop.id}:`, reviewError);
                            }
                            result.phases.property = { status: 'no_new_data' };
                        }
                    } else {
                        const { error: reviewError } = await supabase
                            .from('properties')
                            .update({ enrichment_status: 'reviewed' })
                            .eq('id', prop.id);

                        if (reviewError) {
                            console.error(`[Enrich] Review status update failed for ${prop.id}:`, reviewError);
                        }
                        result.phases.property = { status: 'no_data_found' };
                    }
                }

                // ============ PHASE 2: UNIT DISCOVERY (Smart 3-Step) ============
                // Use overrideUrl if provided, otherwise fall back to leasing_link
                const unitScanUrl = overrideUrl || prop.leasing_link;
                if ((phase === 'units' || phase === 'both') && unitScanUrl) {
                    console.log(`[Phase 2] Smart Unit Search: ${prop.name} at ${unitScanUrl}`);

                    // Use smart 3-step unit search: SerpAPI → AI Analysis → Browserless (if needed)
                    const unitResult = await smartUnitSearch({
                        propertyId: prop.id,
                        propertyName: prop.name,
                        leasingUrl: unitScanUrl,
                        city: prop.city || 'San Antonio',
                        googleDataId: prop.google_data_id
                    });

                    // Save the URL to the property if it was manually provided
                    if (overrideUrl && !prop.leasing_link) {
                        await supabase.from('properties').update({ leasing_link: overrideUrl }).eq('id', prop.id);
                    }

                    // Insert floor plans into database and build a map for unit linking
                    const floorPlanMap = {}; // name -> id
                    if (unitResult.floorPlans && unitResult.floorPlans.length > 0) {
                        for (const fp of unitResult.floorPlans) {
                            const { data: existing } = await supabase
                                .from('floor_plans')
                                .select('id')
                                .eq('property_id', prop.id)
                                .eq('name', fp.name)
                                .single();

                            if (!existing) {
                                const { data: inserted, error: fpError } = await supabase.from('floor_plans').insert({
                                    property_id: prop.id,
                                    name: fp.name,
                                    beds: fp.beds,
                                    baths: fp.baths,
                                    sqft: fp.sqft,
                                    market_rent: fp.rent_max || fp.rent_min,
                                    starting_at: fp.rent_min,
                                    units_available: fp.units_available || 0,
                                    image_url: fp.image_url || unitResult.images?.floorPlans?.[0]?.url || null
                                }).select('id').single();

                                if (fpError) {
                                    console.error(`[FloorPlan Insert Error] ${prop.name}:`, fpError.message);
                                } else {
                                    console.log(`[FloorPlan Saved] ${prop.name} - ${fp.name}`);
                                    floorPlanMap[fp.name] = inserted.id;
                                }
                            } else {
                                floorPlanMap[fp.name] = existing.id;
                            }
                        }
                    }

                    // Insert individual units and link to floor plans
                    let unitsInserted = 0;
                    if (unitResult.units && unitResult.units.length > 0) {
                        console.log(`[Units] Found ${unitResult.units.length} individual units for ${prop.name}`);

                        for (const unit of unitResult.units) {
                            // Find matching floor plan ID
                            let floorPlanId = null;
                            if (unit.floor_plan_name) {
                                // Try exact match first
                                floorPlanId = floorPlanMap[unit.floor_plan_name];
                                // Try partial match if no exact match
                                if (!floorPlanId) {
                                    const fpName = Object.keys(floorPlanMap).find(name =>
                                        name.toLowerCase().includes(unit.floor_plan_name.toLowerCase()) ||
                                        unit.floor_plan_name.toLowerCase().includes(name.toLowerCase())
                                    );
                                    if (fpName) floorPlanId = floorPlanMap[fpName];
                                }
                            }

                            // Check if unit already exists
                            const { data: existingUnit } = await supabase
                                .from('units')
                                .select('id')
                                .eq('property_id', prop.id)
                                .eq('unit_number', unit.unit_number)
                                .single();

                            if (!existingUnit) {
                                const { error: unitError } = await supabase.from('units').insert({
                                    property_id: prop.id,
                                    floor_plan_id: floorPlanId,
                                    unit_number: unit.unit_number,
                                    floor: unit.floor || null,
                                    rent: unit.rent || null,
                                    market_rent: unit.market_rent || unit.rent || null,
                                    available_from: unit.available_from || null,
                                    is_available: true,
                                    status: 'available'
                                });

                                if (unitError) {
                                    console.error(`[Unit Insert Error] ${prop.name} - ${unit.unit_number}:`, unitError.message);
                                } else {
                                    console.log(`[Unit Saved] ${prop.name} - Unit ${unit.unit_number} (FP: ${unit.floor_plan_name || 'unknown'})`);
                                    unitsInserted++;
                                }
                            }
                        }
                    }

                    unitsFound += unitResult.floorPlans?.length || 0;
                    result.phases.units = unitResult.floorPlans?.length > 0 || unitsInserted > 0 ? {
                        status: 'found',
                        floorPlans: unitResult.floorPlans?.length || 0,
                        units: unitsInserted,
                        sources: unitResult.sources,
                        videos: unitResult.videos?.length || 0,
                        reviews: unitResult.reviews?.length || 0
                    } : {
                        status: 'none_found',
                        videosFound: unitResult.videos?.length || 0,
                        imagesFound: unitResult.images?.floorPlans?.length || 0
                    };

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

                    // Mark property as unit-scanned so it doesn't get re-processed
                    await supabase.from('properties').update({
                        enrichment_status: 'units_scanned',
                        units_scanned_at: new Date().toISOString()
                    }).eq('id', prop.id);
                }

                results.push(result);

            } catch (err) {
                console.error(`[Batch Enrich v2] Error for ${prop.name}:`, err.message);
                results.push({ ...result, error: err.message });

                await supabase.from('properties').update({ enrichment_status: 'failed' }).eq('id', prop.id);
            }
        }

        // Get remaining counts (respecting area filter)
        let remainingQuery = supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('enrichment_status', phase === 'units' ? 'enriched' : 'pending');

        if (area) {
            remainingQuery = remainingQuery.eq('discovery_area', area);
        }

        const { count: remaining } = await remainingQuery;

        return res.status(200).json({
            success: true,
            phase,
            area: area || 'all',
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
