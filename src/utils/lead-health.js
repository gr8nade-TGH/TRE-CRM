// Lead Health Utilities
// Functions for tracking lead health status and step progression

import { getLeadActivities } from '../api/supabase-api.js';

/**
 * Get current step from lead activities
 * @param {string} leadId - Lead ID
 * @param {Array} activities - Optional pre-fetched activities array (for batch optimization)
 * @returns {Promise<number>} Current step number (1-8)
 */
export async function getCurrentStepFromActivities(leadId, activities = null) {
	try {
		// If activities not provided, fetch them
		if (!activities) {
			activities = await getLeadActivities(leadId);
		}

		// Map activity types to step numbers
		// Note: 'showcase_response' is optional and doesn't advance the step counter
		// Note: 'lease_signed' is optional and doesn't advance the step counter
		const stepMapping = {
			'lead_created': 1,
			'showcase_sent': 2,
			'guest_card_sent': 3,
			'property_selected': 4,
			'lease_sent': 5,
			'lease_finalized': 6
		};

		// Find the highest step reached
		let currentStep = 1;
		activities.forEach(activity => {
			const step = stepMapping[activity.activity_type];
			if (step && step > currentStep) {
				currentStep = step;
			}
		});

		return currentStep;
	} catch (error) {
		console.error('Error getting current step:', error);
		return 1; // Default to step 1
	}
}

/**
 * Get step label from step number
 * @param {number} stepNumber - Step number (1-6)
 * @returns {string} Step label
 */
export function getStepLabel(stepNumber) {
	const stepLabels = {
		1: 'Lead Joined',
		2: 'Showcase Sent',
		3: 'Guest Card Sent',
		4: 'Property Selected',
		5: 'Lease Sent',
		6: 'Lease Finalized'
	};
	return stepLabels[stepNumber] || 'Unknown';
}

/**
 * Get health messages for a lead
 * @param {Object} lead - Lead object
 * @param {Function} formatDate - Date formatting function
 * @returns {Promise<Array<string>>} Array of health messages
 */
export async function getHealthMessages(lead, formatDate) {
	const now = new Date();

	// Get last activity timestamp
	let lastActivityDate;
	if (lead.last_activity_at) {
		lastActivityDate = new Date(lead.last_activity_at);
	} else if (lead.updated_at) {
		lastActivityDate = new Date(lead.updated_at);
	} else {
		lastActivityDate = new Date(lead.created_at || lead.submitted_at);
	}

	const hoursSinceActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60));
	const daysSinceActivity = Math.floor(hoursSinceActivity / 24);
	const remainingHours = hoursSinceActivity % 24;

	// Get current step
	const currentStepNumber = lead.current_step || await getCurrentStepFromActivities(lead.id);
	const currentStepLabel = getStepLabel(currentStepNumber);
	const nextStepNumber = currentStepNumber < 6 ? currentStepNumber + 1 : null;
	const nextStepLabel = nextStepNumber ? getStepLabel(nextStepNumber) : 'Complete';

	// Format time display
	let timeDisplay;
	if (daysSinceActivity > 0) {
		timeDisplay = `${daysSinceActivity}d ${remainingHours}h`;
	} else {
		timeDisplay = `${hoursSinceActivity}h`;
	}

	if (lead.health_status === 'green') {
		return [
			`✅ Lead is actively engaged`,
			`📄 Current step: ${currentStepLabel}`,
			`➡️ Next step: ${nextStepLabel}`,
			`📅 Last activity: ${timeDisplay} ago`
		];
	}

	if (lead.health_status === 'yellow') {
		return [
			`⚠️ Needs attention - no activity in 36+ hours`,
			`📄 Current step: ${currentStepLabel}`,
			`➡️ Next step: ${nextStepLabel}`,
			`📅 Last activity: ${timeDisplay} ago`,
			`🎯 Action: Follow up with lead soon`
		];
	}

	if (lead.health_status === 'red') {
		return [
			`🚨 Urgent - no activity in 72+ hours`,
			`📄 Current step: ${currentStepLabel}`,
			`➡️ Next step: ${nextStepLabel}`,
			`📅 Last activity: ${timeDisplay} ago`,
			`🔥 Action: Contact lead immediately`
		];
	}

	if (lead.health_status === 'closed') {
		return [
			`🎉 Lead successfully closed!`,
			`📄 Final step: ${currentStepLabel}`,
			`📅 Closed on: ${formatDate(lead.closed_at || lead.last_activity_at)}`
		];
	}

	if (lead.health_status === 'lost') {
		return [
			`❌ Lead lost`,
			`📄 Last step: ${currentStepLabel}`,
			`📅 Lost on: ${formatDate(lead.lost_at || lead.last_activity_at)}`,
			`💭 Reason: ${lead.loss_reason || 'No reason provided'}`
		];
	}

	// Default fallback
	return [
		`📄 Current step: ${currentStepLabel}`,
		`➡️ Next step: ${nextStepLabel}`,
		`📅 Last activity: ${timeDisplay} ago`
	];
}

