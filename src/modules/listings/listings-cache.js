/**
 * Listings Cache Module
 * Caches listings data to avoid redundant API calls and improve load times
 * 
 * @module listings/cache
 */

// Cache storage
const cache = {
    properties: null,
    specials: null,
    specialsMap: null,
    propertyNotesCounts: null,
    floorPlans: null,
    units: null,
    interestedLeadsCounts: null,
    unitNotesCounts: null,
    lastFetch: null,
    filterHash: null
};

// Cache TTL in milliseconds (5 minutes for full refresh, but we invalidate on changes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate a hash of the current filter state
 */
function getFilterHash(state) {
    return JSON.stringify({
        search: state.search || '',
        market: state.listingsFilters?.market || 'all',
        minPrice: state.listingsFilters?.minPrice || '',
        maxPrice: state.listingsFilters?.maxPrice || '',
        beds: state.listingsFilters?.beds || 'any'
    });
}

/**
 * Check if cache is valid
 */
export function isCacheValid(state) {
    if (!cache.properties || !cache.lastFetch) return false;
    
    const now = Date.now();
    const filterHash = getFilterHash(state);
    
    // Invalid if TTL expired or filters changed
    if (now - cache.lastFetch > CACHE_TTL) return false;
    if (cache.filterHash !== filterHash) return false;
    
    return true;
}

/**
 * Get cached data if valid
 */
export function getCachedData(state) {
    if (!isCacheValid(state)) return null;
    
    return {
        properties: cache.properties,
        specials: cache.specials,
        specialsMap: cache.specialsMap,
        propertyNotesCounts: cache.propertyNotesCounts,
        floorPlans: cache.floorPlans,
        units: cache.units,
        interestedLeadsCounts: cache.interestedLeadsCounts,
        unitNotesCounts: cache.unitNotesCounts
    };
}

/**
 * Store data in cache
 */
export function setCachedData(state, data) {
    cache.properties = data.properties;
    cache.specials = data.specials;
    cache.specialsMap = data.specialsMap;
    cache.propertyNotesCounts = data.propertyNotesCounts;
    cache.floorPlans = data.floorPlans;
    cache.units = data.units;
    cache.interestedLeadsCounts = data.interestedLeadsCounts;
    cache.unitNotesCounts = data.unitNotesCounts;
    cache.lastFetch = Date.now();
    cache.filterHash = getFilterHash(state);
}

/**
 * Invalidate the cache (call after edits)
 */
export function invalidateCache() {
    cache.properties = null;
    cache.specials = null;
    cache.specialsMap = null;
    cache.propertyNotesCounts = null;
    cache.floorPlans = null;
    cache.units = null;
    cache.interestedLeadsCounts = null;
    cache.unitNotesCounts = null;
    cache.lastFetch = null;
    cache.filterHash = null;
    console.log('📦 Listings cache invalidated');
}

/**
 * Update a single property in cache (for quick updates after edits)
 */
export function updateCachedProperty(propertyId, updates) {
    if (!cache.properties) return;
    
    const index = cache.properties.findIndex(p => p.id === propertyId);
    if (index !== -1) {
        cache.properties[index] = { ...cache.properties[index], ...updates };
        console.log('📦 Updated cached property:', propertyId);
    }
}

/**
 * Remove a property from cache
 */
export function removeCachedProperty(propertyId) {
    if (!cache.properties) return;
    
    cache.properties = cache.properties.filter(p => p.id !== propertyId);
    console.log('📦 Removed property from cache:', propertyId);
}

