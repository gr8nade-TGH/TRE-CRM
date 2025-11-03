/**
 * Application State Management
 * Central state object for the TRE CRM application
 */

/**
 * Global application state
 * This will eventually be replaced with a proper state management solution
 */
export const state = {
	// User/Auth state
	role: 'manager',
	agentId: 'agent_1',
	userName: 'Unknown', // User's display name

	// Navigation state
	currentPage: 'leads',

	// Pagination state
	page: 1,
	pageSize: 50, // Increased from 10 for better performance

	// Sorting state
	sort: {
		key: 'submitted_at',
		dir: 'desc'
	},

	// Search state
	search: '',

	// Selection state
	selectedLeadId: null,
	selectedAgentId: null,
	selectedMatches: new Set(),
	currentMatches: [],

	// Showcases state
	showcases: {}, // id -> showcase

	// Public banner
	publicBanner: 'Earn a $200 gift card when you lease through us.',

	// Filters state
	filters: {
		search: '',
		status: 'all',
		fromDate: '',
		toDate: ''
	},

	// Listings filters state
	listingsFilters: {
		search: '',
		market: 'all',
		minPrice: '',
		maxPrice: '',
		beds: 'any',
		commission: '0',
		amenities: 'any'
	},

	// Customer View state
	customerView: {
		isActive: false,
		selectedCustomerId: null,
		selectedCustomer: null,
		matchScores: new Map(), // propertyId -> highest matchScore
		unitScores: new Map() // unitId -> { score, propertyId, isRecommended }
	}
};

/**
 * Get current state
 * @returns {Object} Current state object
 */
export function getState() {
	return state;
}

/**
 * Update state
 * @param {Object} updates - Object with state updates
 */
export function updateState(updates) {
	Object.assign(state, updates);
}

/**
 * Reset state to defaults
 */
export function resetState() {
	state.role = 'manager';
	state.agentId = 'agent_1';
	state.currentPage = 'leads';
	state.page = 1;
	state.pageSize = 50;
	state.sort = { key: 'submitted_at', dir: 'desc' };
	state.search = '';
	state.selectedLeadId = null;
	state.selectedAgentId = null;
	state.selectedMatches = new Set();
	state.currentMatches = [];
	state.showcases = {};
	state.publicBanner = 'Earn a $200 gift card when you lease through us.';
	state.filters = {
		search: '',
		status: 'all',
		fromDate: '',
		toDate: ''
	};
	state.listingsFilters = {
		search: '',
		market: 'all',
		minPrice: '',
		maxPrice: '',
		beds: 'any',
		commission: '0',
		amenities: 'any'
	};
	state.customerView = {
		isActive: false,
		selectedCustomerId: null,
		selectedCustomer: null,
		matchScores: new Map(),
		unitScores: new Map()
	};
}

/**
 * Update filters
 * @param {Object} filterUpdates - Filter updates
 */
export function updateFilters(filterUpdates) {
	Object.assign(state.filters, filterUpdates);
}

/**
 * Update listings filters
 * @param {Object} filterUpdates - Listings filter updates
 */
export function updateListingsFilters(filterUpdates) {
	Object.assign(state.listingsFilters, filterUpdates);
}

/**
 * Update sort
 * @param {string} key - Sort key
 * @param {string} dir - Sort direction ('asc' or 'desc')
 */
export function updateSort(key, dir = 'asc') {
	state.sort = { key, dir };
}

/**
 * Update pagination
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 */
export function updatePagination(page, pageSize) {
	state.page = page;
	if (pageSize !== undefined) {
		state.pageSize = pageSize;
	}
}

/**
 * Select lead
 * @param {string} leadId - Lead ID
 */
export function selectLead(leadId) {
	state.selectedLeadId = leadId;
}

/**
 * Select agent
 * @param {string} agentId - Agent ID
 */
export function selectAgent(agentId) {
	state.selectedAgentId = agentId;
}

/**
 * Add to selected matches
 * @param {string} matchId - Match ID
 */
export function addSelectedMatch(matchId) {
	state.selectedMatches.add(matchId);
}

/**
 * Remove from selected matches
 * @param {string} matchId - Match ID
 */
export function removeSelectedMatch(matchId) {
	state.selectedMatches.delete(matchId);
}

/**
 * Clear selected matches
 */
export function clearSelectedMatches() {
	state.selectedMatches.clear();
}

/**
 * Set current matches
 * @param {Array} matches - Array of matches
 */
export function setCurrentMatches(matches) {
	state.currentMatches = matches;
}

/**
 * Add showcase
 * @param {string} id - Showcase ID
 * @param {Object} showcase - Showcase data
 */
export function addShowcase(id, showcase) {
	state.showcases[id] = showcase;
}

/**
 * Remove showcase
 * @param {string} id - Showcase ID
 */
export function removeShowcase(id) {
	delete state.showcases[id];
}

/**
 * Get showcase
 * @param {string} id - Showcase ID
 * @returns {Object|null} Showcase data or null
 */
export function getShowcase(id) {
	return state.showcases[id] || null;
}

/**
 * Update public banner
 * @param {string} banner - Banner text
 */
export function updatePublicBanner(banner) {
	state.publicBanner = banner;
}

/**
 * Navigate to page
 * @param {string} page - Page name
 */
export function navigateToPage(page) {
	state.currentPage = page;
}

