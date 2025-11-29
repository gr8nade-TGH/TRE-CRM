/**
 * Lease Confirmation Page
 * Now uses Interactive PDF-Style Form
 */

import { InteractivePDFForm } from '../components/interactive-pdf-form.js';

export class LeaseConfirmationPage {
	constructor() {
		this.leadId = null;
		this.interactivePDFForm = null;
	}

	async init(leadId = null) {
		console.log('Initializing Lease Confirmation Page (Interactive PDF)', { leadId });

		// Extract leadId from URL if not provided
		if (!leadId) {
			const hash = window.location.hash;
			const urlParams = new URLSearchParams(hash.split('?')[1]);
			leadId = urlParams.get('leadId');
		}

		if (!leadId) {
			this.renderError('No lead ID provided');
			return;
		}

		this.leadId = leadId;

		// Load CSS for interactive PDF form
		this.loadCSS();

		// Initialize interactive PDF form
		this.interactivePDFForm = new InteractivePDFForm(leadId);
		await this.interactivePDFForm.init();
	}

	/**
	 * Load CSS for interactive PDF form
	 */
	loadCSS() {
		// Check if CSS is already loaded
		if (document.getElementById('interactive-pdf-css')) {
			return;
		}

		const link = document.createElement('link');
		link.id = 'interactive-pdf-css';
		link.rel = 'stylesheet';
		link.href = '/src/styles/interactive-pdf-form.css';
		document.head.appendChild(link);
	}

	/**
	 * Render error message
	 */
	renderError(message) {
		// Try leaseConfirmationView first (for route-based rendering)
		let container = document.getElementById('leaseConfirmationView');

		// Fallback to app container (for standalone testing)
		if (!container) {
			container = document.getElementById('app');
		}

		if (container) {
			container.innerHTML = `
				<div style="padding: 40px; text-align: center;">
					<h2 style="color: #e53e3e;">❌ Error</h2>
					<p>${message}</p>
					<button onclick="window.location.hash='#/documents'"
					        style="margin-top: 20px; padding: 10px 20px; background: #2c5282; color: white; border: none; border-radius: 6px; cursor: pointer;">
						← Back to Documents
					</button>
				</div>
			`;
		}
	}

	/**
	 * Cleanup when leaving page
	 */
	destroy() {
		if (this.interactivePDFForm) {
			this.interactivePDFForm.destroy();
		}
	}
}

