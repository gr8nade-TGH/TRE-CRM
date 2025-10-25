/**
 * Router Module
 * Handles client-side routing for the TRE CRM application
 * 
 * @module routing/router
 */

/**
 * Main routing function - handles all route changes
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.state - Application state
 * @param {Function} deps.hide - Function to hide elements
 * @param {Function} deps.show - Function to show elements
 * @param {Function} deps.setRoleLabel - Function to set role label
 * @param {Function} deps.renderAgents - Function to render agents page
 * @param {Function} deps.renderListings - Function to render listings page
 * @param {Function} deps.renderDocuments - Function to render documents page
 * @param {Function} deps.renderProperties - Function to render properties page
 * @param {Function} deps.renderAdmin - Function to render admin page
 * @param {Function} deps.renderBugs - Function to render bugs page
 * @param {Function} deps.renderLeads - Function to render leads page
 * @param {Function} deps.initMap - Function to initialize map
 * @param {Function} deps.updateNavigation - Function to update navigation
 * @param {Function} deps.updateBugFlagVisibility - Function to update bug flag visibility
 */
export function route(deps) {
	const {
		state,
		hide,
		show,
		setRoleLabel,
		renderAgents,
		renderListings,
		renderDocuments,
		renderProperties,
		renderAdmin,
		renderBugs,
		renderLeads,
		initMap,
		updateNavigation,
		updateBugFlagVisibility
	} = deps;

	// Protect routes - require authentication
	if (!window.isAuthenticated || !window.isAuthenticated()) {
		console.log('⚠️ Not authenticated, cannot route');
		return;
	}

	const hash = location.hash.slice(1);
	
	// public showcase route: #/sc_xxxxxx
	if (hash.startsWith('/sc_')){
		// render public showcase view (read-only)
		document.body.innerHTML = `
			<link rel="stylesheet" href="styles.css" />
			<div id="publicMount"></div>
		`;
		const mount = document.getElementById('publicMount');
		// We don't persist by slug in mock; show a generic example
		mount.innerHTML = `
			<div class="public-wrap">
				<div class="public-header">
					<h2>Agent Name — Top Listings for Lead Name</h2>
					<div class="public-banner">${state.publicBanner}</div>
				</div>
				<div class="public-body">
					<div class="public-card">Example Listing — replace with real when backend ready.</div>
				</div>
			</div>
		`;
		return;
	}

	// Hide all views
	document.querySelectorAll('.route-view').forEach(view => hide(view));

	// Show appropriate view based on route
	if (hash === '/agents') {
		state.currentPage = 'agents';
		show(document.getElementById('agentsView'));
		setRoleLabel('agents');
		renderAgents();
	} else if (hash === '/listings') {
		state.currentPage = 'listings';
		show(document.getElementById('listingsView'));
		setRoleLabel('listings');
		// Initialize map if not already done
		setTimeout(() => {
			initMap();
			renderListings();
		}, 100);
	} else if (hash === '/documents') {
		state.currentPage = 'documents';
		show(document.getElementById('documentsView'));
		setRoleLabel('documents');
		// Initialize the documents view properly
		document.getElementById('managerDocumentsView').classList.remove('hidden');
		document.getElementById('agentDocumentsView').classList.add('hidden');
		renderDocuments();
	} else if (hash === '/properties' || hash === '/specials') {
		// Support both /properties and /specials for backward compatibility
		state.currentPage = 'properties';
		show(document.getElementById('propertiesView'));
		setRoleLabel('properties');
		renderProperties();
	} else if (hash === '/admin') {
		state.currentPage = 'admin';
		show(document.getElementById('adminView'));
		setRoleLabel('admin');
		renderAdmin();
	} else if (hash === '/bugs') {
		state.currentPage = 'bugs';
		show(document.getElementById('bugsView'));
		setRoleLabel('bugs');
		renderBugs();
	} else {
		// default: leads
		state.currentPage = 'leads';
		show(document.getElementById('leadsView'));
		setRoleLabel('leads');
		renderLeads();
	}

	updateNavigation(state.currentPage);
	updateBugFlagVisibility();
}

/**
 * Initialize routing system
 * Sets up initial route and hash change listener
 * @param {Function} routeHandler - The route handler function
 */
export function initializeRouting(routeHandler) {
	console.log('🔀 Initializing routing...');

	// Set initial route if none exists
	if (!location.hash) {
		location.hash = '/leads';
	}

	// Route to current hash
	routeHandler();

	// Listen for hash changes
	window.addEventListener('hashchange', routeHandler);

	console.log('✅ Routing initialized');
}

