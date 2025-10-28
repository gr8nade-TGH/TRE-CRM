/**
 * Email Helper Functions
 * 
 * High-level functions for sending specific types of emails.
 * These functions prepare the data and call the sendEmail API.
 */

/**
 * Send welcome email to a new lead
 * @param {Object} options - Email options
 * @param {Object} options.lead - Lead object with email, name, etc.
 * @param {Object} options.agent - Agent object with name, email, phone
 * @param {Object} options.api - API wrapper instance
 * @param {string} options.sentBy - User ID who triggered the email (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendWelcomeEmail({ lead, agent, api, sentBy }) {
    console.log('📧 Sending welcome email to:', lead.email);

    try {
        const result = await api.sendEmail({
            templateId: 'welcome_lead',
            recipientEmail: lead.email,
            recipientName: lead.name,
            variables: {
                leadName: lead.name || 'there',
                agentName: agent.name || 'Your Agent',
                agentEmail: agent.email || '',
                agentPhone: agent.phone || ''
            },
            metadata: {
                lead_id: lead.id,
                agent_id: agent.id,
                email_type: 'welcome'
            },
            sentBy: sentBy
        });

        console.log('✅ Welcome email sent successfully:', result);
        return result;

    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        throw error;
    }
}

/**
 * Send agent assignment notification email
 * @param {Object} options - Email options
 * @param {Object} options.lead - Lead object with email, name, phone, etc.
 * @param {Object} options.agent - Agent object with name, email
 * @param {Object} options.api - API wrapper instance
 * @param {string} options.sentBy - User ID who triggered the email (optional)
 * @returns {Promise<Object>} Email send result
 */
export async function sendAgentAssignmentEmail({ lead, agent, api, sentBy }) {
    console.log('📧 Sending agent assignment email to:', agent.email);

    try {
        // Format move-in date
        const moveInDate = lead.move_in_date 
            ? new Date(lead.move_in_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'Not specified';

        // Format budget
        const budget = lead.budget 
            ? `$${parseInt(lead.budget).toLocaleString()}/month`
            : 'Not specified';

        // Get CRM URL
        const crmUrl = window.location.origin;

        const result = await api.sendEmail({
            templateId: 'agent_assignment',
            recipientEmail: agent.email,
            recipientName: agent.name,
            variables: {
                agentName: agent.name || 'Agent',
                leadName: lead.name || 'New Lead',
                leadEmail: lead.email || 'Not provided',
                leadPhone: lead.phone || 'Not provided',
                moveInDate: moveInDate,
                budget: budget,
                notes: lead.notes || 'No additional notes',
                crmUrl: crmUrl
            },
            metadata: {
                lead_id: lead.id,
                agent_id: agent.id,
                email_type: 'agent_assignment'
            },
            sentBy: sentBy
        });

        console.log('✅ Agent assignment email sent successfully:', result);
        return result;

    } catch (error) {
        console.error('❌ Error sending agent assignment email:', error);
        throw error;
    }
}

/**
 * Send both welcome email to lead AND assignment email to agent
 * This is a convenience function for when a lead is created and assigned
 * @param {Object} options - Email options
 * @param {Object} options.lead - Lead object
 * @param {Object} options.agent - Agent object
 * @param {Object} options.api - API wrapper instance
 * @param {string} options.sentBy - User ID who triggered the emails (optional)
 * @returns {Promise<Object>} { welcomeResult, assignmentResult }
 */
export async function sendLeadCreatedEmails({ lead, agent, api, sentBy }) {
    console.log('📧 Sending lead created emails (welcome + assignment)');

    try {
        // Send both emails in parallel
        const [welcomeResult, assignmentResult] = await Promise.all([
            sendWelcomeEmail({ lead, agent, api, sentBy }),
            sendAgentAssignmentEmail({ lead, agent, api, sentBy })
        ]);

        console.log('✅ Both emails sent successfully');
        
        return {
            welcomeResult,
            assignmentResult
        };

    } catch (error) {
        console.error('❌ Error sending lead created emails:', error);
        throw error;
    }
}

