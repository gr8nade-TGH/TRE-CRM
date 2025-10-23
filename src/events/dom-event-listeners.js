/**
 * DOM Event Listeners Setup Module
 * Extracted from script.js to reduce file size and improve maintainability
 * Sets up all event listeners for the TRE CRM application
 * 
 * This module contains ~1,300 lines of event listener setup code
 * that was previously in the DOMContentLoaded handler in script.js
 */

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
		
		// Render functions
		renderLeads,
		renderListings,
		renderAgents,
		renderDocuments,
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

		// Bulk actions functions
		bulkMarkAsUnavailable,
		bulkDeleteListings,
		
		// Bug tracker functions
		submitBugReport,
		saveBugChanges,
		addBugFlags,
		handleBugFieldChange,
		showBugDetails,
		
		// Showcase functions
		sendBuildShowcase,
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
			leadSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				state.page = 1;
				renderLeads();
			});
		}

		// listing search
		const listingSearchEl = document.getElementById('listingSearch');
		if (listingSearchEl) {
			listingSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				renderListings();
			});
		}

		// Old sort event listener removed - now handled by table delegation

		// pagination
		const prevPageEl = document.getElementById('prevPage');
		if (prevPageEl) {
			prevPageEl.addEventListener('click', ()=>{ if (state.page>1){ state.page--; renderLeads(); }});
		}
		const nextPageEl = document.getElementById('nextPage');
		if (nextPageEl) {
			nextPageEl.addEventListener('click', ()=>{ state.page++; renderLeads(); });
		}

		// table delegation
		const leadsTableEl = document.getElementById('leadsTable');
		if (leadsTableEl) {
			leadsTableEl.addEventListener('click', (e)=>{
				const a = e.target.closest('a.lead-name');
				if (a){ e.preventDefault(); openDrawer(a.dataset.id); return; }
				const view = e.target.closest('button[data-view]');
				if (view){ openDrawer(view.dataset.view); return; }
				const matches = e.target.closest('button[data-matches]');
				if (matches){ openMatches(matches.dataset.matches); return; }
			});
		}

		// agents table delegation
		const agentsTableEl = document.getElementById('agentsTable');
		if (agentsTableEl) {
			agentsTableEl.addEventListener('click', (e)=>{
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'agentsTable');
				e.preventDefault();
				return;
			}

				const view = e.target.closest('button[data-view-agent]');
				if (view){ openAgentDrawer(view.dataset.viewAgent); return; }

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
				if (remove){
					if (confirm('Are you sure you want to remove this agent?')) {
						toast('Agent removed (mock action)');
						renderAgents();
					}
					return;
				}

				const lock = e.target.closest('button[data-lock]');
				if (lock){
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
				if (assignLeads){ toast('Assign leads to agent (mock action)'); return; }
			});
		}

		// listings table delegation
		const listingsTableEl = document.getElementById('listingsTable');
		if (listingsTableEl) {
			listingsTableEl.addEventListener('click', (e)=>{
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

			// Handle checkbox changes for bulk actions
			listingsTableEl.addEventListener('change', (e)=>{
				if (e.target.classList.contains('listing-checkbox')) {
					console.log('Listing checkbox changed');
					updateBulkActionsBar();
				}
			});
		}

		// documents table delegation
		const documentsTableEl = document.getElementById('documentsTable');
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
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
			leadsTableEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){
					const id = sel.dataset.assign;
					await api.assignLead(id, sel.value || null);
					toast('Lead assignment updated');
					renderLeads();
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
			leadDetailsModalEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){
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
			listingsGridEl.addEventListener('change', (e)=>{
				const box = e.target.closest('input[type="checkbox"].listing-check');
				if (box){
					updateSelectionSummary();
				}
			});
		}
		const sendBtnEl = document.getElementById('sendBtn');
		if (sendBtnEl) {
			sendBtnEl.addEventListener('click', async ()=>{
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
						leadNameEl.textContent = lead.name;
						// Enable button since properties are already selected
						sendBtn.disabled = false;
					}
				} else {
					leadNameEl.textContent = 'Lead';
					sendBtn.disabled = true;
				}
			});
		}

		// Individual listing checkboxes
		document.addEventListener('change', (e) => {
			if (e.target.classList.contains('listing-checkbox')) {
				updateBuildShowcaseButton();
			}
		});
		const copyShowcaseLinkEl = document.getElementById('copyShowcaseLink');
		if (copyShowcaseLinkEl) {
			copyShowcaseLinkEl.addEventListener('click', ()=>{
				// just re-open prompt with last created showcase if exists
				const last = Object.values(state.showcases).slice(-1)[0];
				if (!last) return;
				const url = `${location.origin}${location.pathname}#/${last.public_slug}`;
				window.prompt('Copy public link:', url);
			});
		}

		// add agent button
		const addAgentBtnEl = document.getElementById('addAgentBtn');
		if (addAgentBtnEl) {
			addAgentBtnEl.addEventListener('click', ()=>{
				toast('Add new agent (mock action)');
			});
		}

		// Documents page event listeners
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
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
		const searchType = document.getElementById('searchType');
		const clearDocumentsSearch = document.getElementById('clearDocumentsSearch');

		if (documentsSearch && searchType && clearDocumentsSearch) {
			// Search input event
			documentsSearch.addEventListener('input', (e) => {
				const searchTerm = e.target.value;
				const type = searchType.value;
				renderLeadsTable(searchTerm, type);
			});

			// Search type change event
			searchType.addEventListener('change', (e) => {
				const searchTerm = documentsSearch.value;
				const type = e.target.value;
				renderLeadsTable(searchTerm, type);
			});

			// Clear search event
			clearDocumentsSearch.addEventListener('click', () => {
				documentsSearch.value = '';
				searchType.value = 'both';
				renderLeadsTable('', 'both');
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

				// Basic validation
				if (!userData.name || !userData.email || !userData.role) {
					console.log('❌ Validation failed: missing required fields');
					toast('Please fill in all required fields', 'error');
					return;
				}

				if (!userData.password) {
					console.log('❌ Validation failed: password required');
					toast('Password is required', 'error');
					return;
				}

				if (userData.password !== userData.confirmPassword) {
					console.log('❌ Validation failed: passwords do not match');
					toast('Passwords do not match', 'error');
					return;
				}

				console.log('✅ Validation passed');

				try {
					const userId = document.getElementById('userModal').getAttribute('data-user-id');

					// Use Supabase to create/update users
					if (userId) {
						console.log('Updating existing user:', userId);
						// Update existing user
						await updateUser(userId, {
							name: userData.name,
							email: userData.email,
							role: userData.role
						});
						toast('User updated successfully');
					} else {
						console.log('Creating new user...');
						// Create new user
						await createUser({
							name: userData.name,
							email: userData.email,
							role: userData.role,
							password: userData.password
						});
						toast('User created successfully! They can now log in.');
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
		const addPropertyContactBtn = document.getElementById('addPropertyContactBtn');
		const closeAddPropertyContactModal = document.getElementById('closeAddPropertyContactModal');
		const savePropertyContactBtn = document.getElementById('savePropertyContactBtn');
		const cancelPropertyContactBtn = document.getElementById('cancelPropertyContactBtn');

		// Add Property Contact button
		if (addPropertyContactBtn) {
			addPropertyContactBtn.addEventListener('click', () => {
				showModal('addPropertyContactModal');
				document.getElementById('addPropertyContactForm').reset();
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
			addSpecialBtn.addEventListener('click', () => {
				showModal('addSpecialModal');
				document.getElementById('addSpecialForm').reset();
				// Set default expiration date to 30 days from now
				const defaultDate = new Date();
				defaultDate.setDate(defaultDate.getDate() + 30);
				document.getElementById('specialExpirationDate').value = defaultDate.toISOString().split('T')[0];
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
			sendEmailBtnEl.addEventListener('click', async ()=>{
				const selected = Array.from(state.selectedMatches);
				if (selected.length > 0) {
					await sendShowcaseEmail();
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
			historyContentEl.addEventListener('click', (e)=>{
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
			documentStepsEl.addEventListener('click', (e)=>{
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
				renderListings();
			});
		}

		const minPriceEl = document.getElementById('minPrice');
		if (minPriceEl) {
			minPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.minPrice = e.target.value;
				renderListings();
			});
		}

		const maxPriceEl = document.getElementById('maxPrice');
		if (maxPriceEl) {
			maxPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.maxPrice = e.target.value;
				renderListings();
			});
		}

		const bedsFilterEl = document.getElementById('bedsFilter');
		if (bedsFilterEl) {
			bedsFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.beds = e.target.value;
				renderListings();
			});
		}

		const commissionFilterEl = document.getElementById('commissionFilter');
		if (commissionFilterEl) {
			commissionFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.commission = e.target.value;
				renderListings();
			});
		}

		const amenitiesFilterEl = document.getElementById('amenitiesFilter');
		if (amenitiesFilterEl) {
			amenitiesFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.amenities = e.target.value;
				renderListings();
			});
		}

		const pumiOnlyFilterEl = document.getElementById('pumiOnlyFilter');
		if (pumiOnlyFilterEl) {
			pumiOnlyFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.pumiOnly = e.target.checked;
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
				renderListings();
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
		console.log('Leads table found:', !!leadsTable); // Debug

		leadsTable.addEventListener('mouseenter', (e)=>{
			console.log('Mouse enter event:', e.target); // Debug
			const btn = e.target.closest('.health-btn');
			console.log('Health button found:', !!btn, btn?.dataset.status); // Debug
			if (!btn) return;
			showPopover(btn, btn.dataset.status);
		}, true);

		leadsTable.addEventListener('mouseleave', (e)=>{
			if (e.target.closest && e.target.closest('.health-btn')) {
				setTimeout(() => {
					const popElement = document.getElementById('healthPopover');
					if (popElement && !popElement.matches(':hover')) hidePopover();
				}, 150);
			}
		}, true);

		leadsTable.addEventListener('click', (e)=>{
			console.log('Click event:', e.target); // Debug

			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'leadsTable');
				e.preventDefault();
				return;
			}

			const btn = e.target.closest('.health-btn');
			console.log('Health button clicked:', !!btn, btn?.dataset.status); // Debug
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
		document.addEventListener('click', (e)=>{
			if (!e.target.closest('#healthPopover') && !e.target.closest('.health-btn')) {
				hidePopover();
			}
		});

		document.addEventListener('keydown', (e)=>{
			if (e.key === 'Escape') {
				hidePopover();
			}
		});

		window.addEventListener('resize', hidePopover);
		window.addEventListener('scroll', ()=>{
			hidePopover();
		}, true);

	// Test function for debugging
	window.testPopover = function() {
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

		// Event delegation for expand buttons (works for both manager and agent views)
		document.addEventListener('click', (e) => {
			console.log('Click detected on:', e.target);
			console.log('Target classList:', e.target.classList);
			console.log('Target parent:', e.target.parentElement);

			// Check if clicked element is expand button or inside expand button
			const expandBtn = e.target.closest('.expand-btn');
			if (expandBtn) {
				console.log('Expand button clicked!');
				e.preventDefault();
				e.stopPropagation();
				const leadId = expandBtn.getAttribute('data-lead-id');
				console.log('Lead ID:', leadId);
				toggleLeadTable(leadId);
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

		// Initialize bug flags
		addBugFlags();

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
		});

		console.log('✅ Bulk action event delegation set up');

		// Routing will be initialized by initializeApp() after authentication

		console.log('✅ All event listeners setup complete');
}
