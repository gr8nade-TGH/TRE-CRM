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
 * @param {number|null} matchScore - Optional match score for Customer View
 */
export function addMarker(prop, matchScore = null) {
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
		position: relative;
	`;

	// Add match score indicator if provided (Customer View)
	if (matchScore !== null && matchScore !== undefined) {
		const scoreElement = document.createElement('div');
		scoreElement.className = 'marker-match-score';
		scoreElement.textContent = Math.round(matchScore);
		scoreElement.style.cssText = `
			position: absolute;
			top: -8px;
			right: -8px;
			background: #fbbf24;
			color: white;
			font-size: 10px;
			font-weight: 700;
			padding: 2px 5px;
			border-radius: 10px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			pointer-events: none;
			line-height: 1;
		`;
		dotElement.appendChild(scoreElement);
	}

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

// Preferred area layer state
const PREFERRED_AREA_SOURCE_ID = 'preferred-area-source';
const PREFERRED_AREA_FILL_ID = 'preferred-area-fill';
const PREFERRED_AREA_OUTLINE_ID = 'preferred-area-outline';

/**
 * Display a lead's preferred area polygon on the map
 * @param {Object} preferredAreaGeoJSON - GeoJSON geometry object (Polygon type)
 */
export function showPreferredArea(preferredAreaGeoJSON) {
	if (!map || !preferredAreaGeoJSON) {
		console.warn('Cannot show preferred area: map or data not available');
		return;
	}

	// Clear any existing preferred area
	clearPreferredArea();

	console.log('🗺️ Displaying preferred area on map:', preferredAreaGeoJSON);

	// Wait for map style to be loaded
	if (!map.isStyleLoaded()) {
		map.once('style.load', () => showPreferredArea(preferredAreaGeoJSON));
		return;
	}

	// Add the source
	map.addSource(PREFERRED_AREA_SOURCE_ID, {
		type: 'geojson',
		data: {
			type: 'Feature',
			geometry: preferredAreaGeoJSON,
			properties: {}
		}
	});

	// Add fill layer
	map.addLayer({
		id: PREFERRED_AREA_FILL_ID,
		type: 'fill',
		source: PREFERRED_AREA_SOURCE_ID,
		paint: {
			'fill-color': '#bf0a30',
			'fill-opacity': 0.15
		}
	});

	// Add outline layer
	map.addLayer({
		id: PREFERRED_AREA_OUTLINE_ID,
		type: 'line',
		source: PREFERRED_AREA_SOURCE_ID,
		paint: {
			'line-color': '#bf0a30',
			'line-width': 3,
			'line-dasharray': [2, 2]
		}
	});

	// Fit map to show the polygon
	try {
		const coordinates = preferredAreaGeoJSON.coordinates[0];
		const bounds = coordinates.reduce((bounds, coord) => {
			return bounds.extend(coord);
		}, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

		map.fitBounds(bounds, {
			padding: 50,
			maxZoom: 13
		});
	} catch (e) {
		console.warn('Could not fit bounds to preferred area:', e);
	}
}

/**
 * Clear the preferred area polygon from the map
 */
export function clearPreferredArea() {
	if (!map) return;

	// Remove layers if they exist
	if (map.getLayer(PREFERRED_AREA_FILL_ID)) {
		map.removeLayer(PREFERRED_AREA_FILL_ID);
	}
	if (map.getLayer(PREFERRED_AREA_OUTLINE_ID)) {
		map.removeLayer(PREFERRED_AREA_OUTLINE_ID);
	}
	// Remove source if it exists
	if (map.getSource(PREFERRED_AREA_SOURCE_ID)) {
		map.removeSource(PREFERRED_AREA_SOURCE_ID);
	}
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

// =====================================================
// PREFERRED AREA DRAWING (for editing on Listings page)
// =====================================================
let mapDraw = null;
let isDrawingMode = false;
let currentDrawnPolygon = null;

/**
 * Initialize Mapbox GL Draw for editing preferred areas
 */
export function initMapDraw() {
	if (!map || mapDraw) return;

	console.log('🗺️ Initializing Mapbox GL Draw on Listings map...');

	mapDraw = new MapboxDraw({
		displayControlsDefault: false,
		controls: {
			polygon: false,
			trash: false
		},
		defaultMode: 'simple_select',
		styles: [
			// Polygon fill
			{
				'id': 'gl-draw-polygon-fill',
				'type': 'fill',
				'filter': ['all', ['==', '$type', 'Polygon']],
				'paint': {
					'fill-color': '#bf0a30',
					'fill-opacity': 0.25
				}
			},
			// Polygon outline
			{
				'id': 'gl-draw-polygon-stroke',
				'type': 'line',
				'filter': ['all', ['==', '$type', 'Polygon']],
				'paint': {
					'line-color': '#bf0a30',
					'line-width': 3
				}
			},
			// Vertex points
			{
				'id': 'gl-draw-polygon-and-line-vertex-active',
				'type': 'circle',
				'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
				'paint': {
					'circle-radius': 6,
					'circle-color': '#bf0a30',
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 2
				}
			},
			// Midpoint vertices
			{
				'id': 'gl-draw-polygon-midpoint',
				'type': 'circle',
				'filter': ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
				'paint': {
					'circle-radius': 4,
					'circle-color': '#bf0a30',
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 1
				}
			}
		]
	});

	map.addControl(mapDraw);

	// Handle polygon creation/update
	map.on('draw.create', handleDrawUpdate);
	map.on('draw.update', handleDrawUpdate);
	map.on('draw.delete', () => {
		currentDrawnPolygon = null;
		updateDrawingUI(false);
	});

	console.log('✅ Mapbox GL Draw initialized');
}

/**
 * Handle draw create/update events
 */
function handleDrawUpdate(e) {
	const data = mapDraw.getAll();
	if (data.features.length > 0) {
		// Keep only the last drawn polygon
		if (data.features.length > 1) {
			const lastFeature = data.features[data.features.length - 1];
			const toDelete = data.features.slice(0, -1).map(f => f.id);
			toDelete.forEach(id => mapDraw.delete(id));
			currentDrawnPolygon = lastFeature.geometry;
		} else {
			currentDrawnPolygon = data.features[0].geometry;
		}
		updateDrawingUI(true);
		console.log('📍 Polygon drawn/updated:', currentDrawnPolygon);
	}
}

/**
 * Update the drawing UI based on state
 */
function updateDrawingUI(hasPolygon) {
	const drawBtn = document.getElementById('drawPreferredAreaBtn');
	const saveBtn = document.getElementById('savePreferredAreaBtn');

	if (drawBtn) {
		drawBtn.classList.toggle('active', isDrawingMode);
	}

	if (saveBtn) {
		saveBtn.style.display = hasPolygon ? 'flex' : 'none';
	}
}

/**
 * Start drawing mode
 */
export function startDrawing() {
	if (!mapDraw) {
		initMapDraw();
	}

	// Clear existing display polygon (not draw polygon)
	clearPreferredArea();

	isDrawingMode = true;
	mapDraw.changeMode('draw_polygon');
	updateDrawingUI(false);

	console.log('✏️ Drawing mode started');

	if (window.showToast) {
		window.showToast('Click on the map to draw the preferred area. Double-click to finish.', 'info', 5000);
	}
}

/**
 * Edit an existing polygon
 * @param {Object} existingPolygon - Existing GeoJSON geometry to edit
 */
export function startEditing(existingPolygon) {
	if (!mapDraw) {
		initMapDraw();
	}

	// Clear existing display polygon
	clearPreferredArea();

	// Clear any existing drawings
	mapDraw.deleteAll();

	// Add the existing polygon to draw
	if (existingPolygon) {
		const featureId = mapDraw.add({
			type: 'Feature',
			geometry: existingPolygon,
			properties: {}
		});
		currentDrawnPolygon = existingPolygon;

		// Select the polygon for editing
		mapDraw.changeMode('direct_select', { featureId: featureId[0] });
		updateDrawingUI(true);

		console.log('📝 Editing existing polygon');

		if (window.showToast) {
			window.showToast('Drag vertices to edit the area. Click Save when done.', 'info', 4000);
		}
	} else {
		startDrawing();
	}
}

/**
 * Clear the drawing
 */
export function clearDrawing() {
	if (mapDraw) {
		mapDraw.deleteAll();
	}
	currentDrawnPolygon = null;
	isDrawingMode = false;
	updateDrawingUI(false);
	clearPreferredArea();
	console.log('🗑️ Drawing cleared');
}

/**
 * Cancel drawing mode and restore existing polygon if any
 * @param {Object} existingPolygon - Original polygon to restore
 */
export function cancelDrawing(existingPolygon) {
	if (mapDraw) {
		mapDraw.deleteAll();
		mapDraw.changeMode('simple_select');
	}
	currentDrawnPolygon = null;
	isDrawingMode = false;
	updateDrawingUI(false);

	// Restore the original polygon display if exists
	if (existingPolygon) {
		showPreferredArea(existingPolygon);
	}
}

/**
 * Get the currently drawn polygon
 * @returns {Object|null} GeoJSON geometry of the drawn polygon
 */
export function getDrawnPolygon() {
	return currentDrawnPolygon;
}

/**
 * Check if drawing mode is active
 * @returns {boolean}
 */
export function isInDrawingMode() {
	return isDrawingMode;
}

/**
 * Finish drawing and return the polygon
 * @returns {Object|null} GeoJSON geometry of the drawn polygon
 */
export function finishDrawing() {
	if (mapDraw) {
		mapDraw.changeMode('simple_select');
	}
	isDrawingMode = false;
	updateDrawingUI(!!currentDrawnPolygon);
	return currentDrawnPolygon;
}

