/**
 * Smart Match Algorithm for TRE CRM
 *
 * Intelligently matches leads with property units based on preferences and business priorities.
 *
 * Hard Requirements (Must Match - Filtered Before Scoring):
 * - Bedrooms: Must exactly match lead's bedroom preference
 * - Bathrooms: Must exactly match lead's bathroom preference
 * - City/Location: Must match lead's desired city/area
 *
 * Scoring System (Applied After Hard Filters):
 * - Base Scoring (Lead Preference Matching): 0-35 points
 *   - Price Range: 25 points (within budget), 10 points (within 20% of budget)
 *   - Move-in Date: 10 points bonus (if available by desired date)
 *
 * - Business Priority Bonuses: 0-100+ points
 *   - PUMI Property: +20 points
 *   - High Commission (4%+): +80 points base
 *   - Scaled Commission Bonus: +1 point per 1% above base commission rate
 *
 * Maximum Score: 135+ points (35 base + 100+ bonus)
 * Minimum Threshold: 0 points (all units that pass hard filters are considered)
 *
 * Privacy: commission_pct and is_pumi are NEVER exposed to leads (internal scoring only)
 */

/**
 * Parse a numeric range string (e.g., "2", "2-3", "1.5-2")
 * @param {string|number} value - The value to parse
 * @returns {{min: number, max: number}} - Parsed range
 */
function parseRange(value) {
    if (!value) return { min: null, max: null };

    const str = String(value).trim();

    // Handle range format "1-3" or "1.5-2"
    if (str.includes('-')) {
        const parts = str.split('-').map(p => parseFloat(p.trim()));
        return { min: parts[0] || null, max: parts[1] || null };
    }

    // Handle single value "2" or "1.5"
    const num = parseFloat(str);
    return isNaN(num) ? { min: null, max: null } : { min: num, max: num };
}

/**
 * Parse price range string (e.g., "1200-1500", "1200")
 * @param {string} priceRange - Price range string
 * @returns {{min: number, max: number}} - Parsed price range
 */
function parsePriceRange(priceRange) {
    if (!priceRange) return { min: null, max: null };

    const str = String(priceRange).trim();

    // Handle range format "1200-1500"
    if (str.includes('-')) {
        const parts = str.split('-').map(p => parseInt(p.trim()));
        return { min: parts[0] || null, max: parts[1] || null };
    }

    // Handle single value "1200"
    const num = parseInt(str);
    return isNaN(num) ? { min: null, max: null } : { min: num, max: num };
}

/**
 * Check if unit meets bedroom hard requirement
 * @param {object} lead - Lead preferences
 * @param {object} floorPlan - Floor plan details
 * @returns {boolean} - True if unit meets requirement
 */
function meetsBedroomRequirement(lead, floorPlan) {
    const leadBeds = parseRange(lead.bedrooms);
    const unitBeds = floorPlan.beds;

    // If lead has no preference, all units pass
    if (leadBeds.min === null && leadBeds.max === null) return true;
    if (unitBeds === null || unitBeds === undefined) return false;

    // Must exactly match lead's bedroom preference
    return unitBeds >= leadBeds.min && unitBeds <= leadBeds.max;
}

/**
 * Check if unit meets bathroom hard requirement
 * @param {object} lead - Lead preferences
 * @param {object} floorPlan - Floor plan details
 * @returns {boolean} - True if unit meets requirement
 */
function meetsBathroomRequirement(lead, floorPlan) {
    const leadBaths = parseRange(lead.bathrooms);
    const unitBaths = parseFloat(floorPlan.baths);

    // If lead has no preference, all units pass
    if (leadBaths.min === null && leadBaths.max === null) return true;
    if (isNaN(unitBaths)) return false;

    // Must exactly match lead's bathroom preference
    return unitBaths >= leadBaths.min && unitBaths <= leadBaths.max;
}

/**
 * Check if property meets location hard requirement
 * @param {object} lead - Lead preferences
 * @param {object} property - Property details
 * @returns {boolean} - True if property meets requirement
 */
function meetsLocationRequirement(lead, property) {
    const leadArea = (lead.area_of_town || '').toLowerCase().trim();
    const leadNeighborhoods = (lead.desired_neighborhoods || '').toLowerCase().trim();
    const propertyCity = (property.city || '').toLowerCase().trim();
    const propertyName = (property.name || '').toLowerCase().trim();

    // If lead has no preference, all properties pass
    if (!leadArea && !leadNeighborhoods) return true;
    if (!propertyCity) return false;

    // Must match city or neighborhood
    if (leadArea && propertyCity.includes(leadArea)) {
        return true;
    }

    if (leadNeighborhoods && (propertyCity.includes(leadNeighborhoods) || propertyName.includes(leadNeighborhoods))) {
        return true;
    }

    return false;
}

/**
 * Calculate price range match score
 * @param {object} lead - Lead preferences
 * @param {object} unit - Unit details
 * @param {object} floorPlan - Floor plan details
 * @returns {number} - Score (0-25 points)
 */
function scorePriceMatch(lead, unit, floorPlan) {
    const leadPrice = parsePriceRange(lead.price_range);

    // Use unit.rent if available, otherwise use floor_plan.starting_at
    const unitRent = unit.rent || floorPlan.starting_at;

    // Skip scoring if lead has no preference
    if (leadPrice.min === null && leadPrice.max === null) return 0;
    if (!unitRent) return 0;

    // Within budget: 25 points
    if (unitRent >= leadPrice.min && unitRent <= leadPrice.max) {
        return 25;
    }

    // Within 20% of budget: 10 points
    const budgetMid = (leadPrice.min + leadPrice.max) / 2;
    const percentDiff = Math.abs(unitRent - budgetMid) / budgetMid;

    if (percentDiff <= 0.20) {
        return 10;
    }

    return 0;
}



/**
 * Calculate move-in date bonus score
 * @param {object} lead - Lead preferences
 * @param {object} unit - Unit details
 * @returns {number} - Score (0-10 points)
 */
function scoreMoveInDate(lead, unit) {
    if (!lead.move_in_date || !unit.available_from) return 0;

    const desiredDate = new Date(lead.move_in_date);
    const availableDate = new Date(unit.available_from);

    // Unit available by desired date: 10 points bonus
    if (availableDate <= desiredDate) {
        return 10;
    }

    return 0;
}

/**
 * Calculate commission bonus score
 * New scaled system:
 * - Base: +80 points for 4%+ commission
 * - Scaled: +1 point for each 1% above base commission rate
 *
 * @param {object} property - Property details
 * @returns {number} - Score (0-100+ points)
 */
function scoreCommissionBonus(property) {
    const commission = parseFloat(property.commission_pct);

    if (isNaN(commission)) return 0;

    // High commission (4%+): +80 points base
    if (commission >= 4.0) {
        const basePoints = 80;
        // Add +1 point for each 1% above 4%
        const scaledBonus = Math.floor(commission - 4.0);
        return basePoints + scaledBonus;
    }

    return 0;
}

/**
 * Calculate PUMI bonus score
 * @param {object} property - Property details
 * @returns {number} - Score (0-20 points)
 */
function scorePumiBonus(property) {
    return property.is_pumi === true ? 20 : 0;
}

/**
 * Calculate total match score for a unit
 * Note: This should only be called on units that have already passed hard requirement filters
 *
 * @param {object} lead - Lead with preferences
 * @param {object} unit - Unit details
 * @param {object} floorPlan - Floor plan details
 * @param {object} property - Property details
 * @returns {object} - Score breakdown and total
 */
export function calculateMatchScore(lead, unit, floorPlan, property) {
    const scores = {
        price: scorePriceMatch(lead, unit, floorPlan),
        moveInDate: scoreMoveInDate(lead, unit),
        commission: scoreCommissionBonus(property),
        pumi: scorePumiBonus(property)
    };

    const baseScore = scores.price + scores.moveInDate;
    const bonusScore = scores.commission + scores.pumi;
    const totalScore = baseScore + bonusScore;

    return {
        ...scores,
        baseScore,
        bonusScore,
        totalScore
    };
}

/**
 * Get smart matches for a lead
 *
 * Process:
 * 1. Filter units by hard requirements (bedrooms, bathrooms, location)
 * 2. Score remaining units by price, move-in date, commission, and PUMI status
 * 3. Apply "one unit per property" rule: keep only highest-scoring unit per property
 * 4. Return top N properties sorted by score
 *
 * @param {object} lead - Lead with preferences
 * @param {array} unitsWithDetails - Array of units with joined floor_plan and property data
 * @param {number} limit - Maximum number of properties to return (default: 10)
 * @returns {array} - Top N matched properties (one unit per property), sorted by score
 */
export function getSmartMatches(lead, unitsWithDetails, limit = 10) {
    console.log('🎯 Smart Match: Starting with', unitsWithDetails.length, 'units');

    // Step 1: Apply hard requirement filters
    const filteredUnits = unitsWithDetails.filter(item => {
        const meetsBedroomReq = meetsBedroomRequirement(lead, item.floorPlan);
        const meetsBathroomReq = meetsBathroomRequirement(lead, item.floorPlan);
        const meetsLocationReq = meetsLocationRequirement(lead, item.property);

        return meetsBedroomReq && meetsBathroomReq && meetsLocationReq;
    });

    console.log('🎯 Smart Match: After hard filters,', filteredUnits.length, 'units remain');

    // Step 2: Calculate scores for filtered units
    const scoredUnits = filteredUnits.map(item => {
        const score = calculateMatchScore(lead, item.unit, item.floorPlan, item.property);
        return {
            ...item,
            matchScore: score
        };
    });

    // Step 3: Group by property_id and select highest-scoring unit per property
    const propertyMap = new Map();

    scoredUnits.forEach(item => {
        const propertyId = item.property.id;
        const existingItem = propertyMap.get(propertyId);

        // Keep the unit with the highest score for this property
        if (!existingItem || item.matchScore.totalScore > existingItem.matchScore.totalScore) {
            propertyMap.set(propertyId, item);
        }
    });

    console.log('🎯 Smart Match: After one-unit-per-property rule,', propertyMap.size, 'properties remain');

    // Step 4: Convert map to array and sort by score (highest first)
    const topMatches = Array.from(propertyMap.values())
        .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore)
        .slice(0, limit);

    console.log('🎯 Smart Match: Returning top', topMatches.length, 'properties');

    return topMatches;
}

