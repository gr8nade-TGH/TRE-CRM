/**
 * Showcase Helper Functions
 * 
 * Functions for managing showcases and interested leads
 */

/**
 * Open interested leads modal for a property
 * @param {string} propertyId - Property ID
 * @param {string} propertyName - Property name
 * @param {Object} options - Dependencies
 */
export async function openInterestedLeads(propertyId, propertyName, { api, show }) {
	console.log('=== OPENING INTERESTED LEADS ===');
	console.log('propertyId:', propertyId);
	console.log('propertyName:', propertyName);

	const modal = document.getElementById('interestedLeadsModal');
	console.log('Modal element:', modal);

	if (!modal) {
		console.error('Modal not found!');
		return;
	}

	document.getElementById('propertyName').textContent = propertyName;

	try {
		const interests = await api.getInterestedLeads(propertyId);
		console.log('Fetched interests:', interests);
		renderInterestedLeads(interests);
		show(modal);
		console.log('Modal should be visible now');
	} catch (error) {
		console.error('Error loading interested leads:', error);
		renderInterestedLeads([]);
		show(modal);
		console.log('Modal should be visible now (empty state)');
	}
}

/**
 * Close interested leads modal
 * @param {Object} options - Dependencies
 */
export function closeInterestedLeads({ hide }) {
	hide(document.getElementById('interestedLeadsModal'));
}

/**
 * Render interested leads list
 * @param {Array} interests - Array of interested leads
 * @param {Object} options - Dependencies
 */
function renderInterestedLeads(interests, { formatDate } = {}) {
	console.log('renderInterestedLeads called with:', interests);
	const content = document.getElementById('interestedLeadsList');

	if (interests.length === 0) {
		console.log('No interests found, showing empty state');
		content.innerHTML = `
			<div style="text-align: center; padding: 40px; color: #6b7280;">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 16px; opacity: 0.5;">
					<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
				</svg>
				<p>No interested leads yet</p>
				<p style="font-size: 0.875rem; margin-top: 8px;">Send showcases to generate interest!</p>
			</div>
		`;
		return;
	}

	console.log('Rendering', interests.length, 'interests');
	
	// Use formatDate if provided, otherwise use simple date formatting
	const formatDateFn = formatDate || ((date) => new Date(date).toLocaleDateString());
	
	content.innerHTML = interests.map(interest => `
		<div class="interested-lead-item">
			<div class="interest-icon">
				${interest.leadName.charAt(0).toUpperCase()}
			</div>
			<div class="lead-info">
				<div class="lead-name">${interest.leadName}</div>
				<div class="lead-contact">Lead ID: ${interest.leadId}</div>
				<div class="lead-agent">via ${interest.agentName}</div>
			</div>
			<div class="interest-details">
				<div class="interest-date">${formatDateFn(interest.date)}</div>
				<div class="interest-status ${interest.status}">${interest.status.replace('_', ' ')}</div>
			</div>
		</div>
	`).join('');
}

/**
 * Render public showcase HTML for email
 * @param {string} showcaseId - Showcase ID
 * @param {Object} options - Dependencies
 * @returns {string} HTML string
 */
export function renderPublicShowcaseHTML(showcaseId, { state, realAgents, mockProperties }) {
	const sc = state.showcases[showcaseId];
	const leads = state.leads || [];
	const lead = leads.find(l => l.id === sc.lead_id);
	const agent = realAgents.find(a => a.id === sc.agent_id);
	const listings = sc.listing_ids.map(id => mockProperties.find(p => p.id === id));
	const items = listings.map(item => `
		<div class="public-card">
			<div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div>
			<div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div>
			<div class="subtle">${item.specials_text || ''} ${item.bonus_text ? `· ${item.bonus_text}` : ''}</div>
			<div><a href="${item.website}" target="_blank" rel="noopener">Website</a> · ${item.address}</div>
		</div>
	`).join('');
	return `
		<div class="public-wrap">
			<div class="public-header">
				<h2>${agent.name} — Top Listings for ${lead.name}</h2>
				<div class="public-banner">${state.publicBanner}</div>
			</div>
			<div class="public-body">
				${items}
			</div>
		</div>
	`;
}

