/**
 * Vercel Serverless Function to list Supabase auth users
 * This uses the service role key which cannot be exposed in the frontend
 *
 * SECURITY: Protected endpoint - requires any authenticated user
 */

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth-helper.js';

export default async function handler(req, res) {
	// Only allow GET requests
	if (req.method !== 'GET') {
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

	// ✅ SECURITY: Any authenticated user can list users (read-only)
	const authenticatedUser = await requireAuth(req, res, supabase);
	if (!authenticatedUser) return; // Response already sent by requireAuth

	try {
		console.log('Fetching users from Supabase auth...');

		// Call Supabase Admin API to list users
		const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
			method: 'GET',
			headers: {
				'apikey': SUPABASE_SERVICE_ROLE_KEY,
				'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
			}
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Supabase error:', error);
			return res.status(response.status).json({
				error: error.message || error.msg || 'Failed to fetch users'
			});
		}

		const data = await response.json();
		const users = data.users || [];

		console.log(`✅ Fetched ${users.length} users`);

		// Transform users to match our format
		const transformedUsers = users.map(user => ({
			id: user.id,
			email: user.email,
			name: user.user_metadata?.name || user.email,
			role: user.user_metadata?.role || 'agent',
			status: user.email_confirmed_at ? 'active' : 'pending',
			created_at: user.created_at,
			last_sign_in_at: user.last_sign_in_at
		}));

		// Return success
		return res.status(200).json({
			success: true,
			users: transformedUsers
		});

	} catch (error) {
		console.error('Error fetching users:', error);
		return res.status(500).json({
			error: 'Internal server error: ' + error.message
		});
	}
}

