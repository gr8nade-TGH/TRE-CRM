/**
 * Profile Actions Module
 * Handles user profile updates, password changes, and notification preferences
 */

/**
 * Update user profile (display name)
 * @param {Object} options - Options object
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function updateProfile(options) {
	const { toast } = options;
	
	try {
		const displayName = document.getElementById('profileDisplayName').value.trim();
		
		if (!displayName) {
			toast('Display name is required', 'error');
			return;
		}
		
		console.log('Updating profile with name:', displayName);
		
		// Update user metadata in Supabase Auth
		const { data, error } = await window.supabase.auth.updateUser({
			data: {
				name: displayName
			}
		});
		
		if (error) {
			console.error('Error updating profile:', error);
			toast('Failed to update profile: ' + error.message, 'error');
			return;
		}
		
		console.log('✅ Profile updated successfully:', data);
		
		// Update the current user object
		window.currentUser = data.user;
		
		// Update the header display
		const headerUserEmail = document.getElementById('headerUserEmail');
		if (headerUserEmail) {
			headerUserEmail.textContent = displayName;
		}
		
		// Update global state userName
		if (window.state) {
			window.state.userName = displayName;
		}
		
		toast('Profile updated successfully!');
		
	} catch (error) {
		console.error('Error updating profile:', error);
		toast('Failed to update profile', 'error');
	}
}

/**
 * Validate password fields in real-time
 * @returns {boolean} - True if valid, false otherwise
 */
export function validatePasswordFields() {
	const newPassword = document.getElementById('profileNewPassword').value;
	const confirmPassword = document.getElementById('profileConfirmPassword').value;
	const newPasswordField = document.getElementById('newPasswordField');
	const confirmPasswordField = document.getElementById('confirmPasswordField');

	let isValid = true;

	// Reset validation states
	newPasswordField.classList.remove('error', 'success');
	confirmPasswordField.classList.remove('error', 'success');

	// If both fields are empty, it's valid (user doesn't want to change password)
	if (!newPassword && !confirmPassword) {
		return true;
	}

	// Validate new password length
	if (newPassword && newPassword.length < 6) {
		newPasswordField.classList.add('error');
		isValid = false;
	} else if (newPassword) {
		newPasswordField.classList.add('success');
	}

	// Validate password match
	if (confirmPassword && newPassword !== confirmPassword) {
		confirmPasswordField.classList.add('error');
		isValid = false;
	} else if (confirmPassword && newPassword === confirmPassword && newPassword.length >= 6) {
		confirmPasswordField.classList.add('success');
	}

	return isValid;
}

/**
 * Change user password
 * @param {Object} options - Options object
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<boolean>} - True if password was changed, false otherwise
 */
export async function changePassword(options) {
	const { toast } = options;

	try {
		const newPassword = document.getElementById('profileNewPassword').value;
		const confirmPassword = document.getElementById('profileConfirmPassword').value;

		// If no password provided, skip password change
		if (!newPassword && !confirmPassword) {
			return false;
		}

		// Validate before submission
		if (!validatePasswordFields()) {
			toast('Please fix password validation errors', 'error');
			return false;
		}

		// Final validation
		if (!newPassword || !confirmPassword) {
			toast('Please fill in all password fields', 'error');
			return false;
		}

		if (newPassword.length < 6) {
			toast('Password must be at least 6 characters', 'error');
			return false;
		}

		if (newPassword !== confirmPassword) {
			toast('Passwords do not match', 'error');
			return false;
		}

		console.log('Changing password...');

		// Update password in Supabase Auth
		const { data, error } = await window.supabase.auth.updateUser({
			password: newPassword
		});

		if (error) {
			console.error('Error changing password:', error);
			toast('Failed to change password: ' + error.message, 'error');
			return false;
		}

		console.log('✅ Password changed successfully');

		// Clear password fields
		document.getElementById('profileNewPassword').value = '';
		document.getElementById('profileConfirmPassword').value = '';

		// Clear validation states
		document.getElementById('newPasswordField').classList.remove('error', 'success');
		document.getElementById('confirmPasswordField').classList.remove('error', 'success');

		toast('Password changed successfully! Please log in again with your new password.', 'success');

		// Sign out user after password change to force re-login
		setTimeout(async () => {
			await window.supabase.auth.signOut();
			window.location.reload();
		}, 2000);

		return true;

	} catch (error) {
		console.error('Error changing password:', error);
		toast('Failed to change password', 'error');
		return false;
	}
}

/**
 * Update notification preferences
 * @param {Object} options - Options object
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function updateNotificationPreferences(options) {
	const { toast } = options;
	
	try {
		const emailNotifications = document.getElementById('profileEmailNotifications').checked;
		
		console.log('Updating notification preferences:', { emailNotifications });
		
		// Update user metadata in Supabase Auth
		const { data, error } = await window.supabase.auth.updateUser({
			data: {
				notification_preferences: {
					email_notifications: emailNotifications
				}
			}
		});
		
		if (error) {
			console.error('Error updating notification preferences:', error);
			toast('Failed to update preferences: ' + error.message, 'error');
			return;
		}
		
		console.log('✅ Notification preferences updated successfully');
		
		// Update the current user object
		window.currentUser = data.user;
		
		toast('Notification preferences updated!');
		
	} catch (error) {
		console.error('Error updating notification preferences:', error);
		toast('Failed to update preferences', 'error');
	}
}

/**
 * Open profile modal
 * @param {Object} options - Options object
 * @param {Function} options.showModal - Show modal function
 * @returns {void}
 */
export function openProfileModal(options) {
	const { showModal } = options;

	// Get current user data
	const user = window.currentUser;
	if (!user) {
		console.error('No current user found');
		return;
	}

	// Populate form with current values
	const displayName = user.user_metadata?.name || user.email;
	const email = user.email;
	const role = user.user_metadata?.role || 'agent';
	const emailNotifications = user.user_metadata?.notification_preferences?.email_notifications ?? true;

	document.getElementById('profileDisplayName').value = displayName;
	document.getElementById('profileEmail').value = email;
	document.getElementById('profileRole').value = role.replace('_', ' ');
	document.getElementById('profileEmailNotifications').checked = emailNotifications;

	// Clear password fields and validation states
	const newPasswordInput = document.getElementById('profileNewPassword');
	const confirmPasswordInput = document.getElementById('profileConfirmPassword');
	const newPasswordField = document.getElementById('newPasswordField');
	const confirmPasswordField = document.getElementById('confirmPasswordField');

	newPasswordInput.value = '';
	confirmPasswordInput.value = '';
	newPasswordField.classList.remove('error', 'success');
	confirmPasswordField.classList.remove('error', 'success');

	// Add real-time validation listeners (remove old ones first to avoid duplicates)
	newPasswordInput.removeEventListener('input', validatePasswordFields);
	confirmPasswordInput.removeEventListener('input', validatePasswordFields);
	newPasswordInput.addEventListener('input', validatePasswordFields);
	confirmPasswordInput.addEventListener('input', validatePasswordFields);

	// Show the modal
	showModal('profileModal');
}

