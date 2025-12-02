// Bulk Actions Module
// Handles bulk operations on listings (mark unavailable, delete, etc.)

export function updateBulkActionsBar(options) {
	const { state } = options;

	// Look for unit checkboxes (the actual checkboxes in the listings table)
	const selectedCount = document.querySelectorAll('.unit-checkbox:checked').length;
	const bulkActionsBar = document.getElementById('bulkActionsBar');
	const bulkActionsCount = document.getElementById('bulkActionsCount');
	const buildShowcaseBtn = document.getElementById('buildShowcaseBtn');
	const bulkMarkUnavailableBtn = document.getElementById('bulkMarkUnavailableBtn');
	const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

	// Show/hide the floating bulk actions bar
	if (bulkActionsBar) {
		bulkActionsBar.style.display = selectedCount > 0 ? 'block' : 'none';
	}

	// Update count display
	if (bulkActionsCount) {
		bulkActionsCount.textContent = selectedCount > 0 ? `${selectedCount} selected` : '0 selected';
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

	// Get selected unit checkboxes
	const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
	const selectedUnitIds = Array.from(checkboxes).map(cb => cb.dataset.unitId);

	if (selectedUnitIds.length === 0) {
		toast('No units selected', 'error');
		return;
	}

	if (!confirm(`Mark ${selectedUnitIds.length} unit(s) as unavailable?`)) {
		return;
	}

	try {
		// Update each unit's availability status
		for (const unitId of selectedUnitIds) {
			await SupabaseAPI.updateUnit(unitId, {
				is_available: false,
				updated_at: new Date().toISOString()
			});
		}

		// Show success message
		toast(`${selectedUnitIds.length} unit(s) marked as unavailable`, 'success');

		// Clear selections and refresh
		checkboxes.forEach(cb => cb.checked = false);
		updateBulkActionsBar({ state: window.state });
		await renderListings();
	} catch (error) {
		console.error('Error marking units as unavailable:', error);
		toast(`Error: ${error.message}`, 'error');
	}
}

export async function bulkDeleteListings(options) {
	const { SupabaseAPI, toast, renderListings } = options;

	console.log('bulkDeleteListings called!');
	// Get selected unit checkboxes
	const checkboxes = document.querySelectorAll('.unit-checkbox:checked');
	const selectedUnitIds = Array.from(checkboxes).map(cb => cb.dataset.unitId);

	console.log('Selected unit IDs for deletion:', selectedUnitIds);

	if (selectedUnitIds.length === 0) {
		toast('No units selected', 'error');
		return;
	}

	if (!confirm(`Are you sure you want to permanently delete ${selectedUnitIds.length} unit(s)? This action cannot be undone.`)) {
		return;
	}

	try {
		console.log('Starting bulk delete...');

		// Delete each unit
		for (const unitId of selectedUnitIds) {
			console.log('Deleting unit:', unitId);
			await SupabaseAPI.deleteUnit(unitId);
		}

		console.log('Bulk delete completed successfully');

		// Show success message
		toast(`${selectedUnitIds.length} unit(s) deleted successfully`, 'success');

		// Clear selections and refresh
		checkboxes.forEach(cb => cb.checked = false);
		updateBulkActionsBar({ state: window.state });
		await renderListings();
	} catch (error) {
		console.error('Error deleting units:', error);
		toast(`Error: ${error.message}`, 'error');
	}
}

export function updateBuildShowcaseButton() {
	// Look for unit checkboxes (the actual checkboxes in the listings table)
	const selectedCount = document.querySelectorAll('.unit-checkbox:checked').length;
	const buildBtn = document.getElementById('buildShowcaseBtn');

	if (buildBtn) {
		buildBtn.disabled = selectedCount === 0;
		buildBtn.textContent = selectedCount > 0 ? `Build Showcase (${selectedCount})` : 'Build Showcase';
	}

	// Update bulk actions bar visibility
	updateBulkActionsBar({ state: window.state });
}

