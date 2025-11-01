/**
 * Smart Match Algorithm V2 - Configurable Version
 * 
 * This is an enhanced version of the Smart Match algorithm that uses
 * configuration settings instead of hardcoded values.
 */

import { MATCH_MODE, POLICY_MODE, RENT_TOLERANCE_MODE, SORT_BY } from './smart-match-config-defaults.js';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Parse bedroom/bathroom range string (e.g., "2-3" or "2")
 * @param {string} rangeStr - Range string
 * @returns {Object} { min, max }
 */
function parseRange(rangeStr) {
    if (!rangeStr) return { min: null, max: null };

    const str = String(rangeStr).trim();
    if (str === '' || str === 'Any') return { min: null, max: null };

    if (str.includes('-')) {
        const [min, max] = str.split('-').map(s => parseFloat(s.trim()));
        return { min, max };
    }

    const val = parseFloat(str);
    return { min: val, max: val };
}

/**
 * Parse price range string (e.g., "$1000-$1500")
 * @param {string} priceStr - Price range string
 * @returns {Object} { min, max }
 */
function parsePriceRange(priceStr) {
    if (!priceStr) return { min: null, max: null };

    const str = String(priceStr).replace(/[$,]/g, '').trim();
    if (str === '' || str === 'Any') return { min: null, max: null };

    if (str.includes('-')) {
        const [min, max] = str.split('-').map(s => parseInt(s.trim()));
        return { min, max };
    }

    const val = parseInt(str);
    return { min: val, max: val };
}

/**
 * Parse date string to Date object
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {Date|null}
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

// ============================================
// CONFIGURABLE FILTERING FUNCTIONS
// ============================================

/**
 * Check if unit meets bedroom requirement based on config
 * @param {Object} lead - Lead object with preferences
 * @param {Object} floorPlan - Floor plan object
 * @param {Object} config - Smart Match configuration
 * @returns {boolean}
 */
function meetsBedroomRequirement(lead, floorPlan, config) {
    const leadBeds = parseRange(lead.bedrooms);
    const unitBeds = floorPlan.beds;

    // If lead has no preference, all units pass
    if (leadBeds.min === null && leadBeds.max === null) return true;
    if (unitBeds === null || unitBeds === undefined) return false;

    const mode = config.bedroom_match_mode || MATCH_MODE.EXACT;
    const tolerance = config.bedroom_tolerance || 0;

    switch (mode) {
        case MATCH_MODE.EXACT:
            // Must exactly match lead's bedroom preference
            return unitBeds >= leadBeds.min && unitBeds <= leadBeds.max;

        case MATCH_MODE.FLEXIBLE:
            // Allow ±tolerance bedrooms
            const flexMin = Math.max(0, leadBeds.min - tolerance);
            const flexMax = leadBeds.max + tolerance;
            return unitBeds >= flexMin && unitBeds <= flexMax;

        case MATCH_MODE.RANGE:
            // Any value is acceptable (no filtering)
            return true;

        default:
            return unitBeds >= leadBeds.min && unitBeds <= leadBeds.max;
    }
}

/**
 * Check if unit meets bathroom requirement based on config
 * @param {Object} lead - Lead object with preferences
 * @param {Object} floorPlan - Floor plan object
 * @param {Object} config - Smart Match configuration
 * @returns {boolean}
 */
function meetsBathroomRequirement(lead, floorPlan, config) {
    const leadBaths = parseRange(lead.bathrooms);
    const unitBaths = floorPlan.baths;

    // If lead has no preference, all units pass
    if (leadBaths.min === null && leadBaths.max === null) return true;
    if (unitBaths === null || unitBaths === undefined) return false;

    const mode = config.bathroom_match_mode || MATCH_MODE.EXACT;
    const tolerance = config.bathroom_tolerance || 0;

    switch (mode) {
        case MATCH_MODE.EXACT:
            // Must exactly match lead's bathroom preference
            return unitBaths >= leadBaths.min && unitBaths <= leadBaths.max;

        case MATCH_MODE.FLEXIBLE:
            // Allow ±tolerance bathrooms
            const flexMin = Math.max(0, leadBaths.min - tolerance);
            const flexMax = leadBaths.max + tolerance;
            return unitBaths >= flexMin && unitBaths <= flexMax;

        case MATCH_MODE.RANGE:
            // Any value is acceptable (no filtering)
            return true;

        default:
            return unitBaths >= leadBaths.min && unitBaths <= leadBaths.max;
    }
}

/**
 * Check if unit meets rent requirement based on config
 * @param {Object} lead - Lead object with preferences
 * @param {Object} unit - Unit object
 * @param {Object} floorPlan - Floor plan object
 * @param {Object} config - Smart Match configuration
 * @returns {boolean}
 */
function meetsRentRequirement(lead, unit, floorPlan, config) {
    const leadPrice = parsePriceRange(lead.price_range);
    const unitRent = unit.rent || floorPlan.starting_at;

    // If lead has no preference, all units pass
    if (leadPrice.min === null && leadPrice.max === null) return true;
    if (!unitRent) return false;

    const mode = config.rent_tolerance_mode || RENT_TOLERANCE_MODE.PERCENTAGE;
    const tolerancePercent = config.rent_tolerance_percent || 20;
    const toleranceFixed = config.rent_tolerance_fixed || 0;

    let adjustedMin, adjustedMax;

    if (mode === RENT_TOLERANCE_MODE.PERCENTAGE) {
        // Calculate tolerance as percentage
        const minTolerance = leadPrice.min * (tolerancePercent / 100);
        const maxTolerance = leadPrice.max * (tolerancePercent / 100);
        adjustedMin = leadPrice.min - minTolerance;
        adjustedMax = leadPrice.max + maxTolerance;
    } else {
        // Use fixed dollar amount
        adjustedMin = leadPrice.min - toleranceFixed;
        adjustedMax = leadPrice.max + toleranceFixed;
    }

    return unitRent >= adjustedMin && unitRent <= adjustedMax;
}

/**
 * Check if property meets location requirement
 * @param {Object} lead - Lead object with preferences
 * @param {Object} property - Property object
 * @returns {boolean}
 */
function meetsLocationRequirement(lead, property) {
    // If lead has no location preference, all properties pass
    if (!lead.area_of_town && !lead.desired_neighborhoods) return true;

    const propertyCity = (property.city || '').toLowerCase().trim();

    // Check area_of_town
    if (lead.area_of_town) {
        const desiredArea = lead.area_of_town.toLowerCase().trim();
        if (propertyCity.includes(desiredArea) || desiredArea.includes(propertyCity)) {
            return true;
        }
    }

    // Check desired_neighborhoods
    if (lead.desired_neighborhoods) {
        const neighborhoods = lead.desired_neighborhoods.toLowerCase().split(',').map(n => n.trim());
        const propertyNeighborhood = (property.neighborhood || '').toLowerCase().trim();

        for (const neighborhood of neighborhoods) {
            if (propertyCity.includes(neighborhood) ||
                neighborhood.includes(propertyCity) ||
                propertyNeighborhood.includes(neighborhood) ||
                neighborhood.includes(propertyNeighborhood)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if unit meets move-in date requirement based on config
 * @param {Object} lead - Lead object with preferences
 * @param {Object} unit - Unit object
 * @param {Object} config - Smart Match configuration
 * @returns {boolean}
 */
function meetsMoveInDateRequirement(lead, unit, config) {
    if (!lead.move_in_date) return true; // No preference
    if (!unit.available_from) return true; // Assume available now

    const desiredDate = parseDate(lead.move_in_date);
    const availableDate = parseDate(unit.available_from);

    if (!desiredDate || !availableDate) return true;

    const flexibilityDays = config.move_in_flexibility_days || 30;
    const flexibilityMs = flexibilityDays * 24 * 60 * 60 * 1000;

    const earliestAcceptable = new Date(desiredDate.getTime() - flexibilityMs);
    const latestAcceptable = new Date(desiredDate.getTime() + flexibilityMs);

    return availableDate >= earliestAcceptable && availableDate <= latestAcceptable;
}

/**
 * Check if property meets pet policy requirement based on config
 * @param {Object} lead - Lead object with preferences
 * @param {Object} property - Property object
 * @param {Object} config - Smart Match configuration
 * @returns {boolean}
 */
function meetsPetPolicyRequirement(lead, property, config) {
    const mode = config.pet_policy_mode || POLICY_MODE.IGNORE;

    if (mode === POLICY_MODE.IGNORE) return true;

    // Check if lead has pets (this would need to be added to lead preferences)
    const leadHasPets = lead.has_pets || false;

    if (!leadHasPets) return true; // No pets, no restriction

    // Check if property allows pets (this would need to be added to property data)
    const propertyAllowsPets = property.allows_pets || false;

    if (mode === POLICY_MODE.STRICT) {
        return propertyAllowsPets;
    }

    if (mode === POLICY_MODE.LENIENT) {
        // Use leniency factor - high leniency properties might be flexible
        if (propertyAllowsPets) return true;
        return property.leniency === 'HIGH';
    }

    return true;
}

/**
 * Apply all configurable filters to units
 * @param {Array} unitsWithDetails - Array of {unit, floorPlan, property}
 * @param {Object} lead - Lead object
 * @param {Object} config - Smart Match configuration
 * @returns {Array} Filtered units
 */
export function applyConfigurableFilters(unitsWithDetails, lead, config) {
    return unitsWithDetails.filter(item => {
        const meetsBedroomReq = meetsBedroomRequirement(lead, item.floorPlan, config);
        const meetsBathroomReq = meetsBathroomRequirement(lead, item.floorPlan, config);
        const meetsRentReq = meetsRentRequirement(lead, item.unit, item.floorPlan, config);
        const meetsLocationReq = meetsLocationRequirement(lead, item.property);
        const meetsMoveInReq = meetsMoveInDateRequirement(lead, item.unit, config);
        const meetsPetReq = meetsPetPolicyRequirement(lead, item.property, config);

        return meetsBedroomReq && meetsBathroomReq && meetsRentReq &&
            meetsLocationReq && meetsMoveInReq && meetsPetReq;
    });
}

// ============================================
// CONFIGURABLE SCORING FUNCTIONS
// ============================================

/**
 * Score price match based on config
 * @param {Object} lead - Lead object
 * @param {Object} unit - Unit object
 * @param {Object} floorPlan - Floor plan object
 * @param {Object} config - Smart Match configuration
 * @returns {number} Score (0 to perfect_score)
 */
function scorePriceMatch(lead, unit, floorPlan, config) {
    const leadPrice = parsePriceRange(lead.price_range);
    const unitRent = unit.rent || floorPlan.starting_at;

    if (leadPrice.min === null && leadPrice.max === null) return 0;
    if (!unitRent) return 0;

    const perfectScore = config.price_match_perfect_score || 25;
    const closeScore = config.price_match_close_score || 10;

    // Within budget: perfect score
    if (unitRent >= leadPrice.min && unitRent <= leadPrice.max) {
        return perfectScore;
    }

    // Within tolerance: close score
    const mode = config.rent_tolerance_mode || RENT_TOLERANCE_MODE.PERCENTAGE;
    const tolerancePercent = config.rent_tolerance_percent || 20;
    const toleranceFixed = config.rent_tolerance_fixed || 0;

    let adjustedMin, adjustedMax;

    if (mode === RENT_TOLERANCE_MODE.PERCENTAGE) {
        const minTolerance = leadPrice.min * (tolerancePercent / 100);
        const maxTolerance = leadPrice.max * (tolerancePercent / 100);
        adjustedMin = leadPrice.min - minTolerance;
        adjustedMax = leadPrice.max + maxTolerance;
    } else {
        adjustedMin = leadPrice.min - toleranceFixed;
        adjustedMax = leadPrice.max + toleranceFixed;
    }

    if (unitRent >= adjustedMin && unitRent <= adjustedMax) {
        return closeScore;
    }

    return 0;
}

/**
 * Score move-in date match based on config
 * @param {Object} lead - Lead object
 * @param {Object} unit - Unit object
 * @param {Object} config - Smart Match configuration
 * @returns {number} Score (0 to bonus)
 */
function scoreMoveInDate(lead, unit, config) {
    if (!lead.move_in_date) return 0;
    if (!unit.available_from) return 0;

    const desiredDate = parseDate(lead.move_in_date);
    const availableDate = parseDate(unit.available_from);

    if (!desiredDate || !availableDate) return 0;

    const bonus = config.move_in_date_bonus || 10;

    // Bonus if available by desired date
    if (availableDate <= desiredDate) {
        return bonus;
    }

    return 0;
}

/**
 * Score commission bonus based on config
 * @param {Object} property - Property object
 * @param {Object} config - Smart Match configuration
 * @returns {number} Score (0 to base_bonus + scaled bonus)
 */
function scoreCommissionBonus(property, config) {
    const commissionPct = property.commission_pct;

    if (!commissionPct) return 0;

    const threshold = config.commission_threshold_pct || 4.0;
    const baseBonus = config.commission_base_bonus || 80;
    const scaleBonus = config.commission_scale_bonus || 1;

    // No bonus if below threshold
    if (commissionPct < threshold) return 0;

    // Base bonus for meeting threshold
    let score = baseBonus;

    // Additional points for each 1% above threshold
    const percentAboveThreshold = commissionPct - threshold;
    score += Math.floor(percentAboveThreshold * scaleBonus);

    return score;
}

/**
 * Score PUMI bonus based on config
 * @param {Object} property - Property object
 * @param {Object} config - Smart Match configuration
 * @returns {number} Score (0 to bonus)
 */
function scorePumiBonus(property, config) {
    if (!property.is_pumi) return 0;

    const bonus = config.pumi_bonus || 20;
    return bonus;
}

/**
 * Score leniency bonus based on config
 * @param {Object} property - Property object
 * @param {Object} config - Smart Match configuration
 * @returns {number} Score (0 to max leniency bonus)
 */
function scoreLeniencyBonus(property, config) {
    if (!config.use_leniency_factor) return 0;
    if (!property.leniency) return 0;

    const leniency = property.leniency.toUpperCase();

    switch (leniency) {
        case 'LOW':
            return config.leniency_bonus_low || 0;
        case 'MEDIUM':
            return config.leniency_bonus_medium || 5;
        case 'HIGH':
            return config.leniency_bonus_high || 10;
        default:
            return 0;
    }
}

/**
 * Calculate total match score with config
 * @param {Object} lead - Lead object
 * @param {Object} unit - Unit object
 * @param {Object} floorPlan - Floor plan object
 * @param {Object} property - Property object
 * @param {Object} config - Smart Match configuration
 * @returns {Object} Score breakdown
 */
export function calculateMatchScoreWithConfig(lead, unit, floorPlan, property, config) {
    const priceScore = scorePriceMatch(lead, unit, floorPlan, config);
    const moveInScore = scoreMoveInDate(lead, unit, config);
    const commissionScore = scoreCommissionBonus(property, config);
    const pumiScore = scorePumiBonus(property, config);
    const leniencyScore = scoreLeniencyBonus(property, config);

    const totalScore = priceScore + moveInScore + commissionScore + pumiScore + leniencyScore;

    return {
        totalScore,
        breakdown: {
            priceMatch: priceScore,
            moveInDate: moveInScore,
            commission: commissionScore,
            pumi: pumiScore,
            leniency: leniencyScore
        }
    };
}

// ============================================
// MAIN SMART MATCH FUNCTION
// ============================================

/**
 * Get Smart Matches with configurable algorithm
 * @param {Object} lead - Lead object with preferences
 * @param {Array} unitsWithDetails - Array of {unit, floorPlan, property}
 * @param {Object} config - Smart Match configuration
 * @returns {Array} Sorted and limited array of matches
 */
export function getSmartMatchesWithConfig(lead, unitsWithDetails, config) {
    console.log(`Smart Match V2: Processing ${unitsWithDetails.length} units for lead`);

    // Step 1: Apply configurable hard filters
    const filteredUnits = applyConfigurableFilters(unitsWithDetails, lead, config);
    console.log(`After filtering: ${filteredUnits.length} units remain`);

    // Step 2: Calculate scores for filtered units
    const scoredUnits = filteredUnits.map(item => {
        const matchScore = calculateMatchScoreWithConfig(
            lead,
            item.unit,
            item.floorPlan,
            item.property,
            config
        );
        return { ...item, matchScore };
    });

    // Step 3: Apply minimum score threshold
    const minThreshold = config.min_score_threshold || 0;
    const aboveThreshold = scoredUnits.filter(item => item.matchScore.totalScore >= minThreshold);
    console.log(`After score threshold (${minThreshold}): ${aboveThreshold.length} units remain`);

    // Step 4: Group by property_id and select highest-scoring unit per property
    const propertyMap = new Map();
    aboveThreshold.forEach(item => {
        const propertyId = item.property.id;
        const existingItem = propertyMap.get(propertyId);

        if (!existingItem || item.matchScore.totalScore > existingItem.matchScore.totalScore) {
            propertyMap.set(propertyId, item);
        }
    });

    console.log(`After grouping by property: ${propertyMap.size} properties`);

    // Step 5: Convert map to array
    let matches = Array.from(propertyMap.values());

    // Step 6: Sort based on config
    const sortBy = config.sort_by || SORT_BY.SCORE;

    switch (sortBy) {
        case SORT_BY.SCORE:
            // Sort by score (highest first)
            matches.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
            break;

        case SORT_BY.RENT_LOW:
            // Sort by rent (lowest first)
            matches.sort((a, b) => {
                const rentA = a.unit.rent || a.floorPlan.starting_at || 0;
                const rentB = b.unit.rent || b.floorPlan.starting_at || 0;
                return rentA - rentB;
            });
            break;

        case SORT_BY.RENT_HIGH:
            // Sort by rent (highest first)
            matches.sort((a, b) => {
                const rentA = a.unit.rent || a.floorPlan.starting_at || 0;
                const rentB = b.unit.rent || b.floorPlan.starting_at || 0;
                return rentB - rentA;
            });
            break;

        case SORT_BY.AVAILABILITY:
            // Sort by availability date (soonest first)
            matches.sort((a, b) => {
                const dateA = parseDate(a.unit.available_from) || new Date();
                const dateB = parseDate(b.unit.available_from) || new Date();
                return dateA - dateB;
            });
            break;

        default:
            // Default to score sorting
            matches.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
    }

    // Step 7: Apply limit
    const limit = config.max_properties_to_show || 10;
    const topMatches = matches.slice(0, limit);

    console.log(`Smart Match V2: Returning ${topMatches.length} matches (sorted by ${sortBy})`);

    return topMatches;
}

