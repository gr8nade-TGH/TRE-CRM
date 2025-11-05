/**
 * Leads Bulk Actions Module
 * Handles bulk operations on leads (bulk send Smart Match emails, etc.)
 */

// Constants
const SMART_MATCH_COOLDOWN_HOURS = 10 / 60; // 10 minutes for testing (TODO: Change back to 12 hours)
const MAX_BULK_SEND_COUNT = 30; // Maximum number of emails that can be sent in one bulk operation

/**
 * Check rate limiting for multiple leads
 * Returns categorized leads: canSend and inCooldown
 * @param {string[]} leadIds - Array of lead IDs to check
 * @returns {Promise<Object>} { canSend: Array, inCooldown: Array }
 */
async function checkBulkRateLimiting(leadIds) {
    const { SupabaseAPI } = window;

    console.log('🕐 Checking rate limiting for', leadIds.length, 'leads');

    const canSend = [];
    const inCooldown = [];

    // Check each lead's cooldown status
    for (const leadId of leadIds) {
        try {
            const cooldownCheck = await SupabaseAPI.checkSmartMatchCooldown(leadId, SMART_MATCH_COOLDOWN_HOURS);

            if (cooldownCheck.canSend) {
                canSend.push({
                    leadId,
                    lastSent: cooldownCheck.lastSent
                });
            } else {
                inCooldown.push({
                    leadId,
                    lastSent: cooldownCheck.lastSent,
                    hoursRemaining: cooldownCheck.hoursRemaining
                });
            }
        } catch (error) {
            console.error(`❌ Error checking cooldown for lead ${leadId}:`, error);
            // On error, allow sending (fail open)
            canSend.push({
                leadId,
                lastSent: null,
                error: error.message
            });
        }
    }

    console.log('✅ Rate limiting check complete:', {
        total: leadIds.length,
        canSend: canSend.length,
        inCooldown: inCooldown.length
    });

    return { canSend, inCooldown };
}

/**
 * Get lead names for display in confirmation dialog
 * @param {string[]} leadIds - Array of lead IDs
 * @returns {Promise<Map>} Map of leadId -> leadName
 */
async function getLeadNames(leadIds) {
    const leadNames = new Map();

    try {
        // Fetch all leads in one query using window.supabase directly
        const { data: leads, error } = await window.supabase
            .from('leads')
            .select('id, name, email')
            .in('id', leadIds);

        if (error) {
            console.error('❌ Error fetching lead names:', error);
            return leadNames;
        }

        if (leads && leads.length > 0) {
            leads.forEach(lead => {
                leadNames.set(lead.id, lead.name || lead.email);
            });
        }

    } catch (error) {
        console.error('❌ Error in getLeadNames:', error);
    }

    return leadNames;
}

/**
 * Get match preview data for leads (property count and score range)
 * @param {string[]} leadIds - Array of lead IDs
 * @returns {Promise<Map>} Map of leadId -> { name, email, propertyCount, avgScore, topScore }
 */
async function getMatchPreviewData(leadIds) {
    const { SupabaseAPI } = window;
    const matchData = new Map();

    console.log('📊 Fetching match preview data for', leadIds.length, 'leads');

    try {
        // Fetch all leads with their data
        const { data: leads, error } = await window.supabase
            .from('leads')
            .select('id, name, email, preferences')
            .in('id', leadIds);

        if (error) {
            console.error('❌ Error fetching leads for preview:', error);
            return matchData;
        }

        // For each lead, calculate their matches
        for (const lead of leads) {
            try {
                // Get smart matches for this lead (limit to 6 to match email behavior)
                const matches = await SupabaseAPI.getSmartMatches(lead.id, { limit: 6 });

                if (matches && matches.length > 0) {
                    // Calculate average and top score
                    const scores = matches.map(m => m.matchScore?.totalScore || 0);
                    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                    const topScore = Math.max(...scores);

                    matchData.set(lead.id, {
                        name: lead.name || lead.email,
                        email: lead.email,
                        propertyCount: matches.length,
                        avgScore: avgScore,
                        topScore: topScore
                    });
                } else {
                    // No matches found
                    matchData.set(lead.id, {
                        name: lead.name || lead.email,
                        email: lead.email,
                        propertyCount: 0,
                        avgScore: 0,
                        topScore: 0
                    });
                }
            } catch (error) {
                console.error(`❌ Error getting matches for lead ${lead.id}:`, error);
                // Set default data on error
                matchData.set(lead.id, {
                    name: lead.name || lead.email,
                    email: lead.email,
                    propertyCount: 0,
                    avgScore: 0,
                    topScore: 0,
                    error: true
                });
            }
        }

        console.log('✅ Match preview data fetched for', matchData.size, 'leads');

    } catch (error) {
        console.error('❌ Error in getMatchPreviewData:', error);
    }

    return matchData;
}

/**
 * Format hours remaining into human-readable string
 * @param {number} hours - Hours remaining
 * @returns {string} Formatted string (e.g., "3.5 hours", "30 minutes")
 */
function formatTimeRemaining(hours) {
    if (hours < 1) {
        const minutes = Math.ceil(hours * 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${hours.toFixed(1)} hour${hours >= 2 ? 's' : ''}`;
}

/**
 * Get score badge HTML based on score value
 * @param {number} score - Match score (0-100)
 * @returns {string} HTML for score badge
 */
function getScoreBadge(score) {
    if (score >= 80) {
        return `<span class="score-badge score-excellent">⭐ ${score}</span>`;
    } else if (score >= 60) {
        return `<span class="score-badge score-good">★ ${score}</span>`;
    } else if (score >= 40) {
        return `<span class="score-badge score-fair">☆ ${score}</span>`;
    } else {
        return `<span class="score-badge score-low">${score}</span>`;
    }
}

/**
 * Create enhanced confirmation modal with match preview data
 * @param {Object} rateLimitingResult - Result from checkBulkRateLimiting
 * @param {Map} matchData - Map of leadId -> match preview data
 * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
 */
function createEnhancedConfirmationModal(rateLimitingResult, matchData) {
    const { canSend, inCooldown, noMatches } = rateLimitingResult;

    return new Promise((resolve) => {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'bulk-send-confirmation-overlay';
        modalOverlay.style.cssText = `
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
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'bulk-send-confirmation-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border-radius: 16px;
            padding: 0;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideUp 0.3s ease-out;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
        `;

        let headerHTML = '';
        const totalIssues = (inCooldown?.length || 0) + (noMatches?.length || 0);

        if (canSend.length > 0 && totalIssues === 0) {
            headerHTML = `
                <h3 style="margin: 0 0 8px 0; color: #10b981; font-size: 20px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">✅</span> Ready to Send Smart Match Emails
                </h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                    ${canSend.length} lead${canSend.length !== 1 ? 's' : ''} will receive personalized property matches
                </p>
            `;
        } else if (canSend.length > 0 && totalIssues > 0) {
            const issues = [];
            if (inCooldown?.length > 0) issues.push(`${inCooldown.length} in cooldown`);
            if (noMatches?.length > 0) issues.push(`${noMatches.length} no matches`);

            headerHTML = `
                <h3 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 20px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">⚠️</span> Partial Send Available
                </h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                    ${canSend.length} lead${canSend.length !== 1 ? 's' : ''} ready • ${issues.join(' • ')}
                </p>
            `;
        } else {
            headerHTML = `
                <h3 style="margin: 0 0 8px 0; color: #ef4444; font-size: 20px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">❌</span> Cannot Send Emails
                </h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                    No leads are ready to receive emails
                </p>
            `;
        }
        header.innerHTML = headerHTML;

        // Body (scrollable list)
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 16px 24px;
            overflow-y: auto;
            max-height: 50vh;
        `;

        let bodyHTML = '';

        // Leads that can receive emails
        if (canSend.length > 0) {
            bodyHTML += `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        📧 Emails to Send (${canSend.length})
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            canSend.forEach(({ leadId }) => {
                const data = matchData.get(leadId);
                if (data) {
                    const propertyText = data.propertyCount === 1 ? 'property' : 'properties';
                    const scoreBadge = data.propertyCount > 0 ? getScoreBadge(data.avgScore) : '<span class="score-badge score-none">No matches</span>';

                    bodyHTML += `
                        <div style="
                            background: rgba(255, 255, 255, 0.05);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 8px;
                            padding: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 12px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div style="color: #fff; font-weight: 500; font-size: 14px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${data.name}
                                </div>
                                <div style="color: rgba(255, 255, 255, 0.5); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${data.email}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                                <div style="text-align: right;">
                                    <div style="color: #10b981; font-weight: 600; font-size: 16px;">
                                        ${data.propertyCount}
                                    </div>
                                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px;">
                                        ${propertyText}
                                    </div>
                                </div>
                                ${scoreBadge}
                            </div>
                        </div>
                    `;
                }
            });

            bodyHTML += `
                    </div>
                </div>
            `;
        }

        // Leads in cooldown
        if (inCooldown.length > 0) {
            bodyHTML += `
                <div>
                    <h4 style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        ⏳ In Cooldown (${inCooldown.length})
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            inCooldown.forEach(({ leadId, hoursRemaining }) => {
                const data = matchData.get(leadId);
                const timeRemaining = formatTimeRemaining(hoursRemaining);

                if (data) {
                    bodyHTML += `
                        <div style="
                            background: rgba(239, 68, 68, 0.1);
                            border: 1px solid rgba(239, 68, 68, 0.3);
                            border-radius: 8px;
                            padding: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 12px;
                            opacity: 0.7;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div style="color: #fff; font-weight: 500; font-size: 14px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${data.name}
                                </div>
                                <div style="color: rgba(255, 255, 255, 0.5); font-size: 12px;">
                                    Available in ${timeRemaining}
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            bodyHTML += `
                    </div>
                </div>
            `;
        }

        // Leads with no matches
        if (noMatches && noMatches.length > 0) {
            bodyHTML += `
                <div style="margin-top: ${(canSend.length > 0 || inCooldown.length > 0) ? '16px' : '0'};">
                    <h4 style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔍 No Matches Found (${noMatches.length})
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            noMatches.forEach(({ leadId }) => {
                const data = matchData.get(leadId);

                if (data) {
                    bodyHTML += `
                        <div style="
                            background: rgba(245, 158, 11, 0.1);
                            border: 1px solid rgba(245, 158, 11, 0.3);
                            border-radius: 8px;
                            padding: 12px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 12px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div style="color: #fff; font-weight: 500; font-size: 14px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${data.name}
                                </div>
                                <div style="color: rgba(245, 158, 11, 0.9); font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                    <span>💡</span>
                                    <span>Add lead criteria (budget, move-in date, preferences)</span>
                                </div>
                            </div>
                            <div style="
                                background: rgba(245, 158, 11, 0.2);
                                border: 1px solid rgba(245, 158, 11, 0.4);
                                border-radius: 12px;
                                padding: 4px 10px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #f59e0b;
                                white-space: nowrap;
                            ">
                                No matches
                            </div>
                        </div>
                    `;
                }
            });

            bodyHTML += `
                    </div>
                </div>
            `;
        }

        body.innerHTML = bodyHTML;

        // Footer with buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 20px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            background: rgba(255, 255, 255, 0.05);
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 10px 24px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: transparent;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        `;
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = 'transparent';
        };
        cancelBtn.onclick = () => {
            document.body.removeChild(modalOverlay);
            resolve(false);
        };

        const confirmBtn = document.createElement('button');
        if (canSend.length > 0) {
            confirmBtn.textContent = `Send ${canSend.length} Email${canSend.length !== 1 ? 's' : ''}`;
            confirmBtn.style.cssText = `
                padding: 10px 24px;
                border-radius: 8px;
                border: none;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            `;
            confirmBtn.onmouseover = () => {
                confirmBtn.style.transform = 'translateY(-1px)';
                confirmBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            };
            confirmBtn.onmouseout = () => {
                confirmBtn.style.transform = 'translateY(0)';
                confirmBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            };
            confirmBtn.onclick = () => {
                document.body.removeChild(modalOverlay);
                resolve(true);
            };
        } else {
            confirmBtn.textContent = 'OK';
            confirmBtn.style.cssText = `
                padding: 10px 24px;
                border-radius: 8px;
                border: none;
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            `;
            confirmBtn.onclick = () => {
                document.body.removeChild(modalOverlay);
                resolve(false);
            };
        }

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        modalOverlay.appendChild(modal);

        // Add CSS for score badges
        const style = document.createElement('style');
        style.textContent = `
            .score-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            }
            .score-excellent {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #fff;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }
            .score-good {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: #fff;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            }
            .score-fair {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #fff;
                box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            }
            .score-low {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .score-none {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        // Add to DOM
        document.body.appendChild(modalOverlay);

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
                resolve(false);
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modalOverlay);
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

/**
 * Create confirmation dialog content with rate limiting info (DEPRECATED - kept for backwards compatibility)
 * @param {Object} rateLimitingResult - Result from checkBulkRateLimiting
 * @param {Map} leadNames - Map of leadId -> leadName
 * @returns {string} HTML content for confirmation dialog
 */
function createConfirmationDialogContent(rateLimitingResult, leadNames) {
    const { canSend, inCooldown } = rateLimitingResult;

    let message = '';

    // Summary
    if (canSend.length > 0 && inCooldown.length === 0) {
        message += `✅ Ready to send Smart Match emails to ${canSend.length} lead${canSend.length !== 1 ? 's' : ''}.\n\n`;
    } else if (canSend.length > 0 && inCooldown.length > 0) {
        message += `⚠️ ${canSend.length} lead${canSend.length !== 1 ? 's' : ''} will receive emails.\n`;
        message += `⏳ ${inCooldown.length} lead${inCooldown.length !== 1 ? 's' : ''} will be skipped (cooldown period).\n\n`;
    } else {
        message += `❌ All ${inCooldown.length} selected lead${inCooldown.length !== 1 ? 's are' : ' is'} in cooldown period.\n\n`;
    }

    // Details for leads in cooldown
    if (inCooldown.length > 0) {
        message += `📋 Leads in cooldown (12-hour period):\n`;
        inCooldown.forEach(({ leadId, hoursRemaining }) => {
            const name = leadNames.get(leadId) || leadId.substring(0, 8);
            const timeRemaining = formatTimeRemaining(hoursRemaining);
            message += `  • ${name} - Available in ${timeRemaining}\n`;
        });
        message += '\n';
    }

    // Confirmation question
    if (canSend.length > 0) {
        message += `Do you want to proceed with sending ${canSend.length} email${canSend.length !== 1 ? 's' : ''}?`;
    } else {
        message += 'No emails will be sent. Please try again later.';
    }

    return message;
}

/**
 * Update the bulk actions bar visibility and count
 * Shows/hides the bulk actions bar based on checkbox selection
 */
export function updateLeadBulkActionsBar() {
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
    const count = checkboxes.length;
    const bulkActionsGroup = document.querySelector('.bulk-actions-group');
    const bulkLeadsCount = document.getElementById('bulkLeadsCount');

    if (bulkActionsGroup) {
        if (count > 0) {
            bulkActionsGroup.style.display = 'flex';
            if (bulkLeadsCount) {
                bulkLeadsCount.textContent = `${count} selected`;
            }
        } else {
            bulkActionsGroup.style.display = 'none';
        }
    }

    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllLeads');
    const allCheckboxes = document.querySelectorAll('.lead-checkbox');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
        selectAllCheckbox.checked = count === allCheckboxes.length;
    }
}

/**
 * Bulk send Smart Match emails to selected leads
 * Shows confirmation dialog with rate limiting info before sending
 */
export async function bulkSendSmartMatch() {
    const { SupabaseAPI, state, toast } = window;

    // Get selected lead IDs
    const selectedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');
    const selectedLeadIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.leadId);

    if (selectedLeadIds.length === 0) {
        toast('Please select at least one lead', 'warning');
        return;
    }

    // Check if selection exceeds maximum bulk send count
    if (selectedLeadIds.length > MAX_BULK_SEND_COUNT) {
        toast(`⚠️ Maximum bulk send limit is ${MAX_BULK_SEND_COUNT} leads. Please select fewer leads.`, 'warning');
        return;
    }

    console.log('📧 Bulk Send Smart Match - Selected leads:', selectedLeadIds);

    // Show loading state on button while checking rate limits
    const bulkSendBtn = document.getElementById('bulkSendSmartMatchBtn');
    const originalText = bulkSendBtn.innerHTML;
    bulkSendBtn.disabled = true;
    bulkSendBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10"/>
        </svg>
        Checking...
    `;

    try {
        // Step 1: Check rate limiting for all selected leads
        const rateLimitingResult = await checkBulkRateLimiting(selectedLeadIds);
        const { canSend, inCooldown } = rateLimitingResult;

        // Step 2: Get match preview data for all selected leads (property counts and scores)
        const matchData = await getMatchPreviewData(selectedLeadIds);

        // Step 3: Filter out leads with 0 matches from canSend
        const canSendWithMatches = canSend.filter(({ leadId }) => {
            const data = matchData.get(leadId);
            return data && data.propertyCount > 0;
        });

        const noMatches = canSend.filter(({ leadId }) => {
            const data = matchData.get(leadId);
            return data && data.propertyCount === 0;
        });

        // Update rateLimitingResult with filtered data
        const filteredRateLimitingResult = {
            canSend: canSendWithMatches,
            inCooldown: inCooldown,
            noMatches: noMatches
        };

        // Restore button state before showing confirmation
        bulkSendBtn.disabled = false;
        bulkSendBtn.innerHTML = originalText;

        // If no leads can be sent (all in cooldown or no matches), show warning and exit
        if (canSendWithMatches.length === 0) {
            if (inCooldown.length > 0 && noMatches.length === 0) {
                toast('⏳ All selected leads are in cooldown period. Please try again later.', 'warning');
            } else if (noMatches.length > 0 && inCooldown.length === 0) {
                toast('❌ No matches found for selected leads. Please add more lead criteria (budget, move-in date, preferences).', 'warning');
            } else {
                toast('⚠️ No emails can be sent. Some leads are in cooldown, others have no matches.', 'warning');
            }
            console.warn('Cannot send emails - Cooldown:', inCooldown.length, 'No matches:', noMatches.length);
            return;
        }

        // Step 4: Show enhanced confirmation modal with match preview
        const confirmed = await createEnhancedConfirmationModal(filteredRateLimitingResult, matchData);

        if (!confirmed) {
            console.log('User cancelled bulk send');
            return;
        }

        // Step 5: Send emails to leads that have matches
        bulkSendBtn.disabled = true;
        bulkSendBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"/>
            </svg>
            Sending ${canSendWithMatches.length}/${selectedLeadIds.length}...
        `;

        let successCount = 0;
        let failCount = 0;
        let skippedCount = inCooldown.length + noMatches.length;
        const errors = [];

        // Send emails sequentially to leads that have matches
        for (const { leadId } of canSendWithMatches) {
            try {
                console.log(`📧 Sending Smart Match email to lead: ${leadId}`);

                const result = await SupabaseAPI.sendSmartMatchEmail(leadId, {
                    propertyCount: 5,
                    sentBy: state.user?.id,
                    skipCooldownCheck: true // Already checked cooldown in bulk send flow
                });

                if (result.success) {
                    successCount++;
                    console.log(`✅ Email sent successfully to lead: ${leadId}`);
                } else if (result.skipped && (result.reason === 'cooldown' || result.reason === 'no_matches')) {
                    // Lead entered cooldown or lost matches between check and send
                    skippedCount++;
                    const reason = result.reason === 'cooldown' ? 'cooldown' : 'no matches found';
                    console.warn(`⏳ Lead ${leadId} skipped due to ${reason}`);
                } else {
                    failCount++;
                    const leadData = matchData.get(leadId);
                    const leadName = leadData?.name || leadId.substring(0, 8);
                    errors.push(`${leadName}: ${result.message || result.error || 'Unknown error'}`);
                    console.error(`❌ Failed to send email to lead: ${leadId}`, result);
                }
            } catch (error) {
                failCount++;
                const leadData = matchData.get(leadId);
                const leadName = leadData?.name || leadId.substring(0, 8);
                errors.push(`${leadName}: ${error.message}`);
                console.error(`❌ Error sending email to lead: ${leadId}`, error);
            }
        }

        // Step 6: Show results
        let resultMessage = '';
        let resultType = 'success';

        if (successCount > 0 && failCount === 0 && skippedCount === 0) {
            resultMessage = `✅ Successfully sent Smart Match emails to ${successCount} lead${successCount !== 1 ? 's' : ''}!`;
            resultType = 'success';
        } else if (successCount > 0 && (failCount > 0 || skippedCount > 0)) {
            resultMessage = `⚠️ Sent ${successCount} email${successCount !== 1 ? 's' : ''}`;

            const skipReasons = [];
            if (inCooldown.length > 0) skipReasons.push(`${inCooldown.length} cooldown`);
            if (noMatches.length > 0) skipReasons.push(`${noMatches.length} no matches`);

            if (skipReasons.length > 0) {
                resultMessage += `, ${skipReasons.join(', ')} skipped`;
            }
            if (failCount > 0) {
                resultMessage += `, ${failCount} failed`;
            }
            resultMessage += '.';
            resultType = 'warning';
            if (errors.length > 0) {
                console.error('Failed emails:', errors);
            }
        } else if (successCount === 0 && skippedCount > 0 && failCount === 0) {
            const skipReasons = [];
            if (inCooldown.length > 0) skipReasons.push(`${inCooldown.length} in cooldown`);
            if (noMatches.length > 0) skipReasons.push(`${noMatches.length} no matches`);

            resultMessage = `⏳ All leads skipped: ${skipReasons.join(', ')}.`;
            resultType = 'warning';
        } else {
            resultMessage = `❌ Failed to send emails. Check console for details.`;
            resultType = 'error';
            console.error('All emails failed:', errors);
        }

        toast(resultMessage, resultType);

        // Log summary
        console.log('📊 Bulk send summary:', {
            total: selectedLeadIds.length,
            success: successCount,
            failed: failCount,
            skipped: skippedCount
        });

        // Step 6: Cleanup - Uncheck all checkboxes
        selectedCheckboxes.forEach(cb => cb.checked = false);
        updateLeadBulkActionsBar();

        // Refresh leads table to show updated activity
        if (window.renderLeads) {
            await window.renderLeads();
        }

    } catch (error) {
        console.error('❌ Error in bulk send Smart Match:', error);
        toast(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button state
        bulkSendBtn.disabled = false;
        bulkSendBtn.innerHTML = originalText;
    }
}

/**
 * Get selected lead IDs
 * @returns {string[]} Array of selected lead IDs
 */
export function getSelectedLeadIds() {
    const selectedCheckboxes = document.querySelectorAll('.lead-checkbox:checked');
    return Array.from(selectedCheckboxes).map(cb => cb.dataset.leadId);
}

/**
 * Clear all lead selections
 */
export function clearLeadSelections() {
    document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = false);
    const selectAllCheckbox = document.getElementById('selectAllLeads');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    updateLeadBulkActionsBar();
}

