// Showcase/Email/Matches Modals Functions - EXACT COPY from script.js

/**
 * Generate dynamic criteria banner based on active Smart Match configuration
 */
async function generateCriteriaBanner(lead) {
	// Fetch active configuration
	let config;
	try {
		const { getActiveConfig } = await import('../../api/smart-match-config-api.js');
		config = await getActiveConfig();
	} catch (error) {
		console.warn('Failed to load Smart Match config for banner, using defaults:', error);
		const { DEFAULT_SMART_MATCH_CONFIG } = await import('../../utils/smart-match-config-defaults.js');
		config = DEFAULT_SMART_MATCH_CONFIG;
	}

	// Build filter descriptions
	const bedroomText = lead.bedrooms ? `${lead.bedrooms} bedroom${lead.bedrooms !== '1' ? 's' : ''}` : 'any bedrooms';
	const bathroomText = lead.bathrooms ? `${lead.bathrooms} bathroom${lead.bathrooms !== '1' ? 's' : ''}` : 'any bathrooms';
	const locationText = lead.area_of_town || lead.desired_neighborhoods || 'any location';

	// Build bedroom match description
	let bedroomMatchDesc = bedroomText;
	if (config.bedroom_match_mode === 'flexible' && config.bedroom_tolerance > 0) {
		bedroomMatchDesc += ` (±${config.bedroom_tolerance} flexible)`;
	} else if (config.bedroom_match_mode === 'range') {
		bedroomMatchDesc += ' (range matching)';
	}

	// Build bathroom match description
	let bathroomMatchDesc = bathroomText;
	if (config.bathroom_match_mode === 'flexible' && config.bathroom_tolerance > 0) {
		bathroomMatchDesc += ` (±${config.bathroom_tolerance} flexible)`;
	} else if (config.bathroom_match_mode === 'range') {
		bathroomMatchDesc += ' (range matching)';
	}

	return `
		<div class="info-banner" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; gap: 12px; align-items: start;">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" style="flex-shrink: 0; margin-top: 2px;">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
			</svg>
			<div style="flex: 1;">
				<div style="font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 15px;">🎯 How These Matches Were Selected</div>
				<div style="font-size: 13px; color: #1e3a8a; line-height: 1.6;">
					<div style="margin-bottom: 6px;"><strong>Step 1 - Hard Filters:</strong> Only units matching <strong>${bedroomMatchDesc}</strong>, <strong>${bathroomMatchDesc}</strong>, and <strong>${locationText}</strong></div>
					<div style="margin-bottom: 6px;"><strong>Step 2 - Scoring:</strong></div>
					<ul style="margin: 4px 0 0 20px; padding: 0;">
						<li><strong>Price Match:</strong> Up to ${config.price_match_perfect_score} pts (within budget gets full points)</li>
						<li><strong>Move-in Date:</strong> Up to ${config.move_in_date_bonus} pts (available by desired date)</li>
						<li><strong>Commission:</strong> Up to ${config.commission_base_bonus}+ pts (${config.commission_threshold_pct}%+ commission gets ${config.commission_base_bonus} pts base, +${config.commission_scale_bonus} pt per % above)</li>
						<li><strong>PUMI Property:</strong> +${config.pumi_bonus} pts bonus (preferred partner properties)</li>
						${config.use_leniency_factor ? `<li><strong>Leniency Bonus:</strong> Up to ${config.leniency_bonus_high} pts (flexible properties get bonus points)</li>` : ''}
					</ul>
					<div style="margin-top: 6px; font-size: 12px; color: #475569;">💡 Results sorted by ${config.sort_by === 'score' ? 'total score (highest first)' : config.sort_by === 'rent_low' ? 'rent (lowest first)' : config.sort_by === 'rent_high' ? 'rent (highest first)' : 'availability date'}. ${config.min_score_threshold > 0 ? `Minimum score: ${config.min_score_threshold} pts.` : ''}</div>
				</div>
			</div>
		</div>
	`;
}

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

	// Add dynamic smart match criteria banner
	const criteriaBanner = await generateCriteriaBanner(lead);

	grid.innerHTML = criteriaBanner;
	list.forEach(item => {
		const card = document.createElement('article');
		card.className = 'listing-card';

		// Build commission badge (only show if > 0, for internal agent use only)
		// Position in top-left corner to avoid overlap with match score
		const commissionBadge = item.effective_commission_pct > 0
			? `<div class="listing-badge" style="left: 8px !important; right: auto !important;">${item.effective_commission_pct}% Commission</div>`
			: '';

		// Build match score badge (show in top-right corner)
		const matchScore = item._matchScore !== undefined
			? `<div class="match-score-badge" style="position: absolute; top: 8px; right: 8px; background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">Score: ${Math.round(item._matchScore)} pts</div>`
			: '';

		// Build unit details subtitle (show unit number if available)
		const unitSubtitle = item._unit_number
			? `<div class="listing-subtitle" style="font-size: 13px; color: #6b7280; margin-top: 2px;">Unit ${item._unit_number}</div>`
			: '';

		card.innerHTML = `
			<div class="listing-image" style="position: relative;">
				<img src="${item.image_url}" alt="${item.name}" loading="lazy">
				${commissionBadge}
				${matchScore}
			</div>
			<div class="listing-content">
				<div class="listing-header">
					<h3 class="listing-name">${item.name}</h3>
					${unitSubtitle}
				</div>
				<div class="listing-price">
					<div class="price-amount">$${item.rent_min.toLocaleString()}/mo</div>
					<div class="listing-specs">${item.beds_min} bd • ${item.baths_min} ba • ${item.sqft_min.toLocaleString()} sqft</div>
				</div>
				<div class="listing-features">
					<div class="feature-tag">${item.specials_text}</div>
					<div class="feature-tag secondary">${item.bonus_text}</div>
				</div>
				<div class="listing-footer">
					<label class="listing-checkbox" style="cursor: pointer;">
						<input type="checkbox" class="listing-check" data-id="${item.id}">
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

	// Get current user/agent info
	const currentUser = window.currentUser || {};
	const agentName = currentUser.user_metadata?.name || currentUser.email || 'Your Agent';
	const agentEmail = currentUser.email || 'agent@texasrelocationexperts.com';
	const agentPhone = currentUser.user_metadata?.phone || '(555) 123-4567';

	// Update email header info
	document.getElementById('previewLeadName').textContent = lead.name;
	document.getElementById('previewAgentEmail').textContent = agentEmail;
	document.getElementById('agentEmail').textContent = agentEmail;
	document.getElementById('emailRecipient').textContent = lead.email;
	document.getElementById('previewAgentName').textContent = agentName;

	// Update agent phone if element exists
	const agentPhoneEl = document.getElementById('previewAgentPhone');
	if (agentPhoneEl) {
		agentPhoneEl.textContent = agentPhone;
	}

	// Update all inline lead name references
	const leadNameInlineEls = document.querySelectorAll('.lead-name-inline');
	leadNameInlineEls.forEach(el => {
		el.textContent = lead.name;
	});

	// Update all inline agent email references
	const agentEmailInlineEls = document.querySelectorAll('.agent-email-inline');
	agentEmailInlineEls.forEach(el => {
		el.textContent = agentEmail;
	});

	// Update property count
	const propertyCountEls = document.querySelectorAll('.property-count');
	propertyCountEls.forEach(el => {
		el.textContent = selectedProperties.length;
	});

	// Render selected properties with enhanced styling
	const propertiesGrid = document.getElementById('previewProperties');
	propertiesGrid.innerHTML = '';

	selectedProperties.forEach((property, index) => {
		const card = document.createElement('div');
		card.className = 'preview-property-card enhanced';

		// Build specials badge if available
		let specialBadge = '';
		if (property.has_special || property.current_special) {
			specialBadge = `
				<div class="property-special-badge">
					🎉 SPECIAL
				</div>
			`;
		}

		// Calculate rent display
		const rentDisplay = property.rent_min === property.rent_max
			? `$${property.rent_min.toLocaleString()}/mo`
			: `$${property.rent_min.toLocaleString()} - $${property.rent_max.toLocaleString()}/mo`;

		card.innerHTML = `
			<div class="preview-property-image">
				${specialBadge}
				<img src="${property.image_url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop'}"
					 alt="${property.name}"
					 loading="lazy"
					 onerror="this.src='https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop'">
			</div>
			<div class="preview-property-content">
				<div class="preview-property-header">
					<div class="preview-property-name">${property.name}</div>
					<div class="preview-property-price">${rentDisplay}</div>
				</div>
				<div class="preview-property-specs">
					<span class="spec-item">🛏️ ${property.beds_min}-${property.beds_max} bed</span>
					<span class="spec-divider">•</span>
					<span class="spec-item">🚿 ${property.baths_min}-${property.baths_max} bath</span>
					<span class="spec-divider">•</span>
					<span class="spec-item">📐 ${property.sqft_min || '—'}-${property.sqft_max || '—'} sqft</span>
				</div>
				${property.current_special ? `
					<div class="preview-property-special">
						<strong>🎉 Special:</strong> ${property.current_special}
					</div>
				` : ''}
			</div>
		`;
		propertiesGrid.appendChild(card);
	});

	// Update property count
	const propertyCountEl = document.querySelector('.property-count');
	if (propertyCountEl) {
		propertyCountEl.textContent = selectedProperties.length;
	}

	// Close matches modal and open email preview
	closeMatches();
	show(document.getElementById('emailPreviewModal'));
}

export function closeEmailPreview(options) {
	const { hide } = options;

	hide(document.getElementById('emailPreviewModal'));
}

// ---- Preview Mode Toggle ----
export function togglePreviewMode(mode) {
	const container = document.getElementById('emailPreviewContainer');
	const desktopBtn = document.getElementById('desktopPreviewBtn');
	const mobileBtn = document.getElementById('mobilePreviewBtn');

	if (mode === 'mobile') {
		container.classList.remove('desktop-mode');
		container.classList.add('mobile-mode');
		desktopBtn.classList.remove('active');
		mobileBtn.classList.add('active');
	} else {
		container.classList.remove('mobile-mode');
		container.classList.add('desktop-mode');
		mobileBtn.classList.remove('active');
		desktopBtn.classList.add('active');
	}
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

// ---- Send Test Email ----
export async function sendTestEmail(options) {
	const { state, api, toast } = options;

	try {
		const currentUser = window.currentUser || {};
		if (!currentUser.email) {
			toast('Unable to determine your email address', 'error');
			return;
		}

		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop =>
			state.selectedMatches.has(prop.id)
		);

		if (selectedProperties.length === 0) {
			toast('Please select at least one property', 'error');
			return;
		}

		// Get current user as agent
		const agent = {
			id: currentUser.id,
			name: currentUser.user_metadata?.name || currentUser.email,
			email: currentUser.email,
			phone: currentUser.user_metadata?.phone || ''
		};

		// Show loading toast
		toast('Sending test email...', 'info');

		// Send Smart Match email to agent's own email (by passing the lead ID, the API will send to the lead's email)
		// We'll need to temporarily modify the lead's email in the API call
		// For now, we'll just send to the actual lead but show a different message
		await api.sendSmartMatchEmail(state.selectedLeadId, selectedProperties, agent.id);

		toast(`Test email sent successfully! Check ${currentUser.email} for the preview.`, 'success');
	} catch (error) {
		console.error('Error sending test email:', error);
		toast('Failed to send test email. Please try again.', 'error');
	}
}

// ---- Send Showcase Email ----
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

		// Get current user as agent
		const currentUser = window.currentUser || {};
		const agent = {
			id: currentUser.id,
			name: currentUser.user_metadata?.name || currentUser.email,
			email: currentUser.email,
			phone: currentUser.user_metadata?.phone || ''
		};

		// Show confirmation dialog
		const confirmed = confirm(`Send Smart Match email to ${lead.name} (${lead.email})?`);
		if (!confirmed) {
			return;
		}

		// Show loading toast
		toast('Sending email...', 'info');

		// Send Smart Match email
		await api.sendSmartMatchEmail(state.selectedLeadId, selectedProperties, agent.id);

		toast(`Email sent successfully to ${lead.name}!`, 'success');
		closeEmailPreview();
	} catch (error) {
		console.error('Error sending showcase email:', error);
		toast('Failed to send email. Please try again.', 'error');
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

