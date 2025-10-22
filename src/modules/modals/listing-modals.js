// Listing Modals Functions - EXACT COPY from script.js

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

export function openListingEditModal(property, options) {
	const { state, showModal } = options;

	console.log('Opening listing edit modal for:', property);

	// Populate the modal with current property data
	document.getElementById('editListingName').textContent = property.name || property.community_name;
	document.getElementById('editPropertyName').value = property.name || property.community_name;

	// Split address into components
	document.getElementById('editStreetAddress').value = property.street_address || '';
	document.getElementById('editCity').value = property.city || '';
	document.getElementById('editState').value = property.state || 'TX';
	document.getElementById('editZipCode').value = property.zip_code || '';

	document.getElementById('editMarket').value = property.market || property.city || '';
	document.getElementById('editPhone').value = property.phone || property.contact_email || '';
	document.getElementById('editRentMin').value = property.rent_min || property.rent_range_min || 0;
	document.getElementById('editRentMax').value = property.rent_max || property.rent_range_max || 0;
	document.getElementById('editBedsMin').value = property.beds_min || 0;
	document.getElementById('editBedsMax').value = property.beds_max || 0;
	document.getElementById('editBathsMin').value = property.baths_min || 0;
	document.getElementById('editBathsMax').value = property.baths_max || 0;
	document.getElementById('editEscortPct').value = property.escort_pct || property.commission_pct || 0;
	document.getElementById('editSendPct').value = property.send_pct || property.commission_pct || 0;
	document.getElementById('editWebsite').value = property.website || property.leasing_link || '';
	document.getElementById('editAmenities').value = Array.isArray(property.amenities) ? property.amenities.join(', ') : '';
	document.getElementById('editSpecials').value = property.specials_text || '';
	document.getElementById('editBonus').value = property.bonus_text || '';
	document.getElementById('editIsPUMI').checked = property.is_pumi || property.isPUMI || false;
	document.getElementById('editMarkForReview').checked = property.mark_for_review || property.markForReview || false;

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
	const { SupabaseAPI, toast, closeListingEditModal, renderListings, geocodeAddress } = options;

	const property = window.currentEditingProperty;
	if (!property) return;

	try {
		// Get form data
		const streetAddress = document.getElementById('editStreetAddress').value.trim();
		const city = document.getElementById('editCity').value.trim();
		const state = document.getElementById('editState').value;
		const zipCode = document.getElementById('editZipCode').value.trim();
		const market = document.getElementById('editMarket').value;

		// Validate required fields
		if (!streetAddress || !city || !state || !zipCode) {
			toast('Please fill in all required address fields', 'error');
			return;
		}

		// Geocode the address to get lat/lng
		console.log('🗺️ Geocoding address...');
		const coords = await geocodeAddress(streetAddress, city, state, zipCode);

		if (!coords) {
			toast('Error: Could not geocode address. Please check the address and try again.', 'error');
			return;
		}

		toast('Address geocoded successfully!', 'success');

		// Build form data - ONLY use new schema field names
		const formData = {
			community_name: document.getElementById('editPropertyName').value.trim(),
			street_address: streetAddress,
			city: city,
			state: state,
			zip_code: zipCode,
			market: market,
			lat: coords.lat,
			lng: coords.lng,
			contact_email: document.getElementById('editPhone').value.trim(), // Using contact_email for phone
			rent_range_min: parseInt(document.getElementById('editRentMin').value) || 0,
			rent_range_max: parseInt(document.getElementById('editRentMax').value) || 0,
			bed_range: `${document.getElementById('editBedsMin').value || 0}-${document.getElementById('editBedsMax').value || 0}`,
			bath_range: `${document.getElementById('editBathsMin').value || 0}-${document.getElementById('editBathsMax').value || 0}`,
			commission_pct: Math.max(
				parseFloat(document.getElementById('editEscortPct').value) || 0,
				parseFloat(document.getElementById('editSendPct').value) || 0
			),
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

