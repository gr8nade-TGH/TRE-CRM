/**
 * PDF Generation Endpoint for Lease Confirmation
 * 
 * This serverless function generates a PDF from the lease confirmation data.
 * It uses Puppeteer to render the HTML template and convert it to PDF.
 * 
 * Query Parameters:
 * - leaseConfirmationId: The ID of the lease confirmation to generate PDF for
 * - preview: If true, returns PDF for preview; if false, returns for download
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Replace template placeholders with actual data
 */
function populateTemplate(template, data) {
	let html = template;

	// Replace all {{placeholder}} with actual values
	Object.keys(data).forEach(key => {
		const value = data[key] || '';
		const regex = new RegExp(`{{${key}}}`, 'g');
		html = html.replace(regex, value);
	});

	return html;
}

/**
 * Format data for PDF template
 */
function formatDataForPDF(leaseConfirmation) {
	const data = {
		// Basic info
		date: leaseConfirmation.date || '',
		attn: leaseConfirmation.attn || '',
		locator: leaseConfirmation.locator || '',
		propertyName: leaseConfirmation.property_name || '',
		locatorContact: leaseConfirmation.locator_contact || '',
		propertyPhone: leaseConfirmation.property_phone || '',
		faxEmail: leaseConfirmation.fax_email || '',
		splitAgent: leaseConfirmation.split_agent || '',
		splitCut: leaseConfirmation.split_cut || '',

		// Tenant info
		tenantNames: leaseConfirmation.tenant_names || '',
		tenantPhone: leaseConfirmation.tenant_phone || '',
		moveInDate: leaseConfirmation.move_in_date || '',
		expectedUnit: leaseConfirmation.expected_unit || '',

		// Property personnel
		tenantsCorrectYes: leaseConfirmation.tenants_correct === 'yes' ? 'checked' : '',
		tenantsCorrectNo: leaseConfirmation.tenants_correct === 'no' ? 'checked' : '',
		tenantCorrections: leaseConfirmation.tenant_corrections || '',
		unitNumber: leaseConfirmation.unit_number || '',
		rentAmount: leaseConfirmation.rent_amount || '',
		rentWithConcessions: leaseConfirmation.rent_with_concessions || '',

		// Commission checkboxes
		comm25: leaseConfirmation.commission === '25' ? 'checked' : '',
		comm50: leaseConfirmation.commission === '50' ? 'checked' : '',
		comm75: leaseConfirmation.commission === '75' ? 'checked' : '',
		comm100: leaseConfirmation.commission === '100' ? 'checked' : '',
		commOther: leaseConfirmation.commission === 'other' ? 'checked' : '',
		commFlat: leaseConfirmation.commission === 'flat' ? 'checked' : '',
		commissionOtherPercent: leaseConfirmation.commission_other_percent || '',
		commissionFlatAmount: leaseConfirmation.commission_flat_amount || '',

		leaseTerm: leaseConfirmation.lease_term || '',
		poNumber: leaseConfirmation.po_number || '',
		actualMoveInDate: leaseConfirmation.actual_move_in_date || '',
		locatorOnApp: leaseConfirmation.locator_on_app || '',

		// Escorted
		escortedYes: leaseConfirmation.escorted === 'yes' ? 'checked' : '',
		escortedNo: leaseConfirmation.escorted === 'no' ? 'checked' : '',

		// Signature
		printedName: leaseConfirmation.printed_name || '',
		signatureDate: leaseConfirmation.signature_date || '',

		// Accounting
		invoiceNumber: leaseConfirmation.invoice_number || '',
		payStatus: leaseConfirmation.pay_status || '',
		dbRefNumber: leaseConfirmation.db_ref_number || '',

		// Generated date
		generatedDate: new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	};

	return data;
}

export default async function handler(req, res) {
	// Only allow GET requests
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	try {
		const { leaseConfirmationId, preview } = req.query;

		if (!leaseConfirmationId) {
			return res.status(400).json({ error: 'leaseConfirmationId is required' });
		}

		console.log('=== PDF Generation Request ===');
		console.log('Lease Confirmation ID:', leaseConfirmationId);
		console.log('Preview mode:', preview || 'false');

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

		console.log('Lease confirmation found:', leaseConfirmation.id);

		// Read HTML template from same directory as this function
		// Try multiple paths to find the template
		let template;
		let templatePath;

		const possiblePaths = [
			join(__dirname, 'lease-confirmation-template.html'),
			join(process.cwd(), 'api', 'pdf', 'lease-confirmation-template.html'),
			'./lease-confirmation-template.html'
		];

		console.log('Attempting to load template from possible paths:', possiblePaths);

		for (const path of possiblePaths) {
			try {
				console.log('Trying path:', path);
				template = readFileSync(path, 'utf-8');
				templatePath = path;
				console.log('✅ Template loaded successfully from:', path, 'Length:', template.length);
				break;
			} catch (err) {
				console.log('❌ Failed to load from:', path, 'Error:', err.message);
			}
		}

		if (!template) {
			throw new Error('Could not find template file in any of the expected locations');
		}

		// Format data and populate template
		const formattedData = formatDataForPDF(leaseConfirmation);
		const html = populateTemplate(template, formattedData);

		// Allow HTML preview for debugging
		if (preview === 'html') {
			res.setHeader('Content-Type', 'text/html');
			return res.send(html);
		}

		// Generate PDF using Puppeteer
		console.log('Launching browser...');

		let browser;
		try {
			browser = await puppeteer.launch({
				args: chromium.args,
				defaultViewport: chromium.defaultViewport,
				executablePath: await chromium.executablePath(),
				headless: chromium.headless,
			});

			console.log('Browser launched, creating page...');
			const page = await browser.newPage();

			// Set content and wait for it to load
			console.log('Setting page content...');
			await page.setContent(html, {
				waitUntil: 'networkidle0',
				timeout: 30000
			});

			console.log('Generating PDF...');

			// Generate PDF - optimized for single page
			const pdfBuffer = await page.pdf({
				format: 'Letter',
				printBackground: true,
				margin: {
					top: '0.3in',
					right: '0.3in',
					bottom: '0.3in',
					left: '0.3in'
				},
				preferCSSPageSize: false,
				scale: 0.95  // Slightly reduce scale to fit more content
			});

			await browser.close();
			console.log('PDF generated successfully');

			// Set response headers
			const filename = `Lease_Confirmation_${leaseConfirmation.lead_id}_${Date.now()}.pdf`;
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', preview === 'true' ? 'inline' : `attachment; filename="${filename}"`);
			res.setHeader('Content-Length', pdfBuffer.length);

			// Send PDF
			return res.send(pdfBuffer);

		} catch (browserError) {
			console.error('Browser/PDF generation error:', browserError);
			if (browser) {
				await browser.close().catch(e => console.error('Error closing browser:', e));
			}
			throw browserError;
		}

	} catch (error) {
		console.error('PDF generation error:', error);
		console.error('Error stack:', error.stack);
		return res.status(500).json({
			error: 'Internal server error',
			message: error.message,
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		});
	}
}

