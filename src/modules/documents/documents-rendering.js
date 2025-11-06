/**
 * Documents Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 *
 * @module documents/rendering
 */

/**
 * Render documents (delegates to manager or agent view)
 * EXACT COPY from script.js (lines 2362-2368)
 *
 * @param {Object} options - Rendering options
 * @param {Object} options.state - Application state
 * @param {Function} options.renderAgentDocuments - Function to render agent documents
 * @param {Function} options.renderManagerDocuments - Function to render manager documents
 * @returns {Promise<void>}
 */
export async function renderDocuments(options) {
	const {
		state,
		renderAgentDocuments,
		renderManagerDocuments
	} = options;

	if (state.role === 'agent') {
		renderAgentDocuments();
	} else {
		renderManagerDocuments();
	}
}

/**
 * Render manager documents view
 * EXACT COPY from script.js (lines 2370-2429)
 *
 * @param {Object} options - Rendering options
 * @param {Object} options.SupabaseAPI - Supabase API object
 * @param {Object} options.state - Application state
 * @param {Function} options.renderProgressTable - Function to render progress table
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function renderManagerDocuments(options) {
	const {
		SupabaseAPI,
		state,
		renderProgressTable,
		toast
	} = options;

	// Show manager view, hide agent view
	document.getElementById('managerDocumentsView').classList.remove('hidden');
	document.getElementById('agentDocumentsView').classList.add('hidden');

	try {
		// Fetch real leads from Supabase
		const result = await SupabaseAPI.getLeads({
			role: state.role,
			agentId: state.agentId,
			search: '',
			sortKey: 'created_at',
			sortDir: 'desc',
			page: 1,
			pageSize: 100,
			filters: {}
		});

		// OPTIMIZATION: Fetch all activities for all leads in one batch query
		// This is much faster than fetching activities for each lead individually
		const leadIds = result.items.map(l => l.id);
		const allActivitiesMap = new Map();

		if (leadIds.length > 0) {
			try {
				// Fetch all activities for all leads in one query
				const { data: allActivities } = await SupabaseAPI.getSupabase()
					.from('lead_activities')
					.select('lead_id, activity_type')
					.in('lead_id', leadIds)
					.in('activity_type', ['welcome_email_sent', 'property_matcher_submitted', 'lease_signed']);

				// Group activities by lead_id for fast lookup
				if (allActivities) {
					allActivities.forEach(activity => {
						if (!allActivitiesMap.has(activity.lead_id)) {
							allActivitiesMap.set(activity.lead_id, new Set());
						}
						allActivitiesMap.get(activity.lead_id).add(activity.activity_type);
					});
				}
			} catch (error) {
				console.error('Error fetching activities for optional indicators:', error);
			}
		}

		// Transform leads to match the expected format
		// Use pre-fetched activities for fast indicator checks
		const transformedLeads = result.items.map((lead) => {
			const leadActivities = allActivitiesMap.get(lead.id) || new Set();

			return {
				id: lead.id,
				leadName: lead.name,
				agentName: lead.agent_name || 'Unassigned',
				agentEmail: lead.agent_email || '',
				currentStep: lead.current_step || 1,
				lastUpdated: lead.updated_at || lead.created_at,
				status: lead.health_status === 'closed' ? 'completed' : 'current',
				welcomeEmailSent: leadActivities.has('welcome_email_sent'),  // Step 1 indicator
				leadResponded: leadActivities.has('property_matcher_submitted'), // Step 2 indicator
				leaseSigned: leadActivities.has('lease_signed'),             // Step 5 indicator
				property: {
					name: lead.property_name || 'Not selected',
					address: lead.property_address || '',
					rent: lead.property_rent || '',
					bedrooms: lead.property_bedrooms || 0,
					bathrooms: lead.property_bathrooms || 0
				},
				showcase: {
					sent: lead.showcase_sent || false,
					landingPageUrl: lead.showcase_url || '',
					selections: lead.showcase_selections || [],
					calendarDates: lead.showcase_dates || []
				},
				guestCard: {
					sent: lead.guest_card_sent || false,
					url: lead.guest_card_url || ''
				},
				lease: {
					sent: lead.lease_sent || false,
					signed: lead.lease_signed || false,
					finalized: lead.lease_finalized || false,
					property: lead.property_name || '',
					apartment: lead.apartment_unit || ''
				}
			};
		});

		// Render progress table with real data
		renderProgressTable('documentsTbody', transformedLeads);

		// Update lead count badge
		const leadCountBadge = document.getElementById('leadCountBadge');
		if (leadCountBadge) {
			const count = transformedLeads.length;
			leadCountBadge.textContent = `${count} ${count === 1 ? 'lead' : 'leads'}`;
		}
	} catch (error) {
		console.error('Error loading documents:', error);
		toast('Error loading documents. Please try again.');
	}
}

/**
 * Render agent documents view
 * EXACT COPY from script.js (lines 2431-2490)
 *
 * @param {Object} options - Rendering options
 * @param {Object} options.SupabaseAPI - Supabase API object
 * @param {Object} options.state - Application state
 * @param {Function} options.renderProgressTable - Function to render progress table
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function renderAgentDocuments(options) {
	const {
		SupabaseAPI,
		state,
		renderProgressTable,
		toast
	} = options;

	// Show agent view, hide manager view
	document.getElementById('managerDocumentsView').classList.add('hidden');
	document.getElementById('agentDocumentsView').classList.remove('hidden');

	try {
		// Fetch real leads from Supabase for current agent
		const result = await SupabaseAPI.getLeads({
			role: 'agent',
			agentId: state.agentId,
			search: '',
			sortKey: 'created_at',
			sortDir: 'desc',
			page: 1,
			pageSize: 100,
			filters: {}
		});

		// OPTIMIZATION: Fetch all activities for all leads in one batch query
		// This is much faster than fetching activities for each lead individually
		const leadIds = result.items.map(l => l.id);
		const allActivitiesMap = new Map();

		if (leadIds.length > 0) {
			try {
				// Fetch all activities for all leads in one query
				const { data: allActivities } = await SupabaseAPI.getSupabase()
					.from('lead_activities')
					.select('lead_id, activity_type')
					.in('lead_id', leadIds)
					.in('activity_type', ['welcome_email_sent', 'property_matcher_submitted', 'lease_signed']);

				// Group activities by lead_id for fast lookup
				if (allActivities) {
					allActivities.forEach(activity => {
						if (!allActivitiesMap.has(activity.lead_id)) {
							allActivitiesMap.set(activity.lead_id, new Set());
						}
						allActivitiesMap.get(activity.lead_id).add(activity.activity_type);
					});
				}
			} catch (error) {
				console.error('Error fetching activities for optional indicators:', error);
			}
		}

		// Transform leads to match the expected format
		// Use pre-fetched activities for fast indicator checks
		const transformedLeads = result.items.map((lead) => {
			const leadActivities = allActivitiesMap.get(lead.id) || new Set();

			return {
				id: lead.id,
				leadName: lead.name,
				agentName: lead.agent_name || 'Unassigned',
				agentEmail: lead.agent_email || '',
				currentStep: lead.current_step || 1,
				lastUpdated: lead.updated_at || lead.created_at,
				status: lead.health_status === 'closed' ? 'completed' : 'current',
				welcomeEmailSent: leadActivities.has('welcome_email_sent'),  // Step 1 indicator
				leadResponded: leadActivities.has('property_matcher_submitted'), // Step 2 indicator
				leaseSigned: leadActivities.has('lease_signed'),             // Step 5 indicator
				property: {
					name: lead.property_name || 'Not selected',
					address: lead.property_address || '',
					rent: lead.property_rent || '',
					bedrooms: lead.property_bedrooms || 0,
					bathrooms: lead.property_bathrooms || 0
				},
				showcase: {
					sent: lead.showcase_sent || false,
					landingPageUrl: lead.showcase_url || '',
					selections: lead.showcase_selections || [],
					calendarDates: lead.showcase_dates || []
				},
				guestCard: {
					sent: lead.guest_card_sent || false,
					url: lead.guest_card_url || ''
				},
				lease: {
					sent: lead.lease_sent || false,
					signed: lead.lease_signed || false,
					finalized: lead.lease_finalized || false,
					property: lead.property_name || '',
					apartment: lead.apartment_unit || ''
				}
			};
		});

		// Render progress table with real data
		renderProgressTable('agentDocumentsTbody', transformedLeads);

		// Update lead count badge
		const agentLeadCountBadge = document.getElementById('agentLeadCountBadge');
		if (agentLeadCountBadge) {
			const count = transformedLeads.length;
			agentLeadCountBadge.textContent = `${count} ${count === 1 ? 'lead' : 'leads'}`;
		}
	} catch (error) {
		console.error('Error loading agent documents:', error);
		toast('Error loading documents. Please try again.');
	}
}

