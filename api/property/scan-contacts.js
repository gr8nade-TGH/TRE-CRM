/**
 * Contact Info Scanner API
 *
 * Uses multiple SerpAPI engines to find Phone, Email, and Website
 * for properties missing contact info.
 *
 * Strategy:
 * 1. Google Maps search for direct business data (most reliable for phone/website)
 * 2. Google search for backup + email extraction
 *
 * GET  /api/property/scan-contacts - Get stats on properties missing contact info
 * POST /api/property/scan-contacts - Scan next property and update contact info
 */

import { createClient } from '@supabase/supabase-js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Domains to skip (aggregators, not property websites)
const SKIP_DOMAINS = [
    'apartments.com', 'zillow.com', 'rent.com', 'realtor.com', 'trulia.com',
    'apartmentguide.com', 'forrent.com', 'hotpads.com', 'zumper.com',
    'padmapper.com', 'rentcafe.com', 'facebook.com', 'yelp.com'
];

export default async function handler(req, res) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serpApiKey = process.env.SERP_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET: Return stats on properties missing contact info
    if (req.method === 'GET') {
        try {
            const { data: allProps, error } = await supabase
                .from('properties')
                .select('id, contact_phone, contact_email, website');

            if (error) throw error;

            const total = allProps.length;

            // Count properties with actual data (not null, not empty string)
            const hasPhone = allProps.filter(p => p.contact_phone && p.contact_phone !== '').length;
            const hasEmail = allProps.filter(p => p.contact_email && p.contact_email !== '').length;
            const hasWebsite = allProps.filter(p => p.website && p.website !== '').length;

            // Count properties that haven't been scanned yet (NULL values only)
            const needsScanPhone = allProps.filter(p => p.contact_phone === null).length;
            const needsScanEmail = allProps.filter(p => p.contact_email === null).length;
            const needsScanWebsite = allProps.filter(p => p.website === null).length;

            // Properties that still need to be scanned (have at least one NULL field)
            const needsScan = allProps.filter(p =>
                p.contact_phone === null ||
                p.contact_email === null ||
                p.website === null
            ).length;

            return res.status(200).json({
                success: true,
                stats: {
                    totalProperties: total,
                    hasPhone,
                    hasEmail,
                    hasWebsite,
                    needsScan,
                    needsScanPhone,
                    needsScanEmail,
                    needsScanWebsite,
                    missingPhone: total - hasPhone,
                    missingEmail: total - hasEmail,
                    missingWebsite: total - hasWebsite,
                    percentComplete: Math.round((hasPhone / total) * 100)
                }
            });
        } catch (error) {
            console.error('[Contact Scan] GET error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST: Scan next property for contact info
    if (req.method === 'POST') {
        if (!serpApiKey) {
            return res.status(500).json({ error: 'SERP_API_KEY not configured' });
        }

        try {
            // Get next property missing contact info (prioritize those with names)
            const { data: property, error: fetchError } = await supabase
                .from('properties')
                .select('id, name, community_name, city, state, street_address, address, contact_phone, contact_email, website')
                .or('contact_phone.is.null,contact_email.is.null,website.is.null')
                .not('name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            let prop = property;

            if (!prop) {
                // Try properties without names as fallback
                const { data: fallback } = await supabase
                    .from('properties')
                    .select('id, name, community_name, city, state, street_address, address, contact_phone, contact_email, website')
                    .or('contact_phone.is.null,contact_email.is.null,website.is.null')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!fallback) {
                    return res.status(200).json({
                        success: true,
                        done: true,
                        message: 'All properties have contact info!'
                    });
                }
                prop = fallback;
            }

            const propertyName = prop.community_name || prop.name || prop.street_address;
            const city = prop.city || 'San Antonio';
            const state = prop.state || 'TX';
            const address = prop.street_address || prop.address || '';

            console.log(`[Contact Scan] Searching for: ${propertyName}, ${city} ${state}`);

            // Search using multiple strategies
            const contactInfo = await searchContactInfoMultiStrategy(propertyName, address, city, state, serpApiKey);

            // Build update object (only update missing fields)
            const updates = {};
            const found = [];

            if (contactInfo.phone && prop.contact_phone === null) {
                updates.contact_phone = contactInfo.phone;
                found.push(`📞 ${contactInfo.phone}`);
            }

            if (contactInfo.email && prop.contact_email === null) {
                updates.contact_email = contactInfo.email;
                found.push(`📧 ${contactInfo.email}`);
            }

            if (contactInfo.website && prop.website === null) {
                updates.website = contactInfo.website;
                found.push(`🌐 ${contactInfo.website}`);
            }

            if (Object.keys(updates).length === 0) {
                // Nothing found - mark as checked with empty strings
                const markAsChecked = { updated_at: new Date().toISOString() };
                if (prop.contact_phone === null) markAsChecked.contact_phone = '';
                if (prop.contact_email === null) markAsChecked.contact_email = '';
                if (prop.website === null) markAsChecked.website = '';

                await supabase
                    .from('properties')
                    .update(markAsChecked)
                    .eq('id', prop.id);

                return res.status(200).json({
                    success: true,
                    property: propertyName,
                    propertyId: prop.id,
                    updated: false,
                    message: 'No new contact info found',
                    debug: contactInfo.debug
                });
            }

            // Update property
            updates.updated_at = new Date().toISOString();
            const { error: updateError } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', prop.id);

            if (updateError) throw updateError;

            console.log(`[Contact Scan] Updated ${propertyName}: ${found.join(', ')}`);

            return res.status(200).json({
                success: true,
                property: propertyName,
                propertyId: prop.id,
                updated: true,
                found,
                phone: contactInfo.phone,
                email: contactInfo.email,
                website: contactInfo.website
            });

        } catch (error) {
            console.error('[Contact Scan] POST error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Multi-strategy contact info search
 * 1. Google Maps search (best for phone/website)
 * 2. Regular Google search (backup + knowledge graph)
 */
async function searchContactInfoMultiStrategy(propertyName, address, city, state, serpApiKey) {
    const result = { phone: null, email: null, website: null, debug: {} };

    // Strategy 1: Google Maps search
    console.log('[Contact Scan] Strategy 1: Google Maps search');
    const mapsResult = await searchGoogleMaps(propertyName, city, state, serpApiKey);
    result.debug.maps = mapsResult.debug;

    if (mapsResult.phone) result.phone = mapsResult.phone;
    if (mapsResult.website) result.website = mapsResult.website;

    // Strategy 2: Regular Google search (for knowledge graph and organic results)
    console.log('[Contact Scan] Strategy 2: Google search');
    const googleResult = await searchGoogle(propertyName, address, city, state, serpApiKey);
    result.debug.google = googleResult.debug;

    // Use Google results if Maps didn't find them
    if (!result.phone && googleResult.phone) result.phone = googleResult.phone;
    if (!result.website && googleResult.website) result.website = googleResult.website;
    if (googleResult.email) result.email = googleResult.email;

    console.log(`[Contact Scan] Results: phone=${result.phone}, website=${result.website}, email=${result.email}`);
    return result;
}

/**
 * Search Google Maps for business data
 */
async function searchGoogleMaps(propertyName, city, state, serpApiKey) {
    const result = { phone: null, website: null, debug: {} };

    try {
        const query = `${propertyName} apartments ${city} ${state}`;
        const params = new URLSearchParams({
            engine: 'google_maps',
            q: query,
            type: 'search',
            hl: 'en',
            api_key: serpApiKey
        });

        console.log(`[Contact Scan] Maps query: ${query}`);
        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

        result.debug.query = query;
        result.debug.hasResults = !!(data.local_results?.length || data.place_results);

        if (data.error) {
            console.log(`[Contact Scan] Maps error: ${data.error}`);
            result.debug.error = data.error;
            return result;
        }

        // Check place_results first (direct match)
        if (data.place_results) {
            const place = data.place_results;
            console.log(`[Contact Scan] Maps found place: ${place.title}`);
            result.debug.placeTitle = place.title;

            if (place.phone) {
                result.phone = place.phone;
            }
            if (place.website && !isSkipDomain(place.website)) {
                result.website = place.website;
            }
        }

        // Also check local_results
        if (data.local_results?.length > 0) {
            const local = data.local_results[0];
            console.log(`[Contact Scan] Maps found local: ${local.title}`);
            result.debug.localTitle = local.title;

            if (!result.phone && local.phone) {
                result.phone = local.phone;
            }
            if (!result.website && local.website && !isSkipDomain(local.website)) {
                result.website = local.website;
            }
        }

        return result;
    } catch (error) {
        console.error('[Contact Scan] Maps search error:', error);
        result.debug.error = error.message;
        return result;
    }
}

/**
 * Search regular Google for knowledge graph and organic results
 */
async function searchGoogle(propertyName, address, city, state, serpApiKey) {
    const result = { phone: null, website: null, email: null, debug: {} };

    try {
        // Use address for more accurate results
        const query = address
            ? `"${propertyName}" ${address} ${city} ${state} apartments phone`
            : `"${propertyName}" ${city} ${state} apartments contact`;

        const params = new URLSearchParams({
            engine: 'google',
            q: query,
            num: '10',
            gl: 'us',
            hl: 'en',
            api_key: serpApiKey
        });

        console.log(`[Contact Scan] Google query: ${query}`);
        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

        result.debug.query = query;
        result.debug.hasKnowledgeGraph = !!data.knowledge_graph;
        result.debug.organicCount = data.organic_results?.length || 0;

        if (data.error) {
            console.log(`[Contact Scan] Google error: ${data.error}`);
            result.debug.error = data.error;
            return result;
        }

        // Check knowledge graph first (most reliable)
        if (data.knowledge_graph) {
            const kg = data.knowledge_graph;
            console.log(`[Contact Scan] Knowledge graph: ${kg.title}`);
            result.debug.kgTitle = kg.title;

            if (kg.phone) {
                result.phone = kg.phone;
            }
            if (kg.website && !isSkipDomain(kg.website)) {
                result.website = kg.website;
            }
        }

        // Check organic results for website and email
        for (const organic of data.organic_results || []) {
            // Look for property website
            if (!result.website && organic.link && !isSkipDomain(organic.link)) {
                // Check if this looks like a property website
                const title = (organic.title || '').toLowerCase();
                const link = organic.link.toLowerCase();
                if (title.includes('apartment') || title.includes(propertyName.toLowerCase().split(' ')[0])) {
                    result.website = organic.link;
                    result.debug.websiteSource = 'organic';
                }
            }

            // Look for email in snippets
            if (!result.email) {
                const snippet = organic.snippet || '';
                const emailMatch = snippet.match(/[\w.-]+@[\w.-]+\.(com|net|org|info)/i);
                if (emailMatch && !emailMatch[0].includes('example')) {
                    result.email = emailMatch[0].toLowerCase();
                    result.debug.emailSource = 'snippet';
                }
            }
        }

        // Also check answer box
        if (data.answer_box?.snippet) {
            const snippet = data.answer_box.snippet;
            // Look for phone patterns
            if (!result.phone) {
                const phoneMatch = snippet.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                if (phoneMatch) {
                    result.phone = phoneMatch[0];
                    result.debug.phoneSource = 'answer_box';
                }
            }
        }

        return result;
    } catch (error) {
        console.error('[Contact Scan] Google search error:', error);
        result.debug.error = error.message;
        return result;
    }
}

/**
 * Check if URL is a skip domain (aggregator)
 */
function isSkipDomain(url) {
    if (!url) return true;
    const lowerUrl = url.toLowerCase();
    return SKIP_DOMAINS.some(d => lowerUrl.includes(d));
}

