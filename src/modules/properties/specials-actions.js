// Specials Actions - CRUD operations for specials
// Extracted from script.js lines 208-286

/**
 * Save a new special from the Add Special modal
 */
export function saveNewSpecial(options) {
	const { api, toast, hideModal, renderSpecials } = options;
	
	const propertyName = document.getElementById('specialPropertyName').value.trim();
	const currentSpecial = document.getElementById('specialCurrentSpecial').value.trim();
	const commissionRate = document.getElementById('specialCommissionRate').value.trim();
	const expirationDate = document.getElementById('specialExpirationDate').value;

	// Validation
	if (!propertyName || !currentSpecial || !commissionRate || !expirationDate) {
		toast('Please fill in all required fields', 'error');
		return;
	}

	// Check if expiration date is in the past
	if (new Date(expirationDate) < new Date()) {
		toast('Expiration date cannot be in the past', 'error');
		return;
	}

	// Create new special
	const newSpecial = {
		property_name: propertyName,
		current_special: currentSpecial,
		commission_rate: commissionRate,
		expiration_date: expirationDate,
		agent_id: options.state?.currentAgent || 'agent_1', // Default agent
		agent_name: options.state?.role === 'agent' ? 'Current Agent' : 'Manager' // Will be updated with real name
	};

	// Create special via API
	api.createSpecial(newSpecial);
	toast('Special added successfully!', 'success');
	hideModal('addSpecialModal');
	renderSpecials(); // Refresh the specials list
}

/**
 * Delete a special
 * @param {string} specialId - ID of the special to delete
 */
export function deleteSpecial(specialId, options) {
	const { api, toast, renderSpecials } = options;
	
	if (confirm('Are you sure you want to delete this special? This action cannot be undone.')) {
		api.deleteSpecial(specialId);
		toast('Special deleted successfully!', 'success');
		renderSpecials(); // Refresh the specials list
	}
}

/**
 * Legacy API function - kept for backward compatibility
 * Note: This uses the old API_BASE pattern and should be migrated to Supabase
 */
export async function createSpecialAPI(special, options) {
	const { API_BASE, toast, hideModal, renderSpecials } = options;
	
	try {
		const response = await fetch(`${API_BASE}/specials`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(special)
		});

		if (response.ok) {
			toast('Special added successfully!', 'success');
			hideModal('addSpecialModal');
			renderSpecials(); // Refresh the specials list
		} else {
			throw new Error('Failed to create special');
		}
	} catch (error) {
		toast('Error adding special: ' + error.message, 'error');
	}
}

/**
 * Legacy API function - kept for backward compatibility
 * Note: This uses the old API_BASE pattern and should be migrated to Supabase
 */
export async function deleteSpecialAPI(specialId, options) {
	const { API_BASE, toast, renderSpecials } = options;
	
	try {
		const response = await fetch(`${API_BASE}/specials/${specialId}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			toast('Special deleted successfully!', 'success');
			renderSpecials(); // Refresh the specials list
		} else {
			throw new Error('Failed to delete special');
		}
	} catch (error) {
		toast('Error deleting special: ' + error.message, 'error');
	}
}

