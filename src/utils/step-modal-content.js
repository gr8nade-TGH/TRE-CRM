// Step Modal Content - Generate modal content for each step in the lead journey
// This module contains the large getStepModalContent function extracted from script.js

import * as SupabaseAPI from '../api/supabase-api.js';

/**
 * Get modal content for a specific step in the lead journey
 * @param {Object} lead - The lead object
 * @param {Object} step - The step object with id and other properties
 * @param {Function} formatDate - Date formatting function
 * @returns {Promise<string>} - HTML content for the modal
 */
export async function getStepModalContent(lead, step, formatDate) {
	switch(step.id) {
		case 1: // Lead Joined
			// Fetch the lead_created activity from database
			try {
				const leadData = await SupabaseAPI.getLead(lead.id);
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const createdActivity = activities.find(a => a.activity_type === 'lead_created');

				if (!createdActivity) {
					return `
						<div class="modal-details"><strong>Lead Name:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-details"><strong>Status:</strong> Lead joined the system</div>
						<div class="modal-details"><em>No detailed join information available</em></div>
					`;
				}

				const metadata = createdActivity.metadata || {};
				const formData = metadata.form_data || {};
				const preferences = formData.preferences || leadData.preferences || {};

				// Parse preferences if it's a string
				const prefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;

				// Format the join method
				const source = metadata.source || 'unknown';
				const agentName = metadata.agent_name || createdActivity.performed_by_name || 'Unknown Agent';
				const joinDate = formatDate(createdActivity.created_at);

				let joinMethod = '';
				if (source === 'landing_page') {
					joinMethod = `Filled <strong>${agentName}</strong> landing page on ${joinDate}`;
				} else if (source === 'manual') {
					joinMethod = `Manually added by ${agentName} on ${joinDate}`;
				} else {
					joinMethod = `Joined via ${source} on ${joinDate}`;
				}

				// Build preferences display
				let prefsHTML = '';
				if (prefs && Object.keys(prefs).length > 0) {
					prefsHTML = '<div class="modal-section"><strong>Preferences from form:</strong><ul class="preferences-list">';

					if (prefs.bedrooms) prefsHTML += `<li><strong>Bedrooms:</strong> ${prefs.bedrooms}</li>`;
					if (prefs.bathrooms) prefsHTML += `<li><strong>Bathrooms:</strong> ${prefs.bathrooms}</li>`;
					if (prefs.priceRange) prefsHTML += `<li><strong>Budget:</strong> ${prefs.priceRange}</li>`;
					if (prefs.areaOfTown) prefsHTML += `<li><strong>Area:</strong> ${prefs.areaOfTown}</li>`;
					if (prefs.moveInDate) prefsHTML += `<li><strong>Move-in Date:</strong> ${prefs.moveInDate}</li>`;
					if (prefs.creditHistory) prefsHTML += `<li><strong>Credit History:</strong> ${prefs.creditHistory}</li>`;
					if (prefs.bestTimeToCall || formData.best_time_to_call) {
						prefsHTML += `<li><strong>Best Time to Call:</strong> ${prefs.bestTimeToCall || formData.best_time_to_call}</li>`;
					}
					if (prefs.comments) prefsHTML += `<li><strong>Comments:</strong> ${prefs.comments}</li>`;

					prefsHTML += '</ul></div>';
				}

				// Welcome email section (placeholder for Resend integration)
				const welcomeEmailHTML = `
					<div class="modal-section">
						<strong>Welcome Email:</strong>
						<div class="email-placeholder">
							<em>📧 Email integration coming soon (Resend)</em>
							<div class="email-details-placeholder">
								• Welcome email will be sent automatically<br>
								• Email status and details will appear here<br>
								• Click to view email content and delivery status
							</div>
						</div>
					</div>
				`;

				return `
					<div class="modal-details"><strong>Lead Name:</strong> ${leadData.name}</div>
					<div class="modal-details"><strong>Email:</strong> ${leadData.email}</div>
					<div class="modal-details"><strong>Phone:</strong> ${leadData.phone || 'Not provided'}</div>
					<div class="modal-details"><strong>Join Method:</strong> ${joinMethod}</div>
					${prefsHTML}
					${welcomeEmailHTML}
				`;
			} catch (error) {
				console.error('Error fetching lead joined details:', error);
				return `
					<div class="modal-details"><strong>Lead Name:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading join details. Please try again.</em></div>
				`;
			}

		case 2: // Showcase Sent
			return `
				<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName}</div>
				<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
				<div class="modal-details"><strong>Date:</strong> ${formatDate(lead.lastUpdated)}</div>
				<a href="${lead.showcase.landingPageUrl}" target="_blank" class="modal-link">View Landing Page →</a>
			`;

		case 3: // Lead Responded
			return `
				<div class="modal-details"><strong>Lead:</strong> ${lead.leadName}</div>
				<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
				<div class="modal-details"><strong>Properties Selected:</strong> ${lead.showcase.selections.join(', ')}</div>
				<div class="modal-details"><strong>Preferred Tour Dates:</strong> ${lead.showcase.calendarDates.join(', ')}</div>
				<div class="modal-details"><strong>Response Date:</strong> ${formatDate(lead.lastUpdated)}</div>
				<div class="modal-details"><strong>Status:</strong> Lead has shown interest and selected properties</div>
				<a href="${lead.showcase.landingPageUrl}?filled=true&selections=${encodeURIComponent(lead.showcase.selections.join(','))}&dates=${encodeURIComponent(lead.showcase.calendarDates.join(','))}" target="_blank" class="modal-link">View Filled Landing Page →</a>
			`;

		case 4: { // Guest Card Sent / Send Guest Card
			// Check if this step is completed or needs action
			const guestCardActivities = await SupabaseAPI.getLeadActivities(lead.id);
			const guestCardSent = guestCardActivities.find(a => a.activity_type === 'guest_card_sent');

			if (guestCardSent) {
				// Step is completed - show sent details
				const metadata = guestCardSent.metadata || {};
				const properties = metadata.properties || [];
				const guestCardUrl = `https://tre-crm.vercel.app/guest-card.html?lead=${encodeURIComponent(lead.leadName || lead.name)}`;

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Agent:</strong> ${guestCardSent.performed_by_name || 'Unknown'}</div>
					<div class="modal-details"><strong>Properties:</strong> ${properties.map(p => p.name).join(', ')}</div>
					<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(guestCardSent.created_at)}</div>
					<div class="modal-details"><strong>Status:</strong> ✅ Guest cards sent to all properties</div>
					<a href="${guestCardUrl}" target="_blank" class="modal-link">View Guest Card →</a>
				`;
			} else {
				// Step needs action - show preview/send interface
				// Get showcase response to know which properties were selected
				const showcaseResponse = guestCardActivities.find(a => a.activity_type === 'showcase_response');

				if (!showcaseResponse) {
					return `
						<div class="modal-warning">⚠️ No showcase response found. Lead must respond to showcase first.</div>
					`;
				}

				const responseMetadata = showcaseResponse.metadata || {};
				const selectedProperties = responseMetadata.selected_properties || [];

				if (selectedProperties.length === 0) {
					return `
						<div class="modal-warning">⚠️ No properties selected by lead.</div>
					`;
				}

				// Fetch property details and check for contact info
				let propertiesHTML = '';
				for (const propSelection of selectedProperties) {
					try {
						// Get property details
						const property = await SupabaseAPI.getProperty(propSelection.property_id);
						const hasContactInfo = property.contact_email || property.contact_phone;
						const tourDate = propSelection.tour_date || 'Not specified';

						const statusIcon = hasContactInfo ? '✅' : '⚠️';
						const statusText = hasContactInfo ? 'Ready to send' : 'Missing contact info';

						propertiesHTML += `
							<div class="guest-card-property">
								<div class="property-name">${statusIcon} ${property.community_name}</div>
								<div class="property-details">
									<div><strong>Tour Date:</strong> ${tourDate}</div>
									${hasContactInfo ? `
										<div><strong>Contact:</strong> ${property.contact_email || property.contact_phone}</div>
									` : `
										<div class="warning-text">⚠️ No contact information on file</div>
										<button class="btn-secondary btn-sm" onclick="editPropertyContact('${property.id}', '${property.community_name}')">
											Add Contact Info
										</button>
									`}
								</div>
							</div>
						`;
					} catch (error) {
						console.error('Error fetching property:', error);
						propertiesHTML += `
							<div class="guest-card-property error">
								<div class="property-name">⚠️ Property ${propSelection.property_id}</div>
								<div class="error-text">Error loading property details</div>
							</div>
						`;
					}
				}

				// Check if all properties have contact info
				const allPropertiesReady = selectedProperties.every(async (propSelection) => {
					try {
						const property = await SupabaseAPI.getProperty(propSelection.property_id);
						return property.contact_email || property.contact_phone;
					} catch {
						return false;
					}
				});

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Selected Properties:</strong> ${selectedProperties.length}</div>
					<div class="guest-card-preview">
						<h4>Guest Cards to Send:</h4>
						${propertiesHTML}
					</div>
					<div class="modal-actions">
						<button class="btn-primary" onclick="sendGuestCards('${lead.id}')" ${!allPropertiesReady ? 'disabled' : ''}>
							📧 Send Guest Cards
						</button>
						${!allPropertiesReady ? '<div class="warning-text">⚠️ Add missing contact info before sending</div>' : ''}
					</div>
				`;
			}
		}

		case 5: // Property Selected
			return `
				<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
				<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
				<div class="modal-details"><strong>Move-in Date:</strong> ${formatDate(lead.lease.moveInDate)}</div>
			`;

		case 6: // Lease Sent
			return `
				<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
				<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
				<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(lead.lastUpdated)}</div>
			`;

		case 7: // Lease Signed
			return `
				<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
				<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
				<div class="modal-details"><strong>Signed Date:</strong> ${formatDate(lead.lastUpdated)}</div>
			`;

		case 8: // Lease Finalized
			return `
				<div class="modal-details"><strong>Status:</strong> Complete</div>
				<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
				<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
				<div class="modal-details"><strong>Commission:</strong> Ready for processing</div>
			`;

		default:
			return `<div class="modal-details">No details available</div>`;
	}
}

