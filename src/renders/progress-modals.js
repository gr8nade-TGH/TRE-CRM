/**
 * Progress Modal Rendering Module
 * Handles the step details modal for lead progress tracking
 */

/**
 * Show step details modal for a lead's progress step
 * @param {Object} lead - Lead object
 * @param {Object} step - Progress step object
 * @param {Object} deps - Dependencies
 * @param {Function} deps.getStepModalContent - Function to get modal content
 * @param {Function} deps.showModal - Function to show a modal
 * @param {Function} deps.toast - Toast notification function
 * @param {Object} deps.SupabaseAPI - Supabase API object
 */
export async function showStepDetails(lead, step, deps) {
	const { getStepModalContent, showModal, toast, SupabaseAPI } = deps;
	
	// Create modal if it doesn't exist
	let modal = document.getElementById('progressModal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'progressModal';
		modal.className = 'progress-modal';
		modal.innerHTML = `
			<div class="progress-modal-content">
				<button class="progress-modal-close">&times;</button>
				<div class="modal-title"></div>
				<div class="modal-content"></div>
			</div>
		`;
		document.body.appendChild(modal);

		// Add close event listeners
		modal.querySelector('.progress-modal-close').addEventListener('click', () => {
			modal.classList.remove('show');
		});

		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.classList.remove('show');
			}
		});
	}

	// Update modal content
	const title = modal.querySelector('.modal-title');
	const content = modal.querySelector('.modal-content');

	title.textContent = step.label;

	// Show loading state
	content.innerHTML = '<div class="modal-loading">Loading...</div>';

	// Show modal
	modal.classList.add('show');

	// Load content asynchronously
	try {
		const modalContent = await getStepModalContent(lead, step);
		content.innerHTML = modalContent;

		// Add event listeners for guest card workflow buttons (Step 4)
		if (step.id === 4) {
			// Add Contact Info buttons
			content.querySelectorAll('.add-contact-btn').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const propertyId = e.target.dataset.propertyId;
					const communityName = e.target.dataset.communityName;

					// Open the property contact modal with pre-filled property
					const property = await SupabaseAPI.getProperty(propertyId);
					document.getElementById('contactPropertySelect').value = communityName;
					document.getElementById('contactName').value = property.contact_name || '';
					document.getElementById('contactEmail').value = property.contact_email || '';
					document.getElementById('contactPhone').value = property.contact_phone || '';
					document.getElementById('contactOfficeHours').value = property.office_hours || '';
					document.getElementById('contactNotes').value = property.contact_notes || '';

					// Disable property dropdown (can't change property when editing)
					document.getElementById('contactPropertySelect').disabled = true;

					// Show the modal
					showModal('addPropertyContactModal');

					// After saving, refresh the guest card modal
					const saveBtn = document.getElementById('savePropertyContactBtn');
					const refreshHandler = async () => {
						// Re-enable dropdown
						document.getElementById('contactPropertySelect').disabled = false;
						// Refresh the step modal
						await showStepDetails(lead, step, deps);
						// Remove this handler
						saveBtn.removeEventListener('click', refreshHandler);
					};
					saveBtn.addEventListener('click', refreshHandler);
				});
			});

			// Preview Guest Card buttons
			content.querySelectorAll('.preview-guest-card-btn').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const propertyId = e.target.dataset.propertyId;
					const property = await SupabaseAPI.getProperty(propertyId);
					const guestCardUrl = `https://tre-crm.vercel.app/guest-card.html?lead=${encodeURIComponent(lead.leadName || lead.name)}&property=${encodeURIComponent(property.community_name || property.name)}`;
					window.open(guestCardUrl, '_blank');
				});
			});

			// Send Guest Card buttons
			content.querySelectorAll('.send-guest-card-btn').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const propertyId = e.target.dataset.propertyId;
					const leadId = e.target.dataset.leadId;

					try {
						const property = await SupabaseAPI.getProperty(propertyId);

						// Log the guest card sent activity
						await SupabaseAPI.logLeadActivity({
							lead_id: leadId,
							activity_type: 'guest_card_sent',
							description: `Guest card sent to ${property.community_name || property.name}`,
							metadata: {
								property_id: propertyId,
								property_name: property.community_name || property.name,
								contact_email: property.contact_email,
								contact_phone: property.contact_phone
							}
						});

						toast(`✅ Guest card sent to ${property.community_name || property.name}!`, 'success');

						// Refresh the modal to show updated status
						await showStepDetails(lead, step, deps);
					} catch (error) {
						console.error('Error sending guest card:', error);
						toast('Error sending guest card. Please try again.', 'error');
					}
				});
			});
		}
	} catch (error) {
		console.error('Error loading step details:', error);
		content.innerHTML = '<div class="modal-error">Error loading details. Please try again.</div>';
	}
}

