/**
 * Mission Control UI Module
 * Handles interactive control panel elements (sliders, toggles, etc.)
 * 
 * @module admin/mission-control-ui
 */

/**
 * Initialize all mission control UI components
 */
export function initializeMissionControlUI() {
	console.log('🎮 Initializing Mission Control UI...');

	initializeSliders();
	initializeToggles();

	console.log('✅ Mission Control UI initialized');
}

/**
 * Initialize all slider controls
 */
function initializeSliders() {
	const sliders = document.querySelectorAll('.mc-slider');

	sliders.forEach(slider => {
		const wrapper = slider.closest('.mc-slider-wrapper');
		if (!wrapper) return;

		const valueDisplay = wrapper.querySelector('.mc-slider-value');
		const fill = wrapper.querySelector('.mc-slider-fill');
		const thumb = wrapper.querySelector('.mc-slider-thumb');
		const track = wrapper.querySelector('.mc-slider-track');

		if (!valueDisplay || !fill || !thumb || !track) return;

		// Update slider display
		const updateSlider = () => {
			const value = parseFloat(slider.value);
			const min = parseFloat(slider.min) || 0;
			const max = parseFloat(slider.max) || 100;
			const percentage = ((value - min) / (max - min)) * 100;

			// Update value display
			const suffix = slider.dataset.suffix || '';
			const prefix = slider.dataset.prefix || '';
			valueDisplay.textContent = `${prefix}${value}${suffix}`;

			// Update fill bar
			fill.style.width = `${percentage}%`;

			// Update thumb position
			thumb.style.left = `${percentage}%`;

			// Trigger change event for counter update
			slider.dispatchEvent(new Event('change', { bubbles: true }));
		};

		// Initialize
		updateSlider();

		// Update on input
		slider.addEventListener('input', updateSlider);
	});
}

/**
 * Initialize all toggle switches
 */
function initializeToggles() {
	const toggles = document.querySelectorAll('.mc-toggle');

	toggles.forEach(toggle => {
		const input = toggle.dataset.input;
		if (!input) return;

		const inputElement = document.getElementById(input);
		if (!inputElement) return;

		// Set initial state
		const isActive = inputElement.value === 'true';
		if (isActive) {
			toggle.classList.add('active');
		}

		// Handle click
		toggle.addEventListener('click', () => {
			const currentValue = inputElement.value === 'true';
			const newValue = !currentValue;

			inputElement.value = String(newValue);

			if (newValue) {
				toggle.classList.add('active');
			} else {
				toggle.classList.remove('active');
			}

			// Trigger change event for counter update
			inputElement.dispatchEvent(new Event('change', { bubbles: true }));
		});
	});
}

/**
 * Create a slider control element
 * @param {Object} options - Slider options
 * @returns {string} HTML string for slider
 */
export function createSlider(options) {
	const {
		id,
		label,
		help,
		min = 0,
		max = 100,
		step = 1,
		value = 50,
		suffix = '',
		prefix = ''
	} = options;

	return `
		<div class="mc-control-field">
			<label class="mc-control-label">${label}</label>
			<div class="mc-slider-wrapper">
				<div class="mc-slider-display">
					<div class="mc-slider-value">${prefix}${value}${suffix}</div>
					<div class="mc-slider-track">
						<div class="mc-slider-fill" style="width: ${((value - min) / (max - min)) * 100}%"></div>
						<input 
							type="range" 
							id="${id}" 
							class="mc-slider" 
							min="${min}" 
							max="${max}" 
							step="${step}" 
							value="${value}"
							data-suffix="${suffix}"
							data-prefix="${prefix}"
						>
						<div class="mc-slider-thumb" style="left: ${((value - min) / (max - min)) * 100}%"></div>
					</div>
				</div>
				<div class="mc-slider-labels">
					<span class="mc-slider-label">${min}${suffix}</span>
					<span class="mc-slider-label">${max}${suffix}</span>
				</div>
			</div>
			${help ? `<p class="mc-control-help">${help}</p>` : ''}
		</div>
	`;
}

/**
 * Create a toggle switch element
 * @param {Object} options - Toggle options
 * @returns {string} HTML string for toggle
 */
export function createToggle(options) {
	const {
		id,
		label,
		help,
		value = false,
		onLabel = 'Enabled',
		offLabel = 'Disabled'
	} = options;

	return `
		<div class="mc-control-field">
			<label class="mc-control-label">${label}</label>
			<div class="mc-toggle-wrapper">
				<div class="mc-toggle ${value ? 'active' : ''}" data-input="${id}"></div>
				<span class="mc-toggle-label">${value ? onLabel : offLabel}</span>
				<input type="hidden" id="${id}" value="${value}">
			</div>
			${help ? `<p class="mc-control-help">${help}</p>` : ''}
		</div>
	`;
}

/**
 * Create a select dropdown element
 * @param {Object} options - Select options
 * @returns {string} HTML string for select
 */
export function createSelect(options) {
	const {
		id,
		label,
		help,
		value = '',
		choices = []
	} = options;

	const optionsHTML = choices.map(choice => {
		const optionValue = typeof choice === 'string' ? choice : choice.value;
		const optionLabel = typeof choice === 'string' ? choice : choice.label;
		const selected = optionValue === value ? 'selected' : '';
		return `<option value="${optionValue}" ${selected}>${optionLabel}</option>`;
	}).join('');

	return `
		<div class="mc-control-field">
			<label class="mc-control-label" for="${id}">${label}</label>
			<div class="mc-select-wrapper">
				<select id="${id}" class="mc-select">
					${optionsHTML}
				</select>
			</div>
			${help ? `<p class="mc-control-help">${help}</p>` : ''}
		</div>
	`;
}

/**
 * Create a number input element
 * @param {Object} options - Input options
 * @returns {string} HTML string for input
 */
export function createNumberInput(options) {
	const {
		id,
		label,
		help,
		min = 0,
		max = 100,
		step = 1,
		value = 0
	} = options;

	return `
		<div class="mc-control-field">
			<label class="mc-control-label" for="${id}">${label}</label>
			<input 
				type="number" 
				id="${id}" 
				class="mc-input" 
				min="${min}" 
				max="${max}" 
				step="${step}" 
				value="${value}"
			>
			${help ? `<p class="mc-control-help">${help}</p>` : ''}
		</div>
	`;
}

/**
 * Create a control panel section
 * @param {Object} options - Panel options
 * @returns {string} HTML string for panel
 */
export function createControlPanel(options) {
	const {
		title,
		description,
		icon = 'settings',
		controls = []
	} = options;

	const iconSVG = getIconSVG(icon);
	const controlsHTML = controls.join('');

	return `
		<div class="mc-control-panel">
			<div class="mc-panel-header">
				<div class="mc-panel-icon">
					${iconSVG}
				</div>
				<div class="mc-panel-title-group">
					<h2>${title}</h2>
					<p class="mc-panel-description">${description}</p>
				</div>
			</div>
			<div class="mc-control-grid">
				${controlsHTML}
			</div>
		</div>
	`;
}

/**
 * Get SVG icon for panel header
 * @param {string} iconName - Icon name
 * @returns {string} SVG HTML
 */
function getIconSVG(iconName) {
	const icons = {
		settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m0-6h6m-6 0H6m6-6a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"></path></svg>',
		filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
		star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
		display: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>'
	};

	return icons[iconName] || icons.settings;
}

// ============================================
// MATCH COUNTER COMPONENT
// ============================================

/**
 * Create match counter indicator
 * @param {Object} options - Configuration options
 * @returns {string} HTML string
 */
export function createMatchCounter(options = {}) {
	const {
		count = 0,
		loading = false,
		error = false
	} = options;

	// Determine status color and text
	let statusClass = 'mc-counter-none';
	let statusText = 'NO MATCHES';

	if (!error && !loading) {
		if (count >= 10) {
			statusClass = 'mc-counter-good';
			statusText = 'OPTIMAL';
		} else if (count >= 1) {
			statusClass = 'mc-counter-warning';
			statusText = 'LIMITED';
		}
	}

	return `
		<div class="mc-match-counter ${statusClass}" id="matchCounter">
			<div class="mc-counter-header">
				<div class="mc-counter-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
				</div>
				<div class="mc-counter-title">
					<span class="mc-counter-label">FILTER PREVIEW</span>
					<span class="mc-counter-status">${statusText}</span>
				</div>
			</div>
			<div class="mc-counter-display">
				${loading ? `
					<div class="mc-counter-loading">
						<div class="mc-spinner"></div>
						<span>SCANNING...</span>
					</div>
				` : error ? `
					<div class="mc-counter-error">
						<span>ERROR</span>
					</div>
				` : `
					<div class="mc-counter-value">${count}</div>
					<div class="mc-counter-unit">PROPERTIES</div>
				`}
			</div>
			<div class="mc-counter-help">
				Real-time preview • Updates automatically as you adjust filters • Click save to apply changes
			</div>
			<button type="button" class="mc-counter-save-btn" id="topSaveConfigBtn">
				💾 SAVE CONFIGURATION
			</button>
		</div>
	`;
}

/**
 * Initialize match counter functionality
 * Sets up debounced updates when filter controls change
 */
export function initializeMatchCounter() {
	console.log('🔢 Initializing match counter...');

	let debounceTimer = null;
	const DEBOUNCE_DELAY = 500; // 500ms
	let updateCount = 0; // Track number of updates for debugging

	// Function to update counter
	async function updateCounter() {
		updateCount++;
		const currentUpdate = updateCount;

		const counterEl = document.getElementById('matchCounterValue');
		if (!counterEl) {
			console.warn('❌ Match counter element not found');
			return;
		}

		// Show loading state
		counterEl.innerHTML = '<span class="mc-counter-loading-inline">...</span>';
		console.log(`🔄 Counter Update #${currentUpdate}: Loading...`);

		try {
			// Extract current config from form
			const config = extractFormData();
			console.log(`📊 Counter Update #${currentUpdate} - Config:`, {
				bedroomMode: config.bedroom_match_mode,
				bathroomMode: config.bathroom_match_mode,
				rentTolerance: config.rent_tolerance_percent,
				petPolicyMode: config.pet_policy_mode,
				moveInFlexibility: config.move_in_flexibility_days
			});

			// Count matching properties and units
			const { countMatchingProperties } = await import('../../api/smart-match-config-api.js');
			const { propertyCount, unitCount } = await countMatchingProperties(config);
			console.log(`📊 Counter Update #${currentUpdate} - Result:`, { propertyCount, unitCount });

			// Update display with color coding based on unit count
			let colorClass = '';
			let statusText = '';
			if (unitCount >= 10) {
				colorClass = 'mc-counter-good';
				statusText = 'OPTIMAL';
			} else if (unitCount >= 1) {
				colorClass = 'mc-counter-warning';
				statusText = 'LIMITED';
			} else {
				colorClass = 'mc-counter-none';
				statusText = 'NO MATCHES';
			}

			// Display both property and unit counts
			counterEl.innerHTML = `<span class="${colorClass}">${propertyCount} PROPERTIES, ${unitCount} UNITS</span>`;
			console.log(`✅ Counter Update #${currentUpdate} COMPLETE: ${propertyCount} properties, ${unitCount} units (${statusText})`);

		} catch (error) {
			console.error('❌ Error updating match counter:', error);
			counterEl.innerHTML = '<span class="mc-counter-error">ERR</span>';
		}
	}

	// Debounced update function
	function debouncedUpdate(event) {
		if (event) {
			console.log(`🎯 Filter changed: ${event.target.id || event.target.className} = ${event.target.value}`);
		}
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(updateCounter, DEBOUNCE_DELAY);
	}

	// Attach listeners to all filter controls
	const filterControls = [
		'bedroomMatchMode',
		'bathroomMatchMode',
		'rentTolerancePercent',
		'petPolicyMode',
		'moveInFlexibilityDays'
	];

	console.log('🔗 Attaching event listeners to filter controls...');
	filterControls.forEach(controlId => {
		const element = document.getElementById(controlId);
		if (element) {
			element.addEventListener('input', debouncedUpdate);
			element.addEventListener('change', debouncedUpdate);
			console.log(`  ✓ Attached listeners to #${controlId}`);
		} else {
			console.warn(`  ⚠️ Element #${controlId} not found`);
		}
	});

	// Also listen to toggle clicks
	const toggles = document.querySelectorAll('.mc-toggle');
	console.log(`🔗 Attaching event listeners to ${toggles.length} toggles...`);
	toggles.forEach(toggle => {
		toggle.addEventListener('click', debouncedUpdate);
	});

	console.log('✅ Match counter initialized with event listeners');

	// Initial update
	updateCounter();
}

/**
 * Helper function to extract form data
 * @returns {Object} Configuration object
 */
function extractFormData() {
	const bedroomMode = document.getElementById('bedroomMatchMode')?.value || 'exact';
	const bathroomMode = document.getElementById('bathroomMatchMode')?.value || 'exact';

	return {
		// Filtering Settings
		bedroom_match_mode: bedroomMode,
		bedroom_tolerance: bedroomMode === 'flexible' ? 1 : 0, // ±1 bedroom when flexible
		bathroom_match_mode: bathroomMode,
		bathroom_tolerance: bathroomMode === 'flexible' ? 0.5 : 0, // ±0.5 bathroom when flexible
		rent_tolerance_percent: parseInt(document.getElementById('rentTolerancePercent')?.value || 20),
		pet_policy_mode: document.getElementById('petPolicyMode')?.value || 'ignore',
		move_in_flexibility_days: parseInt(document.getElementById('moveInFlexibilityDays')?.value || 30),

		// Scoring Settings (not used for counting, but needed for config structure)
		price_match_perfect_score: parseInt(document.getElementById('priceMatchPerfectScore')?.value || 25),
		move_in_date_bonus: parseInt(document.getElementById('moveInDateBonus')?.value || 10),
		commission_base_bonus: parseInt(document.getElementById('commissionBaseBonus')?.value || 80),
		pumi_bonus: parseInt(document.getElementById('pumiBonus')?.value || 20),
		commission_threshold_pct: parseFloat(document.getElementById('commissionThresholdPct')?.value || 4.0),

		// Display Settings
		max_properties_to_show: parseInt(document.getElementById('maxPropertiesToShow')?.value || 10),
		sort_by: document.getElementById('sortBy')?.value || 'score',
		min_score_threshold: parseInt(document.getElementById('minScoreThreshold')?.value || 0)
	};
}



