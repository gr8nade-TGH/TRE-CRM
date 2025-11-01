/**
 * Smart Match Configuration Page Module
 * Handles the full-page Smart Match configuration interface
 * 
 * @module admin/smart-match-page
 */

import { getActiveConfig, updateActiveConfig, resetToDefaults } from '../../api/smart-match-config-api.js';
import { DEFAULT_CONFIG } from '../../utils/smart-match-config-defaults.js';

/**
 * Initialize the Smart Match configuration page
 * Loads current config and populates the form
 */
export async function initializeConfigPage() {
	console.log('🎯 Initializing Smart Match Configuration Page...');

	try {
		// Load current configuration
		const config = await getActiveConfig();
		console.log('📊 Loaded configuration:', config);

		// Populate summary card
		updateSummaryCard(config);

		// Populate form fields
		populateForm(config);

		// Set up event listeners
		setupEventListeners();

		console.log('✅ Smart Match Configuration Page initialized');
	} catch (error) {
		console.error('❌ Error initializing config page:', error);
		if (window.toast) {
			window.toast('Failed to load configuration', 'error');
		}
	}
}

/**
 * Update the summary card with current configuration
 * @param {Object} config - Configuration object
 */
function updateSummaryCard(config) {
	// Bedroom mode
	const bedroomModeMap = {
		'exact': 'Exact Match',
		'flexible': 'Allow ±1',
		'minimum': 'Minimum'
	};
	document.getElementById('summaryBedroomMode').textContent = 
		bedroomModeMap[config.bedroom_match_mode] || 'Exact Match';

	// Bathroom mode
	const bathroomModeMap = {
		'exact': 'Exact Match',
		'flexible': 'Allow ±0.5',
		'minimum': 'Minimum'
	};
	document.getElementById('summaryBathroomMode').textContent = 
		bathroomModeMap[config.bathroom_match_mode] || 'Exact Match';

	// Rent tolerance
	document.getElementById('summaryRentTolerance').textContent = 
		`±${config.rent_tolerance_percent}%`;

	// Max properties
	document.getElementById('summaryMaxProperties').textContent = 
		config.max_results || 10;

	// Last modified
	const lastModified = config.updated_at 
		? new Date(config.updated_at).toLocaleDateString()
		: 'Never';
	document.getElementById('summaryLastModified').textContent = lastModified;
}

/**
 * Populate form fields with configuration values
 * @param {Object} config - Configuration object
 */
function populateForm(config) {
	// Filtering Settings
	document.getElementById('bedroomMatchMode').value = config.bedroom_match_mode || 'exact';
	document.getElementById('bathroomMatchMode').value = config.bathroom_match_mode || 'exact';
	document.getElementById('rentTolerancePercent').value = config.rent_tolerance_percent || 20;
	document.getElementById('petPolicyStrict').value = String(config.pet_policy_strict ?? true);
	document.getElementById('parkingRequired').value = String(config.parking_required ?? false);
	document.getElementById('availabilityWindowDays').value = config.availability_window_days || 30;

	// Scoring Settings
	document.getElementById('priceMatchWeight').value = config.price_match_weight || 30;
	document.getElementById('moveInDateWeight').value = config.move_in_date_weight || 25;
	document.getElementById('commissionWeight').value = config.commission_weight || 20;
	document.getElementById('pumiWeight').value = config.pumi_weight || 15;
	document.getElementById('leniencyWeight').value = config.leniency_weight || 10;
	document.getElementById('commissionThreshold').value = config.commission_threshold || 4.0;

	// Display Settings
	document.getElementById('maxResults').value = config.max_results || 10;
	document.getElementById('sortBy').value = config.sort_by || 'score';
	document.getElementById('minScoreThreshold').value = config.min_score_threshold || 50;
}

/**
 * Extract configuration from form fields
 * @returns {Object} Configuration object
 */
function extractFormData() {
	return {
		// Filtering Settings
		bedroom_match_mode: document.getElementById('bedroomMatchMode').value,
		bathroom_match_mode: document.getElementById('bathroomMatchMode').value,
		rent_tolerance_percent: parseFloat(document.getElementById('rentTolerancePercent').value),
		pet_policy_strict: document.getElementById('petPolicyStrict').value === 'true',
		parking_required: document.getElementById('parkingRequired').value === 'true',
		availability_window_days: parseInt(document.getElementById('availabilityWindowDays').value),

		// Scoring Settings
		price_match_weight: parseFloat(document.getElementById('priceMatchWeight').value),
		move_in_date_weight: parseFloat(document.getElementById('moveInDateWeight').value),
		commission_weight: parseFloat(document.getElementById('commissionWeight').value),
		pumi_weight: parseFloat(document.getElementById('pumiWeight').value),
		leniency_weight: parseFloat(document.getElementById('leniencyWeight').value),
		commission_threshold: parseFloat(document.getElementById('commissionThreshold').value),

		// Display Settings
		max_results: parseInt(document.getElementById('maxResults').value),
		sort_by: document.getElementById('sortBy').value,
		min_score_threshold: parseFloat(document.getElementById('minScoreThreshold').value)
	};
}

/**
 * Set up event listeners for form actions
 */
function setupEventListeners() {
	const form = document.getElementById('smartMatchConfigForm');
	const resetBtn = document.getElementById('resetConfigBtn');

	// Form submit handler
	if (form) {
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			await handleSave();
		});
	}

	// Reset button handler
	if (resetBtn) {
		resetBtn.addEventListener('click', async () => {
			await handleReset();
		});
	}
}

/**
 * Handle save configuration
 */
async function handleSave() {
	console.log('💾 Saving configuration...');

	try {
		// Get current user
		const currentUser = window.currentUser;
		if (!currentUser || !currentUser.id) {
			throw new Error('User not authenticated');
		}

		// Extract form data
		const updates = extractFormData();
		console.log('📝 Configuration updates:', updates);

		// Save to database
		const savedConfig = await updateActiveConfig(updates, currentUser.id);
		console.log('✅ Configuration saved:', savedConfig);

		// Update summary card
		updateSummaryCard(savedConfig);

		// Show success message
		if (window.toast) {
			window.toast('Configuration saved successfully!', 'success');
		}

		// Scroll to top to show summary
		window.scrollTo({ top: 0, behavior: 'smooth' });

	} catch (error) {
		console.error('❌ Error saving configuration:', error);
		if (window.toast) {
			window.toast('Failed to save configuration: ' + error.message, 'error');
		}
	}
}

/**
 * Handle reset to defaults
 */
async function handleReset() {
	console.log('🔄 Resetting to defaults...');

	// Confirm with user
	const confirmed = confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.');
	if (!confirmed) {
		return;
	}

	try {
		// Get current user
		const currentUser = window.currentUser;
		if (!currentUser || !currentUser.id) {
			throw new Error('User not authenticated');
		}

		// Reset to defaults
		const defaultConfig = await resetToDefaults(currentUser.id);
		console.log('✅ Reset to defaults:', defaultConfig);

		// Update summary card
		updateSummaryCard(defaultConfig);

		// Populate form with defaults
		populateForm(defaultConfig);

		// Show success message
		if (window.toast) {
			window.toast('Configuration reset to defaults!', 'success');
		}

		// Scroll to top to show summary
		window.scrollTo({ top: 0, behavior: 'smooth' });

	} catch (error) {
		console.error('❌ Error resetting configuration:', error);
		if (window.toast) {
			window.toast('Failed to reset configuration: ' + error.message, 'error');
		}
	}
}

