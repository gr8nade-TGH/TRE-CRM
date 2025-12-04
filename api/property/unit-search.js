/**
 * Unit Search API Endpoint
 * 
 * Searches property website for available units/floor plans
 * Uses Browserless to scrape floor plan and availability pages
 * 
 * @module api/property/unit-search
 */

import { searchUnits } from '../lib/ai-enrichment.js';

export const config = {
    maxDuration: 60
};

export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { propertyId, propertyName, leasingUrl, address } = req.body;

        if (!propertyId || !leasingUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields: propertyId and leasingUrl' 
            });
        }

        console.log(`[Unit Search] Starting unit search for property ${propertyId}`);
        console.log(`[Unit Search] Leasing URL: ${leasingUrl}`);
        console.log(`[Unit Search] Property name: ${propertyName}`);

        const results = await searchUnits({
            propertyId,
            propertyName: propertyName || 'Unknown Property',
            leasingUrl,
            address: address || ''
        });

        console.log(`[Unit Search] Found ${results.units?.length || 0} units`);

        return res.status(200).json({
            success: true,
            propertyId,
            propertyName,
            ...results
        });

    } catch (error) {
        console.error('[Unit Search] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Unit search failed'
        });
    }
}

