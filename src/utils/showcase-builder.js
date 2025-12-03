// Showcase Builder Utilities
// Functions for building and sending property showcases to leads

import { show, hide } from '../modules/modals/modal-utils.js';

// Store pending showcase data for confirmation flow
let pendingShowcaseData = null;

/**
 * Show confirmation modal before sending showcase
 * @param {Object} deps - Dependencies object
 * @returns {Promise<void>}
 */
export async function sendBuildShowcase(deps) {
	const {
		state,
		api,
		toast,
		closeBuildShowcase,
		updateBuildShowcaseButton,
		getSelectedListings
	} = deps;

	const leadId = document.getElementById('buildShowcaseLead').value;
	const selectedData = getSelectedListings();
	const includeReferralBonus = document.getElementById('buildReferralBonus')?.checked || false;
	const includeMovingBonus = document.getElementById('buildMovingBonus')?.checked || false;

	if (!leadId) {
		toast('Please select a customer', 'error');
		return;
	}

	// Handle new object format or legacy array format
	const totalUnits = selectedData.totalUnits ?? selectedData.length ?? 0;
	const units = selectedData.units || selectedData;

	if (totalUnits === 0) {
		toast('Please select at least one unit', 'error');
		return;
	}

	const leads = state.leads || [];
	const lead = leads.find(l => l.id === leadId);
	if (!lead) {
		toast('Customer not found', 'error');
		return;
	}

	// Store data for confirmation
	pendingShowcaseData = {
		lead,
		units,
		totalUnits,
		includeReferralBonus,
		includeMovingBonus,
		deps
	};

	// Show confirmation modal
	showSendConfirmation(lead, units, totalUnits, includeReferralBonus, includeMovingBonus);
}

/**
 * Show the send confirmation modal
 */
function showSendConfirmation(lead, units, totalUnits, includeReferralBonus, includeMovingBonus) {
	const confirmModal = document.getElementById('showcaseSendConfirmModal');
	const confirmContent = document.getElementById('showcaseSendConfirmContent');

	if (!confirmModal || !confirmContent) return;

	// Build confirmation content
	const bonuses = [];
	if (includeReferralBonus) bonuses.push('Referral Bonus');
	if (includeMovingBonus) bonuses.push('Moving Bonus');

	// Get unique properties
	const propertyNames = [...new Set(units.map(u => u.propertyName || 'Unknown Property'))];

	confirmContent.innerHTML = `
		<div class="confirm-summary">
			<div class="confirm-row">
				<span class="confirm-label">📧 Sending to:</span>
				<span class="confirm-value"><strong>${lead.name}</strong> (${lead.email || 'No email'})</span>
			</div>
			<div class="confirm-row">
				<span class="confirm-label">🏠 Units:</span>
				<span class="confirm-value"><strong>${totalUnits}</strong> unit${totalUnits !== 1 ? 's' : ''} from ${propertyNames.length} propert${propertyNames.length !== 1 ? 'ies' : 'y'}</span>
			</div>
			<div class="confirm-row">
				<span class="confirm-label">📍 Properties:</span>
				<span class="confirm-value">${propertyNames.slice(0, 3).join(', ')}${propertyNames.length > 3 ? ` +${propertyNames.length - 3} more` : ''}</span>
			</div>
			${bonuses.length > 0 ? `
				<div class="confirm-row">
					<span class="confirm-label">🎁 Bonuses:</span>
					<span class="confirm-value">${bonuses.join(', ')}</span>
				</div>
			` : ''}
		</div>
		<p style="margin-top: 16px; color: #64748b; font-size: 13px;">
			The customer will receive an email with a link to view their personalized property showcase.
		</p>
	`;

	show(confirmModal);
}

/**
 * Actually send the showcase after confirmation
 */
export async function confirmAndSendShowcase() {
	if (!pendingShowcaseData) return;

	const { lead, units, totalUnits, includeReferralBonus, includeMovingBonus, deps } = pendingShowcaseData;
	const { state, api, toast, closeBuildShowcase, updateBuildShowcaseButton } = deps;

	// Hide confirmation modal
	hide(document.getElementById('showcaseSendConfirmModal'));

	// Generate unique showcase ID for tracking
	const showcaseId = `showcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	// Create landing page URL with tracking parameters
	const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'landing.html');
	const unitIds = units.map(u => u.id).join(',');
	const landingUrl = `${baseUrl}?showcase=${showcaseId}&lead=${lead.id}&units=${unitIds}`;

	// Create email content with bonus information
	let bonusText = '';
	if (includeReferralBonus || includeMovingBonus) {
		bonusText = '<p><strong>Special Perks:</strong></p><ul>';
		if (includeReferralBonus) {
			bonusText += '<li>$200 referral bonus for recommending friends</li>';
		}
		if (includeMovingBonus) {
			bonusText += '<li>Moving bonus to help with relocation costs</li>';
		}
		bonusText += '</ul>';
	}

	// Build email content using unit data
	const emailContent = {
		to: lead.email,
		subject: 'Top options hand picked for you',
		html: `
			<h2>Top Property Options for You</h2>
			<p>Hi ${lead.name.split(' ')[0]},</p>
			<p>I've hand-picked these units based on your preferences:</p>
			${bonusText}
			${units.map(unit => `
				<div style="border: 1px solid #e5e7eb; padding: 16px; margin: 16px 0; border-radius: 8px;">
					<h3>${unit.propertyName || 'Property'} - Unit ${unit.unit_number || 'TBD'}</h3>
					<p><strong>Floor Plan:</strong> ${unit.floorPlanName || 'N/A'}</p>
					<p><strong>Rent:</strong> ${unit.rent ? '$' + unit.rent.toLocaleString() + '/mo' : 'Call for pricing'}</p>
					<p><strong>Size:</strong> ${unit.beds ?? '?'} bed / ${unit.baths ?? '?'} bath${unit.sqft ? ' / ' + unit.sqft.toLocaleString() + ' sqft' : ''}</p>
				</div>
			`).join('')}
			<p>Click the link below to view your personalized property showcase and schedule tours:</p>
			<p><a href="${landingUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Property Showcase</a></p>
			<p>Best regards,<br>Your TRE Agent</p>
		`,
		showcase_id: showcaseId
	};

	try {
		// Send email via API
		await api.sendEmail(emailContent);

		// Create showcase record in database
		await api.createShowcase({
			lead_id: lead.id,
			agent_id: state.agentId || 'current-agent-id',
			listing_ids: units.map(u => u.propertyId || u.id),
			unit_ids: units.map(u => u.id),
			message: `Showcase sent to ${lead.name} with ${totalUnits} units`,
			showcase_id: showcaseId,
			landing_url: landingUrl
		});

		// Close build showcase modal
		closeBuildShowcase();

		// Clear selections
		document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
		updateBuildShowcaseButton();

		// Show success modal
		showSuccessModal(lead, totalUnits, landingUrl);

		// Clear pending data
		pendingShowcaseData = null;

	} catch (error) {
		console.error('Error sending showcase email:', error);
		toast('Error sending email. Please try again.');
	}
}

/**
 * Show success modal after sending
 */
function showSuccessModal(lead, totalUnits, landingUrl) {
	const successModal = document.getElementById('showcaseSuccessModal');
	const successMessage = document.getElementById('showcaseSuccessMessage');
	const viewBtn = document.getElementById('viewShowcaseLanding');

	if (!successModal) return;

	if (successMessage) {
		successMessage.textContent = `${lead.name} will receive an email with ${totalUnits} unit${totalUnits !== 1 ? 's' : ''} to explore.`;
	}

	if (viewBtn) {
		viewBtn.onclick = () => {
			window.open(landingUrl, '_blank');
		};
	}

	show(successModal);
}

/**
 * Cancel the pending showcase send
 */
export function cancelShowcaseSend() {
	pendingShowcaseData = null;
	hide(document.getElementById('showcaseSendConfirmModal'));
}

