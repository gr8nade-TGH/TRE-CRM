/**
 * Contact Info Scanner API
 *
 * Uses SerpAPI Google Local to find Phone, Email, and Website
 * for properties missing contact info.
 *
 * GET  /api/property/scan-contacts - Get stats on properties missing contact info
 * POST /api/property/scan-contacts - Scan next property and update contact info
 */

import { createClient } from '@supabase/supabase-js';

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

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
            const missingPhone = allProps.filter(p => !p.contact_phone || p.contact_phone === '').length;
            const missingEmail = allProps.filter(p => !p.contact_email || p.contact_email === '').length;
            const missingWebsite = allProps.filter(p => !p.website || p.website === '').length;
            const missingAny = allProps.filter(p =>
                (!p.contact_phone || p.contact_phone === '') ||
                (!p.contact_email || p.contact_email === '') ||
                (!p.website || p.website === '')
            ).length;

            return res.status(200).json({
                success: true,
                stats: {
                    totalProperties: total,
                    missingPhone,
                    missingEmail,
                    missingWebsite,
                    missingAny,
                    hasAllContact: total - missingAny,
                    percentComplete: Math.round(((total - missingAny) / total) * 100)
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
                .select('id, name, community_name, city, state, street_address, contact_phone, contact_email, website')
                .or('contact_phone.is.null,contact_email.is.null,website.is.null')
                .not('name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            if (!property) {
                // Try properties without names as fallback
                const { data: fallback } = await supabase
                    .from('properties')
                    .select('id, name, community_name, city, state, street_address, contact_phone, contact_email, website')
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
            }

            const prop = property || fallback;
            const propertyName = prop.community_name || prop.name || prop.street_address;
            const city = prop.city || 'San Antonio';
            const state = prop.state || 'TX';

            console.log(`[Contact Scan] Searching for: ${propertyName}, ${city} ${state}`);

            // Search Google Local for contact info
            const contactInfo = await searchContactInfo(propertyName, city, state, serpApiKey);

            // Build update object (only update missing fields)
            const updates = {};
            const found = [];

            if (contactInfo.phone && (!prop.contact_phone || prop.contact_phone === '')) {
                updates.contact_phone = contactInfo.phone;
                found.push(`📞 ${contactInfo.phone}`);
            }

            if (contactInfo.email && (!prop.contact_email || prop.contact_email === '')) {
                updates.contact_email = contactInfo.email;
                found.push(`📧 ${contactInfo.email}`);
            }

            if (contactInfo.website && (!prop.website || prop.website === '')) {
                updates.website = contactInfo.website;
                found.push(`🌐 ${contactInfo.website}`);
            }

            if (Object.keys(updates).length === 0) {
                // Nothing new found, but mark as checked
                await supabase
                    .from('properties')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', prop.id);

                return res.status(200).json({
                    success: true,
                    property: propertyName,
                    propertyId: prop.id,
                    updated: false,
                    message: 'No new contact info found'
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
 * Search for contact info using SerpAPI Google Local
 */
async function searchContactInfo(propertyName, city, state, serpApiKey) {
    const result = { phone: null, email: null, website: null };

    try {
        const query = `${propertyName} apartments`;
        const location = `${city}, ${state}`;

        const params = new URLSearchParams({
            engine: 'google_local',
            q: query,
            location: location,
            api_key: serpApiKey
        });

        console.log(`[Contact Scan] SerpAPI query: ${query} in ${location}`);

        const response = await fetch(`${SERPAPI_BASE_URL}?${params}`);
        const data = await response.json();

        if (data.error) {
            console.error('[Contact Scan] SerpAPI error:', data.error);
            return result;
        }

        const localResults = data.local_results || [];
        console.log(`[Contact Scan] Found ${localResults.length} local results`);

        if (localResults.length === 0) {
            return result;
        }

        // Get the best match (first result)
        const match = localResults[0];
        console.log(`[Contact Scan] Best match: ${match.title}`);

        // Extract phone
        if (match.phone) {
            result.phone = match.phone;
        }

        // Extract website (skip aggregators)
        if (match.website) {
            const url = match.website.toLowerCase();
            const skipDomains = ['apartments.com', 'zillow.com', 'rent.com', 'realtor.com', 'trulia.com', 'apartmentguide.com', 'forrent.com'];
            const isAggregator = skipDomains.some(d => url.includes(d));
            if (!isAggregator) {
                result.website = match.website;
            }
        }

        // Try to extract email from description or other fields
        const textToSearch = [match.description, match.snippet].filter(Boolean).join(' ');
        const emailMatch = textToSearch.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
            result.email = emailMatch[0];
        }

        return result;

    } catch (error) {
        console.error('[Contact Scan] Search error:', error);
        return result;
    }
}

