/**
 * Leads Bulk Actions Module
 * Handles bulk operations on leads (bulk send Smart Match emails, etc.)
 */

// Constants
const SMART_MATCH_COOLDOWN_HOURS = 12;

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
 * Create confirmation dialog content with rate limiting info
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

        // Step 2: Get lead names for display
        const leadNames = await getLeadNames(selectedLeadIds);

        // Step 3: Show confirmation dialog with rate limiting info
        const confirmationMessage = createConfirmationDialogContent(rateLimitingResult, leadNames);

        // Restore button state before showing confirmation
        bulkSendBtn.disabled = false;
        bulkSendBtn.innerHTML = originalText;

        // If no leads can be sent, show warning and exit
        if (canSend.length === 0) {
            toast('⏳ All selected leads are in cooldown period. Please try again later.', 'warning');
            console.warn('All leads in cooldown:', inCooldown);
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(confirmationMessage);

        if (!confirmed) {
            console.log('User cancelled bulk send');
            return;
        }

        // Step 4: Send emails to leads that passed rate limiting
        bulkSendBtn.disabled = true;
        bulkSendBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"/>
            </svg>
            Sending ${canSend.length}/${selectedLeadIds.length}...
        `;

        let successCount = 0;
        let failCount = 0;
        let skippedCount = inCooldown.length;
        const errors = [];

        // Send emails sequentially to leads that can receive them
        for (const { leadId } of canSend) {
            try {
                console.log(`📧 Sending Smart Match email to lead: ${leadId}`);

                const result = await SupabaseAPI.sendSmartMatchEmail(leadId, {
                    propertyCount: 5,
                    sentBy: state.user?.id,
                    skipCooldownCheck: false // Double-check cooldown
                });

                if (result.success) {
                    successCount++;
                    console.log(`✅ Email sent successfully to lead: ${leadId}`);
                } else if (result.skipped && result.reason === 'cooldown') {
                    // Lead entered cooldown between check and send
                    skippedCount++;
                    console.warn(`⏳ Lead ${leadId} skipped due to cooldown`);
                } else {
                    failCount++;
                    const leadName = leadNames.get(leadId) || leadId.substring(0, 8);
                    errors.push(`${leadName}: ${result.message || result.error || 'Unknown error'}`);
                    console.error(`❌ Failed to send email to lead: ${leadId}`, result);
                }
            } catch (error) {
                failCount++;
                const leadName = leadNames.get(leadId) || leadId.substring(0, 8);
                errors.push(`${leadName}: ${error.message}`);
                console.error(`❌ Error sending email to lead: ${leadId}`, error);
            }
        }

        // Step 5: Show results
        let resultMessage = '';
        let resultType = 'success';

        if (successCount > 0 && failCount === 0 && skippedCount === 0) {
            resultMessage = `✅ Successfully sent Smart Match emails to ${successCount} lead${successCount !== 1 ? 's' : ''}!`;
            resultType = 'success';
        } else if (successCount > 0 && (failCount > 0 || skippedCount > 0)) {
            resultMessage = `⚠️ Sent ${successCount} email${successCount !== 1 ? 's' : ''}`;
            if (skippedCount > 0) {
                resultMessage += `, ${skippedCount} skipped (cooldown)`;
            }
            if (failCount > 0) {
                resultMessage += `, ${failCount} failed`;
            }
            resultMessage += '. Check console for details.';
            resultType = 'warning';
            if (errors.length > 0) {
                console.error('Failed emails:', errors);
            }
        } else if (successCount === 0 && skippedCount > 0 && failCount === 0) {
            resultMessage = `⏳ All ${skippedCount} lead${skippedCount !== 1 ? 's were' : ' was'} skipped due to cooldown period.`;
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

