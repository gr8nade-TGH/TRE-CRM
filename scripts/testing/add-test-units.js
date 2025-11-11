import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE KEY to bypass RLS
const supabase = createClient(
	'https://mevirooooypfjbsrmzrk.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTcxNTUwOCwiZXhwIjoyMDc1MjkxNTA4fQ.bBGcPCsjEBBx6tgzmenJ6V7SGfzDJnAMoYBUpRUFAPA'
);

// Helper to generate available dates
function getAvailableDate(daysFromNow) {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split('T')[0];
}

// Helper to generate random rent within a range
function randomRent(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

// Unit templates for different property types
const UNIT_TEMPLATES = {
	studio: [
		{ beds: 0, baths: 1, sqft: 450, rentMin: 800, rentMax: 1200 },
		{ beds: 0, baths: 1, sqft: 500, rentMin: 850, rentMax: 1250 },
		{ beds: 0, baths: 1, sqft: 550, rentMin: 900, rentMax: 1300 }
	],
	oneBed: [
		{ beds: 1, baths: 1, sqft: 650, rentMin: 1000, rentMax: 1400 },
		{ beds: 1, baths: 1, sqft: 700, rentMin: 1050, rentMax: 1450 },
		{ beds: 1, baths: 1.5, sqft: 750, rentMin: 1100, rentMax: 1500 }
	],
	twoBed: [
		{ beds: 2, baths: 1.5, sqft: 900, rentMin: 1300, rentMax: 1700 },
		{ beds: 2, baths: 2, sqft: 950, rentMin: 1350, rentMax: 1750 },
		{ beds: 2, baths: 2, sqft: 1000, rentMin: 1400, rentMax: 1800 }
	],
	threeBed: [
		{ beds: 3, baths: 2, sqft: 1200, rentMin: 1700, rentMax: 2200 },
		{ beds: 3, baths: 2.5, sqft: 1300, rentMin: 1800, rentMax: 2300 },
		{ beds: 3, baths: 2.5, sqft: 1400, rentMin: 1900, rentMax: 2400 }
	],
	luxury: [
		{ beds: 1, baths: 1, sqft: 800, rentMin: 1800, rentMax: 2400 },
		{ beds: 2, baths: 2, sqft: 1100, rentMin: 2200, rentMax: 2800 },
		{ beds: 3, baths: 2.5, sqft: 1500, rentMin: 2800, rentMax: 3500 }
	]
};

async function createFloorPlanAndUnits(propertyId, propertyName, template, floorPlanName, unitCount = 3) {
	console.log(`\n  Creating floor plan: ${floorPlanName}`);

	// 1. Create floor plan
	const { data: floorPlan, error: fpError } = await supabase
		.from('floor_plans')
		.insert({
			property_id: propertyId,
			name: floorPlanName,
			beds: template.beds,
			baths: template.baths,
			sqft: template.sqft,
			starting_at: template.rentMin,
			market_rent: template.rentMax,
			has_concession: Math.random() > 0.7, // 30% chance of concession
			units_available: unitCount,
			is_test_data: true
		})
		.select()
		.single();

	if (fpError) {
		console.error(`    ❌ Error creating floor plan:`, fpError.message);
		return;
	}

	console.log(`    ✅ Floor plan created: ${floorPlan.id}`);

	// 2. Create units for this floor plan
	const units = [];
	const availabilityOptions = [0, 15, 30, 45, 60, 90]; // Days from now

	for (let i = 1; i <= unitCount; i++) {
		const unitNumber = `${template.beds}${String.fromCharCode(65 + i - 1)}${Math.floor(Math.random() * 9) + 1}`;
		const floor = Math.floor(Math.random() * 5) + 1; // Floors 1-5
		const rent = randomRent(template.rentMin, template.rentMax);
		const daysUntilAvailable = availabilityOptions[Math.floor(Math.random() * availabilityOptions.length)];

		units.push({
			property_id: propertyId,
			floor_plan_id: floorPlan.id,
			unit_number: unitNumber,
			floor: floor,
			rent: rent,
			available_from: getAvailableDate(daysUntilAvailable),
			is_available: true,
			status: 'available',
			is_active: true
		});
	}

	const { data: createdUnits, error: unitsError } = await supabase
		.from('units')
		.insert(units)
		.select();

	if (unitsError) {
		console.error(`    ❌ Error creating units:`, unitsError.message);
		return;
	}

	console.log(`    ✅ Created ${createdUnits.length} units`);
	return createdUnits.length;
}

async function addUnitsToProperty(propertyId, propertyName, propertyType) {
	console.log(`\n📍 Adding units to: ${propertyName}`);

	let totalUnits = 0;

	// Determine which templates to use based on property type
	if (propertyType === 'studio') {
		// Studio-focused property
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.studio[0], 'Studio A', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.studio[1], 'Studio B', 3);
	} else if (propertyType === 'budget') {
		// Budget property - mix of studios and 1BR
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.studio[0], 'Studio', 3);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.oneBed[0], '1BR/1BA', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.oneBed[1], '1BR/1BA Deluxe', 3);
	} else if (propertyType === 'family') {
		// Family property - 2BR and 3BR
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.twoBed[0], '2BR/1.5BA', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.twoBed[1], '2BR/2BA', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.threeBed[0], '3BR/2BA', 3);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.threeBed[1], '3BR/2.5BA', 3);
	} else if (propertyType === 'luxury') {
		// Luxury property - all sizes, higher rents
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.luxury[0], 'Luxury 1BR', 3);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.luxury[1], 'Luxury 2BR', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.luxury[2], 'Luxury 3BR', 3);
	} else {
		// Mixed property - variety of all types
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.studio[0], 'Studio', 3);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.oneBed[0], '1BR/1BA', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.twoBed[1], '2BR/2BA', 4);
		totalUnits += await createFloorPlanAndUnits(propertyId, propertyName, UNIT_TEMPLATES.threeBed[0], '3BR/2BA', 3);
	}

	console.log(`  ✅ Total units created for ${propertyName}: ${totalUnits}`);
	return totalUnits;
}

async function main() {
	console.log('🚀 Starting test unit creation...\n');

	// Get all test properties
	const { data: properties, error } = await supabase
		.from('properties')
		.select('id, name')
		.or('name.ilike.[TEST]%,name.eq.Linden at The Rim')
		.order('name');

	if (error) {
		console.error('❌ Error fetching properties:', error);
		return;
	}

	console.log(`Found ${properties.length} properties to populate:\n`);

	// Map properties to types
	const propertyTypes = {
		'[TEST] Studio Central': 'studio',
		'[TEST] Budget Oaks Apartments': 'budget',
		'[TEST] Riverwalk Budget Suites': 'budget',
		'[TEST] Family Estates': 'family',
		'[TEST] Luxury Towers PUMI': 'luxury',
		'[TEST] Pearl District Luxury': 'luxury',
		'[TEST] Midtown Heights': 'mixed',
		'[TEST] Alamo Plaza': 'mixed',
		'[TEST] PUMI Paradise': 'mixed',
		'[TEST] High Commission Heights': 'mixed',
		'Linden at The Rim': 'mixed'
	};

	let totalUnitsCreated = 0;

	for (const prop of properties) {
		const type = propertyTypes[prop.name] || 'mixed';
		const unitsCreated = await addUnitsToProperty(prop.id, prop.name, type);
		totalUnitsCreated += unitsCreated;
	}

	console.log(`\n🎉 Complete! Created ${totalUnitsCreated} total units across ${properties.length} properties.`);
}

main();

