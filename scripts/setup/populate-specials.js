/**
 * Populate Specials Table
 * Adds starter promotional specials to the database
 */

const config = require('./supabase-config');

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY;

// Starter specials data (based on mock data)
const specials = [
    {
        id: 'special_1',
        property_id: 'prop_1',
        property_name: 'Community 1',
        market: 'Dallas',
        title: '$500 Off First Month',
        description: 'Move in by end of month and get $500 off your first month rent!',
        valid_from: '2025-10-01',
        valid_until: '2025-10-31',
        active: true,
        featured: true,
        terms: 'New leases only. Must move in by 10/31/2025.'
    },
    {
        id: 'special_2',
        property_id: 'prop_2',
        property_name: 'Community 2',
        market: 'Dallas',
        title: 'Waived Application Fee',
        description: 'Apply today and get your application fee waived - save $50!',
        valid_from: '2025-10-01',
        valid_until: '2025-11-15',
        active: true,
        featured: false,
        terms: 'Online applications only.'
    },
    {
        id: 'special_3',
        property_id: 'prop_3',
        property_name: 'Community 3',
        market: 'Austin',
        title: 'Free Month Parking',
        description: 'Sign a 12-month lease and get one month of covered parking free!',
        valid_from: '2025-10-01',
        valid_until: '2025-12-31',
        active: true,
        featured: true,
        terms: '12-month lease required. Covered parking only.'
    },
    {
        id: 'special_4',
        property_id: 'prop_4',
        property_name: 'Community 4',
        market: 'Houston',
        title: 'No Deposit Required',
        description: 'Qualified applicants can move in with zero deposit!',
        valid_from: '2025-10-15',
        valid_until: '2025-11-30',
        active: true,
        featured: false,
        terms: 'Subject to credit approval. Minimum 700 credit score.'
    }
];

async function populateSpecials() {
    console.log('='.repeat(80));
    console.log('🔥 Populating Specials Table');
    console.log('='.repeat(80));
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const special of specials) {
        try {
            console.log(`Adding: ${special.title} (${special.property_name})`);
            
            const response = await fetch(`${SUPABASE_URL}/rest/v1/specials`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(special)
            });

            if (response.ok || response.status === 201) {
                console.log(`  ✅ Added successfully`);
                successCount++;
            } else {
                const error = await response.text();
                console.log(`  ⚠️  Warning: ${response.status} - ${error}`);
                errorCount++;
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log(`📊 Results: ${successCount} added, ${errorCount} errors`);
    console.log('='.repeat(80));
    console.log('');

    // Verify
    console.log('🔍 Verifying specials in database...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/specials?select=*`, {
        headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
    });

    if (verifyResponse.ok) {
        const data = await verifyResponse.json();
        console.log(`✅ Found ${data.length} specials in database`);
        console.log('');
        data.forEach(s => {
            console.log(`  • ${s.title} - ${s.property_name} (${s.active ? 'Active' : 'Inactive'})`);
        });
    }

    console.log('');
    console.log('✅ Specials population complete!');
    console.log('');
}

populateSpecials().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

