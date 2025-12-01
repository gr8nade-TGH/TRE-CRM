/**
 * Send Lease Confirmation for Signature
 * 
 * This endpoint orchestrates the complete workflow:
 * 1. Fetch lease confirmation from database
 * 2. Generate PDF using our PDF generation service
 * 3. Upload PDF to Documenso
 * 4. Create signing request
 * 5. Send email to property contact
 * 6. Update database with Documenso document ID and signing URL
 * 
 * POST /api/documenso/send-for-signature
 * Body: { leaseConfirmationId: string }
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - DOCUMENSO_API_KEY
 * - RESEND_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { createDocument } from '../lib/documenso-client.js';
import { sendLeaseSigningRequest } from '../lib/email-service.js';

// Initialize Supabase client with service role key to bypass RLS
const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNTUwOCwiZXhwIjoyMDc1MjkxNTA4fQ.bBGcPCsjEBBx6tgzmenJ6V7SGfzDJnAMoYBUpRUFAPA'
);

/**
 * Generate PDF by calling our PDF generation endpoint
 */
async function generatePDF(leaseConfirmationId) {
	console.log('Generating PDF for lease confirmation:', leaseConfirmationId);

	// Call our own PDF generation endpoint
	const baseUrl = process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: 'http://localhost:3000';

	const pdfUrl = `${baseUrl}/api/pdf/generate-lease-confirmation?leaseConfirmationId=${leaseConfirmationId}`;

	const response = await fetch(pdfUrl);

	if (!response.ok) {
		throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

export default async function handler(req, res) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const { leaseConfirmationId, recipientEmail, ccEmail } = req.body;

		if (!leaseConfirmationId) {
			return res.status(400).json({ error: 'leaseConfirmationId is required' });
		}

		console.log('=== Starting Send for Signature Workflow ===');
		console.log('Lease Confirmation ID:', leaseConfirmationId);
		console.log('Custom Recipient Email:', recipientEmail || 'Using property contact email');
		console.log('CC Email:', ccEmail || 'None');

		// Step 1: Fetch lease confirmation from database
		console.log('Step 1: Fetching lease confirmation...');
		const { data: leaseConfirmation, error: fetchError } = await supabase
			.from('lease_confirmations')
			.select('*')
			.eq('id', leaseConfirmationId)
			.single();

		if (fetchError || !leaseConfirmation) {
			console.error('Lease confirmation not found:', fetchError);
			return res.status(404).json({ error: 'Lease confirmation not found' });
		}

		// Validate status
		if (leaseConfirmation.status !== 'pending_signature') {
			// Provide helpful error messages based on current status
			let message = 'Lease confirmation must be in pending_signature status';
			if (leaseConfirmation.status === 'awaiting_signature') {
				message = 'This lease has already been sent for signature';
			} else if (leaseConfirmation.status === 'signed') {
				message = 'This lease has already been signed';
			} else if (leaseConfirmation.status === 'draft') {
				message = 'Please submit the lease confirmation before sending for signature';
			}

			return res.status(400).json({
				error: 'Invalid status',
				message: message,
				currentStatus: leaseConfirmation.status
			});
		}

		console.log('Lease confirmation found:', {
			id: leaseConfirmation.id,
			leadId: leaseConfirmation.lead_id,
			propertyId: leaseConfirmation.property_id
		});

		// Safety check: Prevent duplicate sends
		if (leaseConfirmation.documenso_document_id) {
			console.warn('Lease already has a Documenso document ID:', leaseConfirmation.documenso_document_id);
			return res.status(400).json({
				error: 'Already sent',
				message: 'This lease has already been sent to Documenso',
				documensoDocumentId: leaseConfirmation.documenso_document_id
			});
		}

		// Step 2: Fetch property data for contact info
		console.log('Step 2: Fetching property data...');
		const { data: property, error: propertyError } = await supabase
			.from('properties')
			.select('contact_name, contact_email, contact_phone, community_name, name')
			.eq('id', leaseConfirmation.property_id)
			.single();

		if (propertyError || !property) {
			console.error('Property not found:', propertyError);
			return res.status(404).json({ error: 'Property not found' });
		}

		// Use custom recipient email if provided, otherwise use property contact email
		const finalRecipientEmail = recipientEmail || property.contact_email;
		const finalRecipientName = property.contact_name || 'Property Contact';

		// Validate we have an email
		if (!finalRecipientEmail) {
			return res.status(400).json({
				error: 'Missing recipient email',
				message: 'Please provide a recipient email address'
			});
		}

		console.log('Recipient:', {
			name: finalRecipientName,
			email: finalRecipientEmail,
			source: recipientEmail ? 'custom' : 'property_contact'
		});

		// Step 3: Fetch agent/locator data
		console.log('Step 3: Fetching agent data...');
		const { data: agent, error: agentError } = await supabase
			.from('users')
			.select('name, email, phone')
			.eq('id', leaseConfirmation.created_by)
			.single();

		const agentData = agent || {
			name: leaseConfirmation.locator || 'Texas Relocation Experts',
			email: leaseConfirmation.locator_contact || 'info@tre-crm.com',
			phone: null
		};

		console.log('Agent data:', agentData);

		// Step 4: Generate PDF
		console.log('Step 4: Generating PDF...');
		const pdfBuffer = await generatePDF(leaseConfirmationId);
		console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

		// Step 5: Upload to Documenso
		console.log('Step 5: Uploading to Documenso...');
		const documentTitle = `Lease Confirmation - ${leaseConfirmation.tenant_names || 'Tenant'}`;

		// Build recipients array - primary signer
		const recipients = [{
			email: finalRecipientEmail,
			name: finalRecipientName,
			role: 'SIGNER'
		}];

		// Add CC recipient if provided (as viewer, not signer)
		if (ccEmail) {
			recipients.push({
				email: ccEmail,
				name: 'CC Recipient',
				role: 'CC'
			});
			console.log('Adding CC recipient:', ccEmail);
		}

		const documensoDoc = await createDocument({
			title: documentTitle,
			pdfBuffer: pdfBuffer,
			recipients: recipients,
			metadata: {
				leaseConfirmationId: leaseConfirmation.id,
				leadId: leaseConfirmation.lead_id,
				propertyId: leaseConfirmation.property_id,
				source: 'TRE_CRM',
				ccEmail: ccEmail || null
			}
		});

		console.log('Document uploaded to Documenso:', {
			documentId: documensoDoc.id,
			recipientId: documensoDoc.recipients?.[0]?.id
		});

		// Extract signing URL from Documenso response
		const signingUrl = documensoDoc.recipients?.[0]?.signingUrl || documensoDoc.signingUrl;

		if (!signingUrl) {
			throw new Error('No signing URL returned from Documenso');
		}

		console.log('Signing URL:', signingUrl);

		// Step 6: Update database with Documenso info
		console.log('Step 6: Updating database...');
		const { error: updateError } = await supabase
			.from('lease_confirmations')
			.update({
				status: 'awaiting_signature',
				documenso_document_id: documensoDoc.id,
				documenso_signing_url: signingUrl,
				documenso_recipient_id: documensoDoc.recipients?.[0]?.id || null,
				sent_for_signature_at: new Date().toISOString(),
				recipient_email: finalRecipientEmail,
				recipient_name: finalRecipientName,
				cc_email: ccEmail || null
			})
			.eq('id', leaseConfirmation.id);

		if (updateError) {
			console.error('Error updating lease confirmation:', updateError);
			throw new Error(`Failed to update database: ${updateError.message}`);
		}

		console.log('Database updated successfully');

		// Step 7: Log activity
		console.log('Step 7: Logging activity...');
		let activityDescription = `Lease confirmation sent to ${finalRecipientName} (${finalRecipientEmail}) for signature`;
		if (ccEmail) {
			activityDescription += ` with CC to ${ccEmail}`;
		}

		const { error: activityError } = await supabase
			.from('lead_activities')
			.insert({
				lead_id: leaseConfirmation.lead_id,
				activity_type: 'lease_sent',
				description: activityDescription,
				metadata: {
					lease_confirmation_id: leaseConfirmation.id,
					documenso_document_id: documensoDoc.id,
					recipient_email: finalRecipientEmail,
					recipient_name: finalRecipientName,
					cc_email: ccEmail || null,
					property_id: leaseConfirmation.property_id,
					property_name: property.community_name || property.name
				}
			});

		if (activityError) {
			console.error('Error logging activity:', activityError);
			// Don't fail the request if activity logging fails
		}

		// Step 8: Send email to property contact
		console.log('Step 8: Sending email notification...');
		try {
			await sendLeaseSigningRequest({
				to: finalRecipientEmail,
				toName: finalRecipientName,
				ccEmail: ccEmail || null,
				signingUrl: signingUrl,
				leaseData: {
					tenantName: leaseConfirmation.tenant_names,
					propertyName: property.community_name || property.name,
					unitNumber: leaseConfirmation.unit_number,
					moveInDate: leaseConfirmation.move_in_date,
					rentAmount: leaseConfirmation.rent_amount
				},
				agentData: agentData
			});
			console.log('Email sent successfully');
			if (ccEmail) {
				console.log('CC email sent to:', ccEmail);
			}
		} catch (emailError) {
			console.error('Error sending email:', emailError);
			// Don't fail the request if email fails - document is already in Documenso
			// Agent can manually send the signing URL
		}

		console.log('=== Send for Signature Workflow Complete ===');

		// Return success response
		return res.status(200).json({
			success: true,
			message: 'Lease confirmation sent for signature successfully',
			data: {
				leaseConfirmationId: leaseConfirmation.id,
				documensoDocumentId: documensoDoc.id,
				signingUrl: signingUrl,
				recipientEmail: finalRecipientEmail,
				recipientName: finalRecipientName,
				ccEmail: ccEmail || null,
				status: 'awaiting_signature'
			}
		});

	} catch (error) {
		console.error('=== Send for Signature Error ===');
		console.error('Error:', error);
		console.error('Stack:', error.stack);

		return res.status(500).json({
			error: 'Internal server error',
			message: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
}
