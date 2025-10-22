/**
 * Listings Rendering Module
 * EXACT COPY from script.js - Preserves all pre-modularization functionality
 * 
 * @module listings/rendering
 */

import { formatDate, updateSortHeaders } from '../../utils/helpers.js';

/**
 * Render listings table
 * EXACT COPY from script.js (lines 3824-4069)
 * Preserves all original functionality including:
 * - PUMI labels and styling
 * - Notes count with yellow highlighting
 * - Activity log icons
 * - Interest count (heart icon)
 * - Gear icon for editing (manager only)
 * - Map integration
 * - All event listeners
 *
 * @param {Object} options - Rendering options
 * @param {Object} options.SupabaseAPI - Supabase API object
 * @param {Object} options.state - Application state
 * @param {Function} options.matchesListingsFilters - Filter matching function
 * @param {Object} options.mockInterestedLeads - Mock interested leads data
 * @param {Function} options.selectProperty - Callback to select property
 * @param {Function} options.openListingEditModal - Callback to open edit modal
 * @param {Function} options.openInterestedLeads - Callback to open interested leads
 * @param {Function} options.openActivityLogModal - Callback to open activity log
 * @param {Function} options.openPropertyNotesModal - Callback to open property notes
 * @param {Object} options.map - Map object
 * @param {Function} options.clearMarkers - Function to clear map markers
 * @param {Function} options.addMarker - Function to add map marker
 * @param {Function} options.toast - Toast notification function
 * @returns {Promise<void>}
 */
export async function renderListings(options) {
	const {
		SupabaseAPI,
		state,
		matchesListingsFilters,
		mockInterestedLeads,
		selectProperty,
		openListingEditModal,
		openInterestedLeads,
		openActivityLogModal,
		openPropertyNotesModal,
		map,
		clearMarkers,
		addMarker,
		toast
	} = options;

	const tbody = document.getElementById('listingsTbody');
	if (!tbody) {
		console.error('listingsTbody not found!');
		return;
	}

	try {
		// Fetch properties from Supabase
		const properties = await SupabaseAPI.getProperties({
			search: state.search,
			market: state.listingsFilters.market !== 'all' ? state.listingsFilters.market : null,
			minPrice: state.listingsFilters.minPrice,
			maxPrice: state.listingsFilters.maxPrice,
			beds: state.listingsFilters.beds !== 'any' ? state.listingsFilters.beds : null
		});

		// Filter out unavailable listings (is_available = false)
		const availableProperties = properties.filter(prop => {
			// If is_available field doesn't exist yet, assume available
			return prop.is_available !== false;
		});

		// Fetch floor plans and units for each property
		const propertiesWithData = await Promise.all(
			availableProperties.map(async (prop) => {
				try {
					// Get notes count
					const notes = await SupabaseAPI.getPropertyNotes(prop.id);

					// Get floor plans for this property
					const floorPlans = await SupabaseAPI.getFloorPlans(prop.id);

					// Get units for this property
					const units = await SupabaseAPI.getUnits({ propertyId: prop.id });

					// Fetch notes count for each unit
					const unitsWithNotes = await Promise.all(
						(units || []).map(async (unit) => {
							try {
								const unitNotes = await SupabaseAPI.getUnitNotes(unit.id);
								return {
									...unit,
									notesCount: unitNotes.length
								};
							} catch (error) {
								console.warn('Error fetching unit notes:', error);
								return {
									...unit,
									notesCount: 0
								};
							}
						})
					);

					// Calculate rent range from units
					let rentMin = prop.rent_range_min || 0;
					let rentMax = prop.rent_range_max || 0;

					if (units && units.length > 0) {
						const rents = units.map(u => u.rent).filter(r => r > 0);
						if (rents.length > 0) {
							rentMin = Math.min(...rents);
							rentMax = Math.max(...rents);
						}
					}

					return {
						...prop,
						notesCount: notes.length,
						floorPlans: floorPlans || [],
						units: unitsWithNotes || [],
						rent_range_min: rentMin,
						rent_range_max: rentMax
					};
				} catch (error) {
					console.warn('Error fetching property data:', error);
					return {
						...prop,
						notesCount: 0,
						floorPlans: [],
						units: []
					};
				}
			})
		);

		let filtered = propertiesWithData;

		// Apply additional filters
		filtered = filtered.filter(prop => matchesListingsFilters(prop, state.listingsFilters));

	// Apply sorting if active
	if (state.sort.key && state.sort.dir && state.sort.dir !== 'none') {
		filtered.sort((a, b) => {
			let aVal, bVal;

			if (state.sort.key === 'name') {
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
			} else if (state.sort.key === 'rent_min') {
				aVal = a.rent_min;
				bVal = b.rent_min;
			} else if (state.sort.key === 'commission_pct') {
				aVal = Math.max(a.escort_pct, a.send_pct);
				bVal = Math.max(b.escort_pct, b.send_pct);
			} else {
				return 0;
			}

			// Handle numeric sorting
			if (['rent_min', 'commission_pct'].includes(state.sort.key)) {
				const aNum = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
				const bNum = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
				return state.sort.dir === 'asc' ? aNum - bNum : bNum - aNum;
			} else {
				// Text sorting
				if (state.sort.dir === 'asc') {
					return aVal.localeCompare(bVal);
				} else {
					return bVal.localeCompare(aVal);
				}
			}
		});
	}

	tbody.innerHTML = '';
	console.log('Rendering', filtered.length, 'filtered properties');
	filtered.forEach((prop, index) => {
		console.log(`Property ${index + 1}:`, prop.name, 'isPUMI:', prop.isPUMI, 'Units:', prop.units?.length || 0);

		// Create property row (parent)
		const tr = document.createElement('tr');
		tr.dataset.propertyId = prop.id;
		tr.classList.add('property-row');

		// Add PUMI class for styling
		if (prop.isPUMI || prop.is_pumi) {
			tr.classList.add('pumi-listing');
			console.log('Added pumi-listing class to:', prop.name);
		}

		const communityName = prop.community_name || prop.name;
		const address = prop.street_address || prop.address;
		const bedRange = prop.bed_range || `${prop.beds_min}-${prop.beds_max} bed`;
		const bathRange = prop.bath_range || `${prop.baths_min}-${prop.baths_max} bath`;
		const rentMin = prop.rent_range_min || prop.rent_min;
		const rentMax = prop.rent_range_max || prop.rent_max;
		const commission = prop.commission_pct || Math.max(prop.escort_pct || 0, prop.send_pct || 0);
		const isPUMI = prop.is_pumi || prop.isPUMI;
		const markedForReview = prop.mark_for_review || prop.markForReview;
		const hasUnits = prop.units && prop.units.length > 0;

		tr.innerHTML = `
			<td>
				${hasUnits ? `<span class="expand-arrow" data-property-id="${prop.id}" style="cursor: pointer; user-select: none;">▶</span>` : ''}
			</td>
			<td data-sort="name">
				<div class="lead-name">
					<strong>${communityName}</strong>
					${isPUMI ? '<span class="pumi-label">PUMI</span>' : ''}
					${markedForReview ? '<span class="review-flag" title="Marked for Review">🚩</span>' : ''}
					${hasUnits ? `<span class="unit-count" style="color: #6b7280; font-size: 0.85em; margin-left: 8px;">(${prop.units.length} units)</span>` : ''}
				</div>
				<div class="subtle mono">${address}</div>
				<div class="community-details">
					<span class="market-info">${prop.market}</span>
					<span class="beds-baths">${bedRange} / ${bathRange}</span>
				</div>
				<div class="community-meta">
					<div class="listing-controls">
						${state.role === 'manager' ? `
							<div class="gear-icon" data-property-id="${prop.id}" data-property-name="${communityName}" title="Edit Listing & Mark PUMI">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
									<path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
								</svg>
							</div>
						` : ''}
						<div class="interest-count" data-property-id="${prop.id}" data-property-name="${communityName}">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #ef4444;">
								<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
							</svg>
							<span>${mockInterestedLeads[prop.id] ? mockInterestedLeads[prop.id].length : 0}</span>
						</div>
						<div class="notes-count ${prop.notesCount > 0 ? 'has-notes' : ''}" onclick="openPropertyNotesModal('${prop.id}', '${communityName.replace(/'/g, "\\'")}')" title="${prop.notesCount > 0 ? prop.notesCount + ' note(s)' : 'Add a note'}" style="cursor: pointer;">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: ${prop.notesCount > 0 ? '#fbbf24' : '#9ca3af'};">
								<path d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,5V19H19V12H12V5H5Z"/>
							</svg>
							<span>${prop.notesCount || ''}</span>
						</div>
						<div class="activity-count" data-property-id="${prop.id}" data-property-name="${communityName}" title="View activity log" style="cursor: pointer;">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
								<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
							</svg>
						</div>
					</div>
					<div class="last-updated">Updated: ${formatDate(prop.pricing_last_updated || prop.last_updated)}</div>
				</div>
			</td>
			<td class="mono" data-sort="rent_min">$${rentMin} - $${rentMax}</td>
			<td class="mono" data-sort="commission_pct">${commission}%</td>
		`;

		// Add click handler to table row
		tr.addEventListener('click', (e) => {
			// Don't trigger if clicking on gear icon or heart icon
			if (!e.target.closest('.gear-icon') && !e.target.closest('.interest-count')) {
			selectProperty(prop);
			}
		});

		// Add gear icon click handler (manager only)
		if (state.role === 'manager') {
			const gearIcon = tr.querySelector('.gear-icon');
			if (gearIcon) {
				gearIcon.addEventListener('click', (e) => {
					e.stopPropagation();
					openListingEditModal(prop);
				});
			}
		}

		// Add interest count click handler
		const interestCount = tr.querySelector('.interest-count');
		if (interestCount) {
			interestCount.addEventListener('click', (e) => {
				console.log('=== HEART ICON CLICKED ===');
				console.log('Property ID:', prop.id);
				console.log('Property Name:', prop.name);
				e.stopPropagation();
				openInterestedLeads(prop.id, prop.name);
			});
		}

		// Add activity count click handler
		const activityCount = tr.querySelector('.activity-count');
		if (activityCount) {
			activityCount.addEventListener('click', (e) => {
				console.log('=== ACTIVITY ICON CLICKED ===');
				console.log('Property ID:', prop.id);
				console.log('Property Name:', prop.name);
				e.stopPropagation();
				const propertyId = e.currentTarget.dataset.propertyId;
				const propertyName = e.currentTarget.dataset.propertyName;
				openActivityLogModal(propertyId, 'property', propertyName);
			});
		}

		// Add expand/collapse handler for units
		if (hasUnits) {
			const expandArrow = tr.querySelector('.expand-arrow');
			if (expandArrow) {
				expandArrow.addEventListener('click', (e) => {
					e.stopPropagation();
					const isExpanded = expandArrow.textContent === '▼';
					expandArrow.textContent = isExpanded ? '▶' : '▼';

					// Toggle unit rows visibility
					const unitRows = tbody.querySelectorAll(`tr.unit-row[data-parent-property-id="${prop.id}"]`);
					unitRows.forEach(unitRow => {
						unitRow.style.display = isExpanded ? 'none' : 'table-row';
					});
				});
			}
		}

		tbody.appendChild(tr);

		// Add unit rows (initially hidden)
		if (hasUnits) {
			prop.units.forEach(unit => {
				const unitTr = document.createElement('tr');
				unitTr.classList.add('unit-row');
				unitTr.dataset.parentPropertyId = prop.id;
				unitTr.dataset.unitId = unit.id;
				unitTr.style.display = 'none'; // Initially hidden
				unitTr.style.backgroundColor = '#f9fafb'; // Light gray background

				// Get unit details
				const floorPlan = unit.floor_plan || {};
				const unitRent = unit.rent || floorPlan.starting_at || 0;
				const unitMarketRent = unit.market_rent || floorPlan.market_rent || 0;
				const beds = floorPlan.beds || '?';
				const baths = floorPlan.baths || '?';
				const sqft = floorPlan.sqft || '?';
				const availableDate = unit.available_from ? new Date(unit.available_from).toLocaleDateString() : 'TBD';

				unitTr.innerHTML = `
					<td style="padding-left: 40px;">
						<input type="checkbox" class="unit-checkbox" data-unit-id="${unit.id}">
					</td>
					<td>
						<div class="lead-name" style="font-size: 0.9em;">
							<span style="color: #6b7280;">Unit ${unit.unit_number}</span>
							${unit.status === 'pending' ? '<span class="badge" style="background: #fbbf24; color: #000;">Pending</span>' : ''}
							${unit.status === 'leased' ? '<span class="badge" style="background: #ef4444; color: #fff;">Leased</span>' : ''}
						</div>
						<div class="subtle mono" style="font-size: 0.85em;">
							${beds}bd / ${baths}ba • ${sqft} sqft • Available: ${availableDate}
						</div>
						<div class="community-meta">
							<div class="listing-controls">
								${state.role === 'manager' ? `
									<div class="gear-icon unit-gear" data-unit-id="${unit.id}" data-unit-number="${unit.unit_number}" title="Edit Unit">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
											<path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
										</svg>
									</div>
								` : ''}
								<div class="interest-count unit-interest" data-unit-id="${unit.id}" data-unit-number="${unit.unit_number}">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #ef4444;">
										<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
									</svg>
									<span>0</span>
								</div>
								<div class="notes-count unit-notes ${unit.notesCount > 0 ? 'has-notes' : ''}" data-unit-id="${unit.id}" data-unit-number="${unit.unit_number}" title="${unit.notesCount > 0 ? unit.notesCount + ' note(s)' : 'Add a note'}" style="cursor: pointer;">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: ${unit.notesCount > 0 ? '#fbbf24' : '#9ca3af'};">
										<path d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,5V19H19V12H12V5H5Z"/>
									</svg>
									<span>${unit.notesCount || ''}</span>
								</div>
								<div class="activity-count unit-activity" data-unit-id="${unit.id}" data-unit-number="${unit.unit_number}" title="View activity log" style="cursor: pointer;">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
										<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
									</svg>
								</div>
							</div>
						</div>
					</td>
					<td class="mono" style="font-size: 0.9em;">
						$${unitRent}${unitMarketRent > unitRent ? ` <span style="color: #10b981; font-size: 0.85em;">(save $${unitMarketRent - unitRent})</span>` : ''}
					</td>
					<td class="mono" style="font-size: 0.9em;">${commission}%</td>
				`;

				// Add unit-level event handlers
				const unitNotesIcon = unitTr.querySelector('.unit-notes');
				const unitActivityIcon = unitTr.querySelector('.unit-activity');
				const unitGearIcon = unitTr.querySelector('.unit-gear');

				// Unit Notes Icon
				if (unitNotesIcon) {
					unitNotesIcon.addEventListener('click', async (e) => {
						e.stopPropagation();
						e.preventDefault();
						console.log('Unit notes icon clicked for unit:', unit.id);
						try {
							const { openUnitNotesModal } = await import('../modals/unit-modals.js');
							await openUnitNotesModal(unit.id, unit.unit_number, prop.community_name, prop.id);
						} catch (error) {
							console.error('Error opening unit notes modal:', error);
						}
					});
				}

				// Unit Activity Icon
				if (unitActivityIcon) {
					unitActivityIcon.addEventListener('click', async (e) => {
						e.stopPropagation();
						e.preventDefault();
						console.log('Unit activity icon clicked for unit:', unit.id);
						if (window.openActivityLogModal) {
							await window.openActivityLogModal(unit.id, 'unit', `Unit ${unit.unit_number} - ${prop.community_name}`);
						}
					});
				}

				// Unit Gear Icon (Configuration)
				if (unitGearIcon) {
					unitGearIcon.addEventListener('click', async (e) => {
						e.stopPropagation();
						e.preventDefault();
						console.log('Unit gear icon clicked for unit:', unit.id);
						try {
							const { openUnitConfigModal } = await import('../modals/unit-modals.js');
							await openUnitConfigModal(unit.id);
						} catch (error) {
							console.error('Error opening unit config modal:', error);
						}
					});
				}

				tbody.appendChild(unitTr);
			});
		}
	});

	// Update map - simplified marker addition
	if (map) {
		console.log('Map exists, clearing markers and adding new ones');
		clearMarkers();

		// Add markers directly (only for properties with valid coordinates)
		if (filtered.length > 0) {
			const validProps = filtered.filter(prop => prop.lat && prop.lng);
			console.log('Adding', validProps.length, 'markers to map (out of', filtered.length, 'total properties)');
			validProps.forEach(prop => {
				console.log('Adding marker for:', prop.name, 'at', prop.lng, prop.lat);
				try {
					addMarker(prop);
				} catch (error) {
					console.error('Error adding marker for', prop.name, ':', error);
				}
			});
		}
	} else {
		console.log('Map not available yet');
	}

	// Ensure map fills container after rendering
	setTimeout(() => {
		if (map) map.resize();
	}, 100);

	// Update sort headers
	updateSortHeaders('listingsTable');

	// Debug table column widths
	console.log('=== TABLE WIDTH DEBUG ===');
	const table = document.getElementById('listingsTable');
	if (table) {
		const cols = table.querySelectorAll('th');
		cols.forEach((col, i) => {
			console.log(`Column ${i + 1}:`, col.textContent.trim(), 'Width:', col.offsetWidth + 'px');
		});

		const firstCol = table.querySelector('th:first-child');
		if (firstCol) {
			console.log('First column computed style:', getComputedStyle(firstCol).width);
			console.log('First column offsetWidth:', firstCol.offsetWidth);
		}
	}
	} catch (error) {
		console.error('Error rendering listings:', error);
		toast('Error loading listings', 'error');
		tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Error loading listings. Please try again.</td></tr>';
	}
}

