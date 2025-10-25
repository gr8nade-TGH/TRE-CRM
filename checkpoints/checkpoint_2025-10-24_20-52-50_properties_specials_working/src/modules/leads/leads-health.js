/**
 * Leads Health Module
 * EXACT COPY from script.js - Health status calculation and rendering
 * 
 * @module leads/health
 */

/**
 * Calculate health status based on last activity time
 * EXACT COPY from script.js (lines 409-443)
 * @param {Object} lead - Lead object
 * @returns {string} Health status ('green', 'yellow', 'red', 'closed', 'lost')
 */
export function calculateHealthStatus(lead) {
	// If lead is manually marked as closed or lost, respect that
	if (lead.status === 'closed' || lead.status === 'lost') {
		return lead.status;
	}

	const now = new Date();

	// Get the most recent activity timestamp
	// Check both last_activity_at and updated_at
	let lastActivityDate;
	if (lead.last_activity_at) {
		lastActivityDate = new Date(lead.last_activity_at);
	} else if (lead.updated_at) {
		lastActivityDate = new Date(lead.updated_at);
	} else {
		lastActivityDate = new Date(lead.created_at || lead.submitted_at);
	}

	// Calculate hours since last activity
	const hoursSinceActivity = (now - lastActivityDate) / (1000 * 60 * 60);

	// Health status thresholds:
	// Green: < 36 hours since last activity
	// Yellow: 36-72 hours since last activity
	// Red: > 72 hours since last activity

	if (hoursSinceActivity < 36) {
		return 'green';
	} else if (hoursSinceActivity < 72) {
		return 'yellow';
	} else {
		return 'red';
	}
}

/**
 * Render health status button with colored dot
 * EXACT COPY from script.js (lines 763-787)
 * @param {string} status - Health status
 * @param {Object} lead - Lead object (optional)
 * @returns {string} HTML string for health status button
 */
export function renderHealthStatus(status, lead = null) {
	// Calculate health status if lead is provided
	if (lead) {
		const calculatedStatus = calculateHealthStatus(lead);
		lead.health_status = calculatedStatus;
		lead.health_score = Math.max(0, Math.min(100, lead.health_score || 100));
		lead.health_updated_at = new Date().toISOString();
	}

	const finalStatus = lead ? lead.health_status : status;

	if (finalStatus === 'green') {
		return `<button class="health-btn" data-status="green" aria-label="Healthy" data-lead-id="${lead?.id || ''}"><span class="health-dot health-green"></span></button>`;
	}
	if (finalStatus === 'yellow') {
		return `<button class="health-btn" data-status="yellow" aria-label="Warm" data-lead-id="${lead?.id || ''}"><span class="health-dot health-yellow"></span></button>`;
	}
	if (finalStatus === 'red') {
		return `<button class="health-btn" data-status="red" aria-label="At Risk" data-lead-id="${lead?.id || ''}"><span class="health-dot health-red"></span></button>`;
	}
	if (finalStatus === 'closed') {
		return `<button class="health-btn" data-status="closed" aria-label="Closed" data-lead-id="${lead?.id || ''}"><span class="health-icon health-check"><svg viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg></span></button>`;
	}
	return `<button class="health-btn" data-status="lost" aria-label="Lost" data-lead-id="${lead?.id || ''}"><span class="health-icon health-lost"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button>`;
}

