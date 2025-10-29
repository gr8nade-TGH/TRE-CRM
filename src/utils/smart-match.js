/**
 * Smart Match Algorithm for TRE CRM
 * 
 * Intelligently matches leads with property units based on preferences and business priorities.
 * 
 * Scoring System:
 * - Base Scoring (Lead Preference Matching): 0-120 points
 *   - Bedrooms: 30 points (exact), 15 points (±1 bed)
 *   - Bathrooms: 20 points (exact), 10 points (±0.5 bath)
 *   - Price Range: 25 points (within budget), 10 points (within 20% of budget)
 *   - Location: 25 points (exact city/neighborhood), 10 points (same market)
 *   - Move-in Date: 10 points bonus (if available by desired date)
 * 
 * - Business Priority Bonuses: 0-50 points
 *   - PUMI Property: +20 points
 *   - High Commission (4%+): +30 points
 *   - Medium Commission (3-4%): +20 points
 *   - Low Commission (2-3%): +10 points
 * 
 * Maximum Score: 170 points (120 base + 50 bonus)
 * Minimum Threshold: 40 points
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
 * Calculate bedroom match score
 * @param {object} lead - Lead preferences
 * @param {object} floorPlan - Floor plan details
 * @returns {number} - Score (0-30 points)
 */
function scoreBedroomMatch(lead, floorPlan) {
    const leadBeds = parseRange(lead.bedrooms);
    const unitBeds = floorPlan.beds;
    
    // Skip scoring if lead has no preference
    if (leadBeds.min === null && leadBeds.max === null) return 0;
    if (unitBeds === null || unitBeds === undefined) return 0;
    
    // Exact match: 30 points
    if (unitBeds >= leadBeds.min && unitBeds <= leadBeds.max) {
        return 30;
    }
    
    // Within ±1 bedroom: 15 points
    if (Math.abs(unitBeds - leadBeds.min) <= 1 || Math.abs(unitBeds - leadBeds.max) <= 1) {
        return 15;
    }
    
    return 0;
}

/**
 * Calculate bathroom match score
 * @param {object} lead - Lead preferences
 * @param {object} floorPlan - Floor plan details
 * @returns {number} - Score (0-20 points)
 */
function scoreBathroomMatch(lead, floorPlan) {
    const leadBaths = parseRange(lead.bathrooms);
    const unitBaths = parseFloat(floorPlan.baths);
    
    // Skip scoring if lead has no preference
    if (leadBaths.min === null && leadBaths.max === null) return 0;
    if (isNaN(unitBaths)) return 0;
    
    // Exact match: 20 points
    if (unitBaths >= leadBaths.min && unitBaths <= leadBaths.max) {
        return 20;
    }
    
    // Within ±0.5 bathroom: 10 points
    if (Math.abs(unitBaths - leadBaths.min) <= 0.5 || Math.abs(unitBaths - leadBaths.max) <= 0.5) {
        return 10;
    }
    
    return 0;
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
 * Calculate location match score
 * @param {object} lead - Lead preferences
 * @param {object} property - Property details
 * @returns {number} - Score (0-25 points)
 */
function scoreLocationMatch(lead, property) {
    const leadArea = (lead.area_of_town || '').toLowerCase().trim();
    const leadNeighborhoods = (lead.desired_neighborhoods || '').toLowerCase().trim();
    const propertyCity = (property.city || '').toLowerCase().trim();
    const propertyName = (property.name || '').toLowerCase().trim();
    
    // Skip scoring if lead has no preference
    if (!leadArea && !leadNeighborhoods) return 0;
    if (!propertyCity) return 0;
    
    // Exact city match or neighborhood match: 25 points
    if (leadArea && propertyCity.includes(leadArea)) {
        return 25;
    }
    
    if (leadNeighborhoods && (propertyCity.includes(leadNeighborhoods) || propertyName.includes(leadNeighborhoods))) {
        return 25;
    }
    
    // Same market area (partial match): 10 points
    // Check if they share common words (e.g., "North Austin" vs "Austin")
    const leadWords = leadArea.split(/\s+/);
    const cityWords = propertyCity.split(/\s+/);
    
    const hasCommonWord = leadWords.some(word => 
        word.length > 3 && cityWords.some(cityWord => cityWord.includes(word))
    );
    
    if (hasCommonWord) {
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
 * @param {object} property - Property details
 * @returns {number} - Score (0-30 points)
 */
function scoreCommissionBonus(property) {
    const commission = parseFloat(property.commission_pct);
    
    if (isNaN(commission)) return 0;
    
    // High commission (4%+): +30 points
    if (commission >= 4.0) return 30;
    
    // Medium commission (3-4%): +20 points
    if (commission >= 3.0) return 20;
    
    // Low commission (2-3%): +10 points
    if (commission >= 2.0) return 10;
    
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
 * @param {object} lead - Lead with preferences
 * @param {object} unit - Unit details
 * @param {object} floorPlan - Floor plan details
 * @param {object} property - Property details
 * @returns {object} - Score breakdown and total
 */
export function calculateMatchScore(lead, unit, floorPlan, property) {
    const scores = {
        bedrooms: scoreBedroomMatch(lead, floorPlan),
        bathrooms: scoreBathroomMatch(lead, floorPlan),
        price: scorePriceMatch(lead, unit, floorPlan),
        location: scoreLocationMatch(lead, property),
        moveInDate: scoreMoveInDate(lead, unit),
        commission: scoreCommissionBonus(property),
        pumi: scorePumiBonus(property)
    };
    
    const baseScore = scores.bedrooms + scores.bathrooms + scores.price + scores.location + scores.moveInDate;
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
 * Applies "one unit per property" rule: returns only the highest-scoring unit from each property
 * 
 * @param {object} lead - Lead with preferences
 * @param {array} unitsWithDetails - Array of units with joined floor_plan and property data
 * @param {number} limit - Maximum number of properties to return (default: 10)
 * @returns {array} - Top N matched properties (one unit per property), sorted by score
 */
export function getSmartMatches(lead, unitsWithDetails, limit = 10) {
    const MINIMUM_SCORE = 40;
    
    // Calculate scores for all units
    const scoredUnits = unitsWithDetails.map(item => {
        const score = calculateMatchScore(lead, item.unit, item.floorPlan, item.property);
        return {
            ...item,
            matchScore: score
        };
    });
    
    // Filter by minimum score threshold
    const qualifiedUnits = scoredUnits.filter(item => item.matchScore.totalScore >= MINIMUM_SCORE);
    
    // Group by property_id and select highest-scoring unit per property
    const propertyMap = new Map();
    
    qualifiedUnits.forEach(item => {
        const propertyId = item.property.id;
        const existingItem = propertyMap.get(propertyId);
        
        // Keep the unit with the highest score for this property
        if (!existingItem || item.matchScore.totalScore > existingItem.matchScore.totalScore) {
            propertyMap.set(propertyId, item);
        }
    });
    
    // Convert map to array and sort by score (highest first)
    const topMatches = Array.from(propertyMap.values())
        .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore)
        .slice(0, limit);
    
    return topMatches;
}

