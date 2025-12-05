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
export async function renderListings(options, autoSelectProperty = null) {
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

	// Customer View: Highlight customer search if no customer selected
	const customerSearchInput = document.getElementById('customerSearchInput');
	if (state.customerView.isActive && !state.customerView.selectedCustomer && !state.customerView.skipped) {
		// Add highlight to indicate customer selection is available
		if (customerSearchInput) {
			customerSearchInput.classList.add('highlight-prompt');
		}
	} else {
		// Remove highlight when customer is selected or skipped
		if (customerSearchInput) {
			customerSearchInput.classList.remove('highlight-prompt');
		}
	}

	try {
		// Fetch properties and specials (both manual and discovered) in parallel
		const [properties, specialsData, discoveredSpecialsMap] = await Promise.all([
			SupabaseAPI.getProperties({
				search: state.search,
				market: state.listingsFilters.market !== 'all' ? state.listingsFilters.market : null,
				minPrice: state.listingsFilters.minPrice,
				maxPrice: state.listingsFilters.maxPrice,
				beds: state.listingsFilters.beds !== 'any' ? state.listingsFilters.beds : null
			}),
			SupabaseAPI.getSpecials({ search: '', sortKey: 'valid_until', sortOrder: 'asc' }),
			SupabaseAPI.getAllSpecialsForListings()
		]);

		// Extract specials array from response
		const specials = specialsData?.items || specialsData || [];

		// Filter out unavailable listings (is_available = false)
		const availableProperties = properties.filter(prop => {
			// If is_available field doesn't exist yet, assume available
			return prop.is_available !== false;
		});

		// OPTIMIZED: Batch fetch all data for all properties (4 queries instead of N*4 queries)
		const propertyIds = availableProperties.map(prop => prop.id);

		const [propertyNotesCountsMap, floorPlansMap, unitsMap, interestedLeadsCountsMap] = await Promise.all([
			SupabaseAPI.getBatchPropertyNotesCounts(propertyIds),
			SupabaseAPI.getBatchFloorPlans(propertyIds),
			SupabaseAPI.getBatchUnits(propertyIds, { isActive: null }),
			SupabaseAPI.getBatchInterestedLeadsCounts(propertyIds)
		]);

		// OPTIMIZED: Batch fetch unit notes counts for ALL units across ALL properties (1 query instead of N*M queries)
		const allUnits = Object.values(unitsMap).flat();
		const unitIds = allUnits.map(unit => unit.id);
		const unitNotesCountsMap = await SupabaseAPI.getBatchUnitNotesCounts(unitIds);

		// Build properties with all data from batch queries
		const propertiesWithData = availableProperties.map(prop => {
			try {
				// Get data from batch query results
				const notesCount = propertyNotesCountsMap[prop.id] || 0;
				const floorPlans = floorPlansMap[prop.id] || [];
				const units = unitsMap[prop.id] || [];
				const interestedLeadsCount = interestedLeadsCountsMap[prop.id] || 0;

				// Add notes count to each unit
				const unitsWithNotes = units.map(unit => ({
					...unit,
					notesCount: unitNotesCountsMap[unit.id] || 0
				}));

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

				// Find active specials for this property (merge manual + discovered)
				const propName = prop.community_name || prop.name;
				const propSpecials = specials.filter(s => s.property_name === propName);
				const manualActiveSpecials = propSpecials.filter(s => {
					const expDate = new Date(s.valid_until || s.expiration_date);
					return expDate > new Date();
				}).map(s => ({
					text: s.current_special || s.title,
					source: 'manual',
					expires: s.valid_until,
					discoveredAt: s.created_at,
					isActive: true
				}));

				// Get discovered specials by property ID (from property_specials table)
				const discoveredSpecials = discoveredSpecialsMap.get(prop.id) || [];
				const activeDiscovered = discoveredSpecials.filter(s => s.isActive);

				// Merge both sources (manual first, then discovered)
				const activeSpecials = [...manualActiveSpecials, ...activeDiscovered];

				return {
					...prop,
					notesCount,
					interestedLeadsCount,
					floorPlans,
					activeSpecials,
					units: unitsWithNotes,
					rent_range_min: rentMin,
					rent_range_max: rentMax
				};
			} catch (error) {
				console.warn('Error processing property data:', error);
				return {
					...prop,
					notesCount: 0,
					floorPlans: [],
					units: []
				};
			}
		});

		let filtered = propertiesWithData;

		// Apply additional filters
		filtered = filtered.filter(prop => matchesListingsFilters(prop, state.listingsFilters));

		// Customer View: Calculate match scores if customer is selected
		if (state.customerView.isActive && state.customerView.selectedCustomer) {
			console.log('🎯 Customer View active - calculating match scores...');

			const { calculateMatchScores } = await import('./customer-view.js');
			const { getActiveConfig } = await import('../../api/smart-match-config-api.js');

			// Fetch active Smart Match configuration
			let config;
			try {
				config = await getActiveConfig();
			} catch (error) {
				console.warn('⚠️ Failed to load Smart Match config, using defaults:', error);
				const { DEFAULT_SMART_MATCH_CONFIG } = await import('../../utils/smart-match-config-defaults.js');
				config = DEFAULT_SMART_MATCH_CONFIG;
			}

			// Calculate match scores for all properties
			await calculateMatchScores(filtered, state.customerView.selectedCustomer, config);

			// Sort by match score (highest first) in Customer View
			filtered.sort((a, b) => {
				const scoreA = state.customerView.matchScores.get(a.id) || 0;
				const scoreB = state.customerView.matchScores.get(b.id) || 0;
				return scoreB - scoreA;
			});

			console.log('✅ Properties sorted by match score');
		}
		// Agent View: Apply normal sorting
		else if (state.sort.key && state.sort.dir && state.sort.dir !== 'none') {
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

		// Import star rating generator if in Customer View
		let generateStarRating = null;
		if (state.customerView.isActive) {
			const customerViewModule = await import('./customer-view.js');
			generateStarRating = customerViewModule.generateStarRating;
		}

		// Store listings in state for other functions (like Build Showcase)
		state.listings = filtered;

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
			const rentMin = prop.rent_range_min || prop.rent_min;
			const rentMax = prop.rent_range_max || prop.rent_max;
			const commission = prop.commission_pct || Math.max(prop.escort_pct || 0, prop.send_pct || 0);
			const isPUMI = prop.is_pumi || prop.isPUMI;
			const markedForReview = prop.mark_for_review || prop.markForReview;
			// Show expand arrow if we have units OR floor plans
			const hasUnits = (prop.units && prop.units.length > 0) || (prop.floorPlans && prop.floorPlans.length > 0);
			const hasActiveSpecials = prop.activeSpecials && prop.activeSpecials.length > 0;

			// Check if property needs AI enrichment (name is same as address or missing)
			const needsEnrichment = prop.data_source === 'rentcast' &&
				(!communityName || communityName === address || communityName.includes(address.split(',')[0])) &&
				prop.enrichment_status !== 'enriched' && prop.enrichment_status !== 'reviewed';

			// Get match score if in Customer View
			const matchScore = state.customerView.isActive ? state.customerView.matchScores.get(prop.id) : null;
			let matchScoreBadge = '';
			if (matchScore !== null && matchScore !== undefined && generateStarRating) {
				matchScoreBadge = generateStarRating(matchScore);
			}

			// Get primary photo (first image from photos array)
			const primaryPhoto = prop.photos && prop.photos.length > 0 ? prop.photos[0] : null;
			const hasPhotos = prop.photos && prop.photos.length > 0;
			const totalPhotos = prop.photos?.length || 0;

			// Build specials tooltip with dates
			let specialsTooltip = '';
			if (hasActiveSpecials) {
				const tooltipLines = prop.activeSpecials.slice(0, 3).map(s => {
					const text = s.text?.slice(0, 60) || 'Special offer';
					const dateInfo = s.expires
						? `Expires: ${new Date(s.expires).toLocaleDateString()}`
						: s.discoveredAt
							? `Found: ${new Date(s.discoveredAt).toLocaleDateString()}`
							: 'Status unknown';
					const sourceIcon = s.source === 'manual' ? '✏️' : '🤖';
					return `${sourceIcon} ${text}${text.length >= 60 ? '...' : ''} (${dateInfo})`;
				});
				if (prop.activeSpecials.length > 3) {
					tooltipLines.push(`...and ${prop.activeSpecials.length - 3} more`);
				}
				specialsTooltip = tooltipLines.join('&#10;');
			}

			tr.innerHTML = `
			<td>
				${hasUnits ? `<span class="expand-arrow" data-property-id="${prop.id}" style="cursor: pointer; user-select: none;">▶</span>` : ''}
			</td>
			<td class="photo-cell">
				<div class="property-thumbnail ${hasPhotos ? 'has-photo' : 'needs-photo'}" data-property-id="${prop.id}" title="${hasPhotos ? `View ${totalPhotos} photo(s)` : 'Need Image'}">
					${hasPhotos
					? `<img src="${primaryPhoto}" alt="${communityName}" onerror="this.parentElement.classList.add('needs-photo'); this.parentElement.classList.remove('has-photo'); this.style.display='none'; this.nextElementSibling.style.display='flex';">`
					: ''}
					<div class="thumbnail-placeholder" style="${hasPhotos ? 'display:none;' : 'display:flex;'}">
						<span>📷</span>
						<small>Need Image</small>
					</div>
					${hasPhotos ? `<span class="photo-count">${totalPhotos}</span>` : ''}
				</div>
			</td>
			<td data-sort="name">
				<div class="lead-name">
					<strong>${communityName}</strong>
					${matchScoreBadge}
					${hasActiveSpecials ? `<span class="special-icon" onclick="window.viewPropertySpecialsFromListing('${prop.id}', '${communityName.replace(/'/g, "\\'")}', ${JSON.stringify(prop.activeSpecials).replace(/"/g, '&quot;')})" title="${specialsTooltip}" style="cursor: pointer; margin-left: 6px; font-size: 1em;">🔥</span>` : ''}
					${isPUMI ? '<span class="pumi-label">PUMI</span>' : ''}
					${!state.customerView.isActive && commission > 0 ? `<span class="commission-badge" style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 6px; font-weight: 600;">Com: ${commission}%</span>` : ''}
					${markedForReview ? '<span class="review-flag" title="Marked for Review">🚩</span>' : ''}
					${needsEnrichment ? `<span class="needs-review-badge" data-property-id="${prop.id}" title="Click to run AI audit on this property"><span class="badge-icon">🤖</span> AI Audit</span>` : ''}
					${hasUnits ? `<span class="unit-count" style="color: #6b7280; font-size: 0.85em; margin-left: 8px;">(${prop.units.length} units)</span>` : ''}
				</div>
				<div class="subtle mono">${address}</div>
				<div class="community-details">
					<span class="market-info">${prop.market}</span>
				</div>
				<div class="community-meta">
					<div class="listing-controls">
						${state.role === 'manager' ? `
							<div class="scan-units-icon" data-property-id="${prop.id}" data-property-name="${communityName}" data-leasing-url="${prop.leasing_link || prop.leasing_url || prop.website || ''}" title="Scan Units for this property">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #10b981;">
									<path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M17,17H7V7H17V17M15,15V9H9V15H15Z"/>
								</svg>
							</div>
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
							<span>${prop.interestedLeadsCount || 0}</span>
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
		`;

			// Add click handler to table row
			tr.addEventListener('click', (e) => {
				// Don't trigger if clicking on control icons
				if (!e.target.closest('.gear-icon') && !e.target.closest('.interest-count') && !e.target.closest('.scan-units-icon')) {
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

				// Add scan units icon click handler
				const scanUnitsIcon = tr.querySelector('.scan-units-icon');
				if (scanUnitsIcon) {
					scanUnitsIcon.addEventListener('click', async (e) => {
						e.stopPropagation();
						const propertyId = e.currentTarget.dataset.propertyId;
						const propertyName = e.currentTarget.dataset.propertyName;
						let leasingUrl = e.currentTarget.dataset.leasingUrl;

						console.log(`[Scan Units] Property: ${propertyName}, URL from data attr: "${leasingUrl}"`);

						// Open scan modal
						openScanUnitsModal(propertyId, propertyName, leasingUrl);
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

			// Add "Needs Review" badge click handler for AI enrichment
			const needsReviewBadge = tr.querySelector('.needs-review-badge');
			if (needsReviewBadge) {
				needsReviewBadge.addEventListener('click', async (e) => {
					e.stopPropagation();
					console.log('=== NEEDS REVIEW BADGE CLICKED ===');
					console.log('Property:', prop);
					try {
						const { openEnrichmentModal } = await import('../properties/enrichment-ui.js');
						await openEnrichmentModal(prop);
					} catch (error) {
						console.error('Error opening enrichment modal:', error);
						toast('Failed to open AI enrichment: ' + error.message, 'error');
					}
				});
			}

			// Add photo thumbnail click handler to open gallery
			const photoThumbnail = tr.querySelector('.property-thumbnail');
			if (photoThumbnail) {
				photoThumbnail.addEventListener('click', async (e) => {
					e.stopPropagation();
					console.log('=== PHOTO THUMBNAIL CLICKED ===');
					console.log('Property:', prop.name);

					const { openPhotoGalleryModal } = await import('./photo-gallery.js');
					await openPhotoGalleryModal(prop);
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
			// Sort units: active units first, then inactive units
			if (hasUnits) {
				const activeUnits = prop.units.filter(u => u.is_active !== false);
				const inactiveUnits = prop.units.filter(u => u.is_active === false);
				const sortedUnits = [...activeUnits, ...inactiveUnits];

				sortedUnits.forEach(unit => {
					const isInactive = unit.is_active === false;

					const unitTr = document.createElement('tr');
					unitTr.classList.add('unit-row');
					unitTr.dataset.parentPropertyId = prop.id;
					unitTr.dataset.unitId = unit.id;
					unitTr.style.display = 'none'; // Initially hidden

					// Visual distinction for inactive units
					if (isInactive) {
						unitTr.style.backgroundColor = '#f3f4f6'; // Darker gray for inactive
						unitTr.style.opacity = '0.6'; // Slightly faded
					} else {
						unitTr.style.backgroundColor = '#f9fafb'; // Light gray background
					}

					// Get unit details
					const floorPlan = unit.floor_plan || {};
					const unitRent = unit.rent || floorPlan.starting_at || 0;
					const unitMarketRent = unit.market_rent || floorPlan.market_rent || 0;
					const beds = floorPlan.beds || '?';
					const baths = floorPlan.baths || '?';
					const sqft = floorPlan.sqft || '?';
					const availableDate = unit.available_from ? new Date(unit.available_from).toLocaleDateString() : 'TBD';

					// Get unit match score if in Customer View
					const unitScoreData = state.customerView.isActive ? state.customerView.unitScores.get(unit.id) : null;
					let unitMatchScoreBadge = '';
					if (unitScoreData && generateStarRating) {
						const recommendedBadge = unitScoreData.isRecommended ? '<span class="recommended-badge" style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 6px;">BEST MATCH</span>' : '';
						unitMatchScoreBadge = generateStarRating(unitScoreData.score) + recommendedBadge;
					}

					unitTr.innerHTML = `
					<td style="padding-left: 40px;">
						<input type="checkbox" class="unit-checkbox" data-unit-id="${unit.id}" ${isInactive ? 'disabled' : ''}>
					</td>
					<td></td>
					<td>
						<div class="lead-name" style="font-size: 0.9em;">
							<span style="color: #6b7280;">Unit ${unit.unit_number}</span>
							${unitMatchScoreBadge}
							${isInactive ? '<span class="badge" style="background: #9ca3af; color: #fff;">Off Market</span>' : ''}
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

			// If no units but has floor plans, show floor plans as expandable rows
			if ((!prop.units || prop.units.length === 0) && prop.floorPlans && prop.floorPlans.length > 0) {
				prop.floorPlans.forEach(fp => {
					const fpTr = document.createElement('tr');
					fpTr.classList.add('unit-row', 'floor-plan-row');
					fpTr.dataset.parentPropertyId = prop.id;
					fpTr.dataset.floorPlanId = fp.id;
					fpTr.style.display = 'none'; // Initially hidden
					fpTr.style.backgroundColor = '#f0fdf4'; // Light green for floor plans

					const beds = fp.beds || '?';
					const baths = fp.baths || '?';
					const sqft = fp.sqft || '?';
					const rentMin = fp.starting_at || fp.rent_min || 0;
					const rentMax = fp.market_rent || fp.rent_max || rentMin;
					const rentDisplay = rentMin === rentMax
						? `$${rentMin?.toLocaleString() || '?'}`
						: `$${rentMin?.toLocaleString() || '?'} - $${rentMax?.toLocaleString() || '?'}`;

					fpTr.innerHTML = `
					<td style="padding-left: 40px;"></td>
					<td></td>
					<td>
						<div class="lead-name" style="font-size: 0.9em;">
							<span style="color: #059669; font-weight: 500;">📐 ${fp.name || 'Floor Plan'}</span>
							<span class="badge" style="background: #d1fae5; color: #065f46; margin-left: 8px;">${beds}bd/${baths}ba</span>
							${sqft !== '?' ? `<span class="badge" style="background: #e0e7ff; color: #3730a3; margin-left: 4px;">${sqft.toLocaleString()} sqft</span>` : ''}
						</div>
						<div class="subtle mono" style="font-size: 0.85em; margin-top: 4px;">
							${fp.units_available ? `<span style="color: #10b981;">${fp.units_available} available</span>` : ''}
							${fp.soonest_available ? `<span style="margin-left: 8px;">Available: ${new Date(fp.soonest_available).toLocaleDateString()}</span>` : ''}
						</div>
					</td>
					<td class="mono" style="font-size: 0.9em;">
						${rentDisplay}
					</td>
				`;

					tbody.appendChild(fpTr);
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
						// Pass match score if in Customer View
						const matchScore = state.customerView.isActive ? state.customerView.matchScores.get(prop.id) : null;
						addMarker(prop, matchScore);
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

		// Auto-select property if specified (deep linking support)
		if (autoSelectProperty) {
			console.log('🔗 Deep linking: Auto-selecting property:', autoSelectProperty);

			// Find the property by name (community_name or name)
			const propertyToSelect = filtered.find(prop => {
				const propName = prop.community_name || prop.name;
				return propName === autoSelectProperty;
			});

			if (propertyToSelect) {
				console.log('✅ Found property to auto-select:', propertyToSelect.name);

				// Use setTimeout to ensure DOM is fully rendered
				setTimeout(() => {
					selectProperty(propertyToSelect);

					// Scroll the property into view
					const propertyRow = document.querySelector(`tr[data-property-id="${propertyToSelect.id}"]`);
					if (propertyRow) {
						propertyRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}, 200);
			} else {
				console.warn('⚠️ Property not found for auto-select:', autoSelectProperty);
			}
		}

	} catch (error) {
		console.error('Error rendering listings:', error);
		toast('Error loading listings', 'error');
		tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Error loading listings. Please try again.</td></tr>';
	}
}

/**
 * Open Scan Units Modal with proper UX
 */
function openScanUnitsModal(propertyId, propertyName, leasingUrl) {
	// Remove existing modal if any
	const existingModal = document.getElementById('scanUnitsModal');
	if (existingModal) existingModal.remove();

	// Create modal
	const modal = document.createElement('div');
	modal.id = 'scanUnitsModal';
	modal.className = 'modal-overlay';
	modal.innerHTML = `
		<div class="modal-content" style="max-width: 480px; border-radius: 12px;">
			<div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
				<h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981">
						<path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M17,17H7V7H17V17M15,15V9H9V15H15Z"/>
					</svg>
					Scan Units
				</h3>
				<button class="modal-close" onclick="document.getElementById('scanUnitsModal').remove()">&times;</button>
			</div>
			<div class="modal-body" style="padding: 20px 0;">
				<div id="scanModalContent">
					<p style="color: #475569; margin-bottom: 20px; font-size: 14px;">
						<strong>${propertyName}</strong>
					</p>

					<div style="display: flex; flex-direction: column; gap: 12px;">
						<button id="quickScanBtn" class="scan-option-btn" style="
							display: flex; align-items: center; gap: 12px; padding: 16px;
							border: 2px solid #e2e8f0; border-radius: 10px; background: #f8fafc;
							cursor: pointer; transition: all 0.2s; text-align: left;
						">
							<div style="
								width: 44px; height: 44px; border-radius: 8px;
								background: linear-gradient(135deg, #3b82f6, #2563eb);
								display: flex; align-items: center; justify-content: center;
							">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="white">
									<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
								</svg>
							</div>
							<div>
								<div style="font-weight: 600; color: #1e293b; font-size: 15px;">Quick Scan</div>
								<div style="color: #64748b; font-size: 13px;">Scan property website directly</div>
							</div>
						</button>

						<button id="deepScanBtn" class="scan-option-btn" style="
							display: flex; align-items: center; gap: 12px; padding: 16px;
							border: 2px solid #e2e8f0; border-radius: 10px; background: #f8fafc;
							cursor: pointer; transition: all 0.2s; text-align: left;
						">
							<div style="
								width: 44px; height: 44px; border-radius: 8px;
								background: linear-gradient(135deg, #8b5cf6, #7c3aed);
								display: flex; align-items: center; justify-content: center;
							">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="white">
									<path d="M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z"/>
								</svg>
							</div>
							<div>
								<div style="font-weight: 600; color: #1e293b; font-size: 15px;">Deep Scan</div>
								<div style="color: #64748b; font-size: 13px;">Search apartments.com, zillow, rent.com</div>
							</div>
						</button>
					</div>

					${!leasingUrl ? `
					<div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;">
						⚠️ No website URL found. Quick Scan will ask for a URL.
					</div>
					` : ''}
				</div>

				<!-- Progress View (hidden initially) -->
				<div id="scanProgressView" style="display: none;">
					<div style="text-align: center; padding: 20px 0;">
						<div class="scan-spinner" style="
							width: 50px; height: 50px; margin: 0 auto 20px;
							border: 4px solid #e2e8f0;
							border-top-color: #3b82f6;
							border-radius: 50%;
							animation: spin 1s linear infinite;
						"></div>
						<div id="scanStatusText" style="font-weight: 600; color: #1e293b; margin-bottom: 8px;">
							Initializing scan...
						</div>
						<div id="scanSubStatus" style="color: #64748b; font-size: 13px;">
							Please wait
						</div>
					</div>

					<!-- Progress Steps -->
					<div id="scanSteps" style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
						<div class="scan-step" id="step1" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #64748b;">
							<div class="step-indicator" style="width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px;">1</div>
							<span>Searching listing sites...</span>
						</div>
						<div class="scan-step" id="step2" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #64748b;">
							<div class="step-indicator" style="width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px;">2</div>
							<span>Extracting page content...</span>
						</div>
						<div class="scan-step" id="step3" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #64748b;">
							<div class="step-indicator" style="width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px;">3</div>
							<span>AI analyzing units...</span>
						</div>
						<div class="scan-step" id="step4" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; color: #64748b;">
							<div class="step-indicator" style="width: 24px; height: 24px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px;">4</div>
							<span>Saving results...</span>
						</div>
					</div>
				</div>

				<!-- Results View (hidden initially) -->
				<div id="scanResultsView" style="display: none;"></div>
			</div>
		</div>
		<style>
			@keyframes spin { to { transform: rotate(360deg); } }
			.scan-option-btn:hover { border-color: #3b82f6 !important; background: #eff6ff !important; }
			.scan-step.active { color: #3b82f6 !important; font-weight: 500; }
			.scan-step.active .step-indicator { background: #3b82f6 !important; color: white !important; }
			.scan-step.complete { color: #10b981 !important; }
			.scan-step.complete .step-indicator { background: #10b981 !important; color: white !important; }
		</style>
	`;

	document.body.appendChild(modal);

	// Add event listeners
	document.getElementById('quickScanBtn').addEventListener('click', () => {
		startScan(propertyId, propertyName, leasingUrl, false);
	});

	document.getElementById('deepScanBtn').addEventListener('click', () => {
		startScan(propertyId, propertyName, leasingUrl, true);
	});

	// Close on overlay click
	modal.addEventListener('click', (e) => {
		if (e.target === modal) modal.remove();
	});
}

/**
 * Start the actual scan process
 */
async function startScan(propertyId, propertyName, leasingUrl, isDeepScan) {
	// For quick scan, check if we need a URL
	if (!isDeepScan && !leasingUrl) {
		const url = prompt(`Enter the property website URL for ${propertyName}:\n\n(e.g., https://www.brandonoakssanantonio.com)`);
		if (!url) return;
		leasingUrl = url.startsWith('http') ? url : 'https://' + url;
	}

	// Switch to progress view
	document.getElementById('scanModalContent').style.display = 'none';
	document.getElementById('scanProgressView').style.display = 'block';

	const statusText = document.getElementById('scanStatusText');
	const subStatus = document.getElementById('scanSubStatus');

	// Update status based on scan type
	if (isDeepScan) {
		statusText.textContent = 'Deep Scanning...';
		subStatus.textContent = 'Searching apartments.com, zillow, rent.com';
	} else {
		statusText.textContent = 'Quick Scanning...';
		subStatus.textContent = 'Analyzing property website';
	}

	// Simulate progress steps
	const steps = ['step1', 'step2', 'step3', 'step4'];
	let currentStep = 0;

	const progressInterval = setInterval(() => {
		if (currentStep < steps.length) {
			const step = document.getElementById(steps[currentStep]);
			if (step) {
				step.classList.remove('active');
				step.classList.add('complete');
				step.querySelector('.step-indicator').innerHTML = '✓';
			}
			currentStep++;
			if (currentStep < steps.length) {
				const nextStep = document.getElementById(steps[currentStep]);
				if (nextStep) nextStep.classList.add('active');
			}
		}
	}, isDeepScan ? 4000 : 2000); // Slower for deep scan

	// Mark first step as active
	document.getElementById('step1')?.classList.add('active');

	try {
		console.log(`[Scan Units] Starting ${isDeepScan ? 'deep' : 'quick'} scan for ${propertyName}...`);

		const response = await fetch('/api/property/batch-enrich-v2', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				phase: isDeepScan ? 'deep_scan' : 'units',
				propertyIds: [propertyId],
				overrideUrl: leasingUrl
			})
		});

		const result = await response.json();
		console.log(`[Scan Units] Result for ${propertyName}:`, result);

		clearInterval(progressInterval);

		// Mark all steps complete
		steps.forEach(stepId => {
			const step = document.getElementById(stepId);
			if (step) {
				step.classList.remove('active');
				step.classList.add('complete');
				step.querySelector('.step-indicator').innerHTML = '✓';
			}
		});

		// Show results
		setTimeout(() => {
			showScanResults(result, propertyName, isDeepScan);
		}, 500);

	} catch (error) {
		clearInterval(progressInterval);
		console.error('[Scan Units] Error:', error);
		showScanResults({ success: false, error: error.message }, propertyName, isDeepScan);
	}
}

/**
 * Show scan results in the modal
 */
function showScanResults(result, propertyName, isDeepScan) {
	const progressView = document.getElementById('scanProgressView');
	const resultsView = document.getElementById('scanResultsView');

	if (progressView) progressView.style.display = 'none';
	if (resultsView) resultsView.style.display = 'block';

	let html = '';

	if (result.success) {
		const propResult = result.results?.[0];
		const phaseResult = isDeepScan ? propResult?.phases?.deep_scan : propResult?.phases?.units;

		if (phaseResult?.status === 'found') {
			const unitsFound = phaseResult.units || 0;
			const floorPlansFound = phaseResult.floorPlans || 0;
			const sources = phaseResult.sources?.join(', ') || 'property website';

			html = `
				<div style="text-align: center; padding: 20px 0;">
					<div style="width: 60px; height: 60px; margin: 0 auto 16px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="#10b981">
							<path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
						</svg>
					</div>
					<h4 style="margin: 0 0 8px; color: #10b981; font-size: 18px;">Scan Complete!</h4>
					<p style="color: #475569; margin: 0 0 20px;">
						${isDeepScan
					? `Found <strong>${unitsFound}</strong> units from ${sources}`
					: `Found <strong>${floorPlansFound}</strong> floor plans and <strong>${unitsFound}</strong> units`
				}
					</p>
					<button onclick="document.getElementById('scanUnitsModal').remove(); location.reload();" style="
						background: #10b981; color: white; border: none; padding: 12px 24px;
						border-radius: 8px; font-weight: 600; cursor: pointer;
					">Close & Refresh</button>
				</div>
			`;
		} else {
			html = `
				<div style="text-align: center; padding: 20px 0;">
					<div style="width: 60px; height: 60px; margin: 0 auto 16px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b">
							<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
						</svg>
					</div>
					<h4 style="margin: 0 0 8px; color: #f59e0b; font-size: 18px;">No New Data Found</h4>
					<p style="color: #475569; margin: 0 0 20px;">
						We couldn't find unit availability data for this property.
						${!isDeepScan ? 'Try a Deep Scan to search listing sites.' : ''}
					</p>
					<button onclick="document.getElementById('scanUnitsModal').remove();" style="
						background: #64748b; color: white; border: none; padding: 12px 24px;
						border-radius: 8px; font-weight: 600; cursor: pointer;
					">Close</button>
				</div>
			`;
		}
	} else {
		html = `
			<div style="text-align: center; padding: 20px 0;">
				<div style="width: 60px; height: 60px; margin: 0 auto 16px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="#ef4444">
						<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
					</svg>
				</div>
				<h4 style="margin: 0 0 8px; color: #ef4444; font-size: 18px;">Scan Failed</h4>
				<p style="color: #475569; margin: 0 0 20px;">
					${result.error || 'An unknown error occurred'}
				</p>
				<button onclick="document.getElementById('scanUnitsModal').remove();" style="
					background: #64748b; color: white; border: none; padding: 12px 24px;
					border-radius: 8px; font-weight: 600; cursor: pointer;
				">Close</button>
			</div>
		`;
	}

	resultsView.innerHTML = html;
}

