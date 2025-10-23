/**
 * Progress Configuration Module
 * Defines the progress steps for lead document workflow
 * 
 * @module documents/progress-config
 */

/**
 * Progress steps configuration
 * Defines the 8-step workflow for lead document processing
 */
export const progressSteps = [
	{ id: 1, label: 'Lead Joined', key: 'leadJoined' },
	{ id: 2, label: 'Showcase Sent', key: 'showcaseSent' },
	{ id: 3, label: 'Lead Responded', key: 'leadResponded' },
	{ id: 4, label: 'Guest Card Sent', key: 'guestCardSent' },
	{ id: 5, label: 'Property Selected', key: 'propertySelected' },
	{ id: 6, label: 'Lease Sent', key: 'leaseSent' },
	{ id: 7, label: 'Lease Signed', key: 'leaseSigned' },
	{ id: 8, label: 'Lease Finalized', key: 'leaseFinalized' }
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

	// Toggle visibility
	const isHidden = content.style.display === 'none';
	console.log('Current state - isHidden:', isHidden);

	if (isHidden) {
		content.style.display = 'table-row-group';
		if (expandIcon) expandIcon.textContent = '▼';
		console.log('Expanded table');
	} else {
		content.style.display = 'none';
		if (expandIcon) expandIcon.textContent = '▶';
		console.log('Collapsed table');
	}
}

