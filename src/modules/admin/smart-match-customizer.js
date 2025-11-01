/**
 * Smart Match Customizer Module
 * Handles business logic for the Smart Match configuration interface
 */

import { getActiveConfig, updateActiveConfig, resetToDefaults } from '../../api/smart-match-config-api.js';
import { DEFAULT_SMART_MATCH_CONFIG, validateConfig } from '../../utils/smart-match-config-defaults.js';
import {
    populateCustomizerForm,
    extractConfigFromForm,
    updateConfigInfoCard,
    showValidationErrors
} from './smart-match-customizer-ui.js';
import { toast } from '../../utils/helpers.js';

/**
 * Initialize the Smart Match Customizer
 */
export async function initializeCustomizer() {
    console.log('Initializing Smart Match Customizer...');

    // Load active configuration and update info card
    await loadAndDisplayConfig();

    // Set up event listeners
    setupEventListeners();
}

/**
 * Load active configuration and display it
 */
async function loadAndDisplayConfig() {
    try {
        const config = await getActiveConfig();
        console.log('Loaded active config:', config);

        // Update the info card on the Admin page
        updateConfigInfoCard(config);

        return config;
    } catch (error) {
        console.error('Error loading config:', error);
        toast('Failed to load configuration', 'error');
        return null;
    }
}

/**
 * Set up event listeners for the customizer
 */
function setupEventListeners() {
    // Open customizer modal
    const openBtn = document.getElementById('openSmartMatchCustomizerBtn');
    if (openBtn) {
        openBtn.addEventListener('click', openCustomizer);
    }

    // Close customizer modal
    const closeBtn = document.getElementById('closeSmartMatchCustomizer');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCustomizer);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelSmartMatchConfig');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeCustomizer);
    }

    // Save configuration
    const saveBtn = document.getElementById('saveSmartMatchConfig');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConfiguration);
    }

    // Reset to defaults
    const resetBtn = document.getElementById('resetConfigToDefaults');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetConfiguration);
    }

    // Dynamic field enabling/disabling based on mode selection
    setupDynamicFieldHandlers();
}

/**
 * Set up dynamic field handlers (enable/disable based on selections)
 */
function setupDynamicFieldHandlers() {
    // Enable/disable rent tolerance fields based on mode
    const rentModeSelect = document.getElementById('rentToleranceMode');
    const rentPercentInput = document.getElementById('rentTolerancePercent');
    const rentFixedInput = document.getElementById('rentToleranceFixed');

    if (rentModeSelect && rentPercentInput && rentFixedInput) {
        rentModeSelect.addEventListener('change', () => {
            const mode = rentModeSelect.value;
            if (mode === 'percentage') {
                rentPercentInput.disabled = false;
                rentFixedInput.disabled = true;
            } else {
                rentPercentInput.disabled = true;
                rentFixedInput.disabled = false;
            }
        });
    }

    // Enable/disable bedroom tolerance based on match mode
    const bedroomModeSelect = document.getElementById('bedroomMatchMode');
    const bedroomToleranceInput = document.getElementById('bedroomTolerance');

    if (bedroomModeSelect && bedroomToleranceInput) {
        bedroomModeSelect.addEventListener('change', () => {
            const mode = bedroomModeSelect.value;
            bedroomToleranceInput.disabled = mode !== 'flexible';
        });
    }

    // Enable/disable bathroom tolerance based on match mode
    const bathroomModeSelect = document.getElementById('bathroomMatchMode');
    const bathroomToleranceInput = document.getElementById('bathroomTolerance');

    if (bathroomModeSelect && bathroomToleranceInput) {
        bathroomModeSelect.addEventListener('change', () => {
            const mode = bathroomModeSelect.value;
            bathroomToleranceInput.disabled = mode !== 'flexible';
        });
    }

    // Enable/disable income multiplier based on mode
    const incomeModeSelect = document.getElementById('incomeRequirementMode');
    const incomeMultiplierInput = document.getElementById('incomeMultiplier');

    if (incomeModeSelect && incomeMultiplierInput) {
        incomeModeSelect.addEventListener('change', () => {
            const mode = incomeModeSelect.value;
            incomeMultiplierInput.disabled = mode === 'ignore';
        });
    }

    // Enable/disable credit score based on mode
    const creditModeSelect = document.getElementById('creditScoreMode');
    const creditScoreInput = document.getElementById('minCreditScore');

    if (creditModeSelect && creditScoreInput) {
        creditModeSelect.addEventListener('change', () => {
            const mode = creditModeSelect.value;
            creditScoreInput.disabled = mode === 'ignore';
        });
    }
}

/**
 * Open the customizer modal
 */
async function openCustomizer() {
    console.log('Opening Smart Match Customizer...');

    // Load current configuration
    const config = await getActiveConfig();

    if (config) {
        // Populate form with current config
        populateCustomizerForm(config);

        // Trigger dynamic field handlers to set initial state
        triggerDynamicFieldUpdates();
    }

    // Show modal
    const modal = document.getElementById('smartMatchCustomizerModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Close the customizer modal
 */
function closeCustomizer() {
    const modal = document.getElementById('smartMatchCustomizerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Trigger dynamic field updates to set initial disabled states
 */
function triggerDynamicFieldUpdates() {
    // Trigger change events to update field states
    const rentModeSelect = document.getElementById('rentToleranceMode');
    if (rentModeSelect) rentModeSelect.dispatchEvent(new Event('change'));

    const bedroomModeSelect = document.getElementById('bedroomMatchMode');
    if (bedroomModeSelect) bedroomModeSelect.dispatchEvent(new Event('change'));

    const bathroomModeSelect = document.getElementById('bathroomMatchMode');
    if (bathroomModeSelect) bathroomModeSelect.dispatchEvent(new Event('change'));

    const incomeModeSelect = document.getElementById('incomeRequirementMode');
    if (incomeModeSelect) incomeModeSelect.dispatchEvent(new Event('change'));

    const creditModeSelect = document.getElementById('creditScoreMode');
    if (creditModeSelect) creditModeSelect.dispatchEvent(new Event('change'));
}

/**
 * Save the configuration
 */
async function saveConfiguration() {
    console.log('Saving Smart Match configuration...');

    // Extract config from form
    const configData = extractConfigFromForm();

    // Validate configuration
    const validation = validateConfig(configData);
    if (!validation.valid) {
        showValidationErrors(validation.errors);
        return;
    }

    // Get current user from window.currentUser
    const currentUser = window.currentUser;
    if (!currentUser || !currentUser.id) {
        toast('You must be logged in to save configuration', 'error');
        return;
    }

    try {
        // Save configuration
        await updateActiveConfig(configData, currentUser.id);

        // Reload and display updated config
        await loadAndDisplayConfig();

        // Close modal
        closeCustomizer();

        // Show success message
        toast('Smart Match configuration saved successfully!', 'success');

        console.log('Configuration saved successfully');
    } catch (error) {
        console.error('Error saving configuration:', error);
        toast('Failed to save configuration: ' + error.message, 'error');
    }
}

/**
 * Reset configuration to defaults
 */
async function resetConfiguration() {
    if (!confirm('Are you sure you want to reset to default configuration? This will overwrite all current settings.')) {
        return;
    }

    console.log('Resetting to default configuration...');

    // Get current user from window.currentUser
    const currentUser = window.currentUser;
    if (!currentUser || !currentUser.id) {
        toast('You must be logged in to reset configuration', 'error');
        return;
    }

    try {
        // Reset to defaults
        await resetToDefaults(currentUser.id);

        // Reload form with defaults
        populateCustomizerForm(DEFAULT_SMART_MATCH_CONFIG);

        // Trigger dynamic field updates
        triggerDynamicFieldUpdates();

        // Show success message
        toast('Configuration reset to defaults', 'success');

        console.log('Configuration reset successfully');
    } catch (error) {
        console.error('Error resetting configuration:', error);
        toast('Failed to reset configuration: ' + error.message, 'error');
    }
}

