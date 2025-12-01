/**
 * Progress Tracker Enhancements
 * Utilities for calculating timestamps, blockers, and notifications for progress steps
 */

import { progressSteps } from '../modules/documents/progress-config.js';

/**
 * Calculate step timestamps from activities
 * @param {Array} activities - Lead activities array
 * @returns {Object} Map of step ID to timestamp
 */
export function calculateStepTimestamps(activities) {
	const timestamps = {};

	if (!activities || activities.length === 0) return timestamps;

	// Map activity types to step IDs
	const activityToStep = {
		'lead_created': 1,
		'smart_match_sent': 2,
		'guest_card_sent': 3,
		'property_selected': 4,
		'lease_prepared': 5,
		'lease_sent': 6,
		'lease_finalized': 7
	};

	// Find the earliest timestamp for each step's required activity
	activities.forEach(activity => {
		const stepId = activityToStep[activity.activity_type];
		if (stepId) {
			// Keep the earliest timestamp for each step
			if (!timestamps[stepId] || new Date(activity.created_at) < new Date(timestamps[stepId])) {
				timestamps[stepId] = activity.created_at;
			}
		}
	});

	return timestamps;
}

/**
 * Calculate step blockers based on lead data and property data
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object (if selected)
 * @returns {Object} Map of step ID to blocker message
 */
export function calculateStepBlockers(lead, property = null) {
	const blockers = {};

	// Step 3: Guest Card Sent - requires properties selected
	if (lead.current_step === 3 && !lead.property_id) {
		blockers[3] = 'No properties selected yet';
	}

	// Step 4: Property Selected - requires property selection
	if (lead.current_step === 4 && !lead.property_id) {
		blockers[4] = 'Lead has not selected a property';
	}

	// Step 5: Prepare Lease - requires property contact info
	if (lead.current_step === 5) {
		if (!lead.property_id) {
			blockers[5] = 'No property selected';
		} else if (property && (!property.contact_name || !property.contact_email)) {
			blockers[5] = 'Missing property contact info';
		}
	}

	// Step 6: Lease Sent - requires lease to be prepared
	if (lead.current_step === 6 && !lead.lease_confirmation_id) {
		blockers[6] = 'Lease not prepared yet';
	}

	return blockers;
}

/**
 * Calculate notification badges based on lead engagement and activity
 * @param {Object} lead - Lead object
 * @param {Array} activities - Lead activities array
 * @returns {Object} Map of step ID to notification object {type, message}
 */
export function calculateNotifications(lead, activities) {
	const notifications = {};

	if (!activities || activities.length === 0) return notifications;

	const now = new Date();

	// Step 2: Smart Match Sent - check for lead response
	const smartMatchActivity = activities.find(a => a.activity_type === 'smart_match_sent');
	const leadRespondedActivity = activities.find(a => a.activity_type === 'property_matcher_submitted');

	if (smartMatchActivity && !leadRespondedActivity) {
		const daysSinceSent = Math.floor((now - new Date(smartMatchActivity.created_at)) / (1000 * 60 * 60 * 24));

		if (daysSinceSent >= 3) {
			notifications[2] = {
				type: 'stale',
				message: `No response in ${daysSinceSent} days - follow up needed`
			};
		}
	}

	// Step 2: Lead responded - show engagement badge
	if (leadRespondedActivity) {
		const responseMetadata = leadRespondedActivity.metadata || {};
		const propertiesSelected = responseMetadata.properties_selected || 0;

		if (propertiesSelected >= 3) {
			notifications[2] = {
				type: 'highly_engaged',
				message: `Lead selected ${propertiesSelected} properties - highly engaged!`
			};
		} else if (propertiesSelected > 0) {
			notifications[2] = {
				type: 'lead_responded',
				message: `Lead responded and selected ${propertiesSelected} properties`
			};
		}
	}

	// Step 6: Lease Sent - check for signature delay
	const leaseSentActivity = activities.find(a => a.activity_type === 'lease_sent');
	const leaseSignedActivity = activities.find(a => a.activity_type === 'lease_signed');

	if (leaseSentActivity && !leaseSignedActivity) {
		const daysSinceSent = Math.floor((now - new Date(leaseSentActivity.created_at)) / (1000 * 60 * 60 * 24));

		if (daysSinceSent >= 2) {
			notifications[6] = {
				type: 'stale',
				message: `Awaiting signature for ${daysSinceSent} days - follow up with property`
			};
		}
	}

	// General: Check for any step that's been current for too long
	const lastActivityDate = activities.length > 0
		? new Date(Math.max(...activities.map(a => new Date(a.created_at))))
		: new Date(lead.created_at);

	const daysSinceActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));

	if (daysSinceActivity >= 5 && lead.current_step < 7) {
		notifications[lead.current_step] = {
			type: 'action_required',
			message: `No activity in ${daysSinceActivity} days - action required`
		};
	}

	return notifications;
}

/**
 * Format date to short format (e.g., "Dec 1")
 * @param {string} iso - ISO date string
 * @returns {string} Formatted short date
 */
export function formatDateShort(iso) {
	try {
		const date = new Date(iso);
		const options = { month: 'short', day: 'numeric', timeZone: 'America/Chicago' };
		return date.toLocaleDateString('en-US', options);
	} catch {
		return iso;
	}
}

