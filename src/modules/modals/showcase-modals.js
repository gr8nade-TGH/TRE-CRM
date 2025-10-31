// Showcase/Email/Matches Modals Functions - EXACT COPY from script.js

// ---- Matches Modal ----
export async function openMatches(leadId, options) {
	const { state, api, show, updateSelectionSummary } = options;

	state.selectedLeadId = leadId;
	state.selectedMatches = new Set();
	const lead = await api.getLead(leadId);
	const grid = document.getElementById('listingsGrid');
	const list = await api.getMatches(leadId, 10);
	state.currentMatches = list;

	// Update modal title and send button
	document.getElementById('leadNameTitle2').textContent = lead.name;
	document.getElementById('sendLeadName').textContent = lead.name;

	grid.innerHTML = '';
	list.forEach(item => {
		const card = document.createElement('article');
		card.className = 'listing-card';

		// Build commission badge (only show if > 0, for internal agent use only)
		const commissionBadge = item.effective_commission_pct > 0
			? `<div class="listing-badge">${item.effective_commission_pct}% Commission</div>`
			: '';

		card.innerHTML = `
			<div class="listing-image">
				<img src="${item.image_url}" alt="${item.name}" loading="lazy">
				${commissionBadge}
			</div>
			<div class="listing-content">
				<div class="listing-header">
					<h3 class="listing-name">${item.name}</h3>
					<div class="listing-rating">
						<span class="stars">★★★★☆</span>
						<span class="rating-text">4.2</span>
					</div>
				</div>
				<div class="listing-price">
					<div class="price-amount">$${item.rent_min.toLocaleString()} - $${item.rent_max.toLocaleString()}/mo</div>
					<div class="listing-specs">${item.beds_min}-${item.beds_max} bd • ${item.baths_min}-${item.baths_max} ba • ${item.sqft_min.toLocaleString()}-${item.sqft_max.toLocaleString()} sqft</div>
				</div>
				<div class="listing-features">
					<div class="feature-tag">${item.specials_text}</div>
					<div class="feature-tag secondary">${item.bonus_text}</div>
				</div>
				<div class="listing-footer">
					<label class="listing-checkbox">
						<input type="checkbox" class="listing-check" data-id="${item.id}" style="display: none;">
						<span class="checkmark"></span>
						<span class="checkbox-text">Select Property</span>
					</label>
					<div class="listing-actions">
						<button class="listing-action-btn" title="View more details">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		`;
		grid.appendChild(card);
	});
	updateSelectionSummary();
	show(document.getElementById('matchesModal'));
}

export function closeMatches(options) {
	const { hide } = options;

	hide(document.getElementById('matchesModal'));
}

// ---- Email Preview Modal ----
export async function openEmailPreview(options) {
	const { state, api, closeMatches, show } = options;

	const lead = await api.getLead(state.selectedLeadId);
	const selectedProperties = state.currentMatches.filter(prop =>
		state.selectedMatches.has(prop.id)
	);

	// Update email content
	document.getElementById('previewLeadName').textContent = lead.name;
	document.getElementById('previewAgentEmail').textContent = 'agent@trecrm.com';
	document.getElementById('agentEmail').textContent = 'agent@trecrm.com';
	document.getElementById('emailRecipient').textContent = `To: ${lead.email}`;
	document.getElementById('previewAgentName').textContent = 'Your Agent';

	// Render selected properties
	const propertiesGrid = document.getElementById('previewProperties');
	propertiesGrid.innerHTML = '';

	selectedProperties.forEach(property => {
		const card = document.createElement('div');
		card.className = 'preview-property-card';
		card.innerHTML = `
			<div class="preview-property-image">
				<img src="${property.image_url}" alt="${property.name}" loading="lazy">
			</div>
			<div class="preview-property-content">
				<div class="preview-property-name">${property.name}</div>
				<div class="preview-property-price">$${property.rent_min.toLocaleString()} - $${property.rent_max.toLocaleString()}/mo</div>
				<div class="preview-property-specs">${property.beds_min}-${property.beds_max} bd • ${property.baths_min}-${property.baths_max} ba</div>
			</div>
		`;
		propertiesGrid.appendChild(card);
	});

	// Close matches modal and open email preview
	closeMatches();
	show(document.getElementById('emailPreviewModal'));
}

export function closeEmailPreview(options) {
	const { hide } = options;

	hide(document.getElementById('emailPreviewModal'));
}

export function previewLandingPage(options) {
	const { state, toast } = options;

	// Get the selected properties from the current showcase
	const selectedProperties = Array.from(state.selectedMatches);
	const propertyIds = selectedProperties.join(',');

	// Get current agent name (in real app, this would come from user data)
	const agentName = 'John Smith'; // This would be dynamic in production

	// Create a preview URL with sample data
	const previewUrl = `landing.html?showcase=preview_${Date.now()}&lead=sample_lead&agent=${encodeURIComponent(agentName)}&properties=${propertyIds}`;

	// Open in a new tab
	window.open(previewUrl, '_blank');

	toast('Opening landing page preview in new tab...');
}

export async function sendShowcaseEmail(options) {
	const { state, api, toast, closeEmailPreview } = options;

	try {
		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop =>
			state.selectedMatches.has(prop.id)
		);

		if (selectedProperties.length === 0) {
			toast('Please select at least one property', 'error');
			return;
		}

		// Generate a unique showcase ID
		const showcaseId = `showcase_${Date.now()}`;

		// Create landing page URL with showcase data
		const propertyIds = selectedProperties.map(p => p.id).join(',');
		const agentName = 'Your Agent'; // In real app, get from current user
		const landingUrl = `${window.location.origin}/landing.html?showcase=${showcaseId}&lead=${lead.id}&agent=${encodeURIComponent(agentName)}&properties=${propertyIds}`;

		// In a real app, this would:
		// 1. Save the showcase to the database
		// 2. Send an email via backend API
		// 3. Track the email send event

		console.log('Sending showcase email:', {
			to: lead.email,
			leadName: lead.name,
			properties: selectedProperties.map(p => p.name),
			landingUrl: landingUrl
		});

		// Simulate API call to send email
		await api.logActivity({
			type: 'showcase_sent',
			lead_id: lead.id,
			agent_id: 'current-agent-id', // In real app, get from current user
			listing_ids: Array.from(state.selectedMatches),
			message: `Showcase sent to ${lead.name} with ${selectedProperties.length} properties`,
			showcase_id: showcaseId,
			landing_url: landingUrl
		});

		toast(`Showcase email sent to ${lead.name}! They can view their personalized matches at the provided link.`);
		closeEmailPreview();

	} catch (error) {
		console.error('Error sending showcase email:', error);
		toast('Error sending email. Please try again.');
	}
}

export function updateSelectionSummary(options) {
	const { state } = options;

	const checkboxes = document.querySelectorAll('.listing-check');
	const checked = Array.from(checkboxes).filter(cb => cb.checked);
	const selectedCount = document.getElementById('selectedCount');
	const sendBtn = document.getElementById('sendBtn');

	selectedCount.textContent = checked.length;
	sendBtn.disabled = checked.length === 0;

	// Update state
	state.selectedMatches.clear();
	checked.forEach(cb => state.selectedMatches.add(cb.dataset.id));
}

export function updateCreateShowcaseBtn(options) {
	const { state } = options;

	const btn = document.getElementById('createShowcase');
	btn.disabled = state.selectedMatches.size === 0;
}

// ---- Showcase ----
export async function openShowcasePreview(options) {
	const { state, api, show } = options;

	const lead = await api.getLead(state.selectedLeadId);
	document.getElementById('showcaseTo').value = lead.email;
	const selected = Array.from(state.selectedMatches);
	const preview = document.getElementById('showcasePreview');
	preview.innerHTML = selected.map(id => {
		const item = state.currentMatches.find(x => x.id === id);
		return `<div class="public-card"><div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div><div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div><div class="subtle">${item.specials_text || ''}</div></div>`;
	}).join('');
	show(document.getElementById('showcaseModal'));
}

export function closeShowcase(options) {
	const { hide } = options;

	hide(document.getElementById('showcaseModal'));
}

// ---- Build Showcase from Listings ----
export async function openBuildShowcaseModal(options) {
	const { state, mockLeads, getSelectedListings, toast, show } = options;

	const selectedListings = getSelectedListings();
	if (selectedListings.length === 0) {
		toast('Please select at least one listing', 'error');
		return;
	}

	// Populate lead dropdown with leads assigned to current agent
	const leadSelect = document.getElementById('buildShowcaseLead');
	leadSelect.innerHTML = '<option value="">Choose a lead...</option>';

	// Get leads assigned to current agent (in real app, this would filter by agent)
	const agentLeads = mockLeads.filter(lead =>
		lead.assigned_agent_id === state.agentId || state.role === 'manager'
	);

	agentLeads.forEach(lead => {
		const option = document.createElement('option');
		option.value = lead.id;
		option.textContent = `${lead.name} (${lead.email})`;
		leadSelect.appendChild(option);
	});

	// Update selection count
	document.getElementById('buildSelectedCount').textContent = selectedListings.length;

	// Populate listings grid with selected properties (same format as Top Listing Options)
	const listingsGrid = document.getElementById('buildListingsGrid');
	listingsGrid.innerHTML = selectedListings.map(prop => {
		return `
			<div class="listing-card" data-property-id="${prop.id}">
				<div class="listing-image">
					<img src="${prop.image_url || 'https://via.placeholder.com/300x200?text=Property+Image'}" alt="${prop.name}" />
					<div class="commission-badge">${Math.max(prop.escort_pct, prop.send_pct)}% Commission</div>
				</div>
				<div class="listing-content">
					<h4>${prop.name}</h4>
					<div class="listing-rating">
						<span class="stars">★★★★★</span>
						<span class="rating-number">4.2</span>
					</div>
					<p class="listing-price">$${prop.rent_min} - $${prop.rent_max}/mo</p>
					<p class="listing-details">${prop.beds_min}-${prop.beds_max} bd • ${prop.baths_min}-${prop.baths_max} ba • ${prop.sqft_min}-${prop.sqft_max} sqft</p>
					<div class="listing-amenities">
						${prop.amenities.slice(0, 2).map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
					</div>
					<div class="listing-selection">
						<span>Selected Property</span>
						<input type="checkbox" class="listing-check" checked disabled>
					</div>
				</div>
			</div>
		`;
	}).join('');

	show(document.getElementById('buildShowcaseModal'));
}

export function closeBuildShowcase(options) {
	const { hide } = options;

	hide(document.getElementById('buildShowcaseModal'));
}

export function getSelectedListings(options) {
	const { mockProperties } = options;

	// Get selected unit checkboxes
	const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
	const selectedUnitIds = Array.from(checkboxes).map(cb => cb.dataset.unitId);

	// Find properties that have selected units
	const selectedProperties = [];
	const addedPropertyIds = new Set();

	for (const unitId of selectedUnitIds) {
		// Find the property that contains this unit
		const property = mockProperties.find(prop =>
			prop.units && prop.units.some(unit => unit.id === unitId)
		);

		if (property && !addedPropertyIds.has(property.id)) {
			selectedProperties.push(property);
			addedPropertyIds.add(property.id);
		}
	}

	return selectedProperties;
}

