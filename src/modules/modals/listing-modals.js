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
	// Calculate bed/bath ranges from floor plans (auto-calculated like rent)
	try {
		const floorPlans = await SupabaseAPI.getFloorPlans(property.id);
		console.log('Floor plans for property:', floorPlans);

		if (floorPlans && floorPlans.length > 0) {
			const beds = floorPlans.map(fp => fp.beds).filter(b => b != null);
			const baths = floorPlans.map(fp => fp.baths).filter(b => b != null);

			if (beds.length > 0) {
				const bedsMin = Math.min(...beds);
				const bedsMax = Math.max(...beds);
				document.getElementById('editBedsMin').value = bedsMin;
				document.getElementById('editBedsMax').value = bedsMax;
			} else {
				document.getElementById('editBedsMin').value = property.beds_min || 0;
				document.getElementById('editBedsMax').value = property.beds_max || 0;
			}

			if (baths.length > 0) {
				const bathsMin = Math.min(...baths);
				const bathsMax = Math.max(...baths);
				document.getElementById('editBathsMin').value = bathsMin;
				document.getElementById('editBathsMax').value = bathsMax;
			} else {
				document.getElementById('editBathsMin').value = property.baths_min || 0;
				document.getElementById('editBathsMax').value = property.baths_max || 0;
			}
		} else {
			// No floor plans - use existing property values
			document.getElementById('editBedsMin').value = property.beds_min || 0;
			document.getElementById('editBedsMax').value = property.beds_max || 0;
			document.getElementById('editBathsMin').value = property.baths_min || 0;
			document.getElementById('editBathsMax').value = property.baths_max || 0;
		}
	} catch (error) {
		console.error('Error calculating bed/bath range:', error);
		document.getElementById('editBedsMin').value = property.beds_min || 0;
		document.getElementById('editBedsMax').value = property.beds_max || 0;
		document.getElementById('editBathsMin').value = property.baths_min || 0;
		document.getElementById('editBathsMax').value = property.baths_max || 0;
	}

	// Set commission field - use commission_pct, or fallback to max of escort/send
	const commission = property.commission_pct || Math.max(property.escort_pct || 0, property.send_pct || 0);
	document.getElementById('editCommissionPct').value = commission;
	document.getElementById('editWebsite').value = fullProperty.website || fullProperty.leasing_link || '';
	document.getElementById('editAmenities').value = Array.isArray(fullProperty.amenities) ? fullProperty.amenities.join(', ') : '';
	// Note: editSpecials and editBonus fields removed - specials are now displayed in read-only section
	document.getElementById('editIsPUMI').checked = fullProperty.is_pumi || fullProperty.isPUMI || false;
	document.getElementById('editMarkForReview').checked = fullProperty.mark_for_review || fullProperty.markForReview || false;

	// Populate policy checkboxes
	document.getElementById('editAcceptsBrokenLeaseUnder1').checked = fullProperty.accepts_broken_lease_under_1 || false;
	document.getElementById('editAcceptsBrokenLease1Year').checked = fullProperty.accepts_broken_lease_1_year || false;
	document.getElementById('editAcceptsBrokenLease2Year').checked = fullProperty.accepts_broken_lease_2_year || false;
	document.getElementById('editAcceptsBrokenLease3Plus').checked = fullProperty.accepts_broken_lease_3_plus || false;
	document.getElementById('editAcceptsEvictionUnder1').checked = fullProperty.accepts_eviction_under_1 || false;
	document.getElementById('editAcceptsEviction1Year').checked = fullProperty.accepts_eviction_1_year || false;
	document.getElementById('editAcceptsEviction2Year').checked = fullProperty.accepts_eviction_2_year || false;
	document.getElementById('editAcceptsEviction3Plus').checked = fullProperty.accepts_eviction_3_plus || false;
	document.getElementById('editAcceptsMisdemeanor').checked = fullProperty.accepts_misdemeanor || false;
	document.getElementById('editAcceptsFelony').checked = fullProperty.accepts_felony || false;
	document.getElementById('editAcceptsBadCredit').checked = fullProperty.accepts_bad_credit || false;
	document.getElementById('editSameDayMoveIn').checked = fullProperty.same_day_move_in || false;
	document.getElementById('editPassportOnlyAccepted').checked = fullProperty.passport_only_accepted || false;
	document.getElementById('editVisaRequired').checked = fullProperty.visa_required || false;
	document.getElementById('editAcceptsSection8').checked = fullProperty.accepts_section_8 || false;
	document.getElementById('editAcceptsUpTo3Pets').checked = fullProperty.accepts_up_to_3_pets || false;

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

	// Initialize collapsible sections
	initCollapsibleSections();

	// Show the modal
	showModal('listingEditModal');

	// Handle field highlighting if requested (from data quality badges)
	if (options.highlightField) {
		console.log('[DQ Badge] Highlighting field:', options.highlightField, 'in section:', options.expandSection);

		setTimeout(() => {
			// Expand the section if specified
			if (options.expandSection) {
				const sectionHeader = document.querySelector(`#listingEditModal [data-section="${options.expandSection}"]`);
				console.log('[DQ Badge] Found section header:', sectionHeader);

				if (sectionHeader) {
					// Check if collapsed and expand
					if (sectionHeader.classList.contains('collapsed')) {
						console.log('[DQ Badge] Section is collapsed, clicking to expand');
						sectionHeader.click();
					}

					// Also manually expand the content in case click doesn't work
					const sectionContent = document.getElementById(`section-${options.expandSection}`);
					if (sectionContent) {
						sectionContent.style.maxHeight = '1000px';
						sectionContent.style.padding = '16px';
						sectionHeader.classList.remove('collapsed');
					}
				}
			}

			// Wait a bit more for section to expand before highlighting
			setTimeout(() => {
				// Highlight the field
				const fieldElement = document.getElementById(options.highlightField);
				console.log('[DQ Badge] Found field element:', fieldElement);

				if (fieldElement) {
					// Scroll to field
					fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

					// Add highlight animation
					fieldElement.style.transition = 'box-shadow 0.3s, background-color 0.3s';
					fieldElement.style.boxShadow = '0 0 0 3px #fbbf24';
					fieldElement.style.backgroundColor = '#fffbeb';

					// Focus the field
					fieldElement.focus();

					// Remove highlight after a few seconds
					setTimeout(() => {
						fieldElement.style.boxShadow = '';
						fieldElement.style.backgroundColor = '';
					}, 3000);
				}
			}, 200);
		}, 400); // Wait for modal to fully open
	}
}

// Initialize collapsible section handlers
function initCollapsibleSections() {
	const sectionHeaders = document.querySelectorAll('.section-header');

	sectionHeaders.forEach(header => {
		// Remove any existing listeners
		const newHeader = header.cloneNode(true);
		header.parentNode.replaceChild(newHeader, header);

		// Add click handler
		newHeader.addEventListener('click', (e) => {
			e.preventDefault();
			const sectionId = newHeader.getAttribute('data-section');
			const content = document.getElementById(`section-${sectionId}`);

			// Toggle collapsed state
			newHeader.classList.toggle('collapsed');

			// Toggle content visibility
			if (newHeader.classList.contains('collapsed')) {
				content.style.maxHeight = '0';
				content.style.padding = '0 16px';
			} else {
				content.style.maxHeight = '1000px';
				content.style.padding = '16px';
			}
		});
	});
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

		// Build combined address for sync with Properties page
		const combinedAddress = `${streetAddress}, ${city}, ${state} ${zipCode}`.trim();

		// Build form data - ONLY use new schema field names
		const formData = {
			community_name: document.getElementById('editPropertyName').value.trim(),
			street_address: streetAddress,
			city: city,
			state: state,
			zip_code: zipCode,
			address: combinedAddress, // Combined address for sync with Properties page
			lat: lat,
			lng: lng,
			phone: document.getElementById('editPhone').value.trim(),
			contact_name: document.getElementById('editContactName').value.trim(),
			contact_email: document.getElementById('editContactEmail').value.trim(),
			contact_phone: document.getElementById('editPhone').value.trim(),
			office_hours: document.getElementById('editOfficeHours').value.trim(),
			// NOTE: Rent range, bed/bath ranges are auto-calculated from units/floor_plans - don't save them
			// They will be calculated on-the-fly when properties are fetched
			commission_pct: parseFloat(document.getElementById('editCommissionPct').value) || 0,
			leasing_link: document.getElementById('editWebsite').value.trim(),
			amenities: document.getElementById('editAmenities').value.split(',').map(a => a.trim()).filter(a => a),
			is_pumi: document.getElementById('editIsPUMI').checked,
			mark_for_review: document.getElementById('editMarkForReview').checked,
			// Policy fields
			accepts_broken_lease_under_1: document.getElementById('editAcceptsBrokenLeaseUnder1').checked,
			accepts_broken_lease_1_year: document.getElementById('editAcceptsBrokenLease1Year').checked,
			accepts_broken_lease_2_year: document.getElementById('editAcceptsBrokenLease2Year').checked,
			accepts_broken_lease_3_plus: document.getElementById('editAcceptsBrokenLease3Plus').checked,
			accepts_eviction_under_1: document.getElementById('editAcceptsEvictionUnder1').checked,
			accepts_eviction_1_year: document.getElementById('editAcceptsEviction1Year').checked,
			accepts_eviction_2_year: document.getElementById('editAcceptsEviction2Year').checked,
			accepts_eviction_3_plus: document.getElementById('editAcceptsEviction3Plus').checked,
			accepts_misdemeanor: document.getElementById('editAcceptsMisdemeanor').checked,
			accepts_felony: document.getElementById('editAcceptsFelony').checked,
			accepts_bad_credit: document.getElementById('editAcceptsBadCredit').checked,
			same_day_move_in: document.getElementById('editSameDayMoveIn').checked,
			passport_only_accepted: document.getElementById('editPassportOnlyAccepted').checked,
			visa_required: document.getElementById('editVisaRequired').checked,
			accepts_section_8: document.getElementById('editAcceptsSection8').checked,
			accepts_up_to_3_pets: document.getElementById('editAcceptsUpTo3Pets').checked,
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

