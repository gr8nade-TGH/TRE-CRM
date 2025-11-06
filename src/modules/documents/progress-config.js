/**
 * Progress Configuration Module
 * Defines the progress steps for lead document workflow
 * 
 * @module documents/progress-config
 */

/**
 * Progress steps configuration
 * Defines the 6-step workflow for lead document processing
 *
 * Each step has:
 * - id: Step number (1-6)
 * - label: Display label for the step
 * - key: Unique key for the step
 * - requiredActivity: Activity type that marks this step as complete
 * - optionalActivities: Activities that provide additional context for this step
 * - description: Human-readable description of what this step represents
 *
 * Note: "Lead Responded" is an optional indicator that appears above "Smart Match Sent"
 * when a lead responds via Property Matcher. It doesn't block progress to the next step.
 *
 * Note: "Lease Signed!" is an optional indicator that appears above "Lease Sent"
 * when a lease is signed. It doesn't block progress to the next step.
 */
export const progressSteps = [
	{
		id: 1,
		label: 'Lead Joined',
		key: 'leadJoined',
		requiredActivity: 'lead_created',
		optionalActivities: ['welcome_email_sent'],
		description: 'Lead submitted form or was manually added to CRM'
	},
	{
		id: 2,
		label: 'Smart Match Sent',
		key: 'smartMatchSent',
		requiredActivity: 'smart_match_sent',
		optionalActivities: ['property_matcher_viewed', 'property_matcher_submitted', 'wants_more_options'],
		description: 'Smart Match email sent with curated property recommendations'
	},
	{
		id: 3,
		label: 'Guest Card Sent',
		key: 'guestCardSent',
		requiredActivity: 'guest_card_sent',
		optionalActivities: [],
		description: 'Guest cards sent to property owners for selected properties'
	},
	{
		id: 4,
		label: 'Property Selected',
		key: 'propertySelected',
		requiredActivity: 'property_selected',
		optionalActivities: ['tour_scheduled', 'application_submitted'],
		description: 'Lead selected a specific property to pursue'
	},
	{
		id: 5,
		label: 'Lease Sent',
		key: 'leaseSent',
		requiredActivity: 'lease_sent',
		optionalActivities: ['lease_signed'],
		description: 'Lease documents sent to lead for signature'
	},
	{
		id: 6,
		label: 'Lease Finalized',
		key: 'leaseFinalized',
		requiredActivity: 'lease_finalized',
		optionalActivities: ['commission_processed'],
		description: 'Lease fully executed and finalized - commission ready'
	}
];

/**
 * Render progress table for leads
 * @param {string} tbodyId - The tbody element ID
 * @param {Array} leads - Array of lead objects
 * @param {Object} deps - Dependencies object
 * @param {Function} deps.createLeadTable - Function to create lead table
 * @param {Function} deps.showStepDetails - Function to show step details
 */
export function renderProgressTable(tbodyId, leads, deps) {
	const { createLeadTable, showStepDetails } = deps;

	const container = document.getElementById(tbodyId);
	if (!container) return;

	// Clear existing content
	container.innerHTML = '';

	// Create each lead as a separate table
	leads.forEach((lead, index) => {
		const leadTable = createLeadTable(lead, index === 0); // First lead expanded by default
		container.appendChild(leadTable);
	});

	// Event listeners are handled by event delegation in the main event listener setup

	// Add event listeners for progress steps
	leads.forEach(lead => {
		progressSteps.forEach(step => {
			const stepElement = document.querySelector(`[data-lead-id="${lead.id}"][data-step="${step.id}"]`);
			if (stepElement) {
				stepElement.addEventListener('click', (e) => {
					e.stopPropagation();
					showStepDetails(lead, step);
				});
			}
		});
	});
}

/**
 * Toggle lead table expansion
 * @param {string} leadId - The lead ID
 */
export function toggleLeadTable(leadId) {
	console.log('toggleLeadTable called with leadId:', leadId);

	// Find the button in the currently visible view only
	const managerView = document.getElementById('managerDocumentsView');
	const agentView = document.getElementById('agentDocumentsView');

	let btn = null;
	let container = null;

	// Check which view is visible and search within that view only
	if (managerView && !managerView.classList.contains('hidden')) {
		container = managerView.querySelector(`[data-lead-id="${leadId}"]`)?.closest('.lead-table-container');
		btn = container?.querySelector('.expand-btn');
		console.log('Searching in Manager view');
	} else if (agentView && !agentView.classList.contains('hidden')) {
		container = agentView.querySelector(`[data-lead-id="${leadId}"]`)?.closest('.lead-table-container');
		btn = container?.querySelector('.expand-btn');
		console.log('Searching in Agent view');
	}

	console.log('Found button:', btn);
	console.log('Found container:', container);

	if (!btn || !container) {
		console.log('No button or container found for leadId:', leadId);
		return;
	}

	const content = container.querySelector('.lead-table-content');
	const expandIcon = container.querySelector('.expand-icon');

	console.log('Content element:', content);
	console.log('Expand icon:', expandIcon);

	if (!content) {
		console.log('No content element found');
		return;
	}

	// Toggle visibility using CSS classes
	const isCollapsed = content.classList.contains('collapsed');
	console.log('Current state - isCollapsed:', isCollapsed);

	if (isCollapsed) {
		// Expand
		content.classList.remove('collapsed');
		content.classList.add('expanded');
		if (expandIcon) expandIcon.textContent = '▼';
		console.log('Expanded table');
	} else {
		// Collapse
		content.classList.remove('expanded');
		content.classList.add('collapsed');
		if (expandIcon) expandIcon.textContent = '▶';
		console.log('Collapsed table');
	}
}

