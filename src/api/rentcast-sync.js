/**
 * RentCast Sync Service
 * 
 * Syncs RentCast listings to TRE CRM database.
 * Groups listings by address → creates properties, floor plans, and units.
 * 
 * @module api/rentcast-sync
 */

import * as RentCastAPI from './rentcast-api.js';
import * as SupabaseAPI from './supabase-api.js';

/**
 * Generate a deterministic property ID from address
 * @param {string} address - Full formatted address
 * @returns {string} Property ID
 */
function generatePropertyId(address) {
    // Create a simple hash from address for consistent ID
    const normalized = address.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hash = normalized.slice(0, 20);
    return `rentcast_${hash}`;
}

/**
 * Generate floor plan name from beds/baths
 * @param {number} beds - Number of bedrooms
 * @param {number} baths - Number of bathrooms
 * @returns {string} Floor plan name like "2BR/2BA"
 */
function generateFloorPlanName(beds, baths) {
    return `${beds}BR/${baths}BA`;
}

/**
 * Group listings by address to create properties
 * @param {Array} listings - RentCast listings array
 * @returns {Map} Map of address → listings array
 */
function groupListingsByAddress(listings) {
    const groups = new Map();

    listings.forEach(listing => {
        const address = listing.formattedAddress || listing.addressLine1;
        if (!address) return;

        if (!groups.has(address)) {
            groups.set(address, []);
        }
        groups.get(address).push(listing);
    });

    return groups;
}

/**
 * Transform grouped listings into property data
 * @param {string} address - Property address
 * @param {Array} listings - All listings at this address
 * @returns {Object} Property object ready for database
 */
function createPropertyFromListings(address, listings) {
    const first = listings[0];

    // Calculate aggregates
    const rents = listings.map(l => l.price).filter(p => p > 0);
    const beds = listings.map(l => l.bedrooms).filter(b => b !== null);
    const baths = listings.map(l => l.bathrooms).filter(b => b !== null);
    const sqfts = listings.map(l => l.squareFootage).filter(s => s > 0);

    // Collect all photos from all listings
    const allPhotos = listings.flatMap(l => l.photos || []).filter(Boolean).slice(0, 10);

    return {
        id: generatePropertyId(address),
        name: address,
        community_name: first.propertyName || address.split(',')[0],
        street_address: first.addressLine1 || address.split(',')[0],
        address: first.addressLine1 || address,
        city: first.city || 'San Antonio',
        state: first.state || 'TX',
        zip_code: first.zipCode,
        market: first.city || 'San Antonio',

        // Coordinates
        map_lat: first.latitude,
        map_lng: first.longitude,
        lat: first.latitude,
        lng: first.longitude,

        // Aggregated ranges
        rent_min: rents.length ? Math.min(...rents) : null,
        rent_max: rents.length ? Math.max(...rents) : null,
        rent_range_min: rents.length ? Math.min(...rents) : null,
        rent_range_max: rents.length ? Math.max(...rents) : null,
        beds_min: beds.length ? Math.min(...beds) : null,
        beds_max: beds.length ? Math.max(...beds) : null,
        baths_min: baths.length ? Math.min(...baths) : null,
        baths_max: baths.length ? Math.max(...baths) : null,
        sqft_min: sqfts.length ? Math.min(...sqfts) : null,
        sqft_max: sqfts.length ? Math.max(...sqfts) : null,

        // Photos
        photos: allPhotos,

        // Property type
        property_type: first.propertyType || 'Apartment',

        // RentCast tracking
        rentcast_id: first.id,
        data_source: 'rentcast',
        last_refreshed_at: new Date().toISOString(),
        pricing_last_updated: new Date().toISOString(),

        // Defaults
        is_available: true,
        is_pumi: false,
        is_verified: false,
        is_test_data: false
    };
}

/**
 * Create floor plans from listings for a property
 * @param {string} propertyId - Property ID
 * @param {Array} listings - Listings at this property
 * @returns {Array} Floor plan objects with unit associations
 */
function createFloorPlansAndUnits(propertyId, listings) {
    // Group by beds/baths combination
    const floorPlanMap = new Map();

    listings.forEach((listing, index) => {
        const beds = listing.bedrooms || 0;
        const baths = listing.bathrooms || 1;
        const key = `${beds}_${baths}`;

        if (!floorPlanMap.has(key)) {
            floorPlanMap.set(key, {
                floorPlan: {
                    property_id: propertyId,
                    name: generateFloorPlanName(beds, baths),
                    beds: beds,
                    baths: baths,
                    sqft: listing.squareFootage || null,
                    market_rent: listing.price || 0,
                    starting_at: listing.price || 0,
                    has_concession: false,
                    units_available: 0,
                    is_test_data: false
                },
                units: []
            });
        }

        const group = floorPlanMap.get(key);
        group.units.push({
            property_id: propertyId,
            unit_number: `Unit ${index + 1}`,
            rent: listing.price || 0,
            market_rent: listing.price || 0,
            available_from: listing.listedDate ? new Date(listing.listedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            is_available: listing.status === 'Active',
            status: listing.status === 'Active' ? 'available' : 'unavailable',
            is_active: listing.status === 'Active',
            is_test_data: false,
            notes: listing.description ? listing.description.slice(0, 500) : null
        });

        // Update floor plan aggregates
        group.floorPlan.units_available = group.units.filter(u => u.is_available).length;
        if (listing.squareFootage && (!group.floorPlan.sqft || listing.squareFootage > group.floorPlan.sqft)) {
            group.floorPlan.sqft = listing.squareFootage;
        }
        // Use lowest price as starting_at
        const prices = group.units.map(u => u.rent).filter(p => p > 0);
        if (prices.length) {
            group.floorPlan.starting_at = Math.min(...prices);
            group.floorPlan.market_rent = Math.max(...prices);
        }
    });

    return Array.from(floorPlanMap.values());
}

/**
 * Sync San Antonio listings from RentCast to database
 * @param {Function} onProgress - Progress callback (message, current, total)
 * @returns {Promise<Object>} Sync results
 */
export async function syncSanAntonio(onProgress = () => { }) {
    const results = {
        success: false,
        propertiesCreated: 0,
        propertiesUpdated: 0,
        floorPlansCreated: 0,
        unitsCreated: 0,
        errors: [],
        deletedTestData: 0
    };

    try {
        onProgress('Connecting to RentCast API...', 0, 100);

        // Step 1: Fetch listings from RentCast (paginate if needed)
        onProgress('Fetching San Antonio listings...', 10, 100);

        let allListings = [];
        let offset = 0;
        const limit = 500;
        let hasMore = true;

        while (hasMore) {
            // Filter for apartments/multi-family only (not single family homes)
            const response = await RentCastAPI.getListings({
                city: 'San Antonio',
                state: 'TX',
                status: 'Active',
                propertyType: 'Apartment',
                limit: limit,
                offset: offset
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const listings = response.listings || response || [];
            if (!Array.isArray(listings) || listings.length === 0) {
                hasMore = false;
            } else {
                allListings = allListings.concat(listings);
                offset += limit;
                onProgress(`Fetched ${allListings.length} listings...`, 20, 100);

                // Safety limit
                if (allListings.length >= 2000 || listings.length < limit) {
                    hasMore = false;
                }
            }
        }

        if (allListings.length === 0) {
            throw new Error('No listings returned from RentCast API');
        }

        console.log(`[RentCast Sync] Fetched ${allListings.length} total listings`);
        onProgress(`Processing ${allListings.length} listings...`, 30, 100);

        // Step 2: Delete existing test data (NOT manual entries)
        onProgress('Cleaning up test data...', 35, 100);
        const supabase = SupabaseAPI.getSupabase();

        // Delete test units
        const { error: unitDeleteError } = await supabase
            .from('units')
            .delete()
            .eq('is_test_data', true);
        if (unitDeleteError) console.warn('Error deleting test units:', unitDeleteError);

        // Delete test floor plans
        const { error: fpDeleteError } = await supabase
            .from('floor_plans')
            .delete()
            .eq('is_test_data', true);
        if (fpDeleteError) console.warn('Error deleting test floor plans:', fpDeleteError);

        // Delete test properties AND rentcast properties (to refresh)
        const { data: deletedProps, error: propDeleteError } = await supabase
            .from('properties')
            .delete()
            .or('is_test_data.eq.true,data_source.eq.rentcast')
            .select('id');
        if (propDeleteError) console.warn('Error deleting properties:', propDeleteError);
        results.deletedTestData = deletedProps?.length || 0;

        // Step 3: Group listings by address
        onProgress('Grouping by property...', 40, 100);
        const grouped = groupListingsByAddress(allListings);
        console.log(`[RentCast Sync] Grouped into ${grouped.size} unique properties`);

        // Step 4: Insert properties, floor plans, and units
        const propertyEntries = Array.from(grouped.entries());

        for (let i = 0; i < propertyEntries.length; i++) {
            const [address, listings] = propertyEntries[i];
            const progress = 40 + Math.floor((i / propertyEntries.length) * 55);
            onProgress(`Syncing property ${i + 1} of ${propertyEntries.length}...`, progress, 100);

            try {
                // Create property
                const property = createPropertyFromListings(address, listings);

                const { error: propError } = await supabase
                    .from('properties')
                    .upsert(property, { onConflict: 'id' });

                if (propError) {
                    results.errors.push(`Property ${address}: ${propError.message}`);
                    continue;
                }
                results.propertiesCreated++;

                // Create floor plans and units
                const floorPlanGroups = createFloorPlansAndUnits(property.id, listings);

                for (const group of floorPlanGroups) {
                    // Insert floor plan
                    const { data: fpData, error: fpError } = await supabase
                        .from('floor_plans')
                        .insert(group.floorPlan)
                        .select('id')
                        .single();

                    if (fpError) {
                        results.errors.push(`Floor plan ${group.floorPlan.name}: ${fpError.message}`);
                        continue;
                    }
                    results.floorPlansCreated++;

                    // Insert units with floor_plan_id
                    const unitsWithFpId = group.units.map(u => ({
                        ...u,
                        floor_plan_id: fpData.id
                    }));

                    const { error: unitsError } = await supabase
                        .from('units')
                        .insert(unitsWithFpId);

                    if (unitsError) {
                        results.errors.push(`Units for ${group.floorPlan.name}: ${unitsError.message}`);
                    } else {
                        results.unitsCreated += unitsWithFpId.length;
                    }
                }
            } catch (err) {
                results.errors.push(`Error processing ${address}: ${err.message}`);
            }
        }

        onProgress('Sync complete!', 100, 100);
        results.success = true;

    } catch (error) {
        console.error('[RentCast Sync] Failed:', error);
        results.errors.push(error.message);
    }

    return results;
}

export default {
    syncSanAntonio,
    groupListingsByAddress,
    createPropertyFromListings,
    createFloorPlansAndUnits
};

