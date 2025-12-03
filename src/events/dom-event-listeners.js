/**
 * DOM Event Listeners Setup Module
 * Extracted from script.js to reduce file size and improve maintainability
 * Sets up all event listeners for the TRE CRM application
 *
 * This module contains ~1,300 lines of event listener setup code
 * that was previously in the DOMContentLoaded handler in script.js
 */

/**
 * Check if current user has permission to change target user's password
 * @param {Object} currentUser - The logged-in user
 * @param {string} targetUserId - The ID of the user being edited
 * @param {Array} allUsers - Array of all users (optional, will use deps.realUsers if not provided)
 * @returns {boolean} - True if current user can change target user's password
 */
function checkPasswordChangePermission(currentUser, targetUserId, allUsers = null) {
	if (!currentUser || !targetUserId) return false;

	// User can always change their own password
	if (currentUser.id === targetUserId) {
		return true;
	}

	// Get target user's role - try from provided array or global
	let targetUser = null;
	if (allUsers && Array.isArray(allUsers)) {
		targetUser = allUsers.find(u => u.id === targetUserId);
	}

	if (!targetUser) return false;

	const currentRole = currentUser.role?.toLowerCase();
	const targetRole = targetUser.role?.toLowerCase();

	// Super user can change anyone's password
	if (currentRole === 'super_user') {
		return true;
	}

	// Manager can only change agent passwords
	if (currentRole === 'manager') {
		return targetRole === 'agent';
	}

	// Agent cannot change other users' passwords
	return false;
}

export function setupAllEventListeners(deps) {
	// Destructure all dependencies from the deps object
	// This allows the function to access all necessary state and functions
	// without polluting the global scope or requiring direct imports
	const {
		// State and global variables
		state,
		realAgents,
		realUsers,
		api,
		mockClosedLeads,
		SupabaseAPI,

		// Render functions
		renderLeads,
		renderListings,
		renderAgents,
		renderDocuments,
		renderManagerDocuments,
		renderAgentDocuments,
		renderSpecials,
		renderBugs,
		renderAdmin,
		renderLeadsTable,
		renderProperties,
		renderAuditLog,

		// Drawer and modal functions
		openDrawer,
		closeDrawer,
		openAgentDrawer,
		closeAgentDrawer,
		openMatches,
		closeMatches,
		showModal,
		hideModal,
		closeLeadDetailsModal,
		closeLeadNotesModal,
		closeActivityLogModal,
		closeAgentEditModal,
		closeShowcase,
		closeHistory,
		closeEmailPreview,
		closeInterestedLeads,
		closeListingEditModal,
		openInterestedLeads,
		openPropertyNotesModal,
		closePropertyNotesModal,
		openAddListingModal,
		closeAddListingModal,
		openBuildShowcaseModal,
		openShowcasePreview,

		// CRUD operation functions
		saveNewLead,
		savePropertyContact,
		editPropertyContact,
		saveNewSpecial,
		saveEditedSpecial,
		deleteEditedSpecial,
		deleteSpecial,
		createListing,
		addPropertyNote,
		saveAgentChanges,
		saveLeadNote,
		updateUser,
		createUser,
		changeUserPassword,
		saveListingEdit,
		deleteListing,

		// Profile functions
		updateProfile,
		changePassword,
		updateNotificationPreferences,
		openProfileModal,

		// Utility functions
		sortTable,
		toast,
		formatDate,
		initPopover,
		showPopover,
		hidePopover,
		toggleLeadTable,
		updateBulkActionsBar,
		updateBuildShowcaseButton,
		populateSpecialPropertyDropdown,
		populatePropertyDropdownForContact,

		// Bulk actions functions
		bulkMarkAsUnavailable,
		bulkDeleteListings,
		updateLeadBulkActionsBar,
		bulkSendSmartMatch,

		// CSV import/export functions
		downloadCSVTemplate,
		importCSV,

		// Bug tracker functions
		submitBugReport,
		saveBugChanges,
		addBugFlags,
		handleBugFieldChange,
		showBugDetails,

		// Email dashboard functions
		showEmailPreview,
		showTemplatePreview,
		sendTestEmail,

		// Showcase functions
		sendBuildShowcase,
		confirmShowcaseSend,
		cancelShowcaseSend,
		sendShowcase,
		closeBuildShowcase,
		updateSelectionSummary,
		openEmailPreview,

		// Other functions
		previewLandingPage,
		openHistory,
		closeDocumentDetails,
		sendShowcaseEmail,
		openHistoryDocumentDetails
	} = deps;

	// search
	const leadSearchEl = document.getElementById('leadSearch');
	if (leadSearchEl) {
		leadSearchEl.addEventListener('input', (e) => {
			state.search = e.target.value;
			state.page = 1;
			renderLeads();
		});
	}

	// listing search
	const listingSearchEl = document.getElementById('listingSearch');
	if (listingSearchEl) {
		listingSearchEl.addEventListener('input', (e) => {
			state.search = e.target.value;
			renderListings();
		});
	}

	// Old sort event listener removed - now handled by table delegation

	// pagination
	const prevPageEl = document.getElementById('prevPage');
	if (prevPageEl) {
		prevPageEl.addEventListener('click', () => { if (state.page > 1) { state.page--; renderLeads(); } });
	}
	const nextPageEl = document.getElementById('nextPage');
	if (nextPageEl) {
		nextPageEl.addEventListener('click', () => { state.page++; renderLeads(); });
	}

	// table delegation
	const leadsTableEl = document.getElementById('leadsTable');
	if (leadsTableEl) {
		leadsTableEl.addEventListener('click', (e) => {
			const a = e.target.closest('a.lead-name');
			if (a) { e.preventDefault(); openDrawer(a.dataset.id); return; }
			const view = e.target.closest('button[data-view]');
			if (view) { openDrawer(view.dataset.view); return; }
			const matches = e.target.closest('button[data-matches]');
			if (matches) { openMatches(matches.dataset.matches); return; }
		});
	}

	// agents table delegation
	const agentsTableEl = document.getElementById('agentsTable');
	if (agentsTableEl) {
		agentsTableEl.addEventListener('click', (e) => {
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'agentsTable');
				e.preventDefault();
				return;
			}

			const view = e.target.closest('button[data-view-agent]');
			if (view) { openAgentDrawer(view.dataset.viewAgent); return; }

			// Handle view landing page button
			const viewLanding = e.target.closest('button[data-view-landing]');
			if (viewLanding) {
				window.open(viewLanding.dataset.viewLanding, '_blank');
				return;
			}

			// Handle copy landing page link button
			const copyLanding = e.target.closest('button[data-copy-landing]');
			if (copyLanding) {
				const url = copyLanding.dataset.copyLanding;
				navigator.clipboard.writeText(url).then(() => {
					toast('Landing page link copied to clipboard!', 'success');
				}).catch(err => {
					console.error('Failed to copy:', err);
					toast('Failed to copy link', 'error');
				});
				return;
			}

			const remove = e.target.closest('button[data-remove]');
			if (remove) {
				if (confirm('Are you sure you want to remove this agent?')) {
					toast('Agent removed (mock action)');
					renderAgents();
				}
				return;
			}

			const lock = e.target.closest('button[data-lock]');
			if (lock) {
				const agentId = lock.dataset.lock;
				const agent = realAgents.find(a => a.id === agentId);
				if (agent) {
					const action = agent.locked ? 'unlock' : 'lock';
					if (confirm(`Are you sure you want to ${action} this agent's account?`)) {
						agent.locked = !agent.locked;
						if (agent.locked) {
							agent.active = false; // Deactivate when locked
							toast('Agent account locked successfully', 'success');
						} else {
							toast('Agent account unlocked successfully', 'success');
						}
						renderAgents();
					}
				}
				return;
			}

			const assignLeads = e.target.closest('button[data-assign-leads]');
			if (assignLeads) { toast('Assign leads to agent (mock action)'); return; }
		});
	}

	// listings table delegation
	const listingsTableEl = document.getElementById('listingsTable');
	if (listingsTableEl) {
		listingsTableEl.addEventListener('click', (e) => {
			console.log('Listings table clicked, target:', e.target);
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'listingsTable');
				e.preventDefault();
				return;
			}

			// Handle interested leads clicks
			const interestedBtn = e.target.closest('.interest-count');
			if (interestedBtn) {
				const propertyId = interestedBtn.dataset.propertyId;
				const propertyName = interestedBtn.dataset.propertyName;
				console.log('Interest button clicked - propertyId:', propertyId, 'propertyName:', propertyName);
				openInterestedLeads(propertyId, propertyName);
				return;
			}
		});

		// Handle checkbox changes for bulk actions (unit checkboxes)
		listingsTableEl.addEventListener('change', (e) => {
			if (e.target.classList.contains('unit-checkbox')) {
				console.log('Unit checkbox changed');
				updateBulkActionsBar();
			}
		});
	}

	// documents table delegation
	const documentsTableEl = document.getElementById('documentsTable');
	if (documentsTableEl) {
		documentsTableEl.addEventListener('click', (e) => {
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'documentsTable');
				e.preventDefault();
				return;
			}
		});
	}

	// admin users table delegation - using document level delegation
	document.addEventListener('click', (e) => {
		// Check if click is on admin users table
		const usersTable = e.target.closest('#usersTable');
		if (usersTable) {
			console.log('Admin users table clicked, target:', e.target);
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				console.log('Sortable header clicked, column:', column);
				console.log('Current sort state before:', window.state?.sort);
				sortTable(column, 'usersTable');
				console.log('Current sort state after:', window.state?.sort);
				e.preventDefault();
				return;
			} else {
				console.log('No sortable header found');
			}
		}
	});

	// assignment change
	if (leadsTableEl) {
		leadsTableEl.addEventListener('change', async (e) => {
			const sel = e.target.closest('select[data-assign]');
			if (sel) {
				const id = sel.dataset.assign;
				await api.assignLead(id, sel.value || null);
				toast('Lead assignment updated');
				renderLeads();
			}

			// Handle lead checkbox changes for bulk send
			const leadCheckbox = e.target.closest('.lead-checkbox');
			if (leadCheckbox) {
				console.log('Lead checkbox changed');
				updateLeadBulkActionsBar();
			}

			// Handle select all checkbox
			const selectAllCheckbox = e.target.closest('#selectAllLeads');
			if (selectAllCheckbox) {
				console.log('Select all leads checkbox changed');
				const isChecked = selectAllCheckbox.checked;
				document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
					checkbox.checked = isChecked;
				});
				updateLeadBulkActionsBar();
			}
		});
	}

	// Lead details modal close buttons
	const closeLeadDetailsEl = document.getElementById('closeLeadDetails');
	if (closeLeadDetailsEl) {
		closeLeadDetailsEl.addEventListener('click', closeLeadDetailsModal);
	}
	const closeLeadDetailsFooterEl = document.getElementById('closeLeadDetailsFooter');
	if (closeLeadDetailsFooterEl) {
		closeLeadDetailsFooterEl.addEventListener('click', closeLeadDetailsModal);
	}

	// Lead notes modal buttons
	const closeLeadNotesEl = document.getElementById('closeLeadNotes');
	if (closeLeadNotesEl) {
		closeLeadNotesEl.addEventListener('click', closeLeadNotesModal);
	}
	const cancelLeadNotesEl = document.getElementById('cancelLeadNotes');
	if (cancelLeadNotesEl) {
		cancelLeadNotesEl.addEventListener('click', closeLeadNotesModal);
	}

	// Activity log modal buttons
	const closeActivityLogEl = document.getElementById('closeActivityLog');
	if (closeActivityLogEl) {
		closeActivityLogEl.addEventListener('click', closeActivityLogModal);
	}
	const closeActivityLogBtnEl = document.getElementById('closeActivityLogBtn');
	if (closeActivityLogBtnEl) {
		closeActivityLogBtnEl.addEventListener('click', closeActivityLogModal);
	}

	// Lead Details Modal save button (embedded notes)
	const saveLeadNoteBtnEl = document.getElementById('saveLeadNoteBtn');
	if (saveLeadNoteBtnEl) {
		console.log('✅ Attaching click listener to saveLeadNoteBtn (embedded)');
		saveLeadNoteBtnEl.addEventListener('click', () => {
			console.log('🟢 saveLeadNoteBtn clicked (embedded)!');
			saveLeadNote(false);  // Not standalone
		});
	} else {
		console.log('❌ saveLeadNoteBtn not found');
	}

	// Standalone Lead Notes Modal save button
	const standaloneSaveLeadNoteBtnEl = document.getElementById('standaloneSaveLeadNoteBtn');
	if (standaloneSaveLeadNoteBtnEl) {
		console.log('✅ Attaching click listener to standaloneSaveLeadNoteBtn');
		standaloneSaveLeadNoteBtnEl.addEventListener('click', () => {
			console.log('🟢 standaloneSaveLeadNoteBtn clicked!');
			saveLeadNote(true);  // Standalone
		});
	} else {
		console.log('❌ standaloneSaveLeadNoteBtn not found');
	}

	// Close modals on escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			const leadModal = document.getElementById('leadDetailsModal');
			const agentDrawer = document.getElementById('agentDrawer');
			if (leadModal && !leadModal.classList.contains('hidden')) {
				closeLeadDetailsModal();
			}
			if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
				closeAgentDrawer();
			}
		}
	});

	// Close drawer when clicking outside
	document.addEventListener('click', (e) => {
		const leadDrawer = document.getElementById('leadDrawer');
		const agentDrawer = document.getElementById('agentDrawer');

		// Close lead drawer if clicking outside
		if (leadDrawer && !leadDrawer.classList.contains('hidden')) {
			if (!leadDrawer.contains(e.target) && !e.target.closest('[data-view]')) {
				closeDrawer();
			}
		}

		// Close agent drawer if clicking outside
		if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
			if (!agentDrawer.contains(e.target) && !e.target.closest('[data-view-agent]')) {
				closeAgentDrawer();
			}
		}
	});
	const closeAgentDrawerEl = document.getElementById('closeAgentDrawer');
	if (closeAgentDrawerEl) {
		closeAgentDrawerEl.addEventListener('click', closeAgentDrawer);
	}

	// Agent edit modal event listeners
	const closeAgentEditEl = document.getElementById('closeAgentEdit');
	if (closeAgentEditEl) {
		closeAgentEditEl.addEventListener('click', closeAgentEditModal);
	}
	const closeAgentEditFooterEl = document.getElementById('closeAgentEditFooter');
	if (closeAgentEditFooterEl) {
		closeAgentEditFooterEl.addEventListener('click', closeAgentEditModal);
	}
	const saveAgentBtnEl = document.getElementById('saveAgentBtn');
	if (saveAgentBtnEl) {
		saveAgentBtnEl.addEventListener('click', saveAgentChanges);
	}
	// Lead details modal internal assignment
	const leadDetailsModalEl = document.getElementById('leadDetailsModal');
	if (leadDetailsModalEl) {
		leadDetailsModalEl.addEventListener('change', async (e) => {
			const sel = e.target.closest('select[data-assign]');
			if (sel) {
				await api.assignLead(state.selectedLeadId, sel.value || null);
				toast('Lead assignment updated');
				renderLeads();
			}
		});
	}

	// matches modal events
	const closeMatchesEl = document.getElementById('closeMatches');
	if (closeMatchesEl) {
		closeMatchesEl.addEventListener('click', closeMatches);
	}
	const listingsGridEl = document.getElementById('listingsGrid');
	if (listingsGridEl) {
		listingsGridEl.addEventListener('change', (e) => {
			const box = e.target.closest('input[type="checkbox"].listing-check');
			if (box) {
				updateSelectionSummary();
			}
		});
	}
	const sendBtnEl = document.getElementById('sendBtn');
	if (sendBtnEl) {
		sendBtnEl.addEventListener('click', async () => {
			const selected = Array.from(state.selectedMatches);
			if (selected.length > 0) {
				await openEmailPreview();
			}
		});
	}
	const createShowcaseEl = document.getElementById('createShowcase');
	if (createShowcaseEl) {
		createShowcaseEl.addEventListener('click', openShowcasePreview);
	}

	// showcase modal
	const closeShowcaseEl = document.getElementById('closeShowcase');
	if (closeShowcaseEl) {
		closeShowcaseEl.addEventListener('click', closeShowcase);
	}
	const sendShowcaseEl = document.getElementById('sendShowcase');
	if (sendShowcaseEl) {
		sendShowcaseEl.addEventListener('click', sendShowcase);
	}

	// Build showcase from listings
	const buildShowcaseBtn = document.getElementById('buildShowcaseBtn');
	if (buildShowcaseBtn) {
		buildShowcaseBtn.addEventListener('click', openBuildShowcaseModal);
	}

	const closeBuildShowcaseEl = document.getElementById('closeBuildShowcase');
	if (closeBuildShowcaseEl) {
		closeBuildShowcaseEl.addEventListener('click', closeBuildShowcase);
	}

	const sendBuildShowcaseEl = document.getElementById('sendBuildShowcase');
	if (sendBuildShowcaseEl) {
		sendBuildShowcaseEl.addEventListener('click', sendBuildShowcase);
	}

	// Showcase send confirmation modal handlers
	const confirmShowcaseSendEl = document.getElementById('confirmShowcaseSend');
	if (confirmShowcaseSendEl) {
		confirmShowcaseSendEl.addEventListener('click', confirmShowcaseSend);
	}

	const cancelShowcaseSendEl = document.getElementById('cancelShowcaseSend');
	if (cancelShowcaseSendEl) {
		cancelShowcaseSendEl.addEventListener('click', cancelShowcaseSend);
	}

	const closeShowcaseSendConfirmEl = document.getElementById('closeShowcaseSendConfirm');
	if (closeShowcaseSendConfirmEl) {
		closeShowcaseSendConfirmEl.addEventListener('click', cancelShowcaseSend);
	}

	// Showcase success modal handlers
	const closeShowcaseSuccessEl = document.getElementById('closeShowcaseSuccess');
	if (closeShowcaseSuccessEl) {
		closeShowcaseSuccessEl.addEventListener('click', () => {
			hide(document.getElementById('showcaseSuccessModal'));
		});
	}

	// Lead selection dropdown for build showcase
	const buildShowcaseLeadEl = document.getElementById('buildShowcaseLead');
	if (buildShowcaseLeadEl) {
		buildShowcaseLeadEl.addEventListener('change', (e) => {
			const leadId = e.target.value;
			const leadNameEl = document.getElementById('buildSendLeadName');
			const sendBtn = document.getElementById('sendBuildShowcase');

			if (leadId) {
				const leads = state.leads || [];
				const lead = leads.find(l => l.id === leadId);
				if (lead) {
					// Show first name only for cleaner UI
					const firstName = lead.name.split(' ')[0];
					leadNameEl.textContent = firstName;
					// Enable button since properties are already selected
					sendBtn.disabled = false;
				}
			} else {
				leadNameEl.textContent = 'Customer';
				sendBtn.disabled = true;
			}
		});
	}

	// Individual unit checkboxes (for Build Showcase button)
	document.addEventListener('change', (e) => {
		if (e.target.classList.contains('unit-checkbox')) {
			updateBuildShowcaseButton();
		}
	});
	const copyShowcaseLinkEl = document.getElementById('copyShowcaseLink');
	if (copyShowcaseLinkEl) {
		copyShowcaseLinkEl.addEventListener('click', () => {
			// just re-open prompt with last created showcase if exists
			const last = Object.values(state.showcases).slice(-1)[0];
			if (!last) return;
			const url = `${location.origin}${location.pathname}#/${last.public_slug}`;
			window.prompt('Copy public link:', url);
		});
	}

	// Add Agent button - Opens user modal with role pre-filled to "agent"
	const addAgentBtnEl = document.getElementById('addAgentBtn');
	if (addAgentBtnEl) {
		addAgentBtnEl.addEventListener('click', () => {
			// Set modal title
			document.getElementById('userModalTitle').textContent = 'Add Agent';

			// Reset form
			document.getElementById('userForm').reset();

			// Pre-fill role to "agent" and make it read-only
			const roleSelect = document.getElementById('userRole');
			roleSelect.value = 'agent';
			roleSelect.disabled = true;

			// Mark the modal as being opened from Agents page
			document.getElementById('userModal').setAttribute('data-from-agents-page', 'true');

			// Password is required for new users
			document.getElementById('userPassword').required = true;
			document.getElementById('userConfirmPassword').required = true;

			// Show agent profile fields
			document.getElementById('agentProfileFields').style.display = 'block';

			// Reset headshot preview
			const headshotPreview = document.getElementById('headshotPreview');
			headshotPreview.innerHTML = '<span style="font-size: 32px; color: #9ca3af;">👤</span>';
			document.getElementById('userHeadshotUrl').value = '';

			// Reset bio character count
			document.getElementById('bioCharCount').textContent = '0';

			// Show the modal
			showModal('userModal');
		});
	}

	// User role change - show/hide agent profile fields
	const userRoleSelect = document.getElementById('userRole');
	if (userRoleSelect) {
		userRoleSelect.addEventListener('change', (e) => {
			const agentProfileFields = document.getElementById('agentProfileFields');
			if (e.target.value === 'agent') {
				agentProfileFields.style.display = 'block';
			} else {
				agentProfileFields.style.display = 'none';
			}
		});
	}

	// Bio character counter
	const userBioTextarea = document.getElementById('userBio');
	if (userBioTextarea) {
		userBioTextarea.addEventListener('input', (e) => {
			const charCount = e.target.value.length;
			document.getElementById('bioCharCount').textContent = charCount;
		});
	}

	// Headshot image preview
	const userHeadshotInput = document.getElementById('userHeadshot');
	if (userHeadshotInput) {
		userHeadshotInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (file) {
				// Validate file size (max 2MB)
				if (file.size > 2 * 1024 * 1024) {
					toast('Image file size must be less than 2MB', 'error');
					e.target.value = '';
					return;
				}

				// Validate file type
				const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
				if (!validTypes.includes(file.type)) {
					toast('Please upload a JPG, PNG, or WebP image', 'error');
					e.target.value = '';
					return;
				}

				// Show preview
				const reader = new FileReader();
				reader.onload = (event) => {
					const headshotPreview = document.getElementById('headshotPreview');
					headshotPreview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover;" alt="Headshot preview">`;
				};
				reader.readAsDataURL(file);
			}
		});
	}

	// Documents page event listeners
	if (documentsTableEl) {
		documentsTableEl.addEventListener('click', (e) => {
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'documentsTable');
				e.preventDefault();
				return;
			}
		});
	}

	// Admin page functions will be moved outside IIFE

	// ---- Events ----

	// Documents search functionality
	const documentsSearch = document.getElementById('documentsSearch');
	const clearDocumentsSearch = document.getElementById('clearDocumentsSearch');

	if (documentsSearch) {
		// Search input event
		documentsSearch.addEventListener('input', (e) => {
			state.documentsSearch = e.target.value;
			// Re-render the documents view based on role
			if (state.role === 'agent') {
				renderAgentDocuments();
			} else {
				renderManagerDocuments();
			}
		});
	}

	// Quick action buttons (event delegation)
	document.addEventListener('click', (e) => {
		const quickActionBtn = e.target.closest('.quick-action-btn');
		if (quickActionBtn) {
			e.stopPropagation(); // Prevent expanding the lead card
			const action = quickActionBtn.dataset.action;
			const leadId = quickActionBtn.dataset.leadId;

			// Find the lead data
			const leads = state.leads || [];
			const lead = leads.find(l => l.id === leadId);

			if (!lead) {
				console.warn('Lead not found for quick action:', leadId);
				return;
			}

			switch (action) {
				case 'call':
					if (lead.phone) {
						window.location.href = `tel:${lead.phone}`;
					} else {
						toast('No phone number available for this lead');
					}
					break;

				case 'email':
					if (lead.email) {
						window.location.href = `mailto:${lead.email}`;
					} else {
						toast('No email address available for this lead');
					}
					break;

				case 'sms':
					if (lead.phone) {
						window.location.href = `sms:${lead.phone}`;
					} else {
						toast('No phone number available for this lead');
					}
					break;
			}
		}
	});

	if (clearDocumentsSearch) {
		// Clear search event
		clearDocumentsSearch.addEventListener('click', () => {
			if (documentsSearch) {
				documentsSearch.value = '';
			}
			state.documentsSearch = '';
			// Re-render the documents view based on role
			if (state.role === 'agent') {
				renderAgentDocuments();
			} else {
				renderManagerDocuments();
			}
		});
	}

	// Admin page functionality
	const addUserBtn = document.getElementById('addUserBtn');
	const userModal = document.getElementById('userModal');
	const closeUserModal = document.getElementById('closeUserModal');
	const saveUserBtn = document.getElementById('saveUserBtn');
	const cancelUserBtn = document.getElementById('cancelUserBtn');
	const passwordModal = document.getElementById('passwordModal');
	const closePasswordModal = document.getElementById('closePasswordModal');
	const savePasswordBtn = document.getElementById('savePasswordBtn');
	const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
	const auditFilter = document.getElementById('auditFilter');

	// Add User button
	if (addUserBtn) {
		addUserBtn.addEventListener('click', () => {
			document.getElementById('userModalTitle').textContent = 'Add User';
			document.getElementById('userForm').reset();
			document.getElementById('userPassword').required = true;
			document.getElementById('userConfirmPassword').required = true;
			showModal('userModal');
		});
	}

	// User modal close buttons
	if (closeUserModal) {
		closeUserModal.addEventListener('click', () => hideModal('userModal'));
	}
	if (cancelUserBtn) {
		cancelUserBtn.addEventListener('click', () => hideModal('userModal'));
	}

	// Save User button
	if (saveUserBtn) {
		saveUserBtn.addEventListener('click', async () => {
			console.log('💾 Save User button clicked');

			const form = document.getElementById('userForm');
			const formData = new FormData(form);

			const userData = {
				name: document.getElementById('userName').value,
				email: document.getElementById('userEmail').value,
				role: document.getElementById('userRole').value,
				password: document.getElementById('userPassword').value,
				confirmPassword: document.getElementById('userConfirmPassword').value
			};

			console.log('User data collected:', { ...userData, password: '***', confirmPassword: '***' });

			const userId = document.getElementById('userModal').getAttribute('data-user-id');
			const isEditing = !!userId;

			// Basic validation
			if (!userData.name || !userData.email || !userData.role) {
				console.log('❌ Validation failed: missing required fields');
				toast('Please fill in all required fields', 'error');
				return;
			}

			// Password validation: required for new users, optional for editing
			if (!isEditing) {
				// Creating new user - password is required
				if (!userData.password) {
					console.log('❌ Validation failed: password required for new user');
					toast('Password is required', 'error');
					return;
				}

				if (userData.password !== userData.confirmPassword) {
					console.log('❌ Validation failed: passwords do not match');
					toast('Passwords do not match', 'error');
					return;
				}
			} else {
				// Editing existing user - password is optional
				// Only validate if password was entered
				if (userData.password || userData.confirmPassword) {
					if (userData.password !== userData.confirmPassword) {
						console.log('❌ Validation failed: passwords do not match');
						toast('Passwords do not match', 'error');
						return;
					}
				}
			}

			console.log('✅ Validation passed');

			try {
				// Handle headshot upload if user is an agent and file is selected
				let headshotUrl = document.getElementById('userHeadshotUrl').value || null;
				const headshotFile = document.getElementById('userHeadshot').files[0];

				if (userData.role === 'agent' && headshotFile) {
					toast('Uploading headshot...', 'info');

					try {
						// Upload to Supabase Storage
						const fileExt = headshotFile.name.split('.').pop();
						const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
						const filePath = `agent-headshots/${fileName}`;

						const { data: uploadData, error: uploadError } = await window.supabase.storage
							.from('agent-assets')
							.upload(filePath, headshotFile, {
								cacheControl: '3600',
								upsert: false
							});

						if (uploadError) {
							console.error('❌ Error uploading headshot:', uploadError);
							toast('Failed to upload headshot. Continuing without image.', 'warning');
						} else {
							// Get public URL
							const { data: urlData } = window.supabase.storage
								.from('agent-assets')
								.getPublicUrl(filePath);

							headshotUrl = urlData.publicUrl;
							console.log('✅ Headshot uploaded:', headshotUrl);
						}
					} catch (uploadErr) {
						console.error('❌ Error uploading headshot:', uploadErr);
						toast('Failed to upload headshot. Continuing without image.', 'warning');
					}
				}

				// Use Supabase to create/update users
				if (isEditing) {
					console.log('Updating existing user:', userId);

					// Check if user is updating their own password
					const currentUserId = window.currentUser?.id;
					const isUpdatingOwnAccount = (userId === currentUserId);

					// Update existing user
					const updateData = {
						name: userData.name,
						email: userData.email,
						role: userData.role
					};

					// Add agent profile fields if role is agent
					if (userData.role === 'agent') {
						updateData.headshot_url = headshotUrl;
						updateData.bio = document.getElementById('userBio').value || null;
						updateData.facebook_url = document.getElementById('userFacebook').value || null;
						updateData.instagram_url = document.getElementById('userInstagram').value || null;
						updateData.x_url = document.getElementById('userX').value || null;
					}

					// Only include password if it was provided AND user has permission
					if (userData.password) {
						// Check password change permission
						const allUsers = realUsers.value || realUsers;
						const canChangePassword = checkPasswordChangePermission(window.currentUser, userId, allUsers);

						if (!canChangePassword) {
							console.log('❌ Permission denied: User cannot change this password');
							toast('You do not have permission to change this user\'s password', 'error');
							return;
						}

						updateData.password = userData.password;
					}

					const result = await updateUser(userId, updateData);

					// If user changed their own password, log them out
					if (isUpdatingOwnAccount && result.passwordChanged) {
						console.log('🔐 User changed their own password - logging out...');
						hideModal('userModal');
						document.getElementById('userModal').removeAttribute('data-user-id');

						toast('Password updated successfully! Please log in with your new password.', 'success');

						// Wait a moment for the toast to be visible
						await new Promise(resolve => setTimeout(resolve, 1500));

						// Clear session and show login
						window.currentUser = null;
						document.getElementById('loginPortal').style.display = 'flex';
						document.getElementById('mainAppContent').style.display = 'none';

						// Clear login form
						document.getElementById('loginEmail').value = '';
						document.getElementById('loginPassword').value = '';

						return; // Exit early
					}

					toast('User updated successfully');
				} else {
					console.log('Creating new user...');

					// Prepare user data
					const newUserData = {
						name: userData.name,
						email: userData.email,
						role: userData.role,
						password: userData.password
					};

					// Add agent profile fields if role is agent
					if (userData.role === 'agent') {
						newUserData.headshot_url = headshotUrl;
						newUserData.bio = document.getElementById('userBio').value || null;
						newUserData.facebook_url = document.getElementById('userFacebook').value || null;
						newUserData.instagram_url = document.getElementById('userInstagram').value || null;
						newUserData.x_url = document.getElementById('userX').value || null;
					}

					// Create new user
					await createUser(newUserData);

					// Check if modal was opened from Agents page
					const fromAgentsPage = document.getElementById('userModal').getAttribute('data-from-agents-page');

					if (fromAgentsPage === 'true') {
						toast('Agent created successfully! They can now log in.');

						// Reload agents data from Supabase
						console.log('🔄 Reloading agents after creating new agent...');
						try {
							const agents = await SupabaseAPI.getAgents();
							// Update realAgents array
							realAgents.splice(0, realAgents.length, ...agents);
							// Re-render agents table
							await renderAgents();
							console.log('✅ Agents table refreshed');
						} catch (error) {
							console.error('❌ Error reloading agents:', error);
							toast('Agent created but failed to refresh table. Please refresh the page.', 'warning');
						}
					} else {
						toast('User created successfully! They can now log in.');
					}
				}

				hideModal('userModal');
				document.getElementById('userModal').removeAttribute('data-user-id');

			} catch (error) {
				console.error('❌ Error saving user:', error);
				toast('Error saving user: ' + error.message, 'error');
			}
		});
	}

	// Password modal close buttons
	if (closePasswordModal) {
		closePasswordModal.addEventListener('click', () => hideModal('passwordModal'));
	}
	if (cancelPasswordBtn) {
		cancelPasswordBtn.addEventListener('click', () => hideModal('passwordModal'));
	}

	// Save Password button
	if (savePasswordBtn) {
		savePasswordBtn.addEventListener('click', async () => {
			const userId = document.getElementById('passwordModal').getAttribute('data-user-id');
			const newPassword = document.getElementById('newPassword').value;
			const confirmPassword = document.getElementById('confirmNewPassword').value;

			if (!newPassword || !confirmPassword) {
				toast('Please fill in both password fields', 'error');
				return;
			}

			if (newPassword !== confirmPassword) {
				toast('Passwords do not match', 'error');
				return;
			}

			try {
				if (realUsers.length > 0) {
					// Use real API
					await changeUserPassword(userId, newPassword);
					toast('Password updated successfully');
				} else {
					// Note: Mock data fallback removed - using real Supabase users only
					console.log('Password change not implemented for mock users');
					toast('Password change only available for real users', 'error');
				}

				hideModal('passwordModal');
				document.getElementById('newPassword').value = '';
				document.getElementById('confirmNewPassword').value = '';

			} catch (error) {
				console.error('Error changing password:', error);
				toast('Error changing password: ' + error.message, 'error');
			}
		});
	}

	// Audit filter
	if (auditFilter) {
		auditFilter.addEventListener('change', (e) => {
			const filter = e.target.value;
			// In a real app, this would filter the audit log
			renderAuditLog(); // For now, just re-render
		});
	}

	// Manage button - toggle dropdown menu
	const manageBtn = document.getElementById('manageBtn');
	const manageDropdown = document.getElementById('manageDropdown');

	if (manageBtn && manageDropdown) {
		manageBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			manageDropdown.classList.toggle('hidden');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.manage-dropdown-container')) {
				manageDropdown.classList.add('hidden');
			}
		});

		// Handle dropdown item clicks
		manageDropdown.addEventListener('click', (e) => {
			const item = e.target.closest('.manage-dropdown-item');
			if (item) {
				e.preventDefault();
				const action = item.dataset.action;

				if (action === 'smart-match-config') {
					window.location.hash = '#/manage';
				} else if (action === 'map-settings') {
					// Future: Navigate to map settings page
					toast('Map Settings coming soon!', 'info');
				}

				manageDropdown.classList.add('hidden');
			}
		});
	}

	// Profile button and modal
	const profileBtn = document.getElementById('profileBtn');
	const profileModal = document.getElementById('profileModal');
	const closeProfileModal = document.getElementById('closeProfileModal');
	const saveProfileBtn = document.getElementById('saveProfileBtn');
	const cancelProfileBtn = document.getElementById('cancelProfileBtn');

	// Profile button - open modal
	if (profileBtn) {
		profileBtn.addEventListener('click', () => {
			openProfileModal({ showModal });
		});
	}

	// Profile modal close buttons
	if (closeProfileModal) {
		closeProfileModal.addEventListener('click', () => hideModal('profileModal'));
	}
	if (cancelProfileBtn) {
		cancelProfileBtn.addEventListener('click', () => hideModal('profileModal'));
	}

	// Save Profile button
	if (saveProfileBtn) {
		saveProfileBtn.addEventListener('click', async () => {
			try {
				// Update display name
				await updateProfile({ toast });

				// Update notification preferences
				await updateNotificationPreferences({ toast });

				// Update password if provided (this must be last as it will sign out the user)
				const newPassword = document.getElementById('profileNewPassword').value;
				if (newPassword) {
					const passwordChanged = await changePassword({ toast });
					// If password was changed, the changePassword function will handle sign out
					// Don't close modal or do anything else - user will be redirected to login
					if (passwordChanged) {
						return;
					}
				}

				// Close modal (only if password wasn't changed)
				hideModal('profileModal');

			} catch (error) {
				console.error('Error saving profile:', error);
				toast('Error saving profile: ' + error.message, 'error');
			}
		});
	}

	// Add Lead functionality
	const addLeadBtn = document.getElementById('addLeadBtn');
	const addLeadModal = document.getElementById('addLeadModal');
	const closeAddLeadModal = document.getElementById('closeAddLeadModal');
	const saveAddLeadBtn = document.getElementById('saveAddLeadBtn');
	const cancelAddLeadBtn = document.getElementById('cancelAddLeadBtn');

	// Add Lead button
	if (addLeadBtn) {
		addLeadBtn.addEventListener('click', () => {
			showModal('addLeadModal');
			document.getElementById('addLeadForm').reset();
		});
	}

	// Close Add Lead modal
	if (closeAddLeadModal) {
		closeAddLeadModal.addEventListener('click', () => {
			hideModal('addLeadModal');
		});
	}

	// Cancel Add Lead
	if (cancelAddLeadBtn) {
		cancelAddLeadBtn.addEventListener('click', () => {
			hideModal('addLeadModal');
		});
	}

	// Save Add Lead
	if (saveAddLeadBtn) {
		saveAddLeadBtn.addEventListener('click', () => {
			saveNewLead();
		});
	}

	// Property Contact event listeners
	const addPropertyBtn = document.getElementById('addPropertyBtn');
	const addPropertyContactBtn = document.getElementById('addPropertyContactBtn');
	const closeAddPropertyContactModal = document.getElementById('closeAddPropertyContactModal');
	const savePropertyContactBtn = document.getElementById('savePropertyContactBtn');
	const cancelPropertyContactBtn = document.getElementById('cancelPropertyContactBtn');

	// Add New Property button (on Properties page)
	if (addPropertyBtn) {
		addPropertyBtn.addEventListener('click', () => {
			openAddListingModal();
		});
	}

	// Add Property Contact button
	if (addPropertyContactBtn) {
		addPropertyContactBtn.addEventListener('click', async () => {
			showModal('addPropertyContactModal');
			document.getElementById('addPropertyContactForm').reset();
			// Populate property dropdown
			await populatePropertyDropdownForContact();
		});
	}

	// Close Property Contact Modal
	if (closeAddPropertyContactModal) {
		closeAddPropertyContactModal.addEventListener('click', () => {
			hideModal('addPropertyContactModal');
		});
	}

	// Cancel Add Property Contact
	if (cancelPropertyContactBtn) {
		cancelPropertyContactBtn.addEventListener('click', () => {
			hideModal('addPropertyContactModal');
		});
	}

	// Save Property Contact
	if (savePropertyContactBtn) {
		savePropertyContactBtn.addEventListener('click', () => {
			savePropertyContact();
		});
	}

	// Property Contacts table delegation (for edit buttons)
	const contactsTable = document.getElementById('contactsTable');
	if (contactsTable) {
		contactsTable.addEventListener('click', async (e) => {
			const editBtn = e.target.closest('.edit-contact');
			if (editBtn) {
				const propertyId = editBtn.dataset.property;
				const communityName = editBtn.dataset.community;
				await editPropertyContact(propertyId, communityName);
			}
		});
	}

	// Specials event listeners
	const addSpecialBtn = document.getElementById('addSpecialBtn');
	const closeAddSpecialModal = document.getElementById('closeAddSpecialModal');
	const saveAddSpecialBtn = document.getElementById('saveAddSpecialBtn');
	const cancelAddSpecialBtn = document.getElementById('cancelAddSpecialBtn');

	// Add Special button
	if (addSpecialBtn) {
		addSpecialBtn.addEventListener('click', async () => {
			showModal('addSpecialModal');
			document.getElementById('addSpecialForm').reset();
			// Set default expiration date to 30 days from now
			const defaultDate = new Date();
			defaultDate.setDate(defaultDate.getDate() + 30);
			document.getElementById('specialExpirationDate').value = defaultDate.toISOString().split('T')[0];

			// Populate property dropdown
			await populateSpecialPropertyDropdown();
		});
	}

	// Add Property Contact link in Add Special modal
	const addPropertyContactLink = document.getElementById('addPropertyContactLink');
	if (addPropertyContactLink) {
		addPropertyContactLink.addEventListener('click', (e) => {
			e.preventDefault();
			hideModal('addSpecialModal');
			// Scroll to property contacts section
			const contactsSection = document.querySelector('.property-contacts-section');
			if (contactsSection) {
				contactsSection.scrollIntoView({ behavior: 'smooth' });
			}
		});
	}

	// Close Add Special modal
	if (closeAddSpecialModal) {
		closeAddSpecialModal.addEventListener('click', () => {
			hideModal('addSpecialModal');
		});
	}

	// Cancel Add Special
	if (cancelAddSpecialBtn) {
		cancelAddSpecialBtn.addEventListener('click', () => {
			hideModal('addSpecialModal');
		});
	}

	// Save Add Special
	if (saveAddSpecialBtn) {
		saveAddSpecialBtn.addEventListener('click', () => {
			saveNewSpecial();
		});
	}

	// Edit Special Modal
	const closeEditSpecialModal = document.getElementById('closeEditSpecialModal');
	const saveEditSpecialBtn = document.getElementById('saveEditSpecialBtn');
	const deleteEditSpecialBtn = document.getElementById('deleteEditSpecialBtn');
	const cancelEditSpecialBtn = document.getElementById('cancelEditSpecialBtn');

	if (closeEditSpecialModal) {
		closeEditSpecialModal.addEventListener('click', () => {
			hideModal('editSpecialModal');
		});
	}

	if (cancelEditSpecialBtn) {
		cancelEditSpecialBtn.addEventListener('click', () => {
			hideModal('editSpecialModal');
		});
	}

	if (saveEditSpecialBtn) {
		saveEditSpecialBtn.addEventListener('click', async () => {
			await saveEditedSpecial();
		});
	}

	if (deleteEditSpecialBtn) {
		deleteEditSpecialBtn.addEventListener('click', async () => {
			await deleteEditedSpecial();
		});
	}

	// View Specials Modal (from Properties page)
	const closeViewSpecialsModal = document.getElementById('closeViewSpecialsModal');
	const closeViewSpecialsBtn = document.getElementById('closeViewSpecialsBtn');

	if (closeViewSpecialsModal) {
		closeViewSpecialsModal.addEventListener('click', () => {
			hideModal('viewSpecialsModal');
		});
	}

	if (closeViewSpecialsBtn) {
		closeViewSpecialsBtn.addEventListener('click', () => {
			hideModal('viewSpecialsModal');
		});
	}

	// View Listing Specials Modal (from Listings page)
	const closeListingSpecialsModal = document.getElementById('closeListingSpecialsModal');
	const closeListingSpecialsBtn = document.getElementById('closeListingSpecialsBtn');

	if (closeListingSpecialsModal) {
		closeListingSpecialsModal.addEventListener('click', () => {
			hideModal('listingSpecialsModal');
		});
	}

	if (closeListingSpecialsBtn) {
		closeListingSpecialsBtn.addEventListener('click', () => {
			hideModal('listingSpecialsModal');
		});
	}

	// Specials search
	const specialsSearchEl = document.getElementById('specialsSearch');
	if (specialsSearchEl) {
		specialsSearchEl.addEventListener('input', (e) => {
			state.search = e.target.value;
			state.page = 1;
			renderSpecials();
		});
	}

	// Specials table delegation
	const specialsTableEl = document.getElementById('specialsTable');
	if (specialsTableEl) {
		specialsTableEl.addEventListener('click', (e) => {
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'specialsTable');
				e.preventDefault();
				return;
			}

			// Handle edit button
			const editBtn = e.target.closest('.edit-special');
			if (editBtn) {
				// TODO: Implement edit functionality
				toast('Edit special functionality coming soon!', 'info');
				return;
			}

			// Handle delete button
			const deleteBtn = e.target.closest('.delete-special');
			if (deleteBtn) {
				deleteSpecial(deleteBtn.dataset.id);
				return;
			}
		});
	}

	// History button
	const historyBtnEl = document.getElementById('historyBtn');
	if (historyBtnEl) {
		historyBtnEl.addEventListener('click', openHistory);
	}

	// History modal close
	const closeHistoryEl = document.getElementById('closeHistory');
	if (closeHistoryEl) {
		closeHistoryEl.addEventListener('click', closeHistory);
	}

	// Document details modal close
	const closeDocumentDetailsEl = document.getElementById('closeDocumentDetails');
	if (closeDocumentDetailsEl) {
		closeDocumentDetailsEl.addEventListener('click', closeDocumentDetails);
	}

	// Email preview modal events
	const closeEmailPreviewEl = document.getElementById('closeEmailPreview');
	if (closeEmailPreviewEl) {
		closeEmailPreviewEl.addEventListener('click', closeEmailPreview);
	}
	const sendEmailBtnEl = document.getElementById('sendEmailBtn');
	if (sendEmailBtnEl) {
		sendEmailBtnEl.addEventListener('click', async () => {
			const selected = Array.from(state.selectedMatches);
			if (selected.length > 0) {
				await sendShowcaseEmail();
			}
		});
	}

	// Preview mode toggle buttons
	const desktopPreviewBtn = document.getElementById('desktopPreviewBtn');
	if (desktopPreviewBtn) {
		desktopPreviewBtn.addEventListener('click', async () => {
			const { Modals } = await import('../modules/modals/index.js');
			Modals.togglePreviewMode('desktop');
		});
	}
	const mobilePreviewBtn = document.getElementById('mobilePreviewBtn');
	if (mobilePreviewBtn) {
		mobilePreviewBtn.addEventListener('click', async () => {
			const { Modals } = await import('../modules/modals/index.js');
			Modals.togglePreviewMode('mobile');
		});
	}

	// Send test email button
	const sendTestEmailBtn = document.getElementById('sendTestEmailBtn');
	if (sendTestEmailBtn) {
		sendTestEmailBtn.addEventListener('click', async () => {
			const selected = Array.from(state.selectedMatches);
			if (selected.length > 0) {
				await sendTestEmail();
			}
		});
	}

	const previewLandingBtnEl = document.getElementById('previewLandingBtn');
	if (previewLandingBtnEl) {
		previewLandingBtnEl.addEventListener('click', previewLandingPage);
	}

	// Interested leads modal events
	const closeInterestedLeadsEl = document.getElementById('closeInterestedLeads');
	if (closeInterestedLeadsEl) {
		closeInterestedLeadsEl.addEventListener('click', closeInterestedLeads);
	}

	// Close interested leads modal when clicking outside
	document.addEventListener('click', (e) => {
		const modal = document.getElementById('interestedLeadsModal');
		if (modal && !modal.classList.contains('hidden') && e.target === modal) {
			closeInterestedLeads();
		}
	});

	// History content delegation
	const historyContentEl = document.getElementById('historyContent');
	if (historyContentEl) {
		historyContentEl.addEventListener('click', (e) => {
			const historyLeadBtn = e.target.closest('button[data-history-lead]');
			if (historyLeadBtn) {
				const closedLeadId = historyLeadBtn.dataset.historyLead;
				openHistoryDocumentDetails(closedLeadId);
				closeHistory();
			}
		});
	}

	// Document details modal delegation
	const documentStepsEl = document.getElementById('documentSteps');
	if (documentStepsEl) {
		documentStepsEl.addEventListener('click', (e) => {
			const downloadBtn = e.target.closest('.attachment-download');
			if (downloadBtn) {
				const fileName = downloadBtn.dataset.file;
				toast(`Downloading ${fileName} (mock action)`);
			}
		});
	}

	// Filter event listeners
	const searchInputEl = document.getElementById('searchInput');
	if (searchInputEl) {
		searchInputEl.addEventListener('input', (e) => {
			state.filters.search = e.target.value;
			state.page = 1; // Reset to first page
			renderLeads();
		});
	}

	const statusFilterEl = document.getElementById('statusFilter');
	if (statusFilterEl) {
		statusFilterEl.addEventListener('change', (e) => {
			state.filters.status = e.target.value;
			state.page = 1; // Reset to first page
			renderLeads();
		});
	}

	const fromDateEl = document.getElementById('fromDate');
	if (fromDateEl) {
		fromDateEl.addEventListener('change', (e) => {
			state.filters.fromDate = e.target.value;
			state.page = 1; // Reset to first page
			renderLeads();
		});
	}

	const toDateEl = document.getElementById('toDate');
	if (toDateEl) {
		toDateEl.addEventListener('change', (e) => {
			state.filters.toDate = e.target.value;
			state.page = 1; // Reset to first page
			renderLeads();
		});
	}

	const clearFiltersEl = document.getElementById('clearFilters');
	if (clearFiltersEl) {
		clearFiltersEl.addEventListener('click', () => {
			state.filters = { search: '', status: 'all', fromDate: '', toDate: '' };
			state.page = 1;
			if (searchInputEl) searchInputEl.value = '';
			if (statusFilterEl) statusFilterEl.value = 'all';
			if (fromDateEl) fromDateEl.value = '';
			if (toDateEl) toDateEl.value = '';
			renderLeads();
		});
	}

	// Helper function to update active filter count badge
	function updateActiveFilterCount() {
		const badge = document.getElementById('activeFilterCount');
		if (!badge) return;

		let count = 0;
		if (state.listingsFilters.market && state.listingsFilters.market !== 'all') count++;
		if (state.listingsFilters.minPrice) count++;
		if (state.listingsFilters.maxPrice) count++;
		if (state.listingsFilters.beds && state.listingsFilters.beds !== 'any') count++;
		if (state.listingsFilters.commission && state.listingsFilters.commission !== 'all' && state.listingsFilters.commission !== '0') count++;
		if (state.listingsFilters.amenities && state.listingsFilters.amenities !== 'all' && state.listingsFilters.amenities !== 'any') count++;
		if (state.listingsFilters.pumiOnly) count++;

		if (count > 0) {
			badge.textContent = count;
			badge.style.display = 'inline-flex';
		} else {
			badge.style.display = 'none';
		}
	}

	// Listings Filter event listeners
	const listingsSearchInputEl = document.getElementById('listingsSearchInput');
	if (listingsSearchInputEl) {
		listingsSearchInputEl.addEventListener('input', (e) => {
			state.listingsFilters.search = e.target.value;
			renderListings();
		});
	}

	const marketFilterEl = document.getElementById('marketFilter');
	if (marketFilterEl) {
		marketFilterEl.addEventListener('change', (e) => {
			state.listingsFilters.market = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const minPriceEl = document.getElementById('minPrice');
	if (minPriceEl) {
		minPriceEl.addEventListener('input', (e) => {
			state.listingsFilters.minPrice = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const maxPriceEl = document.getElementById('maxPrice');
	if (maxPriceEl) {
		maxPriceEl.addEventListener('input', (e) => {
			state.listingsFilters.maxPrice = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const bedsFilterEl = document.getElementById('bedsFilter');
	if (bedsFilterEl) {
		bedsFilterEl.addEventListener('change', (e) => {
			state.listingsFilters.beds = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const commissionFilterEl = document.getElementById('commissionFilter');
	if (commissionFilterEl) {
		commissionFilterEl.addEventListener('change', (e) => {
			state.listingsFilters.commission = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const amenitiesFilterEl = document.getElementById('amenitiesFilter');
	if (amenitiesFilterEl) {
		amenitiesFilterEl.addEventListener('change', (e) => {
			state.listingsFilters.amenities = e.target.value;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const pumiOnlyFilterEl = document.getElementById('pumiOnlyFilter');
	if (pumiOnlyFilterEl) {
		pumiOnlyFilterEl.addEventListener('change', (e) => {
			state.listingsFilters.pumiOnly = e.target.checked;
			updateActiveFilterCount();
			renderListings();
		});
	}

	const clearListingsFiltersEl = document.getElementById('clearListingsFilters');
	if (clearListingsFiltersEl) {
		clearListingsFiltersEl.addEventListener('click', () => {
			state.listingsFilters = {
				search: '',
				market: 'all',
				minPrice: '',
				maxPrice: '',
				beds: 'any',
				commission: '0',
				amenities: 'any',
				pumiOnly: false
			};
			if (listingsSearchInputEl) listingsSearchInputEl.value = '';
			if (marketFilterEl) marketFilterEl.value = 'all';
			if (minPriceEl) minPriceEl.value = '';
			if (maxPriceEl) maxPriceEl.value = '';
			if (bedsFilterEl) bedsFilterEl.value = 'any';
			if (commissionFilterEl) commissionFilterEl.value = '0';
			if (amenitiesFilterEl) amenitiesFilterEl.value = 'any';
			if (pumiOnlyFilterEl) pumiOnlyFilterEl.checked = false;
			updateActiveFilterCount();
			renderListings();
		});
	}

	// Customer View Mode Toggle
	const agentViewBtn = document.getElementById('agentViewBtn');
	const customerViewBtn = document.getElementById('customerViewBtn');

	if (agentViewBtn && customerViewBtn) {
		agentViewBtn.addEventListener('click', async () => {
			const { toggleViewMode } = await import('../modules/listings/customer-view.js');
			toggleViewMode('agent', renderListings);
		});

		customerViewBtn.addEventListener('click', async () => {
			const { toggleViewMode, loadCustomersForSelector } = await import('../modules/listings/customer-view.js');
			toggleViewMode('customer', renderListings);

			// Load customers for the selector
			await loadCustomersForSelector(SupabaseAPI, state);
		});
	}

	// View Mode Dropdown (new clean UI)
	const viewModeSelect = document.getElementById('viewModeSelect');
	if (viewModeSelect) {
		viewModeSelect.addEventListener('change', async (e) => {
			const mode = e.target.value;
			// Trigger the hidden buttons for compatibility
			if (mode === 'agent') {
				// Agent View requires password
				const password = prompt('Enter password to access Agent View:');
				if (password === 'TRE2025') {
					document.getElementById('agentViewBtn')?.click();
				} else {
					toast('Incorrect password', 'error');
					// Reset dropdown to customer view
					viewModeSelect.value = 'customer';
				}
			} else if (mode === 'customer') {
				document.getElementById('customerViewBtn')?.click();
			}
		});
	}

	// Customer Search Autocomplete
	const customerSearchInput = document.getElementById('customerSearchInput');
	const customerSearchResults = document.getElementById('customerSearchResults');
	const customerSelectorEl = document.getElementById('customerSelector');

	if (customerSearchInput && customerSearchResults) {
		// Store all customers for search (loaded from hidden select)
		let allCustomers = [];
		let selectedCustomerId = null;

		// Observer to capture customers when they're loaded into the hidden select
		if (customerSelectorEl) {
			const observer = new MutationObserver(() => {
				allCustomers = Array.from(customerSelectorEl.options)
					.filter(opt => opt.value) // Skip empty "Select Customer..." option
					.map(opt => ({
						id: opt.value,
						name: opt.textContent,
						email: opt.dataset?.email || ''
					}));
				console.log(`📋 Customer autocomplete loaded ${allCustomers.length} customers`);
			});
			observer.observe(customerSelectorEl, { childList: true });
		}

		// Show results on focus if there's text or show prompt
		customerSearchInput.addEventListener('focus', () => {
			const searchTerm = customerSearchInput.value.trim().toLowerCase();
			if (searchTerm.length >= 1) {
				showSearchResults(searchTerm);
			} else if (!selectedCustomerId && allCustomers.length > 0) {
				// Show hint to start typing
				customerSearchResults.innerHTML = `
					<div class="customer-search-no-results">
						Type to search ${allCustomers.length} customers...
					</div>
				`;
				customerSearchResults.classList.add('show');
			}
		});

		// Search as user types
		customerSearchInput.addEventListener('input', (e) => {
			const searchTerm = e.target.value.trim().toLowerCase();

			// Clear selection if user is typing
			if (selectedCustomerId && customerSearchInput.value !== customerSearchInput.dataset.selectedName) {
				selectedCustomerId = null;
				customerSearchInput.classList.remove('has-selection');
				customerSelectorEl.value = '';
			}

			if (searchTerm.length >= 1) {
				showSearchResults(searchTerm);
			} else {
				customerSearchResults.classList.remove('show');
			}
		});

		function showSearchResults(searchTerm) {
			const matches = allCustomers.filter(c =>
				c.name.toLowerCase().includes(searchTerm) ||
				c.email.toLowerCase().includes(searchTerm)
			);

			if (matches.length === 0) {
				customerSearchResults.innerHTML = `
					<div class="customer-search-no-results">
						No customers found for "${searchTerm}"
					</div>
				`;
			} else {
				customerSearchResults.innerHTML = matches.slice(0, 10).map(c => `
					<div class="customer-search-result-item" data-id="${c.id}" data-name="${c.name}">
						<div class="customer-result-name">${highlightMatch(c.name, searchTerm)}</div>
						${c.email ? `<div class="customer-result-email">${highlightMatch(c.email, searchTerm)}</div>` : ''}
					</div>
				`).join('');

				// Add click handlers to results
				customerSearchResults.querySelectorAll('.customer-search-result-item').forEach(item => {
					item.addEventListener('click', () => selectCustomer(item.dataset.id, item.dataset.name));
				});
			}
			customerSearchResults.classList.add('show');
		}

		function highlightMatch(text, searchTerm) {
			const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
			return text.replace(regex, '<strong>$1</strong>');
		}

		async function selectCustomer(id, name) {
			selectedCustomerId = id;
			customerSearchInput.value = name;
			customerSearchInput.dataset.selectedName = name;
			customerSearchInput.classList.add('has-selection');
			customerSearchResults.classList.remove('show');

			// Update hidden select for compatibility
			customerSelectorEl.value = id;

			// Remove skip active state
			const skipBtn = document.getElementById('skipCustomerBtn');
			if (skipBtn) skipBtn.classList.remove('active');

			// Trigger customer selection
			const { handleCustomerSelection } = await import('../modules/listings/customer-view.js');
			await handleCustomerSelection(id, renderListings);
		}

		// Hide results when clicking outside
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.customer-search-container')) {
				customerSearchResults.classList.remove('show');
			}
		});

		// Keyboard navigation
		customerSearchInput.addEventListener('keydown', (e) => {
			const items = customerSearchResults.querySelectorAll('.customer-search-result-item');
			const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (items.length > 0) {
					items[currentIndex]?.classList.remove('selected');
					const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
					items[nextIndex].classList.add('selected');
					items[nextIndex].scrollIntoView({ block: 'nearest' });
				}
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (items.length > 0) {
					items[currentIndex]?.classList.remove('selected');
					const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
					items[prevIndex].classList.add('selected');
					items[prevIndex].scrollIntoView({ block: 'nearest' });
				}
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const selectedItem = customerSearchResults.querySelector('.customer-search-result-item.selected');
				if (selectedItem) {
					selectCustomer(selectedItem.dataset.id, selectedItem.dataset.name);
				} else if (items.length === 1) {
					// Auto-select if only one result
					selectCustomer(items[0].dataset.id, items[0].dataset.name);
				}
			} else if (e.key === 'Escape') {
				customerSearchResults.classList.remove('show');
				customerSearchInput.blur();
			}
		});
	}

	// Skip Customer Button - browse without selecting
	const skipCustomerBtn = document.getElementById('skipCustomerBtn');
	if (skipCustomerBtn) {
		skipCustomerBtn.addEventListener('click', async () => {
			// Clear customer selection (hidden select)
			const customerSelector = document.getElementById('customerSelector');
			if (customerSelector) {
				customerSelector.value = '';
			}

			// Clear customer search input and selection state
			const searchInput = document.getElementById('customerSearchInput');
			if (searchInput) {
				searchInput.value = '';
				searchInput.classList.remove('has-selection');
				delete searchInput.dataset.selectedName;
			}

			// Hide search results
			const searchResults = document.getElementById('customerSearchResults');
			if (searchResults) {
				searchResults.classList.remove('show');
			}

			// Import and clear customer selection
			const { clearCustomerSelection } = await import('../modules/listings/customer-view.js');
			clearCustomerSelection();

			// Set skipped flag so listings render without requiring customer selection
			state.customerView.skipped = true;

			// Toggle button active state
			skipCustomerBtn.classList.add('active');

			// Re-render listings without customer filter
			renderListings();

			toast('Browsing all listings', 'info');
		});
	}

	// Filters Toggle Button
	const filtersToggleBtn = document.getElementById('filtersToggleBtn');
	const filterPanel = document.getElementById('filterPanel');
	if (filtersToggleBtn && filterPanel) {
		filtersToggleBtn.addEventListener('click', () => {
			const isHidden = filterPanel.style.display === 'none' || !filterPanel.style.display;
			filterPanel.style.display = isHidden ? 'block' : 'none';
			filtersToggleBtn.classList.toggle('active', isHidden);
		});
	}

	// Add Actions Dropdown
	const addActionsDropdown = document.getElementById('addActionsDropdown');
	const addActionsBtn = document.getElementById('addActionsBtn');
	if (addActionsDropdown && addActionsBtn) {
		addActionsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			addActionsDropdown.classList.toggle('open');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!e.target.closest('.add-actions-dropdown')) {
				addActionsDropdown.classList.remove('open');
			}
		});

		// Handle menu item clicks
		addActionsDropdown.querySelectorAll('.add-menu-item').forEach(item => {
			item.addEventListener('click', () => {
				const action = item.dataset.action;
				addActionsDropdown.classList.remove('open');

				// Trigger the corresponding hidden button
				if (action === 'add-property') {
					document.getElementById('addListingBtn')?.click();
				} else if (action === 'contact-info') {
					document.getElementById('addContactInfoBtn')?.click();
				} else if (action === 'csv-template') {
					document.getElementById('downloadCSVTemplateBtn')?.click();
				} else if (action === 'upload-csv') {
					document.getElementById('uploadCSVBtn')?.click();
				}
			});
		});
	}

	// Clear Filters Button
	const clearFiltersBtn = document.getElementById('clearFiltersBtn');
	if (clearFiltersBtn) {
		clearFiltersBtn.addEventListener('click', () => {
			// Reset all filter inputs
			const marketFilter = document.getElementById('marketFilter');
			const minPrice = document.getElementById('minPrice');
			const maxPrice = document.getElementById('maxPrice');
			const bedsFilter = document.getElementById('bedsFilter');
			const commissionFilter = document.getElementById('commissionFilter');
			const amenitiesFilter = document.getElementById('amenitiesFilter');
			const pumiOnlyFilter = document.getElementById('pumiOnlyFilter');
			const listingsSearchInput = document.getElementById('listingsSearchInput');

			if (marketFilter) marketFilter.value = 'all';
			if (minPrice) minPrice.value = '';
			if (maxPrice) maxPrice.value = '';
			if (bedsFilter) bedsFilter.value = 'any';
			if (commissionFilter) commissionFilter.value = 'all';
			if (amenitiesFilter) amenitiesFilter.value = 'all';
			if (pumiOnlyFilter) pumiOnlyFilter.checked = false;
			if (listingsSearchInput) listingsSearchInput.value = '';

			// Reset state
			state.listingsFilters = {
				search: '',
				market: 'all',
				minPrice: '',
				maxPrice: '',
				beds: 'any',
				commission: 'all',
				amenities: 'all',
				pumiOnly: false
			};

			// Update filter count badge
			updateActiveFilterCount();

			// Re-render
			renderListings();
		});
	}

	// Bulk Actions Bar - Close button
	const bulkCloseBtn = document.getElementById('bulkCloseBtn');
	if (bulkCloseBtn) {
		bulkCloseBtn.addEventListener('click', () => {
			// Deselect all checkboxes
			document.querySelectorAll('#listingsTable input[type="checkbox"]:checked').forEach(cb => {
				cb.checked = false;
			});
			// Hide bulk actions bar
			const bulkActionsBar = document.getElementById('bulkActionsBar');
			if (bulkActionsBar) bulkActionsBar.style.display = 'none';
		});
	}

	// Add Listing button and modal
	const addListingBtn = document.getElementById('addListingBtn');
	if (addListingBtn) {
		addListingBtn.addEventListener('click', openAddListingModal);
	}

	// Add Contact Info button (opens property contact modal)
	const addContactInfoBtn = document.getElementById('addContactInfoBtn');
	if (addContactInfoBtn) {
		addContactInfoBtn.addEventListener('click', () => {
			showModal('addPropertyContactModal');
			document.getElementById('addPropertyContactForm').reset();
		});
	}

	// CSV Template Download button
	const downloadCSVTemplateBtn = document.getElementById('downloadCSVTemplateBtn');
	if (downloadCSVTemplateBtn) {
		downloadCSVTemplateBtn.addEventListener('click', () => {
			downloadCSVTemplate({ toast });
		});
	}

	// CSV Upload button
	const uploadCSVBtn = document.getElementById('uploadCSVBtn');
	const csvFileInput = document.getElementById('csvFileInput');

	if (uploadCSVBtn && csvFileInput) {
		uploadCSVBtn.addEventListener('click', () => {
			csvFileInput.click();
		});

		csvFileInput.addEventListener('change', async (e) => {
			const file = e.target.files[0];
			if (file) {
				await importCSV({
					file,
					toast,
					SupabaseAPI,
					renderListings
				});
				// Clear the input so the same file can be uploaded again
				csvFileInput.value = '';
			}
		});
	}

	const closeAddListing = document.getElementById('closeAddListing');
	const cancelAddListing = document.getElementById('cancelAddListing');
	const saveListingBtn = document.getElementById('saveListingBtn');

	if (closeAddListing) {
		closeAddListing.addEventListener('click', closeAddListingModal);
	}
	if (cancelAddListing) {
		cancelAddListing.addEventListener('click', closeAddListingModal);
	}
	if (saveListingBtn) {
		saveListingBtn.addEventListener('click', createListing);
	}

	// Property Notes modal
	const closePropertyNotes = document.getElementById('closePropertyNotes');
	const cancelPropertyNotes = document.getElementById('cancelPropertyNotes');
	const savePropertyNoteBtn = document.getElementById('savePropertyNoteBtn');

	if (closePropertyNotes) {
		closePropertyNotes.addEventListener('click', closePropertyNotesModal);
	}
	if (cancelPropertyNotes) {
		cancelPropertyNotes.addEventListener('click', closePropertyNotesModal);
	}
	if (savePropertyNoteBtn) {
		savePropertyNoteBtn.addEventListener('click', addPropertyNote);
	}

	// Initialize popover elements
	initPopover();

	// Health status hover events - using event delegation on the table
	const leadsTable = document.getElementById('leadsTable');

	leadsTable.addEventListener('mouseenter', (e) => {
		const btn = e.target.closest('.health-btn');
		if (!btn) return;
		showPopover(btn, btn.dataset.status);
	}, true);

	leadsTable.addEventListener('mouseleave', (e) => {
		if (e.target.closest && e.target.closest('.health-btn')) {
			setTimeout(() => {
				const popElement = document.getElementById('healthPopover');
				if (popElement && !popElement.matches(':hover')) hidePopover();
			}, 150);
		}
	}, true);

	leadsTable.addEventListener('click', (e) => {
		// Handle sorting
		const sortableHeader = e.target.closest('th[data-sort]');
		if (sortableHeader) {
			const column = sortableHeader.dataset.sort;
			sortTable(column, 'leadsTable');
			e.preventDefault();
			return;
		}

		const btn = e.target.closest('.health-btn');
		if (btn) {
			// Toggle popover - hidePopover is safe to call even if not visible
			const popElement = document.getElementById('healthPopover');
			const open = popElement && popElement.style.display === 'block';
			if (open) hidePopover();
			else showPopover(btn, btn.dataset.status);
			e.stopPropagation();
		}
	});

	// Hide popover on click outside or escape
	document.addEventListener('click', (e) => {
		if (!e.target.closest('#healthPopover') && !e.target.closest('.health-btn')) {
			hidePopover();
		}
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			hidePopover();
		}
	});

	window.addEventListener('resize', hidePopover);
	window.addEventListener('scroll', () => {
		hidePopover();
	}, true);

	// Test function for debugging
	window.testPopover = function () {
		console.log('Testing popover...');
		const testBtn = document.createElement('button');
		testBtn.className = 'health-btn';
		testBtn.dataset.status = 'green';
		testBtn.style.position = 'fixed';
		testBtn.style.top = '100px';
		testBtn.style.left = '100px';
		testBtn.style.zIndex = '9999';
		testBtn.innerHTML = '<span class="health-dot health-green"></span>';
		document.body.appendChild(testBtn);

		setTimeout(() => {
			showPopover(testBtn, 'green');
		}, 100);
	};

	// Event delegation for expand buttons and lead table headers (works for both manager and agent views)
	document.addEventListener('click', async (e) => {
		// Check if clicked element is welcome email indicator
		const welcomeEmailIndicator = e.target.closest('[data-action="view-welcome-email"]');
		if (welcomeEmailIndicator) {
			e.preventDefault();
			e.stopPropagation();
			const leadId = welcomeEmailIndicator.getAttribute('data-lead-id');

			// Fetch welcome email activity
			try {
				const activities = await SupabaseAPI.getLeadActivities(leadId);
				const welcomeEmailActivity = activities.find(a => a.activity_type === 'welcome_email_sent');

				if (welcomeEmailActivity && welcomeEmailActivity.metadata?.email_id) {
					const emailId = welcomeEmailActivity.metadata.email_id;
					window.viewEmailContent(emailId, 'welcome_lead');
				} else {
					toast('Welcome email details not found', 'warning');
				}
			} catch (error) {
				console.error('Error fetching welcome email:', error);
				toast('Error loading welcome email', 'error');
			}
			return;
		}

		// Check if clicked element is expand button or inside expand button
		const expandBtn = e.target.closest('.expand-btn');
		if (expandBtn) {
			e.preventDefault();
			e.stopPropagation();
			const leadId = expandBtn.getAttribute('data-lead-id');
			toggleLeadTable(leadId);
			return;
		}

		// Check if clicked element is lead table header (but not the expand button)
		const leadTableHeader = e.target.closest('.lead-table-header');
		if (leadTableHeader && !e.target.closest('.expand-btn')) {
			e.preventDefault();
			e.stopPropagation();
			// Find the expand button within this header
			const headerExpandBtn = leadTableHeader.querySelector('.expand-btn');
			if (headerExpandBtn) {
				const leadId = headerExpandBtn.getAttribute('data-lead-id');
				toggleLeadTable(leadId);
			}
		}
	});


	// Bug tracker event listeners
	const bugsNavLink = document.getElementById('bugsNavLink');
	if (bugsNavLink) {
		if (state.role === 'agent') {
			bugsNavLink.style.display = 'none';
		} else {
			bugsNavLink.style.display = 'block';
		}
	}

	// Bug report modal events
	const closeBugReportModal = document.getElementById('closeBugReportModal');
	const saveBugReportBtn = document.getElementById('saveBugReportBtn');
	const cancelBugReportBtn = document.getElementById('cancelBugReportBtn');

	if (closeBugReportModal) {
		closeBugReportModal.addEventListener('click', () => hideModal('bugReportModal'));
	}
	if (cancelBugReportBtn) {
		cancelBugReportBtn.addEventListener('click', () => hideModal('bugReportModal'));
	}
	if (saveBugReportBtn) {
		saveBugReportBtn.addEventListener('click', submitBugReport);
	}

	// Bug filters
	const bugStatusFilter = document.getElementById('bugStatusFilter');
	const bugPriorityFilter = document.getElementById('bugPriorityFilter');

	if (bugStatusFilter) {
		bugStatusFilter.addEventListener('change', renderBugs);
	}
	if (bugPriorityFilter) {
		bugPriorityFilter.addEventListener('change', renderBugs);
	}

	// Bug table delegation
	const bugsTableEl = document.getElementById('bugsTable');
	if (bugsTableEl) {
		bugsTableEl.addEventListener('click', (e) => {
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'bugsTable');
				e.preventDefault();
				return;
			}

			// Handle view button
			const viewBtn = e.target.closest('.view-bug');
			if (viewBtn) {
				showBugDetails(viewBtn.dataset.id);
				return;
			}

			// Handle save button
			const saveBtn = e.target.closest('.save-bug');
			if (saveBtn) {
				saveBugChanges(saveBtn.dataset.id);
				return;
			}

			// Handle delete button
			const deleteBtn = e.target.closest('.delete-bug');
			if (deleteBtn) {
				if (confirm('Are you sure you want to delete this bug report?')) {
					api.deleteBug(deleteBtn.dataset.id);
					toast('Bug report deleted', 'success');
					renderBugs();
				}
				return;
			}
		});
	}

	// Bug Details Modal close functionality
	const closeBugDetailsModal = document.getElementById('closeBugDetailsModal');
	const closeBugDetailsModalBtn = document.getElementById('closeBugDetailsModalBtn');

	if (closeBugDetailsModal) {
		closeBugDetailsModal.addEventListener('click', () => {
			hideModal('bugDetailsModal');
		});
	}

	if (closeBugDetailsModalBtn) {
		closeBugDetailsModalBtn.addEventListener('click', () => {
			hideModal('bugDetailsModal');
		});
	}

	// Dynamic Modal close functionality
	const closeDynamicModal = document.getElementById('closeDynamicModal');
	if (closeDynamicModal) {
		closeDynamicModal.addEventListener('click', () => {
			hideModal('dynamicModal');
		});
	}

	// Initialize bug flags
	addBugFlags();

	// Email dashboard event listeners
	const emailStatusFilter = document.getElementById('emailStatusFilter');
	const emailAgentFilter = document.getElementById('emailAgentFilter');
	const emailSearch = document.getElementById('emailSearch');
	const emailsPrevPage = document.getElementById('emailsPrevPage');
	const emailsNextPage = document.getElementById('emailsNextPage');
	const alertTypeFilter = document.getElementById('alertTypeFilter');
	const alertSeverityFilter = document.getElementById('alertSeverityFilter');
	const refreshAlertsBtn = document.getElementById('refreshAlertsBtn');

	if (emailStatusFilter) {
		emailStatusFilter.addEventListener('change', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			Emails.resetEmailsPagination();
			await Emails.renderEmailLogs({ api, state, showEmailPreview });
		});
	}

	if (emailAgentFilter) {
		emailAgentFilter.addEventListener('change', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			Emails.resetEmailsPagination();
			await Emails.renderEmailLogs({ api, state, showEmailPreview });
		});
	}

	if (emailSearch) {
		emailSearch.addEventListener('input', async (e) => {
			// Debounce search
			clearTimeout(emailSearch._searchTimeout);
			emailSearch._searchTimeout = setTimeout(async () => {
				const { Emails } = await import('../modules/emails/index.js');
				Emails.resetEmailsPagination();
				await Emails.renderEmailLogs({ api, state, showEmailPreview });
			}, 300);
		});
	}

	if (emailsPrevPage) {
		emailsPrevPage.addEventListener('click', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			if (Emails.previousEmailsPage()) {
				await Emails.renderEmailLogs({ api, state, showEmailPreview });
			}
		});
	}

	if (emailsNextPage) {
		emailsNextPage.addEventListener('click', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			if (Emails.nextEmailsPage()) {
				await Emails.renderEmailLogs({ api, state, showEmailPreview });
			}
		});
	}

	// Email alerts event listeners
	if (alertTypeFilter) {
		alertTypeFilter.addEventListener('change', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			await Emails.renderEmailAlerts({ api, state });
		});
	}

	if (alertSeverityFilter) {
		alertSeverityFilter.addEventListener('change', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			await Emails.renderEmailAlerts({ api, state });
		});
	}

	if (refreshAlertsBtn) {
		refreshAlertsBtn.addEventListener('click', async () => {
			const { Emails } = await import('../modules/emails/index.js');
			await Emails.renderEmailAlerts({ api, state });
		});
	}

	// Email table delegation
	document.addEventListener('click', async (e) => {
		// View email details
		if (e.target.closest('.view-email-details')) {
			const emailId = e.target.closest('.view-email-details').dataset.emailId;
			showEmailPreview(emailId);
			e.preventDefault();
			return;
		}

		// Preview email template
		if (e.target.closest('.preview-template')) {
			const templateId = e.target.closest('.preview-template').dataset.templateId;
			await showTemplatePreview(templateId);
			e.preventDefault();
			return;
		}

		// Test send email template
		if (e.target.closest('.test-send-template')) {
			const templateId = e.target.closest('.test-send-template').dataset.templateId;
			await sendTestEmail(templateId);
			e.preventDefault();
			return;
		}
	});

	// Add event listeners for bug field changes
	document.addEventListener('change', (e) => {
		if (e.target.classList.contains('bug-status-select') || e.target.classList.contains('bug-priority-select')) {
			const bugId = e.target.dataset.bugId;
			handleBugFieldChange(bugId);
		}
	});

	// Update role visibility for bugs nav
	const roleSelect = document.getElementById('roleSelect');
	if (roleSelect) {
		roleSelect.addEventListener('change', (e) => {
			const bugsNavLink = document.getElementById('bugsNavLink');
			if (bugsNavLink) {
				if (e.target.value === 'agent') {
					bugsNavLink.style.display = 'none';
				} else {
					bugsNavLink.style.display = 'block';
				}
			}
		});
	}

	// Add event listeners for listing edit modal
	const closeListingEdit = document.getElementById('closeListingEdit');
	const cancelListingEdit = document.getElementById('cancelListingEdit');
	const saveListingEditBtn = document.getElementById('saveListingEdit');
	const deleteListingBtn = document.getElementById('deleteListingBtn');
	const listingEditModal = document.getElementById('listingEditModal');

	if (closeListingEdit) {
		closeListingEdit.addEventListener('click', closeListingEditModal);
	}
	if (cancelListingEdit) {
		cancelListingEdit.addEventListener('click', closeListingEditModal);
	}
	if (saveListingEditBtn) {
		saveListingEditBtn.addEventListener('click', saveListingEdit);
	}
	if (deleteListingBtn) {
		deleteListingBtn.addEventListener('click', deleteListing);
	}
	if (listingEditModal) {
		// Close modal when clicking outside
		listingEditModal.addEventListener('click', (e) => {
			if (e.target.id === 'listingEditModal') {
				closeListingEditModal();
			}
		});
	}

	// Bulk actions event listeners using event delegation
	document.addEventListener('click', (e) => {
		// Handle bulk mark as unavailable button
		if (e.target.id === 'bulkMarkUnavailableBtn' || e.target.closest('#bulkMarkUnavailableBtn')) {
			console.log('Bulk Mark as Unavailable clicked!');
			e.preventDefault();
			bulkMarkAsUnavailable();
			return;
		}

		// Handle bulk delete button
		if (e.target.id === 'bulkDeleteBtn' || e.target.closest('#bulkDeleteBtn')) {
			console.log('Bulk Delete clicked!');
			e.preventDefault();
			bulkDeleteListings();
			return;
		}

		// Handle bulk send Smart Match button
		if (e.target.id === 'bulkSendSmartMatchBtn' || e.target.closest('#bulkSendSmartMatchBtn')) {
			console.log('Bulk Send Smart Match clicked!');
			e.preventDefault();
			bulkSendSmartMatch();
			return;
		}
	});

	console.log('✅ Bulk action event delegation set up');

	// Routing will be initialized by initializeApp() after authentication

	console.log('✅ All event listeners setup complete');
}
