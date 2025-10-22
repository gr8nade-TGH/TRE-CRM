// Bulk Actions Module
// Handles bulk operations on listings (mark unavailable, delete, etc.)

export function updateBulkActionsBar(options) {
	const { state } = options;
	
	const selectedCount = document.querySelectorAll('.listing-checkbox:checked').length;
	const bulkActionsCount = document.getElementById('bulkActionsCount');
	const buildShowcaseBtn = document.getElementById('buildShowcaseBtn');
	const bulkMarkUnavailableBtn = document.getElementById('bulkMarkUnavailableBtn');
	const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

	// Update count display
	if (bulkActionsCount) {
		if (selectedCount > 0) {
			bulkActionsCount.textContent = `${selectedCount} selected`;
			bulkActionsCount.style.display = 'inline-flex';
		} else {
			bulkActionsCount.textContent = '';
			bulkActionsCount.style.display = 'none';
		}
	}

	// Enable/disable buttons based on selection
	const hasSelection = selectedCount > 0;
	const isManagerOrSuperUser = state.role === 'manager' || state.role === 'super_user';

	if (buildShowcaseBtn) {
		buildShowcaseBtn.disabled = !hasSelection;
	}

	if (bulkMarkUnavailableBtn) {
		bulkMarkUnavailableBtn.disabled = !hasSelection || !isManagerOrSuperUser;
	}

	if (bulkDeleteBtn) {
		bulkDeleteBtn.disabled = !hasSelection || !isManagerOrSuperUser;
	}
}

export async function bulkMarkAsUnavailable(options) {
	const { SupabaseAPI, toast, renderListings } = options;
	
	const checkboxes = document.querySelectorAll('.listing-checkbox:checked');
	const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.listingId);

	if (selectedIds.length === 0) {
		toast('No listings selected', 'error');
		return;
	}

	if (!confirm(`Mark ${selectedIds.length} listing(s) as unavailable?`)) {
		return;
	}

	try {
		// Update each listing's availability status
		for (const listingId of selectedIds) {
			await SupabaseAPI.updateProperty(listingId, {
				is_available: false,
				updated_at: new Date().toISOString()
			});
		}

		// Show success message
		toast(`${selectedIds.length} listing(s) marked as unavailable`, 'success');

		// Clear selections and refresh
		checkboxes.forEach(cb => cb.checked = false);
		updateBulkActionsBar({ state: window.state });
		await renderListings();
	} catch (error) {
		console.error('Error marking listings as unavailable:', error);
		toast(`Error: ${error.message}`, 'error');
	}
}

export async function bulkDeleteListings(options) {
	const { SupabaseAPI, toast, renderListings } = options;
	
	console.log('bulkDeleteListings called!');
	const checkboxes = document.querySelectorAll('.listing-checkbox:checked');
	const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.listingId);

	console.log('Selected IDs for deletion:', selectedIds);

	if (selectedIds.length === 0) {
		toast('No listings selected', 'error');
		return;
	}

	if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} listing(s)? This action cannot be undone.`)) {
		return;
	}

	try {
		console.log('Starting bulk delete...');

		// Delete each listing
		for (const listingId of selectedIds) {
			console.log('Deleting listing:', listingId);
			await SupabaseAPI.deleteProperty(listingId);
		}

		console.log('Bulk delete completed successfully');

		// Show success message
		toast(`${selectedIds.length} listing(s) deleted successfully`, 'success');

		// Clear selections and refresh
		checkboxes.forEach(cb => cb.checked = false);
		updateBulkActionsBar({ state: window.state });
		await renderListings();
	} catch (error) {
		console.error('Error deleting listings:', error);
		toast(`Error: ${error.message}`, 'error');
	}
}

export function updateBuildShowcaseButton() {
	const selectedCount = document.querySelectorAll('.listing-checkbox:checked').length;
	const buildBtn = document.getElementById('buildShowcaseBtn');
	
	if (buildBtn) {
		buildBtn.disabled = selectedCount === 0;
		buildBtn.textContent = selectedCount > 0 ? `Build Showcase (${selectedCount})` : 'Build Showcase';
	}

	// Update bulk actions bar visibility
	updateBulkActionsBar({ state: window.state });
}

