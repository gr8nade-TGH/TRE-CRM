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
import { downloadDocument } from '../lib/documenso-client.js';

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

			if (!documentId) {
				console.error('No document ID in webhook event');
				return res.status(400).json({ error: 'Missing document ID' });
			}

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

			// Download signed PDF from Documenso and upload to Supabase Storage
			let supabaseStorageUrl = null;
			try {
				console.log('Downloading signed PDF from Documenso...');
				const pdfBuffer = await downloadDocument(documentId);
				console.log('PDF downloaded, size:', pdfBuffer.length, 'bytes');

				// Generate unique filename
				const timestamp = Date.now();
				const filename = `lease_${leaseConfirmation.lead_id}_${timestamp}.pdf`;
				const filePath = `${leaseConfirmation.lead_id}/${filename}`;

				console.log('Uploading to Supabase Storage:', filePath);

				// Upload to Supabase Storage
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from('lease-documents')
					.upload(filePath, pdfBuffer, {
						contentType: 'application/pdf',
						cacheControl: '3600',
						upsert: false
					});

				if (uploadError) {
					console.error('Error uploading to Supabase Storage:', uploadError);
					throw uploadError;
				}

				console.log('PDF uploaded to Supabase Storage:', uploadData.path);

				// Get public URL (even though bucket is private, we store the path)
				const { data: urlData } = supabase.storage
					.from('lease-documents')
					.getPublicUrl(filePath);

				supabaseStorageUrl = urlData.publicUrl;
				console.log('Storage URL:', supabaseStorageUrl);

				// Update lease confirmation with Supabase Storage URL
				const { error: storageUpdateError } = await supabase
					.from('lease_confirmations')
					.update({
						signed_pdf_url: supabaseStorageUrl,
						signed_pdf_storage_path: filePath
					})
					.eq('id', leaseConfirmation.id);

				if (storageUpdateError) {
					console.error('Error updating storage URL:', storageUpdateError);
					// Don't fail the webhook if this update fails
				} else {
					console.log('Lease confirmation updated with storage URL');
				}

			} catch (pdfError) {
				console.error('Error downloading/uploading PDF:', pdfError);
				// Don't fail the webhook if PDF download/upload fails
				// The document is still marked as signed and we have the Documenso URL
			}

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

