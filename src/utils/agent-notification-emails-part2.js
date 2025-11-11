/**
 * Agent Notification Email Utilities - Part 2
 * 
 * Additional agent notification functions (more options, health status, inactivity)
 */

import { getSupabase } from '../api/supabase-client.js';
import { createEmailAlert } from './agent-notification-emails.js';

/**
 * Send more options request notification email
 * Triggered when lead clicks "Send More Options" button
 */
export async function sendMoreOptionsRequestEmail({ leadId, propertiesViewed, supabase }) {
    console.log('📧 sendMoreOptionsRequestEmail called:', { leadId, propertiesViewed });

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
            console.log('⏭️ Skipping more options email - no assigned agent');
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
                emailType: 'agent_more_options_request',
                message: `Agent ${agent.name} has no email address. Cannot send more options notification.`,
                metadata: { lead_name: lead.name, agent_name: agent.name },
                supabase
            });
            return { success: false, error: 'missing_agent_email' };
        }

        // Prepare email variables
        const baseUrl = window.location.origin;
        const leadDetailUrl = `${baseUrl}/?view=leads&leadId=${leadId}`;
        const sendSmartMatchUrl = `${baseUrl}/?view=leads&leadId=${leadId}&action=sendSmartMatch`;

        const variables = {
            agentName: agent.name || 'Agent',
            leadName: lead.name || 'Lead',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            propertiesViewed: propertiesViewed || 0,
            requestedAt: new Date().toLocaleString(),
            leadDetailUrl: leadDetailUrl,
            sendSmartMatchUrl: sendSmartMatchUrl
        };

        // Send email via API
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: 'agent_more_options_request',
                recipientEmail: agent.email,
                recipientName: agent.name,
                variables: variables,
                metadata: {
                    lead_id: leadId,
                    agent_id: agent.id,
                    email_type: 'agent_more_options_request',
                    properties_viewed: propertiesViewed
                },
                sentBy: 'system'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Email API request failed');
        }

        const result = await response.json();
        console.log('✅ More options request email sent successfully:', result);

        // Log activity
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: leadId,
                    activity_type: 'agent_notification_sent',
                    description: `More options request notification sent to ${agent.name}`,
                    metadata: {
                        email_type: 'agent_more_options_request',
                        email_log_id: result.emailLogId,
                        agent_id: agent.id,
                        properties_viewed: propertiesViewed
                    },
                    performed_by: null,
                    performed_by_name: 'System'
                }]);
        } catch (activityError) {
            console.error('⚠️ Failed to log activity:', activityError);
        }

        return { success: true, emailLogId: result.emailLogId };

    } catch (error) {
        console.error('❌ Error sending more options request email:', error);

        await createEmailAlert({
            alertType: 'email_send_failed',
            severity: 'error',
            leadId: leadId,
            agentId: null,
            emailType: 'agent_more_options_request',
            message: `Failed to send more options notification: ${error.message}`,
            metadata: { error: error.message },
            supabase
        });

        return { success: false, error: error.message };
    }
}

/**
 * Fail-safe wrapper for sendMoreOptionsRequestEmail
 */
export async function sendMoreOptionsRequestEmailSafe(params) {
    try {
        const supabase = params.supabase || getSupabase();
        return await sendMoreOptionsRequestEmail({ ...params, supabase });
    } catch (error) {
        console.error('⚠️ More options request email failed (safe wrapper):', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send health status change notification email
 * Triggered when lead health status changes to yellow or red
 */
export async function sendHealthStatusChangeEmail({ leadId, previousStatus, newStatus, previousScore, newScore, reason = null, supabase }) {
    console.log('📧 sendHealthStatusChangeEmail called:', { leadId, previousStatus, newStatus });

    try {
        // Only send for yellow or red status
        if (newStatus !== 'yellow' && newStatus !== 'red') {
            console.log('⏭️ Skipping health status email - status is not yellow or red');
            return { success: false, skipped: true, reason: 'status_not_critical' };
        }

        // Don't send if reason is inactivity (separate email for that)
        if (reason === 'inactivity') {
            console.log('⏭️ Skipping health status email - inactivity has separate notification');
            return { success: false, skipped: true, reason: 'inactivity_handled_separately' };
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

        // Check if lead has assigned agent
        if (!lead.assigned_agent_id) {
            console.log('⏭️ Skipping health status email - no assigned agent');
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
                emailType: 'agent_health_status_changed',
                message: `Agent ${agent.name} has no email address. Cannot send health status notification.`,
                metadata: { lead_name: lead.name, agent_name: agent.name, new_status: newStatus },
                supabase
            });
            return { success: false, error: 'missing_agent_email' };
        }

        // Prepare email variables
        const baseUrl = window.location.origin;
        const leadDetailUrl = `${baseUrl}/?view=leads&leadId=${leadId}`;

        const variables = {
            agentName: agent.name || 'Agent',
            leadName: lead.name || 'Lead',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            previousStatus: previousStatus?.toUpperCase() || 'UNKNOWN',
            newStatus: newStatus?.toUpperCase() || 'UNKNOWN',
            previousScore: previousScore || 0,
            newScore: newScore || 0,
            changedAt: new Date().toLocaleString(),
            leadDetailUrl: leadDetailUrl
        };

        // Send email via API
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: 'agent_health_status_changed',
                recipientEmail: agent.email,
                recipientName: agent.name,
                variables: variables,
                metadata: {
                    lead_id: leadId,
                    agent_id: agent.id,
                    email_type: 'agent_health_status_changed',
                    previous_status: previousStatus,
                    new_status: newStatus,
                    previous_score: previousScore,
                    new_score: newScore
                },
                sentBy: 'system'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Email API request failed');
        }

        const result = await response.json();
        console.log('✅ Health status change email sent successfully:', result);

        // Log activity
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: leadId,
                    activity_type: 'agent_notification_sent',
                    description: `Health status alert sent to ${agent.name}`,
                    metadata: {
                        email_type: 'agent_health_status_changed',
                        email_log_id: result.emailLogId,
                        agent_id: agent.id,
                        previous_status: previousStatus,
                        new_status: newStatus
                    },
                    performed_by: null,
                    performed_by_name: 'System'
                }]);
        } catch (activityError) {
            console.error('⚠️ Failed to log activity:', activityError);
        }

        return { success: true, emailLogId: result.emailLogId };

    } catch (error) {
        console.error('❌ Error sending health status change email:', error);

        await createEmailAlert({
            alertType: 'email_send_failed',
            severity: 'error',
            leadId: leadId,
            agentId: null,
            emailType: 'agent_health_status_changed',
            message: `Failed to send health status notification: ${error.message}`,
            metadata: { error: error.message, new_status: newStatus },
            supabase
        });

        return { success: false, error: error.message };
    }
}

/**
 * Fail-safe wrapper for sendHealthStatusChangeEmail
 */
export async function sendHealthStatusChangeEmailSafe(params) {
    try {
        const supabase = params.supabase || getSupabase();
        return await sendHealthStatusChangeEmail({ ...params, supabase });
    } catch (error) {
        console.error('⚠️ Health status change email failed (safe wrapper):', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send inactivity alert notification email
 * Triggered when lead has been inactive for 36+ hours
 */
export async function sendInactivityAlertEmail({ leadId, hoursSinceActivity, lastActivityDate, lastActivityType, newHealthStatus, supabase }) {
    console.log('📧 sendInactivityAlertEmail called:', { leadId, hoursSinceActivity });

    try {
        // Check if already sent inactivity alert in last 24 hours (duplicate prevention)
        const cooldownDate = new Date();
        cooldownDate.setHours(cooldownDate.getHours() - 24);

        const { data: recentAlerts, error: alertCheckError } = await supabase
            .from('email_logs')
            .select('id, created_at')
            .eq('metadata->>lead_id', leadId)
            .eq('metadata->>email_type', 'agent_inactivity_alert')
            .gte('created_at', cooldownDate.toISOString())
            .limit(1);

        if (!alertCheckError && recentAlerts && recentAlerts.length > 0) {
            console.log('⏭️ Skipping inactivity alert - already sent in last 24 hours');
            return { success: false, skipped: true, reason: 'duplicate_within_24h' };
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

        // Check if lead has assigned agent
        if (!lead.assigned_agent_id) {
            console.log('⏭️ Skipping inactivity alert - no assigned agent');
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
                emailType: 'agent_inactivity_alert',
                message: `Agent ${agent.name} has no email address. Cannot send inactivity alert.`,
                metadata: { lead_name: lead.name, agent_name: agent.name, hours_since_activity: hoursSinceActivity },
                supabase
            });
            return { success: false, error: 'missing_agent_email' };
        }

        // Prepare email variables
        const baseUrl = window.location.origin;
        const leadDetailUrl = `${baseUrl}/?view=leads&leadId=${leadId}`;

        const variables = {
            agentName: agent.name || 'Agent',
            leadName: lead.name || 'Lead',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            hoursSinceActivity: Math.floor(hoursSinceActivity),
            lastActivityDate: new Date(lastActivityDate).toLocaleString(),
            lastActivityType: lastActivityType || 'Unknown',
            newHealthStatus: newHealthStatus?.toUpperCase() || 'YELLOW',
            leadDetailUrl: leadDetailUrl
        };

        // Send email via API
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: 'agent_inactivity_alert',
                recipientEmail: agent.email,
                recipientName: agent.name,
                variables: variables,
                metadata: {
                    lead_id: leadId,
                    agent_id: agent.id,
                    email_type: 'agent_inactivity_alert',
                    hours_since_activity: hoursSinceActivity,
                    new_health_status: newHealthStatus
                },
                sentBy: 'system'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Email API request failed');
        }

        const result = await response.json();
        console.log('✅ Inactivity alert email sent successfully:', result);

        // Log activity
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: leadId,
                    activity_type: 'agent_notification_sent',
                    description: `Inactivity alert sent to ${agent.name}`,
                    metadata: {
                        email_type: 'agent_inactivity_alert',
                        email_log_id: result.emailLogId,
                        agent_id: agent.id,
                        hours_since_activity: hoursSinceActivity
                    },
                    performed_by: null,
                    performed_by_name: 'System'
                }]);
        } catch (activityError) {
            console.error('⚠️ Failed to log activity:', activityError);
        }

        return { success: true, emailLogId: result.emailLogId };

    } catch (error) {
        console.error('❌ Error sending inactivity alert email:', error);

        await createEmailAlert({
            alertType: 'email_send_failed',
            severity: 'error',
            leadId: leadId,
            agentId: null,
            emailType: 'agent_inactivity_alert',
            message: `Failed to send inactivity alert: ${error.message}`,
            metadata: { error: error.message, hours_since_activity: hoursSinceActivity },
            supabase
        });

        return { success: false, error: error.message };
    }
}

/**
 * Fail-safe wrapper for sendInactivityAlertEmail
 */
export async function sendInactivityAlertEmailSafe(params) {
    try {
        const supabase = params.supabase || getSupabase();
        return await sendInactivityAlertEmail({ ...params, supabase });
    } catch (error) {
        console.error('⚠️ Inactivity alert email failed (safe wrapper):', error);
        return { success: false, error: error.message };
    }
}

