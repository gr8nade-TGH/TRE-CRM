// Admin API Functions - EXACT COPY from script.js lines 6383-6541

export async function loadUsers(options) {
	const { realUsers, renderUsersTable } = options;
	
	try {
		console.log('Loading users from Supabase...');

		// Call our serverless function to list users
		const response = await fetch('/api/list-users');

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch users');
		}

		const result = await response.json();
		realUsers.value = result.users || [];
		console.log('✅ Loaded users from Supabase:', realUsers.value.length);
		renderUsersTable();
	} catch (error) {
		console.error('Error loading users:', error);
		// Fall back to mock data on error
		realUsers.value = [];
		renderUsersTable();
	}
}

export async function loadAuditLog(options) {
	const { realAuditLog, renderAuditLog } = options;
	
	// Check if we're running locally or on production
	const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
		? 'http://localhost:3001/api'
		: null;

	if (!apiBase) {
		console.log('API_BASE not available, using mock data');
		realAuditLog.value = [];
		renderAuditLog();
		return;
	}

	try {
		const response = await fetch(`${apiBase}/audit-log`);
		if (!response.ok) throw new Error('Failed to fetch audit log');
		realAuditLog.value = await response.json();
		console.log('Loaded audit log from API:', realAuditLog.value.length);
		renderAuditLog();
	} catch (error) {
		console.error('Error loading audit log:', error);
		throw error;
	}
}

export async function createUser(userData, options) {
	const { loadUsers } = options;
	
	try {
		console.log('Creating user with Supabase:', userData);

		// Call our serverless function to create the user
		// This uses the service role key on the backend
		const response = await fetch('/api/create-user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: userData.email,
				password: userData.password,
				name: userData.name,
				role: userData.role
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create user');
		}

		const result = await response.json();
		console.log('✅ User created successfully:', result.user);

		// Reload users from Supabase to refresh the table
		await loadUsers();

		return result.user;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

export async function updateUser(userId, userData, options) {
	const { realUsers, renderUsersTable } = options;

	try {
		console.log('Updating user with Supabase:', userId, userData);

		// Call our serverless function to update the user
		const response = await fetch(`/api/update-user?userId=${userId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: userData.email,
				password: userData.password, // Optional - only sent if provided
				name: userData.name,
				role: userData.role
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update user');
		}

		const result = await response.json();
		console.log('✅ User updated successfully:', result.user);

		// Update local state
		const index = realUsers.value.findIndex(u => u.id === userId);
		if (index !== -1) {
			realUsers.value[index] = {
				...realUsers.value[index],
				...result.user
			};
		}

		renderUsersTable();

		// Return both user data and passwordChanged flag
		return {
			user: result.user,
			passwordChanged: result.passwordChanged
		};
	} catch (error) {
		console.error('Error updating user:', error);
		throw error;
	}
}

export async function deleteUserFromAPI(userId, options) {
	const { realUsers, renderUsersTable, loadAuditLog } = options;

	try {
		console.log('Deleting user with Supabase:', userId);

		// Call our serverless function to delete the user
		const response = await fetch(`/api/delete-user?userId=${userId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete user');
		}

		const result = await response.json();
		console.log('✅ User deleted successfully:', result);

		// Remove from local state
		realUsers.value = realUsers.value.filter(u => u.id !== userId);

		renderUsersTable();
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error deleting user:', error);
		throw error;
	}
}

export async function changeUserPassword(userId, newPassword, options) {
	const { loadAuditLog } = options;
	
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
			? 'http://localhost:3001/api'
			: null;
		if (!apiBase) throw new Error('API not available in production');

		const response = await fetch(`${apiBase}/users/${userId}/password`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				newPassword,
				updatedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to change password');
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error changing password:', error);
		throw error;
	}
}

