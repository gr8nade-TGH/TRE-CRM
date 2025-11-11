/**
 * Lead Table Rendering Module
 * Creates the expandable lead progress table UI
 */

/**
 * Create a lead table with progress visualization
 * @param {Object} lead - Lead object with progress data
 * @param {boolean} isExpanded - Whether the table should start expanded
 * @param {Object} deps - Dependencies
 * @param {Array} deps.progressSteps - Array of progress step definitions
 * @param {Function} deps.formatDate - Date formatting function
 * @returns {HTMLElement} The lead table DOM element
 */
export function createLeadTable(lead, isExpanded = false, deps) {
	const { progressSteps, formatDate } = deps;

	const progressPercentage = Math.round((lead.currentStep / progressSteps.length) * 100);
	const currentStepName = progressSteps[lead.currentStep - 1]?.label || 'Unknown';

	// Optional indicators (non-blocking achievements)
	const hasWelcomeEmailSent = lead.welcomeEmailSent || false;  // Step 1 indicator
	const hasLeadResponded = lead.leadResponded || false;        // Step 2 indicator
	const hasLeaseSigned = lead.leaseSigned || false;            // Step 5 indicator

	const table = document.createElement('div');
	table.className = 'lead-table-container';
	table.innerHTML = `
		<div class="lead-table-header">
			<div class="lead-info">
				<div class="lead-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3"></circle>
						<path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2"></path>
					</svg>
				</div>
				<div class="lead-details">
					<div class="lead-names">
						<span class="agent-label">Agent:</span> <span class="agent-name">${lead.agentName}</span>
						<span class="lead-label">Lead:</span> <span class="lead-name">${lead.leadName}</span>
					</div>
				</div>
			</div>
			<div class="progress-center">
				<span class="progress-info">${progressPercentage}% Complete - Current Step: ${currentStepName}</span>
			</div>
			<div class="lead-actions">
				<span class="last-updated">Last Update: ${formatDate(lead.lastUpdated)}</span>
				<button class="expand-btn" data-lead-id="${lead.id}">
					<span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
				</button>
			</div>
		</div>

		<div class="lead-table-content ${isExpanded ? 'expanded' : 'collapsed'}">
			<div class="progress-section">
				<div class="progress-bar-container">
					<div class="progress-bar">
						<div class="progress-line-fill" style="width: ${progressPercentage}%"></div>
						<div class="progress-steps">
							${progressSteps.map(step => {
		const stepClass = step.id < lead.currentStep ? 'completed' :
			step.id === lead.currentStep ? 'current' : 'pending';

		// Optional indicators (appear above their parent step when achieved)

		// Step 1: Welcome Email Sent indicator (clickable to view email)
		const welcomeEmailIndicator = (step.id === 1 && hasWelcomeEmailSent) ? `
									<div class="optional-indicator welcome-email-indicator clickable"
										 title="Click to view welcome email"
										 data-lead-id="${lead.id}"
										 data-action="view-welcome-email">
										<span class="checkmark">✓</span>
										<span class="label">Welcome Email Sent</span>
									</div>
								` : '';

		// Step 2: Lead Responded indicator (when lead submits Property Matcher)
		const leadRespondedIndicator = (step.id === 2 && hasLeadResponded) ? `
									<div class="optional-indicator lead-responded-indicator" title="Lead Responded">
										<span class="checkmark">✓</span>
										<span class="label">Lead Responded</span>
									</div>
								` : '';

		// Step 5: Lease Signed indicator
		const leaseSignedIndicator = (step.id === 5 && hasLeaseSigned) ? `
									<div class="optional-indicator lease-signed-indicator" title="Lease Signed!">
										<span class="checkmark">✓</span>
										<span class="label">Lease Signed!</span>
									</div>
								` : '';

		return `
									<div class="progress-step ${stepClass}"
										 data-lead-id="${lead.id}"
										 data-step="${step.id}">
										${welcomeEmailIndicator}
										${leadRespondedIndicator}
										${leaseSignedIndicator}
										<div class="progress-step-dot ${stepClass}">${step.id}</div>
										<div class="progress-step-label">${step.label}</div>
									</div>
								`;
	}).join('')}
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	return table;
}

