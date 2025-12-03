/**
 * Serverless Function: RentCast API Status Check
 *
 * Returns API connection status, key validity, and usage info.
 * Used by the RentCast API Reference page to show connection status.
 */

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
        return res.status(200).json({
            connected: false,
            configured: false,
            message: 'API key not configured - add RENTCAST_API_KEY to Vercel env vars',
            keyPreview: null
        });
    }

    try {
        // Make a minimal test request to verify the key works
        const testUrl = 'https://api.rentcast.io/v1/listings/rental/long-term?city=Austin&state=TX&limit=1';

        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'X-Api-Key': RENTCAST_API_KEY,
                'Accept': 'application/json',
            },
        });

        // Get rate limit headers if available
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const limit = response.headers.get('X-RateLimit-Limit');

        if (response.ok) {
            return res.status(200).json({
                connected: true,
                configured: true,
                message: 'Connected to RentCast API',
                keyPreview: RENTCAST_API_KEY.slice(0, 8) + '...' + RENTCAST_API_KEY.slice(-4),
                rateLimit: {
                    remaining: remaining ? parseInt(remaining) : null,
                    limit: limit ? parseInt(limit) : null
                },
                timestamp: new Date().toISOString()
            });
        } else {
            const errorText = await response.text();
            return res.status(200).json({
                connected: false,
                configured: true,
                message: `API error: ${response.status}`,
                error: errorText,
                keyPreview: RENTCAST_API_KEY.slice(0, 8) + '...'
            });
        }

    } catch (error) {
        return res.status(200).json({
            connected: false,
            configured: true,
            message: 'Failed to connect to RentCast',
            error: error.message,
            keyPreview: RENTCAST_API_KEY ? RENTCAST_API_KEY.slice(0, 8) + '...' : null
        });
    }
}

