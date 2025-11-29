/**
 * Lease Signature Handler
 *
 * Handles sending lease confirmations for signature via Documenso.
 * Provides global functions for UI interactions.
 */

import * as SupabaseAPI from '../api/supabase-api.js';

/**
 * Send lease confirmation for signature
 * 
 * @param {string} leaseConfirmationId - ID of the lease confirmation
 * @param {string} leadId - ID of the lead
 */
export async function sendLeaseForSignature(leaseConfirmationId, leadId) {
	console.log('Sending lease for signature:', { leaseConfirmationId, leadId });

	// Show confirmation modal
	const confirmed = confirm(
		'📧 Send Lease Confirmation for Signature?\n\n' +
		'This will:\n' +
		'• Generate a PDF of the lease confirmation\n' +
		'• Upload it to Documenso for e-signature\n' +
		'• Send an email to the property contact\n\n' +
		'Continue?'
	);

	if (!confirmed) {
		console.log('User cancelled send for signature');
		return;
	}

	try {
		// Show loading state
		const loadingMessage = showLoadingMessage('Sending lease for signature...');

		// Call the send-for-signature endpoint
		const response = await fetch('/api/documenso/send-for-signature', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				leaseConfirmationId: leaseConfirmationId
			})
		});

		const result = await response.json();

		// Hide loading message
		hideLoadingMessage(loadingMessage);

		if (!response.ok) {
			throw new Error(result.message || result.error || 'Failed to send for signature');
		}

		console.log('Lease sent for signature successfully:', result);

		// Show success message
		alert(
			'✅ Lease Sent for Signature!\n\n' +
			`Sent to: ${result.data.recipientName} (${result.data.recipientEmail})\n\n` +
			'The property contact will receive an email with a link to sign the document.\n\n' +
			'You will be notified when the document is signed.'
		);

		// Refresh the page to show updated status
		window.location.reload();

	} catch (error) {
		console.error('Error sending lease for signature:', error);

		alert(
			'❌ Error Sending Lease\n\n' +
			error.message + '\n\n' +
			'Please try again or contact support if the problem persists.'
		);
	}
}

/**
 * Show loading message overlay
 */
function showLoadingMessage(message) {
	const overlay = document.createElement('div');
	overlay.id = 'loading-overlay';
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	`;

	const messageBox = document.createElement('div');
	messageBox.style.cssText = `
		background: white;
		padding: 30px 40px;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		text-align: center;
		max-width: 400px;
	`;

	const spinner = document.createElement('div');
	spinner.style.cssText = `
		border: 4px solid #f3f3f3;
		border-top: 4px solid #2c5282;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
		margin: 0 auto 20px auto;
	`;

	const text = document.createElement('p');
	text.textContent = message;
	text.style.cssText = `
		margin: 0;
		font-size: 16px;
		color: #333;
	`;

	messageBox.appendChild(spinner);
	messageBox.appendChild(text);
	overlay.appendChild(messageBox);
	document.body.appendChild(overlay);

	// Add spinner animation
	if (!document.getElementById('spinner-style')) {
		const style = document.createElement('style');
		style.id = 'spinner-style';
		style.textContent = `
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
		`;
		document.head.appendChild(style);
	}

	return overlay;
}

/**
 * Hide loading message overlay
 */
function hideLoadingMessage(overlay) {
	if (overlay && overlay.parentNode) {
		overlay.parentNode.removeChild(overlay);
	}
}

// Make function globally available for onclick handlers
window.sendLeaseForSignature = sendLeaseForSignature;

