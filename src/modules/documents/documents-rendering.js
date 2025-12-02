/**
 * Documents Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 *
 * @module documents/rendering
 */

import { initProgressFilters } from './progress-filters.js';
import { calculateStepTimestamps, calculateStepBlockers, calculateNotifications, formatDateShort } from '../../utils/progress-enhancements.js';

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
			search: state.documentsSearch || '', // Use documents search state
			sortKey: 'created_at',
			sortDir: 'desc',
			page: 1,
			pageSize: 100,
			filters: {}
		});

		// Fetch all agents to map agent names
		const { data: agents } = await SupabaseAPI.getSupabase()
			.from('users')
			.select('id, name, email')
			.eq('role', 'AGENT');

		// Create agent lookup map
		const agentMap = new Map();
		if (agents) {
			agents.forEach(agent => {
				agentMap.set(agent.id, agent);
			});
		}

		// OPTIMIZATION: Fetch all activities for all leads in one batch query
		// This is much faster than fetching activities for each lead individually
		const leadIds = result.items.map(l => l.id);
		const allActivitiesMap = new Map(); // For optional indicators (Set)
		const fullActivitiesMap = new Map(); // For timestamps/notifications (Array)

		if (leadIds.length > 0) {
			try {
				// Fetch all activities for all leads in one query (for timestamps and notifications)
				const { data: allActivities } = await SupabaseAPI.getSupabase()
					.from('lead_activities')
					.select('lead_id, activity_type, created_at, metadata')
					.in('lead_id', leadIds)
					.order('created_at', { ascending: true });

				// Group activities by lead_id for fast lookup
				if (allActivities) {
					allActivities.forEach(activity => {
						// For optional indicators (Set)
						if (!allActivitiesMap.has(activity.lead_id)) {
							allActivitiesMap.set(activity.lead_id, new Set());
						}
						allActivitiesMap.get(activity.lead_id).add(activity.activity_type);

						// For timestamps/notifications (Array)
						if (!fullActivitiesMap.has(activity.lead_id)) {
							fullActivitiesMap.set(activity.lead_id, []);
						}
						fullActivitiesMap.get(activity.lead_id).push(activity);
					});
				}
			} catch (error) {
				console.error('Error fetching activities for optional indicators:', error);
			}
		}

		// OPTIMIZATION: Fetch welcome email opened status for all leads in one query
		const emailOpenedMap = new Map(); // Map of leadId -> boolean (true if email was opened)
		if (leadIds.length > 0) {
			try {
				const { data: emailLogs } = await SupabaseAPI.getSupabase()
					.from('email_logs')
					.select('id, metadata, opened_at')
					.eq('template_id', 'welcome_lead')
					.eq('status', 'sent')
					.not('opened_at', 'is', null); // Only get emails that have been opened

				// Map by lead_id from metadata
				if (emailLogs) {
					emailLogs.forEach(log => {
						const leadId = log.metadata?.lead_id;
						if (leadId && log.opened_at) {
							emailOpenedMap.set(leadId, true);
						}
					});
				}
			} catch (error) {
				console.error('Error fetching email opened status:', error);
			}
		}

		// Fetch property data for leads that have a property selected
		const propertyIds = [...new Set(result.items.map(l => l.property_id).filter(Boolean))];
		const propertyMap = new Map();

		if (propertyIds.length > 0) {
			try {
				const { data: properties } = await SupabaseAPI.getSupabase()
					.from('properties')
					.select('id, contact_name, contact_email')
					.in('id', propertyIds);

				if (properties) {
					properties.forEach(property => {
						propertyMap.set(property.id, property);
					});
				}
			} catch (error) {
				console.error('Error fetching property data:', error);
			}
		}

		// Transform leads to match the expected format
		// Use pre-fetched activities for fast indicator checks
		const transformedLeads = result.items.map((lead) => {
			const leadActivities = allActivitiesMap.get(lead.id) || new Set();
			const fullActivities = fullActivitiesMap.get(lead.id) || [];
			const property = propertyMap.get(lead.property_id);

			// Get agent info from map
			const agent = agentMap.get(lead.assigned_agent_id);
			const agentName = agent ? agent.name : 'Unassigned';
			const agentEmail = agent ? agent.email : '';

			// Calculate enhancements
			const stepTimestamps = calculateStepTimestamps(fullActivities);
			const stepBlockers = calculateStepBlockers(lead, property);
			const notifications = calculateNotifications(lead, fullActivities);

			return {
				id: lead.id,
				leadName: lead.name,
				agentName: agentName,
				agentEmail: agentEmail,
				currentStep: lead.current_step || 1,
				lastUpdated: lead.updated_at || lead.created_at,
				status: lead.health_status === 'closed' ? 'completed' : 'current',
				health_status: lead.health_status,
				match_score: lead.smart_match_score,
				welcomeEmailSent: leadActivities.has('welcome_email_sent'),  // Step 1 indicator
				welcomeEmailOpened: emailOpenedMap.has(lead.id),             // Step 1 opened indicator
				leadResponded: leadActivities.has('property_matcher_submitted'), // Step 2 indicator
				leaseSigned: leadActivities.has('lease_signed'),             // Step 5 indicator
				stepTimestamps: stepTimestamps,  // NEW: Timestamps for completed steps
				stepBlockers: stepBlockers,      // NEW: Blocker messages for blocked steps
				notifications: notifications,    // NEW: Notification badges for engagement
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

		// Initialize progress filters with callback to re-render
		initProgressFilters(transformedLeads, (filteredLeads) => {
			renderProgressTable('documentsTbody', filteredLeads);
		});

		// Update lead count badge (total, not filtered)
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
			search: state.documentsSearch || '', // Use documents search state
			sortKey: 'created_at',
			sortDir: 'desc',
			page: 1,
			pageSize: 100,
			filters: {}
		});

		// Fetch all agents to map agent names
		const { data: agents } = await SupabaseAPI.getSupabase()
			.from('users')
			.select('id, name, email')
			.eq('role', 'AGENT');

		// Create agent lookup map
		const agentMap = new Map();
		if (agents) {
			agents.forEach(agent => {
				agentMap.set(agent.id, agent);
			});
		}

		// OPTIMIZATION: Fetch all activities for all leads in one batch query
		// This is much faster than fetching activities for each lead individually
		const leadIds = result.items.map(l => l.id);
		const allActivitiesMap = new Map(); // For optional indicators (Set)
		const fullActivitiesMap = new Map(); // For timestamps/notifications (Array)

		if (leadIds.length > 0) {
			try {
				// Fetch all activities for all leads in one query (for timestamps and notifications)
				const { data: allActivities } = await SupabaseAPI.getSupabase()
					.from('lead_activities')
					.select('lead_id, activity_type, created_at, metadata')
					.in('lead_id', leadIds)
					.order('created_at', { ascending: true });

				// Group activities by lead_id for fast lookup
				if (allActivities) {
					allActivities.forEach(activity => {
						// For optional indicators (Set)
						if (!allActivitiesMap.has(activity.lead_id)) {
							allActivitiesMap.set(activity.lead_id, new Set());
						}
						allActivitiesMap.get(activity.lead_id).add(activity.activity_type);

						// For timestamps/notifications (Array)
						if (!fullActivitiesMap.has(activity.lead_id)) {
							fullActivitiesMap.set(activity.lead_id, []);
						}
						fullActivitiesMap.get(activity.lead_id).push(activity);
					});
				}
			} catch (error) {
				console.error('Error fetching activities for optional indicators:', error);
			}
		}

		// OPTIMIZATION: Fetch welcome email opened status for all leads in one query
		const emailOpenedMap = new Map(); // Map of leadId -> boolean (true if email was opened)
		if (leadIds.length > 0) {
			try {
				const { data: emailLogs } = await SupabaseAPI.getSupabase()
					.from('email_logs')
					.select('id, metadata, opened_at')
					.eq('template_id', 'welcome_lead')
					.eq('status', 'sent')
					.not('opened_at', 'is', null); // Only get emails that have been opened

				// Map by lead_id from metadata
				if (emailLogs) {
					emailLogs.forEach(log => {
						const leadId = log.metadata?.lead_id;
						if (leadId && log.opened_at) {
							emailOpenedMap.set(leadId, true);
						}
					});
				}
			} catch (error) {
				console.error('Error fetching email opened status:', error);
			}
		}

		// Fetch property data for leads that have a property selected
		const propertyIds = [...new Set(result.items.map(l => l.property_id).filter(Boolean))];
		const propertyMap = new Map();

		if (propertyIds.length > 0) {
			try {
				const { data: properties } = await SupabaseAPI.getSupabase()
					.from('properties')
					.select('id, contact_name, contact_email')
					.in('id', propertyIds);

				if (properties) {
					properties.forEach(property => {
						propertyMap.set(property.id, property);
					});
				}
			} catch (error) {
				console.error('Error fetching property data:', error);
			}
		}

		// Transform leads to match the expected format
		// Use pre-fetched activities for fast indicator checks
		const transformedLeads = result.items.map((lead) => {
			const leadActivities = allActivitiesMap.get(lead.id) || new Set();
			const fullActivities = fullActivitiesMap.get(lead.id) || [];
			const property = propertyMap.get(lead.property_id);

			// Get agent info from map
			const agent = agentMap.get(lead.assigned_agent_id);
			const agentName = agent ? agent.name : 'Unassigned';
			const agentEmail = agent ? agent.email : '';

			// Calculate enhancements
			const stepTimestamps = calculateStepTimestamps(fullActivities);
			const stepBlockers = calculateStepBlockers(lead, property);
			const notifications = calculateNotifications(lead, fullActivities);

			return {
				id: lead.id,
				leadName: lead.name,
				agentName: agentName,
				agentEmail: agentEmail,
				currentStep: lead.current_step || 1,
				lastUpdated: lead.updated_at || lead.created_at,
				status: lead.health_status === 'closed' ? 'completed' : 'current',
				health_status: lead.health_status,
				match_score: lead.smart_match_score,
				welcomeEmailSent: leadActivities.has('welcome_email_sent'),  // Step 1 indicator
				welcomeEmailOpened: emailOpenedMap.has(lead.id),             // Step 1 opened indicator
				leadResponded: leadActivities.has('property_matcher_submitted'), // Step 2 indicator
				leaseSigned: leadActivities.has('lease_signed'),             // Step 5 indicator
				stepTimestamps: stepTimestamps,  // NEW: Timestamps for completed steps
				stepBlockers: stepBlockers,      // NEW: Blocker messages for blocked steps
				notifications: notifications,    // NEW: Notification badges for engagement
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

		// Initialize progress filters with callback to re-render
		initProgressFilters(transformedLeads, (filteredLeads) => {
			renderProgressTable('agentDocumentsTbody', filteredLeads);
		});

		// Update lead count badge (total, not filtered)
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

