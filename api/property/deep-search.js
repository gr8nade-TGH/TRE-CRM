/**
 * Deep Search API Endpoint
 * 
 * Uses Browserless to scrape property website subpages (contact, apply, about)
 * for missing contact information that wasn't found in the initial search.
 * 
 * @module api/property/deep-search
 */

import { deepSearchProperty } from '../lib/ai-enrichment.js';

export const config = {
    maxDuration: 60 // Allow up to 60 seconds for deep scraping
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            property_id,
            leasing_url,
            address,
            city,
            state,
            missing_fields
        } = req.body;

        // Validate required fields
        if (!leasing_url) {
            return res.status(400).json({
                error: 'Missing required field: leasing_url'
            });
        }

        console.log(`[Deep Search] Request for property ${property_id}: ${leasing_url}`);
        console.log(`[Deep Search] Looking for: ${missing_fields?.join(', ') || 'all fields'}`);

        // Call deep search service
        const results = await deepSearchProperty({
            id: property_id,
            leasing_url,
            address,
            city: city || 'San Antonio',
            state: state || 'TX',
            missing_fields: missing_fields || ['contact_email', 'contact_name', 'contact_phone']
        });

        return res.status(200).json({
            success: true,
            property_id,
            leasing_url,
            suggestions: results.suggestions,
            pages_scraped: results.pages_scraped,
            errors: results.errors,
            processing_time_ms: new Date(results.completed_at) - new Date(results.started_at),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Deep Search] Handler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Deep search failed',
            message: error.message || 'Unknown error occurred'
        });
    }
}

