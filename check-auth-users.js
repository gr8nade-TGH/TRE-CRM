/**
 * Check Supabase Auth Users
 * Lists all authenticated users in Supabase
 */

const config = require('./supabase-config');

async function checkAuthUsers() {
    console.log('='.repeat(80));
    console.log('🔐 Checking Supabase Auth Users');
    console.log('='.repeat(80));
    console.log('');

    try {
        // Use Supabase Management API to list users
        const response = await fetch(`${config.SUPABASE_URL}/auth/v1/admin/users`, {
            headers: {
                'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const users = data.users || [];

        console.log(`✅ Found ${users.length} auth users\n`);

        if (users.length === 0) {
            console.log('⚠️  No auth users found');
            console.log('');
            console.log('You can create users in Supabase Dashboard:');
            console.log('  https://supabase.com/dashboard/project/mevirooooypfjbsrmzrk/auth/users');
        } else {
            users.forEach((user, i) => {
                console.log(`${i + 1}. ${user.email}`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
                console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
                console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
                if (user.user_metadata && Object.keys(user.user_metadata).length > 0) {
                    console.log(`   Metadata: ${JSON.stringify(user.user_metadata)}`);
                }
                console.log('');
            });
        }

        console.log('='.repeat(80));
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAuthUsers();

