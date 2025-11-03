/**
 * Customer View Module
 * Handles Customer View mode for showing listings to customers without commission info
 * 
 * @module listings/customer-view
 */

import { state } from '../../state/state.js';

/**
 * Toggle between Agent View and Customer View
 * @param {string} viewMode - 'agent' or 'customer'
 * @param {Function} renderListings - Callback to re-render listings
 */
export function toggleViewMode(viewMode, renderListings) {
	console.log(`🔄 Switching to ${viewMode} view`);

	const isCustomerView = viewMode === 'customer';
	state.customerView.isActive = isCustomerView;

	// Update button states
	const agentBtn = document.getElementById('agentViewBtn');
	const customerBtn = document.getElementById('customerViewBtn');

	if (agentBtn && customerBtn) {
		agentBtn.classList.toggle('active', !isCustomerView);
		customerBtn.classList.toggle('active', isCustomerView);
	}

	// Show/hide customer selector
	const customerSelectorGroup = document.getElementById('customerSelectorGroup');
	if (customerSelectorGroup) {
		customerSelectorGroup.style.display = isCustomerView ? 'flex' : 'none';
	}

	// Hide/show commission filter
	const commissionFilterGroup = document.getElementById('commissionFilterGroup');
	if (commissionFilterGroup) {
		commissionFilterGroup.style.display = isCustomerView ? 'none' : 'flex';
	}

	// Add/remove customer-view class to body for CSS targeting
	document.body.classList.toggle('customer-view', isCustomerView);

	// Clear customer selection when switching back to Agent View
	if (!isCustomerView) {
		clearCustomerSelection();
	}

	// Re-render listings
	renderListings();
}

/**
 * Clear customer selection and match scores
 */
export function clearCustomerSelection() {
	state.customerView.selectedCustomerId = null;
	state.customerView.selectedCustomer = null;
	state.customerView.matchScores.clear();
	state.customerView.unitScores.clear();

	const customerSelector = document.getElementById('customerSelector');
	if (customerSelector) {
		customerSelector.value = '';
	}

	const missingDataWarning = document.getElementById('missingDataWarning');
	if (missingDataWarning) {
		missingDataWarning.style.display = 'none';
	}
}

/**
 * Load active leads/customers for the selector dropdown
 * @param {Object} SupabaseAPI - Supabase API object
 * @param {Object} currentState - Application state
 * @returns {Promise<Array>} Array of active leads
 */
export async function loadCustomersForSelector(SupabaseAPI, currentState) {
	console.log('📋 Loading customers for selector...');

	try {
		const { getSupabase } = await import('../../api/supabase-api.js');
		const supabase = getSupabase();

		// Fetch all leads with basic info
		const { data: allLeads, error } = await supabase
			.from('leads')
			.select('id, name, email, preferences, health_status, assigned_agent_id, found_by_agent_id')
			.order('name');

		if (error) {
			console.error('❌ Error fetching leads:', error);
			throw error;
		}

		// Filter based on role
		let leads = allLeads;

		// If agent, only show their leads
		if (currentState.role === 'agent' && currentState.agentId) {
			leads = allLeads.filter(lead =>
				lead.assigned_agent_id === currentState.agentId ||
				lead.found_by_agent_id === currentState.agentId
			);
		}

		// Filter out closed and lost leads
		leads = leads.filter(lead =>
			lead.health_status !== 'closed' && lead.health_status !== 'lost'
		);

		console.log(`✅ Loaded ${leads.length} active customers`);

		// Populate dropdown
		const customerSelector = document.getElementById('customerSelector');
		if (customerSelector) {
			customerSelector.innerHTML = '<option value="">-- Choose a customer --</option>';

			leads.forEach(lead => {
				const option = document.createElement('option');
				option.value = lead.id;
				option.textContent = `${lead.name}${lead.email ? ` (${lead.email})` : ''}`;
				option.dataset.leadData = JSON.stringify(lead);
				customerSelector.appendChild(option);
			});
		}

		return leads;
	} catch (error) {
		console.error('❌ Error loading customers:', error);
		return [];
	}
}

/**
 * Handle customer selection change
 * @param {string} customerId - Selected customer ID
 * @param {Function} renderListings - Callback to re-render listings
 */
export async function handleCustomerSelection(customerId, renderListings) {
	console.log('👤 Customer selected:', customerId);

	if (!customerId) {
		clearCustomerSelection();
		renderListings();
		return;
	}

	// Get customer data from dropdown option
	const customerSelector = document.getElementById('customerSelector');
	const selectedOption = customerSelector?.options[customerSelector.selectedIndex];

	if (!selectedOption || !selectedOption.dataset.leadData) {
		console.error('❌ No customer data found');
		return;
	}

	const customerData = JSON.parse(selectedOption.dataset.leadData);
	state.customerView.selectedCustomerId = customerId;
	state.customerView.selectedCustomer = customerData;

	// Check for missing preferences
	const missingFields = checkMissingPreferences(customerData.preferences);

	const missingDataWarning = document.getElementById('missingDataWarning');
	const missingDataText = document.getElementById('missingDataText');

	if (missingFields.length > 0) {
		if (missingDataWarning && missingDataText) {
			missingDataWarning.style.display = 'flex';
			missingDataText.innerHTML = `Missing: ${missingFields.join(', ')} - <button class="edit-lead-btn" data-lead-id="${customerId}" style="background: none; border: none; color: #fbbf24; text-decoration: underline; font-weight: 700; cursor: pointer; padding: 0; font-size: inherit; font-family: inherit;">Edit Lead</button>`;

			// Add click handler to open modal directly (stay on Listings page)
			const editBtn = missingDataText.querySelector('.edit-lead-btn');
			if (editBtn) {
				editBtn.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					const leadId = e.currentTarget.dataset.leadId;
					console.log('🔧 Opening lead details modal for:', leadId);
					// Open the lead details modal directly
					if (window.openLeadDetailsModal) {
						window.openLeadDetailsModal(leadId);
					} else {
						console.error('❌ window.openLeadDetailsModal not found');
					}
				});
			}
		}
		console.warn('⚠️ Customer has missing preferences:', missingFields);
	} else {
		if (missingDataWarning) {
			missingDataWarning.style.display = 'none';
		}
	}

	// Re-render listings with match scores
	renderListings();
}

/**
 * Check for missing preference fields
 * @param {Object} preferences - Customer preferences object
 * @returns {Array<string>} Array of missing field names
 */
function checkMissingPreferences(preferences) {
	if (!preferences) {
		return ['All preferences'];
	}

	const missingFields = [];
	const requiredFields = {
		bedrooms: 'Bedrooms',
		bathrooms: 'Bathrooms',
		price_range: 'Budget',
		move_in_date: 'Move-in Date'
	};

	for (const [field, label] of Object.entries(requiredFields)) {
		if (!preferences[field]) {
			missingFields.push(label);
		}
	}

	return missingFields;
}

/**
 * Calculate match scores for all properties
 * @param {Array} properties - Array of property objects
 * @param {Object} customer - Customer/lead object with preferences
 * @param {Object} config - Smart Match configuration
 * @returns {Promise<Map>} Map of propertyId -> matchScore
 */
export async function calculateMatchScores(properties, customer, config) {
	console.log(`🎯 Calculating match scores for ${properties.length} properties...`);

	if (!customer || !customer.preferences) {
		console.warn('⚠️ No customer or preferences provided');
		return new Map();
	}

	try {
		// Import Smart Match utilities
		const { getSmartMatchesWithConfig } = await import('../../utils/smart-match-v2.js');
		const { getSupabase } = await import('../../api/supabase-api.js');
		const supabase = getSupabase();

		// Fetch all available units with floor plans and properties
		const { data: units, error: unitsError } = await supabase
			.from('units')
			.select(`
				*,
				floor_plan:floor_plans(*),
				property:properties(*)
			`)
			.eq('is_available', true)
			.not('available_from', 'is', null);

		if (unitsError) {
			console.error('❌ Error fetching units:', unitsError);
			return new Map();
		}

		// Transform to expected format
		const unitsWithDetails = units.map(unit => ({
			unit: {
				id: unit.id,
				floor_plan_id: unit.floor_plan_id,
				property_id: unit.property_id,
				unit_number: unit.unit_number,
				floor: unit.floor,
				rent: unit.rent,
				available_from: unit.available_from,
				is_available: unit.is_available,
				status: unit.status
			},
			floorPlan: unit.floor_plan,
			property: unit.property
		}));

		// Run Smart Match algorithm
		const matches = getSmartMatchesWithConfig(customer, unitsWithDetails, config);

		// Create maps for property-level and unit-level scores
		const propertyScoreMap = new Map(); // propertyId -> highest score
		const unitScoreMap = new Map(); // unitId -> { score, propertyId, isRecommended }
		const propertyBestUnitMap = new Map(); // propertyId -> unitId with highest score

		// First pass: find highest score per property
		matches.forEach(match => {
			const propertyId = match.property.id;
			const unitId = match.unit.id;
			const score = match.matchScore.totalScore;

			// Track highest score per property
			if (!propertyScoreMap.has(propertyId) || propertyScoreMap.get(propertyId) < score) {
				propertyScoreMap.set(propertyId, score);
				propertyBestUnitMap.set(propertyId, unitId);
			}
		});

		// Second pass: store unit scores with recommendation flag
		matches.forEach(match => {
			const propertyId = match.property.id;
			const unitId = match.unit.id;
			const score = match.matchScore.totalScore;
			const isRecommended = propertyBestUnitMap.get(propertyId) === unitId;

			unitScoreMap.set(unitId, {
				score,
				propertyId,
				isRecommended
			});
		});

		console.log(`✅ Calculated scores for ${propertyScoreMap.size} properties and ${unitScoreMap.size} units`);
		state.customerView.matchScores = propertyScoreMap;
		state.customerView.unitScores = unitScoreMap;

		return propertyScoreMap;
	} catch (error) {
		console.error('❌ Error calculating match scores:', error);
		return new Map();
	}
}

/**
 * Convert match score (0-100) to star rating (1-5)
 * @param {number} score - Match score (0-100)
 * @returns {number} Star rating (1-5)
 */
export function scoreToStars(score) {
	if (score >= 81) return 5;
	if (score >= 61) return 4;
	if (score >= 41) return 3;
	if (score >= 21) return 2;
	return 1;
}

/**
 * Generate star rating HTML
 * @param {number} score - Match score (0-100)
 * @returns {string} HTML string for star rating
 */
export function generateStarRating(score) {
	const stars = scoreToStars(score);
	const fullStars = '★'.repeat(stars);
	const emptyStars = '☆'.repeat(5 - stars);

	return `
		<span class="match-score-badge" title="Match Score: ${Math.round(score)}/100">
			<span class="stars">${fullStars}${emptyStars}</span>
			<span>${Math.round(score)}</span>
		</span>
	`;
}

