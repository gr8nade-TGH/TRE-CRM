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

	// Health status rendering
	const healthStatus = lead.health_status || 'green';
	const healthLabels = {
		green: 'Healthy',
		yellow: 'Warm',
		red: 'At Risk',
		closed: 'Closed',
		lost: 'Lost'
	};
	const healthColors = {
		green: '#25d366',
		yellow: '#ffd84d',
		red: '#ff3b30',
		closed: '#10b981',
		lost: '#ef4444'
	};
	const healthLabel = healthLabels[healthStatus] || 'Unknown';
	const healthColor = healthColors[healthStatus] || '#6b7280';

	// Match score (if available)
	const matchScore = lead.match_score || lead.smart_match_score || null;
	const matchScoreDisplay = matchScore ? `⭐ ${matchScore}%` : '';

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
						<span class="agent-name">${lead.agentName}</span>
						<span class="arrow">→</span>
						<span class="lead-name">${lead.leadName}</span>
					</div>
					<div class="lead-meta">
						<span class="health-badge" style="background-color: ${healthColor}20; color: ${healthColor}; border: 1px solid ${healthColor}40;">
							<span class="health-dot" style="background-color: ${healthColor};"></span>
							${healthLabel}
						</span>
						${matchScoreDisplay ? `<span class="match-score-badge">${matchScoreDisplay}</span>` : ''}
						<span class="step-progress">Step ${lead.currentStep} of ${progressSteps.length}</span>
					</div>
				</div>
			</div>
			<div class="lead-actions">
				<span class="last-updated">${formatDate(lead.lastUpdated)}</span>
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

