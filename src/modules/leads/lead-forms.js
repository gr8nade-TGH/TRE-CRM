// Lead Forms - Form handling and submission for leads
// Extracted from script.js lines 95-205

/**
 * Save a new lead from the Add Lead modal
 */
export async function saveNewLead(options) {
	const { SupabaseAPI, state, toast, hideModal, renderLeads } = options;
	
	const name = document.getElementById('leadName').value.trim();
	const email = document.getElementById('leadEmail').value.trim();
	const phone = document.getElementById('leadPhone').value.trim();
	const status = document.getElementById('leadStatus').value;
	const health = document.getElementById('leadHealth').value;
	const source = document.getElementById('leadSource').value;
	const notes = document.getElementById('leadNotes').value.trim();

	// New fields from landing page
	const bestTime = document.getElementById('leadBestTime').value;
	const bedrooms = document.getElementById('leadBedrooms').value;
	const bathrooms = document.getElementById('leadBathrooms').value;
	const priceRange = document.getElementById('leadPriceRange').value;
	const areaOfTown = document.getElementById('leadAreaOfTown').value;
	const moveInDate = document.getElementById('leadMoveInDate').value;
	const creditHistory = document.getElementById('leadCreditHistory').value;
	const comments = document.getElementById('leadComments').value.trim();

	// Validation
	if (!name || !email || !phone) {
		toast('Please fill in all required fields (Name, Email, Phone)', 'error');
		return;
	}

	// Build preferences object
	const preferences = {
		bedrooms: bedrooms,
		bathrooms: bathrooms,
		priceRange: priceRange,
		areaOfTown: areaOfTown,
		moveInDate: moveInDate,
		creditHistory: creditHistory,
		bestTimeToCall: bestTime,
		comments: comments
	};

	// Create new lead object for Supabase
	// Note: 'notes' field doesn't exist in leads table - notes are stored in separate lead_notes table
	const now = new Date().toISOString();
	const newLead = {
		name: name,
		email: email,
		phone: phone,
		status: status,
		health_status: health,
		source: source,
		preferences: preferences, // Send as object, not string - Supabase JSONB will handle it
		assigned_agent_id: state.agentId || null,
		found_by_agent_id: state.agentId || null,
		submitted_at: now,
		created_at: now,
		updated_at: now,
		last_activity_at: now // Set last_activity_at to prevent "5 hours ago" timezone issue
	};

	try {
		// Insert into Supabase
		const { data, error } = await window.supabase
			.from('leads')
			.insert([newLead])
			.select();

		if (error) {
			console.error('❌ Error creating lead:', error);
			toast('Error adding lead: ' + error.message, 'error');
			return;
		}

		console.log('✅ Lead created:', data);

		const leadId = data[0].id;

		// Log the lead creation activity using the SupabaseAPI module
		try {
			await SupabaseAPI.createLeadActivity({
				lead_id: leadId,
				activity_type: 'lead_created',
				description: `Lead added through CRM by ${state.userName || 'Unknown'}`,
				metadata: {
					source: 'crm',
					initial_status: status,
					initial_health: health,
					agent_id: state.agentId,
					agent_name: state.userName || 'Unknown'
				},
				performed_by: null, // Don't use state.agentId - it's auth UUID, not public.users.id
				performed_by_name: state.userName || 'Unknown'
			});
			console.log('✅ Activity logged successfully');
		} catch (activityError) {
			console.error('⚠️ Failed to log activity:', activityError);
			// Don't fail the whole operation if activity logging fails
		}

		// If there are notes, add them to lead_notes table
		if (notes && notes.trim()) {
			const { error: notesError } = await window.supabase
				.from('lead_notes')
				.insert([{
					lead_id: leadId,
					content: notes,
					author_id: state.agentId,
					author_name: state.userName || 'Unknown'
				}]);

			if (notesError) {
				console.error('❌ Error adding note:', notesError);
				// Don't fail the whole operation if note fails
			}
		}

		toast('Lead added successfully!', 'success');
		hideModal('addLeadModal');

		// Refresh leads table
		await renderLeads();

	} catch (error) {
		console.error('❌ Error saving lead:', error);
		toast('Error adding lead. Please try again.', 'error');
	}
}

/**
 * Check if a lead with the same email or phone already exists
 * Legacy function - kept for backward compatibility
 * @param {string} email - Email to check
 * @param {string} phone - Phone to check
 * @returns {boolean} True if duplicate found
 */
export function checkDuplicateLead(email, phone, state) {
	const existingLeads = state.leads || [];

	return existingLeads.some(lead =>
		lead.email.toLowerCase() === email.toLowerCase() ||
		lead.phone === phone
	);
}

/**
 * Legacy API function - kept for backward compatibility
 * Note: This uses the old API_BASE pattern and should be migrated to Supabase
 */
export async function createLeadAPI(lead, options) {
	const { API_BASE, toast, hideModal, renderLeads } = options;
	
	try {
		const response = await fetch(`${API_BASE}/leads`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(lead)
		});

		if (response.ok) {
			toast('Lead added successfully!', 'success');
			hideModal('addLeadModal');
			renderLeads(); // Refresh the leads list
		} else {
			throw new Error('Failed to create lead');
		}
	} catch (error) {
		toast('Error adding lead: ' + error.message, 'error');
	}
}

