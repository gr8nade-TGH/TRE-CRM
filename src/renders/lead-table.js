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

	const table = document.createElement('div');
	table.className = 'lead-table-container';
	table.innerHTML = `
		<div class="lead-table-header">
			<div class="lead-info">
				<div class="lead-icon">⚙️</div>
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
								return `
									<div class="progress-step ${stepClass}"
										 data-lead-id="${lead.id}"
										 data-step="${step.id}">
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

