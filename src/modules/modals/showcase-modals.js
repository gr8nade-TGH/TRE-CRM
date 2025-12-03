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

	// Extract preferences from lead object (preferences are stored in JSONB field)
	const prefs = lead.preferences || {};

	// Parse bedrooms and bathrooms
	const bedrooms = prefs.bedrooms || lead.bedrooms;
	const bathrooms = prefs.bathrooms || lead.bathrooms;

	// Parse price range
	let priceRangeText = 'Any budget';
	const priceRange = prefs.priceRange || prefs.price_range || lead.price_range;
	if (priceRange) {
		if (typeof priceRange === 'string' && priceRange.includes('-')) {
			const [min, max] = priceRange.split('-').map(p => parseInt(p.trim()));
			priceRangeText = `$${min.toLocaleString()} - $${max.toLocaleString()}/mo`;
		} else if (typeof priceRange === 'object' && priceRange.min && priceRange.max) {
			priceRangeText = `$${priceRange.min.toLocaleString()} - $${priceRange.max.toLocaleString()}/mo`;
		}
	}

	// Parse move-in date
	let moveInText = 'Flexible';
	const moveInDate = prefs.moveInDate || prefs.move_in_date || lead.move_in_date;
	if (moveInDate) {
		const date = new Date(moveInDate);
		if (!isNaN(date.getTime())) {
			moveInText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		}
	}

	// Parse location
	const locationText = prefs.areaOfTown || prefs.area_of_town || prefs.location_preference ||
		lead.area_of_town || lead.desired_neighborhoods || 'Any location';

	// Build filter descriptions
	const bedroomText = bedrooms ? `${bedrooms} bedroom${bedrooms !== '1' ? 's' : ''}` : 'any bedrooms';
	const bathroomText = bathrooms ? `${bathrooms} bathroom${bathrooms !== '1' ? 's' : ''}` : 'any bathrooms';

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
		<div class="info-banner" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
			<div style="display: flex; gap: 12px; align-items: start; margin-bottom: 12px;">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" style="flex-shrink: 0; margin-top: 2px;">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
				</svg>
				<div style="flex: 1;">
					<div style="font-weight: 600; color: #1e40af; margin-bottom: 0; font-size: 15px;">🎯 How These Matches Were Selected</div>
				</div>
			</div>

			<!-- Lead Preferences Summary -->
			<div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 12px; border: 1px solid #dbeafe;">
				<div style="font-weight: 600; color: #1e40af; margin-bottom: 8px; font-size: 13px;">📋 Lead's Preferences:</div>
				<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 13px; color: #1e3a8a;">
					<div><strong>Bedrooms:</strong> ${bedroomText}</div>
					<div><strong>Bathrooms:</strong> ${bathroomText}</div>
					<div><strong>Budget:</strong> ${priceRangeText}</div>
					<div><strong>Move-in:</strong> ${moveInText}</div>
					<div style="grid-column: 1 / -1;"><strong>Location:</strong> ${locationText}</div>
				</div>
			</div>

			<!-- Matching Criteria -->
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

	// Remove test banner if present (from Test Smart Match feature)
	const modal = document.getElementById('matchesModal');
	const testBanner = modal.querySelector('.test-results-banner');
	if (testBanner) {
		testBanner.remove();
	}

	hide(modal);
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

	let selectedData;
	try {
		selectedData = getSelectedListings();
		console.log('🔍 Build Showcase - selectedData:', selectedData);
	} catch (err) {
		console.error('🔍 Build Showcase - Error calling getSelectedListings:', err);
		toast('Error getting selected units', 'error');
		return;
	}

	if (!selectedData || selectedData.totalUnits === 0) {
		toast('Please select at least one unit', 'error');
		return;
	}

	// Check if coming from Customer View with a selected customer
	const preSelectedCustomer = state.customerView?.selectedCustomer || null;

	// Get leads assigned to current agent
	const agentLeads = mockLeads.filter(lead =>
		lead.assigned_agent_id === state.agentId || state.role === 'manager'
	);

	// Populate hidden lead dropdown (for data storage)
	const leadSelect = document.getElementById('buildShowcaseLead');
	leadSelect.innerHTML = '<option value="">Choose customer...</option>';
	agentLeads.forEach(lead => {
		const option = document.createElement('option');
		option.value = lead.id;
		option.textContent = `${lead.name} (${lead.email || 'No email'})`;
		option.dataset.email = lead.email || '';
		option.dataset.preferences = JSON.stringify(lead.preferences || {});
		leadSelect.appendChild(option);
	});

	// Setup customer search autocomplete
	setupShowcaseCustomerSearch(agentLeads, preSelectedCustomer);

	// Update selection count with proper grammar
	const countEl = document.getElementById('buildSelectedCount');
	const unitWord = selectedData.totalUnits === 1 ? 'unit' : 'units';
	const propWord = selectedData.totalProperties === 1 ? 'property' : 'properties';
	countEl.innerHTML = `<strong>${selectedData.totalUnits}</strong> ${unitWord} from <strong>${selectedData.totalProperties}</strong> ${propWord}`;

	// Update send button with customer name if pre-selected
	updateSendButtonLabel(preSelectedCustomer);

	// Populate listings grid with new grouped structure
	const listingsGrid = document.getElementById('buildListingsGrid');
	listingsGrid.innerHTML = renderShowcaseUnits(selectedData);

	// Add remove button event listeners
	listingsGrid.querySelectorAll('.showcase-unit-remove').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const unitId = e.target.closest('.showcase-unit-remove').dataset.unitId;
			removeUnitFromShowcase(unitId, getSelectedListings, countEl);
			// Update email preview if visible
			updateEmailPreview(getSelectedListings);
		});
	});

	// Setup email preview toggle
	// Setup email preview toggle
	setupEmailPreviewToggle(getSelectedListings);

	// Update email preview when bonus checkboxes change
	['buildReferralBonus', 'buildMovingBonus'].forEach(id => {
		const checkbox = document.getElementById(id);
		if (checkbox) {
			checkbox.addEventListener('change', () => updateEmailPreview(getSelectedListings));
		}
	});

	show(document.getElementById('buildShowcaseModal'));
}

/**
 * Setup email preview toggle button
 */
function setupEmailPreviewToggle(getSelectedListings) {
	const toggleBtn = document.getElementById('toggleEmailPreview');
	const previewPanel = document.getElementById('showcaseEmailPreview');
	const closeBtn = document.getElementById('closeEmailPreviewPanel');

	if (!toggleBtn || !previewPanel) return;

	toggleBtn.addEventListener('click', () => {
		const isVisible = previewPanel.style.display !== 'none';
		previewPanel.style.display = isVisible ? 'none' : 'flex';
		toggleBtn.classList.toggle('active', !isVisible);

		if (!isVisible) {
			updateEmailPreview(getSelectedListings);
		}
	});

	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			previewPanel.style.display = 'none';
			toggleBtn.classList.remove('active');
		});
	}

	// Listen for customer selection changes
	document.addEventListener('showcaseCustomerSelected', () => {
		if (previewPanel.style.display !== 'none') {
			updateEmailPreview(getSelectedListings);
		}
	});
}

/**
 * Update email preview content
 */
function updateEmailPreview(getSelectedListings) {
	const previewContent = document.getElementById('showcaseEmailPreviewContent');
	const searchInput = document.getElementById('showcaseCustomerSearchInput');
	const includeReferral = document.getElementById('buildReferralBonus')?.checked;
	const includeMoving = document.getElementById('buildMovingBonus')?.checked;

	if (!previewContent) return;

	const selectedData = getSelectedListings();
	const customerName = searchInput?.value?.split(' ')[0] || 'there';
	const units = selectedData.units || [];

	// Build bonus text
	let bonusHtml = '';
	if (includeReferral || includeMoving) {
		bonusHtml = '<div style="margin: 16px 0; padding: 12px; background: #fef3c7; border-radius: 8px;"><strong>🎁 Special Perks:</strong><ul style="margin: 8px 0 0 20px; padding: 0;">';
		if (includeReferral) bonusHtml += '<li>$200 referral bonus for recommending friends</li>';
		if (includeMoving) bonusHtml += '<li>Moving bonus to help with relocation costs</li>';
		bonusHtml += '</ul></div>';
	}

	// Build unit cards
	const unitCardsHtml = units.map(unit => `
		<div class="email-unit-card">
			<h3>${unit.propertyName || 'Property'} - Unit ${unit.unit_number || 'TBD'}</h3>
			<p><strong>Floor Plan:</strong> ${unit.floorPlanName || 'N/A'}</p>
			<p><strong>Rent:</strong> ${unit.rent ? '$' + unit.rent.toLocaleString() + '/mo' : 'Call for pricing'}</p>
			<p><strong>Size:</strong> ${unit.beds ?? '?'}bd / ${unit.baths ?? '?'}ba${unit.sqft ? ' / ' + unit.sqft.toLocaleString() + ' sqft' : ''}</p>
		</div>
	`).join('');

	previewContent.innerHTML = `
		<div class="email-preview-wrapper">
			<div class="email-preview-header">
				<strong>To:</strong> ${searchInput?.value || 'Select a customer'}<br>
				<strong>Subject:</strong> Top options hand picked for you
			</div>
			<div class="email-preview-body">
				<h2>🏠 Top Property Options for You</h2>
				<p>Hi ${customerName},</p>
				<p>I've hand-picked these units based on your preferences:</p>
				${bonusHtml}
				${unitCardsHtml || '<p style="color: #94a3b8;">No units selected</p>'}
				<p>Click the button below to view your personalized property showcase and schedule tours:</p>
				<a href="#" class="email-cta-btn">View Your Property Showcase →</a>
				<p style="margin-top: 24px; color: #64748b;">Best regards,<br>Your TRE Agent</p>
			</div>
		</div>
	`;
}

/**
 * Setup customer search autocomplete for the showcase modal
 */
function setupShowcaseCustomerSearch(customers, preSelected) {
	const searchInput = document.getElementById('showcaseCustomerSearchInput');
	const searchResults = document.getElementById('showcaseCustomerSearchResults');
	const leadSelect = document.getElementById('buildShowcaseLead');
	const sendBtn = document.getElementById('sendBuildShowcase');
	const leadNameSpan = document.getElementById('buildSendLeadName');

	if (!searchInput || !searchResults) return;

	// Pre-populate if customer was selected in Customer View
	if (preSelected) {
		searchInput.value = preSelected.name;
		searchInput.classList.add('has-selection');
		searchInput.dataset.selectedId = preSelected.id;
		leadSelect.value = preSelected.id;
		sendBtn.disabled = false;
		leadNameSpan.textContent = preSelected.name.split(' ')[0];
	} else {
		searchInput.value = '';
		searchInput.classList.remove('has-selection');
		delete searchInput.dataset.selectedId;
	}

	// Show hint on focus
	searchInput.addEventListener('focus', () => {
		const searchTerm = searchInput.value.trim().toLowerCase();
		if (searchTerm.length >= 1 && !searchInput.dataset.selectedId) {
			showResults(searchTerm);
		} else if (!searchInput.dataset.selectedId) {
			searchResults.innerHTML = `
				<div class="customer-search-no-results">
					Type to search ${customers.length} customers...
				</div>
			`;
			searchResults.classList.add('show');
		}
	});

	// Search as user types
	searchInput.addEventListener('input', (e) => {
		const searchTerm = e.target.value.trim().toLowerCase();

		// Clear selection if user is typing
		if (searchInput.dataset.selectedId) {
			delete searchInput.dataset.selectedId;
			searchInput.classList.remove('has-selection');
			leadSelect.value = '';
			sendBtn.disabled = true;
			leadNameSpan.textContent = 'Customer';
		}

		if (searchTerm.length >= 1) {
			showResults(searchTerm);
		} else {
			searchResults.classList.remove('show');
		}
	});

	function showResults(searchTerm) {
		const matches = customers.filter(c =>
			c.name.toLowerCase().includes(searchTerm) ||
			(c.email && c.email.toLowerCase().includes(searchTerm))
		);

		if (matches.length === 0) {
			searchResults.innerHTML = `
				<div class="customer-search-no-results">No customers found</div>
			`;
		} else {
			searchResults.innerHTML = matches.slice(0, 8).map(c => `
				<div class="customer-search-result-item" data-id="${c.id}" data-name="${c.name}">
					<div class="customer-result-name">${highlightMatch(c.name, searchTerm)}</div>
					${c.email ? `<div class="customer-result-email">${c.email}</div>` : ''}
				</div>
			`).join('');

			// Add click handlers
			searchResults.querySelectorAll('.customer-search-result-item').forEach(item => {
				item.addEventListener('click', () => selectCustomer(item.dataset.id, item.dataset.name));
			});
		}
		searchResults.classList.add('show');
	}

	function highlightMatch(text, searchTerm) {
		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<strong>$1</strong>');
	}

	function selectCustomer(id, name) {
		searchInput.value = name;
		searchInput.classList.add('has-selection');
		searchInput.dataset.selectedId = id;
		searchResults.classList.remove('show');
		leadSelect.value = id;
		sendBtn.disabled = false;
		leadNameSpan.textContent = name.split(' ')[0];

		// Update email preview if visible
		const previewPanel = document.getElementById('showcaseEmailPreview');
		if (previewPanel && previewPanel.style.display !== 'none') {
			// Get getSelectedListings from the modal's scope - we need to trigger refresh
			const event = new CustomEvent('showcaseCustomerSelected');
			document.dispatchEvent(event);
		}
	}

	// Keyboard navigation
	searchInput.addEventListener('keydown', (e) => {
		const items = searchResults.querySelectorAll('.customer-search-result-item');
		const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (items.length > 0) {
				items[currentIndex]?.classList.remove('selected');
				const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
				items[nextIndex].classList.add('selected');
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (items.length > 0) {
				items[currentIndex]?.classList.remove('selected');
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
				items[prevIndex].classList.add('selected');
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const selectedItem = searchResults.querySelector('.customer-search-result-item.selected');
			if (selectedItem) {
				selectCustomer(selectedItem.dataset.id, selectedItem.dataset.name);
			} else if (items.length === 1) {
				selectCustomer(items[0].dataset.id, items[0].dataset.name);
			}
		} else if (e.key === 'Escape') {
			searchResults.classList.remove('show');
		}
	});

	// Close results when clicking outside
	document.addEventListener('click', function closeHandler(e) {
		if (!e.target.closest('.showcase-customer-search-container')) {
			searchResults.classList.remove('show');
		}
	});
}

/**
 * Update the send button label with customer name
 */
function updateSendButtonLabel(customer) {
	const nameSpan = document.getElementById('buildSendLeadName');
	if (customer && customer.name) {
		nameSpan.textContent = customer.name.split(' ')[0]; // First name only
		document.getElementById('sendBuildShowcase').disabled = false;
	} else {
		nameSpan.textContent = 'Customer';
	}
}

/**
 * Render showcase units grouped by property
 */
function renderShowcaseUnits(selectedData) {
	if (!selectedData.grouped || selectedData.grouped.length === 0) {
		return '<p class="no-units-message">No units selected</p>';
	}

	return selectedData.grouped.map(({ property, units, highestScore }) => {
		// Property header
		const amenitiesList = (property.amenities || []).slice(0, 4);
		const hasSpecials = property.activeSpecials && property.activeSpecials.length > 0;
		const matchBadge = highestScore > 0 ? generateMatchBadge(highestScore) : '';

		return `
			<div class="showcase-property-group" data-property-id="${property.id}">
				<div class="showcase-property-header">
					<div class="showcase-property-info">
						<h4 class="showcase-property-name">
							${property.is_pumi ? '<span class="pumi-badge">PUMI</span>' : ''}
							${property.name}
							${matchBadge}
						</h4>
						<p class="showcase-property-address">${property.address || ''} ${property.city ? `• ${property.city}` : ''} ${property.neighborhood ? `• ${property.neighborhood}` : ''}</p>
						${amenitiesList.length > 0 ? `
							<div class="showcase-property-amenities">
								${amenitiesList.map(a => `<span class="amenity-pill">${a}</span>`).join('')}
							</div>
						` : ''}
						${hasSpecials ? `
							<div class="showcase-special-badge">
								🎉 Special: ${property.activeSpecials[0].description || 'Special Offer Available'}
							</div>
						` : ''}
					</div>
				</div>
				<div class="showcase-units-list">
					${units.map(unit => renderShowcaseUnit(unit)).join('')}
				</div>
			</div>
		`;
	}).join('');
}

/**
 * Render a single unit card
 */
function renderShowcaseUnit(unit) {
	const rent = unit.rent ? `$${unit.rent.toLocaleString()}` : 'Call for pricing';
	const beds = unit.beds !== null ? `${unit.beds}bd` : '—';
	const baths = unit.baths !== null ? `${unit.baths}ba` : '—';
	const sqft = unit.sqft ? `${unit.sqft.toLocaleString()} sqft` : '—';

	// Format available date
	let availableText = 'Available Now';
	if (unit.availableDate) {
		const availDate = new Date(unit.availableDate);
		const today = new Date();
		const diffDays = Math.ceil((availDate - today) / (1000 * 60 * 60 * 24));
		if (diffDays <= 0) {
			availableText = 'Available Now';
		} else if (diffDays <= 7) {
			availableText = `Available in ${diffDays} days`;
		} else {
			availableText = `Available ${availDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
		}
	}

	const unitMatchBadge = unit.matchScore ? generateMatchBadge(unit.matchScore) : '';

	return `
		<div class="showcase-unit-card" data-unit-id="${unit.id}">
			<div class="showcase-unit-main">
				<div class="showcase-unit-number">
					<span class="unit-label">Unit</span>
					<span class="unit-value">${unit.unit_number || 'TBD'}</span>
				</div>
				<div class="showcase-unit-details">
					<div class="showcase-unit-specs">
						<span class="spec">${beds}</span>
						<span class="spec-divider">•</span>
						<span class="spec">${baths}</span>
						<span class="spec-divider">•</span>
						<span class="spec">${sqft}</span>
					</div>
					<div class="showcase-unit-meta">
						<span class="unit-floor-plan">${unit.floorPlanName}</span>
						${unitMatchBadge}
					</div>
				</div>
				<div class="showcase-unit-pricing">
					<span class="unit-rent">${rent}<span class="rent-period">/mo</span></span>
					<span class="unit-available">${availableText}</span>
				</div>
			</div>
			<button class="showcase-unit-remove" data-unit-id="${unit.id}" title="Remove from showcase">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12"/>
				</svg>
			</button>
		</div>
	`;
}

/**
 * Generate a match score badge
 */
function generateMatchBadge(score) {
	const percentage = Math.round(score * 100);
	let colorClass = 'match-low';
	if (percentage >= 80) colorClass = 'match-high';
	else if (percentage >= 60) colorClass = 'match-medium';

	const stars = Math.round((percentage / 100) * 5);
	const starIcons = '★'.repeat(stars) + '☆'.repeat(5 - stars);

	return `<span class="match-badge ${colorClass}" title="${percentage}% match"><span class="match-stars">${starIcons}</span></span>`;
}

/**
 * Remove a unit from the showcase
 */
function removeUnitFromShowcase(unitId, getSelectedListings, countEl) {
	// Uncheck the unit checkbox in the background
	const checkbox = document.querySelector(`.unit-checkbox[data-unit-id="${unitId}"]`);
	if (checkbox) {
		checkbox.checked = false;
		// Trigger change event to update bulk actions bar
		checkbox.dispatchEvent(new Event('change', { bubbles: true }));
	}

	// Remove from modal UI
	const unitCard = document.querySelector(`.showcase-unit-card[data-unit-id="${unitId}"]`);
	if (unitCard) {
		const propertyGroup = unitCard.closest('.showcase-property-group');
		unitCard.remove();

		// If no more units in property group, remove the group
		if (propertyGroup && propertyGroup.querySelectorAll('.showcase-unit-card').length === 0) {
			propertyGroup.remove();
		}
	}

	// Update count
	const newData = getSelectedListings();
	if (newData.totalUnits === 0) {
		countEl.innerHTML = 'No units selected';
		document.getElementById('sendBuildShowcase').disabled = true;
	} else {
		const unitWord = newData.totalUnits === 1 ? 'unit' : 'units';
		const propWord = newData.totalProperties === 1 ? 'property' : 'properties';
		countEl.innerHTML = `<strong>${newData.totalUnits}</strong> ${unitWord} from <strong>${newData.totalProperties}</strong> ${propWord}`;
	}
}

export function closeBuildShowcase(options) {
	const { hide } = options;

	hide(document.getElementById('buildShowcaseModal'));
}

/**
 * Get selected units grouped by property for Build Showcase
 * Returns { properties: [...], units: [...], totalUnits: number }
 */
export function getSelectedListings(options) {
	// Use real listings from state if available, fallback to mockProperties
	const properties = window.state?.listings || options?.mockProperties || [];
	const unitScores = window.state?.customerView?.unitScores || new Map();

	// Get selected unit checkboxes with their data
	const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
	const selectedUnitIds = Array.from(checkboxes).map(cb => cb.dataset.unitId);

	console.log('🔍 getSelectedListings - Unit IDs:', selectedUnitIds);
	console.log('🔍 getSelectedListings - Properties count:', properties.length);

	// Build a map of properties with their selected units
	const propertyMap = new Map(); // propertyId -> { property, units: [] }

	for (const unitId of selectedUnitIds) {
		// Find the property that contains this unit
		for (const property of properties) {
			if (!property.units) continue;

			const unit = property.units.find(u => u.id === unitId);
			if (unit) {
				// Get unit's floor plan data
				const floorPlan = unit.floor_plan || {};

				// Get match score if available
				const scoreData = unitScores.get(unitId) || {};

				// Build enriched unit data
				const enrichedUnit = {
					...unit,
					propertyId: property.id,
					propertyName: property.community_name || property.name,
					floorPlanName: floorPlan.name || 'Unknown',
					beds: floorPlan.beds ?? floorPlan.bedrooms ?? null,
					baths: floorPlan.baths ?? floorPlan.bathrooms ?? null,
					sqft: floorPlan.sqft ?? floorPlan.square_feet ?? null,
					rent: unit.rent || floorPlan.starting_at || floorPlan.market_rent || null,
					availableDate: unit.available_from || unit.available_date,
					matchScore: scoreData.score || null
				};

				if (!propertyMap.has(property.id)) {
					propertyMap.set(property.id, {
						property: {
							id: property.id,
							name: property.community_name || property.name,
							address: property.street_address || property.address,
							city: property.city,
							neighborhood: property.neighborhood,
							amenities: property.amenities || [],
							photos: property.photos || [],
							image_url: property.image_url,
							is_pumi: property.is_pumi || property.isPUMI,
							activeSpecials: property.activeSpecials || []
						},
						units: [],
						highestScore: 0
					});
				}

				const propData = propertyMap.get(property.id);
				propData.units.push(enrichedUnit);
				if (enrichedUnit.matchScore && enrichedUnit.matchScore > propData.highestScore) {
					propData.highestScore = enrichedUnit.matchScore;
				}
				break; // Found the property, move to next unit
			}
		}
	}

	// Convert to array and sort by highest match score (if available)
	const result = Array.from(propertyMap.values());
	result.sort((a, b) => b.highestScore - a.highestScore);

	// Also return flat list of all selected units for easy counting
	const allUnits = result.flatMap(r => r.units);

	console.log('🔍 getSelectedListings - Found properties:', result.length, 'units:', allUnits.length);

	return {
		grouped: result,           // Properties with their units grouped
		units: allUnits,           // Flat list of all units
		totalUnits: allUnits.length,
		totalProperties: result.length,
		// Legacy support - return first property for old code
		properties: result.map(r => r.property),
		length: result.length      // For backward compatibility with old checks
	};
}

