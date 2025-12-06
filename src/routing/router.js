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
 * @param {Function} deps.renderEmails - Function to render emails page
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
		renderEmails,
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
	if (hash.startsWith('/sc_')) {
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

	// Cleanup mission control theme when leaving manage page
	if (hash !== '/manage') {
		document.body.classList.remove('mission-control-active');
	}

	// Show appropriate view based on route
	if (hash === '/agents') {
		state.currentPage = 'agents';
		show(document.getElementById('agentsView'));
		setRoleLabel('agents');
		renderAgents();
	} else if (hash === '/listings' || hash.startsWith('/listings?')) {
		state.currentPage = 'listings';
		show(document.getElementById('listingsView'));
		setRoleLabel('listings');

		// Parse query parameters for deep linking
		let autoSelectProperty = null;
		if (hash.includes('?')) {
			const queryString = hash.split('?')[1];
			const params = new URLSearchParams(queryString);
			autoSelectProperty = params.get('property');
			if (autoSelectProperty) {
				// Decode URL-encoded property name
				autoSelectProperty = decodeURIComponent(autoSelectProperty);
			}
		}

		// Initialize map if not already done
		setTimeout(async () => {
			initMap();

			// Customer View is the default - load customers for selector
			if (state.customerView.isActive) {
				try {
					const { loadCustomersForSelector } = await import('../modules/listings/customer-view.js');
					const { default: SupabaseAPI } = await import('../api/supabase-api.js');
					await loadCustomersForSelector(SupabaseAPI, state);
				} catch (error) {
					console.error('Error loading customers for default Customer View:', error);
				}
			}

			renderListings(autoSelectProperty);
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
	} else if (hash === '/manage') {
		state.currentPage = 'manage';
		show(document.getElementById('manageView'));
		setRoleLabel('manage');
		// Initialize Smart Match Configuration Page
		(async () => {
			try {
				const { initializeConfigPage } = await import('../modules/admin/smart-match-page.js');
				await initializeConfigPage();
			} catch (error) {
				console.error('Error loading Smart Match config page:', error);
			}
		})();
	} else if (hash === '/bugs') {
		state.currentPage = 'bugs';
		show(document.getElementById('bugsView'));
		setRoleLabel('bugs');
		renderBugs();
	} else if (hash === '/emails') {
		state.currentPage = 'emails';
		show(document.getElementById('emailsView'));
		setRoleLabel('emails');
		renderEmails();
	} else if (hash === '/lease-confirmation' || hash.startsWith('/lease-confirmation?')) {
		state.currentPage = 'lease-confirmation';
		show(document.getElementById('leaseConfirmationView'));
		setRoleLabel('lease-confirmation');

		// Initialize the Lease Confirmation page
		(async () => {
			try {
				const { LeaseConfirmationPage } = await import('../pages/lease-confirmation-page.js');
				const page = new LeaseConfirmationPage();
				await page.init();
			} catch (error) {
				console.error('Error loading Lease Confirmation page:', error);
			}
		})();
	} else if (hash === '/data-feeds') {
		state.currentPage = 'data-feeds';
		show(document.getElementById('dataFeedsView'));
		setRoleLabel('data-feeds');
		// Initialize Data Feeds page
		(async () => {
			try {
				const { initializeDataFeedsPage } = await import('../modules/admin/data-feeds-page.js');
				await initializeDataFeedsPage();
			} catch (error) {
				console.error('Error loading Data Feeds page:', error);
			}
		})();
	} else if (hash === '/rentcast-api') {
		state.currentPage = 'rentcast-api';
		show(document.getElementById('rentcastApiView'));
		setRoleLabel('rentcast-api');
		// Initialize RentCast API page
		(async () => {
			try {
				const { initializeRentCastPage } = await import('../modules/admin/rentcast-page.js');
				await initializeRentCastPage();
			} catch (error) {
				console.error('Error loading RentCast API page:', error);
			}
		})();
	} else if (hash === '/discovery') {
		state.currentPage = 'discovery';
		show(document.getElementById('discoveryView'));
		setRoleLabel('discovery');
		// Initialize Discovery page
		(async () => {
			try {
				const { initDiscovery } = await import('../modules/discovery/discovery.js');
				await initDiscovery();
			} catch (error) {
				console.error('Error loading Discovery page:', error);
			}
		})();
	} else if (hash === '/backups') {
		state.currentPage = 'backups';
		show(document.getElementById('backupsView'));
		setRoleLabel('backups');
		// Initialize Backups page
		(async () => {
			try {
				const { initializeBackupsPage } = await import('../modules/admin/backups-page.js');
				await initializeBackupsPage();
			} catch (error) {
				console.error('Error loading Backups page:', error);
			}
		})();
	} else if (hash === '/leads' || hash.startsWith('/leads?')) {
		// Leads page with optional query parameters
		state.currentPage = 'leads';
		show(document.getElementById('leadsView'));
		setRoleLabel('leads');

		// Parse query parameters for deep linking
		let autoSelectLeadId = null;
		if (hash.includes('?')) {
			const queryString = hash.split('?')[1];
			const params = new URLSearchParams(queryString);
			autoSelectLeadId = params.get('select');
		}

		renderLeads(autoSelectLeadId);
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

