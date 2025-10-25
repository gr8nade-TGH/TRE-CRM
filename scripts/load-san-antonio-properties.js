/**
 * Script to load San Antonio apartment complexes into the database
 *
 * INSTRUCTIONS:
 * 1. Open your TRE CRM app in the browser
 * 2. Make sure you're logged in
 * 3. Open the browser console (F12)
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run it
 *
 * The script will use your existing Supabase connection and SupabaseAPI
 */

// This script runs in the browser and uses the global SupabaseAPI

// San Antonio apartment complexes data
const sanAntonioProperties = [
	{
		community_name: 'Paloma Luxury Apartments',
		address: '1800 Broadway, San Antonio, TX 78215',
		contact_phone: '(210) 354-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Greyson Luxury Living',
		address: '123 E Houston St, San Antonio, TX 78205',
		contact_phone: '(210) 277-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Tin Top Flats at the Creamery',
		address: '1202 S Flores St, San Antonio, TX 78204',
		contact_phone: '(210) 354-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Boulder Creek Apartments',
		address: '5959 Bowens Crossing, San Antonio, TX 78250',
		contact_phone: '(210) 684-3700',
		market: 'San Antonio'
	},
	{
		community_name: 'Hardy Oak Apartments',
		address: '20323 Hardy Oak Blvd, San Antonio, TX 78258',
		contact_phone: '(210) 497-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'District at Medical Center',
		address: '8550 Datapoint Dr, San Antonio, TX 78229',
		contact_phone: '(210) 616-3700',
		market: 'San Antonio'
	},
	{
		community_name: 'Cellars at Pearl',
		address: '312 Pearl Pkwy, San Antonio, TX 78215',
		contact_phone: '(210) 504-3000',
		market: 'San Antonio'
	},
	{
		community_name: 'Addison Medical Center Apartments',
		address: '7950 Floyd Curl Dr, San Antonio, TX 78229',
		contact_phone: '(210) 614-0700',
		market: 'San Antonio'
	},
	{
		community_name: 'Broadstone Ranch',
		address: '24165 Wilderness Oak, San Antonio, TX 78258',
		contact_phone: '(210) 764-8200',
		market: 'San Antonio'
	},
	{
		community_name: 'The San Miguel',
		address: '1919 San Pedro Ave, San Antonio, TX 78212',
		contact_phone: '(210) 733-9133',
		market: 'San Antonio'
	},
	{
		community_name: 'San Antonio Station',
		address: '18730 Stone Oak Pkwy, San Antonio, TX 78258',
		contact_phone: '(210) 545-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Babcock',
		address: '3803 Babcock Rd, San Antonio, TX 78229',
		contact_phone: '(210) 341-7100',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Alon',
		address: '13130 Blanco Rd, San Antonio, TX 78216',
		contact_phone: '(210) 492-0900',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas de Alamo Ranch',
		address: '5803 Alamo Downs Pkwy, San Antonio, TX 78253',
		contact_phone: '(210) 523-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Enclave at Parc Crest',
		address: '1255 SW Loop 410, San Antonio, TX 78227',
		contact_phone: '(210) 673-9464',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Bandera',
		address: '6611 Bandera Rd, San Antonio, TX 78238',
		contact_phone: '(210) 647-9100',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Briggs Ranch',
		address: '5565 Mansions Bluff, San Antonio, TX 78245',
		contact_phone: '(210) 679-3700',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Westover Hills',
		address: '1530 NW Crossroads, San Antonio, TX 78251',
		contact_phone: '(210) 556-6110',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Perrin Ranch',
		address: '7550 Culebra Rd, San Antonio, TX 78251',
		contact_phone: '(210) 521-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Parkside',
		address: '8615 Datapoint Dr, San Antonio, TX 78229',
		contact_phone: '(210) 561-9600',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Stone Oak',
		address: '1122 E Sonterra Blvd, San Antonio, TX 78258',
		contact_phone: '(210) 495-9600',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Scenic Loop',
		address: '23303 Scenic Loop Rd, San Antonio, TX 78255',
		contact_phone: '(210) 698-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Dominion',
		address: '23450 Dominion Dr, San Antonio, TX 78257',
		contact_phone: '(210) 698-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Huebner Oaks',
		address: '11745 Huebner Rd, San Antonio, TX 78230',
		contact_phone: '(210) 341-8200',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Sonterra',
		address: '555 E Sonterra Blvd, San Antonio, TX 78258',
		contact_phone: '(210) 496-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Thousand Oaks',
		address: '2323 Thousand Oaks Dr, San Antonio, TX 78232',
		contact_phone: '(210) 494-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Shavano Park',
		address: '3939 NW Loop 410, San Antonio, TX 78229',
		contact_phone: '(210) 344-9700',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Wurzbach',
		address: '8989 Wurzbach Rd, San Antonio, TX 78240',
		contact_phone: '(210) 558-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Blanco Vista',
		address: '15303 Blanco Rd, San Antonio, TX 78232',
		contact_phone: '(210) 492-1100',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Callaghan',
		address: '5959 Callaghan Rd, San Antonio, TX 78228',
		contact_phone: '(210) 432-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Wilderness Oak',
		address: '24500 Wilderness Oak, San Antonio, TX 78258',
		contact_phone: '(210) 764-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Eilan',
		address: '17902 La Cantera Pkwy, San Antonio, TX 78256',
		contact_phone: '(210) 561-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Silverado',
		address: '8700 Silverado, San Antonio, TX 78254',
		contact_phone: '(210) 688-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Rim Pointe',
		address: '17803 La Cantera Pkwy, San Antonio, TX 78256',
		contact_phone: '(210) 558-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Cielo Vista',
		address: '6767 Cielo Vista, San Antonio, TX 78218',
		contact_phone: '(210) 655-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Walzem',
		address: '5959 Walzem Rd, San Antonio, TX 78218',
		contact_phone: '(210) 655-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Windcrest',
		address: '8585 Midcrown Dr, San Antonio, TX 78239',
		contact_phone: '(210) 590-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Nacogdoches',
		address: '6767 Nacogdoches Rd, San Antonio, TX 78209',
		contact_phone: '(210) 822-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Broadway',
		address: '4545 Broadway, San Antonio, TX 78209',
		contact_phone: '(210) 822-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Alamo Heights',
		address: '6060 Broadway, San Antonio, TX 78209',
		contact_phone: '(210) 826-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Terrell Hills',
		address: '909 E Mulberry Ave, San Antonio, TX 78209',
		contact_phone: '(210) 824-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Olmos Park',
		address: '120 W Olmos Dr, San Antonio, TX 78212',
		contact_phone: '(210) 737-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Monte Vista',
		address: '1919 W Ashby Pl, San Antonio, TX 78201',
		contact_phone: '(210) 733-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Southtown',
		address: '1515 S Flores St, San Antonio, TX 78204',
		contact_phone: '(210) 534-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at King William',
		address: '123 King William St, San Antonio, TX 78204',
		contact_phone: '(210) 227-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Lavaca',
		address: '1010 S Laredo St, San Antonio, TX 78207',
		contact_phone: '(210) 227-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Beacon Hill',
		address: '2323 N Main Ave, San Antonio, TX 78212',
		contact_phone: '(210) 735-7000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Tobin Hill',
		address: '1515 N Main Ave, San Antonio, TX 78212',
		contact_phone: '(210) 736-8000',
		market: 'San Antonio'
	},
	{
		community_name: 'Estates at Mahncke Park',
		address: '1010 E Grayson St, San Antonio, TX 78208',
		contact_phone: '(210) 223-9000',
		market: 'San Antonio'
	},
	{
		community_name: 'Villas at Dignowity Hill',
		address: '1212 Dawson St, San Antonio, TX 78202',
		contact_phone: '(210) 223-8000',
		market: 'San Antonio'
	}
];

async function loadProperties() {
	console.log('🚀 Starting to load San Antonio properties...');
	console.log(`📊 Total properties to load: ${sanAntonioProperties.length}`);

	let successCount = 0;
	let errorCount = 0;
	const errors = [];

	for (const property of sanAntonioProperties) {
		try {
			// Use the direct Supabase API (window.supabase is available in the browser)
			const { data, error } = await window.supabase
				.from('properties')
				.insert([{
					community_name: property.community_name,
					address: property.address,
					contact_phone: property.contact_phone,
					market: property.market,
					contact_name: null,
					contact_email: null,
					contact_hours: null
				}])
				.select();

			if (error) {
				console.error(`❌ Error loading ${property.community_name}:`, error.message);
				errors.push({ property: property.community_name, error: error.message });
				errorCount++;
			} else {
				console.log(`✅ Loaded: ${property.community_name}`);
				successCount++;
			}

			// Small delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 150));

		} catch (err) {
			console.error(`❌ Exception loading ${property.community_name}:`, err);
			errors.push({ property: property.community_name, error: err.message });
			errorCount++;
		}
	}

	console.log('\n' + '='.repeat(50));
	console.log('📊 SUMMARY');
	console.log('='.repeat(50));
	console.log(`✅ Successfully loaded: ${successCount}`);
	console.log(`❌ Errors: ${errorCount}`);
	console.log(`📈 Total: ${sanAntonioProperties.length}`);
	console.log(`🎯 Success rate: ${((successCount / sanAntonioProperties.length) * 100).toFixed(1)}%`);

	if (errors.length > 0) {
		console.log('\n❌ Error details:');
		errors.forEach(e => console.log(`  - ${e.property}: ${e.error}`));
	}

	console.log('\n✅ Script complete!');
}

// Run the script
console.log('🎬 Executing San Antonio Properties Loader...\n');
loadProperties().catch(err => {
	console.error('💥 Fatal error:', err);
});

