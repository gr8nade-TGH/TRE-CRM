/**
 * Vercel Serverless Function to update Supabase auth users
 * This uses the service role key which cannot be exposed in the frontend
 */

export default async function handler(req, res) {
	// Only allow PUT/PATCH requests
	if (req.method !== 'PUT' && req.method !== 'PATCH') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	// Get environment variables
	const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mevirooooypfjbsrmzrk.supabase.co';
	const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_SERVICE_ROLE_KEY) {
		console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	// Get user ID from query parameter
	const { userId } = req.query;

	// Get update data from request body
	const { email, password, name, role } = req.body;

	// Validate required fields
	if (!userId) {
		return res.status(400).json({ error: 'Missing required parameter: userId' });
	}

	// At least one field must be provided for update
	if (!email && !password && !name && !role) {
		return res.status(400).json({ error: 'At least one field must be provided for update' });
	}

	// Validate role if provided
	if (role) {
		const validRoles = ['agent', 'manager', 'super_user'];
		if (!validRoles.includes(role)) {
			return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
		}
	}

	try {
		console.log('Updating user:', userId, { email, name, role, hasPassword: !!password });

		// Build update payload
		const updatePayload = {};
		
		if (email) {
			updatePayload.email = email;
		}
		
		if (password) {
			updatePayload.password = password;
		}
		
		// Update user_metadata if name or role is provided
		if (name || role) {
			updatePayload.user_metadata = {};
			if (name) updatePayload.user_metadata.name = name;
			if (role) updatePayload.user_metadata.role = role;
		}

		// Call Supabase Admin API to update user
		const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'apikey': SUPABASE_SERVICE_ROLE_KEY,
				'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
			},
			body: JSON.stringify(updatePayload)
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Supabase error:', error);
			return res.status(response.status).json({ 
				error: error.message || error.msg || 'Failed to update user' 
			});
		}

		const updatedUser = await response.json();
		console.log('✅ User updated successfully:', updatedUser.id);

		// Return success with info about what was updated
		return res.status(200).json({
			success: true,
			passwordChanged: !!password, // Flag to indicate if password was changed
			user: {
				id: updatedUser.id,
				email: updatedUser.email,
				name: updatedUser.user_metadata?.name,
				role: updatedUser.user_metadata?.role
			}
		});

	} catch (error) {
		console.error('Error updating user:', error);
		return res.status(500).json({ 
			error: 'Internal server error: ' + error.message 
		});
	}
}

