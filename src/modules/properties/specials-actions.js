// Specials Actions - CRUD operations for specials
// Extracted from script.js lines 208-286

/**
 * Save a new special from the Add Special modal
 */
export async function saveNewSpecial(options) {
	const { api, toast, hideModal, renderSpecials, state } = options;

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

	// Generate unique ID
	const specialId = `special_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	// Map form fields to database schema
	// Database expects: id, property_id, property_name, market, title, description, valid_from, valid_until, active, featured, terms, created_by
	// Form provides: property_name, current_special (title), commission_rate (description), expiration_date (valid_until)
	const newSpecial = {
		id: specialId,
		property_id: null, // Will be set if we can find matching property
		property_name: propertyName,
		market: state?.market || 'San Antonio', // Default market
		title: currentSpecial, // Map current_special to title
		description: `Commission: ${commissionRate}`, // Map commission_rate to description
		valid_from: new Date().toISOString().split('T')[0], // Today
		valid_until: expirationDate, // Map expiration_date to valid_until
		active: true,
		featured: false,
		terms: null,
		created_by: window.currentUser?.id || state?.agentId // Add user ID for RLS policy
	};

	try {
		// Create special via API
		await api.createSpecial(newSpecial);
		toast('Special added successfully!', 'success');
		hideModal('addSpecialModal');
		await renderSpecials(); // Refresh the specials list
	} catch (error) {
		console.error('Error creating special:', error);
		toast('Error adding special: ' + error.message, 'error');
	}
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

