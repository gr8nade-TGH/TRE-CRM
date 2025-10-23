/**
 * CSV Import Module
 * Handles CSV template generation and bulk import for Properties, Floor Plans, and Units
 *
 * REQUIRED FIELDS (9 total):
 * - Properties: property_name, market (2 fields)
 * - Floor Plans: floor_plan_name, beds, baths, market_rent, starting_at (5 fields)
 * - Units: unit_number, available_from (2 fields)
 *
 * RECOMMENDED FIELDS (makes data more useful):
 * - Properties: city, street_address
 * - Floor Plans: sqft
 *
 * All other fields are optional and can be left empty.
 */

/**
 * Generate and download CSV template
 * @param {Object} options - Options object
 * @param {Function} options.toast - Toast notification function
 */
export function downloadCSVTemplate(options) {
	const { toast } = options;
	
	// CSV Template with all required and optional fields
	const headers = [
		// ===== PROPERTY FIELDS =====
		// Required (minimum 2)
		'property_name',  // REQUIRED
		'market',         // REQUIRED

		// Recommended (makes data useful)
		'city',
		'street_address',

		// Optional
		'zip_code',
		'phone',
		'contact_email',
		'leasing_link',
		'neighborhood',
		'description',
		'amenities', // Pipe-separated list (e.g., "Pool|Gym|Parking")
		'is_pumi', // true/false
		'commission_pct',
		'map_lat',
		'map_lng',

		// ===== FLOOR PLAN FIELDS =====
		// Required (5 fields)
		'floor_plan_name',  // REQUIRED
		'beds',             // REQUIRED
		'baths',            // REQUIRED
		'market_rent',      // REQUIRED
		'starting_at',      // REQUIRED

		// Recommended
		'sqft',

		// Optional - Concessions
		'has_concession', // true/false
		'concession_type', // free_weeks, fee_waiver, dollar_off, percentage_off
		'concession_value', // e.g., "2 weeks free", "$500 off"
		'concession_description',

		// ===== UNIT FIELDS =====
		// Required (2 fields)
		'unit_number',      // REQUIRED
		'available_from',   // REQUIRED (YYYY-MM-DD format)

		// Optional
		'floor',
		'unit_rent', // Override floor plan rent if needed
		'unit_market_rent', // Override floor plan market rent if needed
		'unit_status', // available, pending, leased, unavailable
		'unit_notes'
	];
	
	// Example rows
	const exampleRows = [
		[
			// Property
			'The Madison Apartments',
			'Austin',
			'Austin',
			'123 Main St',
			'78701',
			'512-555-0100',
			'leasing@madison.com',
			'https://madison.com/apply',
			
			// Property optional
			'Downtown',
			'Luxury apartments in the heart of downtown',
			'Pool|Gym|Parking|Pet Friendly|Rooftop Deck', // Pipe-separated
			'false',
			'3.5',
			'30.2672',
			'-97.7431',
			
			// Floor Plan
			'A1 - 1x1 Classic',
			'1',
			'1.0',
			'650',
			'1500',
			'1350',
			
			// Concessions
			'true',
			'free_weeks',
			'2 weeks free',
			'First 2 weeks free on 12-month lease',
			
			// Unit
			'101',
			'2025-11-01',
			
			// Unit optional
			'1',
			'', // Use floor plan rent
			'', // Use floor plan market rent
			'available',
			'Corner unit with great views'
		],
		[
			// Property (same property, different floor plan)
			'The Madison Apartments',
			'Austin',
			'Austin',
			'123 Main St',
			'78701',
			'512-555-0100',
			'leasing@madison.com',
			'https://madison.com/apply',

			// Property optional
			'Downtown',
			'Luxury apartments in the heart of downtown',
			'Pool|Gym|Parking|Pet Friendly|Rooftop Deck',
			'false',
			'3.5',
			'30.2672',
			'-97.7431',

			// Floor Plan
			'B2 - 2x2 Deluxe',
			'2',
			'2.0',
			'1100',
			'2200',
			'2000',

			// Concessions
			'true',
			'dollar_off',
			'$500 off',
			'$500 off first month rent',

			// Unit
			'205',
			'2025-11-15',

			// Unit optional
			'2',
			'1950', // Custom rent for this unit
			'2200',
			'available',
			'Recently renovated'
		],
		[
			// MINIMAL EXAMPLE - Only required fields filled in
			// Property (required only)
			'The Oaks Apartments',  // property_name
			'Dallas',               // market

			// Property (recommended - empty)
			'',  // city (will default to market)
			'',  // street_address

			// Property (optional - all empty)
			'', '', '', '', '', '', '', '', '', '', '',

			// Floor Plan (required)
			'Studio',  // floor_plan_name
			'0',       // beds
			'1.0',     // baths
			'1200',    // market_rent
			'1100',    // starting_at

			// Floor Plan (recommended - empty)
			'',  // sqft

			// Floor Plan (optional concessions - all empty)
			'', '', '', '',

			// Unit (required)
			'S1',          // unit_number
			'2025-12-01',  // available_from

			// Unit (optional - all empty)
			'', '', '', '', ''
		]
	];
	
	// Build CSV content
	const csvContent = [
		headers.join(','),
		...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
	].join('\n');
	
	// Create and download file
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	
	link.setAttribute('href', url);
	link.setAttribute('download', 'listings_import_template.csv');
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	
	toast('CSV template downloaded! Check your Downloads folder.', 'success');
}

/**
 * Parse CSV file and import data
 * @param {Object} options - Options object
 * @param {File} options.file - CSV file to import
 * @param {Function} options.toast - Toast notification function
 * @param {Object} options.SupabaseAPI - Supabase API module
 * @param {Function} options.renderListings - Function to refresh listings
 * @returns {Promise<void>}
 */
export async function importCSV(options) {
	const { file, toast, SupabaseAPI, renderListings } = options;
	
	if (!file) {
		toast('Please select a CSV file', 'error');
		return;
	}
	
	if (!file.name.endsWith('.csv')) {
		toast('Please upload a CSV file', 'error');
		return;
	}
	
	try {
		// Read file
		const text = await file.text();
		const rows = parseCSV(text);
		
		if (rows.length === 0) {
			toast('CSV file is empty', 'error');
			return;
		}
		
		// Validate headers - only check truly required fields
		const headers = rows[0];
		const requiredHeaders = [
			// Property (2 required)
			'property_name', 'market',
			// Floor Plan (5 required)
			'floor_plan_name', 'beds', 'baths', 'market_rent', 'starting_at',
			// Unit (2 required)
			'unit_number', 'available_from'
		];
		const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

		if (missingHeaders.length > 0) {
			toast(`❌ Missing required columns: ${missingHeaders.join(', ')}`, 'error');
			return;
		}
		
		// Parse data rows
		const dataRows = rows.slice(1);
		
		if (dataRows.length === 0) {
			toast('No data rows found in CSV', 'error');
			return;
		}
		
		// Show confirmation
		if (!confirm(`Import ${dataRows.length} row(s) from CSV? This will create properties, floor plans, and units.`)) {
			return;
		}
		
		// Process import
		toast('Importing CSV data...', 'info');
		const result = await processCSVImport(headers, dataRows, SupabaseAPI);
		
		// Show results
		const { propertiesCreated, floorPlansCreated, unitsCreated, errors } = result;
		
		if (errors.length > 0) {
			console.error('Import errors:', errors);
			toast(`Import completed with ${errors.length} error(s). Check console for details.`, 'warning');
		} else {
			toast(`✅ Import successful! Created ${propertiesCreated} properties, ${floorPlansCreated} floor plans, ${unitsCreated} units`, 'success');
		}
		
		// Refresh listings
		await renderListings();
		
	} catch (error) {
		console.error('Error importing CSV:', error);
		toast(`Import failed: ${error.message}`, 'error');
	}
}

/**
 * Parse CSV text into array of arrays
 * @param {string} text - CSV text content
 * @returns {Array<Array<string>>} - Parsed rows
 */
function parseCSV(text) {
	const rows = [];
	let currentRow = [];
	let currentCell = '';
	let insideQuotes = false;
	
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const nextChar = text[i + 1];
		
		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				// Escaped quote
				currentCell += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				insideQuotes = !insideQuotes;
			}
		} else if (char === ',' && !insideQuotes) {
			// End of cell
			currentRow.push(currentCell.trim());
			currentCell = '';
		} else if ((char === '\n' || char === '\r') && !insideQuotes) {
			// End of row
			if (currentCell || currentRow.length > 0) {
				currentRow.push(currentCell.trim());
				rows.push(currentRow);
				currentRow = [];
				currentCell = '';
			}
			// Skip \r\n
			if (char === '\r' && nextChar === '\n') {
				i++;
			}
		} else {
			currentCell += char;
		}
	}
	
	// Add last cell/row if exists
	if (currentCell || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		rows.push(currentRow);
	}
	
	return rows;
}

/**
 * Process CSV import - create properties, floor plans, and units
 * @param {Array<string>} headers - CSV headers
 * @param {Array<Array<string>>} dataRows - CSV data rows
 * @param {Object} SupabaseAPI - Supabase API module
 * @returns {Promise<Object>} - Import results
 */
async function processCSVImport(headers, dataRows, SupabaseAPI) {
	const result = {
		propertiesCreated: 0,
		floorPlansCreated: 0,
		unitsCreated: 0,
		errors: []
	};
	
	// Track created properties and floor plans to avoid duplicates
	const propertyCache = new Map(); // key: property_name, value: property_id
	const floorPlanCache = new Map(); // key: property_id|floor_plan_name, value: floor_plan_id
	
	for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
		const row = dataRows[rowIndex];
		const rowNum = rowIndex + 2; // +2 because row 1 is headers, and we're 0-indexed
		
		try {
			// Parse row into object
			const data = {};
			headers.forEach((header, index) => {
				data[header] = row[index] || '';
			});
			
			// 1. Create or get property
			let propertyId = propertyCache.get(data.property_name);
			
			if (!propertyId) {
				// Create new property
				const now = new Date().toISOString();
				const propertyData = {
					id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique VARCHAR id
					community_name: data.property_name,
					name: data.property_name, // For backward compatibility
					market: data.market,
					city: data.city || data.market,
					street_address: data.street_address,
					address: data.street_address || null, // For backward compatibility
					zip_code: data.zip_code || null,
					phone: data.phone || null,
					contact_email: data.contact_email || null,
					leasing_link: data.leasing_link || null,
					neighborhood: data.neighborhood || null,
					description: data.description || null,
					amenities: data.amenities ? data.amenities.split('|').map(a => a.trim()) : [],
					is_pumi: data.is_pumi === 'true',
					commission_pct: data.commission_pct ? parseFloat(data.commission_pct) : null,
					map_lat: data.map_lat ? parseFloat(data.map_lat) : null,
					map_lng: data.map_lng ? parseFloat(data.map_lng) : null,
					lat: data.map_lat ? parseFloat(data.map_lat) : null, // For backward compatibility
					lng: data.map_lng ? parseFloat(data.map_lng) : null, // For backward compatibility
					created_at: now,
					updated_at: now
				};

				const property = await SupabaseAPI.createProperty(propertyData);
				propertyId = property.id;
				propertyCache.set(data.property_name, propertyId);
				result.propertiesCreated++;
			}
			
			// 2. Create or get floor plan
			const floorPlanKey = `${propertyId}|${data.floor_plan_name}`;
			let floorPlanId = floorPlanCache.get(floorPlanKey);
			
			if (!floorPlanId) {
				// Create new floor plan
				const floorPlanData = {
					property_id: propertyId,
					name: data.floor_plan_name,
					beds: parseInt(data.beds),
					baths: parseFloat(data.baths),
					sqft: data.sqft ? parseInt(data.sqft) : null,
					market_rent: parseInt(data.market_rent),
					starting_at: parseInt(data.starting_at),
					has_concession: data.has_concession === 'true',
					concession_type: data.concession_type || null,
					concession_value: data.concession_value || null,
					concession_description: data.concession_description || null
				};
				
				const floorPlan = await SupabaseAPI.createFloorPlan(floorPlanData);
				floorPlanId = floorPlan.id;
				floorPlanCache.set(floorPlanKey, floorPlanId);
				result.floorPlansCreated++;
			}
			
			// 3. Create unit
			const unitData = {
				floor_plan_id: floorPlanId,
				property_id: propertyId,
				unit_number: data.unit_number,
				floor: data.floor ? parseInt(data.floor) : null,
				rent: data.unit_rent ? parseInt(data.unit_rent) : null,
				market_rent: data.unit_market_rent ? parseInt(data.unit_market_rent) : null,
				available_from: data.available_from,
				is_available: true,
				status: data.unit_status || 'available',
				notes: data.unit_notes || null
			};
			
			await SupabaseAPI.createUnit(unitData);
			result.unitsCreated++;
			
		} catch (error) {
			result.errors.push({
				row: rowNum,
				error: error.message
			});
			console.error(`Error processing row ${rowNum}:`, error);
		}
	}
	
	return result;
}

