/**
 * RentCast API Client
 * 
 * Client-side wrapper for the RentCast API proxy.
 * All requests go through our Vercel Edge Functions to keep the API key secure.
 * 
 * @module api/rentcast-api
 */

const BASE_URL = '/api/rentcast';

/**
 * Check RentCast API connection status
 * @returns {Promise<Object>} Status object with connected, configured, message, keyPreview
 */
export async function checkStatus() {
    try {
        const response = await fetch(`${BASE_URL}/status`);
        return await response.json();
    } catch (error) {
        console.error('[RentCast] Status check failed:', error);
        return {
            connected: false,
            configured: false,
            message: 'Failed to check status',
            error: error.message
        };
    }
}

/**
 * Fetch rental listings from RentCast
 * @param {Object} params - Query parameters
 * @param {string} [params.city] - City name
 * @param {string} [params.state] - State code (e.g., "TX")
 * @param {string} [params.zipCode] - ZIP code
 * @param {number} [params.bedrooms] - Number of bedrooms
 * @param {number} [params.bathrooms] - Number of bathrooms
 * @param {string} [params.propertyType] - "Apartment", "Single Family", etc.
 * @param {number} [params.limit] - Results per page (max 500)
 * @param {number} [params.offset] - Pagination offset
 * @returns {Promise<Object>} Listings response
 */
export async function getListings(params = {}) {
    try {
        const url = new URL(`${BASE_URL}/listings`, window.location.origin);
        
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        const response = await fetch(url.toString());
        return await response.json();
    } catch (error) {
        console.error('[RentCast] Fetch listings failed:', error);
        return {
            success: false,
            error: error.message,
            listings: []
        };
    }
}

/**
 * Transform RentCast listing to TRE CRM property format
 * @param {Object} listing - RentCast listing object
 * @returns {Object} TRE CRM property object
 */
export function transformToProperty(listing) {
    return {
        id: listing.id || listing.propertyId,
        name: listing.formattedAddress || listing.addressLine1,
        community_name: listing.propertyName || listing.formattedAddress,
        address: listing.addressLine1 || listing.formattedAddress,
        city: listing.city,
        state: listing.state,
        zip: listing.zipCode,
        latitude: listing.latitude,
        longitude: listing.longitude,
        rent_min: listing.price || listing.rentRangeLow,
        rent_max: listing.price || listing.rentRangeHigh,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.squareFootage,
        property_type: listing.propertyType,
        year_built: listing.yearBuilt,
        image_url: listing.photos?.[0] || null,
        description: listing.description,
        // RentCast-specific fields
        rentcast_id: listing.id,
        rentcast_last_seen: listing.lastSeenDate,
        rentcast_days_on_market: listing.daysOnMarket,
        source: 'rentcast'
    };
}

/**
 * Transform multiple RentCast listings to TRE CRM format
 * @param {Array} listings - Array of RentCast listings
 * @returns {Array} Array of TRE CRM properties
 */
export function transformListings(listings) {
    if (!Array.isArray(listings)) return [];
    return listings.map(transformToProperty);
}

export default {
    checkStatus,
    getListings,
    transformToProperty,
    transformListings
};

