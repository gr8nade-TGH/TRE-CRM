/**
 * Lease Confirmation Modal Module
 * Handles the modal display for lease confirmation status and form
 * 
 * @module documents/lease-confirmation-modal
 */

import { createLeaseConfirmationForm, validateLeaseForm, getLeaseFormData } from './lease-confirmation-form.js';
import { createLeaseConfirmationPreview } from './lease-confirmation-preview.js';

/**
 * Show the lease confirmation modal
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @param {Object} deps - Dependencies
 * @param {Object} deps.SupabaseAPI - Supabase API object
 * @param {Function} deps.toast - Toast notification function
 */
export async function showLeaseConfirmationModal(lead, property, deps) {
	const { SupabaseAPI, toast } = deps;

	// Check if lease has been sent
	const leaseSent = lead.lease?.sent || false;

	// Create modal
	const modal = document.createElement('div');
	modal.className = 'progress-modal active';
	modal.id = 'leaseConfirmationModal';

	modal.innerHTML = `
		<div class="progress-modal-content lease-confirmation-modal-content">
			<div class="progress-modal-header">
				<h3>Lease Confirmation - ${lead.leadName}</h3>
				<button class="close-modal" id="closeLeaseModal">&times;</button>
			</div>
			<div class="progress-modal-body" id="leaseModalBody">
				${leaseSent ? createLeaseSentView(lead) : createLeaseNotSentView(lead, property)}
			</div>
		</div>
	`;

	document.body.appendChild(modal);

	// Add event listeners
	setupModalEventListeners(modal, lead, property, deps);
}

/**
 * Create the view when lease has been sent
 * @param {Object} lead - Lead object
 * @returns {string} HTML string
 */
function createLeaseSentView(lead) {
	return `
		<div class="lease-status-view">
			<div class="status-icon success">✓</div>
			<h4>Lease Confirmation Sent</h4>
			<p>The lease confirmation has been sent to the property.</p>
			<div class="lease-details">
				<div class="detail-row">
					<span class="label">Sent Date:</span>
					<span class="value">${new Date(lead.lease.sentDate || Date.now()).toLocaleDateString()}</span>
				</div>
				<div class="detail-row">
					<span class="label">Property:</span>
					<span class="value">${lead.property?.name || 'N/A'}</span>
				</div>
				<div class="detail-row">
					<span class="label">Tenant:</span>
					<span class="value">${lead.leadName}</span>
				</div>
			</div>
			<div class="lease-actions">
				<button class="btn btn-secondary" id="viewLeaseConfirmation">View Confirmation</button>
				<button class="btn btn-primary" id="resendLeaseConfirmation">Resend</button>
			</div>
		</div>
	`;
}

/**
 * Create the view when lease has not been sent
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @returns {string} HTML string
 */
function createLeaseNotSentView(lead, property) {
	return `
		<div class="lease-status-view">
			<div class="status-icon pending">⏳</div>
			<h4>Lease Confirmation Not Sent</h4>
			<p>Fill out the lease confirmation form and send it to the property.</p>
			<div class="lease-actions">
				<button class="btn btn-primary" id="fillSendLease">Fill & Send</button>
			</div>
		</div>
	`;
}

/**
 * Setup event listeners for the modal
 * @param {HTMLElement} modal - Modal element
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @param {Object} deps - Dependencies
 */
function setupModalEventListeners(modal, lead, property, deps) {
	const { SupabaseAPI, toast } = deps;

	// Close modal
	const closeBtn = modal.querySelector('#closeLeaseModal');
	closeBtn?.addEventListener('click', () => {
		modal.remove();
	});

	// Click outside to close
	modal.addEventListener('click', (e) => {
		if (e.target === modal) {
			modal.remove();
		}
	});

	// Fill & Send button
	const fillSendBtn = modal.querySelector('#fillSendLease');
	fillSendBtn?.addEventListener('click', () => {
		showLeaseForm(modal, lead, property, deps);
	});

	// View Confirmation button
	const viewBtn = modal.querySelector('#viewLeaseConfirmation');
	viewBtn?.addEventListener('click', async () => {
		await viewLeaseConfirmation(lead, deps);
	});

	// Resend button
	const resendBtn = modal.querySelector('#resendLeaseConfirmation');
	resendBtn?.addEventListener('click', async () => {
		await resendLeaseConfirmation(lead, deps);
	});
}

/**
 * Show the lease confirmation form
 * @param {HTMLElement} modal - Modal element
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @param {Object} deps - Dependencies
 */
function showLeaseForm(modal, lead, property, deps) {
	const { SupabaseAPI, toast } = deps;

	// Replace modal body with form
	const modalBody = modal.querySelector('#leaseModalBody');
	modalBody.innerHTML = createLeaseConfirmationForm(lead, property);

	// Setup form event listeners
	const cancelBtn = modal.querySelector('#cancelLeaseForm');
	cancelBtn?.addEventListener('click', () => {
		modal.remove();
	});

	const previewBtn = modal.querySelector('#previewLeaseForm');
	previewBtn?.addEventListener('click', () => {
		showPreview(modal, lead, property, deps);
	});
}

/**
 * Show the preview of the lease confirmation
 * @param {HTMLElement} modal - Modal element
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @param {Object} deps - Dependencies
 */
function showPreview(modal, lead, property, deps) {
	const { SupabaseAPI, toast } = deps;

	// Validate form
	const validation = validateLeaseForm();
	if (!validation.isValid) {
		toast(`Please fix the following errors:\n${validation.errors.join('\n')}`);
		return;
	}

	// Get form data
	const formData = getLeaseFormData();

	// Replace modal body with preview
	const modalBody = modal.querySelector('#leaseModalBody');
	modalBody.innerHTML = createLeaseConfirmationPreview(formData, lead, property);

	// Setup preview event listeners
	const backBtn = modal.querySelector('#backToForm');
	backBtn?.addEventListener('click', () => {
		showLeaseForm(modal, lead, property, deps);
	});

	const sendBtn = modal.querySelector('#sendLeaseConfirmation');
	sendBtn?.addEventListener('click', async () => {
		await sendLeaseConfirmation(formData, lead, property, deps);
		modal.remove();
	});
}

/**
 * Send the lease confirmation
 * @param {Object} formData - Form data
 * @param {Object} lead - Lead object
 * @param {Object} property - Property object
 * @param {Object} deps - Dependencies
 */
async function sendLeaseConfirmation(formData, lead, property, deps) {
	const { SupabaseAPI, toast } = deps;

	try {
		// TODO: Implement email sending when email integration is ready
		// For now, just create an activity and update the lead

		// Create lease_sent activity
		await SupabaseAPI.createLeadActivity({
			lead_id: lead.id,
			activity_type: 'lease_sent',
			description: `Lease confirmation sent to ${property.name}`,
			metadata: {
				formData,
				propertyEmail: property.contact_email,
				sentDate: new Date().toISOString()
			}
		});

		// Update lead current_step if needed
		if (lead.currentStep < 5) {
			await SupabaseAPI.updateLead(lead.id, {
				current_step: 5
			});
		}

		toast('✅ Lease confirmation sent successfully!');

		// Refresh the page to show updated status
		window.location.reload();
	} catch (error) {
		console.error('Error sending lease confirmation:', error);
		toast('❌ Error sending lease confirmation. Please try again.');
	}
}

/**
 * View existing lease confirmation
 * @param {Object} lead - Lead object
 * @param {Object} deps - Dependencies
 */
async function viewLeaseConfirmation(lead, deps) {
	const { SupabaseAPI, toast } = deps;

	try {
		// Get lease_sent activity
		const activities = await SupabaseAPI.getLeadActivities(lead.id);
		const leaseSentActivity = activities.find(a => a.activity_type === 'lease_sent');

		if (!leaseSentActivity || !leaseSentActivity.metadata?.formData) {
			toast('No lease confirmation data found');
			return;
		}

		// Show preview in new modal
		const previewModal = document.createElement('div');
		previewModal.className = 'progress-modal active';
		previewModal.innerHTML = `
			<div class="progress-modal-content lease-preview-modal-content">
				<div class="progress-modal-header">
					<h3>Lease Confirmation - ${lead.leadName}</h3>
					<button class="close-modal" id="closePreviewModal">&times;</button>
				</div>
				<div class="progress-modal-body">
					${createLeaseConfirmationPreview(leaseSentActivity.metadata.formData, lead, leaseSentActivity.metadata)}
				</div>
			</div>
		`;

		document.body.appendChild(previewModal);

		// Close button
		previewModal.querySelector('#closePreviewModal')?.addEventListener('click', () => {
			previewModal.remove();
		});
	} catch (error) {
		console.error('Error viewing lease confirmation:', error);
		toast('Error loading lease confirmation');
	}
}

/**
 * Resend lease confirmation
 * @param {Object} lead - Lead object
 * @param {Object} deps - Dependencies
 */
async function resendLeaseConfirmation(lead, deps) {
	const { SupabaseAPI, toast } = deps;

	try {
		// Get existing lease_sent activity
		const activities = await SupabaseAPI.getLeadActivities(lead.id);
		const leaseSentActivity = activities.find(a => a.activity_type === 'lease_sent');

		if (!leaseSentActivity || !leaseSentActivity.metadata?.formData) {
			toast('No lease confirmation data found to resend');
			return;
		}

		// TODO: Implement email resending when email integration is ready

		// Create new activity for resend
		await SupabaseAPI.createLeadActivity({
			lead_id: lead.id,
			activity_type: 'lease_sent',
			description: `Lease confirmation resent to ${leaseSentActivity.metadata.propertyEmail}`,
			metadata: {
				...leaseSentActivity.metadata,
				resentDate: new Date().toISOString()
			}
		});

		toast('✅ Lease confirmation resent successfully!');
	} catch (error) {
		console.error('Error resending lease confirmation:', error);
		toast('❌ Error resending lease confirmation. Please try again.');
	}
}

