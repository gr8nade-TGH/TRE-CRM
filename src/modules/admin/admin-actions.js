// Admin Action Functions - EXACT COPY from script.js lines 6698-6772

export function editUser(userId, options) {
	const { realUsers, showModal, currentUser } = options;

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

	// Populate agent profile fields if user is an agent
	const agentProfileFields = document.getElementById('agentProfileFields');
	if (user.role.toLowerCase() === 'agent') {
		if (agentProfileFields) {
			agentProfileFields.style.display = 'block';

			// Populate headshot
			const headshotPreview = document.getElementById('headshotPreview');
			const headshotUrlInput = document.getElementById('userHeadshotUrl');
			if (user.headshot_url) {
				headshotPreview.innerHTML = `<img src="${user.headshot_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="Headshot">`;
				if (headshotUrlInput) headshotUrlInput.value = user.headshot_url;
			} else {
				headshotPreview.innerHTML = '<span style="font-size: 32px; color: #9ca3af;">👤</span>';
				if (headshotUrlInput) headshotUrlInput.value = '';
			}

			// Populate bio
			const bioTextarea = document.getElementById('userBio');
			const bioCharCount = document.getElementById('bioCharCount');
			if (bioTextarea) {
				bioTextarea.value = user.bio || '';
				if (bioCharCount) bioCharCount.textContent = (user.bio || '').length;
			}

			// Populate social media URLs
			const facebookInput = document.getElementById('userFacebook');
			const instagramInput = document.getElementById('userInstagram');
			const xInput = document.getElementById('userX');
			if (facebookInput) facebookInput.value = user.facebook_url || '';
			if (instagramInput) instagramInput.value = user.instagram_url || '';
			if (xInput) xInput.value = user.x_url || '';
		}
	} else {
		if (agentProfileFields) agentProfileFields.style.display = 'none';
	}

	// Determine if current user can change this user's password
	const canChangePassword = checkPasswordChangePermission(currentUser, user);

	// Show/hide password fields based on permissions
	const passwordFields = document.getElementById('userPasswordFields');
	const passwordWarning = document.getElementById('userPasswordWarning');

	if (canChangePassword) {
		if (passwordFields) passwordFields.style.display = 'block';
		if (passwordWarning) passwordWarning.style.display = 'none';
	} else {
		if (passwordFields) passwordFields.style.display = 'none';
		if (passwordWarning) {
			passwordWarning.style.display = 'block';
			passwordWarning.textContent = 'You do not have permission to change this user\'s password.';
		}
	}

	showModal('userModal');
}

/**
 * Check if current user has permission to change target user's password
 * @param {Object} currentUser - The logged-in user
 * @param {Object} targetUser - The user being edited (full user object)
 * @returns {boolean} - True if current user can change target user's password
 */
function checkPasswordChangePermission(currentUser, targetUser) {
	if (!currentUser || !targetUser) return false;

	// User can always change their own password
	if (currentUser.id === targetUser.id) {
		return true;
	}

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

