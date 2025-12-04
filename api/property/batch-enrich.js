/**
 * Batch Enrichment API - Enriches pending properties
 * 
 * GET /api/property/batch-enrich - Get pending properties count
 * POST /api/property/batch-enrich - Enrich next batch of properties
 */

import { createClient } from '@supabase/supabase-js';
import { enrichProperty } from '../lib/ai-enrichment.js';

export const config = {
    maxDuration: 300  // 5 minutes max
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const browserlessToken = process.env.BROWSERLESS_TOKEN;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET - Return count of pending properties
    if (req.method === 'GET') {
        const { count, error } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('enrichment_status', 'pending');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ 
            pending: count,
            configured: !!(openaiKey && browserlessToken)
        });
    }

    // POST - Enrich next batch
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!openaiKey || !browserlessToken) {
        return res.status(503).json({ 
            error: 'Enrichment not configured',
            message: 'Missing OPENAI_API_KEY or BROWSERLESS_TOKEN'
        });
    }

    const { limit = 5 } = req.body;

    try {
        // Get pending properties
        const { data: properties, error: fetchError } = await supabase
            .from('properties')
            .select('id, name, street_address, city, state, leasing_link, google_place_id')
            .eq('enrichment_status', 'pending')
            .limit(limit);

        if (fetchError) {
            return res.status(500).json({ error: fetchError.message });
        }

        if (!properties || properties.length === 0) {
            return res.status(200).json({ 
                message: 'No pending properties',
                enriched: 0,
                failed: 0,
                remaining: 0
            });
        }

        console.log(`[Batch Enrich] Processing ${properties.length} properties`);

        const results = [];
        let enriched = 0;
        let failed = 0;

        for (const prop of properties) {
            try {
                console.log(`[Batch Enrich] Enriching: ${prop.name || prop.street_address}`);
                
                const enrichResult = await enrichProperty(prop);
                
                if (enrichResult.suggestions && Object.keys(enrichResult.suggestions).length > 0) {
                    // Build update object from high-confidence suggestions
                    const updates = {};
                    for (const [field, suggestion] of Object.entries(enrichResult.suggestions)) {
                        if (suggestion.confidence >= 0.6) {
                            updates[field] = suggestion.value;
                        }
                    }

                    updates.enrichment_status = 'enriched';
                    updates.enriched_at = new Date().toISOString();

                    await supabase
                        .from('properties')
                        .update(updates)
                        .eq('id', prop.id);

                    enriched++;
                    results.push({ id: prop.id, name: prop.name, status: 'enriched' });
                } else {
                    // Mark as reviewed even if no suggestions
                    await supabase
                        .from('properties')
                        .update({ enrichment_status: 'reviewed' })
                        .eq('id', prop.id);
                    
                    results.push({ id: prop.id, name: prop.name, status: 'no_data' });
                }
            } catch (err) {
                console.error(`[Batch Enrich] Error for ${prop.name}:`, err.message);
                failed++;
                results.push({ id: prop.id, name: prop.name, status: 'error', error: err.message });
                
                // Mark as failed so we don't retry indefinitely
                await supabase
                    .from('properties')
                    .update({ enrichment_status: 'failed' })
                    .eq('id', prop.id);
            }
        }

        // Get remaining count
        const { count: remaining } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('enrichment_status', 'pending');

        return res.status(200).json({
            enriched,
            failed,
            remaining: remaining || 0,
            results
        });

    } catch (error) {
        console.error('[Batch Enrich] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

