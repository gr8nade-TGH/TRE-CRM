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
	switch (step.id) {
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

				// Welcome email section - check if welcome email was sent
				const welcomeEmailActivity = activities.find(a => a.activity_type === 'welcome_email_sent');
				let welcomeEmailHTML = '';

				if (welcomeEmailActivity) {
					const emailMetadata = welcomeEmailActivity.metadata || {};
					const emailId = emailMetadata.email_id;
					const sentAt = formatDate(welcomeEmailActivity.created_at);
					const agentName = emailMetadata.agent_name || 'System';

					// Fetch email log data if email_id exists
					let emailLogData = null;
					if (emailId) {
						try {
							emailLogData = await SupabaseAPI.getEmailLog(emailId);
						} catch (error) {
							console.error('Error fetching email log:', error);
						}
					}

					// Build email status display
					let statusHTML = '';
					if (emailLogData) {
						const opens = emailLogData.opens || 0;
						const clicks = emailLogData.clicks || 0;
						const status = emailLogData.status || 'sent';

						statusHTML = `
							<div class="email-tracking-stats">
								<div class="stat-item">
									<span class="stat-label">Status:</span>
									<span class="stat-value status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
								</div>
								<div class="stat-item">
									<span class="stat-label">Opens:</span>
									<span class="stat-value">${opens}</span>
								</div>
								<div class="stat-item">
									<span class="stat-label">Clicks:</span>
									<span class="stat-value">${clicks}</span>
								</div>
							</div>
						`;
					}

					welcomeEmailHTML = `
						<div class="modal-section">
							<strong>✅ Welcome Email Sent</strong>
							<div class="email-info-box">
								<div class="email-detail"><strong>Sent:</strong> ${sentAt}</div>
								<div class="email-detail"><strong>Sent by:</strong> ${agentName}</div>
								${statusHTML}
								${emailId ? `<button class="btn btn-secondary btn-sm" onclick="window.viewEmailContent('${emailId}', 'welcome_lead')">📧 View Email</button>` : ''}
							</div>
						</div>
					`;
				} else {
					welcomeEmailHTML = `
						<div class="modal-section">
							<strong>Welcome Email:</strong>
							<div class="email-not-sent">
								<em>❌ Welcome email not sent yet</em>
							</div>
						</div>
					`;
				}

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

		case 2: // Smart Match Sent
			try {
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const smartMatchActivity = activities.find(a => a.activity_type === 'smart_match_sent');

				if (!smartMatchActivity) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ No Smart Match sent yet</div>
						<div class="modal-details"><em>Smart Match email has not been sent to this lead</em></div>
					`;
				}

				const metadata = smartMatchActivity.metadata || {};
				const propertyCount = metadata.property_count || 0;
				const avgScore = metadata.average_match_score || 0;
				const matches = metadata.matches || [];
				const emailLogId = metadata.email_log_id;
				const propertyMatcherUrl = metadata.property_matcher_url;

				// Fetch email tracking data if available
				let emailTrackingHTML = '';
				if (emailLogId) {
					try {
						const emailLog = await SupabaseAPI.getEmailLog(emailLogId);
						if (emailLog) {
							const opens = emailLog.open_count || 0;
							const clicks = emailLog.click_count || 0;
							const status = emailLog.status || 'unknown';
							const statusIcon = status === 'delivered' ? '✓' : status === 'sent' ? '📤' : '⚠️';

							emailTrackingHTML = `
								<div class="modal-section">
									<strong>Email Status:</strong> ${statusIcon} ${status.charAt(0).toUpperCase() + status.slice(1)}
									<div class="email-tracking">
										<span>Opens: ${opens}</span> | <span>Clicks: ${clicks}</span>
									</div>
								</div>
							`;
						}
					} catch (emailError) {
						console.warn('Could not fetch email tracking:', emailError);
					}
				}

				// Build properties list
				let propertiesHTML = '';
				if (matches.length > 0) {
					propertiesHTML = '<div class="modal-section"><strong>Properties Included:</strong><ul class="properties-list">';
					matches.forEach((match, index) => {
						const score = match.match_score || match.matchScore || 0;
						propertiesHTML += `<li>${index + 1}. ${match.property_name || match.name} (${score}% match)</li>`;
					});
					propertiesHTML += '</ul></div>';
				}

				// Check for lead response
				const responseActivity = activities.find(a => a.activity_type === 'property_matcher_submitted');
				let responseHTML = '';
				if (responseActivity) {
					const responseMetadata = responseActivity.metadata || {};
					const selectedCount = responseMetadata.properties_selected || 0;
					const tourRequests = responseMetadata.tour_requests || 0;

					responseHTML = `
						<div class="modal-section response-section">
							<strong>✅ Lead Responded</strong>
							<div class="response-details">
								<div>Date: ${formatDate(responseActivity.created_at)}</div>
								<div>Selected: ${selectedCount} properties</div>
								<div>Tours Requested: ${tourRequests}</div>
							</div>
						</div>
					`;
				}

				// Check for "wants more options"
				const wantsMoreActivity = activities.find(a => a.activity_type === 'wants_more_options');
				let wantsMoreHTML = '';
				if (wantsMoreActivity) {
					wantsMoreHTML = `
						<div class="modal-section wants-more-section">
							<strong>🔄 Requested More Options</strong>
							<div>Date: ${formatDate(wantsMoreActivity.created_at)}</div>
						</div>
					`;
				}

				return `
					<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Agent:</strong> ${smartMatchActivity.performed_by_name || 'Unknown'}</div>
					<div class="modal-details"><strong>Date:</strong> ${formatDate(smartMatchActivity.created_at)}</div>
					<div class="modal-details"><strong>Properties Sent:</strong> ${propertyCount}</div>
					<div class="modal-details"><strong>Avg Match Score:</strong> ${avgScore}%</div>
					${emailTrackingHTML}
					${propertiesHTML}
					${responseHTML}
					${wantsMoreHTML}
					${propertyMatcherUrl ? `<a href="/matches${propertyMatcherUrl}" target="_blank" class="modal-link">View Property Matcher →</a>` : ''}
				`;
			} catch (error) {
				console.error('Error fetching Smart Match details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading Smart Match details. Please try again.</em></div>
				`;
			}

		case 3: // Guest Card Sent
			try {
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const guestCardSent = activities.find(a => a.activity_type === 'guest_card_sent');

				if (!guestCardSent) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ Guest cards not sent yet</div>
						<div class="modal-details"><em>Guest cards will be sent after lead selects properties</em></div>
					`;
				}

				// Step is completed - show sent details with email tracking
				const metadata = guestCardSent.metadata || {};
				const properties = metadata.properties || [];
				const emailLogIds = metadata.email_log_ids || [];

				// Build detailed properties list with email tracking
				let propertiesHTML = '';
				if (properties.length > 0) {
					propertiesHTML = '<div class="modal-section"><strong>Guest Cards Sent:</strong><ul class="guest-cards-list">';

					for (let i = 0; i < properties.length; i++) {
						const property = properties[i];
						const emailLogId = emailLogIds[i];

						let trackingHTML = '';
						if (emailLogId) {
							try {
								const emailLog = await SupabaseAPI.getEmailLog(emailLogId);
								if (emailLog) {
									const opens = emailLog.open_count || 0;
									const clicks = emailLog.click_count || 0;
									const status = emailLog.status || 'unknown';
									const statusIcon = status === 'delivered' ? '✅' : status === 'sent' ? '📤' : '⚠️';

									trackingHTML = `
										<div class="email-tracking-inline">
											${statusIcon} ${status} | Opens: ${opens} | Clicks: ${clicks}
										</div>
									`;
								}
							} catch (emailError) {
								console.warn('Could not fetch email tracking for property:', property.name, emailError);
							}
						}

						propertiesHTML += `
							<li>
								<strong>${property.name || property.community_name}</strong>
								<div>Sent to: ${property.contact_email || property.contact_phone || 'Unknown'}</div>
								${property.tour_date ? `<div>Tour Date: ${property.tour_date}</div>` : ''}
								${trackingHTML}
							</li>
						`;
					}

					propertiesHTML += '</ul></div>';
				}

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Agent:</strong> ${guestCardSent.performed_by_name || 'Unknown'}</div>
					<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(guestCardSent.created_at)}</div>
					<div class="modal-details"><strong>Guest Cards Sent:</strong> ${properties.length}</div>
					${propertiesHTML}
				`;
			} catch (error) {
				console.error('Error fetching Guest Card details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading guest card details. Please try again.</em></div>
				`;
			}

		case 4: { // Property Selected
			try {
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const propertySelectedActivity = activities.find(a => a.activity_type === 'property_selected');

				if (!propertySelectedActivity) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ Property not selected yet</div>
						<div class="modal-details"><em>This step will be completed when lead selects a property to pursue</em></div>
					`;
				}

				const metadata = propertySelectedActivity.metadata || {};
				const propertyName = metadata.property_name || 'Unknown Property';
				const unitNumber = metadata.unit_number || 'N/A';
				const moveInDate = metadata.move_in_date || 'Not specified';

				// Check for tour scheduled activity
				const tourActivity = activities.find(a => a.activity_type === 'tour_scheduled');
				let tourHTML = '';
				if (tourActivity) {
					const tourMetadata = tourActivity.metadata || {};
					tourHTML = `
						<div class="modal-section tour-section">
							<strong>📅 Tour Scheduled</strong>
							<div>Date: ${formatDate(tourMetadata.tour_date || tourActivity.created_at)}</div>
							${tourMetadata.tour_time ? `<div>Time: ${tourMetadata.tour_time}</div>` : ''}
						</div>
					`;
				}

				// Check for application submitted activity
				const applicationActivity = activities.find(a => a.activity_type === 'application_submitted');
				let applicationHTML = '';
				if (applicationActivity) {
					const appMetadata = applicationActivity.metadata || {};
					applicationHTML = `
						<div class="modal-section application-section">
							<strong>📝 Application Submitted</strong>
							<div>Date: ${formatDate(applicationActivity.created_at)}</div>
							${appMetadata.application_status ? `<div>Status: ${appMetadata.application_status}</div>` : ''}
						</div>
					`;
				}

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Property:</strong> ${propertyName}</div>
					<div class="modal-details"><strong>Unit:</strong> ${unitNumber}</div>
					<div class="modal-details"><strong>Move-in Date:</strong> ${moveInDate}</div>
					<div class="modal-details"><strong>Selected Date:</strong> ${formatDate(propertySelectedActivity.created_at)}</div>
					${tourHTML}
					${applicationHTML}
				`;
			} catch (error) {
				console.error('Error fetching Property Selected details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading property selection details. Please try again.</em></div>
				`;
			}
		}

		case 5: // Prepare Lease
			try {
				const leadData = await SupabaseAPI.getLead(lead.id);
				const propertyId = leadData.property_id;

				// Check if property is selected
				if (!propertyId) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ No property selected</div>
						<div class="modal-details"><em>Please complete Step 4 (Property Selected) before preparing lease</em></div>
					`;
				}

				// Fetch property data
				const property = await SupabaseAPI.getProperty(propertyId);

				// Check if property contact info exists
				const hasContactInfo = property.contact_name && property.contact_email;

				// Check if lease confirmation exists
				const { data: leaseConfirmations } = await SupabaseAPI.supabase
					.from('lease_confirmations')
					.select('*')
					.eq('lead_id', lead.id)
					.order('created_at', { ascending: false })
					.limit(1);

				const leaseConfirmation = leaseConfirmations?.[0];

				// Build HTML based on status
				let statusHTML = '';
				let actionButtonHTML = '';

				if (!hasContactInfo) {
					statusHTML = `
						<div class="modal-warning">⚠️ Property contact information missing</div>
						<div class="modal-details"><em>Please add contact information for ${property.community_name || property.name} before preparing lease</em></div>
						<div class="modal-details"><strong>Required:</strong> Contact Name and Email</div>
					`;
					actionButtonHTML = `
						<button class="btn btn-primary" onclick="window.location.hash = '#/listings'">
							Update Property Contact Info
						</button>
					`;
				} else if (!leaseConfirmation) {
					statusHTML = `
						<div class="modal-details"><strong>Status:</strong> Not Started</div>
						<div class="modal-details"><strong>Property:</strong> ${property.community_name || property.name}</div>
						<div class="modal-details"><strong>Contact:</strong> ${property.contact_name} (${property.contact_email})</div>
						<div class="modal-details"><em>Click below to prepare the lease confirmation form</em></div>
					`;
					actionButtonHTML = `
						<button class="btn btn-primary" onclick="window.location.hash = '#/lease-confirmation?leadId=${lead.id}'">
							Prepare Lease Confirmation
						</button>
					`;
				} else {
					const statusLabel = {
						'draft': '📝 Draft Saved',
						'pending_signature': '⏳ Ready to Send',
						'awaiting_signature': '📤 Awaiting Signature',
						'signed': '✅ Signed',
						'error': '❌ Error'
					}[leaseConfirmation.status] || leaseConfirmation.status;

					statusHTML = `
						<div class="modal-details"><strong>Status:</strong> ${statusLabel}</div>
						<div class="modal-details"><strong>Property:</strong> ${property.community_name || property.name}</div>
						<div class="modal-details"><strong>Contact:</strong> ${property.contact_name} (${property.contact_email})</div>
						<div class="modal-details"><strong>Last Updated:</strong> ${formatDate(leaseConfirmation.updated_at)}</div>
						${leaseConfirmation.submitted_at ? `<div class="modal-details"><strong>Submitted:</strong> ${formatDate(leaseConfirmation.submitted_at)}</div>` : ''}
					`;

					if (leaseConfirmation.status === 'draft') {
						actionButtonHTML = `
							<button class="btn btn-primary" onclick="window.location.hash = '#/lease-confirmation?leadId=${lead.id}'">
								Continue Editing
							</button>
						`;
					} else if (leaseConfirmation.status === 'pending_signature') {
						actionButtonHTML = `
							<button class="btn btn-secondary" onclick="window.location.hash = '#/lease-confirmation?leadId=${lead.id}'">
								📄 Preview
							</button>
							<button class="btn btn-success" onclick="window.sendLeaseForSignature('${leaseConfirmation.id}', '${lead.id}')">
								📧 Send for Signature
							</button>
						`;
					} else if (leaseConfirmation.status === 'awaiting_signature') {
						const signingUrl = leaseConfirmation.documenso_signing_url || '';
						const sentDate = leaseConfirmation.sent_for_signature_at ? formatDate(leaseConfirmation.sent_for_signature_at) : 'Unknown';

						statusHTML += `
							<div class="modal-details"><strong>Sent:</strong> ${sentDate}</div>
							${signingUrl ? `<div class="modal-details"><strong>Signing URL:</strong> <a href="${signingUrl}" target="_blank" style="color: #2c5282; text-decoration: underline;">Open Signing Page</a></div>` : ''}
						`;

						actionButtonHTML = `
							${signingUrl ? `
								<button class="btn btn-primary" onclick="window.open('${signingUrl}', '_blank')">
									📝 Open Signing Page
								</button>
							` : ''}
							<button class="btn btn-secondary" onclick="window.location.hash = '#/lease-confirmation?leadId=${lead.id}'">
								View Details
							</button>
						`;
					} else if (leaseConfirmation.status === 'signed') {
						actionButtonHTML = `
							<button class="btn btn-secondary" onclick="window.location.hash = '#/lease-confirmation?leadId=${lead.id}'">
								View Signed Lease
							</button>
						`;
					}
				}

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					${statusHTML}
					<div class="modal-actions" style="margin-top: 20px;">
						${actionButtonHTML}
					</div>
				`;
			} catch (error) {
				console.error('Error fetching Prepare Lease details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading lease preparation details. Please try again.</em></div>
				`;
			}

		case 6: // Lease Sent
			try {
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const leaseSentActivity = activities.find(a => a.activity_type === 'lease_sent');

				if (!leaseSentActivity) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ Lease not sent yet</div>
						<div class="modal-details"><em>This step will be completed when lease documents are sent</em></div>
					`;
				}

				const metadata = leaseSentActivity.metadata || {};
				const propertyName = metadata.property_name || 'Unknown Property';
				const unitNumber = metadata.unit_number || 'N/A';
				const moveInDate = metadata.move_in_date || 'Not specified';

				// Check for lease signed activity
				const leaseSignedActivity = activities.find(a => a.activity_type === 'lease_signed');
				let leaseSignedHTML = '';
				if (leaseSignedActivity) {
					const signedMetadata = leaseSignedActivity.metadata || {};
					leaseSignedHTML = `
						<div class="modal-section signed-section">
							<strong>✅ Lease Signed!</strong>
							<div>Signed Date: ${formatDate(leaseSignedActivity.created_at)}</div>
							${signedMetadata.signed_by ? `<div>Signed By: ${signedMetadata.signed_by}</div>` : ''}
						</div>
					`;
				}

				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Property:</strong> ${propertyName}</div>
					<div class="modal-details"><strong>Unit:</strong> ${unitNumber}</div>
					<div class="modal-details"><strong>Move-in Date:</strong> ${moveInDate}</div>
					<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(leaseSentActivity.created_at)}</div>
					<div class="modal-details"><strong>Sent By:</strong> ${leaseSentActivity.performed_by_name || 'Unknown'}</div>
					${leaseSignedHTML}
				`;
			} catch (error) {
				console.error('Error fetching Lease Sent details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading lease details. Please try again.</em></div>
				`;
			}

		case 7: // Lease Finalized
			try {
				const activities = await SupabaseAPI.getLeadActivities(lead.id);
				const leaseFinalizedActivity = activities.find(a => a.activity_type === 'lease_finalized');

				if (!leaseFinalizedActivity) {
					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-warning">⚠️ Lease not finalized yet</div>
						<div class="modal-details"><em>This step will be completed when lease is fully executed</em></div>
					`;
				}

				const metadata = leaseFinalizedActivity.metadata || {};
				const propertyName = metadata.property_name || 'Unknown Property';
				const unitNumber = metadata.unit_number || 'N/A';
				const commissionAmount = metadata.commission_amount || 'TBD';
				const commissionStatus = metadata.commission_status || 'pending';

				// Check for commission processed activity
				const commissionActivity = activities.find(a => a.activity_type === 'commission_processed');
				let commissionHTML = '';
				if (commissionActivity) {
					const commissionMetadata = commissionActivity.metadata || {};
					commissionHTML = `
						<div class="modal-section commission-section">
							<strong>💰 Commission Processed</strong>
							<div>Amount: $${commissionMetadata.amount || commissionAmount}</div>
							<div>Processed Date: ${formatDate(commissionActivity.created_at)}</div>
							${commissionMetadata.payment_method ? `<div>Method: ${commissionMetadata.payment_method}</div>` : ''}
						</div>
					`;
				}

				return `
					<div class="modal-details"><strong>Status:</strong> ✅ Complete</div>
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><strong>Property:</strong> ${propertyName}</div>
					<div class="modal-details"><strong>Unit:</strong> ${unitNumber}</div>
					<div class="modal-details"><strong>Finalized Date:</strong> ${formatDate(leaseFinalizedActivity.created_at)}</div>
					<div class="modal-details"><strong>Commission:</strong> $${commissionAmount} (${commissionStatus})</div>
					${commissionHTML}
				`;
			} catch (error) {
				console.error('Error fetching Lease Finalized details:', error);
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
					<div class="modal-details"><em>Error loading finalization details. Please try again.</em></div>
				`;
			}

		default:
			return `<div class="modal-details">No details available</div>`;
	}
}

