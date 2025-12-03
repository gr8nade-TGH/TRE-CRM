/**
 * Serverless Function: RentCast API Status Check
 * 
 * Returns API connection status, key validity, and usage info.
 * Used by the RentCast API Reference page to show connection status.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
        return new Response(JSON.stringify({ 
            connected: false,
            configured: false,
            message: 'API key not configured',
            keyPreview: null
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    try {
        // Make a minimal test request to verify the key works
        // Using a small limit to minimize quota usage
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
            return new Response(JSON.stringify({ 
                connected: true,
                configured: true,
                message: 'Connected to RentCast API',
                keyPreview: RENTCAST_API_KEY.slice(0, 8) + '...' + RENTCAST_API_KEY.slice(-4),
                rateLimit: {
                    remaining: remaining ? parseInt(remaining) : null,
                    limit: limit ? parseInt(limit) : null
                },
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        } else {
            const errorText = await response.text();
            return new Response(JSON.stringify({ 
                connected: false,
                configured: true,
                message: `API key invalid or expired: ${response.status}`,
                error: errorText,
                keyPreview: RENTCAST_API_KEY.slice(0, 8) + '...'
            }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ 
            connected: false,
            configured: true,
            message: 'Failed to connect to RentCast',
            error: error.message,
            keyPreview: RENTCAST_API_KEY.slice(0, 8) + '...'
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

