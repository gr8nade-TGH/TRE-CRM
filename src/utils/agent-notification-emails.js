/**
 * Agent Notification Email Utilities
 *
 * This module handles sending automated email notifications to agents about lead events and milestones.
 * All functions include fail-safe error handling and alert creation for monitoring.
 */

import { getSupabase } from '../api/supabase-client.js';

// Re-export functions from part2
export {
    sendMoreOptionsRequestEmail,
    sendMoreOptionsRequestEmailSafe,
    sendHealthStatusChangeEmail,
    sendHealthStatusChangeEmailSafe,
    sendInactivityAlertEmail,
    sendInactivityAlertEmailSafe
} from './agent-notification-emails-part2.js';

/**
 * Create an email alert for failed/skipped agent notification emails
 * These alerts are displayed in the Emails dashboard for monitoring
 */
export async function createEmailAlert({ alertType, severity, leadId, agentId, emailType, message, metadata, supabase }) {
    try {
        const { error } = await supabase
            .from('email_alerts')
            .insert([{
                alert_type: alertType,
                severity: severity,
                lead_id: leadId,
                agent_id: agentId,
                email_type: emailType,
                message: message,
                metadata: metadata || {},
                resolved: false
            }]);

        if (error) {
            console.error('⚠️ Failed to create email alert:', error);
        } else {
            console.log('✅ Email alert created:', { alertType, emailType, leadId });
        }
    } catch (error) {
        console.error('⚠️ Exception creating email alert:', error);
    }
}

/**
 * Check if a duplicate email was recently sent
 * Returns true if duplicate found (should skip sending)
 */
async function checkDuplicateEmail({ leadId, agentId, emailType, cooldownHours = 1, supabase }) {
    try {
        const cooldownDate = new Date();
        cooldownDate.setHours(cooldownDate.getHours() - cooldownHours);

        const { data, error } = await supabase
            .from('email_logs')
            .select('id, created_at')
            .eq('metadata->>lead_id', leadId)
            .eq('metadata->>agent_id', agentId)
            .eq('metadata->>email_type', emailType)
            .gte('created_at', cooldownDate.toISOString())
            .limit(1);

        if (error) {
            console.warn('⚠️ Duplicate check failed, allowing send:', error);
            return false; // Fail open - allow sending if check fails
        }

        if (data && data.length > 0) {
            console.log(`⏭️ Skipping duplicate email: ${emailType} for lead ${leadId} (sent ${data[0].created_at})`);
            return true;
        }

        return false;
    } catch (error) {
        console.warn('⚠️ Duplicate check exception, allowing send:', error);
        return false; // Fail open
    }
}

/**
 * Format lead preferences for email display
 */
function formatLeadPreferences(lead) {
    const prefs = lead.preferences || {};

    return {
        bedrooms: prefs.bedrooms || 'Not specified',
        bathrooms: prefs.bathrooms || 'Not specified',
        budget: prefs.budget ? `$${prefs.budget}/month` : 'Not specified',
        areaOfTown: prefs.area_of_town || 'Not specified',
        moveInDate: lead.move_in_date || 'Not specified',
        creditHistory: prefs.credit_history || 'Not specified',
        leaseTerm: prefs.lease_term || 'Not specified'
    };
}

/**
 * Send agent assignment notification email
 * Triggered when a lead is assigned to an agent
 */
export async function sendAgentAssignmentEmail({ leadId, agentId, assignedBy = null, assignedByName = null, source = 'manual_assignment', supabase }) {
    console.log('📧 sendAgentAssignmentEmail called:', { leadId, agentId, source });

    try {
        // Check for duplicate
        const isDuplicate = await checkDuplicateEmail({
            leadId,
            agentId,
            emailType: 'agent_lead_assignment',
            cooldownHours: 1,
            supabase
        });

        if (isDuplicate) {
            return { success: true, skipped: true, reason: 'duplicate' };
        }

        // Fetch lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) {
            throw new Error(`Failed to fetch lead: ${leadError?.message || 'Not found'}`);
        }

        // Fetch agent data
        const { data: agent, error: agentError } = await supabase
            .from('users')
            .select('*')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            throw new Error(`Failed to fetch agent: ${agentError?.message || 'Not found'}`);
        }

        // Check if agent has email
        if (!agent.email) {
            await createEmailAlert({
                alertType: 'missing_agent_email',
                severity: 'warning',
                leadId: leadId,
                agentId: agentId,
                emailType: 'agent_lead_assignment',
                message: `Agent ${agent.name} has no email address. Cannot send assignment notification.`,
                metadata: { lead_name: lead.name, agent_name: agent.name, source },
                supabase
            });
            return { success: false, error: 'missing_agent_email' };
        }

        // Format preferences
        const prefs = formatLeadPreferences(lead);

        // Prepare email variables
        const baseUrl = window.location.origin;
        const leadDetailUrl = `${baseUrl}/?view=leads&leadId=${leadId}`;

        // Generate comments section HTML if comments exist
        const leadCommentsSection = lead.notes ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666; font-weight: 600;">💬 Comments:</p>
                <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.6;">${lead.notes}</p>
            </div>
        ` : '';

        const variables = {
            agentName: agent.name || 'Agent',
            leadName: lead.name || 'New Lead',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            leadBedrooms: prefs.bedrooms,
            leadBathrooms: prefs.bathrooms,
            leadBudget: prefs.budget,
            leadAreaOfTown: prefs.areaOfTown,
            leadMoveInDate: prefs.moveInDate,
            leadSource: source === 'landing_page' ? 'Landing Page' : source === 'crm' ? 'Manual Entry' : 'Manual Assignment',
            leadCommentsSection: leadCommentsSection,
            leadDetailUrl: leadDetailUrl
        };

        // Send email via API
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: 'agent_lead_assignment',
                recipientEmail: agent.email,
                recipientName: agent.name,
                variables: variables,
                metadata: {
                    lead_id: leadId,
                    agent_id: agentId,
                    email_type: 'agent_lead_assignment',
                    source: source,
                    assigned_by: assignedBy,
                    assigned_by_name: assignedByName
                },
                sentBy: assignedBy || 'system'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Email API request failed');
        }

        const result = await response.json();
        console.log('✅ Agent assignment email sent successfully:', result);

        // Log activity to lead_activities
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: leadId,
                    activity_type: 'agent_notification_sent',
                    description: `Assignment notification sent to ${agent.name}`,
                    metadata: {
                        email_type: 'agent_lead_assignment',
                        email_log_id: result.emailLogId,
                        agent_id: agentId,
                        agent_email: agent.email,
                        source: source
                    },
                    performed_by: assignedBy || null,
                    performed_by_name: assignedByName || 'System'
                }]);
            console.log('✅ Activity logged for agent assignment email');
        } catch (activityError) {
            console.error('⚠️ Failed to log activity:', activityError);
        }

        return { success: true, emailLogId: result.emailLogId };

    } catch (error) {
        console.error('❌ Error sending agent assignment email:', error);

        // Create alert for failed email
        await createEmailAlert({
            alertType: 'email_send_failed',
            severity: 'error',
            leadId: leadId,
            agentId: agentId,
            emailType: 'agent_lead_assignment',
            message: `Failed to send assignment notification: ${error.message}`,
            metadata: { error: error.message, source },
            supabase
        });

        return { success: false, error: error.message };
    }
}

/**
 * Fail-safe wrapper for sendAgentAssignmentEmail
 * Never throws - always returns result object
 */
export async function sendAgentAssignmentEmailSafe(params) {
    try {
        const supabase = params.supabase || getSupabase();
        return await sendAgentAssignmentEmail({ ...params, supabase });
    } catch (error) {
        console.error('⚠️ Agent assignment email failed (safe wrapper):', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send agent lead response notification email
 * Triggered when a lead submits Property Matcher selections
 */
export async function sendAgentResponseEmail({ leadId, sessionId, propertiesSelected, tourRequestsCount, selectedProperties, supabase }) {
    console.log('📧 sendAgentResponseEmail called:', { leadId, sessionId, propertiesSelected, tourRequestsCount });

    try {
        // Fetch lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) {
            throw new Error(`Failed to fetch lead: ${leadError?.message || 'Not found'}`);
        }

        // Check if lead has assigned agent
        if (!lead.assigned_agent_id) {
            console.log('⏭️ Skipping agent response email - no assigned agent');
            await createEmailAlert({
                alertType: 'no_assigned_agent',
                severity: 'warning',
                leadId: leadId,
                agentId: null,
                emailType: 'agent_lead_response',
                message: `Lead ${lead.name} responded but has no assigned agent`,
                metadata: { lead_name: lead.name, properties_selected: propertiesSelected },
                supabase
            });
            return { success: false, error: 'no_assigned_agent' };
        }

        // Fetch agent data
        const { data: agent, error: agentError } = await supabase
            .from('users')
            .select('*')
            .eq('id', lead.assigned_agent_id)
            .single();

        if (agentError || !agent) {
            throw new Error(`Failed to fetch agent: ${agentError?.message || 'Not found'}`);
        }

        // Check if agent has email
        if (!agent.email) {
            await createEmailAlert({
                alertType: 'missing_agent_email',
                severity: 'warning',
                leadId: leadId,
                agentId: agent.id,
                emailType: 'agent_lead_response',
                message: `Agent ${agent.name} has no email address. Cannot send response notification.`,
                metadata: { lead_name: lead.name, agent_name: agent.name },
                supabase
            });
            return { success: false, error: 'missing_agent_email' };
        }

        // Format selected properties list for email
        let selectedPropertiesList = '';
        if (selectedProperties && selectedProperties.length > 0) {
            selectedPropertiesList = selectedProperties.map(prop => `
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #333333; font-weight: 600;">${prop.name || prop.community_name}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">${prop.street_address || ''}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #666666; width: 120px;">🏠 Beds/Baths:</td>
                            <td style="padding: 4px 0; font-size: 14px; color: #333333;">${prop.bed_range || 'N/A'} / ${prop.bath_range || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #666666;">💰 Rent Range:</td>
                            <td style="padding: 4px 0; font-size: 14px; color: #333333;">$${prop.rent_range_min || 'N/A'} - $${prop.rent_range_max || 'N/A'}</td>
                        </tr>
                        ${prop.tour_requested ? '<tr><td colspan="2" style="padding: 8px 0;"><span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">🎯 TOUR REQUESTED</span></td></tr>' : ''}
                    </table>
                </div>
            `).join('');
        }

        // Prepare email variables
        const baseUrl = window.location.origin;
        const leadDetailUrl = `${baseUrl}/?view=leads&leadId=${leadId}`;

        const variables = {
            agentName: agent.name || 'Agent',
            leadName: lead.name || 'Lead',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            propertiesSelected: propertiesSelected,
            tourRequestsCount: tourRequestsCount,
            selectedPropertiesList: selectedPropertiesList,
            responseDate: new Date().toLocaleString(),
            leadDetailUrl: leadDetailUrl
        };

        // Send email via API
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: 'agent_lead_response',
                recipientEmail: agent.email,
                recipientName: agent.name,
                variables: variables,
                metadata: {
                    lead_id: leadId,
                    agent_id: agent.id,
                    email_type: 'agent_lead_response',
                    session_id: sessionId,
                    properties_selected: propertiesSelected,
                    tour_requests: tourRequestsCount
                },
                sentBy: 'system'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Email API request failed');
        }

        const result = await response.json();
        console.log('✅ Agent response email sent successfully:', result);

        // Log activity
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: leadId,
                    activity_type: 'agent_notification_sent',
                    description: `Response notification sent to ${agent.name}`,
                    metadata: {
                        email_type: 'agent_lead_response',
                        email_log_id: result.emailLogId,
                        agent_id: agent.id,
                        properties_selected: propertiesSelected,
                        tour_requests: tourRequestsCount
                    },
                    performed_by: null,
                    performed_by_name: 'System'
                }]);
        } catch (activityError) {
            console.error('⚠️ Failed to log activity:', activityError);
        }

        return { success: true, emailLogId: result.emailLogId };

    } catch (error) {
        console.error('❌ Error sending agent response email:', error);

        await createEmailAlert({
            alertType: 'email_send_failed',
            severity: 'error',
            leadId: leadId,
            agentId: null,
            emailType: 'agent_lead_response',
            message: `Failed to send response notification: ${error.message}`,
            metadata: { error: error.message },
            supabase
        });

        return { success: false, error: error.message };
    }
}

/**
 * Fail-safe wrapper for sendAgentResponseEmail
 */
export async function sendAgentResponseEmailSafe(params) {
    try {
        const supabase = params.supabase || getSupabase();
        return await sendAgentResponseEmail({ ...params, supabase });
    } catch (error) {
        console.error('⚠️ Agent response email failed (safe wrapper):', error);
        return { success: false, error: error.message };
    }
}

