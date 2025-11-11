/**
 * Welcome Email Utility
 * 
 * Handles sending welcome emails to new leads with duplicate prevention
 * and activity logging.
 */

/**
 * Check if a welcome email was already sent to this lead
 * @param {string} leadId - Lead ID
 * @param {Object} supabase - Supabase client
 * @returns {Promise<boolean>} True if email was already sent
 */
async function wasWelcomeEmailSent(leadId, supabase) {
    try {
        const { data, error } = await supabase
            .from('email_logs')
            .select('id, created_at')
            .eq('metadata->>lead_id', leadId)
            .eq('metadata->>email_type', 'welcome')
            .eq('status', 'sent')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error checking welcome email status:', error);
            return false; // If we can't check, allow sending (fail open)
        }

        if (data && data.length > 0) {
            const sentAt = new Date(data[0].created_at);
            const now = new Date();
            const hoursSince = (now - sentAt) / (1000 * 60 * 60);
            
            console.log(`📧 Welcome email was sent ${hoursSince.toFixed(1)} hours ago`);
            
            // Prevent duplicate if sent within last 24 hours
            if (hoursSince < 24) {
                console.log('⚠️ Welcome email already sent within 24 hours - skipping');
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('❌ Error in wasWelcomeEmailSent:', error);
        return false; // Fail open
    }
}

/**
 * Send welcome email to a new lead
 * Includes duplicate prevention and activity logging
 * 
 * @param {Object} options - Email options
 * @param {Object} options.lead - Lead object with id, email, name
 * @param {Object} options.agent - Agent object with id, name, email, phone
 * @param {Object} options.supabase - Supabase client
 * @returns {Promise<Object>} { success: boolean, message: string, emailId?: string }
 */
export async function sendWelcomeEmailToLead({ lead, agent, supabase }) {
    console.log('📧 sendWelcomeEmailToLead called for:', lead.email);

    // Validate inputs
    if (!lead || !lead.email || !lead.id) {
        console.error('❌ Invalid lead data:', lead);
        return { success: false, message: 'Invalid lead data' };
    }

    if (!agent || !agent.name || !agent.email) {
        console.error('❌ Invalid agent data:', agent);
        return { success: false, message: 'Invalid agent data' };
    }

    if (!supabase) {
        console.error('❌ Supabase client not provided');
        return { success: false, message: 'Supabase client not provided' };
    }

    try {
        // Step 1: Check if welcome email was already sent
        const alreadySent = await wasWelcomeEmailSent(lead.id, supabase);
        if (alreadySent) {
            return { 
                success: false, 
                message: 'Welcome email already sent within 24 hours',
                skipped: true 
            };
        }

        // Step 2: Prepare email data
        const emailData = {
            templateId: 'welcome_lead',
            recipientEmail: lead.email,
            recipientName: lead.name || 'there',
            variables: {
                leadName: lead.name || 'there',
                agentName: agent.name || 'Your Agent',
                agentEmail: agent.email || '',
                agentPhone: agent.phone || ''
            },
            metadata: {
                lead_id: lead.id,
                agent_id: agent.id,
                email_type: 'welcome',
                source: 'landing_page'
            }
        };

        console.log('📤 Sending welcome email via API...');

        // Step 3: Send email via serverless function
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Email API error:', errorText);
            throw new Error(`Email API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Welcome email sent successfully:', result);

        // Step 4: Log activity to lead_activities table
        try {
            await supabase
                .from('lead_activities')
                .insert({
                    lead_id: lead.id,
                    activity_type: 'welcome_email_sent',
                    description: `Welcome email sent to ${lead.email}`,
                    metadata: {
                        email_id: result.emailLogId,
                        template_id: 'welcome_lead',
                        agent_id: agent.id,
                        agent_name: agent.name,
                        sent_at: new Date().toISOString()
                    },
                    performed_by: null,
                    performed_by_name: 'System'
                });

            console.log('✅ Activity logged for welcome email');
        } catch (activityError) {
            console.error('⚠️ Failed to log welcome email activity:', activityError);
            // Don't fail the whole operation if activity logging fails
        }

        return { 
            success: true, 
            message: 'Welcome email sent successfully',
            emailId: result.emailLogId 
        };

    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return { 
            success: false, 
            message: error.message || 'Failed to send welcome email',
            error: error 
        };
    }
}

/**
 * Send welcome email with error handling that doesn't throw
 * Safe to call from landing page without try/catch
 * 
 * @param {Object} options - Same as sendWelcomeEmailToLead
 * @returns {Promise<void>} Always resolves, never throws
 */
export async function sendWelcomeEmailSafe(options) {
    try {
        const result = await sendWelcomeEmailToLead(options);
        
        if (result.success) {
            console.log('✅ Welcome email sent:', result.message);
        } else if (result.skipped) {
            console.log('⏭️ Welcome email skipped:', result.message);
        } else {
            console.warn('⚠️ Welcome email failed:', result.message);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Unexpected error in sendWelcomeEmailSafe:', error);
        return { 
            success: false, 
            message: 'Unexpected error',
            error: error 
        };
    }
}

