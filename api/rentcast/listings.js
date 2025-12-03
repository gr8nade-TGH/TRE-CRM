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

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
        return res.status(500).json({
            error: 'RentCast API key not configured',
            hint: 'Add RENTCAST_API_KEY to Vercel environment variables'
        });
    }

    try {
        // Build RentCast API URL
        const rentcastUrl = new URL('https://api.rentcast.io/v1/listings/rental/long-term');

        // Pass through allowed query parameters
        const allowedParams = [
            'city', 'state', 'zipCode', 'address', 'latitude', 'longitude', 'radius',
            'bedrooms', 'bathrooms', 'propertyType', 'status', 'daysOld',
            'limit', 'offset'
        ];

        for (const param of allowedParams) {
            if (req.query[param]) {
                rentcastUrl.searchParams.set(param, req.query[param]);
            }
        }

        // Default limit if not specified
        if (!req.query.limit) {
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

            return res.status(response.status).json({
                error: 'RentCast API error',
                status: response.status,
                message: errorText
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

        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json(result);

    } catch (error) {
        console.error('[RentCast] Proxy error:', error);

        return res.status(500).json({
            error: 'Failed to fetch from RentCast',
            message: error.message
        });
    }
}

