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
	const {
		email,
		password,
		name,
		role,
		currentUserId,
		currentUserRole,
		headshot_url,
		bio,
		facebook_url,
		instagram_url,
		x_url
	} = req.body;

	// Validate required fields
	if (!userId) {
		return res.status(400).json({ error: 'Missing required parameter: userId' });
	}

	// At least one field must be provided for update
	if (!email && !password && !name && !role && !headshot_url && !bio && !facebook_url && !instagram_url && !x_url) {
		return res.status(400).json({ error: 'At least one field must be provided for update' });
	}

	// Validate role if provided
	if (role) {
		const validRoles = ['agent', 'manager', 'super_user', 'accountant'];
		if (!validRoles.includes(role)) {
			return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
		}
	}

	// Server-side password change permission validation
	if (password && currentUserId && currentUserRole) {
		// Get target user's current role to validate permissions
		try {
			const getUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'apikey': SUPABASE_SERVICE_ROLE_KEY,
					'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
				}
			});

			if (getUserResponse.ok) {
				const targetUser = await getUserResponse.json();
				const targetRole = targetUser.user_metadata?.role?.toLowerCase();
				const currentRole = currentUserRole.toLowerCase();

				// Check permissions
				const isOwnPassword = currentUserId === userId;
				const isSuperUser = currentRole === 'super_user';
				const isManagerChangingAgent = currentRole === 'manager' && targetRole === 'agent';

				if (!isOwnPassword && !isSuperUser && !isManagerChangingAgent) {
					console.log('❌ Permission denied: User cannot change this password');
					return res.status(403).json({
						error: 'You do not have permission to change this user\'s password'
					});
				}
			}
		} catch (permissionError) {
			console.error('Error checking permissions:', permissionError);
			// Continue anyway - frontend validation should have caught this
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
		console.log('✅ User updated in auth.users:', updatedUser.id);

		// Update public.users table with agent profile fields
		const updateUsersPayload = {};
		if (name) updateUsersPayload.name = name;
		if (role) updateUsersPayload.role = role.toUpperCase();
		if (email) updateUsersPayload.email = email;

		// Add agent profile fields (can be null to clear them)
		if (headshot_url !== undefined) updateUsersPayload.headshot_url = headshot_url || null;
		if (bio !== undefined) updateUsersPayload.bio = bio || null;
		if (facebook_url !== undefined) updateUsersPayload.facebook_url = facebook_url || null;
		if (instagram_url !== undefined) updateUsersPayload.instagram_url = instagram_url || null;
		if (x_url !== undefined) updateUsersPayload.x_url = x_url || null;

		// Only update public.users if there are fields to update
		if (Object.keys(updateUsersPayload).length > 0) {
			const updateUsersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'apikey': SUPABASE_SERVICE_ROLE_KEY,
					'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
					'Prefer': 'return=representation'
				},
				body: JSON.stringify(updateUsersPayload)
			});

			if (!updateUsersResponse.ok) {
				const updateError = await updateUsersResponse.json();
				console.error('Error updating users table:', updateError);
				// Don't fail the whole operation - auth user was updated successfully
				console.warn('⚠️ User updated in auth but failed to update users table');
			} else {
				console.log('✅ User updated in public.users table');
			}
		}

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

