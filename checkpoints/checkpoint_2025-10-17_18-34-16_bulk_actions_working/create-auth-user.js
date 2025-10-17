/**
 * Create a new Supabase auth user
 * Usage: node create-auth-user.js <email> <password> <name> <role>
 * Example: node create-auth-user.js test@tre.com Test1234! "Test Agent" agent
 */

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./supabase-config.js');

async function createAuthUser(email, password, name, role) {
	try {
		console.log('Creating auth user:', { email, name, role });
		
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
			console.error('❌ Error response:', error);
			throw new Error(error.message || 'Failed to create user');
		}
		
		const newUser = await response.json();
		console.log('✅ User created successfully!');
		console.log('User ID:', newUser.id);
		console.log('Email:', newUser.email);
		console.log('Role:', newUser.user_metadata?.role);
		console.log('Name:', newUser.user_metadata?.name);
		
		return newUser;
	} catch (error) {
		console.error('❌ Error creating user:', error.message);
		throw error;
	}
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
	console.log('Usage: node create-auth-user.js <email> <password> <name> <role>');
	console.log('Example: node create-auth-user.js test@tre.com Test1234! "Test Agent" agent');
	console.log('Roles: agent, manager, super_user');
	process.exit(1);
}

const [email, password, name, role] = args;

// Validate role
const validRoles = ['agent', 'manager', 'super_user'];
if (!validRoles.includes(role)) {
	console.error(`❌ Invalid role: ${role}`);
	console.error(`Valid roles: ${validRoles.join(', ')}`);
	process.exit(1);
}

// Create the user
createAuthUser(email, password, name, role)
	.then(() => {
		console.log('\n✅ Done! User can now log in with:');
		console.log(`   Email: ${email}`);
		console.log(`   Password: ${password}`);
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Failed to create user');
		process.exit(1);
	});

