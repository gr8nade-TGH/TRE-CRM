// Listing Modals Functions - EXACT COPY from script.js
import { initAddressAutocomplete } from '../../utils/mapbox-autocomplete.js';
import { geocodeAddress } from '../../utils/geocoding.js';

// Store autocomplete cleanup function
let autocompleteCleanup = null;

export function openAddListingModal(options) {
	const { showModal } = options;

	const form = document.getElementById('addListingForm');

	// Reset form
	if (form) {
		form.reset();
	}

	// Set default date to today
	const lastUpdatedInput = document.getElementById('listingLastUpdated');
	if (lastUpdatedInput) {
		lastUpdatedInput.valueAsDate = new Date();
	}

	// Initialize address autocomplete
	const streetAddressInput = document.getElementById('listingStreetAddress');
	console.log('🔍 Looking for listingStreetAddress input:', streetAddressInput);

	if (streetAddressInput) {
		// Clean up previous autocomplete if exists
		if (autocompleteCleanup) {
			console.log('🧹 Cleaning up previous autocomplete');
			autocompleteCleanup();
		}

		console.log('🚀 Initializing autocomplete on street address input');
		// Initialize new autocomplete
		autocompleteCleanup = initAddressAutocomplete(streetAddressInput, {
			onSelect: (addressComponents) => {
				console.log('✅ Address selected:', addressComponents);

				// Fill in the address fields
				document.getElementById('listingMarket').value = addressComponents.city;
				document.getElementById('listingZipCode').value = addressComponents.zipCode;

				// Store coordinates for saving
				document.getElementById('listingMapLat').value = addressComponents.lat;
				document.getElementById('listingMapLng').value = addressComponents.lng;

				console.log('📍 Stored coordinates:', { lat: addressComponents.lat, lng: addressComponents.lng });
			}
		});
	} else {
		console.error('❌ Could not find listingStreetAddress input element!');
	}

	showModal('addListingModal');
}

export function closeAddListingModal(options) {
	const { hideModal } = options;
	
	hideModal('addListingModal');
}

export async function createListing(options) {
	const { SupabaseAPI, geocodeAddress, toast, closeAddListingModal, renderListings } = options;
	
	try {
		// Debug: Check current user state
		console.log('🔍 Current user state:', {
			agentId: window.state?.agentId,
			currentUser: window.currentUser,
			userId: window.getUserId?.()
		});

		// Get form values
		const communityName = document.getElementById('listingCommunityName').value.trim();
		const streetAddress = document.getElementById('listingStreetAddress').value.trim();
		const market = document.getElementById('listingMarket').value;
		const zipCode = document.getElementById('listingZipCode').value.trim();
		const bedRange = document.getElementById('listingBedRange').value.trim();
		const bathRange = document.getElementById('listingBathRange').value.trim();
		const rentMin = parseInt(document.getElementById('listingRentMin').value);
		const rentMax = parseInt(document.getElementById('listingRentMax').value);
		const commission = parseFloat(document.getElementById('listingCommission').value);
		const amenitiesInput = document.getElementById('listingAmenities').value.trim();
		const isPUMI = document.getElementById('listingIsPUMI').checked;
		const lastUpdated = document.getElementById('listingLastUpdated').value;
		const contactEmail = document.getElementById('listingContactEmail').value.trim();
		const leasingLink = document.getElementById('listingLeasingLink').value.trim();
		const mapLat = document.getElementById('listingMapLat').value;
		const mapLng = document.getElementById('listingMapLng').value;
		const noteContent = document.getElementById('listingNotes').value.trim();

		// Validation
		if (!communityName || !streetAddress || !market || !zipCode || !bedRange || !bathRange || !rentMin || !rentMax || !commission) {
			toast('Please fill in all required fields', 'error');
			return;
		}

		if (rentMin >= rentMax) {
			toast('Rent Max must be greater than Rent Min', 'error');
			return;
		}

		// Parse amenities
		const amenities = amenitiesInput ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a) : [];

		// Geocode address if lat/lng not provided
		let lat = mapLat ? parseFloat(mapLat) : null;
		let lng = mapLng ? parseFloat(mapLng) : null;

		if (!lat || !lng) {
			console.log('🗺️ Geocoding address...');
			const coords = await geocodeAddress(streetAddress, market, zipCode);
			if (coords) {
				lat = coords.lat;
				lng = coords.lng;
				toast('Address geocoded successfully!', 'success');
			} else {
				// Address validation failed - reject the submission
				toast('Error: Invalid address. Please enter a valid street address.', 'error');
				return;
			}
		}

		// Get user email for created_by (public.users uses email as PK, not UUID)
		const userEmail = window.currentUser?.email || null;

		// Create property data
		const now = new Date().toISOString();
		const propertyData = {
			id: `prop_${Date.now()}`,
			// New schema fields
			community_name: communityName,
			street_address: streetAddress,
			city: market,
			market: market,
			zip_code: zipCode,
			bed_range: bedRange,
			bath_range: bathRange,
			rent_range_min: rentMin,
			rent_range_max: rentMax,
			commission_pct: commission,
			amenities: amenities,
			is_pumi: isPUMI,
			last_updated: lastUpdated || now,
			contact_email: contactEmail || null,
			leasing_link: leasingLink || null,
			map_lat: lat,
			map_lng: lng,
			created_by: userEmail,
			created_at: now,
			updated_at: now,
			// Old schema fields (for backward compatibility)
			name: communityName,
			address: streetAddress,
			// Also set lat/lng for old schema
			lat: lat,
			lng: lng
		};

		console.log('Creating property:', propertyData);

		// Create property in Supabase
		const newProperty = await SupabaseAPI.createProperty(propertyData);
		console.log('✅ Property created:', newProperty);

		// If there's a note, create it
		if (noteContent && userEmail) {
			const authorName = window.currentUser?.user_metadata?.name ||
							   window.currentUser?.email ||
							   'Unknown';
			const noteData = {
				property_id: newProperty.id,
				content: noteContent,
				author_id: userEmail,
				author_name: authorName
			};
			try {
				await SupabaseAPI.createPropertyNote(noteData);
				console.log('✅ Property note created');
			} catch (noteError) {
				console.error('❌ Error creating note (continuing anyway):', noteError);
				// Don't fail the whole operation if note creation fails
			}
		} else if (noteContent && !userEmail) {
			console.warn('⚠️ Cannot create note: user email not available');
		}

		toast('Listing created successfully!', 'success');
		closeAddListingModal();

		// Refresh listings
		await renderListings();
	} catch (error) {
		console.error('❌ Error creating listing:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
		const errorMsg = error.message || error.msg || 'Unknown error';
		toast(`Error creating listing: ${errorMsg}`, 'error');
	}
}

export async function openListingEditModal(property, options) {
	const { state, showModal, SupabaseAPI } = options;

	console.log('Opening listing edit modal for:', property);

	// Fetch fresh property data to get contact info
	let fullProperty = property;
	try {
		fullProperty = await SupabaseAPI.getProperty(property.id);
		console.log('Fetched full property data:', fullProperty);
	} catch (error) {
		console.error('Error fetching full property data:', error);
		// Continue with the property data we have
	}

	// Populate the modal with current property data
	document.getElementById('editListingName').textContent = fullProperty.name || fullProperty.community_name;
	document.getElementById('editPropertyName').value = fullProperty.name || fullProperty.community_name;

	// Address fields
	document.getElementById('editStreetAddress').value = fullProperty.street_address || '';
	document.getElementById('editCity').value = fullProperty.city || '';
	document.getElementById('editState').value = fullProperty.state || 'TX';
	document.getElementById('editZipCode').value = fullProperty.zip_code || '';

	// Contact info fields
	document.getElementById('editPhone').value = fullProperty.contact_phone || fullProperty.phone || '';
	document.getElementById('editContactName').value = fullProperty.contact_name || '';
	document.getElementById('editContactEmail').value = fullProperty.contact_email || '';
	document.getElementById('editOfficeHours').value = fullProperty.office_hours || '';

	// Calculate rent range from units
	try {
		const units = await SupabaseAPI.getUnits({ propertyId: property.id });
		if (units && units.length > 0) {
			const rents = units.map(u => u.rent).filter(r => r > 0);
			if (rents.length > 0) {
				const minRent = Math.min(...rents);
				const maxRent = Math.max(...rents);
				document.getElementById('editRentMin').value = minRent;
				document.getElementById('editRentMax').value = maxRent;
			} else {
				document.getElementById('editRentMin').value = property.rent_range_min || 0;
				document.getElementById('editRentMax').value = property.rent_range_max || 0;
			}
		} else {
			document.getElementById('editRentMin').value = property.rent_range_min || 0;
			document.getElementById('editRentMax').value = property.rent_range_max || 0;
		}
	} catch (error) {
		console.error('Error calculating rent range:', error);
		document.getElementById('editRentMin').value = property.rent_range_min || 0;
		document.getElementById('editRentMax').value = property.rent_range_max || 0;
	}
	document.getElementById('editBedsMin').value = property.beds_min || 0;
	document.getElementById('editBedsMax').value = property.beds_max || 0;
	document.getElementById('editBathsMin').value = property.baths_min || 0;
	document.getElementById('editBathsMax').value = property.baths_max || 0;

	// Set commission field - use commission_pct, or fallback to max of escort/send
	const commission = property.commission_pct || Math.max(property.escort_pct || 0, property.send_pct || 0);
	document.getElementById('editCommissionPct').value = commission;
	document.getElementById('editWebsite').value = fullProperty.website || fullProperty.leasing_link || '';
	document.getElementById('editAmenities').value = Array.isArray(fullProperty.amenities) ? fullProperty.amenities.join(', ') : '';
	document.getElementById('editSpecials').value = fullProperty.specials_text || '';
	document.getElementById('editBonus').value = fullProperty.bonus_text || '';
	document.getElementById('editIsPUMI').checked = fullProperty.is_pumi || fullProperty.isPUMI || false;
	document.getElementById('editMarkForReview').checked = fullProperty.mark_for_review || fullProperty.markForReview || false;

	// Fetch and display active specials
	try {
		const specialsData = await SupabaseAPI.getSpecials({ search: '' });
		const specials = specialsData.items || [];
		const propertyName = fullProperty.name || fullProperty.community_name;
		const propertySpecials = specials.filter(s => s.property_name === propertyName);
		const activeSpecials = propertySpecials.filter(s => {
			const expDate = new Date(s.valid_until);
			return expDate > new Date();
		});

		const specialsList = document.getElementById('editPropertySpecialsList');
		if (specialsList) {
			if (activeSpecials.length === 0) {
				specialsList.innerHTML = '<p style="color: #6b7280; font-size: 14px;">No active specials for this property.</p>';
			} else {
				specialsList.innerHTML = activeSpecials.map(special => {
					const expDate = new Date(special.valid_until).toLocaleDateString();
					return `
						<div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
							<div style="display: flex; justify-content: space-between; align-items: start;">
								<div style="flex: 1;">
									<strong style="color: #1f2937;">${special.title}</strong>
									<p style="margin: 4px 0; color: #6b7280; font-size: 13px;">${special.description}</p>
									<p style="margin: 4px 0; color: #3b82f6; font-size: 12px;">Expires: ${expDate}</p>
								</div>
								<button type="button" class="icon-btn" onclick="window.editPropertySpecial('${special.id}', '${propertyName.replace(/'/g, "\\'")}');" title="Edit Special">
									✏️
								</button>
							</div>
						</div>
					`;
				}).join('');
			}
		}
	} catch (error) {
		console.error('Error fetching specials:', error);
		const specialsList = document.getElementById('editPropertySpecialsList');
		if (specialsList) {
			specialsList.innerHTML = '<p style="color: #ef4444; font-size: 14px;">Error loading specials.</p>';
		}
	}

	// Show/hide delete button based on role
	const deleteBtn = document.getElementById('deleteListingBtn');
	if (deleteBtn) {
		if (state.role === 'manager' || state.role === 'super_user') {
			deleteBtn.style.display = 'block';
		} else {
			deleteBtn.style.display = 'none';
		}
	}

	// Store the current property for saving
	window.currentEditingProperty = property;

	// Initialize address autocomplete
	const streetAddressInput = document.getElementById('editStreetAddress');
	console.log('🔍 Looking for editStreetAddress input:', streetAddressInput);

	if (streetAddressInput) {
		// Clean up previous autocomplete if exists
		if (autocompleteCleanup) {
			console.log('🧹 Cleaning up previous autocomplete');
			autocompleteCleanup();
		}

		console.log('🚀 Initializing autocomplete on street address input');
		// Initialize new autocomplete
		autocompleteCleanup = initAddressAutocomplete(streetAddressInput, {
			onSelect: (addressComponents) => {
				console.log('✅ Address selected:', addressComponents);

				// Fill in the address fields
				document.getElementById('editCity').value = addressComponents.city;
				document.getElementById('editState').value = addressComponents.state;
				document.getElementById('editZipCode').value = addressComponents.zipCode;

				// Store coordinates for saving
				window.currentEditingProperty.tempLat = addressComponents.lat;
				window.currentEditingProperty.tempLng = addressComponents.lng;

				console.log('📍 Stored coordinates:', { lat: addressComponents.lat, lng: addressComponents.lng });
			}
		});
	} else {
		console.error('❌ Could not find editStreetAddress input element!');
	}

	// Show the modal
	showModal('listingEditModal');
}

export function closeListingEditModal(options) {
	const { hideModal } = options;
	
	hideModal('listingEditModal');
	window.currentEditingProperty = null;
}

export async function deleteListing(options) {
	const { SupabaseAPI, toast, closeListingEditModal, renderListings } = options;
	
	const property = window.currentEditingProperty;
	if (!property) return;

	// Confirm deletion
	const propertyName = property.name || property.community_name;
	const confirmed = confirm(`Are you sure you want to delete "${propertyName}"? This action cannot be undone.`);

	if (!confirmed) return;

	try {
		console.log('Deleting property:', property.id);

		// Delete from Supabase
		await SupabaseAPI.deleteProperty(property.id);

		// Show success message
		toast(`Listing "${propertyName}" deleted successfully!`, 'success');

		// Close modal and refresh display
		closeListingEditModal();
		await renderListings();
	} catch (error) {
		console.error('Error deleting listing:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
		toast(`Error deleting listing: ${error.message}`, 'error');
	}
}

export async function saveListingEdit(options) {
	const { SupabaseAPI, toast, closeListingEditModal, renderListings } = options;

	const property = window.currentEditingProperty;
	if (!property) return;

	try {
		// Get form data
		const streetAddress = document.getElementById('editStreetAddress').value.trim();
		const city = document.getElementById('editCity').value.trim();
		const state = document.getElementById('editState').value;
		const zipCode = document.getElementById('editZipCode').value.trim();

		// Validate required fields
		if (!streetAddress || !city || !state || !zipCode) {
			toast('Please fill in all address fields', 'error');
			return;
		}

		// Use coordinates from autocomplete if available, otherwise use existing property coordinates
		const lat = property.tempLat || property.lat;
		const lng = property.tempLng || property.lng;

		if (!lat || !lng) {
			toast('Unable to determine property location. Please select an address from the autocomplete dropdown.', 'error');
			return;
		}

		console.log('✅ Using coordinates:', { lat, lng, source: property.tempLat ? 'autocomplete' : 'existing' });

		// Build form data - ONLY use new schema field names
		const formData = {
			community_name: document.getElementById('editPropertyName').value.trim(),
			street_address: streetAddress,
			city: city,
			state: state,
			zip_code: zipCode,
			lat: lat,
			lng: lng,
			phone: document.getElementById('editPhone').value.trim(),
			contact_name: document.getElementById('editContactName').value.trim(),
			contact_email: document.getElementById('editContactEmail').value.trim(),
			contact_phone: document.getElementById('editPhone').value.trim(),
			office_hours: document.getElementById('editOfficeHours').value.trim(),
			// Rent range is read-only, calculated from units - don't update it
			bed_range: `${document.getElementById('editBedsMin').value || 0}-${document.getElementById('editBedsMax').value || 0}`,
			bath_range: `${document.getElementById('editBathsMin').value || 0}-${document.getElementById('editBathsMax').value || 0}`,
			commission_pct: parseFloat(document.getElementById('editCommissionPct').value) || 0,
			leasing_link: document.getElementById('editWebsite').value.trim(),
			amenities: document.getElementById('editAmenities').value.split(',').map(a => a.trim()).filter(a => a),
			is_pumi: document.getElementById('editIsPUMI').checked,
			mark_for_review: document.getElementById('editMarkForReview').checked,
			updated_at: new Date().toISOString()
		};

		console.log('Saving listing with data:', formData);

		// Get current user info for activity logging
		const userEmail = window.currentUser?.email || 'unknown';
		const userName = window.currentUser?.user_metadata?.name ||
						 window.currentUser?.email ||
						 'Unknown User';

		// Update in Supabase
		await SupabaseAPI.updateProperty(property.id, formData, userEmail, userName);

		// Show success message
		toast(`Property "${formData.community_name}" updated successfully!`, 'success');

		// Close modal and refresh display
		closeListingEditModal();
		await renderListings();
	} catch (error) {
		console.error('Error updating listing:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
		toast(`Error updating listing: ${error.message}`, 'error');
	}
}

