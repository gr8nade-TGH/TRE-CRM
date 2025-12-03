/**
 * Serverless Function: RentCast API Proxy - Listings
 * 
 * Proxies requests to RentCast API to keep API key secure on server-side.
 * 
 * Query Parameters (passed through to RentCast):
 * - city: City name (e.g., "San Antonio")
 * - state: State code (e.g., "TX")
 * - zipCode: ZIP code
 * - bedrooms: Number of bedrooms
 * - bathrooms: Number of bathrooms
 * - propertyType: "Apartment", "Single Family", etc.
 * - status: "Active", "Inactive"
 * - limit: Results per page (max 500)
 * - offset: Pagination offset
 * 
 * @see https://developers.rentcast.io/reference/rental-listings
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
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
        return new Response(JSON.stringify({ 
            error: 'RentCast API key not configured',
            hint: 'Add RENTCAST_API_KEY to Vercel environment variables'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Get query parameters from incoming request
        const url = new URL(request.url);
        const searchParams = url.searchParams;

        // Build RentCast API URL
        const rentcastUrl = new URL('https://api.rentcast.io/v1/listings/rental/long-term');
        
        // Pass through allowed query parameters
        const allowedParams = [
            'city', 'state', 'zipCode', 'address', 'latitude', 'longitude', 'radius',
            'bedrooms', 'bathrooms', 'propertyType', 'status', 'daysOld',
            'limit', 'offset'
        ];

        for (const param of allowedParams) {
            if (searchParams.has(param)) {
                rentcastUrl.searchParams.set(param, searchParams.get(param));
            }
        }

        // Default limit if not specified
        if (!searchParams.has('limit')) {
            rentcastUrl.searchParams.set('limit', '50');
        }

        console.log(`[RentCast] Fetching: ${rentcastUrl.toString()}`);

        // Make request to RentCast
        const response = await fetch(rentcastUrl.toString(), {
            method: 'GET',
            headers: {
                'X-Api-Key': RENTCAST_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RentCast] API Error: ${response.status} - ${errorText}`);
            
            return new Response(JSON.stringify({ 
                error: 'RentCast API error',
                status: response.status,
                message: errorText
            }), {
                status: response.status,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const data = await response.json();

        // Add metadata about the request
        const result = {
            success: true,
            count: Array.isArray(data) ? data.length : 0,
            listings: data,
            query: Object.fromEntries(rentcastUrl.searchParams),
            timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            },
        });

    } catch (error) {
        console.error('[RentCast] Proxy error:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch from RentCast',
            message: error.message
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

