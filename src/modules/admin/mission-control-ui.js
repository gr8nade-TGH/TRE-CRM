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

