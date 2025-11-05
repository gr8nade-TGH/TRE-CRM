/**
 * Emails Rendering Module
 * Renders email dashboard with logs, templates, and statistics
 *
 * @module emails/rendering
 */

import { formatDate } from '../../utils/helpers.js';
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
        <div class="email-stats-mc" style="opacity: 0.6;">
            <div class="email-metric-primary">
                <div class="metric-gauge">
                    <div style="color: rgba(255,255,255,0.3); font-size: 14px;">Loading...</div>
                </div>
            </div>
            <div class="email-metrics-grid">
                <div class="email-metric-card" style="opacity: 0.5;">
                    <div class="metric-icon">⏳</div>
                    <div class="metric-data">
                        <div class="metric-value">--</div>
                        <div class="metric-label">Loading</div>
                    </div>
                </div>
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
                <!-- Success Rate Card -->
                <div class="email-metric-card success-rate">
                    <div class="metric-header">
                        <div class="metric-icon">✅</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
                    <div class="metric-value">${successRate}%</div>
                </div>

                <!-- Today Card -->
                <div class="email-metric-card">
                    <div class="metric-header">
                        <div class="metric-icon">📧</div>
                        <div class="metric-label">Today</div>
                    </div>
                    <div class="metric-value">${todayEmails.length}</div>
                    ${todayEmails.length > 0 ? '<div class="metric-trend positive">↑ Active</div>' : ''}
                </div>

                <!-- This Week Card -->
                <div class="email-metric-card">
                    <div class="metric-header">
                        <div class="metric-icon">📅</div>
                        <div class="metric-label">This Week</div>
                    </div>
                    <div class="metric-value">${weekEmails.length}</div>
                </div>

                <!-- This Month Card -->
                <div class="email-metric-card">
                    <div class="metric-header">
                        <div class="metric-icon">📊</div>
                        <div class="metric-label">This Month</div>
                    </div>
                    <div class="metric-value">${monthEmails.length}</div>
                </div>

                <!-- Failed Card -->
                <div class="email-metric-card ${failedEmails.length > 0 ? 'alert' : ''}">
                    <div class="metric-header">
                        <div class="metric-icon">⚠️</div>
                        <div class="metric-label">Failed</div>
                    </div>
                    <div class="metric-value">${failedEmails.length}</div>
                    ${failedEmails.length > 0 ? '<div class="metric-trend negative">Needs attention</div>' : ''}
                </div>

                <!-- Top Template Card -->
                <div class="email-metric-card">
                    <div class="metric-header">
                        <div class="metric-icon">🏆</div>
                        <div class="metric-label">Top Template</div>
                    </div>
                    <div class="metric-value" style="font-size: 16px; font-weight: 600;">${mostUsedTemplateName}</div>
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No emails found</td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">Error loading emails</td></tr>';
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

