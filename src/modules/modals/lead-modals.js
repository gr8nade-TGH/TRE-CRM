// Lead Modals Functions - EXACT COPY from script.js

import { trapFocus, announceToScreenReader, setLoadingState } from '../../utils/accessibility.js';
import { handleMissingPreferences, getSafeValue } from '../../utils/edge-case-handlers.js';

/**
 * Opens the lead details modal with editable preferences
 * @param {string} leadId - The lead's UUID
 * @param {Object} options - Options object containing state, api, mockAgents, etc.
 * @returns {Promise<void>}
 */
export async function openLeadDetailsModal(leadId, options) {
	// Validate inputs
	if (!leadId) {
		console.error('❌ openLeadDetailsModal: leadId is required');
		if (window.showToast) {
			window.showToast('Error: No lead ID provided', 'error');
		}
		return;
	}

	if (!options || !options.api) {
		console.error('❌ openLeadDetailsModal: options.api is required');
		return;
	}

	const { state, api, mockAgents, formatDate, renderAgentSelect, loadLeadNotes, showModal } = options;

	try {
		state.selectedLeadId = leadId;
		window.currentLeadForNotes = leadId;

		const lead = await api.getLead(leadId);

		if (!lead) {
			console.error('❌ Lead not found:', leadId);
			if (window.showToast) {
				window.showToast('Lead not found', 'error');
			}
			return;
		}

		const c = document.getElementById('leadDetailsContent');
		if (!c) {
			console.error('❌ leadDetailsContent element not found');
			return;
		}

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
					<label>Bedrooms <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(0-10)</span></label>
					<input type="number" id="editBedrooms" class="input" value="${prefs.bedrooms || prefs.beds || ''}" placeholder="e.g., 2" min="0" max="10" style="width: 100%;" title="Number of bedrooms (0-10)">
				</div>
				<div class="field">
					<label>Bathrooms <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(0-10)</span></label>
					<input type="number" id="editBathrooms" class="input" value="${prefs.bathrooms || prefs.baths || ''}" placeholder="e.g., 2 or 1.5" min="0" max="10" step="0.5" style="width: 100%;" title="Number of bathrooms (0-10, can use 0.5 increments)">
				</div>
				<div class="field">
					<label>Budget (Monthly Rent) <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(optional)</span></label>
					<input type="text" id="editBudget" class="input" value="${prefs.priceRange || prefs.price_range || (prefs.budget_min && prefs.budget_max ? `$${prefs.budget_min} - $${prefs.budget_max}` : '')}" placeholder="e.g., $1500 or $1200-$1800" style="width: 100%;" title="Enter a single amount or a range">
				</div>
				<div class="field">
					<label>Move-in Date <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(optional)</span></label>
					<input type="date" id="editMoveInDate" class="input" value="${prefs.moveInDate || prefs.move_in_date || prefs.move_in || ''}" style="width: 100%;" title="Desired move-in date">
				</div>
			</div>
			<div>
				<div class="field">
					<label>Area of Town <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(optional)</span></label>
					<input type="text" id="editAreaOfTown" class="input" value="${prefs.areaOfTown || prefs.area_of_town || (prefs.neighborhoods ? prefs.neighborhoods.join(', ') : '')}" placeholder="e.g., Downtown, Midtown, Stone Oak" style="width: 100%;" title="Preferred neighborhoods or areas (comma-separated)">
				</div>
				<div class="field">
					<label>Credit History <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(optional)</span></label>
					<select id="editCreditHistory" class="select" style="width: 100%;" title="Customer's credit tier">
						<option value="">Select...</option>
						<option value="Excellent" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Excellent' ? 'selected' : ''}>Excellent (720+)</option>
						<option value="Good" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Good' ? 'selected' : ''}>Good (650-719)</option>
						<option value="Fair" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Fair' ? 'selected' : ''}>Fair (580-649)</option>
						<option value="Poor" ${(prefs.creditHistory || prefs.credit_history || prefs.credit_tier) === 'Poor' ? 'selected' : ''}>Poor (&lt;580)</option>
					</select>
				</div>
				<div class="field">
					<label>Comments <span style="color: #9ca3af; font-weight: 400; font-size: 12px;">(optional)</span></label>
					<textarea id="editComments" class="input" rows="3" placeholder="Additional preferences, special requests, or notes..." style="width: 100%; resize: vertical;" title="Any additional information about customer preferences">${prefs.comments || prefs.notes || ''}</textarea>
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
				const saveFn = async () => {
					await saveLeadPreferences(leadId, lead, options);
				};

				saveBtn.addEventListener('click', saveFn);

				// Add keyboard shortcut (Ctrl+S or Cmd+S)
				const keyboardHandler = (e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === 's') {
						e.preventDefault();
						saveFn();
					}
				};

				// Add to modal content area
				const modalContent = document.getElementById('leadDetailsContent');
				if (modalContent) {
					modalContent.addEventListener('keydown', keyboardHandler);
				}

				// Also add to document for global shortcut when modal is open
				document.addEventListener('keydown', keyboardHandler);

				// Clean up on modal close
				const modal = document.getElementById('leadDetailsModal');
				if (modal) {
					const observer = new MutationObserver((mutations) => {
						mutations.forEach((mutation) => {
							if (mutation.attributeName === 'style') {
								const isHidden = modal.style.display === 'none';
								if (isHidden) {
									document.removeEventListener('keydown', keyboardHandler);
									if (modalContent) {
										modalContent.removeEventListener('keydown', keyboardHandler);
									}
								}
							}
						});
					});
					observer.observe(modal, { attributes: true });
				}
			}
		}, 100);

		// Load notes (only if not in Customer View)
		if (!isCustomerView && loadLeadNotes) {
			try {
				await loadLeadNotes(leadId);
			} catch (error) {
				console.error('❌ Error loading lead notes:', error);
				// Don't block modal from opening if notes fail to load
			}
		}

		if (showModal) {
			showModal('leadDetailsModal');

			// Add accessibility features
			const modal = document.getElementById('leadDetailsModal');
			if (modal) {
				// Add ARIA attributes
				modal.setAttribute('role', 'dialog');
				modal.setAttribute('aria-modal', 'true');
				modal.setAttribute('aria-label', isCustomerView ? 'Customer Details' : 'Lead Details');

				// Trap focus within modal
				trapFocus(modal);

				// Announce to screen readers
				announceToScreenReader(
					isCustomerView ? 'Customer details dialog opened' : 'Lead details dialog opened',
					'polite'
				);
			}
		} else {
			console.error('❌ showModal function not provided');
		}
	} catch (error) {
		console.error('❌ Error in openLeadDetailsModal:', error);
		if (window.showToast) {
			window.showToast('Failed to open lead details', 'error');
		}
	}
}

/**
 * Validates input values for lead preferences
 * @param {Object} values - Object containing all input values
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePreferences(values) {
	const errors = [];

	// Validate bedrooms (must be a positive number if provided)
	if (values.bedrooms) {
		const bedroomsNum = parseFloat(values.bedrooms);
		if (isNaN(bedroomsNum)) {
			errors.push('Bedrooms must be a valid number');
		} else if (bedroomsNum < 0) {
			errors.push('Bedrooms cannot be negative');
		} else if (bedroomsNum > 10) {
			errors.push('Bedrooms cannot exceed 10');
		} else if (!Number.isInteger(bedroomsNum)) {
			errors.push('Bedrooms must be a whole number');
		}
	}

	// Validate bathrooms (must be a positive number if provided)
	if (values.bathrooms) {
		const bathroomsNum = parseFloat(values.bathrooms);
		if (isNaN(bathroomsNum)) {
			errors.push('Bathrooms must be a valid number');
		} else if (bathroomsNum < 0) {
			errors.push('Bathrooms cannot be negative');
		} else if (bathroomsNum > 10) {
			errors.push('Bathrooms cannot exceed 10');
		} else if (bathroomsNum % 0.5 !== 0) {
			errors.push('Bathrooms must be in 0.5 increments (e.g., 1, 1.5, 2)');
		}
	}

	// Validate budget format (if provided)
	if (values.budget) {
		const budgetStr = values.budget.trim();
		// Allow formats: $1500, 1500, $1200-$1800, 1200-1800
		const budgetPattern = /^\$?\d+(\s*-\s*\$?\d+)?$/;
		if (!budgetPattern.test(budgetStr)) {
			errors.push('Budget must be a number or range (e.g., $1500 or $1200-$1800)');
		}
	}

	// Validate move-in date (must be a valid date if provided)
	if (values.moveInDate) {
		const date = new Date(values.moveInDate);
		if (isNaN(date.getTime())) {
			errors.push('Move-in date must be a valid date');
		}
		// Optional: warn if date is in the past (but don't block it)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (date < today) {
			// Just a warning, not an error
			console.warn('⚠️ Move-in date is in the past');
		}
	}

	return {
		isValid: errors.length === 0,
		errors: errors
	};
}

/**
 * Shows validation errors on input fields
 * @param {string[]} errors - Array of error messages
 */
function showValidationErrors(errors) {
	// Create or update error message container
	let errorContainer = document.getElementById('preferencesErrorContainer');
	if (!errorContainer) {
		errorContainer = document.createElement('div');
		errorContainer.id = 'preferencesErrorContainer';
		errorContainer.style.cssText = 'background: #fee; border: 1px solid #fcc; color: #c33; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;';

		// Add ARIA attributes for accessibility
		errorContainer.setAttribute('role', 'alert');
		errorContainer.setAttribute('aria-live', 'assertive');

		const content = document.getElementById('leadDetailsContent');
		if (content) {
			content.insertBefore(errorContainer, content.firstChild);
		}
	}

	errorContainer.innerHTML = `
		<strong>⚠️ Please fix the following errors:</strong>
		<ul style="margin: 8px 0 0 20px; padding: 0;">
			${errors.map(err => `<li>${err}</li>`).join('')}
		</ul>
	`;
	errorContainer.style.display = 'block';

	// Scroll to top to show errors
	const modal = document.querySelector('#leadDetailsModal .modal-body');
	if (modal) {
		modal.scrollTop = 0;
	}

	// Announce errors to screen readers
	const errorCount = errors.length;
	const errorMessage = `${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'} found. ${errors.join('. ')}`;
	announceToScreenReader(errorMessage, 'assertive');
}

/**
 * Hides validation error container
 */
function hideValidationErrors() {
	const errorContainer = document.getElementById('preferencesErrorContainer');
	if (errorContainer) {
		errorContainer.style.display = 'none';
	}
}

/**
 * Saves lead preferences to the database with validation and error handling
 * @param {string} leadId - The lead's UUID
 * @param {Object} lead - The full lead object
 * @param {Object} options - Options object containing api, state, etc.
 */
async function saveLeadPreferences(leadId, lead, options) {
	const { api, state } = options;

	// Get save button and disable it to prevent double-clicks
	const saveBtn = document.getElementById('saveLeadPreferences');
	if (!saveBtn) {
		console.error('❌ Save button not found');
		return;
	}

	// Disable button and show loading state
	const originalText = saveBtn.textContent;
	saveBtn.disabled = true;
	saveBtn.textContent = '💾 Saving...';
	saveBtn.style.opacity = '0.6';
	saveBtn.style.cursor = 'not-allowed';

	try {
		// Get values from inputs
		const bedrooms = document.getElementById('editBedrooms')?.value || '';
		const bathrooms = document.getElementById('editBathrooms')?.value || '';
		const budget = document.getElementById('editBudget')?.value || '';
		const moveInDate = document.getElementById('editMoveInDate')?.value || '';
		const areaOfTown = document.getElementById('editAreaOfTown')?.value || '';
		const creditHistory = document.getElementById('editCreditHistory')?.value || '';
		const comments = document.getElementById('editComments')?.value || '';

		// Validate inputs
		const validation = validatePreferences({
			bedrooms,
			bathrooms,
			moveInDate
		});

		if (!validation.isValid) {
			showValidationErrors(validation.errors);
			// Re-enable button
			saveBtn.disabled = false;
			saveBtn.textContent = originalText;
			saveBtn.style.opacity = '1';
			saveBtn.style.cursor = 'pointer';
			return;
		}

		// Hide any previous errors
		hideValidationErrors();

		// Parse existing preferences
		let existingPrefs = lead.preferences || lead.prefs || {};
		if (typeof existingPrefs === 'string') {
			try {
				existingPrefs = JSON.parse(existingPrefs);
			} catch (e) {
				console.warn('⚠️ Could not parse existing preferences, starting fresh');
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

		// Show success message with animation
		saveBtn.textContent = '✓ Saved!';
		saveBtn.style.background = '#10b981';
		saveBtn.style.opacity = '1';
		saveBtn.style.transform = 'scale(1.05)';
		saveBtn.style.transition = 'all 0.2s ease';

		// Show toast notification
		if (window.showToast) {
			window.showToast('Preferences saved successfully!', 'success');
		}

		// Reset button after delay
		setTimeout(() => {
			saveBtn.textContent = originalText;
			saveBtn.style.background = '';
			saveBtn.style.transform = 'scale(1)';
			saveBtn.disabled = false;
			saveBtn.style.cursor = 'pointer';
		}, 2000);

		// If in Customer View, recalculate match scores and update the display
		if (state.customerView?.isActive && state.customerView?.selectedCustomerId === leadId) {
			console.log('🔄 Customer preferences updated, recalculating match scores...');

			// Show toast about recalculation
			if (window.showToast) {
				window.showToast('Recalculating match scores...', 'info', 2000);
			}

			// Refresh missing data warning
			const CustomerView = await import('../listings/customer-view.js');
			if (CustomerView.refreshMissingDataWarning) {
				await CustomerView.refreshMissingDataWarning();
			}

			// Trigger re-render which will recalculate scores
			if (window.renderListings) {
				setTimeout(() => {
					window.renderListings();
					// Show completion toast
					if (window.showToast) {
						setTimeout(() => {
							window.showToast('Match scores updated!', 'success', 2000);
						}, 600);
					}
				}, 500);
			}
		}
	} catch (error) {
		console.error('❌ Error saving lead preferences:', error);

		// Show user-friendly error message
		showValidationErrors([
			'Failed to save preferences. Please check your connection and try again.',
			`Error details: ${error.message || 'Unknown error'}`
		]);

		// Re-enable button
		saveBtn.disabled = false;
		saveBtn.textContent = originalText;
		saveBtn.style.opacity = '1';
		saveBtn.style.cursor = 'pointer';
		saveBtn.style.background = '#ef4444'; // Red background for error

		// Reset error styling after delay
		setTimeout(() => {
			saveBtn.style.background = '';
		}, 3000);
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
		'pricing_updated': '💰',
		'email_sent': '📧',
		'property_matcher_viewed': '👀',
		'property_matcher_submitted': '✅',
		'wants_more_options': '🔄'
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

	// Property Matcher: Email sent
	if (activity.activity_type === 'email_sent' && metadata.property_count) {
		html += `<div>📧 Smart Match email sent with <strong>${metadata.property_count} properties</strong></div>`;
		if (metadata.property_matcher_token) {
			html += `<div style="font-family: monospace; font-size: 0.75rem; color: #6b7280; margin-top: 4px;">Token: ${metadata.property_matcher_token}</div>`;
		}
	}

	// Property Matcher: Session viewed
	if (activity.activity_type === 'property_matcher_viewed') {
		html += `<div>👀 Lead opened their personalized "My Matches" page</div>`;
		if (metadata.property_count) {
			html += `<div>Properties shown: <strong>${metadata.property_count}</strong></div>`;
		}
	}

	// Property Matcher: Responses submitted
	if (activity.activity_type === 'property_matcher_submitted') {
		html += `<div>✅ Lead selected <strong>${metadata.properties_selected || 0} properties</strong></div>`;
		if (metadata.tour_requests) {
			html += `<div>📅 Tour requests: <strong>${metadata.tour_requests}</strong></div>`;
		}
		if (metadata.selected_properties && metadata.selected_properties.length > 0) {
			html += `<div style="margin-top: 8px;"><strong>Selected Properties:</strong></div>`;
			html += `<ul style="margin: 4px 0; padding-left: 20px;">`;
			metadata.selected_properties.forEach(prop => {
				const tourDate = prop.tour_date ? ` (Tour: ${new Date(prop.tour_date).toLocaleDateString()})` : '';
				html += `<li>${prop.property_name || prop.property_id}${tourDate}</li>`;
			});
			html += `</ul>`;
		}
	}

	// Property Matcher: Wants more options
	if (activity.activity_type === 'wants_more_options') {
		html += `<div>🔄 Lead requested more property options</div>`;
		html += `<div style="color: #f59e0b; margin-top: 4px;">⚡ Cooldown reset - ready to send new matches</div>`;
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

