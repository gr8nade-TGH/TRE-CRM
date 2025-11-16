/**
 * Progress Tracking Filters Module
 * Handles filtering, sorting, and searching for lead progress tracking
 */

// Store all leads for filtering
let allLeads = [];
let currentFilters = {
	search: '',
	health: 'all',
	step: 'all',
	sort: 'recent'
};

/**
 * Initialize progress filters
 * @param {Array} leads - All leads to filter
 * @param {Function} renderCallback - Function to call when filters change
 */
export function initProgressFilters(leads, renderCallback) {
	allLeads = leads;
	
	// Get filter elements
	const searchInput = document.getElementById('progressSearchInput');
	const healthFilter = document.getElementById('progressHealthFilter');
	const stepFilter = document.getElementById('progressStepFilter');
	const sortSelect = document.getElementById('progressSortSelect');
	
	// Search input with debounce
	if (searchInput) {
		let searchTimeout;
		searchInput.addEventListener('input', (e) => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				currentFilters.search = e.target.value.toLowerCase();
				applyFiltersAndRender(renderCallback);
			}, 300);
		});
	}
	
	// Health filter
	if (healthFilter) {
		healthFilter.addEventListener('change', (e) => {
			currentFilters.health = e.target.value;
			applyFiltersAndRender(renderCallback);
		});
	}
	
	// Step filter
	if (stepFilter) {
		stepFilter.addEventListener('change', (e) => {
			currentFilters.step = e.target.value;
			applyFiltersAndRender(renderCallback);
		});
	}
	
	// Sort select
	if (sortSelect) {
		sortSelect.addEventListener('change', (e) => {
			currentFilters.sort = e.target.value;
			applyFiltersAndRender(renderCallback);
		});
	}
	
	// Initial render
	applyFiltersAndRender(renderCallback);
}

/**
 * Apply filters and render results
 * @param {Function} renderCallback - Function to call with filtered leads
 */
function applyFiltersAndRender(renderCallback) {
	const filteredLeads = filterLeads(allLeads, currentFilters);
	const sortedLeads = sortLeads(filteredLeads, currentFilters.sort);
	
	// Update results count
	updateResultsCount(sortedLeads.length);
	
	// Render filtered leads
	renderCallback(sortedLeads);
}

/**
 * Filter leads based on current filters
 * @param {Array} leads - All leads
 * @param {Object} filters - Current filter settings
 * @returns {Array} Filtered leads
 */
function filterLeads(leads, filters) {
	return leads.filter(lead => {
		// Search filter
		if (filters.search) {
			const searchTerm = filters.search;
			const matchesSearch = 
				(lead.leadName && lead.leadName.toLowerCase().includes(searchTerm)) ||
				(lead.agentName && lead.agentName.toLowerCase().includes(searchTerm)) ||
				(lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
				(lead.phone && lead.phone.toLowerCase().includes(searchTerm));
			
			if (!matchesSearch) return false;
		}
		
		// Health filter
		if (filters.health !== 'all') {
			const leadHealth = lead.health_status || 'green';
			if (leadHealth !== filters.health) return false;
		}
		
		// Step filter
		if (filters.step !== 'all') {
			const stepNumber = parseInt(filters.step);
			if (lead.currentStep !== stepNumber) return false;
		}
		
		return true;
	});
}

/**
 * Sort leads based on sort option
 * @param {Array} leads - Leads to sort
 * @param {string} sortOption - Sort option
 * @returns {Array} Sorted leads
 */
function sortLeads(leads, sortOption) {
	const sorted = [...leads];
	
	switch (sortOption) {
		case 'recent':
			// Most recent first (by lastUpdated)
			sorted.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
			break;
			
		case 'oldest':
			// Oldest first
			sorted.sort((a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated));
			break;
			
		case 'health':
			// Worst health first (red -> yellow -> green -> closed -> lost)
			const healthOrder = { red: 0, yellow: 1, green: 2, closed: 3, lost: 4 };
			sorted.sort((a, b) => {
				const aHealth = a.health_status || 'green';
				const bHealth = b.health_status || 'green';
				return healthOrder[aHealth] - healthOrder[bHealth];
			});
			break;
			
		case 'score':
			// Best match score first
			sorted.sort((a, b) => {
				const aScore = a.match_score || a.smart_match_score || 0;
				const bScore = b.match_score || b.smart_match_score || 0;
				return bScore - aScore;
			});
			break;
			
		case 'step':
			// Furthest progress first
			sorted.sort((a, b) => b.currentStep - a.currentStep);
			break;
			
		default:
			// Default to recent
			sorted.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
	}
	
	return sorted;
}

/**
 * Update results count display
 * @param {number} count - Number of filtered results
 */
function updateResultsCount(count) {
	const resultsCount = document.getElementById('progressResultsCount');
	if (resultsCount) {
		resultsCount.textContent = `${count} ${count === 1 ? 'lead' : 'leads'}`;
	}
}

/**
 * Reset all filters to default
 */
export function resetProgressFilters() {
	currentFilters = {
		search: '',
		health: 'all',
		step: 'all',
		sort: 'recent'
	};
	
	// Reset UI
	const searchInput = document.getElementById('progressSearchInput');
	const healthFilter = document.getElementById('progressHealthFilter');
	const stepFilter = document.getElementById('progressStepFilter');
	const sortSelect = document.getElementById('progressSortSelect');
	
	if (searchInput) searchInput.value = '';
	if (healthFilter) healthFilter.value = 'all';
	if (stepFilter) stepFilter.value = 'all';
	if (sortSelect) sortSelect.value = 'recent';
}

/**
 * Get current filter state
 * @returns {Object} Current filters
 */
export function getCurrentFilters() {
	return { ...currentFilters };
}

