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
	const testBtn = document.getElementById('testSmartMatchBtn');

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

	// Test Smart Match button handler
	if (testBtn) {
		testBtn.addEventListener('click', () => {
			openTestModal();
		});
	}

	// Test modal event listeners
	setupTestModalListeners();
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

/**
 * Open the test Smart Match modal
 */
function openTestModal() {
	console.log('🧪 Opening Test Smart Match modal...');

	// Set default move-in date to 30 days from now
	const defaultDate = new Date();
	defaultDate.setDate(defaultDate.getDate() + 30);
	const dateInput = document.getElementById('testMoveInDate');
	if (dateInput) {
		dateInput.value = defaultDate.toISOString().split('T')[0];
	}

	// Show modal
	const modal = document.getElementById('testSmartMatchModal');
	if (modal) {
		modal.classList.remove('hidden');

		// Focus first input for accessibility
		const firstInput = document.getElementById('testBedrooms');
		if (firstInput) {
			setTimeout(() => firstInput.focus(), 100);
		}
	}
}

/**
 * Close the test Smart Match modal
 */
function closeTestModal() {
	const modal = document.getElementById('testSmartMatchModal');
	if (modal) {
		modal.classList.add('hidden');
	}
}

/**
 * Set up test modal event listeners
 */
function setupTestModalListeners() {
	const closeBtn = document.getElementById('closeTestSmartMatch');
	const cancelBtn = document.getElementById('cancelTestSmartMatch');
	const runBtn = document.getElementById('runTestSmartMatch');
	const modal = document.getElementById('testSmartMatchModal');

	if (closeBtn) {
		closeBtn.addEventListener('click', closeTestModal);
	}

	if (cancelBtn) {
		cancelBtn.addEventListener('click', closeTestModal);
	}

	if (runBtn) {
		runBtn.addEventListener('click', async () => {
			await runSmartMatchTest();
		});
	}

	// ESC key to close modal
	if (modal) {
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
				closeTestModal();
			}
		});
	}
}

/**
 * Run Smart Match test with current configuration
 */
async function runSmartMatchTest() {
	console.log('🧪 Running Smart Match test...');

	try {
		// Validate form
		const form = document.getElementById('testSmartMatchForm');
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		// Extract test criteria
		const testLead = {
			id: 'test-lead',
			name: 'Test Lead',
			bedrooms: document.getElementById('testBedrooms').value,
			bathrooms: document.getElementById('testBathrooms').value,
			price_range: `0-${document.getElementById('testBudget').value}`,
			move_in_date: document.getElementById('testMoveInDate').value,
			pets: document.getElementById('testPets').value === 'yes',
			parking_needed: document.getElementById('testParking').value === 'yes',
			area_of_town: document.getElementById('testCity').value
		};

		console.log('📝 Test lead criteria:', testLead);

		// Get current form configuration (including unsaved changes)
		const currentConfig = extractFormData();
		console.log('⚙️ Using current configuration:', currentConfig);

		// Show loading state
		const runBtn = document.getElementById('runTestSmartMatch');
		const originalText = runBtn.innerHTML;
		runBtn.disabled = true;
		runBtn.innerHTML = '<span style="display: flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>Running Test...</span>';

		// Fetch all units with details
		const { getSupabase } = await import('../../api/supabase-api.js');
		const supabase = getSupabase();

		const { data: units, error: unitsError } = await supabase
			.from('units')
			.select(`
				*,
				floor_plan:floor_plans(*),
				property:properties(*)
			`)
			.eq('is_available', true);

		if (unitsError) {
			throw new Error('Failed to fetch units: ' + unitsError.message);
		}

		console.log(`📊 Fetched ${units.length} available units`);

		// Transform units to expected format
		const unitsWithDetails = units.map(u => ({
			unit: u,
			floorPlan: u.floor_plan,
			property: u.property
		}));

		// Run Smart Match v2 with current config
		const { getSmartMatchesWithConfig } = await import('../../utils/smart-match-v2.js');
		const matches = getSmartMatchesWithConfig(testLead, unitsWithDetails, currentConfig);

		console.log(`✅ Smart Match returned ${matches.length} matches`);

		// Close test modal
		closeTestModal();

		// Restore button state
		runBtn.disabled = false;
		runBtn.innerHTML = originalText;

		// Show results in matches modal
		await showTestResults(testLead, matches, currentConfig);

	} catch (error) {
		console.error('❌ Error running Smart Match test:', error);
		if (window.toast) {
			window.toast('Failed to run test: ' + error.message, 'error');
		}

		// Restore button state
		const runBtn = document.getElementById('runTestSmartMatch');
		if (runBtn) {
			runBtn.disabled = false;
			runBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Run Test';
		}
	}
}

/**
 * Show test results in matches modal
 */
async function showTestResults(testLead, matches, config) {
	console.log('📊 Displaying test results...');

	// Update modal title
	const titleEl = document.getElementById('leadNameTitle2');
	if (titleEl) {
		titleEl.textContent = 'Test Lead';
	}

	// Add test banner to modal
	const modal = document.getElementById('matchesModal');
	const modalHeader = modal.querySelector('.modal-header');

	// Remove existing test banner if any
	const existingBanner = modal.querySelector('.test-results-banner');
	if (existingBanner) {
		existingBanner.remove();
	}

	// Create test banner
	const testBanner = document.createElement('div');
	testBanner.className = 'test-results-banner';
	testBanner.innerHTML = `
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M9 11l3 3L22 4"></path>
			<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
		</svg>
		<div>
			<strong>Test Results - Using Current Configuration</strong>
			<p>These results reflect your current form settings, including any unsaved changes.</p>
		</div>
	`;
	modalHeader.after(testBanner);

	// Transform matches to expected format for grid
	const transformedMatches = matches.map(match => ({
		id: match.unit.id,
		name: match.property.name,
		neighborhoods: [match.property.neighborhood || ''],
		rent_min: match.unit.rent || match.floorPlan.rent_min,
		rent_max: match.unit.rent || match.floorPlan.rent_max,
		beds_min: match.floorPlan.bedrooms,
		beds_max: match.floorPlan.bedrooms,
		baths_min: match.floorPlan.bathrooms,
		baths_max: match.floorPlan.bathrooms,
		sqft_min: match.floorPlan.sqft_min,
		sqft_max: match.floorPlan.sqft_max,
		specials_text: match.property.specials_text || '',
		commission: match.property.commission_percentage || 0,
		is_pumi: match.property.is_pumi || false,
		matchScore: match.matchScore
	}));

	// Populate grid
	const grid = document.getElementById('listingsGrid');
	if (grid) {
		grid.innerHTML = transformedMatches.map(prop => `
			<div class="listing-card">
				<div class="listing-header">
					<h4>${prop.name}</h4>
					<div class="listing-badges">
						${prop.is_pumi ? '<span class="badge badge-pumi">PUMI</span>' : ''}
						${prop.commission >= 4 ? `<span class="badge badge-commission">${prop.commission}% Commission</span>` : ''}
					</div>
				</div>
				<div class="listing-details">
					<p><strong>Location:</strong> ${prop.neighborhoods[0] || 'N/A'}</p>
					<p><strong>Rent:</strong> $${prop.rent_min}${prop.rent_max !== prop.rent_min ? ' - $' + prop.rent_max : ''}</p>
					<p><strong>Beds/Baths:</strong> ${prop.beds_min}${prop.beds_max !== prop.beds_min ? '-' + prop.beds_max : ''} bd / ${prop.baths_min}${prop.baths_max !== prop.baths_min ? '-' + prop.baths_max : ''} ba</p>
					<p><strong>Size:</strong> ${prop.sqft_min}${prop.sqft_max !== prop.sqft_min ? '-' + prop.sqft_max : ''} sqft</p>
					${prop.specials_text ? `<p class="specials"><strong>Specials:</strong> ${prop.specials_text}</p>` : ''}
				</div>
				<div class="listing-score">
					<strong>Match Score:</strong> ${Math.round(prop.matchScore.totalScore)} / 100
					<div class="score-breakdown">
						<small>Price: ${Math.round(prop.matchScore.priceScore)} | Move-in: ${Math.round(prop.matchScore.moveInScore)} | Commission: ${Math.round(prop.matchScore.commissionScore)} | PUMI: ${Math.round(prop.matchScore.pumiScore)}</small>
					</div>
				</div>
			</div>
		`).join('');
	}

	// Show modal
	modal.classList.remove('hidden');

	// Show success toast
	if (window.toast) {
		window.toast(`Test complete! Found ${matches.length} matching properties.`, 'success');
	}
}

