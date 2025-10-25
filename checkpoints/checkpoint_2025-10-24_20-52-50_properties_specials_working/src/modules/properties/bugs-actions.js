/**
 * Bug Tracker Actions Module
 * Handles bug editing and field change actions
 */

/**
 * Save changes to a bug (status and priority)
 * @param {string} bugId - The bug ID
 * @param {Object} options - Dependencies
 * @param {Object} options.api - API object for database operations
 * @param {Function} options.toast - Toast notification function
 * @param {Function} options.renderBugs - Function to refresh bugs table
 */
export async function saveBugChanges(bugId, options) {
	const { api, toast, renderBugs } = options;
	
	try {
		const statusSelect = document.querySelector(`.bug-status-select[data-bug-id="${bugId}"]`);
		const prioritySelect = document.querySelector(`.bug-priority-select[data-bug-id="${bugId}"]`);

		if (!statusSelect || !prioritySelect) {
			toast('Could not find bug fields to update', 'error');
			return;
		}

		const updates = {
			status: statusSelect.value,
			priority: prioritySelect.value,
			updated_at: new Date().toISOString()
		};

		await api.updateBug(bugId, updates);
		toast('Bug updated successfully!', 'success');

		// Hide save button
		const saveBtn = document.querySelector(`.save-bug[data-id="${bugId}"]`);
		if (saveBtn) {
			saveBtn.style.display = 'none';
		}

		// Refresh the bugs table
		renderBugs();
	} catch (error) {
		toast('Error updating bug: ' + error.message, 'error');
	}
}

/**
 * Handle bug field change (show save button)
 * @param {string} bugId - The bug ID
 */
export function handleBugFieldChange(bugId) {
	// Show save button when fields change
	const saveBtn = document.querySelector(`.save-bug[data-id="${bugId}"]`);
	if (saveBtn) {
		saveBtn.style.display = 'inline-block';
	}
}

