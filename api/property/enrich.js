/**
 * Serverless Function: AI Property Enrichment
 * 
 * Accepts a property's address and uses AI + web scraping to find:
 * - Property name
 * - Amenities
 * - Contact information
 * - Leasing URL
 * - Management company
 * 
 * @endpoint POST /api/property/enrich
 */

import { enrichProperty, checkConfiguration } from '../lib/ai-enrichment.js';

export const config = {
    maxDuration: 300  // Pro plan max (5 min), with Fluid Compute can run up to 14 min for network-heavy ops
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check configuration first
    const configStatus = checkConfiguration();
    if (!configStatus.configured) {
        return res.status(503).json({
            error: 'AI enrichment not configured',
            missing: {
                openai: !configStatus.openai,
                browserless: !configStatus.browserless
            },
            message: 'Add OPENAI_API_KEY to Vercel environment variables'
        });
    }

    try {
        // Accept full property object with all existing data
        const {
            property_id,
            address,
            street_address,
            city,
            state,
            zip_code,
            lat,
            lng,
            // Existing data for verification
            community_name,
            name,
            contact_phone,
            contact_email,
            contact_name,
            amenities,
            neighborhood,
            description,
            leasing_link,
            management_company
        } = req.body;

        const propertyAddress = street_address || address;

        // Validate required fields
        if (!propertyAddress) {
            return res.status(400).json({
                error: 'Missing required field: address or street_address'
            });
        }

        console.log(`[AI Enrichment] Request for property ${property_id}: ${propertyAddress}`);

        // Call enrichment service with full property data
        const results = await enrichProperty({
            id: property_id,
            address: propertyAddress,
            street_address: propertyAddress,
            city: city || 'San Antonio',
            state: state || 'TX',
            zip_code: zip_code || '',
            coordinates: lat && lng ? { lat, lng } : null,
            // Pass existing data for smart analysis
            community_name,
            name,
            contact_phone,
            contact_email,
            contact_name,
            amenities,
            neighborhood,
            description,
            leasing_link,
            management_company
        });

        // Count suggestions and verifications
        const suggestionCount = Object.keys(results.suggestions || {}).length;
        const verificationCount = Object.keys(results.verifications || {}).length;

        return res.status(200).json({
            success: true,
            property_id,
            address: results.address,
            // Non-apartment detection (for delete suggestion)
            suggest_delete: results.suggest_delete || false,
            non_apartment_detection: results.non_apartment_detection || null,
            // Analysis of what was missing vs existing
            data_analysis: results.dataAnalysis,
            // New data found for missing fields
            suggestions: results.suggestions,
            suggestion_count: suggestionCount,
            // Verification results for existing data
            verifications: results.verifications,
            verification_count: verificationCount,
            sources_checked: results.sources_checked,
            errors: results.errors,
            has_screenshot: !!results.screenshot,
            screenshot: results.screenshot || null,
            processing_time_ms: new Date(results.completed_at) - new Date(results.started_at),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[AI Enrichment] Handler error:', error);
        // Ensure we always return valid JSON
        return res.status(500).json({
            success: false,
            error: 'Enrichment failed',
            message: error.message || 'Unknown error occurred',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

