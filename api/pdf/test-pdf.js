/**
 * Simple test endpoint to debug PDF generation issues
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.VITE_SUPABASE_URL,
	process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
	try {
		const { leaseConfirmationId } = req.query;

		console.log('=== TEST PDF ENDPOINT ===');
		console.log('Lease Confirmation ID:', leaseConfirmationId);
		console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
		console.log('Node version:', process.version);
		console.log('CWD:', process.cwd());

		if (!leaseConfirmationId) {
			return res.status(400).json({ error: 'leaseConfirmationId is required' });
		}

		// Test 1: Can we fetch from Supabase?
		console.log('Test 1: Fetching from Supabase...');
		const { data: leaseConfirmation, error: fetchError } = await supabase
			.from('lease_confirmations')
			.select('*')
			.eq('id', leaseConfirmationId)
			.single();

		if (fetchError || !leaseConfirmation) {
			console.error('Supabase fetch error:', fetchError);
			return res.status(404).json({ 
				error: 'Lease confirmation not found',
				details: fetchError?.message 
			});
		}

		console.log('✅ Supabase fetch successful');

		// Test 2: Can we import fs and path?
		console.log('Test 2: Testing fs and path modules...');
		const fs = await import('fs');
		const path = await import('path');
		const { fileURLToPath } = await import('url');
		
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		
		console.log('✅ fs and path modules loaded');
		console.log('__dirname:', __dirname);

		// Test 3: Can we find the template file?
		console.log('Test 3: Looking for template file...');
		const possiblePaths = [
			path.join(__dirname, 'lease-confirmation-template.html'),
			path.join(process.cwd(), 'api', 'pdf', 'lease-confirmation-template.html'),
		];

		let templateFound = false;
		let templatePath = null;
		let templateContent = null;

		for (const testPath of possiblePaths) {
			console.log('Checking path:', testPath);
			try {
				if (fs.existsSync(testPath)) {
					console.log('✅ File exists at:', testPath);
					templateContent = fs.readFileSync(testPath, 'utf-8');
					templatePath = testPath;
					templateFound = true;
					break;
				} else {
					console.log('❌ File not found at:', testPath);
				}
			} catch (err) {
				console.log('❌ Error checking path:', testPath, err.message);
			}
		}

		if (!templateFound) {
			// List files in current directory
			console.log('Listing files in __dirname:', __dirname);
			try {
				const files = fs.readdirSync(__dirname);
				console.log('Files:', files);
			} catch (err) {
				console.log('Error listing files:', err.message);
			}
		}

		// Test 4: Can we import chrome-aws-lambda?
		console.log('Test 4: Testing chrome-aws-lambda import...');
		try {
			const chromium = await import('chrome-aws-lambda');
			console.log('✅ chrome-aws-lambda imported');
			console.log('Chromium args:', chromium.default.args);
		} catch (err) {
			console.log('❌ chrome-aws-lambda import failed:', err.message);
		}

		// Test 5: Can we import puppeteer-core?
		console.log('Test 5: Testing puppeteer-core import...');
		try {
			const puppeteer = await import('puppeteer-core');
			console.log('✅ puppeteer-core imported');
		} catch (err) {
			console.log('❌ puppeteer-core import failed:', err.message);
		}

		// Return results
		return res.status(200).json({
			success: true,
			tests: {
				supabase: '✅ Working',
				fsAndPath: '✅ Working',
				templateFound: templateFound ? '✅ Found' : '❌ Not Found',
				templatePath: templatePath,
				templateLength: templateContent?.length || 0,
				chromeAwsLambda: 'Check logs',
				puppeteerCore: 'Check logs'
			},
			leaseConfirmation: {
				id: leaseConfirmation.id,
				lead_id: leaseConfirmation.lead_id,
				status: leaseConfirmation.status
			}
		});

	} catch (error) {
		console.error('Test endpoint error:', error);
		console.error('Error stack:', error.stack);
		return res.status(500).json({
			error: 'Test failed',
			message: error.message,
			stack: error.stack
		});
	}
}

