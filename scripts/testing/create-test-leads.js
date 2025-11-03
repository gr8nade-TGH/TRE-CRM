import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE KEY to bypass RLS
const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNTUwOCwiZXhwIjoyMDc1MjkxNTA4fQ.bBGcPCsjEBBx6tgzmenJ6V7SGfzDJnAMoYBUpRUFAPA'
);

// Test lead profiles with Gmail+ emails
const TEST_LEADS = [
	{
		name: 'Budget Betty',
		email: 'tucker.harris+budget@gmail.com',
		phone: '210-555-0101',
		status: 'active',
		health_status: 'GREEN',
		preferences: {
			bedrooms: 'studio',
			bathrooms: '1',
			priceRange: 'under-1000',
			areaOfTown: 'any',
			moveInDate: '2025-11-15',
			creditHistory: 'good',
			bestTimeToCall: 'morning',
			comments: 'Budget-conscious, flexible on location and amenities. Looking for best value.'
		}
	},
	{
		name: 'Luxury Larry',
		email: 'tucker.harris+luxury@gmail.com',
		phone: '210-555-0102',
		status: 'active',
		health_status: 'GREEN',
		preferences: {
			bedrooms: '2',
			bathrooms: '2',
			priceRange: '2500-3000',
			areaOfTown: 'downtown',
			moveInDate: '2025-12-01',
			creditHistory: 'excellent',
			bestTimeToCall: 'evening',
			amenities: ['pool', 'fitness-center', 'parking', 'in-unit-laundry'],
			comments: 'High-end finishes required. Must have balcony and parking. Downtown location preferred.'
		}
	},
	{
		name: 'Family Frank',
		email: 'tucker.harris+family@gmail.com',
		phone: '210-555-0103',
		status: 'active',
		health_status: 'YELLOW',
		preferences: {
			bedrooms: '3',
			bathrooms: '2',
			priceRange: '1500-2000',
			areaOfTown: 'north-side',
			moveInDate: '2026-01-01',
			creditHistory: 'good',
			bestTimeToCall: 'evening',
			petFriendly: true,
			floorPreference: 'ground',
			amenities: ['playground', 'pool'],
			comments: 'Family of 4 with a dog. Need ground floor for easy access. School district important.'
		}
	},
	{
		name: 'Professional Paula',
		email: 'tucker.harris+professional@gmail.com',
		phone: '210-555-0104',
		status: 'active',
		health_status: 'GREEN',
		preferences: {
			bedrooms: '1',
			bathrooms: '1',
			priceRange: '1000-1500',
			areaOfTown: 'downtown',
			moveInDate: '2025-11-01',
			creditHistory: 'excellent',
			bestTimeToCall: 'anytime',
			amenities: ['fitness-center', 'parking'],
			comments: 'Young professional, immediate move-in needed. Close to downtown for work commute.'
		}
	},
	{
		name: 'Pet Owner Pete',
		email: 'tucker.harris+petowner@gmail.com',
		phone: '210-555-0105',
		status: 'active',
		health_status: 'YELLOW',
		preferences: {
			bedrooms: '2',
			bathrooms: '1.5',
			priceRange: '1000-1500',
			areaOfTown: 'any',
			moveInDate: '2025-12-15',
			creditHistory: 'fair',
			bestTimeToCall: 'morning',
			petFriendly: true,
			comments: 'Has 2 cats. Pet-friendly is REQUIRED. Flexible on location and other amenities.'
		}
	},
	{
		name: 'Credit Challenged Charlie',
		email: 'tucker.harris+creditchallenged@gmail.com',
		phone: '210-555-0106',
		status: 'active',
		health_status: 'RED',
		preferences: {
			bedrooms: '1',
			bathrooms: '1',
			priceRange: 'under-1000',
			areaOfTown: 'any',
			moveInDate: '2025-11-30',
			creditHistory: 'poor',
			bestTimeToCall: 'afternoon',
			comments: 'Credit score 550. Willing to pay higher deposit. Needs landlord willing to work with credit issues.'
		}
	},
	{
		name: 'Flexible Fiona',
		email: 'tucker.harris+flexible@gmail.com',
		phone: '210-555-0107',
		status: 'active',
		health_status: 'YELLOW',
		preferences: {
			bedrooms: '1',
			bathrooms: '1',
			priceRange: '1000-1500',
			areaOfTown: 'any',
			moveInDate: '2025-12-01',
			creditHistory: 'good',
			bestTimeToCall: 'anytime',
			comments: 'Very flexible on all criteria. Just looking for a clean, safe place. Open to any neighborhood.'
		}
	},
	{
		name: 'Picky Patricia',
		email: 'tucker.harris+picky@gmail.com',
		phone: '210-555-0108',
		status: 'active',
		health_status: 'RED',
		preferences: {
			bedrooms: '2',
			bathrooms: '2',
			priceRange: '1500-2000',
			areaOfTown: 'northwest',
			moveInDate: '2026-02-01',
			creditHistory: 'excellent',
			bestTimeToCall: 'evening',
			floorPreference: 'top',
			amenities: ['balcony', 'parking', 'in-unit-laundry', 'fitness-center'],
			comments: 'VERY specific requirements: 2BR/2BA exactly, top floor only, must have balcony AND parking. No exceptions.'
		}
	}
];

async function deleteAllLeads() {
	console.log('🗑️  Deleting all existing leads...\n');

	const { data: leads, error: fetchError } = await supabase
		.from('leads')
		.select('id, name, email');

	if (fetchError) {
		console.error('❌ Error fetching leads:', fetchError);
		return;
	}

	console.log(`Found ${leads.length} leads to delete:\n`);
	leads.forEach((lead, i) => {
		console.log(`${i + 1}. ${lead.name} (${lead.email})`);
	});

	const { error: deleteError } = await supabase
		.from('leads')
		.delete()
		.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID match)

	if (deleteError) {
		console.error('\n❌ Error deleting leads:', deleteError);
		return;
	}

	console.log(`\n✅ Deleted ${leads.length} leads successfully!\n`);
}

async function createTestLeads() {
	console.log('👥 Creating test leads with Gmail+ emails...\n');

	// Get an agent ID to assign leads to
	const { data: agents } = await supabase
		.from('users')
		.select('id')
		.eq('role', 'AGENT')
		.limit(1)
		.single();

	const agentId = agents?.id || 'cmgfw1khk0003jdigkas8ymq9'; // Fallback to Alex Agent

	let successCount = 0;
	let failCount = 0;

	const now = new Date().toISOString();

	for (const leadData of TEST_LEADS) {
		console.log(`Creating: ${leadData.name} (${leadData.email})`);

		const { data, error } = await supabase
			.from('leads')
			.insert({
				name: leadData.name,
				email: leadData.email,
				phone: leadData.phone,
				status: leadData.status,
				health_status: leadData.health_status,
				preferences: leadData.preferences,
				assigned_agent_id: agentId,
				found_by_agent_id: agentId,
				source: 'test_data',
				submitted_at: now,
				created_at: now,
				updated_at: now
			})
			.select()
			.single();

		if (error) {
			console.error(`  ❌ Error: ${error.message}`);
			failCount++;
		} else {
			console.log(`  ✅ Created: ${data.id}`);
			successCount++;
		}
	}

	console.log(`\n🎉 Complete! Created ${successCount} leads, ${failCount} failed.\n`);
}

async function main() {
	console.log('🚀 Starting test lead creation...\n');
	console.log('='.repeat(60));
	console.log('\n');

	// Step 1: Delete all existing leads
	await deleteAllLeads();

	console.log('='.repeat(60));
	console.log('\n');

	// Step 2: Create new test leads
	await createTestLeads();

	console.log('='.repeat(60));
	console.log('\n');

	// Step 3: Verify
	const { data: newLeads, error } = await supabase
		.from('leads')
		.select('id, name, email, preferences')
		.order('name');

	if (error) {
		console.error('❌ Error fetching new leads:', error);
		return;
	}

	console.log(`✅ Verification: ${newLeads.length} leads in database:\n`);
	newLeads.forEach((lead, i) => {
		console.log(`${i + 1}. ${lead.name} (${lead.email})`);
		console.log(`   Bedrooms: ${lead.preferences.bedrooms} | Budget: ${lead.preferences.priceRange} | Credit: ${lead.preferences.creditHistory}`);
	});

	console.log('\n🎉 All done! Test leads ready for Smart Match testing.\n');
}

main();

