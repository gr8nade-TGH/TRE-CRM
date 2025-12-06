/**
 * Contact Info Scanner API
 * 
 * Focused endpoint for finding missing Phone, Email, and Website
 * for properties using SerpAPI Local search.
 */

import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 300  // 5 minutes max
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase not configured');
    }
    return createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

/**
 * Search Google Local for business contact info
 */
async function searchGoogleLocal(query, location, apiKey) {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_local');
    url.searchParams.set('q', query);
    url.searchParams.set('location', location);
    url.searchParams.set('api_key', apiKey);

    try {
        const response = await fetch(url.toString());
        const data = await response.json();
        return {
            success: !data.error,
            results: data.local_results || [],
            error: data.error
        };
    } catch (error) {
        return { success: false, results: [], error: error.message };
    }
}

/**
 * Extract contact info from local result
 */
function extractContactInfo(result) {
    const info = {
        phone: null,
        website: null,
        email: null
    };

    // Phone from Google Local
    if (result.phone) {
        info.phone = result.phone;
    }

    // Website - prefer property's own site
    if (result.website) {
        const url = result.website.toLowerCase();
        // Skip aggregator sites
        const skipDomains = ['apartments.com', 'zillow.com', 'rent.com', 'apartment', 'realtor.com', 'trulia.com'];
        const isAggregator = skipDomains.some(d => url.includes(d));
        if (!isAggregator) {
            info.website = result.website;
        }
    }

    // Sometimes email is in description
    if (result.description) {
        const emailMatch = result.description.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
            info.email = emailMatch[0];
        }
    }

    return info;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const serpApiKey = process.env.SERP_API_KEY;
    if (!serpApiKey) {
        return res.status(503).json({ error: 'SerpAPI not configured' });
    }

    let supabase;
    try {
        supabase = getSupabase();
    } catch (e) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    const limit = Math.min(parseInt(req.query.limit || '50'), 100);

    try {
        // Get properties missing contact info (prioritize those with names)
        const { data: properties, error } = await supabase
            .from('properties')
            .select('id, name, street_address, address, city, state, contact_phone, contact_email, website, leasing_link')
            .or('contact_phone.is.null,contact_email.is.null,website.is.null,contact_phone.eq.,contact_email.eq.,website.eq.')
            .not('name', 'is', null)
            .order('name', { ascending: true })
            .limit(limit);

        if (error) throw error;

        console.log(`[Contact Scanner] Found ${properties.length} properties to scan`);

        const results = [];
        let updated = 0;

        for (const prop of properties) {
            const result = { id: prop.id, name: prop.name || prop.address, updated: false };

            try {
                // Build search query
                const searchName = prop.name || prop.street_address || prop.address;
                const location = `${prop.city || 'San Antonio'}, ${prop.state || 'TX'}`;

                console.log(`[Contact Scanner] Searching: ${searchName} in ${location}`);

                // Search Google Local
                const localResults = await searchGoogleLocal(
                    `${searchName} apartments`,
                    location,
                    serpApiKey
                );

                if (!localResults.success || localResults.results.length === 0) {
                    result.error = 'No results found';
                    results.push(result);
                    continue;
                }

                // Get contact info from best match
                const contactInfo = extractContactInfo(localResults.results[0]);

                // Build update object (only update missing fields)
                const updates = {};

                if (contactInfo.phone && (!prop.contact_phone || prop.contact_phone === '')) {
                    updates.contact_phone = contactInfo.phone;
                    result.phone = contactInfo.phone;
                }

                if (contactInfo.email && (!prop.contact_email || prop.contact_email === '')) {
                    updates.contact_email = contactInfo.email;
                    result.email = contactInfo.email;
                }

                if (contactInfo.website && (!prop.website || prop.website === '')) {
                    updates.website = contactInfo.website;
                    result.website = contactInfo.website;
                }

                // Update if we found any new data
                if (Object.keys(updates).length > 0) {
                    updates.updated_at = new Date().toISOString();

                    const { error: updateError } = await supabase
                        .from('properties')
                        .update(updates)
                        .eq('id', prop.id);

                    if (updateError) {
                        result.error = updateError.message;
                    } else {
                        result.updated = true;
                        updated++;
                    }
                }

                results.push(result);

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 200));

            } catch (e) {
                console.error(`[Contact Scanner] Error for ${prop.name}:`, e.message);
                result.error = e.message;
                results.push(result);
            }
        }

        console.log(`[Contact Scanner] Complete: ${updated}/${properties.length} updated`);

        return res.status(200).json({
            scanned: properties.length,
            updated,
            results
        });

    } catch (error) {
        console.error('[Contact Scanner] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

