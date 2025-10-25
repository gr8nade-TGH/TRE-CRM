/**
 * Document Status Module
 * Handles document status tracking and rendering for leads
 * 
 * @module documents/document-status
 */

/**
 * Render document step status badge
 * @param {Object} step - The step object
 * @param {number} currentStep - The current step number
 * @returns {string} HTML string for step status badge
 */
export function renderDocumentStepStatus(step, currentStep) {
	if (step.id < currentStep) {
		return `<span class="step-completed">✓ Completed</span>`;
	} else if (step.id === currentStep) {
		return `<span class="step-current">● In Progress</span>`;
	} else {
		return `<span class="step-pending">○ Pending</span>`;
	}
}

/**
 * Render document steps for a lead
 * @param {string} leadId - The lead ID
 * @param {Object} mockDocumentStatuses - Mock document statuses object
 * @returns {string} HTML string for document steps
 */
export function renderDocumentSteps(leadId, mockDocumentStatuses) {
	const docStatus = mockDocumentStatuses[leadId];
	if (!docStatus) return 'No document status available';

	return docStatus.steps.map(step => `
		<div class="document-step ${step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'current' : 'pending'}">
			<div class="step-header">
				<span class="step-number">${step.id}.</span>
				<span class="step-name">${step.name}</span>
				${renderDocumentStepStatus(step, docStatus.currentStep)}
			</div>
			${step.attachments.length > 0 ? `
				<div class="attachments">
					${step.attachments.map(attachment => `
						<div class="attachment">
							<span class="attachment-icon">📎</span>
							<span class="attachment-name">${attachment}</span>
							<button class="attachment-download" data-file="${attachment}">Download</button>
						</div>
					`).join('')}
				</div>
			` : ''}
		</div>
	`).join('');
}

/**
 * Render leads table for documents page
 * @param {string} searchTerm - Search term to filter leads
 * @param {string} searchType - Type of search ('agent', 'lead', or 'both')
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.state - Application state
 * @param {Array} deps.realAgents - Array of real agents
 * @param {Object} deps.mockDocumentStatuses - Mock document statuses
 * @param {Function} deps.formatDate - Date formatting function
 */
export function renderLeadsTable(searchTerm = '', searchType = 'both', deps) {
	const { state, realAgents, mockDocumentStatuses, formatDate } = deps;
	
	const tbody = document.getElementById('documentsTbody');
	tbody.innerHTML = '';

	// Get all active leads with their agent info
	const leads = state.leads || [];
	let activeLeads = leads.filter(l => l.health_status !== 'closed' && l.health_status !== 'lost');

	// Apply search filter
	if (searchTerm.trim()) {
		activeLeads = activeLeads.filter(lead => {
			const agent = realAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
			const searchLower = searchTerm.toLowerCase();

			if (searchType === 'agent') {
				return agent.name.toLowerCase().includes(searchLower);
			} else if (searchType === 'lead') {
				return lead.name.toLowerCase().includes(searchLower) || lead.email.toLowerCase().includes(searchLower);
			} else { // both
				return agent.name.toLowerCase().includes(searchLower) ||
					   lead.name.toLowerCase().includes(searchLower) ||
					   lead.email.toLowerCase().includes(searchLower);
			}
		});
	}

	activeLeads.forEach(lead => {
		const agent = realAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
		const progress = getDocumentProgress(lead.id, mockDocumentStatuses);
		const currentStep = getCurrentDocumentStep(lead.id, mockDocumentStatuses);
		const lastUpdated = getLastDocumentUpdate(lead.id, mockDocumentStatuses);

		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td data-sort="agent_name">${agent.name}</td>
			<td data-sort="lead_name">
				<div class="lead-name">${lead.name}</div>
				<div class="subtle mono">${lead.email}</div>
			</td>
			<td data-sort="current_step">
				<div class="current-step">${currentStep}</div>
			</td>
			<td data-sort="progress">
				<div class="progress-bar">
					<div class="progress-fill" style="width: ${progress}%"></div>
				</div>
				<div class="progress-text">${progress}% complete</div>
			</td>
			<td data-sort="last_updated" class="mono">${formatDate(lastUpdated)}</td>
			<td>
				<button class="btn-small btn-primary-small" onclick="openDocumentDetails('${lead.id}')">
					View Details
				</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

/**
 * Get document progress percentage for a lead
 * @param {string} leadId - The lead ID
 * @param {Object} mockDocumentStatuses - Mock document statuses object
 * @returns {number} Progress percentage (0-100)
 */
export function getDocumentProgress(leadId, mockDocumentStatuses) {
	const status = mockDocumentStatuses[leadId];
	if (!status) return 0;

	const completedSteps = status.steps.filter(step => step.status === 'completed').length;
	return Math.round((completedSteps / status.steps.length) * 100);
}

/**
 * Get current document step name for a lead
 * @param {string} leadId - The lead ID
 * @param {Object} mockDocumentStatuses - Mock document statuses object
 * @returns {string} Current step name or status
 */
export function getCurrentDocumentStep(leadId, mockDocumentStatuses) {
	const status = mockDocumentStatuses[leadId];
	if (!status) return 'Not Started';

	const currentStep = status.steps.find(step => step.status === 'current');
	return currentStep ? currentStep.name : 'Completed';
}

/**
 * Get document status for a lead
 * @param {string} leadId - The lead ID
 * @param {Object} mockDocumentStatuses - Mock document statuses object
 * @returns {string} Status ('not-started', 'active', or 'completed')
 */
export function getDocumentStatus(leadId, mockDocumentStatuses) {
	const progress = getDocumentProgress(leadId, mockDocumentStatuses);
	if (progress === 0) return 'not-started';
	if (progress === 100) return 'completed';
	return 'active';
}

/**
 * Get last document update timestamp for a lead
 * @param {string} leadId - The lead ID
 * @param {Object} mockDocumentStatuses - Mock document statuses object
 * @returns {Date|string} Last update timestamp
 */
export function getLastDocumentUpdate(leadId, mockDocumentStatuses) {
	const status = mockDocumentStatuses[leadId];
	if (!status) return new Date();

	const lastStep = status.steps
		.filter(step => step.status === 'completed')
		.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

	return lastStep ? lastStep.updated_at : new Date();
}

/**
 * Update document status (placeholder)
 * @param {string} leadId - The lead ID
 * @param {Function} toast - Toast notification function
 */
export function updateDocumentStatus(leadId, toast) {
	toast('Document status update feature coming soon!');
}

