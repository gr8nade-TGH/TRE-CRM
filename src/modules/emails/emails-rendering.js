/**
 * Emails Rendering Module
 * Renders email dashboard with logs, templates, and statistics
 *
 * @module emails/rendering
 */

import { formatDate, showModal } from '../../utils/helpers.js';
import { initializeEmailTabs } from './emails-tabs.js';

// Pagination state
let currentEmailsPage = 1;
const EMAILS_PER_PAGE = 20;

/**
 * Render email dashboard
 * @param {Object} options - Rendering options
 * @param {Object} options.api - API wrapper instance
 * @param {Object} options.state - Application state
 * @param {Function} options.showEmailPreview - Callback to show email preview modal
 * @returns {Promise<void>}
 */
export async function renderEmails(options) {
    const { api, state, showEmailPreview } = options;

    console.log('📧 renderEmails called');

    // Initialize tab switching
    initializeEmailTabs();

    // Populate agent filter dropdown first
    await populateAgentFilter({ api, state });

    // Render all sections
    await Promise.all([
        renderEmailStatistics({ api, state }),
        renderEmailAlerts({ api, state }),
        renderEmailLogs({ api, state, showEmailPreview }),
        renderEmailTemplates({ api, state, showEmailPreview })
    ]);
}

/**
 * Populate agent filter dropdown
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function populateAgentFilter(options) {
    const { api, state } = options;

    const agentFilter = document.getElementById('emailAgentFilter');
    if (!agentFilter) return;

    try {
        // Fetch all users
        const users = await api.getUsers();

        // Filter to only agents and managers (people who can send emails)
        const agents = users.filter(u =>
            u.role === 'AGENT' || u.role === 'agent' ||
            u.role === 'MANAGER' || u.role === 'manager' ||
            u.role === 'SUPER_USER' || u.role === 'super_user'
        );

        // Sort by name
        agents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Clear existing options except "All Agents"
        agentFilter.innerHTML = '<option value="">All Agents</option>';

        // Add "System" option for automated emails
        agentFilter.innerHTML += '<option value="system">System (Automated)</option>';

        // For agents, only show their own name
        if (state.role === 'AGENT' || state.role === 'agent') {
            const currentUser = agents.find(a => a.id === window.currentUser?.id);
            if (currentUser) {
                agentFilter.innerHTML += `<option value="${currentUser.id}">${currentUser.name}</option>`;
            }
        } else {
            // For managers/super users, show all agents
            agents.forEach(agent => {
                agentFilter.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
            });
        }

    } catch (error) {
        console.error('❌ Error populating agent filter:', error);
    }
}

/**
 * Render email statistics cards
 * @param {Object} options - Rendering options
 * @returns {Promise<void>}
 */
export async function renderEmailStatistics(options) {
    const { api, state } = options;

    console.log('📊 Rendering email statistics');

    const statsContainer = document.getElementById('emailStatsContainer');
    if (!statsContainer) return;

    // Show loading state
    statsContainer.innerHTML = `
        <div class="email-stats-mc">
            <div class="email-metric-card" style="opacity: 0.5;">
                <div class="metric-header">
                    <div class="metric-icon">⏳</div>
                    <div class="metric-label">Loading...</div>
                </div>
                <div class="metric-value">--</div>
            </div>
        </div>
    `;

    try {
        // Fetch all email logs (we'll filter client-side for stats)
        const { items: allEmails } = await api.getEmailLogs({ pageSize: 1000 });

        // Calculate date ranges
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Filter emails by role
        const filteredEmails = filterEmailsByRole(allEmails, state);

        // Calculate statistics
        const todayEmails = filteredEmails.filter(e => new Date(e.created_at) >= todayStart);
        const weekEmails = filteredEmails.filter(e => new Date(e.created_at) >= weekStart);
        const monthEmails = filteredEmails.filter(e => new Date(e.created_at) >= monthStart);

        const successfulEmails = filteredEmails.filter(e => e.status === 'sent' || e.status === 'delivered');
        const failedEmails = filteredEmails.filter(e => e.status === 'failed' || e.status === 'bounced');
        const successRate = filteredEmails.length > 0
            ? Math.round((successfulEmails.length / filteredEmails.length) * 100)
            : 0;

        // Calculate engagement metrics
        const openedEmails = filteredEmails.filter(e => e.opened_at);
        const clickedEmails = filteredEmails.filter(e => e.first_clicked_at);
        const engagedEmails = filteredEmails.filter(e => e.opened_at || e.first_clicked_at);

        const openRate = successfulEmails.length > 0
            ? Math.round((openedEmails.length / successfulEmails.length) * 100)
            : 0;

        const clickRate = successfulEmails.length > 0
            ? Math.round((clickedEmails.length / successfulEmails.length) * 100)
            : 0;

        const engagementRate = successfulEmails.length > 0
            ? Math.round((engagedEmails.length / successfulEmails.length) * 100)
            : 0;

        // Calculate average time to open (in hours)
        let avgTimeToOpen = 0;
        if (openedEmails.length > 0) {
            const totalHours = openedEmails.reduce((sum, email) => {
                const sentAt = new Date(email.created_at);
                const openedAt = new Date(email.opened_at);
                const hours = (openedAt - sentAt) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            avgTimeToOpen = Math.round(totalHours / openedEmails.length);
        }

        // Count template usage
        const templateCounts = {};
        filteredEmails.forEach(email => {
            if (email.template_id) {
                templateCounts[email.template_id] = (templateCounts[email.template_id] || 0) + 1;
            }
        });

        const mostUsedTemplate = Object.entries(templateCounts)
            .sort((a, b) => b[1] - a[1])[0];

        // Count emails by agent (for managers/super users)
        let agentBreakdownHTML = '';
        if (state.role === 'MANAGER' || state.role === 'manager' ||
            state.role === 'SUPER_USER' || state.role === 'super_user') {

            // Fetch users to get agent names
            const users = await api.getUsers();
            const userMap = {};
            users.forEach(u => userMap[u.id] = u.name);

            // Count emails by agent
            const agentCounts = {};
            let systemCount = 0;

            filteredEmails.forEach(email => {
                if (!email.sent_by) {
                    systemCount++;
                } else {
                    const agentName = userMap[email.sent_by] || 'Unknown';
                    agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
                }
            });

            // Sort by count
            const sortedAgents = Object.entries(agentCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5); // Top 5 agents

            if (sortedAgents.length > 0 || systemCount > 0) {
                agentBreakdownHTML = `
                    <div class="stat-card agent-breakdown">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-label">Emails by Agent</div>
                            <div class="agent-stats-list">
                                ${systemCount > 0 ? `<div class="agent-stat-item"><span>System</span><span class="agent-count">${systemCount}</span></div>` : ''}
                                ${sortedAgents.map(([name, count]) =>
                    `<div class="agent-stat-item"><span>${name}</span><span class="agent-count">${count}</span></div>`
                ).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // Render mission control style statistics
        const mostUsedTemplateName = mostUsedTemplate ? mostUsedTemplate[0].replace('_', ' ') : 'N/A';

        statsContainer.innerHTML = `
            <div class="email-stats-mc">
                <!-- Row 1: Primary Metrics -->
                <!-- Success Rate Card -->
                <div class="email-metric-card success-rate">
                    <div class="metric-label">Success Rate</div>
                    <div class="metric-value">${successRate}%</div>
                </div>

                <!-- Open Rate Card -->
                <div class="email-metric-card ${openRate > 0 ? 'success-rate' : ''}">
                    <div class="metric-label">Open Rate</div>
                    <div class="metric-value">${openRate}%</div>
                </div>

                <!-- Click Rate Card -->
                <div class="email-metric-card ${clickRate > 0 ? 'success-rate' : ''}">
                    <div class="metric-label">Click Rate</div>
                    <div class="metric-value">${clickRate}%</div>
                </div>

                <!-- Row 2: Volume Metrics -->
                <!-- Total Sent Card -->
                <div class="email-metric-card">
                    <div class="metric-label">Total Sent</div>
                    <div class="metric-value">${filteredEmails.length}</div>
                </div>

                <!-- Engagement Rate Card -->
                <div class="email-metric-card ${engagementRate > 0 ? 'success-rate' : ''}">
                    <div class="metric-label">Engagement Rate</div>
                    <div class="metric-value">${engagementRate}%</div>
                </div>

                <!-- Failed Card -->
                <div class="email-metric-card ${failedEmails.length > 0 ? 'alert' : ''}">
                    <div class="metric-label">Failed</div>
                    <div class="metric-value">${failedEmails.length}</div>
                </div>

                <!-- Row 3: Time-based Metrics -->
                <!-- Today Card -->
                <div class="email-metric-card">
                    <div class="metric-label">Today</div>
                    <div class="metric-value">${todayEmails.length}</div>
                </div>

                <!-- This Week Card -->
                <div class="email-metric-card">
                    <div class="metric-label">This Week</div>
                    <div class="metric-value">${weekEmails.length}</div>
                </div>

                <!-- Avg Time to Open Card -->
                <div class="email-metric-card">
                    <div class="metric-label">Avg Time to Open</div>
                    <div class="metric-value">${avgTimeToOpen > 0 ? `${avgTimeToOpen}h` : '--'}</div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('❌ Error rendering email statistics:', error);
        statsContainer.innerHTML = '<p class="error-message">Error loading statistics</p>';
    }
}

/**
 * Render email logs table
 * @param {Object} options - Rendering options
 * @returns {Promise<void>}
 */
export async function renderEmailLogs(options) {
    const { api, state, showEmailPreview } = options;

    console.log('📋 Rendering email logs');

    const tbody = document.getElementById('emailLogsTbody');
    if (!tbody) return;

    try {
        // Get filter values
        const statusFilter = document.getElementById('emailStatusFilter')?.value || '';
        const agentFilter = document.getElementById('emailAgentFilter')?.value || '';
        const searchTerm = document.getElementById('emailSearch')?.value || '';

        // Fetch email logs
        const { items, total } = await api.getEmailLogs({
            status: statusFilter || undefined,
            page: currentEmailsPage,
            pageSize: EMAILS_PER_PAGE
        });

        // Filter by role
        let filteredEmails = filterEmailsByRole(items, state);

        // Filter by agent (client-side)
        if (agentFilter) {
            if (agentFilter === 'system') {
                // Show only system emails (sent_by is null)
                filteredEmails = filteredEmails.filter(email => !email.sent_by);
            } else {
                // Show only emails sent by specific agent
                filteredEmails = filteredEmails.filter(email => email.sent_by === agentFilter);
            }
        }

        // Filter by search term (client-side)
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filteredEmails = filteredEmails.filter(email =>
                email.recipient_email?.toLowerCase().includes(search) ||
                email.recipient_name?.toLowerCase().includes(search) ||
                email.subject?.toLowerCase().includes(search)
            );
        }

        tbody.innerHTML = '';

        if (filteredEmails.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No emails found</td></tr>';
            updateEmailsPagination(1, 1, 0);
            return;
        }

        filteredEmails.forEach(email => {
            const tr = document.createElement('tr');

            // Status badge
            const statusBadge = getStatusBadge(email.status);

            // Template name (clean up ID)
            const templateName = email.template_id
                ? email.template_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'N/A';

            // Sent by user name
            const sentByName = email.sent_by_name || 'System';

            // Engagement indicators
            const hasOpened = email.opened_at ? true : false;
            const hasClicked = email.first_clicked_at ? true : false;
            const openCount = email.open_count || 0;
            const clickCount = email.click_count || 0;

            let engagementHTML = '<span style="color: #9ca3af;">--</span>';
            if (hasOpened || hasClicked) {
                const indicators = [];
                if (hasOpened) {
                    indicators.push(`<span title="Opened ${openCount} time${openCount !== 1 ? 's' : ''}" style="color: #10b981;">📧 ${openCount}</span>`);
                }
                if (hasClicked) {
                    indicators.push(`<span title="Clicked ${clickCount} time${clickCount !== 1 ? 's' : ''}" style="color: #3b82f6;">🔗 ${clickCount}</span>`);
                }
                engagementHTML = indicators.join(' ');
            }

            tr.innerHTML = `
                <td>
                    <div class="email-recipient">
                        <strong>${email.recipient_name || 'Unknown'}</strong>
                        <div class="subtle mono">${email.recipient_email}</div>
                    </div>
                </td>
                <td>
                    <div class="email-subject">${email.subject}</div>
                </td>
                <td>${templateName}</td>
                <td>${statusBadge}</td>
                <td>${engagementHTML}</td>
                <td class="mono">${formatDate(email.created_at)}</td>
                <td>${sentByName}</td>
                <td>
                    <button class="icon-btn view-email-details" data-email-id="${email.id}" title="View Details">
                        👁️
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Update pagination
        const totalPages = Math.ceil(total / EMAILS_PER_PAGE);
        updateEmailsPagination(currentEmailsPage, totalPages, total);

    } catch (error) {
        console.error('❌ Error rendering email logs:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #dc2626;">Error loading emails</td></tr>';
    }
}

/**
 * Render email templates section
 * @param {Object} options - Rendering options
 * @returns {Promise<void>}
 */
export async function renderEmailTemplates(options) {
    const { api, showEmailPreview } = options;

    console.log('📝 Rendering email templates');

    const container = document.getElementById('emailTemplatesContainer');
    if (!container) return;

    try {
        const templates = await api.getEmailTemplates({ activeOnly: false });

        container.innerHTML = '';

        if (templates.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">No email templates found</p>';
            return;
        }

        templates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'email-template-mc-card';

            const categoryBadge = getCategoryBadge(template.category);
            const statusBadge = template.active
                ? '<span class="badge badge-success">Active</span>'
                : '<span class="badge badge-inactive">Inactive</span>';

            // Parse variables
            const variables = template.variables || [];
            const variablesList = variables.length > 0
                ? variables.map(v => `<code>{{${v}}}</code>`).join(', ')
                : 'None';

            card.innerHTML = `
                <div class="template-mc-header">
                    <h3 class="template-mc-name">${template.name}</h3>
                    <div class="template-mc-badges">
                        ${categoryBadge}
                        ${statusBadge}
                    </div>
                </div>
                <div class="template-mc-body">
                    <p class="template-mc-description">${template.description || 'No description'}</p>
                    <div class="template-mc-meta"><strong>Subject:</strong> ${template.subject}</div>
                    <div class="template-mc-meta"><strong>Variables:</strong> ${variablesList}</div>
                </div>
                <div class="template-mc-actions">
                    <button class="template-mc-btn template-mc-btn-preview preview-template" data-template-id="${template.id}">
                        👁️ Preview
                    </button>
                    <button class="template-mc-btn template-mc-btn-send test-send-template" data-template-id="${template.id}">
                        📤 Send
                    </button>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error('❌ Error rendering email templates:', error);
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #dc2626;">Error loading templates</p>';
    }
}

/**
 * Filter emails by user role
 * @param {Array} emails - Array of email logs
 * @param {Object} state - Application state
 * @returns {Array} Filtered emails
 */
function filterEmailsByRole(emails, state) {
    // Managers and Super Users see all emails
    if (state.role === 'MANAGER' || state.role === 'SUPER_USER' || state.role === 'manager' || state.role === 'super_user') {
        return emails;
    }

    // Agents only see:
    // 1. Emails sent to their assigned leads
    // 2. Emails sent by them
    // 3. Agent assignment emails sent to them
    const currentUserId = window.currentUser?.id;
    const currentUserEmail = window.currentUser?.email;

    return emails.filter(email => {
        // Emails sent by this agent
        if (email.sent_by === currentUserId) return true;

        // Agent assignment emails sent to this agent
        if (email.template_id === 'agent_assignment' && email.recipient_email === currentUserEmail) return true;

        // Emails sent to leads assigned to this agent (check metadata)
        if (email.metadata?.agent_id === currentUserId) return true;

        return false;
    });
}

/**
 * Get status badge HTML
 * @param {string} status - Email status
 * @returns {string} Badge HTML
 */
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-warning">⏳ Pending</span>',
        'sent': '<span class="badge badge-success">✅ Sent</span>',
        'delivered': '<span class="badge badge-success">✅ Delivered</span>',
        'failed': '<span class="badge badge-error">❌ Failed</span>',
        'bounced': '<span class="badge badge-error">⚠️ Bounced</span>'
    };
    return badges[status] || '<span class="badge">Unknown</span>';
}

/**
 * Get category badge HTML
 * @param {string} category - Template category
 * @returns {string} Badge HTML
 */
function getCategoryBadge(category) {
    const badges = {
        'lead': '<span class="badge badge-primary">👤 Lead</span>',
        'agent': '<span class="badge badge-info">👔 Agent</span>',
        'document': '<span class="badge badge-warning">📄 Document</span>',
        'system': '<span class="badge badge-secondary">⚙️ System</span>'
    };
    return badges[category] || '<span class="badge">Other</span>';
}

/**
 * Update emails pagination controls
 */
function updateEmailsPagination(currentPage, totalPages, totalEmails) {
    const pageInfo = document.getElementById('emailsPageInfo');
    const prevBtn = document.getElementById('emailsPrevPage');
    const nextBtn = document.getElementById('emailsNextPage');

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages} · ${totalEmails} total`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

/**
 * Navigate to previous page
 */
export function previousEmailsPage() {
    if (currentEmailsPage > 1) {
        currentEmailsPage--;
        return true;
    }
    return false;
}

/**
 * Navigate to next page
 */
export function nextEmailsPage() {
    currentEmailsPage++;
    return true;
}

/**
 * Reset pagination to page 1
 */
export function resetEmailsPagination() {
    currentEmailsPage = 1;
}

/**
 * Render email alerts section
 * @param {Object} options - Rendering options
 * @returns {Promise<void>}
 */
export async function renderEmailAlerts(options) {
    const { api } = options;

    console.log('🚨 Rendering email alerts');

    const container = document.getElementById('emailAlertsContainer');
    if (!container) return;

    try {
        // Get filter values
        const alertTypeFilter = document.getElementById('alertTypeFilter');
        const alertSeverityFilter = document.getElementById('alertSeverityFilter');

        const alertType = alertTypeFilter?.value || '';
        const severity = alertSeverityFilter?.value || '';

        // Fetch unresolved alerts
        const { data: alerts, error } = await api.supabase
            .from('email_alerts')
            .select('*')
            .eq('resolved', false)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Apply filters
        let filteredAlerts = alerts || [];
        if (alertType) {
            filteredAlerts = filteredAlerts.filter(a => a.alert_type === alertType);
        }
        if (severity) {
            filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
        }

        container.innerHTML = '';

        if (filteredAlerts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #10b981;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">All Clear!</h3>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">No unresolved email alerts at this time.</p>
                </div>
            `;
            return;
        }

        // Render alerts
        filteredAlerts.forEach(alert => {
            const alertCard = document.createElement('div');
            alertCard.className = 'email-alert-card';
            alertCard.dataset.alertId = alert.id;

            // Severity badge
            const severityBadge = alert.severity === 'error'
                ? '<span class="alert-severity-badge alert-severity-error">🚨 ERROR</span>'
                : '<span class="alert-severity-badge alert-severity-warning">⚠️ WARNING</span>';

            // Alert type label
            const alertTypeLabels = {
                'missing_agent_email': '📧 Missing Agent Email',
                'email_send_failed': '❌ Email Send Failed',
                'no_assigned_agent': '👤 No Assigned Agent',
                'api_error': '⚙️ API Error'
            };
            const alertTypeLabel = alertTypeLabels[alert.alert_type] || alert.alert_type;

            // Email type label
            const emailTypeLabels = {
                'agent_lead_assignment': 'Lead Assignment',
                'agent_lead_response': 'Lead Response',
                'agent_more_options_request': 'More Options Request',
                'agent_health_status_changed': 'Health Status Change',
                'agent_inactivity_alert': 'Inactivity Alert'
            };
            const emailTypeLabel = emailTypeLabels[alert.email_type] || alert.email_type;

            // Format metadata
            let metadataHTML = '';
            if (alert.metadata) {
                const metadata = alert.metadata;
                metadataHTML = '<div class="alert-metadata">';
                if (metadata.lead_name) metadataHTML += `<div><strong>Lead:</strong> ${metadata.lead_name}</div>`;
                if (metadata.agent_name) metadataHTML += `<div><strong>Agent:</strong> ${metadata.agent_name}</div>`;
                if (metadata.error) metadataHTML += `<div><strong>Error:</strong> ${metadata.error}</div>`;
                metadataHTML += '</div>';
            }

            alertCard.innerHTML = `
                <div class="alert-card-header">
                    <div class="alert-card-title">
                        <div class="alert-type-label">${alertTypeLabel}</div>
                        <div class="alert-email-type">${emailTypeLabel}</div>
                    </div>
                    ${severityBadge}
                </div>
                <div class="alert-card-body">
                    <p class="alert-message">${alert.message}</p>
                    ${metadataHTML}
                    <div class="alert-timestamp">
                        <span class="mono">${formatDate(alert.created_at)}</span>
                    </div>
                </div>
                <div class="alert-card-actions">
                    <button class="btn-secondary view-alert-details" data-alert-id="${alert.id}">
                        👁️ View Details
                    </button>
                    <button class="btn-primary resolve-alert" data-alert-id="${alert.id}">
                        ✅ Mark Resolved
                    </button>
                </div>
            `;

            container.appendChild(alertCard);
        });

        // Add event listeners for alert actions
        container.querySelectorAll('.resolve-alert').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const alertId = e.target.dataset.alertId;
                await resolveAlert(alertId, { api });
            });
        });

        container.querySelectorAll('.view-alert-details').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const alertId = e.target.dataset.alertId;
                await showAlertDetails(alertId, { api });
            });
        });

    } catch (error) {
        console.error('❌ Error rendering email alerts:', error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Error loading alerts</div>';
    }
}

/**
 * Resolve an email alert
 * @param {string} alertId - Alert ID
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function resolveAlert(alertId, options) {
    const { api } = options;

    try {
        const currentUser = api.state?.currentUser;
        const resolvedBy = currentUser?.id || null;

        const { error } = await api.supabase
            .from('email_alerts')
            .update({
                resolved: true,
                resolved_at: new Date().toISOString(),
                resolved_by: resolvedBy
            })
            .eq('id', alertId);

        if (error) throw error;

        console.log('✅ Alert resolved:', alertId);

        // Re-render alerts
        await renderEmailAlerts(options);

    } catch (error) {
        console.error('❌ Error resolving alert:', error);
        alert('Failed to resolve alert. Please try again.');
    }
}

/**
 * Show alert details modal
 * @param {string} alertId - Alert ID
 * @param {Object} options - Options
 * @returns {Promise<void>}
 */
async function showAlertDetails(alertId, options) {
    const { api } = options;

    try {
        const { data: alert, error } = await api.supabase
            .from('email_alerts')
            .select('*')
            .eq('id', alertId)
            .single();

        if (error) throw error;

        // Format metadata as JSON
        const metadataJSON = alert.metadata ? JSON.stringify(alert.metadata, null, 2) : 'None';

        const modalHTML = `
            <div class="modal-header">
                <h2>🚨 Alert Details</h2>
                <button class="modal-close" onclick="hideModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="alert-details-grid">
                    <div class="alert-detail-row">
                        <strong>Alert Type:</strong>
                        <span>${alert.alert_type}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Severity:</strong>
                        <span>${alert.severity}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Email Type:</strong>
                        <span>${alert.email_type}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Message:</strong>
                        <span>${alert.message}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Lead ID:</strong>
                        <span>${alert.lead_id || 'N/A'}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Agent ID:</strong>
                        <span>${alert.agent_id || 'N/A'}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Created At:</strong>
                        <span class="mono">${formatDate(alert.created_at)}</span>
                    </div>
                    <div class="alert-detail-row">
                        <strong>Metadata:</strong>
                        <pre style="margin: 8px 0 0 0; padding: 12px; background: #f3f4f6; border-radius: 4px; font-size: 12px; overflow-x: auto;">${metadataJSON}</pre>
                    </div>
                </div>
            </div>
        `;

        showModal(modalHTML);

    } catch (error) {
        console.error('❌ Error showing alert details:', error);
        alert('Failed to load alert details. Please try again.');
    }
}

