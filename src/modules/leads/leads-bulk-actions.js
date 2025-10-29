/**
 * Leads Bulk Actions Module
 * Handles bulk operations on leads (bulk send Smart Match emails, etc.)
 */

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
 * Shows confirmation dialog before sending
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
    
    // TODO: Check rate limiting for each lead
    // For now, we'll just show a confirmation dialog
    
    const confirmed = confirm(`Send Smart Match emails to ${selectedLeadIds.length} lead(s)?

This will send personalized property recommendations to each selected lead.

Note: Rate limiting (12-hour cooldown) will be implemented in the next update.`);
    
    if (!confirmed) {
        return;
    }
    
    // Show loading state
    const bulkSendBtn = document.getElementById('bulkSendSmartMatchBtn');
    const originalText = bulkSendBtn.innerHTML;
    bulkSendBtn.disabled = true;
    bulkSendBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10"/>
        </svg>
        Sending...
    `;
    
    try {
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        
        // Send emails sequentially (to avoid rate limiting issues)
        for (const leadId of selectedLeadIds) {
            try {
                console.log(`📧 Sending Smart Match email to lead: ${leadId}`);
                
                const result = await SupabaseAPI.sendSmartMatchEmail(leadId, {
                    propertyCount: 5,
                    sentBy: state.user?.id
                });
                
                if (result.success) {
                    successCount++;
                    console.log(`✅ Email sent successfully to lead: ${leadId}`);
                } else {
                    failCount++;
                    errors.push(`Lead ${leadId}: ${result.error || 'Unknown error'}`);
                    console.error(`❌ Failed to send email to lead: ${leadId}`, result);
                }
            } catch (error) {
                failCount++;
                errors.push(`Lead ${leadId}: ${error.message}`);
                console.error(`❌ Error sending email to lead: ${leadId}`, error);
            }
        }
        
        // Show results
        if (successCount > 0 && failCount === 0) {
            toast(`✅ Successfully sent Smart Match emails to ${successCount} lead(s)!`, 'success');
        } else if (successCount > 0 && failCount > 0) {
            toast(`⚠️ Sent ${successCount} emails, ${failCount} failed. Check console for details.`, 'warning');
            console.error('Failed emails:', errors);
        } else {
            toast(`❌ Failed to send emails. Check console for details.`, 'error');
            console.error('All emails failed:', errors);
        }
        
        // Uncheck all checkboxes
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

