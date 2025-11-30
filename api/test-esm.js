/**
 * Test ES module endpoint
 */

import { createClient } from '@supabase/supabase-js';

// Using hardcoded values since they're already public in index.html
const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTU1MDgsImV4cCI6MjA3NTI5MTUwOH0.FGez_nPoWZA5NKbJP54e5JsgJILrWB7rBUD4vx6iZZA'
);

async function handler(req, res) {
	try {
		// Test 1: Basic response
		const tests = {
			basic: 'OK',
			nodeVersion: process.version,
			platform: process.platform,
			env: process.env.VERCEL ? 'Vercel' : 'Local'
		};

		// Test 2: Supabase connection
		try {
			const { data, error } = await supabase
				.from('lease_confirmations')
				.select('id')
				.eq('id', '59f6ebb0-b82b-4789-82c0-2ac3904cd634')
				.single();

			if (error) {
				tests.supabase = `Error: ${error.message}`;
			} else {
				tests.supabase = data ? 'Found record' : 'No record';
			}
		} catch (err) {
			tests.supabase = `Exception: ${err.message}`;
		}

		// Test 3: Check chromium-min import
		try {
			const chromium = await import('@sparticuz/chromium-min');
			tests.chromium = chromium.default ? 'Loaded' : 'No default export';
		} catch (err) {
			tests.chromium = `Error: ${err.message}`;
		}

		// Test 4: Check puppeteer-core import
		try {
			const puppeteer = await import('puppeteer-core');
			tests.puppeteer = puppeteer.default ? 'Loaded' : 'No default export';
		} catch (err) {
			tests.puppeteer = `Error: ${err.message}`;
		}

		return res.status(200).json({
			success: true,
			tests
		});
	} catch (error) {
		return res.status(500).json({
			error: error.message,
			stack: error.stack
		});
	}
}

export default handler;

