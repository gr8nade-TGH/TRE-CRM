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

// Initialize Supabase client
const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.VITE_SUPABASE_ANON_KEY
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
		const { leaseConfirmationId } = req.body;

		if (!leaseConfirmationId) {
			return res.status(400).json({ error: 'leaseConfirmationId is required' });
		}

		console.log('=== Starting Send for Signature Workflow ===');
		console.log('Lease Confirmation ID:', leaseConfirmationId);

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
			return res.status(400).json({
				error: 'Invalid status',
				message: 'Lease confirmation must be in pending_signature status',
				currentStatus: leaseConfirmation.status
			});
		}

		console.log('Lease confirmation found:', {
			id: leaseConfirmation.id,
			leadId: leaseConfirmation.lead_id,
			propertyId: leaseConfirmation.property_id
		});

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

		// Validate property contact info
		if (!property.contact_email || !property.contact_name) {
			return res.status(400).json({
				error: 'Missing property contact information',
				message: 'Property must have contact_name and contact_email'
			});
		}

		console.log('Property contact:', {
			name: property.contact_name,
			email: property.contact_email
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

		const documensoDoc = await createDocument({
			title: documentTitle,
			pdfBuffer: pdfBuffer,
			recipients: [{
				email: property.contact_email,
				name: property.contact_name,
				role: 'SIGNER'
			}],
			metadata: {
				leaseConfirmationId: leaseConfirmation.id,
				leadId: leaseConfirmation.lead_id,
				propertyId: leaseConfirmation.property_id,
				source: 'TRE_CRM'
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
				recipient_email: property.contact_email,
				recipient_name: property.contact_name
			})
			.eq('id', leaseConfirmation.id);

		if (updateError) {
			console.error('Error updating lease confirmation:', updateError);
			throw new Error(`Failed to update database: ${updateError.message}`);
		}

		console.log('Database updated successfully');

		// Step 7: Log activity
		console.log('Step 7: Logging activity...');
		const { error: activityError } = await supabase
			.from('lead_activities')
			.insert({
				lead_id: leaseConfirmation.lead_id,
				activity_type: 'lease_sent',
				description: `Lease confirmation sent to ${property.contact_name} (${property.contact_email}) for signature`,
				metadata: {
					lease_confirmation_id: leaseConfirmation.id,
					documenso_document_id: documensoDoc.id,
					recipient_email: property.contact_email,
					recipient_name: property.contact_name,
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
				to: property.contact_email,
				toName: property.contact_name,
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
				recipientEmail: property.contact_email,
				recipientName: property.contact_name,
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
