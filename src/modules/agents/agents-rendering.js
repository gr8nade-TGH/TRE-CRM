/**
 * Agents Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 * 
 * @module agents/rendering
 */

import { updateSortHeaders } from '../../utils/helpers.js';

/**
 * Render agents table
 * EXACT COPY from script.js (lines 3182-3264)
 * Preserves all original functionality including:
 * - Agent stats (generated, assigned, closed)
 * - Landing page URLs
 * - Lock/unlock functionality
 * - Active/inactive status
 * - All event listeners
 *
 * @param {Object} options - Rendering options
 * @param {Array} options.mockAgents - Array of agents
 * @param {Object} options.state - Application state
 * @param {Function} options.getAgentStats - Function to get agent stats
 * @returns {Promise<void>}
 */
export async function renderAgents(options) {
	const {
		mockAgents,
		state,
		getAgentStats
	} = options;

	const tbody = document.getElementById('agentsTbody');
	tbody.innerHTML = '';

	// Apply sorting if active
	const agentsToRender = [...mockAgents];
	if (state.sort.key && state.sort.dir && state.sort.dir !== 'none') {
		agentsToRender.sort((a, b) => {
			const statsA = getAgentStats(a.id);
			const statsB = getAgentStats(b.id);

			let aVal, bVal;
			if (state.sort.key === 'name') {
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
			} else if (state.sort.key === 'leads_generated') {
				aVal = statsA.generated;
				bVal = statsB.generated;
			} else if (state.sort.key === 'leads_assigned') {
				aVal = statsA.assigned;
				bVal = statsB.assigned;
			} else if (state.sort.key === 'leads_closed') {
				aVal = statsA.closed;
				bVal = statsB.closed;
			} else {
				return 0;
			}

			if (state.sort.key === 'leads_generated' || state.sort.key === 'leads_assigned' || state.sort.key === 'leads_closed') {
				// Numeric sorting
				const aNum = parseInt(aVal) || 0;
				const bNum = parseInt(bVal) || 0;
				return state.sort.dir === 'asc' ? aNum - bNum : bNum - aNum;
			} else {
				// Text sorting
				if (state.sort.dir === 'asc') {
					return aVal.localeCompare(bVal);
				} else {
					return bVal.localeCompare(aVal);
				}
			}
		});
	}

	agentsToRender.forEach(agent => {
		const stats = getAgentStats(agent.id);
		// Generate landing page URL with agent slug (name-based)
		const agentSlug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
		// Use Vercel production URL for agent landing pages (new design)
		const landingUrl = `https://tre-crm.vercel.app/agent/${agentSlug}`;

		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td data-sort="name">
				<div class="lead-name">${agent.name}</div>
				<div class="subtle mono">${agent.email} · ${agent.phone}</div>
				${!agent.active ? '<span class="subtle" style="color: #dc2626;">Inactive</span>' : ''}
				${agent.locked ? '<span class="subtle" style="color: #dc2626;">🔒 Locked</span>' : ''}
			</td>
			<td><button class="action-btn secondary" data-view-agent="${agent.id}" title="View/Edit Details">View/Edit</button></td>
			<td class="mono" data-sort="leads_generated">${stats.generated}</td>
			<td class="mono" data-sort="leads_assigned">${stats.assigned}</td>
			<td class="mono" data-sort="leads_closed">${stats.closed}</td>
			<td>
				<button class="action-btn secondary" data-view-landing="${landingUrl}" title="View Landing Page" style="margin-right: 8px;">
					<span style="margin-right: 4px;">🌐</span> View Page
				</button>
				<button class="action-btn secondary" data-copy-landing="${landingUrl}" title="Copy Landing Page URL">
					<span style="margin-right: 4px;">📋</span> Copy Link
				</button>
			</td>
			<td>
				<button class="action-btn" data-remove="${agent.id}">Remove Agent</button>
				<button class="action-btn ${agent.locked ? 'secondary' : ''}" data-lock="${agent.id}">${agent.locked ? '🔓 Unlock' : '🔒 Lock'} Account</button>
				<button class="action-btn" data-assign-leads="${agent.id}">Assign Leads</button>
			</td>
		`;
		tbody.appendChild(tr);
	});

	// Update sort headers
	updateSortHeaders('agentsTable');
}

