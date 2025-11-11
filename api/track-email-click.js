/**
 * Track Email Click Endpoint
 * 
 * Logs when a CTA in an email is clicked
 * Redirects to the target URL
 * 
 * Query params:
 * - id: email_log_id (UUID)
 * - link: link identifier (e.g., "cta_button", "property_card", "agent_email")
 * - url: target URL to redirect to (URL encoded)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, link, url } = req.query;

    // Validate required parameters
    if (!id || !link || !url) {
        console.error('❌ Missing required parameters:', { id, link, url });
        // Redirect to homepage if URL is missing
        return res.redirect(302, url || 'https://tre-crm.vercel.app');
    }

    try {
        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const now = new Date().toISOString();

        // Fetch current email log
        const { data: emailLog, error: fetchError } = await supabase
            .from('email_logs')
            .select('id, clicks, click_count, first_clicked_at')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching email log:', fetchError);
            // Still redirect to target URL
            return res.redirect(302, url);
        }

        if (!emailLog) {
            console.error('❌ Email log not found:', id);
            return res.redirect(302, url);
        }

        // Prepare click event
        const clickEvent = {
            link: link,
            clicked_at: now
        };

        // Get existing clicks array
        const existingClicks = emailLog.clicks || [];
        const updatedClicks = [...existingClicks, clickEvent];

        // Update email log with click tracking
        const updateData = {
            clicks: updatedClicks,
            click_count: (emailLog.click_count || 0) + 1
        };

        // If this is the first click, set first_clicked_at
        if (!emailLog.first_clicked_at) {
            updateData.first_clicked_at = now;
        }

        const { error: updateError } = await supabase
            .from('email_logs')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            console.error('❌ Error updating email log:', updateError);
        } else {
            console.log(`✅ Email click tracked: ${id} - ${link} (count: ${updateData.click_count})`);
        }

    } catch (error) {
        console.error('❌ Error in track-email-click:', error);
    }

    // Always redirect to target URL (even if tracking failed)
    return res.redirect(302, url);
}

