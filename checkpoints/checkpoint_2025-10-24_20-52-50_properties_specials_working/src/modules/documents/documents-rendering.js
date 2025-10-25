/**
 * Documents Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 *
 * @module documents/rendering
 */

/**
 * Check if a lead has responded to showcase by checking lead_activities
 * @param {string} leadId - The lead ID
 * @param {Object} SupabaseAPI - Supabase API object
 * @returns {Promise<boolean>} True if lead has responded
 */
async function hasLeadResponded(leadId, SupabaseAPI) {
	try {
		const activities = await SupabaseAPI.getLeadActivities(leadId);
		// Check if there's a 'showcase_response' activity
		return activities.some(activity => activity.activity_type === 'showcase_response');
	} catch (error) {
		console.error('Error checking lead response:', error);
		return false;
	}
}

/**
 * Check if a lease has been signed by checking lead_activities
 * @param {string} leadId - The lead ID
 * @param {Object} SupabaseAPI - Supabase API object
 * @returns {Promise<boolean>} True if lease has been signed
 */
async function hasLeaseSigned(leadId, SupabaseAPI) {
	try {
		const activities = await SupabaseAPI.getLeadActivities(leadId);
		// Check if there's a 'lease_signed' activity
		return activities.some(activity => activity.activity_type === 'lease_signed');
	} catch (error) {
		console.error('Error checking lease signed:', error);
		return false;
	}
}

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

		// Transform leads to match the expected format
		// Check for lead responses and lease signed status in parallel
		const transformedLeads = await Promise.all(result.items.map(async (lead) => ({
			id: lead.id,
			leadName: lead.name,
			agentName: lead.agent_name || 'Unassigned',
			agentEmail: lead.agent_email || '',
			currentStep: lead.current_step || 1,
			lastUpdated: lead.updated_at || lead.created_at,
			status: lead.health_status === 'closed' ? 'completed' : 'current',
			leadResponded: await hasLeadResponded(lead.id, SupabaseAPI), // Check if lead responded
			leaseSigned: await hasLeaseSigned(lead.id, SupabaseAPI), // Check if lease signed
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
		})));

		// Render progress table with real data
		renderProgressTable('documentsTbody', transformedLeads);
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

		// Transform leads to match the expected format
		// Check for lead responses and lease signed status in parallel
		const transformedLeads = await Promise.all(result.items.map(async (lead) => ({
			id: lead.id,
			leadName: lead.name,
			agentName: lead.agent_name || 'Unassigned',
			agentEmail: lead.agent_email || '',
			currentStep: lead.current_step || 1,
			lastUpdated: lead.updated_at || lead.created_at,
			status: lead.health_status === 'closed' ? 'completed' : 'current',
			leadResponded: await hasLeadResponded(lead.id, SupabaseAPI), // Check if lead responded
			leaseSigned: await hasLeaseSigned(lead.id, SupabaseAPI), // Check if lease signed
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
		})));

		// Render progress table with real data
		renderProgressTable('agentDocumentsTbody', transformedLeads);
	} catch (error) {
		console.error('Error loading agent documents:', error);
		toast('Error loading documents. Please try again.');
	}
}

