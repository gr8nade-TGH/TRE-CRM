/**
 * Vercel Serverless Function to delete Supabase auth users
 * This uses the service role key which cannot be exposed in the frontend
 *
 * SECURITY: Protected endpoint - requires manager or super_user role
 */

import { createClient } from '@supabase/supabase-js';
import { requireRole } from './_auth-helper.js';

export default async function handler(req, res) {
	// Only allow DELETE requests
	if (req.method !== 'DELETE') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	// Get environment variables
	const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mevirooooypfjbsrmzrk.supabase.co';
	const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_SERVICE_ROLE_KEY) {
		console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	// Initialize Supabase client with service role key
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	// ✅ SECURITY: Only managers and super_users can delete users
	const authenticatedUser = await requireRole(req, res, supabase, ['manager', 'super_user']);
	if (!authenticatedUser) return; // Response already sent by requireRole

	// Get user ID from query parameter
	const { userId } = req.query;

	// Validate required fields
	if (!userId) {
		return res.status(400).json({ error: 'Missing required parameter: userId' });
	}

	try {
		console.log('Deleting user:', userId);

		// Call Supabase Admin API to delete user
		const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'apikey': SUPABASE_SERVICE_ROLE_KEY,
				'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
			}
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Supabase error:', error);
			return res.status(response.status).json({
				error: error.message || error.msg || 'Failed to delete user'
			});
		}

		console.log('✅ User deleted successfully:', userId);

		// Return success
		return res.status(200).json({
			success: true,
			message: 'User deleted successfully'
		});

	} catch (error) {
		console.error('Error deleting user:', error);
		return res.status(500).json({
			error: 'Internal server error: ' + error.message
		});
	}
}

