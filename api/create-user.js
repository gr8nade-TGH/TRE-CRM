/**
 * Vercel Serverless Function to create Supabase auth users
 * This uses the service role key which cannot be exposed in the frontend
 */

export default async function handler(req, res) {
	// Only allow POST requests
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	// Get environment variables
	const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mevirooooypfjbsrmzrk.supabase.co';
	const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_SERVICE_ROLE_KEY) {
		console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
		return res.status(500).json({ error: 'Server configuration error' });
	}

	// Get user data from request body
	const {
		email,
		password,
		name,
		role,
		headshot_url,
		bio,
		facebook_url,
		instagram_url,
		x_url
	} = req.body;

	// Validate required fields
	if (!email || !password || !name || !role) {
		return res.status(400).json({ error: 'Missing required fields: email, password, name, role' });
	}

	// Validate role
	const validRoles = ['agent', 'manager', 'super_user', 'accountant'];
	if (!validRoles.includes(role)) {
		return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
	}

	try {
		console.log('Creating user:', { email, name, role });

		// Call Supabase Admin API to create user
		const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'apikey': SUPABASE_SERVICE_ROLE_KEY,
				'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
			},
			body: JSON.stringify({
				email: email,
				password: password,
				email_confirm: true, // Auto-confirm email (no verification needed)
				user_metadata: {
					name: name,
					role: role
				}
			})
		});

		if (!response.ok) {
			const error = await response.json();
			console.error('Supabase error:', error);
			return res.status(response.status).json({
				error: error.message || error.msg || 'Failed to create user'
			});
		}

		const newUser = await response.json();
		console.log('✅ User created in auth.users:', newUser.id);

		// Now insert into public.users table with agent profile fields
		const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'apikey': SUPABASE_SERVICE_ROLE_KEY,
				'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
				'Prefer': 'return=representation'
			},
			body: JSON.stringify({
				id: newUser.id,
				email: email,
				name: name,
				role: role.toUpperCase(), // Store role in uppercase in users table
				active: true,
				headshot_url: headshot_url || null,
				bio: bio || null,
				facebook_url: facebook_url || null,
				instagram_url: instagram_url || null,
				x_url: x_url || null,
				created_at: new Date().toISOString()
			})
		});

		if (!insertResponse.ok) {
			const insertError = await insertResponse.json();
			console.error('Error inserting into users table:', insertError);
			// Don't fail the whole operation - auth user was created successfully
			console.warn('⚠️ User created in auth but failed to insert into users table');
		} else {
			console.log('✅ User inserted into public.users table');
		}

		// Return success
		return res.status(200).json({
			success: true,
			user: {
				id: newUser.id,
				email: newUser.email,
				name: newUser.user_metadata?.name,
				role: newUser.user_metadata?.role
			}
		});

	} catch (error) {
		console.error('Error creating user:', error);
		return res.status(500).json({
			error: 'Internal server error: ' + error.message
		});
	}
}

