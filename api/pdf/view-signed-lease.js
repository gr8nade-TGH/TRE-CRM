/**
 * View Signed Lease PDF
 * 
 * This endpoint retrieves a signed lease PDF from Supabase Storage
 * and returns it for viewing or download.
 * 
 * Query Parameters:
 * - leaseConfirmationId: The ID of the lease confirmation
 * - download: If true, forces download instead of inline view
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
	// Only allow GET requests
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const { leaseConfirmationId, download } = req.query;

		if (!leaseConfirmationId) {
			return res.status(400).json({ error: 'leaseConfirmationId is required' });
		}

		console.log('Fetching signed lease PDF for:', leaseConfirmationId);

		// Fetch lease confirmation from database
		const { data: leaseConfirmation, error: fetchError } = await supabase
			.from('lease_confirmations')
			.select('*')
			.eq('id', leaseConfirmationId)
			.single();

		if (fetchError || !leaseConfirmation) {
			console.error('Lease confirmation not found:', fetchError);
			return res.status(404).json({ error: 'Lease confirmation not found' });
		}

		// Check if document is signed
		if (leaseConfirmation.status !== 'signed') {
			return res.status(400).json({ 
				error: 'Document not signed',
				message: 'This lease confirmation has not been signed yet',
				currentStatus: leaseConfirmation.status
			});
		}

		// Get storage path
		const storagePath = leaseConfirmation.signed_pdf_storage_path;

		if (!storagePath) {
			// Fallback to Documenso URL if Supabase Storage path not available
			if (leaseConfirmation.documenso_pdf_url) {
				console.log('Redirecting to Documenso URL:', leaseConfirmation.documenso_pdf_url);
				return res.redirect(leaseConfirmation.documenso_pdf_url);
			}
			
			return res.status(404).json({ 
				error: 'PDF not found',
				message: 'Signed PDF is not available in storage'
			});
		}

		console.log('Downloading from Supabase Storage:', storagePath);

		// Download from Supabase Storage
		const { data: fileData, error: downloadError } = await supabase.storage
			.from('lease-documents')
			.download(storagePath);

		if (downloadError) {
			console.error('Error downloading from storage:', downloadError);
			
			// Fallback to Documenso URL
			if (leaseConfirmation.documenso_pdf_url) {
				console.log('Fallback: Redirecting to Documenso URL');
				return res.redirect(leaseConfirmation.documenso_pdf_url);
			}
			
			return res.status(500).json({ 
				error: 'Failed to download PDF',
				details: downloadError.message
			});
		}

		console.log('PDF downloaded successfully');

		// Convert blob to buffer
		const arrayBuffer = await fileData.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Generate filename
		const filename = `Lease_Confirmation_Signed_${leaseConfirmation.lead_id}.pdf`;

		// Set response headers
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Length', buffer.length);
		
		if (download === 'true') {
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		} else {
			res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
		}

		// Send PDF
		return res.send(buffer);

	} catch (error) {
		console.error('Error viewing signed lease:', error);
		return res.status(500).json({
			error: 'Internal server error',
			message: error.message,
			details: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
}

