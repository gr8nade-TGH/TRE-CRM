// Admin Rendering Functions - EXACT COPY from script.js lines 6543-6696

// Pagination state for users table
let currentUsersPage = 1;
const USERS_PER_PAGE = 10;
let allUsersData = [];

// Pagination state for audit log
let currentAuditLogPage = 1;
const AUDIT_ENTRIES_PER_PAGE = 10;
let allAuditLogData = [];

/**
 * Reset users pagination to page 1
 */
export function resetUsersPagination() {
	currentUsersPage = 1;
}

/**
 * Reset audit log pagination to page 1
 */
export function resetAuditLogPagination() {
	currentAuditLogPage = 1;
}

export async function renderAdmin(options) {
	const { loadUsers, loadAuditLog, renderUsersTable, renderAuditLog } = options;
	
	const currentRole = window.state?.role || 'manager';
	const adminRoleLabel = document.getElementById('adminRoleLabel');

	if (adminRoleLabel) {
		adminRoleLabel.textContent = `Role: ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`;
	}

	// Load real data from API
	try {
		await loadUsers();
		await loadAuditLog();
	} catch (error) {
		console.error('Error loading admin data:', error);
		// Fallback to mock data for demo
		console.log('Using mock data for admin page');
	}

	// Always render the table (either with real data or mock data)
	renderUsersTable();
	renderAuditLog();
}

export function renderUsersTable(options) {
	const { realUsers, state, formatDate, updateSortHeaders } = options;

	console.log('renderUsersTable called, realUsers:', realUsers.value?.length || 0);
	const tbody = document.getElementById('usersTbody');
	if (!tbody) {
		console.log('usersTbody not found');
		return;
	}

	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.value.length > 0 ? [...realUsers.value] : [];
	console.log('Users to render:', users.length);

	// Apply sorting if active
	const currentState = state || { sort: { key: null, dir: null } };
	console.log('renderUsersTable - currentState.sort:', currentState.sort);
	if (currentState.sort.key && currentState.sort.dir && currentState.sort.dir !== 'none') {
		console.log('Applying sorting to users, key:', currentState.sort.key, 'dir:', currentState.sort.dir);
		try {
			users.sort((a, b) => {
				let aVal, bVal;

				if (currentState.sort.key === 'name') {
					aVal = (a.name || '').toLowerCase();
					bVal = (b.name || '').toLowerCase();
				} else if (currentState.sort.key === 'role') {
					aVal = a.role || '';
					bVal = b.role || '';
				} else if (currentState.sort.key === 'status') {
					aVal = a.status || '';
					bVal = b.status || '';
				} else if (currentState.sort.key === 'created_at') {
					aVal = new Date(a.created_at || 0);
					bVal = new Date(b.created_at || 0);
				} else {
					return 0;
				}

				// Handle date sorting
				if (currentState.sort.key === 'created_at') {
					return currentState.sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
				} else {
					// Text sorting
					if (currentState.sort.dir === 'asc') {
						return aVal.localeCompare(bVal);
					} else {
						return bVal.localeCompare(aVal);
					}
				}
			});
		} catch (error) {
			console.error('Error sorting users:', error);
		}
	}

	// Store all users data for pagination
	allUsersData = users;

	// Render first page
	renderUsersPage(currentUsersPage, options);
}

/**
 * Render a specific page of users
 */
function renderUsersPage(page, options) {
	const { formatDate, updateSortHeaders } = options;
	const tbody = document.getElementById('usersTbody');
	if (!tbody) return;

	// Clear table
	tbody.innerHTML = '';

	// Calculate pagination
	const totalUsers = allUsersData.length;
	const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
	const startIndex = (page - 1) * USERS_PER_PAGE;
	const endIndex = Math.min(startIndex + USERS_PER_PAGE, totalUsers);
	const pageUsers = allUsersData.slice(startIndex, endIndex);

	console.log(`Rendering page ${page} of ${totalPages} (${pageUsers.length} users)`);

	// Render users for this page
	tbody.innerHTML = pageUsers.map(user => {
		const createdBy = user.created_by === 'system' ? 'System' :
			users.find(u => u.id === user.created_by)?.name || 'Unknown';

		return `
			<tr>
				<td data-sort="${user.name}">${user.name}</td>
				<td data-sort="${user.email}">${user.email}</td>
				<td data-sort="${user.role}">
					<span class="role-badge role-${user.role}">${user.role.replace('_', ' ')}</span>
				</td>
				<td data-sort="${user.status}">
					<span class="user-status ${user.status}">${user.status}</span>
				</td>
				<td data-sort="${user.created_at}">${formatDate(user.created_at)}</td>
				<td>
					<div class="user-actions">
						<button class="btn btn-secondary btn-small" onclick="editUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
							</svg>
							Edit
						</button>
						<button class="btn btn-secondary btn-small" onclick="changePassword('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
							</svg>
							Password
						</button>
						<button class="btn btn-danger btn-small" onclick="deleteUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
							</svg>
							Delete
						</button>
					</div>
				</td>
			</tr>
		`;
	}).join('');

	// Update pagination controls
	updateUsersPagination(page, totalPages, totalUsers);

	// Update sort headers
	updateSortHeaders('usersTable');

	console.log(`Rendered ${pageUsers.length} users (page ${page} of ${totalPages})`);
}

/**
 * Update users pagination controls
 */
function updateUsersPagination(currentPage, totalPages, totalUsers) {
	const paginationDiv = document.getElementById('usersPagination');
	const prevBtn = document.getElementById('usersPrevBtn');
	const nextBtn = document.getElementById('usersNextBtn');
	const pageInfo = document.getElementById('usersPageInfo');

	if (!paginationDiv || !prevBtn || !nextBtn || !pageInfo) return;

	// Show/hide pagination based on total users
	if (totalUsers <= USERS_PER_PAGE) {
		paginationDiv.style.display = 'none';
		return;
	}

	paginationDiv.style.display = 'block';

	// Update page info
	const startIndex = (currentPage - 1) * USERS_PER_PAGE + 1;
	const endIndex = Math.min(currentPage * USERS_PER_PAGE, totalUsers);
	pageInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalUsers} users (Page ${currentPage} of ${totalPages})`;

	// Enable/disable buttons
	prevBtn.disabled = currentPage === 1;
	nextBtn.disabled = currentPage === totalPages;

	// Remove old event listeners by cloning
	const newPrevBtn = prevBtn.cloneNode(true);
	const newNextBtn = nextBtn.cloneNode(true);
	prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
	nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

	// Add new event listeners
	newPrevBtn.addEventListener('click', () => {
		if (currentUsersPage > 1) {
			currentUsersPage--;
			renderUsersPage(currentUsersPage, { formatDate: window.formatDate, updateSortHeaders: window.updateSortHeaders });
		}
	});

	newNextBtn.addEventListener('click', () => {
		if (currentUsersPage < totalPages) {
			currentUsersPage++;
			renderUsersPage(currentUsersPage, { formatDate: window.formatDate, updateSortHeaders: window.updateSortHeaders });
		}
	});
}

export function renderAuditLog(options) {
	const { realAuditLog, formatDate } = options;

	const auditLog = document.getElementById('auditLog');
	if (!auditLog) return;

	// Use real audit log from Supabase (no mock data fallback)
	const logs = realAuditLog.value.length > 0 ? realAuditLog.value : [];

	// Store all audit log data for pagination
	allAuditLogData = logs;

	// Render first page
	renderAuditLogPage(currentAuditLogPage, options);
}

/**
 * Render a specific page of audit log entries
 */
function renderAuditLogPage(page, options) {
	const { formatDate } = options;
	const auditLog = document.getElementById('auditLog');
	if (!auditLog) return;

	// Clear audit log
	auditLog.innerHTML = '';

	// Calculate pagination
	const totalEntries = allAuditLogData.length;
	const totalPages = Math.ceil(totalEntries / AUDIT_ENTRIES_PER_PAGE);
	const startIndex = (page - 1) * AUDIT_ENTRIES_PER_PAGE;
	const endIndex = Math.min(startIndex + AUDIT_ENTRIES_PER_PAGE, totalEntries);
	const pageEntries = allAuditLogData.slice(startIndex, endIndex);

	console.log(`Rendering audit log page ${page} of ${totalPages} (${pageEntries.length} entries)`);

	// Render audit entries for this page
	auditLog.innerHTML = pageEntries.map(entry => {
		const actionIcons = {
			user_created: '👤',
			user_updated: '✏️',
			user_deleted: '🗑️',
			role_changed: '🔄',
			password_changed: '🔐'
		};

		return `
			<div class="audit-entry">
				<div class="audit-icon ${entry.action}">
					${actionIcons[entry.action] || '📝'}
				</div>
				<div class="audit-content">
					<div class="audit-action">${entry.details}</div>
					<div class="audit-details">
						User: ${entry.user_name} (${entry.user_email}) |
						By: ${entry.performed_by_name}
					</div>
				</div>
				<div class="audit-timestamp">${formatDate(entry.timestamp)}</div>
			</div>
		`;
	}).join('');

	// Update pagination controls
	updateAuditLogPagination(page, totalPages, totalEntries);

	console.log(`Rendered ${pageEntries.length} audit entries (page ${page} of ${totalPages})`);
}

/**
 * Update audit log pagination controls
 */
function updateAuditLogPagination(currentPage, totalPages, totalEntries) {
	const paginationDiv = document.getElementById('auditLogPagination');
	const prevBtn = document.getElementById('auditLogPrevBtn');
	const nextBtn = document.getElementById('auditLogNextBtn');
	const pageInfo = document.getElementById('auditLogPageInfo');

	if (!paginationDiv || !prevBtn || !nextBtn || !pageInfo) return;

	// Show/hide pagination based on total entries
	if (totalEntries <= AUDIT_ENTRIES_PER_PAGE) {
		paginationDiv.style.display = 'none';
		return;
	}

	paginationDiv.style.display = 'block';

	// Update page info
	const startIndex = (currentPage - 1) * AUDIT_ENTRIES_PER_PAGE + 1;
	const endIndex = Math.min(currentPage * AUDIT_ENTRIES_PER_PAGE, totalEntries);
	pageInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalEntries} entries (Page ${currentPage} of ${totalPages})`;

	// Enable/disable buttons
	prevBtn.disabled = currentPage === 1;
	nextBtn.disabled = currentPage === totalPages;

	// Remove old event listeners by cloning
	const newPrevBtn = prevBtn.cloneNode(true);
	const newNextBtn = nextBtn.cloneNode(true);
	prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
	nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

	// Add new event listeners
	newPrevBtn.addEventListener('click', () => {
		if (currentAuditLogPage > 1) {
			currentAuditLogPage--;
			renderAuditLogPage(currentAuditLogPage, { formatDate: window.formatDate });
		}
	});

	newNextBtn.addEventListener('click', () => {
		if (currentAuditLogPage < totalPages) {
			currentAuditLogPage++;
			renderAuditLogPage(currentAuditLogPage, { formatDate: window.formatDate });
		}
	});
}

