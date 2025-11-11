import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE KEY to bypass RLS and see all data
const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNTUwOCwiZXhwIjoyMDc1MjkxNTA4fQ.bBGcPCsjEBBx6tgzmenJ6V7SGfzDJnAMoYBUpRUFAPA'
);

async function checkCurrentData() {
	console.log('🔍 Checking current database state...\n');

	// Get properties
	const { data: properties, error: propError } = await supabase
		.from('properties')
		.select('id, name, city')
		.order('name');

	if (propError) {
		console.error('❌ Error fetching properties:', propError);
		return;
	}

	console.log(`📋 Found ${properties.length} properties:\n`);
	properties.forEach((prop, i) => {
		console.log(`${i + 1}. ${prop.name} (${prop.city})`);
		console.log(`   ID: ${prop.id}`);
	});

	// Get ALL units first (no filters - check everything)
	const { data: allUnits, error: allUnitsError } = await supabase
		.from('units')
		.select('id, property_id, unit_number, floor, rent, available_from, is_available, is_active')
		.limit(1000);

	if (allUnitsError) {
		console.error('❌ Error fetching all units:', allUnitsError);
	} else {
		console.log(`\n📦 Total units in database: ${allUnits.length}\n`);

		// Group by property
		const unitsByProperty = {};
		allUnits.forEach(unit => {
			if (!unitsByProperty[unit.property_id]) {
				unitsByProperty[unit.property_id] = [];
			}
			unitsByProperty[unit.property_id].push(unit);
		});

		console.log('Units per property:\n');
		for (const prop of properties) {
			const units = unitsByProperty[prop.id] || [];
			if (units.length > 0) {
				console.log(`${prop.name}: ${units.length} units`);
				units.slice(0, 5).forEach(unit => {
					console.log(`  - Unit ${unit.unit_number} | Floor ${unit.floor} | $${unit.rent} | Available: ${unit.available_from || 'Now'} | Active: ${unit.is_active}`);
				});
				if (units.length > 5) {
					console.log(`  ... and ${units.length - 5} more units`);
				}
			}
		}
	}

	// Get leads count
	const { data: leads, error: leadsError } = await supabase
		.from('leads')
		.select('id, name, email, preferences')
		.order('name');

	if (leadsError) {
		console.error('❌ Error fetching leads:', leadsError);
		return;
	}

	console.log(`\n👥 Found ${leads.length} leads:\n`);
	leads.forEach((lead, i) => {
		console.log(`${i + 1}. ${lead.name} (${lead.email})`);
		console.log(`   Preferences: ${JSON.stringify(lead.preferences || {})}`);
	});
}

checkCurrentData();

