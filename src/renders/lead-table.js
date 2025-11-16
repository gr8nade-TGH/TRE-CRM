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
				<div class="quick-actions">
					<button class="quick-action-btn" data-action="call" data-lead-id="${lead.id}" title="Call Lead">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
						</svg>
					</button>
					<button class="quick-action-btn" data-action="email" data-lead-id="${lead.id}" title="Email Lead">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
							<polyline points="22,6 12,13 2,6"></polyline>
						</svg>
					</button>
					<button class="quick-action-btn" data-action="sms" data-lead-id="${lead.id}" title="Text Lead">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
						</svg>
					</button>
				</div>
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

