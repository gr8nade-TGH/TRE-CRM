/**
 * Emails Actions Module
 * Handles email-related actions like viewing details, previewing templates
 *
 * @module emails/actions
 */

import { getVerifiedSenders, getDefaultSender } from '../../config/email-senders.js';
import { showModal, hideModal } from '../../utils/helpers.js';

/**
 * Show email details modal
 * @param {string} emailId - Email log ID
 * @param {Object} options - Options
 * @param {Object} options.api - API wrapper instance
 * @param {Function} options.showModal - Show modal function
 * @param {Function} options.formatDate - Date formatting function
 * @returns {Promise<void>}
 */
export async function showEmailDetails(emailId, options) {
    const { api, showModal, formatDate } = options;
    
    console.log('📧 Showing email details for:', emailId);
    
    try {
        // Fetch email log details
        const { items } = await api.getEmailLogs({ pageSize: 1000 });
        const email = items.find(e => e.id === emailId);
        
        if (!email) {
            console.error('Email not found:', emailId);
            return;
        }
        
        // Build status timeline
        const timeline = [];
        if (email.created_at) {
            timeline.push({ label: 'Created', time: email.created_at, icon: '📝' });
        }
        if (email.sent_at) {
            timeline.push({ label: 'Sent', time: email.sent_at, icon: '📤' });
        }
        if (email.delivered_at) {
            timeline.push({ label: 'Delivered', time: email.delivered_at, icon: '✅' });
        }
        
        const timelineHtml = timeline.map(item => `
            <div class="timeline-item">
                <span class="timeline-icon">${item.icon}</span>
                <span class="timeline-label">${item.label}</span>
                <span class="timeline-time">${formatDate(item.time)}</span>
            </div>
        `).join('');
        
        // Build metadata display
        const metadataHtml = email.metadata && Object.keys(email.metadata).length > 0
            ? Object.entries(email.metadata).map(([key, value]) => `
                <div class="metadata-item">
                    <strong>${key}:</strong> ${JSON.stringify(value)}
                </div>
            `).join('')
            : '<p class="subtle">No metadata</p>';
        
        // Error message if failed
        const errorHtml = email.error_message
            ? `<div class="error-box">
                <strong>Error:</strong> ${email.error_message}
            </div>`
            : '';
        
        const modalContent = `
            <div class="email-details-modal">
                <h2>Email Details</h2>
                
                <div class="detail-section">
                    <h3>Recipient</h3>
                    <p><strong>${email.recipient_name || 'Unknown'}</strong></p>
                    <p class="mono">${email.recipient_email}</p>
                </div>
                
                <div class="detail-section">
                    <h3>Subject</h3>
                    <p>${email.subject}</p>
                </div>
                
                <div class="detail-section">
                    <h3>Template</h3>
                    <p>${email.template_id ? email.template_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</p>
                </div>
                
                <div class="detail-section">
                    <h3>Status</h3>
                    <p><strong>${email.status.toUpperCase()}</strong></p>
                </div>
                
                ${errorHtml}
                
                <div class="detail-section">
                    <h3>Timeline</h3>
                    <div class="email-timeline">
                        ${timelineHtml}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Metadata</h3>
                    <div class="email-metadata">
                        ${metadataHtml}
                    </div>
                </div>
                
                ${email.resend_id ? `
                    <div class="detail-section">
                        <h3>Resend ID</h3>
                        <p class="mono">${email.resend_id}</p>
                    </div>
                ` : ''}
                
                <div class="detail-section">
                    <h3>Sent By</h3>
                    <p>${email.sent_by_name || 'System'}</p>
                </div>
            </div>
        `;
        
        showModal('Email Details', modalContent);
        
    } catch (error) {
        console.error('❌ Error showing email details:', error);
    }
}

/**
 * Show email template preview modal
 * @param {string} templateId - Template ID
 * @param {Object} options - Options
 * @param {Object} options.api - API wrapper instance
 * @param {Function} options.showModal - Show modal function
 * @returns {Promise<void>}
 */
export async function showTemplatePreview(templateId, options) {
    const { api, showModal } = options;
    
    console.log('📧 Showing template preview for:', templateId);
    
    try {
        const template = await api.getEmailTemplate(templateId);
        
        if (!template) {
            console.error('Template not found:', templateId);
            return;
        }
        
        // Parse variables
        const variables = template.variables || [];
        const variablesList = variables.length > 0
            ? `<div class="variables-list">
                <strong>Variables:</strong> ${variables.map(v => `<code>{{${v}}}</code>`).join(', ')}
            </div>`
            : '';
        
        // Create sample data for preview
        const sampleData = {};
        variables.forEach(v => {
            sampleData[v] = `[${v}]`;
        });
        
        // Replace variables with sample data
        let previewHtml = template.html_content;
        Object.entries(sampleData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            previewHtml = previewHtml.replace(regex, value);
        });
        
        const modalContent = `
            <div class="template-preview-modal">
                <h2>${template.name}</h2>
                <p class="template-description">${template.description || 'No description'}</p>
                
                <div class="template-info">
                    <div><strong>Subject:</strong> ${template.subject}</div>
                    <div><strong>Category:</strong> ${template.category}</div>
                    <div><strong>Status:</strong> ${template.active ? 'Active' : 'Inactive'}</div>
                </div>
                
                ${variablesList}
                
                <h3>Preview</h3>
                <div class="email-preview-container">
                    <iframe 
                        srcdoc="${previewHtml.replace(/"/g, '&quot;')}" 
                        style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 4px;"
                        sandbox="allow-same-origin"
                    ></iframe>
                </div>
                
                <details style="margin-top: 20px;">
                    <summary style="cursor: pointer; font-weight: 600;">View HTML Source</summary>
                    <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; margin-top: 10px;"><code>${escapeHtml(template.html_content)}</code></pre>
                </details>
            </div>
        `;
        
        showModal('Template Preview', modalContent, { wide: true });
        
    } catch (error) {
        console.error('❌ Error showing template preview:', error);
    }
}

/**
 * Send test email from template
 * @param {string} templateId - Template ID
 * @param {Object} options - Options
 * @param {Object} options.api - API wrapper instance
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function sendTestEmail(templateId, options) {
    const { api, toast } = options;

    console.log('📤 Sending test email for template:', templateId);

    try {
        // Fetch template first to get default sender
        const template = await api.getEmailTemplate(templateId);

        if (!template) {
            toast('Template not found', 'error');
            return;
        }

        // Get verified senders
        const verifiedSenders = getVerifiedSenders();
        const defaultSender = template.default_sender || getDefaultSender().email;

        // Build sender options HTML
        const senderOptions = verifiedSenders.map(sender => `
            <option value="${sender.email}" ${sender.email === defaultSender ? 'selected' : ''}>
                ${sender.name} (${sender.email})
            </option>
        `).join('');

        // Show modal with form
        const modalContent = `
            <form id="testEmailForm" style="max-width: 500px;">
                <div style="margin-bottom: 20px;">
                    <label for="testEmailRecipient" style="display: block; margin-bottom: 8px; font-weight: 600;">
                        Recipient Email Address:
                    </label>
                    <input
                        type="email"
                        id="testEmailRecipient"
                        class="form-control"
                        placeholder="recipient@example.com"
                        required
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
                    />
                </div>

                <div style="margin-bottom: 20px;">
                    <label for="testEmailSender" style="display: block; margin-bottom: 8px; font-weight: 600;">
                        From (Sender Address):
                    </label>
                    <select
                        id="testEmailSender"
                        class="form-control"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
                    >
                        ${senderOptions}
                    </select>
                    <small style="color: #666; display: block; margin-top: 4px;">
                        Default sender for this template: ${defaultSender}
                    </small>
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <strong>📋 Template:</strong> ${template.name}<br>
                    <strong>📧 Subject:</strong> [TEST] ${template.subject}
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" id="cancelTestEmail" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        📤 Send Test Email
                    </button>
                </div>
            </form>
        `;

        showModal('Send Test Email', modalContent, { wide: false });

        // Handle form submission
        const form = document.getElementById('testEmailForm');
        const cancelBtn = document.getElementById('cancelTestEmail');

        cancelBtn.addEventListener('click', () => {
            hideModal('dynamicModal');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recipientEmail = document.getElementById('testEmailRecipient').value;
            const senderEmail = document.getElementById('testEmailSender').value;

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipientEmail)) {
                toast('Invalid recipient email address', 'error');
                return;
            }

            // Close modal
            hideModal('dynamicModal');

            // Create sample data for all variables
            const variables = template.variables || [];
            const sampleData = {};
            variables.forEach(v => {
                // Provide realistic sample data based on variable name
                if (v.toLowerCase().includes('name')) {
                    sampleData[v] = 'John Doe';
                } else if (v.toLowerCase().includes('email')) {
                    sampleData[v] = 'agent@tre-crm.com';
                } else if (v.toLowerCase().includes('phone')) {
                    sampleData[v] = '(555) 123-4567';
                } else if (v.toLowerCase().includes('date')) {
                    sampleData[v] = new Date().toLocaleDateString();
                } else if (v.toLowerCase().includes('budget')) {
                    sampleData[v] = '$1,500 - $2,000';
                } else if (v.toLowerCase().includes('url')) {
                    sampleData[v] = 'https://tre-crm.com';
                } else {
                    sampleData[v] = `[Sample ${v}]`;
                }
            });

            // Send test email
            toast('Sending test email...', 'info');

            try {
                await api.sendEmail({
                    templateId: template.id,
                    recipientEmail: recipientEmail,
                    recipientName: 'Test Recipient',
                    variables: sampleData,
                    metadata: {
                        test_email: true,
                        template_id: template.id
                    },
                    fromEmail: senderEmail
                });

                toast(`Test email sent successfully to ${recipientEmail} from ${senderEmail}!`, 'success');
            } catch (error) {
                console.error('❌ Error sending test email:', error);
                toast('Failed to send test email. Please try again.', 'error');
            }
        });

    } catch (error) {
        console.error('❌ Error preparing test email:', error);
        toast('Failed to prepare test email. Please try again.', 'error');
    }
}

/**
 * Escape HTML for display
 * @param {string} html - HTML string
 * @returns {string} Escaped HTML
 */
function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Filter emails by status
 * @param {Object} options - Options
 * @param {Function} options.renderEmailLogs - Render function
 * @returns {Promise<void>}
 */
export async function filterEmailsByStatus(options) {
    const { renderEmailLogs } = options;
    await renderEmailLogs();
}

/**
 * Search emails
 * @param {Object} options - Options
 * @param {Function} options.renderEmailLogs - Render function
 * @returns {Promise<void>}
 */
export async function searchEmails(options) {
    const { renderEmailLogs } = options;
    await renderEmailLogs();
}

