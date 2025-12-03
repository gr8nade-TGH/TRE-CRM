/**
 * Serverless Function: AI Property Enrichment Status
 * 
 * Returns configuration status for AI enrichment services.
 * Checks OpenAI and Browserless.io availability.
 * 
 * @endpoint GET /api/property/status
 */

import { checkConfiguration } from '../lib/ai-enrichment.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const config = checkConfiguration();
        
        return res.status(200).json({
            service: 'AI Property Enrichment',
            configured: config.configured,
            services: {
                openai: {
                    configured: config.openai,
                    keyPreview: config.openaiPreview,
                    model: 'gpt-4o-mini'
                },
                browserless: {
                    configured: config.browserless,
                    keyPreview: config.browserlessPreview,
                    purpose: 'Web scraping'
                }
            },
            capabilities: config.configured ? [
                'Property name detection',
                'Amenities extraction',
                'Contact info lookup',
                'Leasing URL discovery',
                'Management company identification'
            ] : [],
            setup_instructions: !config.configured ? {
                message: 'Add these environment variables to Vercel:',
                variables: [
                    !config.openai ? 'OPENAI_API_KEY - Get from https://platform.openai.com/api-keys' : null,
                    !config.browserless ? 'BROWSERLESS_TOKEN - Already configured for PDF generation' : null
                ].filter(Boolean)
            } : null,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[AI Enrichment Status] Error:', error);
        return res.status(500).json({
            error: 'Failed to check configuration',
            message: error.message
        });
    }
}

