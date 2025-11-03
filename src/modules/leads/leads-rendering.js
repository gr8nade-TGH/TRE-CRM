/**
 * Leads Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 * 
 * @module leads/rendering
 */

import { calculateHealthStatus, renderHealthStatus } from './leads-health.js';
import { formatDate, updateSortHeaders } from '../../utils/helpers.js';
import { prefsSummary } from '../../state/mockData.js';

/**
 * Helper function: Render agent select dropdown
 * EXACT COPY from script.js (lines 1632-1635)
 */
function renderAgentSelect(lead, agents) {
	const opts = agents.map(a => `<option value="${a.id}" ${a.id === lead.assigned_agent_id ? 'selected' : ''}>${a.name}</option>`).join('');
	return `<select class="select" data-assign="${lead.id}"><option value="">Unassigned</option>${opts}</select>`;
}

/**
 * Helper function: Render agent read-only display
 * EXACT COPY from script.js (lines 1636-1639)
 */
function renderAgentReadOnly(lead, agents) {
	const a = agents.find(a => a.id === lead.assigned_agent_id);
	return `<span class="subtle">${a ? a.name : 'Unassigned'}</span>`;
}

/**
 * Render leads table
 * EXACT COPY from script.js (lines 1495-1630)
 * Preserves all original functionality including:
 * - Health status icons (colored dots)
 * - Notes count and yellow highlighting
 * - Activity log icons
 * - Agent dropdowns
 * - All event listeners
 *
 * @param {Object} options - Rendering options
 * @param {Object} options.api - API object for fetching data
 * @param {Object} options.SupabaseAPI - Supabase API object
 * @param {Object} options.state - Application state
 * @param {boolean} options.USE_MOCK_DATA - Whether to use mock data
 * @param {Function} options.getCurrentStepFromActivities - Function to get current step
 * @param {Function} options.openLeadNotesModal - Callback to open notes modal
 * @param {Function} options.openActivityLogModal - Callback to open activity log modal
 * @param {Array} options.agents - Array of agents for dropdown
 * @param {string|null} autoSelectLeadId - Optional lead ID to auto-select after rendering
 * @returns {Promise<void>}
 */
export async function renderLeads(options, autoSelectLeadId = null) {
	const {
		api,
		SupabaseAPI,
		state,
		USE_MOCK_DATA,
		getCurrentStepFromActivities,
		openLeadNotesModal,
		openActivityLogModal,
		agents = []
	} = options;

	console.log('renderLeads called'); // Debug
	const tbody = document.getElementById('leadsTbody');
	const loadingIndicator = document.getElementById('leadsLoadingIndicator');

	// Clear existing rows but keep loading indicator
	const existingRows = tbody.querySelectorAll('tr:not(#leadsLoadingIndicator)');
	existingRows.forEach(row => row.remove());

	// Show loading indicator (table row)
	if (loadingIndicator) {
		loadingIndicator.style.display = 'table-row';
	}

	console.log('tbody element:', tbody); // Debug

	try {
		const { items, total } = await api.getLeads({
			role: state.role,
			agentId: state.agentId,
			search: state.search,
			sortKey: state.sort.key,
			sortDir: state.sort.dir,
			page: state.page,
			pageSize: state.pageSize,
			filters: state.filters
		});
		console.log('API returned:', { items, total }); // Debug

		// OPTIMIZED: Batch fetch notes counts and activities for all leads (if using Supabase)
		if (!USE_MOCK_DATA) {
			const leadIds = items.map(lead => lead.id);

			// Fetch notes counts and activities in 2 batch queries instead of N*2 queries
			const [notesCountMap, activitiesMap] = await Promise.all([
				SupabaseAPI.getBatchLeadNotesCounts(leadIds),
				SupabaseAPI.getBatchLeadActivities(leadIds)
			]);

			// OPTIMIZED: Calculate current step from activities for ALL leads in parallel (10-20x faster)
			// Instead of sequential loop with await, use Promise.all() to process all leads simultaneously
			const currentStepPromises = leadIds.map(leadId => {
				const activities = activitiesMap[leadId] || [];
				return getCurrentStepFromActivities(leadId, activities);
			});
			const currentSteps = await Promise.all(currentStepPromises);

			// Build currentStepMap from results
			const currentStepMap = {};
			leadIds.forEach((leadId, index) => {
				currentStepMap[leadId] = currentSteps[index];
			});

			// Apply current steps and calculate health status for each lead
			items.forEach(lead => {
				lead.current_step = currentStepMap[lead.id] || 1;
				lead.health_status = calculateHealthStatus(lead);
				lead._notesCount = notesCountMap[lead.id] || 0;
			});
		} else {
			// Mock data path
			items.forEach(lead => {
				lead.health_status = calculateHealthStatus(lead);
				lead._notesCount = 0;
			});
		}

		items.forEach(lead => {
			const notesCount = lead._notesCount || 0;
			// Always show note icon: gray if no notes, yellow with pulse if notes exist
			const noteColor = notesCount > 0 ? '#fbbf24' : '#9ca3af';
			const noteTitle = notesCount > 0 ? `${notesCount} comment(s)` : 'Add a comment';
			const hasNotesClass = notesCount > 0 ? 'has-notes' : '';
			const notesIcon = `<span class="notes-icon ${hasNotesClass}" data-lead-id="${lead.id}" style="cursor: pointer; margin-left: 8px; display: inline-flex; align-items: center; gap: 4px;" title="${noteTitle}">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: ${noteColor};">
				<path d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,5V19H19V12H12V5H5Z"/>
			</svg>
			${notesCount > 0 ? `<span style="font-size: 0.75rem; color: ${noteColor};">${notesCount}</span>` : ''}
		</span>`;

			// Activity log icon (clock/history icon)
			const activityIcon = `<span class="activity-icon" data-lead-id="${lead.id}" style="cursor: pointer; margin-left: 8px; display: inline-flex; align-items: center;" title="View activity log">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
				<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
			</svg>
		</span>`;

			const tr = document.createElement('tr');
			tr.innerHTML = `
			<td style="text-align: center;">
				<label class="checkbox-label" style="margin: 0;">
					<input type="checkbox" class="lead-checkbox" data-lead-id="${lead.id}" style="display: none;">
					<span class="checkmark"></span>
				</label>
			</td>
			<td>
				<a href="#" class="lead-name" data-id="${lead.id}">${lead.name}</a>${notesIcon}${activityIcon}
				<div class="subtle mono">${lead.email} · ${lead.phone}</div>
			</td>
			<td><button class="action-btn secondary" data-view="${lead.id}" title="View/Edit Details">View/Edit</button></td>
			<td data-sort="health_status">${renderHealthStatus(lead.health_status, lead)}</td>
			<td class="mono" data-sort="submitted_at">${formatDate(lead.submitted_at)}</td>
			<td class="mono">
				${prefsSummary(lead.preferences || lead.prefs)}
			</td>
			<td><button class="action-btn showcase-btn" data-matches="${lead.id}" title="View Top Listing Matches">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
					<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
				</svg>
				Matches
			</button></td>
			<td data-sort="assigned_agent_id">
				${state.role === 'manager' ? renderAgentSelect(lead, agents) : renderAgentReadOnly(lead, agents)}
			</td>
		`;
			tbody.appendChild(tr);
		});

		// Add click listeners for notes icons
		document.querySelectorAll('.notes-icon').forEach(icon => {
			icon.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const leadId = e.target.closest('.notes-icon').dataset.leadId;
				// Get lead name for modal title
				const lead = await api.getLead(leadId);
				openLeadNotesModal(leadId, lead.name);
			});
		});

		// Add click listeners for activity log icons
		document.querySelectorAll('.activity-icon').forEach(icon => {
			icon.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const leadId = e.target.closest('.activity-icon').dataset.leadId;
				// Get lead name for modal title
				const lead = await api.getLead(leadId);
				openActivityLogModal(leadId, 'lead', lead.name);
			});
		});

		// Debug: Check if health buttons exist
		const healthButtons = document.querySelectorAll('.health-btn');
		console.log('Health buttons found:', healthButtons.length);
		document.getElementById('pageInfo').textContent = `Page ${state.page} · ${total} total`;

		// Update sort headers
		updateSortHeaders('leadsTable');

		// Fetch ALL leads for statistics (without pagination) - separate try/catch to not break rendering
		try {
			console.log('📊 Fetching stats for role:', state.role, 'agentId:', state.agentId);
			const allLeadsForStats = await SupabaseAPI.getAllLeadsForStats({
				role: state.role,
				agentId: state.agentId
			});
			console.log('📊 Stats fetched:', allLeadsForStats.length, 'leads');

			// Update statistics banner (role-aware) - use all leads, not just paginated items
			updateLeadStatistics(allLeadsForStats, state);
		} catch (statsError) {
			console.error('❌ Error fetching lead statistics:', statsError);
			// Don't break the page, just log the error and show zeros
			updateLeadStatistics([], state);
		}

		// Auto-select lead if specified (deep linking from Customer View)
		if (autoSelectLeadId) {
			console.log('🔗 Deep linking: Auto-selecting lead:', autoSelectLeadId);
			setTimeout(() => {
				// Find the "View/Edit" button for this lead
				const viewButton = document.querySelector(`button[data-view="${autoSelectLeadId}"]`);
				if (viewButton) {
					viewButton.click();
					console.log('✅ Auto-selected lead:', autoSelectLeadId);
				} else {
					console.warn('⚠️ Could not find lead to auto-select:', autoSelectLeadId);
				}
			}, 300);
		}

	} catch (error) {
		console.error('Error rendering leads:', error);
		// Keep loading indicator row, just update it to show error
		if (loadingIndicator) {
			loadingIndicator.innerHTML = '<td colspan="7" style="text-align: center; padding: 40px; color: var(--danger);">Error loading leads. Please try again.</td>';
		}
		// Still try to update stats even if rendering failed
		try {
			const allLeadsForStats = await SupabaseAPI.getAllLeadsForStats({
				role: state.role,
				agentId: state.agentId
			});
			updateLeadStatistics(allLeadsForStats, state);
		} catch (statsError) {
			console.error('❌ Error fetching lead statistics:', statsError);
			updateLeadStatistics([], state);
		}
	} finally {
		// Hide loading indicator
		if (loadingIndicator) {
			loadingIndicator.style.display = 'none';
		}
	}
}

/**
 * Update statistics banner with lead metrics
 * Role-aware: Shows all leads for managers, only assigned leads for agents
 * Calculates and displays:
 * - Total Leads: All leads (manager) OR assigned leads (agent)
 * - Active Leads: Active leads (not closed/lost)
 * - New This Week: Leads created in the last 7 days
 * - Needs Attention: Leads with health status 'red' or 'yellow'
 *
 * @param {Array} leads - Array of all leads
 * @param {Object} state - Application state with role and agentId
 */
export function updateLeadStatistics(leads, state) {
	if (!leads || !Array.isArray(leads)) {
		console.warn('updateLeadStatistics: Invalid leads array');
		return;
	}

	if (!state) {
		console.warn('updateLeadStatistics: State object required for role-aware filtering');
		return;
	}

	// Note: Leads are already filtered by role in getAllLeadsForStats API call
	// No need to filter again here
	console.log(`📊 Statistics for ${state.role} (${state.role === 'agent' ? state.agentId : 'all'}): ${leads.length} leads`);

	// Calculate Total Leads
	const totalLeads = leads.length;

	// Calculate Active Leads (not closed or lost)
	const activeLeads = leads.filter(lead =>
		lead.status !== 'closed' && lead.status !== 'lost'
	).length;

	// Calculate New This Week (created in last 7 days)
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
	const newThisWeek = leads.filter(lead => {
		if (!lead.created_at) return false;
		const createdDate = new Date(lead.created_at);
		return createdDate >= oneWeekAgo;
	}).length;

	// Calculate Needs Attention (health status red or yellow)
	// Use health_status field directly (already calculated in DB or previous step)
	const needsAttention = leads.filter(lead => {
		const health = lead.health_status || calculateHealthStatus(lead);
		return health === 'red' || health === 'yellow';
	}).length;

	// Update DOM elements
	const statTotalLeads = document.getElementById('statTotalLeads');
	const statActiveLeads = document.getElementById('statActiveLeads');
	const statNewThisWeek = document.getElementById('statNewThisWeek');
	const statNeedsAttention = document.getElementById('statNeedsAttention');

	if (statTotalLeads) statTotalLeads.textContent = totalLeads;
	if (statActiveLeads) statActiveLeads.textContent = activeLeads;
	if (statNewThisWeek) statNewThisWeek.textContent = newThisWeek;
	if (statNeedsAttention) statNeedsAttention.textContent = needsAttention;
}

