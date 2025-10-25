/**
 * Map Manager Module
 * Handles Mapbox GL JS map initialization and marker management
 * 
 * @module listings/map-manager
 */

// Map state
let map = null;
let markers = [];
let selectedProperty = null;

/**
 * Get the current map instance
 * @returns {mapboxgl.Map|null} The map instance
 */
export function getMap() {
	return map;
}

/**
 * Get all markers
 * @returns {Array} Array of marker objects
 */
export function getMarkers() {
	return markers;
}

/**
 * Get the selected property
 * @returns {Object|null} The selected property
 */
export function getSelectedProperty() {
	return selectedProperty;
}

/**
 * Initialize Mapbox GL JS map
 * Creates the map instance with controls and event handlers
 */
export function initMap() {
	if (map) return;

	// Initialize Mapbox GL JS map
	map = new mapboxgl.Map({
		container: 'listingsMap',
		style: 'mapbox://styles/mapbox/streets-v12',
		center: [-98.50, 29.48], // [longitude, latitude] for San Antonio
		zoom: 10,
		attributionControl: true
	});

	// Add navigation controls
	map.addControl(new mapboxgl.NavigationControl(), 'top-right');

	// Add scale control
	map.addControl(new mapboxgl.ScaleControl({
		maxWidth: 100,
		unit: 'metric'
	}), 'bottom-right');

	// Wait for map to load before adding markers
	map.on('load', () => {
		console.log('Mapbox map loaded');
		// Ensure map fills container properly
		map.resize();
		// Ensure map starts centered on San Antonio
		map.setCenter([-98.50, 29.48]);
		map.setZoom(10);
		// Mark as initialized
		map.hasBeenInitialized = true;
	});

	// Handle window resize to ensure map fills container
	window.addEventListener('resize', () => {
		if (map) {
			map.resize();
		}
	});
}

/**
 * Clear all markers from the map
 */
export function clearMarkers() {
	markers.forEach(markerGroup => {
		// Handle both old and new marker structures
		if (markerGroup.pin) {
			markerGroup.pin.remove();
		} else if (markerGroup.dot) {
			// Legacy marker cleanup
			if (markerGroup.dot.remove) {
				markerGroup.dot.remove();
			}
		}
	});
	markers = [];
}

/**
 * Add a marker to the map for a property
 * @param {Object} prop - The property object
 */
export function addMarker(prop) {
	// Skip if no valid coordinates
	if (!prop.lat || !prop.lng) {
		console.warn('Skipping marker for', prop.name, '- no coordinates');
		return;
	}

	const isSelected = selectedProperty && selectedProperty.id === prop.id;

	// Create popup content with safe fallbacks
	const rentMin = prop.rent_min || prop.rent_range_min || 0;
	const rentMax = prop.rent_max || prop.rent_range_max || 0;
	const bedsMin = prop.beds_min || 0;
	const bedsMax = prop.beds_max || 0;
	const bathsMin = prop.baths_min || 0;
	const bathsMax = prop.baths_max || 0;

	const popupContent = `
		<div class="mapbox-popup">
			<strong>${prop.name || prop.community_name || 'Unknown'}</strong><br>
			${prop.address || prop.street_address || ''}<br>
			<span class="subtle">$${rentMin.toLocaleString()} - $${rentMax.toLocaleString()} · ${bedsMin}-${bedsMax} bd / ${bathsMin}-${bathsMax} ba</span>
		</div>
	`;

	// Create popup
	const popup = new mapboxgl.Popup({
		closeButton: true,
		closeOnClick: false
	}).setHTML(popupContent);

	// Check if property is PUMI (support both old and new field names)
	const isPUMI = prop.is_pumi || prop.isPUMI || false;

	// Create custom dot marker element
	const dotElement = document.createElement('div');
	dotElement.className = 'custom-dot-marker';
	dotElement.style.cssText = `
		width: ${isPUMI ? '16px' : '12px'};
		height: ${isPUMI ? '16px' : '12px'};
		border-radius: 50%;
		background: ${isSelected ? '#ef4444' : (isPUMI ? '#22c55e' : '#3b82f6')};
		border: 2px solid white;
		box-shadow: ${isPUMI ? '0 0 15px rgba(34, 197, 94, 0.8), 0 0 25px rgba(34, 197, 94, 0.6), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)'};
		cursor: pointer;
		transition: all 0.2s ease;
		animation: ${isPUMI ? 'pumi-pulse 2s infinite' : 'none'};
	`;

	// Create dot marker using custom element
	const dotMarker = new mapboxgl.Marker({
		element: dotElement,
		anchor: 'center'
	})
	.setLngLat([prop.lng, prop.lat])
	.setPopup(popup)
	.addTo(map);

	// Store marker
	const markerGroup = {
		pin: dotMarker,
		property: prop
	};

	// Add click handler
	dotElement.addEventListener('click', () => {
		selectProperty(prop);
	});

	markers.push(markerGroup);
}

/**
 * Select a property on the map
 * Updates table selection and marker styles
 * @param {Object} prop - The property to select
 */
export function selectProperty(prop) {
	selectedProperty = prop;

	// Update table selection
	document.querySelectorAll('#listingsTbody tr').forEach(row => {
		row.classList.remove('selected');
	});

	// Find and highlight the table row
	const rows = document.querySelectorAll('#listingsTbody tr');
	rows.forEach(row => {
		const nameCell = row.querySelector('.lead-name');
		if (nameCell && nameCell.textContent.trim() === prop.name) {
			row.classList.add('selected');
			row.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});

	// Update map markers
	markers.forEach(markerGroup => {
		const isSelected = markerGroup.property.id === prop.id;
		const isPUMI = markerGroup.property.is_pumi || markerGroup.property.isPUMI || false;

		// Update dot marker - handle both old and new structures
		if (markerGroup.pin) {
			const dotElement = markerGroup.pin.getElement();
			dotElement.style.width = isPUMI ? '16px' : '12px';
			dotElement.style.height = isPUMI ? '16px' : '12px';
			dotElement.style.background = isSelected ? '#ef4444' : (isPUMI ? '#22c55e' : '#3b82f6');
			dotElement.style.boxShadow = isPUMI ? '0 0 15px rgba(34, 197, 94, 0.8), 0 0 25px rgba(34, 197, 94, 0.6), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)';
			dotElement.style.animation = isPUMI ? 'pumi-pulse 2s infinite' : 'none';
		} else if (markerGroup.dot) {
			// Legacy marker handling - skip for now to avoid errors
			console.log('Skipping legacy marker update');
		}
	});

	// Center map on selected property
	map.flyTo({
		center: [prop.lng, prop.lat],
		zoom: Math.max(map.getZoom(), 14)
	});
}

