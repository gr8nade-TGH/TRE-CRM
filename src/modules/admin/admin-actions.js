// Admin Action Functions - EXACT COPY from script.js lines 6698-6772

export function editUser(userId, options) {
	const { realUsers, showModal } = options;
	
	console.log('editUser called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.value.length > 0 ? realUsers.value : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found:', userId);
		return;
	}

	document.getElementById('userModalTitle').textContent = 'Edit User';
	document.getElementById('userName').value = user.name;
	document.getElementById('userEmail').value = user.email;
	document.getElementById('userRole').value = user.role.toLowerCase();
	document.getElementById('userPassword').value = '';
	document.getElementById('userConfirmPassword').value = '';
	document.getElementById('userPassword').required = false;
	document.getElementById('userConfirmPassword').required = false;

	// Store user ID for update
	document.getElementById('userModal').setAttribute('data-user-id', userId);

	showModal('userModal');
}

export function changePassword(userId, options) {
	const { realUsers, showModal } = options;
	
	console.log('changePassword called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.value.length > 0 ? realUsers.value : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for password change:', userId);
		return;
	}

	document.getElementById('passwordModal').setAttribute('data-user-id', userId);
	showModal('passwordModal');
}

export async function deleteUser(userId, options) {
	const { realUsers, deleteUserFromAPI, renderUsersTable, renderAuditLog, toast } = options;
	
	console.log('deleteUser called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.value.length > 0 ? realUsers.value : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for deletion:', userId);
		return;
	}

	if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
		try {
			if (realUsers.value.length > 0) {
				// Use real API
				await deleteUserFromAPI(userId);
				toast('User deleted successfully');
			} else {
				// Fallback to mock data
				const userIndex = users.findIndex(u => u.id === userId);
				if (userIndex > -1) {
					users.splice(userIndex, 1);

					// Note: Audit log functionality removed for mock users
					// Real audit log is handled by Supabase

					renderUsersTable();
					renderAuditLog();
					toast('User deleted successfully');
				}
			}
	} catch (error) {
		console.error('Error deleting user:', error);
		toast('Error deleting user', 'error');
	}
	}
}

