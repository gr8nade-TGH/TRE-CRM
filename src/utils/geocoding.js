/**
 * Geocoding Utility Module
 * Provides address geocoding functionality using Mapbox Geocoding API
 * 
 * Purpose: Convert street addresses to lat/lng coordinates for map display
 * API: Mapbox Geocoding API v5
 * Rate Limits: 600 requests/minute, 100,000 requests/month (free tier)
 * Cost: Free for first 100k requests, then $0.50 per 1,000 requests
 */

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3I4bmFkZSIsImEiOiJjbWdrNmJqcjgwcjlwMmpvbWg3eHBwamF5In0.639Vz3e1U5PCl5CwafE1hg';

/**
 * Geocode an address to lat/lng coordinates
 * @param {string} address - Street address (e.g., "123 Main St")
 * @param {string} city - City name (e.g., "San Antonio")
 * @param {string} state - State code (default: "TX")
 * @param {string} zipCode - ZIP code (optional)
 * @returns {Promise<{lat: number, lng: number}|null>} - Coordinates or null if geocoding failed
 */
export async function geocodeAddress(address, city, state = 'TX', zipCode = '') {
	try {
		// Build full address string
		const fullAddress = zipCode 
			? `${address}, ${city}, ${state} ${zipCode}`
			: `${address}, ${city}, ${state}`;
		const encodedAddress = encodeURIComponent(fullAddress);

		console.log('🗺️ Geocoding:', fullAddress);

		// Use Mapbox Geocoding API
		const response = await fetch(
			`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1`
		);

		if (!response.ok) {
			throw new Error(`Geocoding API returned ${response.status}`);
		}

		const data = await response.json();

		if (data.features && data.features.length > 0) {
			const [lng, lat] = data.features[0].center;
			console.log('✅ Geocoded:', fullAddress, '→', { lat, lng });
			return { lat, lng };
		} else {
			console.warn('⚠️ No geocoding results for:', fullAddress);
			return null;
		}
	} catch (error) {
		console.error('❌ Geocoding error:', error);
		return null;
	}
}

/**
 * Geocode multiple addresses with progress tracking
 * @param {Array<{address: string, city: string, state?: string, zipCode?: string}>} addresses - Array of address objects
 * @param {Function} onProgress - Callback for progress updates (current, total)
 * @returns {Promise<Array<{lat: number, lng: number}|null>>} - Array of coordinates (null for failed geocoding)
 */
export async function geocodeAddressBatch(addresses, onProgress = null) {
	const results = [];
	
	for (let i = 0; i < addresses.length; i++) {
		const addr = addresses[i];
		
		// Call progress callback
		if (onProgress) {
			onProgress(i + 1, addresses.length);
		}
		
		// Geocode address
		const coords = await geocodeAddress(
			addr.address,
			addr.city,
			addr.state || 'TX',
			addr.zipCode || ''
		);
		
		results.push(coords);
		
		// Small delay to avoid rate limiting (600/min = ~100ms between requests)
		if (i < addresses.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 150));
		}
	}
	
	return results;
}

