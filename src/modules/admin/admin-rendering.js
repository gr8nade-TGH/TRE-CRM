// Admin Rendering Functions - EXACT COPY from script.js lines 6543-6696

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

	tbody.innerHTML = users.map(user => {
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

	// Update sort headers
	updateSortHeaders('usersTable');
}

export function renderAuditLog(options) {
	const { realAuditLog, formatDate } = options;
	
	const auditLog = document.getElementById('auditLog');
	if (!auditLog) return;

	// Use real audit log from Supabase (no mock data fallback)
	const logs = realAuditLog.value.length > 0 ? realAuditLog.value : [];
	auditLog.innerHTML = logs.map(entry => {
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
}

