// Lead Modals Functions - EXACT COPY from script.js

export async function openLeadDetailsModal(leadId, options) {
	const { state, api, mockAgents, formatDate, renderAgentSelect, loadLeadNotes, showModal } = options;

	state.selectedLeadId = leadId;
	window.currentLeadForNotes = leadId;

	const lead = await api.getLead(leadId);
	const c = document.getElementById('leadDetailsContent');

	// Get agent names
	const foundBy = mockAgents.find(a => a.id === lead.found_by_agent_id)?.name || 'Unknown';
	const assignedTo = mockAgents.find(a => a.id === lead.assigned_agent_id)?.name || 'Unassigned';

	// Parse preferences (handle both JSON string and object)
	let prefs = lead.preferences || lead.prefs || {};
	if (typeof prefs === 'string') {
		try {
			prefs = JSON.parse(prefs);
		} catch (e) {
			console.error('Error parsing preferences:', e);
			prefs = {};
		}
	}

	// Determine if opened from Customer View
	const isCustomerView = state.customerView?.isActive || false;

	// Update modal title based on context
	const modalTitle = document.querySelector('#leadDetailsModal .modal-header h3');
	if (modalTitle) {
		modalTitle.textContent = isCustomerView ? '👤 Customer Details' : '👤 Lead Details';
	}

	// Hide notes section in Customer View
	const notesSection = document.getElementById('leadNotesSection');
	if (notesSection) {
		notesSection.style.display = isCustomerView ? 'none' : 'block';
	}

	c.innerHTML = `
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
			<div>
				<h4 style="margin-top: 0; color: #3b82f6;">📋 Contact Information</h4>
				<div class="field"><label>Name</label><div class="value">${lead.name || '—'}</div></div>
				<div class="field"><label>Email</label><div class="value">${lead.email || '—'}</div></div>
				<div class="field"><label>Phone</label><div class="value">${lead.phone || '—'}</div></div>
				<div class="field"><label>Best Time to Call</label><div class="value">${prefs.bestTimeToCall || prefs.best_time_to_call || '—'}</div></div>
				<div class="field"><label>Submitted</label><div class="value mono">${formatDate(lead.submitted_at || lead.created_at)}</div></div>
			</div>
			<div>
				<h4 style="margin-top: 0; color: #3b82f6;">👥 Agent Information</h4>
				<div class="field"><label>Found By Agent</label><div class="value" style="font-weight: 600; color: #10b981;">${foundBy}</div></div>
				<div class="field"><label>Currently Assigned To</label><div class="value">${state.role === 'manager' ? renderAgentSelect(lead) : assignedTo}</div></div>
				<div class="field"><label>Source</label><div class="value">${lead.source || '—'}</div></div>
			</div>
		</div>
		<hr style="margin: 20px 0;">
		<h4 style="margin-top: 0; color: #3b82f6;">🏠 Preferences</h4>
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
			<div>
				<div class="field">
					<label>Bedrooms</label>
					<input type="number" id="editBedrooms" class="input" value="${prefs.bedrooms || prefs.beds || ''}" placeholder="e.g., 2" min="0" max="10" style="width: 100%;">
				</div>
				<div class="field">
					<label>Bathrooms</label>
					<input type="number" id="editBathrooms" class="input" value="${prefs.bathrooms || prefs.baths || ''}" placeholder="e.g., 2" min="0" max="10" step="0.5" style="width: 100%;">
				</div>
				<div class="field">
					<label>Budget (Monthly Rent)</label>
					<input type="text" id="editBudget" class="input" value="${prefs.priceRange || prefs.price_range || (prefs.budget_min && prefs.budget_max ? `$${prefs.budget_min} - $${prefs.budget_max}` : '')}" placeholder="e.g., $1500 or $1200-$1800" style="width: 100%;">
				</div>
				<div class="field">
					<label>Move-in Date</label>
					<input type="date" id="editMoveInDate" class="input" value="${prefs.moveInDate || prefs.move_in_date || prefs.move_in || ''}" style="width: 100%;">
				</div>
			</div>
			<div>
				<div class="field">
					<label>Area of Town</label>
					<input type="text" id="editAreaOfTown" class="input" value="${prefs.areaOfTown || prefs.area_of_town || (prefs.neighborhoods ? prefs.neighborhoods.join(', ') : '')}" placeholder="e.g., Downtown, Midtown" style="width: 100%;">
				</div>
				<div class="field">
					<label>Credit History</label>
					<select id="editCreditHistory" class="select" style="width: 100%;">
						<option value="">Select...</option>
						<option value="Excellent" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Excellent' ? 'selected' : ''}>Excellent</option>
						<option value="Good" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Good' ? 'selected' : ''}>Good</option>
						<option value="Fair" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Fair' ? 'selected' : ''}>Fair</option>
						<option value="Poor" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Poor' ? 'selected' : ''}>Poor</option>
					</select>
				</div>
				<div class="field">
					<label>Comments</label>
					<textarea id="editComments" class="input" rows="3" placeholder="Additional preferences or notes..." style="width: 100%; resize: vertical;">${prefs.comments || prefs.notes || ''}</textarea>
				</div>
			</div>
		</div>
		<div style="margin-top: 20px; text-align: right;">
			<button id="saveLeadPreferences" class="btn btn-primary">💾 Save Preferences</button>
		</div>
	`;

	// Add save button event listener
	setTimeout(() => {
		const saveBtn = document.getElementById('saveLeadPreferences');
		if (saveBtn) {
			saveBtn.addEventListener('click', async () => {
				await saveLeadPreferences(leadId, lead, options);
			});
		}
	}, 100);

	// Load notes (only if not in Customer View)
	if (!isCustomerView) {
		await loadLeadNotes(leadId);
	}

	showModal('leadDetailsModal');
}

async function saveLeadPreferences(leadId, lead, options) {
	const { api, state } = options;

	// Get values from inputs
	const bedrooms = document.getElementById('editBedrooms')?.value || '';
	const bathrooms = document.getElementById('editBathrooms')?.value || '';
	const budget = document.getElementById('editBudget')?.value || '';
	const moveInDate = document.getElementById('editMoveInDate')?.value || '';
	const areaOfTown = document.getElementById('editAreaOfTown')?.value || '';
	const creditHistory = document.getElementById('editCreditHistory')?.value || '';
	const comments = document.getElementById('editComments')?.value || '';

	// Parse existing preferences
	let existingPrefs = lead.preferences || lead.prefs || {};
	if (typeof existingPrefs === 'string') {
		try {
			existingPrefs = JSON.parse(existingPrefs);
		} catch (e) {
			existingPrefs = {};
		}
	}

	// Update preferences object (store in multiple formats for compatibility)
	const updatedPreferences = {
		...existingPrefs,
		bedrooms: bedrooms,
		beds: bedrooms,
		bathrooms: bathrooms,
		baths: bathrooms,
		priceRange: budget,
		price_range: budget,
		budget_min: budget ? budget.replace(/\$/g, '').split('-')[0]?.trim() : '',
		budget_max: budget ? budget.replace(/\$/g, '').split('-')[1]?.trim() || budget.replace(/\$/g, '').trim() : '',
		moveInDate: moveInDate,
		move_in_date: moveInDate,
		move_in: moveInDate,
		areaOfTown: areaOfTown,
		area_of_town: areaOfTown,
		neighborhoods: areaOfTown ? areaOfTown.split(',').map(n => n.trim()) : [],
		creditHistory: creditHistory,
		credit_history: creditHistory,
		credit_tier: creditHistory,
		comments: comments,
		notes: comments
	};

	try {
		// Get current user info for activity logging
		const userEmail = window.currentUser?.email || 'unknown';
		const userName = window.currentUser?.user_metadata?.name || window.currentUser?.email || 'Unknown User';

		// Save to database using SupabaseAPI.updateLead
		const SupabaseAPI = await import('../api/supabase-api.js');
		await SupabaseAPI.updateLead(leadId, {
			preferences: updatedPreferences,
			updated_at: new Date().toISOString()
		}, userEmail, userName);

		console.log('✅ Lead preferences saved successfully');

		// Show success message
		const saveBtn = document.getElementById('saveLeadPreferences');
		if (saveBtn) {
			const originalText = saveBtn.textContent;
			saveBtn.textContent = '✓ Saved!';
			saveBtn.style.background = '#10b981';
			setTimeout(() => {
				saveBtn.textContent = originalText;
				saveBtn.style.background = '';
			}, 2000);
		}

		// If in Customer View, recalculate match scores and update the display
		if (state.customerView?.isActive && state.customerView?.selectedCustomerId === leadId) {
			console.log('🔄 Customer preferences updated, recalculating match scores...');

			// Trigger re-render which will recalculate scores
			if (window.renderListings) {
				setTimeout(() => {
					window.renderListings();
				}, 500);
			}
		}
	} catch (error) {
		console.error('❌ Error saving lead preferences:', error);
		alert('Failed to save preferences. Please try again.');
	}
}

export function closeLeadDetailsModal(options) {
	const { hideModal } = options;

	console.log('closeLeadDetailsModal called');
	hideModal('leadDetailsModal');
	window.currentLeadForNotes = null;
}

export async function openLeadNotesModal(leadId, leadName, options) {
	const { loadLeadNotesInModal, showModal } = options;

	window.currentLeadForNotes = leadId;

	// Set modal title
	document.getElementById('leadNotesTitle').textContent = `📝 Notes: ${leadName}`;

	// Load notes (standalone modal)
	await loadLeadNotesInModal(leadId, true);

	// Clear input
	document.getElementById('standaloneNewLeadNote').value = '';

	showModal('leadNotesModal');
}

export function closeLeadNotesModal(options) {
	const { hideModal } = options;

	hideModal('leadNotesModal');
	window.currentLeadForNotes = null;
}

export async function openActivityLogModal(entityId, entityType, entityName, options) {
	const { SupabaseAPI, renderActivityLog, showModal, toast } = options;

	console.log('🔵 openActivityLogModal called:', { entityId, entityType, entityName });

	try {
		// Fetch activities based on entity type
		let activities;
		if (entityType === 'lead') {
			activities = await SupabaseAPI.getLeadActivities(entityId);
		} else if (entityType === 'property') {
			activities = await SupabaseAPI.getPropertyActivities(entityId);
		} else if (entityType === 'unit') {
			activities = await SupabaseAPI.getUnitActivities(entityId);
		} else {
			throw new Error(`Unknown entity type: ${entityType}`);
		}

		console.log('✅ Activities fetched:', activities);

		// Set modal title
		let title;
		if (entityType === 'lead') {
			title = `Lead Activity Log: ${entityName}`;
		} else if (entityType === 'property') {
			title = `Property Activity Log: ${entityName}`;
		} else if (entityType === 'unit') {
			title = `Unit Activity Log: ${entityName}`;
		}
		document.getElementById('activityLogTitle').textContent = `📋 ${title}`;

		// Render activities
		const content = renderActivityLog(activities);
		document.getElementById('activityLogContent').innerHTML = content;

		showModal('activityLogModal');
	} catch (error) {
		console.error('❌ Error opening activity log:', error);
		toast('Failed to load activity log', 'error');
	}
}

export function closeActivityLogModal(options) {
	const { hideModal } = options;

	hideModal('activityLogModal');
}

export function renderActivityLog(activities, options) {
	const { getActivityIcon, formatTimeAgo, renderActivityMetadata } = options;

	if (!activities || activities.length === 0) {
		return '<p class="subtle" style="text-align: center; padding: 40px;">No activities recorded yet</p>';
	}

	return activities.map(activity => {
		const icon = getActivityIcon(activity.activity_type);
		const timeAgo = formatTimeAgo(activity.created_at);

		return `
			<div class="activity-item" style="padding: 16px; border-bottom: 1px solid #e4e7ec;">
				<div style="display: flex; align-items: start; gap: 12px;">
					<span style="font-size: 24px;">${icon}</span>
					<div style="flex: 1;">
						<div style="font-weight: 600; color: #1a202c;">${activity.description}</div>
						<div style="font-size: 0.875rem; color: #6b7280; margin-top: 4px;">
							${activity.performed_by_name || 'System'} · ${timeAgo}
						</div>
						${renderActivityMetadata(activity)}
					</div>
				</div>
			</div>
		`;
	}).join('');
}

export function getActivityIcon(activityType) {
	const icons = {
		'created': '✨',
		'assigned': '👤',
		'health_changed': '⚠️',
		'note_added': '📝',
		'updated': '✏️',
		'showcase_sent': '📧',
		'showcase_responded': '💬',
		'pumi_changed': '⭐',
		'pricing_updated': '💰'
	};
	return icons[activityType] || '📋';
}

export function renderActivityMetadata(activity) {
	if (!activity.metadata) return '';

	const metadata = activity.metadata;
	let html = '<div style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 6px; font-size: 0.875rem;">';

	// Render based on activity type
	if (activity.activity_type === 'assigned' && metadata.new_agent_name) {
		html += `<div>Assigned to: <strong>${metadata.new_agent_name}</strong></div>`;
		if (metadata.previous_agent_name) {
			html += `<div>Previously: ${metadata.previous_agent_name}</div>`;
		}
	}

	if (activity.activity_type === 'health_changed') {
		html += `<div>Status: ${metadata.previous_status} → ${metadata.new_status}</div>`;
		if (metadata.previous_score !== undefined && metadata.new_score !== undefined) {
			html += `<div>Score: ${metadata.previous_score} → ${metadata.new_score}</div>`;
		}
	}

	if (activity.activity_type === 'showcase_sent' && metadata.property_count) {
		html += `<div>${metadata.property_count} properties sent</div>`;
		if (metadata.landing_page_url) {
			html += `<div><a href="${metadata.landing_page_url}" target="_blank" style="color: #3b82f6;">View Showcase</a></div>`;
		}
	}

	if (activity.activity_type === 'updated' && metadata.fields_changed) {
		const fields = metadata.fields_changed.filter(f => f);
		if (fields.length > 0) {
			html += `<div>Fields changed: ${fields.join(', ')}</div>`;
		}
	}

	if (activity.activity_type === 'note_added' && metadata.note_preview) {
		html += `<div style="font-style: italic;">"${metadata.note_preview}${metadata.note_length > 100 ? '...' : ''}"</div>`;
	}

	html += '</div>';
	return html;
}

export function formatTimeAgo(timestamp) {
	const now = new Date();
	const then = new Date(timestamp);
	const seconds = Math.floor((now - then) / 1000);

	if (seconds < 60) return 'Just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

	return then.toLocaleDateString();
}

