/**
 * Documenso Webhook Handler
 * 
 * This serverless function receives webhook events from Documenso when documents are signed.
 * It updates the lease confirmation status and logs the activity.
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - DOCUMENSO_WEBHOOK_SECRET
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Verify webhook signature to ensure request is from Documenso
 */
function verifySignature(payload, signature, secret) {
	try {
		const hmac = crypto.createHmac('sha256', secret);
		const digest = hmac.update(JSON.stringify(payload)).digest('hex');
		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
	} catch (error) {
		console.error('Signature verification error:', error);
		return false;
	}
}

export default async function handler(req, res) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		console.log('Documenso webhook received');
		console.log('Headers:', req.headers);
		console.log('Body:', req.body);

		// Verify webhook signature
		const signature = req.headers['x-documenso-signature'];
		const webhookSecret = process.env.DOCUMENSO_WEBHOOK_SECRET;

		if (!signature || !webhookSecret) {
			console.error('Missing signature or webhook secret');
			return res.status(401).json({ error: 'Missing authentication' });
		}

		// Verify the signature
		const isValid = verifySignature(req.body, signature, webhookSecret);
		if (!isValid) {
			console.error('Invalid webhook signature');
			return res.status(401).json({ error: 'Invalid signature' });
		}

		const event = req.body;
		const eventType = event.type || event.event;

		console.log('Event type:', eventType);

		// Handle document signed/completed events
		if (eventType === 'document.signed' || eventType === 'document.completed') {
			const documentId = event.data?.documentId || event.data?.id;
			const signerName = event.data?.signerName || event.data?.recipient?.name;
			const signerEmail = event.data?.signerEmail || event.data?.recipient?.email;
			const documentUrl = event.data?.documentUrl || event.data?.url;

			console.log('Document signed:', { documentId, signerName, signerEmail });

			// Find lease confirmation by documenso_document_id
			const { data: leaseConfirmation, error: findError } = await supabase
				.from('lease_confirmations')
				.select('*')
				.eq('documenso_document_id', documentId)
				.single();

			if (findError || !leaseConfirmation) {
				console.error('Lease confirmation not found for document:', documentId, findError);
				return res.status(404).json({ error: 'Lease confirmation not found' });
			}

			console.log('Found lease confirmation:', leaseConfirmation.id);

			// Update status to signed
			const { error: updateError } = await supabase
				.from('lease_confirmations')
				.update({
					status: 'signed',
					signed_at: new Date().toISOString(),
					signed_by_name: signerName || null,
					signed_by_email: signerEmail || null,
					documenso_pdf_url: documentUrl || null
				})
				.eq('id', leaseConfirmation.id);

			if (updateError) {
				console.error('Error updating lease confirmation:', updateError);
				return res.status(500).json({ error: 'Failed to update lease confirmation' });
			}

			console.log('Lease confirmation updated to signed');

			// Log activity
			const { error: activityError } = await supabase
				.from('lead_activities')
				.insert({
					lead_id: leaseConfirmation.lead_id,
					activity_type: 'lease_signed',
					description: `Lease confirmation signed by ${signerName || signerEmail || 'property contact'}`,
					metadata: {
						document_id: documentId,
						signed_by_name: signerName,
						signed_by_email: signerEmail,
						signed_at: new Date().toISOString(),
						property_id: leaseConfirmation.property_id
					}
				});

			if (activityError) {
				console.error('Error logging activity:', activityError);
				// Don't fail the webhook if activity logging fails
			}

			console.log('Activity logged successfully');

			return res.status(200).json({ 
				success: true, 
				message: 'Lease confirmation updated to signed',
				leaseConfirmationId: leaseConfirmation.id
			});
		}

		// Handle document declined event
		if (eventType === 'document.declined') {
			const documentId = event.data?.documentId || event.data?.id;
			const reason = event.data?.reason || 'No reason provided';

			console.log('Document declined:', { documentId, reason });

			// Find and update lease confirmation
			const { error: updateError } = await supabase
				.from('lease_confirmations')
				.update({
					status: 'error',
					last_error: `Document declined: ${reason}`
				})
				.eq('documenso_document_id', documentId);

			if (updateError) {
				console.error('Error updating lease confirmation:', updateError);
			}

			return res.status(200).json({ success: true, message: 'Document declined event processed' });
		}

		// Unknown event type - log and return success
		console.log('Unknown event type, ignoring:', eventType);
		return res.status(200).json({ success: true, message: 'Event type not handled' });

	} catch (error) {
		console.error('Webhook error:', error);
		return res.status(500).json({ error: 'Internal server error', details: error.message });
	}
}

