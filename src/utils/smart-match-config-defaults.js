/**
 * Smart Match Configuration - Default Values and Constants
 * 
 * This file defines the default configuration for the Smart Match algorithm.
 * These values match the current hardcoded algorithm behavior.
 */

// ============================================
// ENUMS - Filter and Sort Modes
// ============================================

/**
 * Bedroom/Bathroom matching modes
 */
export const MATCH_MODE = {
    EXACT: 'exact',       // Must match exactly
    FLEXIBLE: 'flexible', // Allow ±tolerance
    RANGE: 'range'        // Any value within range
};

/**
 * Rent tolerance calculation modes
 */
export const RENT_TOLERANCE_MODE = {
    PERCENTAGE: 'percentage',     // Calculate as % of budget
    FIXED_AMOUNT: 'fixed_amount'  // Fixed dollar amount
};

/**
 * Policy filtering modes (pet, income, credit, background)
 */
export const POLICY_MODE = {
    IGNORE: 'ignore',   // Don't filter by this criteria
    STRICT: 'strict',   // Must meet requirement
    LENIENT: 'lenient'  // Use property leniency factor
};

/**
 * Result sorting options
 */
export const SORT_BY = {
    SCORE: 'score',             // Sort by match score (highest first)
    RENT_LOW: 'rent_low',       // Sort by rent (lowest first)
    RENT_HIGH: 'rent_high',     // Sort by rent (highest first)
    AVAILABILITY: 'availability' // Sort by availability date (soonest first)
};

/**
 * Property leniency levels
 */
export const LENIENCY_LEVEL = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
};

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Default Smart Match configuration
 * These values match the current hardcoded algorithm behavior
 */
export const DEFAULT_SMART_MATCH_CONFIG = {
    // Metadata
    name: 'Default Configuration',
    is_active: true,
    
    // ============================================
    // FILTERING CRITERIA
    // ============================================
    
    // Bedroom Matching
    bedroom_match_mode: MATCH_MODE.EXACT,
    bedroom_tolerance: 0,
    
    // Bathroom Matching
    bathroom_match_mode: MATCH_MODE.EXACT,
    bathroom_tolerance: 0,
    
    // Rent Range Tolerance
    rent_tolerance_percent: 20,
    rent_tolerance_mode: RENT_TOLERANCE_MODE.PERCENTAGE,
    rent_tolerance_fixed: 0,
    
    // Move-in Date Flexibility
    move_in_flexibility_days: 30,
    
    // Pet Policy Filtering
    pet_policy_mode: POLICY_MODE.IGNORE,
    
    // Income Requirements
    income_requirement_mode: POLICY_MODE.IGNORE,
    income_multiplier: 3.0,
    
    // Credit Score Requirements
    credit_score_mode: POLICY_MODE.IGNORE,
    min_credit_score: 600,
    
    // Background Check Requirements
    background_check_mode: POLICY_MODE.IGNORE,
    
    // Leniency Factor
    use_leniency_factor: true,
    
    // ============================================
    // SCORING WEIGHTS
    // ============================================
    
    // Base Scoring (Lead Preference Matching)
    price_match_perfect_score: 25,
    price_match_close_score: 10,
    move_in_date_bonus: 10,
    
    // Business Priority Bonuses
    commission_threshold_pct: 4.0,
    commission_base_bonus: 80,
    commission_scale_bonus: 1,
    
    pumi_bonus: 20,
    
    // Leniency Bonuses
    leniency_bonus_low: 0,
    leniency_bonus_medium: 5,
    leniency_bonus_high: 10,
    
    // ============================================
    // DISPLAY SETTINGS
    // ============================================
    
    max_properties_to_show: 10,
    min_score_threshold: 0,
    sort_by: SORT_BY.SCORE
};

// ============================================
// VALIDATION RULES
// ============================================

/**
 * Validation rules for configuration values
 */
export const VALIDATION_RULES = {
    bedroom_tolerance: {
        min: 0,
        max: 3,
        type: 'integer',
        description: 'Must be between 0 and 3'
    },
    bathroom_tolerance: {
        min: 0,
        max: 2,
        type: 'decimal',
        description: 'Must be between 0 and 2'
    },
    rent_tolerance_percent: {
        min: 0,
        max: 100,
        type: 'integer',
        description: 'Must be between 0 and 100'
    },
    rent_tolerance_fixed: {
        min: 0,
        max: 5000,
        type: 'integer',
        description: 'Must be between 0 and 5000'
    },
    move_in_flexibility_days: {
        min: 0,
        max: 365,
        type: 'integer',
        description: 'Must be between 0 and 365'
    },
    income_multiplier: {
        min: 1.0,
        max: 10.0,
        type: 'decimal',
        description: 'Must be between 1.0 and 10.0'
    },
    min_credit_score: {
        min: 300,
        max: 850,
        type: 'integer',
        description: 'Must be between 300 and 850'
    },
    price_match_perfect_score: {
        min: 0,
        max: 100,
        type: 'integer',
        description: 'Must be between 0 and 100'
    },
    price_match_close_score: {
        min: 0,
        max: 100,
        type: 'integer',
        description: 'Must be between 0 and 100'
    },
    move_in_date_bonus: {
        min: 0,
        max: 50,
        type: 'integer',
        description: 'Must be between 0 and 50'
    },
    commission_threshold_pct: {
        min: 0,
        max: 20,
        type: 'decimal',
        description: 'Must be between 0 and 20'
    },
    commission_base_bonus: {
        min: 0,
        max: 200,
        type: 'integer',
        description: 'Must be between 0 and 200'
    },
    commission_scale_bonus: {
        min: 0,
        max: 10,
        type: 'integer',
        description: 'Must be between 0 and 10'
    },
    pumi_bonus: {
        min: 0,
        max: 100,
        type: 'integer',
        description: 'Must be between 0 and 100'
    },
    leniency_bonus_low: {
        min: 0,
        max: 50,
        type: 'integer',
        description: 'Must be between 0 and 50'
    },
    leniency_bonus_medium: {
        min: 0,
        max: 50,
        type: 'integer',
        description: 'Must be between 0 and 50'
    },
    leniency_bonus_high: {
        min: 0,
        max: 50,
        type: 'integer',
        description: 'Must be between 0 and 50'
    },
    max_properties_to_show: {
        min: 1,
        max: 50,
        type: 'integer',
        description: 'Must be between 1 and 50'
    },
    min_score_threshold: {
        min: 0,
        max: 200,
        type: 'integer',
        description: 'Must be between 0 and 200'
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate a configuration value against its rules
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validateConfigValue(field, value) {
    const rules = VALIDATION_RULES[field];
    
    if (!rules) {
        return { valid: true, error: null };
    }
    
    // Check type
    if (rules.type === 'integer' && !Number.isInteger(value)) {
        return { valid: false, error: `${field} must be an integer` };
    }
    
    if (rules.type === 'decimal' && typeof value !== 'number') {
        return { valid: false, error: `${field} must be a number` };
    }
    
    // Check range
    if (value < rules.min || value > rules.max) {
        return { valid: false, error: `${field} ${rules.description}` };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate an entire configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateConfig(config) {
    const errors = [];
    
    // Validate all numeric fields
    for (const [field, rules] of Object.entries(VALIDATION_RULES)) {
        if (config[field] !== undefined) {
            const result = validateConfigValue(field, config[field]);
            if (!result.valid) {
                errors.push(result.error);
            }
        }
    }
    
    // Validate enum fields
    if (config.bedroom_match_mode && !Object.values(MATCH_MODE).includes(config.bedroom_match_mode)) {
        errors.push('Invalid bedroom_match_mode');
    }
    
    if (config.bathroom_match_mode && !Object.values(MATCH_MODE).includes(config.bathroom_match_mode)) {
        errors.push('Invalid bathroom_match_mode');
    }
    
    if (config.rent_tolerance_mode && !Object.values(RENT_TOLERANCE_MODE).includes(config.rent_tolerance_mode)) {
        errors.push('Invalid rent_tolerance_mode');
    }
    
    if (config.pet_policy_mode && !Object.values(POLICY_MODE).includes(config.pet_policy_mode)) {
        errors.push('Invalid pet_policy_mode');
    }
    
    if (config.income_requirement_mode && !Object.values(POLICY_MODE).includes(config.income_requirement_mode)) {
        errors.push('Invalid income_requirement_mode');
    }
    
    if (config.credit_score_mode && !Object.values(POLICY_MODE).includes(config.credit_score_mode)) {
        errors.push('Invalid credit_score_mode');
    }
    
    if (config.background_check_mode && !Object.values(POLICY_MODE).includes(config.background_check_mode)) {
        errors.push('Invalid background_check_mode');
    }
    
    if (config.sort_by && !Object.values(SORT_BY).includes(config.sort_by)) {
        errors.push('Invalid sort_by');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get a deep copy of the default configuration
 * @returns {Object} Deep copy of DEFAULT_SMART_MATCH_CONFIG
 */
export function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_SMART_MATCH_CONFIG));
}

