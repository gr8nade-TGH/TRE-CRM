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
				<div class="field"><label>Currently Assigned To</label><div class="value">${state.role==='manager' ? renderAgentSelect(lead) : assignedTo}</div></div>
				<div class="field"><label>Source</label><div class="value">${lead.source || '—'}</div></div>
			</div>
		</div>
		<hr style="margin: 20px 0;">
		<h4 style="margin-top: 0; color: #3b82f6;">🏠 Preferences</h4>
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
			<div>
				<div class="field"><label>Bedrooms</label><div class="value">${prefs.bedrooms || prefs.beds || '—'}</div></div>
				<div class="field"><label>Bathrooms</label><div class="value">${prefs.bathrooms || prefs.baths || '—'}</div></div>
				<div class="field"><label>Budget</label><div class="value">${prefs.priceRange || prefs.price_range || (prefs.budget_min && prefs.budget_max ? `$${prefs.budget_min} - $${prefs.budget_max}` : '—')}</div></div>
				<div class="field"><label>Area of Town</label><div class="value">${prefs.areaOfTown || prefs.area_of_town || (prefs.neighborhoods ? prefs.neighborhoods.join(', ') : '—')}</div></div>
			</div>
			<div>
				<div class="field"><label>Move-in Date</label><div class="value">${prefs.moveInDate || prefs.move_in_date || prefs.move_in || '—'}</div></div>
				<div class="field"><label>Credit History</label><div class="value">${prefs.creditHistory || prefs.credit_history || prefs.credit_tier || '—'}</div></div>
				<div class="field"><label>Comments</label><div class="value">${prefs.comments || prefs.notes || '—'}</div></div>
			</div>
		</div>
	`;

	// Load notes
	await loadLeadNotes(leadId);

	showModal('leadDetailsModal');
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
		const activities = entityType === 'lead'
			? await SupabaseAPI.getLeadActivities(entityId)
			: await SupabaseAPI.getPropertyActivities(entityId);

		console.log('✅ Activities fetched:', activities);

		// Set modal title
		const title = entityType === 'lead' ? `Lead Activity Log: ${entityName}` : `Property Activity Log: ${entityName}`;
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

