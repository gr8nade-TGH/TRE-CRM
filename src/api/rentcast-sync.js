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
 * Normalize an address by removing unit numbers
 * This ensures all units at the same street address are grouped together
 * @param {string} address - Full address potentially with unit number
 * @returns {string} Normalized address without unit number
 */
function normalizeAddressForGrouping(address) {
    if (!address) return '';

    // Multiple passes to catch all unit designators
    let normalized = address;

    // Pattern 1: Unit/Apt/Suite followed by alphanumeric (with optional comma/space before)
    // Matches: ", Unit B25", " Apt 4B", ", Suite 5", " Unit A3", "#201", etc.
    normalized = normalized.replace(/[,\s]*(Unit|Apt|Apartment|Suite|Ste)\s*[#]?\s*[A-Za-z0-9-]+/gi, '');

    // Pattern 2: Standalone # followed by unit number
    normalized = normalized.replace(/[,\s]*#\s*[A-Za-z0-9-]+/gi, '');

    // Pattern 3: Just a dash followed by unit number at end of street (e.g., "123 Main St-4B")
    normalized = normalized.replace(/-[A-Za-z]?\d+[A-Za-z]?(?=,|\s|$)/g, '');

    // Clean up extra commas, spaces, and leading/trailing punctuation
    normalized = normalized
        .replace(/,\s*,/g, ',')     // Double commas
        .replace(/\s+/g, ' ')        // Multiple spaces
        .replace(/,\s*$/, '')        // Trailing comma
        .trim();

    return normalized;
}

/**
 * Extract unit number from address or listing
 * @param {Object} listing - RentCast listing object
 * @returns {string|null} Unit number or null
 */
function extractUnitNumber(listing) {
    // First try addressLine2 (often contains unit)
    if (listing.addressLine2) {
        return listing.addressLine2.replace(/^(Unit|Apt|Apartment|Suite|Ste|#)\s*/i, '').trim();
    }

    // Try to extract from formattedAddress
    const address = listing.formattedAddress || '';
    const unitMatch = address.match(/(?:Unit|Apt|Apartment|Suite|Ste|#)\s*([A-Za-z0-9-]+)/i);
    if (unitMatch) {
        return unitMatch[1];
    }

    return null;
}

/**
 * Group listings by NORMALIZED address to create properties
 * This groups all units at the same street address together
 * @param {Array} listings - RentCast listings array
 * @returns {Map} Map of normalized address → listings array
 */
function groupListingsByAddress(listings) {
    const groups = new Map();

    listings.forEach(listing => {
        const rawAddress = listing.formattedAddress || listing.addressLine1;
        if (!rawAddress) return;

        // Normalize address to group units together
        const normalizedAddress = normalizeAddressForGrouping(rawAddress);

        // Store original unit number in the listing for later
        listing._extractedUnit = extractUnitNumber(listing);

        if (!groups.has(normalizedAddress)) {
            groups.set(normalizedAddress, []);
        }
        groups.get(normalizedAddress).push(listing);
    });

    console.log(`[RentCast Sync] Grouped ${listings.length} listings into ${groups.size} unique properties`);

    return groups;
}

/**
 * Transform grouped listings into property data
 * @param {string} normalizedAddress - Normalized property address (without unit numbers)
 * @param {Array} listings - All listings at this address
 * @returns {Object} Property object ready for database
 */
function createPropertyFromListings(normalizedAddress, listings) {
    const first = listings[0];

    // Get street address from addressLine1 (without unit), falling back to normalized address
    const streetAddress = first.addressLine1
        ? normalizeAddressForGrouping(first.addressLine1).split(',')[0]
        : normalizedAddress.split(',')[0];

    // Calculate aggregates from ALL listings (units) at this property
    const rents = listings.map(l => l.price).filter(p => p > 0);
    const beds = listings.map(l => l.bedrooms).filter(b => b !== null);
    const baths = listings.map(l => l.bathrooms).filter(b => b !== null);
    const sqfts = listings.map(l => l.squareFootage).filter(s => s > 0);

    // Collect all photos from all listings
    const allPhotos = listings.flatMap(l => l.photos || []).filter(Boolean).slice(0, 10);

    // Build full address for display (street, city, state zip)
    const fullAddress = `${streetAddress}, ${first.city || 'San Antonio'}, ${first.state || 'TX'} ${first.zipCode || ''}`.trim();

    return {
        id: generatePropertyId(normalizedAddress),
        name: fullAddress,
        // Use property name from RentCast if available, otherwise use street address
        community_name: first.propertyName || streetAddress,
        street_address: streetAddress,
        address: streetAddress,
        city: first.city || 'San Antonio',
        state: first.state || 'TX',
        zip_code: first.zipCode,
        market: first.city || 'San Antonio',

        // Coordinates
        map_lat: first.latitude,
        map_lng: first.longitude,
        lat: first.latitude,
        lng: first.longitude,

        // Aggregated ranges from ALL units
        // Note: baths_min/max are INTEGER columns, so floor/ceil the values
        rent_min: rents.length ? Math.min(...rents) : null,
        rent_max: rents.length ? Math.max(...rents) : null,
        rent_range_min: rents.length ? Math.min(...rents) : null,
        rent_range_max: rents.length ? Math.max(...rents) : null,
        beds_min: beds.length ? Math.min(...beds) : null,
        beds_max: beds.length ? Math.max(...beds) : null,
        baths_min: baths.length ? Math.floor(Math.min(...baths)) : null,
        baths_max: baths.length ? Math.ceil(Math.max(...baths)) : null,
        sqft_min: sqfts.length ? Math.min(...sqfts) : null,
        sqft_max: sqfts.length ? Math.max(...sqfts) : null,

        // Photos
        photos: allPhotos,

        // RentCast tracking - use first listing's ID as reference
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

    // Track used unit numbers to ensure uniqueness at property level
    const usedUnitNumbers = new Set();
    let autoUnitCounter = 1;

    // Helper to get a unique unit number
    function getUniqueUnitNumber(extracted) {
        // If we have an extracted unit and it's not used yet, use it
        if (extracted && !usedUnitNumbers.has(extracted)) {
            usedUnitNumbers.add(extracted);
            return extracted;
        }
        // Otherwise generate a unique one
        while (usedUnitNumbers.has(`Unit ${autoUnitCounter}`)) {
            autoUnitCounter++;
        }
        const unitNum = `Unit ${autoUnitCounter}`;
        usedUnitNumbers.add(unitNum);
        autoUnitCounter++;
        return unitNum;
    }

    listings.forEach((listing) => {
        const beds = listing.bedrooms || 0;
        // Round baths to avoid decimal issues (1.5 -> 1.5, but ensure it's valid)
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

        // Get unique unit number for this listing
        const unitNumber = getUniqueUnitNumber(listing._extractedUnit);

        group.units.push({
            property_id: propertyId,
            unit_number: unitNumber,
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

        // Step 2: Delete ALL existing RentCast data (complete cleanup before fresh import)
        onProgress('Cleaning up old RentCast data...', 35, 100);
        const supabase = SupabaseAPI.getSupabase();

        // Get all rentcast property IDs
        const { data: rentcastProps } = await supabase
            .from('properties')
            .select('id')
            .eq('data_source', 'rentcast');

        const rentcastPropertyIds = rentcastProps?.map(p => p.id) || [];
        console.log(`[RentCast Sync] Found ${rentcastPropertyIds.length} existing RentCast properties to clean up`);

        // Delete in batches of 100 to avoid query limits
        const BATCH_SIZE = 100;
        for (let i = 0; i < rentcastPropertyIds.length; i += BATCH_SIZE) {
            const batch = rentcastPropertyIds.slice(i, i + BATCH_SIZE);

            // Delete units first (child records)
            await supabase.from('units').delete().in('property_id', batch);

            // Delete floor plans
            await supabase.from('floor_plans').delete().in('property_id', batch);

            // Delete properties
            await supabase.from('properties').delete().in('id', batch);
        }

        // Also clean up any orphaned test data
        await supabase.from('units').delete().eq('is_test_data', true);
        await supabase.from('floor_plans').delete().eq('is_test_data', true);
        await supabase.from('properties').delete().eq('is_test_data', true);

        results.deletedTestData = rentcastPropertyIds.length;
        console.log(`[RentCast Sync] Deleted ${results.deletedTestData} old RentCast properties with their floor plans and units`);

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

