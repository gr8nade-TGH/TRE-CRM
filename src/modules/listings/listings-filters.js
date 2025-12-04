// Listings Filters - Filter properties based on various criteria
// Extracted from script.js lines 352-413

/**
 * Check if a property matches the current filter criteria
 * @param {Object} property - Property object to check
 * @param {Object} filters - Filter criteria
 * @returns {boolean} True if property matches all filters
 */
export function matchesListingsFilters(property, filters) {
	// Search filter - handle null/undefined values safely
	if (filters.search) {
		const searchTerm = filters.search.toLowerCase();
		const name = (property.name || property.community_name || '').toLowerCase();
		const address = (property.address || property.street_address || '').toLowerCase();
		const amenities = Array.isArray(property.amenities) ? property.amenities : [];

		const matchesSearch =
			name.includes(searchTerm) ||
			address.includes(searchTerm) ||
			amenities.some(amenity => (amenity || '').toLowerCase().includes(searchTerm));
		if (!matchesSearch) return false;
	}

	// Market filter
	if (filters.market !== 'all' && property.market !== filters.market) {
		return false;
	}

	// Price range filter
	if (filters.minPrice && property.rent_min < parseInt(filters.minPrice)) {
		return false;
	}
	if (filters.maxPrice && property.rent_max > parseInt(filters.maxPrice)) {
		return false;
	}

	// Beds filter
	if (filters.beds !== 'any') {
		const minBeds = parseInt(filters.beds);
		if (property.beds_min < minBeds) {
			return false;
		}
	}

	// Commission filter
	if (filters.commission !== '0') {
		const minCommission = parseFloat(filters.commission);
		const totalCommission = property.escort_pct + property.send_pct;
		if (totalCommission < minCommission) {
			return false;
		}
	}

	// Amenities filter - handle null/undefined safely
	if (filters.amenities !== 'any') {
		const amenityMap = {
			'pool': 'Pool',
			'gym': 'Gym',
			'pet': 'Pet Friendly',
			'ev': 'EV Charging'
		};
		const requiredAmenity = amenityMap[filters.amenities];
		const amenities = Array.isArray(property.amenities) ? property.amenities : [];
		if (!amenities.includes(requiredAmenity)) {
			return false;
		}
	}

	// PUMI filter (support both old and new field names)
	if (filters.pumiOnly && !(property.is_pumi || property.isPUMI)) {
		return false;
	}

	return true;
}

