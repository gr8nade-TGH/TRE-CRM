/**
 * Track Email Open Endpoint
 * 
 * Logs when an email is opened via tracking pixel
 * Returns a 1x1 transparent GIF
 * 
 * Query params:
 * - id: email_log_id (UUID)
 */

import { createClient } from '@supabase/supabase-js';

// 1x1 transparent GIF (base64 encoded)
const TRACKING_PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    // Validate email log ID
    if (!id) {
        console.error('❌ Missing email log ID');
        // Still return tracking pixel to avoid broken images
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.status(200).send(TRACKING_PIXEL);
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
            .select('id, opened_at, open_count')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching email log:', fetchError);
            // Still return tracking pixel
            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            return res.status(200).send(TRACKING_PIXEL);
        }

        if (!emailLog) {
            console.error('❌ Email log not found:', id);
            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            return res.status(200).send(TRACKING_PIXEL);
        }

        // Update email log with open tracking
        const updateData = {
            open_count: (emailLog.open_count || 0) + 1,
            last_opened_at: now
        };

        // If this is the first open, set opened_at
        if (!emailLog.opened_at) {
            updateData.opened_at = now;
        }

        const { error: updateError } = await supabase
            .from('email_logs')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            console.error('❌ Error updating email log:', updateError);
        } else {
            console.log(`✅ Email open tracked: ${id} (count: ${updateData.open_count})`);
        }

    } catch (error) {
        console.error('❌ Error in track-email-open:', error);
    }

    // Always return tracking pixel (even if tracking failed)
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).send(TRACKING_PIXEL);
}

