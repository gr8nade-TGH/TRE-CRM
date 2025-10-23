/**
 * App Initialization Module
 * Handles application initialization after authentication
 * 
 * @module init/app-init
 */

/**
 * Load real agents from Supabase
 * @param {Object} SupabaseAPI - Supabase API module
 * @returns {Promise<Array>} Array of agent objects
 */
export async function loadAgents(SupabaseAPI) {
	try {
		console.log('📋 Loading real agents from Supabase...');
		const agents = await SupabaseAPI.getAgents();
		console.log('✅ Loaded', agents.length, 'agents from Supabase');
		return agents;
	} catch (error) {
		console.error('❌ Error loading agents:', error);
		throw error; // Don't fall back to mock data - fail fast
	}
}

/**
 * Initialize the application after authentication
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.state - Application state
 * @param {Object} deps.SupabaseAPI - Supabase API module
 * @param {Function} deps.updateNavVisibility - Function to update nav visibility
 * @param {Function} deps.initializeRouting - Function to initialize routing
 * @param {Function} deps.setRealAgents - Function to set real agents data
 * @returns {Promise<void>}
 */
export async function initializeApp(deps) {
	const {
		state,
		SupabaseAPI,
		updateNavVisibility,
		initializeRouting,
		setRealAgents
	} = deps;

	console.log('🚀 Initializing app...');

	// Update state from authenticated user
	if (window.currentUser) {
		const role = window.getUserRole();
		const userId = window.getUserId();

		state.role = role;
		state.agentId = userId;

		console.log('✅ App initialized with role:', role, 'userId:', userId);
	}

	// Load real agents from Supabase
	const agents = await loadAgents(SupabaseAPI);
	setRealAgents(agents); // Store real agents data

	// Initialize nav visibility based on current role
	updateNavVisibility();

	// Initialize routing
	initializeRouting();
}

