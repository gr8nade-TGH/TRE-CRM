/**
 * Generate Comprehensive Test Data for Smart Match Algorithm
 * 
 * This script generates realistic test properties, floor plans, and units
 * to validate all Smart Match filter combinations.
 * 
 * Usage:
 * 1. Open browser console on your deployed app
 * 2. Copy and paste this entire script
 * 3. Run: await generateTestData()
 * 4. Check console for results
 * 
 * Cleanup:
 * - Run migrations/048_cleanup_test_data.sql in Supabase SQL Editor
 * - Or run: await cleanupTestData()
 */

import { getSupabase } from '../src/api/supabase-api.js';

/**
 * Generate test data configuration
 */
const TEST_DATA_CONFIG = {
	properties: [
		{
			name: '[TEST] Luxury Downtown Lofts',
			city: 'Austin',
			market: 'Austin',
			amenities: ['Pool', 'Gym', 'Pet Friendly', 'Rooftop Deck', 'Concierge'],
			is_pumi: true,
			commission_pct: 5.5,
			floorPlans: [
				{ name: 'Studio Loft', beds: 0, baths: 1.0, rent: 1800, units: 3 },
				{ name: '1BR Loft', beds: 1, baths: 1.5, rent: 2400, units: 4 },
				{ name: '2BR Loft', beds: 2, baths: 2.0, rent: 3200, units: 3 }
			]
		},
		{
			name: '[TEST] Affordable Student Housing',
			city: 'Austin',
			market: 'Austin',
			amenities: ['Pool', 'Study Rooms', 'Parking'],
			is_pumi: false,
			commission_pct: 3.0,
			floorPlans: [
				{ name: 'Studio', beds: 0, baths: 1.0, rent: 950, units: 5 },
				{ name: '1BR', beds: 1, baths: 1.0, rent: 1200, units: 5 },
				{ name: '2BR Shared', beds: 2, baths: 1.0, rent: 1500, units: 4 }
			]
		},
		{
			name: '[TEST] Suburban Family Complex',
			city: 'San Antonio',
			market: 'San Antonio',
			amenities: ['Pool', 'Playground', 'Pet Friendly', 'Gym'],
			is_pumi: false,
			commission_pct: 4.0,
			floorPlans: [
				{ name: '2BR Family', beds: 2, baths: 2.0, rent: 1800, units: 4 },
				{ name: '3BR Family', beds: 3, baths: 2.0, rent: 2200, units: 4 },
				{ name: '4BR Townhome', beds: 4, baths: 2.5, rent: 2800, units: 3 }
			]
		},
		{
			name: '[TEST] High Commission Towers',
			city: 'Austin',
			market: 'Austin',
			amenities: ['Pool', 'Gym', 'Valet Parking', 'Business Center'],
			is_pumi: false,
			commission_pct: 7.0,
			floorPlans: [
				{ name: '1BR Tower', beds: 1, baths: 1.0, rent: 1900, units: 3 },
				{ name: '2BR Tower', beds: 2, baths: 2.0, rent: 2600, units: 3 },
				{ name: '3BR Penthouse', beds: 3, baths: 2.5, rent: 3800, units: 2 }
			]
		},
		{
			name: '[TEST] Pet Paradise Apartments',
			city: 'San Antonio',
			market: 'San Antonio',
			amenities: ['Pet Friendly', 'Dog Park', 'Pet Spa', 'Pool', 'Gym'],
			is_pumi: false,
			commission_pct: 4.5,
			floorPlans: [
				{ name: '1BR Pet', beds: 1, baths: 1.0, rent: 1400, units: 4 },
				{ name: '2BR Pet', beds: 2, baths: 2.0, rent: 1900, units: 4 },
				{ name: '3BR Pet', beds: 3, baths: 2.0, rent: 2400, units: 3 }
			]
		}
	]
};

/**
 * Generate availability dates spread across different time periods
 */
function generateAvailabilityDates(count) {
	const dates = [];
	const today = new Date();
	
	// Spread units across: now, 1 week, 2 weeks, 1 month, 2 months, 3 months
	const dayOffsets = [0, 7, 14, 30, 60, 90];
	
	for (let i = 0; i < count; i++) {
		const offset = dayOffsets[i % dayOffsets.length];
		const date = new Date(today);
		date.setDate(date.getDate() + offset);
		dates.push(date.toISOString().split('T')[0]);
	}
	
	return dates;
}

/**
 * Generate slight rent variations
 */
function generateRentVariations(baseRent, count) {
	const rents = [];
	const variations = [0, 10, 20, -10, 0]; // Slight variations
	
	for (let i = 0; i < count; i++) {
		const variation = variations[i % variations.length];
		rents.push(baseRent + variation);
	}
	
	return rents;
}

/**
 * Main function to generate all test data
 */
export async function generateTestData() {
	console.log('🏗️ Starting test data generation...');
	
	const supabase = getSupabase();
	let totalProperties = 0;
	let totalFloorPlans = 0;
	let totalUnits = 0;
	
	try {
		for (const propConfig of TEST_DATA_CONFIG.properties) {
			console.log(`\n📍 Creating property: ${propConfig.name}`);
			
			// 1. Create Property
			const { data: property, error: propError } = await supabase
				.from('properties')
				.insert({
					name: propConfig.name,
					community_name: propConfig.name.replace('[TEST] ', ''),
					city: propConfig.city,
					state: 'TX',
					market: propConfig.market,
					amenities: propConfig.amenities,
					is_pumi: propConfig.is_pumi,
					commission_pct: propConfig.commission_pct,
					is_test_data: true,
					is_verified: true,
					data_source: 'manual'
				})
				.select()
				.single();
			
			if (propError) {
				console.error(`❌ Error creating property ${propConfig.name}:`, propError);
				continue;
			}
			
			totalProperties++;
			console.log(`✅ Property created: ${property.id}`);
			
			// 2. Create Floor Plans
			for (const fpConfig of propConfig.floorPlans) {
				console.log(`  📐 Creating floor plan: ${fpConfig.name}`);
				
				const { data: floorPlan, error: fpError } = await supabase
					.from('floor_plans')
					.insert({
						property_id: property.id,
						name: fpConfig.name,
						beds: fpConfig.beds,
						baths: fpConfig.baths,
						sqft: fpConfig.beds * 400 + 300, // Rough estimate
						market_rent: fpConfig.rent + 50,
						starting_at: fpConfig.rent,
						has_concession: Math.random() > 0.5,
						is_test_data: true
					})
					.select()
					.single();
				
				if (fpError) {
					console.error(`  ❌ Error creating floor plan ${fpConfig.name}:`, fpError);
					continue;
				}
				
				totalFloorPlans++;
				console.log(`  ✅ Floor plan created: ${floorPlan.id}`);
				
				// 3. Create Units
				const availabilityDates = generateAvailabilityDates(fpConfig.units);
				const rentPrices = generateRentVariations(fpConfig.rent, fpConfig.units);
				
				for (let i = 0; i < fpConfig.units; i++) {
					const unitNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}01`;
					
					const { error: unitError } = await supabase
						.from('units')
						.insert({
							floor_plan_id: floorPlan.id,
							property_id: property.id,
							unit_number: unitNumber,
							floor: (i % 10) + 1,
							rent: rentPrices[i],
							available_from: availabilityDates[i],
							is_available: true,
							status: 'available',
							is_test_data: true
						});
					
					if (unitError) {
						console.error(`    ❌ Error creating unit ${unitNumber}:`, unitError);
						continue;
					}
					
					totalUnits++;
				}
				
				console.log(`  ✅ Created ${fpConfig.units} units for ${fpConfig.name}`);
			}
		}
		
		console.log('\n\n🎉 Test data generation complete!');
		console.log(`📊 Summary:`);
		console.log(`   Properties: ${totalProperties}`);
		console.log(`   Floor Plans: ${totalFloorPlans}`);
		console.log(`   Units: ${totalUnits}`);
		console.log(`\n💡 To cleanup test data, run: await cleanupTestData()`);
		console.log(`   Or run migrations/048_cleanup_test_data.sql in Supabase SQL Editor`);
		
		return {
			success: true,
			properties: totalProperties,
			floorPlans: totalFloorPlans,
			units: totalUnits
		};
		
	} catch (error) {
		console.error('❌ Fatal error during test data generation:', error);
		return {
			success: false,
			error: error.message
		};
	}
}

/**
 * Cleanup all test data
 */
export async function cleanupTestData() {
	console.log('🧹 Starting test data cleanup...');
	
	const supabase = getSupabase();
	
	try {
		// Delete in reverse order (units -> floor_plans -> properties)
		const { error: unitsError } = await supabase
			.from('units')
			.delete()
			.eq('is_test_data', true);
		
		if (unitsError) throw unitsError;
		console.log('✅ Deleted test units');
		
		const { error: floorPlansError } = await supabase
			.from('floor_plans')
			.delete()
			.eq('is_test_data', true);
		
		if (floorPlansError) throw floorPlansError;
		console.log('✅ Deleted test floor plans');
		
		const { error: propertiesError } = await supabase
			.from('properties')
			.delete()
			.eq('is_test_data', true);
		
		if (propertiesError) throw propertiesError;
		console.log('✅ Deleted test properties');
		
		console.log('\n🎉 Test data cleanup complete!');
		return { success: true };
		
	} catch (error) {
		console.error('❌ Error during cleanup:', error);
		return { success: false, error: error.message };
	}
}

// Make functions available globally for console use
window.generateTestData = generateTestData;
window.cleanupTestData = cleanupTestData;

console.log('📝 Test data generator loaded!');
console.log('   Run: await generateTestData() to create test data');
console.log('   Run: await cleanupTestData() to remove all test data');

