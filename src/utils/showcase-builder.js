// Showcase Builder Utilities
// Functions for building and sending property showcases to leads

/**
 * Send a built showcase to a lead
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
	const includeReferralBonus = document.getElementById('buildReferralBonus').checked;
	const includeMovingBonus = document.getElementById('buildMovingBonus').checked;

	if (!leadId) {
		toast('Please select a customer', 'error');
		return;
	}

	// Handle new object format or legacy array format
	const totalUnits = selectedData.totalUnits ?? selectedData.length ?? 0;
	const units = selectedData.units || selectedData;
	const properties = selectedData.properties || selectedData;

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

		toast(`Showcase email sent to ${lead.name}! They can view their personalized matches at the provided link.`);
		closeBuildShowcase();

		// Clear selections
		document.querySelectorAll('.unit-checkbox:checked').forEach(cb => cb.checked = false);
		updateBuildShowcaseButton();

	} catch (error) {
		console.error('Error sending showcase email:', error);
		toast('Error sending email. Please try again.');
	}
}

