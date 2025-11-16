/**
 * Guest Card Email Utility
 * 
 * Sends guest card emails to property owners when their properties are included
 * in a Smart Match showcase sent to a lead.
 * 
 * Features:
 * - Duplicate prevention (7-day window)
 * - Activity logging (lead_activities + property_activities)
 * - Email tracking (open + click tracking)
 * - Graceful error handling (doesn't fail Smart Match if guest cards fail)
 */

/**
 * Check if a guest card was already sent to this property owner about this lead
 * within the last 7 days (duplicate prevention)
 * 
 * @param {string} leadId - Lead ID
 * @param {string} propertyId - Property ID
 * @param {object} supabase - Supabase client
 * @returns {Promise<boolean>} - True if already sent within 7 days
 */
async function wasGuestCardRecentlySent(leadId, propertyId, supabase) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('email_logs')
            .select('id, created_at')
            .eq('metadata->>lead_id', leadId)
            .eq('metadata->>property_id', propertyId)
            .eq('metadata->>email_type', 'guest_card')
            .eq('status', 'sent')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error checking guest card status:', error);
            return false; // Fail open - allow sending if we can't check
        }

        if (data && data.length > 0) {
            const sentAt = new Date(data[0].created_at);
            const daysSince = (new Date() - sentAt) / (1000 * 60 * 60 * 24);
            console.log(`📧 Guest card was sent ${daysSince.toFixed(1)} days ago - skipping`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Error in wasGuestCardRecentlySent:', error);
        return false; // Fail open
    }
}

/**
 * Format lead preferences for email display
 */
function formatLeadPreferences(lead) {
    const prefs = lead.preferences || {};

    const budget = prefs.budget
        ? `$${prefs.budget}/month`
        : (prefs.budget_min && prefs.budget_max
            ? `$${prefs.budget_min} - $${prefs.budget_max}/month`
            : 'Not specified');

    const bedrooms = prefs.beds || lead.bedrooms || 'Not specified';
    const bathrooms = prefs.baths || lead.bathrooms || 'Not specified';

    const moveInDate = prefs.move_in_date || lead.move_in_date || 'Flexible';

    return {
        budget,
        bedrooms,
        bathrooms,
        moveInDate
    };
}

/**
 * Send guest card email to a single property owner
 * 
 * @param {object} params - Parameters
 * @param {object} params.lead - Lead object
 * @param {object} params.property - Property object
 * @param {object} params.agent - Agent object
 * @param {string} params.smartMatchEmailLogId - Smart Match email log ID
 * @param {object} params.supabase - Supabase client
 * @returns {Promise<object>} - { success: boolean, emailLogId: string, skipped: boolean }
 */
async function sendSingleGuestCard({ lead, property, agent, smartMatchEmailLogId, supabase }) {
    try {
        // Validate property owner email
        if (!property.contact_email) {
            console.warn(`⚠️ Property ${property.id} has no contact_email - skipping guest card`);
            return {
                success: false,
                skipped: true,
                reason: 'no_owner_email',
                propertyId: property.id,
                propertyName: property.name || property.community_name
            };
        }

        // Check duplicate prevention
        const recentlySent = await wasGuestCardRecentlySent(lead.id, property.id, supabase);
        if (recentlySent) {
            console.log(`⏭️ Guest card already sent for property ${property.id} and lead ${lead.id} - skipping`);
            return {
                success: false,
                skipped: true,
                reason: 'duplicate_prevention',
                propertyId: property.id,
                propertyName: property.name || property.community_name
            };
        }

        // Format lead preferences
        const prefs = formatLeadPreferences(lead);

        // Prepare email variables
        const variables = {
            propertyOwnerName: property.contact_name || 'Property Owner',
            propertyName: property.name || property.community_name || 'Your Property',
            leadName: lead.name || 'Prospective Tenant',
            leadEmail: lead.email || 'Not provided',
            leadPhone: lead.phone || 'Not provided',
            leadBudget: prefs.budget,
            leadBedrooms: prefs.bedrooms,
            leadBathrooms: prefs.bathrooms,
            leadMoveInDate: prefs.moveInDate,
            agentName: agent.name || 'Your Agent',
            agentEmail: agent.email || 'agent@texasrelocationexperts.com',
            agentPhone: agent.phone || '(555) 123-4567'
        };

        // Send email via API (requires authentication)
        console.log(`📧 Sending guest card to ${property.contact_email} for property ${property.id}`);

        // Get auth headers
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
            throw new Error('Not authenticated - please log in');
        }

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                templateId: 'guest_card_email',
                recipientEmail: property.contact_email,
                recipientName: property.contact_name || 'Property Owner',
                variables: variables,
                metadata: {
                    email_type: 'guest_card',
                    lead_id: lead.id,
                    property_id: property.id,
                    agent_id: agent.id,
                    smart_match_email_log_id: smartMatchEmailLogId
                },
                sentBy: agent.id || null
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Guest card email API error:', errorText);
            throw new Error(`Email API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Guest card sent successfully:', result.emailLogId);

        // Log activity to lead_activities
        try {
            await supabase
                .from('lead_activities')
                .insert([{
                    lead_id: lead.id,
                    activity_type: 'guest_card_sent',
                    description: `Guest card sent to property owner at ${property.name || property.community_name}`,
                    metadata: {
                        property_id: property.id,
                        property_name: property.name || property.community_name,
                        owner_email: property.contact_email,
                        smart_match_email_log_id: smartMatchEmailLogId,
                        guest_card_email_log_id: result.emailLogId
                    },
                    performed_by: agent.id || null,
                    performed_by_name: agent.name || 'System'
                }]);
            console.log('✅ Lead activity logged');
        } catch (activityError) {
            console.error('⚠️ Failed to log lead activity:', activityError);
            // Don't fail the whole operation
        }

        // Log activity to property_activities
        try {
            await supabase
                .from('property_activities')
                .insert([{
                    property_id: property.id,
                    community_name: property.name || property.community_name || 'Unknown',
                    activity_type: 'guest_card_sent',
                    description: `Guest card sent to owner about lead ${lead.name}`,
                    metadata: {
                        lead_id: lead.id,
                        lead_name: lead.name,
                        lead_email: lead.email,
                        smart_match_email_log_id: smartMatchEmailLogId,
                        guest_card_email_log_id: result.emailLogId
                    },
                    performed_by: agent.id || null
                }]);
            console.log('✅ Property activity logged');
        } catch (activityError) {
            console.error('⚠️ Failed to log property activity:', activityError);
            // Don't fail the whole operation
        }

        return {
            success: true,
            emailLogId: result.emailLogId,
            resendId: result.resendId,
            propertyId: property.id,
            propertyName: property.name || property.community_name,
            ownerEmail: property.contact_email
        };

    } catch (error) {
        console.error(`❌ Error sending guest card for property ${property.id}:`, error);
        return {
            success: false,
            error: error.message,
            propertyId: property.id,
            propertyName: property.name || property.community_name
        };
    }
}

/**
 * Send guest cards to all property owners for properties included in Smart Match
 * 
 * @param {object} params - Parameters
 * @param {string} params.leadId - Lead ID
 * @param {string[]} params.propertyIds - Array of property IDs
 * @param {string} params.agentId - Agent ID
 * @param {string} params.smartMatchEmailLogId - Smart Match email log ID
 * @param {object} params.supabase - Supabase client
 * @returns {Promise<object>} - { sent: number, skipped: number, failed: number, details: [...] }
 */
export async function sendGuestCards({ leadId, propertyIds, agentId, smartMatchEmailLogId, supabase }) {
    console.log('📧 sendGuestCards called with:', { leadId, propertyIds, agentId, smartMatchEmailLogId });

    // Validate inputs
    if (!leadId || !propertyIds || propertyIds.length === 0 || !agentId || !supabase) {
        console.error('❌ Invalid parameters for sendGuestCards');
        return { sent: 0, skipped: 0, failed: 0, details: [] };
    }

    try {
        // Fetch lead details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) {
            console.error('❌ Failed to fetch lead:', leadError);
            return { sent: 0, skipped: 0, failed: 0, details: [] };
        }

        // Fetch agent details
        const { data: agent, error: agentError } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            console.error('❌ Failed to fetch agent:', agentError);
            return { sent: 0, skipped: 0, failed: 0, details: [] };
        }

        // Fetch properties
        const { data: properties, error: propertiesError } = await supabase
            .from('properties')
            .select('id, name, community_name, contact_name, contact_email, contact_phone')
            .in('id', propertyIds);

        if (propertiesError || !properties) {
            console.error('❌ Failed to fetch properties:', propertiesError);
            return { sent: 0, skipped: 0, failed: 0, details: [] };
        }

        console.log(`✅ Fetched ${properties.length} properties for guest cards`);

        // Send guest card to each property owner
        const results = [];
        for (const property of properties) {
            const result = await sendSingleGuestCard({
                lead,
                property,
                agent,
                smartMatchEmailLogId,
                supabase
            });
            results.push(result);
        }

        // Summarize results
        const sent = results.filter(r => r.success).length;
        const skipped = results.filter(r => r.skipped).length;
        const failed = results.filter(r => !r.success && !r.skipped).length;

        console.log(`✅ Guest cards summary: ${sent} sent, ${skipped} skipped, ${failed} failed`);

        return {
            sent,
            skipped,
            failed,
            details: results
        };

    } catch (error) {
        console.error('❌ Error in sendGuestCards:', error);
        return { sent: 0, skipped: 0, failed: 0, details: [], error: error.message };
    }
}

/**
 * Safe wrapper for sendGuestCards that never throws
 * Use this in production code to prevent guest card failures from breaking Smart Match
 */
export async function sendGuestCardsSafe(params) {
    try {
        return await sendGuestCards(params);
    } catch (error) {
        console.error('❌ Error in sendGuestCardsSafe:', error);
        return {
            sent: 0,
            skipped: 0,
            failed: 0,
            details: [],
            error: error.message
        };
    }
}

