/**
 * Smart Match Customizer UI Module
 * Handles rendering and updating the customizer interface
 */

import { MATCH_MODE, POLICY_MODE, RENT_TOLERANCE_MODE, SORT_BY } from '../../utils/smart-match-config-defaults.js';

/**
 * Populate the customizer form with configuration data
 * @param {Object} config - Configuration object
 */
export function populateCustomizerForm(config) {
    // Configuration Name
    document.getElementById('configNameInput').value = config.name || 'Default Configuration';

    // Filtering Criteria
    document.getElementById('bedroomMatchMode').value = config.bedroom_match_mode || MATCH_MODE.EXACT;
    document.getElementById('bedroomTolerance').value = config.bedroom_tolerance || 0;

    document.getElementById('bathroomMatchMode').value = config.bathroom_match_mode || MATCH_MODE.EXACT;
    document.getElementById('bathroomTolerance').value = config.bathroom_tolerance || 0;

    document.getElementById('rentToleranceMode').value = config.rent_tolerance_mode || RENT_TOLERANCE_MODE.PERCENTAGE;
    document.getElementById('rentTolerancePercent').value = config.rent_tolerance_percent || 20;
    document.getElementById('rentToleranceFixed').value = config.rent_tolerance_fixed || 0;

    document.getElementById('moveInFlexibilityDays').value = config.move_in_flexibility_days || 30;

    document.getElementById('petPolicyMode').value = config.pet_policy_mode || POLICY_MODE.IGNORE;

    document.getElementById('incomeRequirementMode').value = config.income_requirement_mode || POLICY_MODE.IGNORE;
    document.getElementById('incomeMultiplier').value = config.income_multiplier || 3.0;

    document.getElementById('creditScoreMode').value = config.credit_score_mode || POLICY_MODE.IGNORE;
    document.getElementById('minCreditScore').value = config.min_credit_score || 600;

    document.getElementById('backgroundCheckMode').value = config.background_check_mode || POLICY_MODE.IGNORE;

    // Scoring Weights
    document.getElementById('priceMatchPerfectScore').value = config.price_match_perfect_score || 25;
    document.getElementById('priceMatchCloseScore').value = config.price_match_close_score || 10;

    document.getElementById('moveInDateBonus').value = config.move_in_date_bonus || 10;

    document.getElementById('commissionThresholdPct').value = config.commission_threshold_pct || 4.0;
    document.getElementById('commissionBaseBonus').value = config.commission_base_bonus || 80;
    document.getElementById('commissionScaleBonus').value = config.commission_scale_bonus || 1;

    document.getElementById('pumiBonus').value = config.pumi_bonus || 20;

    document.getElementById('useLeniencyFactor').checked = config.use_leniency_factor !== false;
    document.getElementById('leniencyBonusLow').value = config.leniency_bonus_low || 0;
    document.getElementById('leniencyBonusMedium').value = config.leniency_bonus_medium || 5;
    document.getElementById('leniencyBonusHigh').value = config.leniency_bonus_high || 10;

    // Display Settings
    document.getElementById('maxPropertiesToShow').value = config.max_properties_to_show || 10;
    document.getElementById('minScoreThreshold').value = config.min_score_threshold || 0;
    document.getElementById('sortBy').value = config.sort_by || SORT_BY.SCORE;
}

/**
 * Extract configuration data from the form
 * @returns {Object} Configuration object
 */
export function extractConfigFromForm() {
    return {
        name: document.getElementById('configNameInput').value,

        // Filtering Criteria
        bedroom_match_mode: document.getElementById('bedroomMatchMode').value,
        bedroom_tolerance: parseInt(document.getElementById('bedroomTolerance').value),

        bathroom_match_mode: document.getElementById('bathroomMatchMode').value,
        bathroom_tolerance: parseFloat(document.getElementById('bathroomTolerance').value),

        rent_tolerance_mode: document.getElementById('rentToleranceMode').value,
        rent_tolerance_percent: parseInt(document.getElementById('rentTolerancePercent').value),
        rent_tolerance_fixed: parseInt(document.getElementById('rentToleranceFixed').value),

        move_in_flexibility_days: parseInt(document.getElementById('moveInFlexibilityDays').value),

        pet_policy_mode: document.getElementById('petPolicyMode').value,

        income_requirement_mode: document.getElementById('incomeRequirementMode').value,
        income_multiplier: parseFloat(document.getElementById('incomeMultiplier').value),

        credit_score_mode: document.getElementById('creditScoreMode').value,
        min_credit_score: parseInt(document.getElementById('minCreditScore').value),

        background_check_mode: document.getElementById('backgroundCheckMode').value,

        // Scoring Weights
        price_match_perfect_score: parseInt(document.getElementById('priceMatchPerfectScore').value),
        price_match_close_score: parseInt(document.getElementById('priceMatchCloseScore').value),

        move_in_date_bonus: parseInt(document.getElementById('moveInDateBonus').value),

        commission_threshold_pct: parseFloat(document.getElementById('commissionThresholdPct').value),
        commission_base_bonus: parseInt(document.getElementById('commissionBaseBonus').value),
        commission_scale_bonus: parseInt(document.getElementById('commissionScaleBonus').value),

        pumi_bonus: parseInt(document.getElementById('pumiBonus').value),

        use_leniency_factor: document.getElementById('useLeniencyFactor').checked,
        leniency_bonus_low: parseInt(document.getElementById('leniencyBonusLow').value),
        leniency_bonus_medium: parseInt(document.getElementById('leniencyBonusMedium').value),
        leniency_bonus_high: parseInt(document.getElementById('leniencyBonusHigh').value),

        // Display Settings
        max_properties_to_show: parseInt(document.getElementById('maxPropertiesToShow').value),
        min_score_threshold: parseInt(document.getElementById('minScoreThreshold').value),
        sort_by: document.getElementById('sortBy').value
    };
}

/**
 * Update the config info card on the Admin page
 * @param {Object} config - Configuration object
 */
export function updateConfigInfoCard(config) {
    // Update status badge
    const statusBadge = document.getElementById('configStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = config.is_active ? 'Active' : 'Inactive';
        statusBadge.style.background = config.is_active ? '#10b981' : '#6b7280';
    }

    // Update config name
    const configName = document.getElementById('configName');
    if (configName) {
        configName.textContent = config.name || 'Default Configuration';
    }

    // Update bedroom mode
    const bedroomMode = document.getElementById('configBedroomMode');
    if (bedroomMode) {
        const mode = config.bedroom_match_mode || 'exact';
        const tolerance = config.bedroom_tolerance || 0;
        bedroomMode.textContent = mode === 'exact' ? 'Exact Match' :
            mode === 'flexible' ? `Flexible (±${tolerance})` :
                'No Filter';
    }

    // Update bathroom mode
    const bathroomMode = document.getElementById('configBathroomMode');
    if (bathroomMode) {
        const mode = config.bathroom_match_mode || 'exact';
        const tolerance = config.bathroom_tolerance || 0;
        bathroomMode.textContent = mode === 'exact' ? 'Exact Match' :
            mode === 'flexible' ? `Flexible (±${tolerance})` :
                'No Filter';
    }

    // Update rent tolerance
    const rentTolerance = document.getElementById('configRentTolerance');
    if (rentTolerance) {
        const mode = config.rent_tolerance_mode || 'percentage';
        const percent = config.rent_tolerance_percent || 20;
        const fixed = config.rent_tolerance_fixed || 0;
        rentTolerance.textContent = mode === 'percentage' ? `±${percent}%` : `±$${fixed}`;
    }

    // Update commission threshold
    const commissionThreshold = document.getElementById('configCommissionThreshold');
    if (commissionThreshold) {
        commissionThreshold.textContent = `${config.commission_threshold_pct || 4.0}%`;
    }

    // Update max properties
    const maxProperties = document.getElementById('configMaxProperties');
    if (maxProperties) {
        maxProperties.textContent = config.max_properties_to_show || 10;
    }

    // Update last modified
    const lastModified = document.getElementById('configLastModified');
    if (lastModified) {
        if (config.updated_at) {
            const date = new Date(config.updated_at);
            lastModified.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } else {
            lastModified.textContent = 'Never';
        }
    }
}

/**
 * Show validation errors in the form
 * @param {Array<string>} errors - Array of error messages
 */
export function showValidationErrors(errors) {
    if (errors.length === 0) return;

    const errorMessage = errors.join('\n');
    alert('Configuration Validation Errors:\n\n' + errorMessage);
}

