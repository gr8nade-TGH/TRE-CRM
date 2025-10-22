/**
 * Mapbox Address Autocomplete Utility
 * Provides address autocomplete functionality using Mapbox Geocoding API
 */

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ3I4bmFkZSIsImEiOiJjbWdrNmJqcjgwcjlwMmpvbWg3eHBwamF5In0.639Vz3e1U5PCl5CwafE1hg';

/**
 * Initialize address autocomplete on an input field
 * @param {HTMLInputElement} inputElement - The input element to attach autocomplete to
 * @param {Object} options - Configuration options
 * @param {Function} options.onSelect - Callback when an address is selected
 * @param {string[]} options.types - Address types to search for (default: ['address'])
 * @param {string} options.country - Country code to limit results (default: 'us')
 * @param {string} options.proximity - Proximity bias as 'lng,lat' (optional)
 */
export function initAddressAutocomplete(inputElement, options = {}) {
	console.log('🗺️ Initializing address autocomplete on:', inputElement);

	const {
		onSelect,
		types = ['address'],
		country = 'us',
		proximity = null
	} = options;

	let debounceTimer;
	let suggestionsContainer;
	let currentSuggestions = [];

	// Create suggestions dropdown
	function createSuggestionsContainer() {
		if (suggestionsContainer) return suggestionsContainer;

		suggestionsContainer = document.createElement('div');
		suggestionsContainer.className = 'mapbox-autocomplete-suggestions';
		suggestionsContainer.style.cssText = `
			position: absolute;
			z-index: 10000;
			background: white;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
			max-height: 300px;
			overflow-y: auto;
			display: none;
			width: ${inputElement.offsetWidth}px;
		`;

		// Position below input
		const rect = inputElement.getBoundingClientRect();
		suggestionsContainer.style.top = `${rect.bottom + window.scrollY + 4}px`;
		suggestionsContainer.style.left = `${rect.left + window.scrollX}px`;

		document.body.appendChild(suggestionsContainer);
		return suggestionsContainer;
	}

	// Fetch address suggestions from Mapbox
	async function fetchSuggestions(query) {
		if (!query || query.length < 3) {
			hideSuggestions();
			return;
		}

		console.log('🔍 Fetching suggestions for:', query);

		try {
			const params = new URLSearchParams({
				access_token: MAPBOX_TOKEN,
				types: types.join(','),
				country: country,
				limit: 5,
				autocomplete: true
			});

			if (proximity) {
				params.append('proximity', proximity);
			}

			const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
			console.log('📡 Mapbox API URL:', url);
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error('Geocoding request failed');
			}

			const data = await response.json();
			currentSuggestions = data.features || [];
			console.log('✅ Got suggestions:', currentSuggestions.length, currentSuggestions);
			displaySuggestions(currentSuggestions);
		} catch (error) {
			console.error('Error fetching address suggestions:', error);
			hideSuggestions();
		}
	}

	// Display suggestions in dropdown
	function displaySuggestions(suggestions) {
		const container = createSuggestionsContainer();

		if (!suggestions || suggestions.length === 0) {
			console.log('⚠️ No suggestions to display');
			hideSuggestions();
			return;
		}

		console.log('📋 Displaying', suggestions.length, 'suggestions');
		container.innerHTML = '';
		container.style.display = 'block';

		suggestions.forEach((suggestion, index) => {
			const item = document.createElement('div');
			item.className = 'mapbox-autocomplete-item';
			item.style.cssText = `
				padding: 12px 16px;
				cursor: pointer;
				border-bottom: 1px solid #f3f4f6;
				transition: background-color 0.15s;
			`;

			// Format the suggestion text
			const placeName = suggestion.place_name;
			item.textContent = placeName;

			// Hover effect
			item.addEventListener('mouseenter', () => {
				item.style.backgroundColor = '#f9fafb';
			});
			item.addEventListener('mouseleave', () => {
				item.style.backgroundColor = 'white';
			});

			// Click handler
			item.addEventListener('click', () => {
				selectSuggestion(suggestion);
			});

			container.appendChild(item);
		});
	}

	// Hide suggestions dropdown
	function hideSuggestions() {
		if (suggestionsContainer) {
			suggestionsContainer.style.display = 'none';
		}
	}

	// Handle suggestion selection
	function selectSuggestion(suggestion) {
		// Extract address components
		const context = suggestion.context || [];
		const addressComponents = {
			fullAddress: suggestion.place_name,
			streetAddress: suggestion.text || '',
			city: '',
			state: '',
			zipCode: '',
			lat: suggestion.center[1],
			lng: suggestion.center[0]
		};

		// Parse context for city, state, zip
		context.forEach(item => {
			if (item.id.startsWith('place.')) {
				addressComponents.city = item.text;
			} else if (item.id.startsWith('region.')) {
				addressComponents.state = item.short_code?.replace('US-', '') || item.text;
			} else if (item.id.startsWith('postcode.')) {
				addressComponents.zipCode = item.text;
			}
		});

		// If street address includes number, use the full address text
		if (suggestion.address) {
			addressComponents.streetAddress = `${suggestion.address} ${suggestion.text}`;
		}

		// Update input value
		inputElement.value = addressComponents.streetAddress;

		// Hide suggestions
		hideSuggestions();

		// Call onSelect callback
		if (onSelect && typeof onSelect === 'function') {
			onSelect(addressComponents);
		}
	}

	// Input event handler with debounce
	function handleInput(e) {
		const query = e.target.value;
		console.log('⌨️ Input changed:', query);

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			fetchSuggestions(query);
		}, 300);
	}

	// Click outside to close
	function handleClickOutside(e) {
		if (suggestionsContainer && 
			!suggestionsContainer.contains(e.target) && 
			e.target !== inputElement) {
			hideSuggestions();
		}
	}

	// Keyboard navigation
	function handleKeydown(e) {
		if (!suggestionsContainer || suggestionsContainer.style.display === 'none') {
			return;
		}

		const items = suggestionsContainer.querySelectorAll('.mapbox-autocomplete-item');
		const activeItem = suggestionsContainer.querySelector('.mapbox-autocomplete-item.active');
		let activeIndex = activeItem ? Array.from(items).indexOf(activeItem) : -1;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, items.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (activeIndex >= 0 && currentSuggestions[activeIndex]) {
				selectSuggestion(currentSuggestions[activeIndex]);
			}
			return;
		} else if (e.key === 'Escape') {
			hideSuggestions();
			return;
		}

		// Update active state
		items.forEach((item, index) => {
			if (index === activeIndex) {
				item.classList.add('active');
				item.style.backgroundColor = '#f9fafb';
			} else {
				item.classList.remove('active');
				item.style.backgroundColor = 'white';
			}
		});
	}

	// Attach event listeners
	inputElement.addEventListener('input', handleInput);
	inputElement.addEventListener('keydown', handleKeydown);
	document.addEventListener('click', handleClickOutside);

	// Cleanup function
	return function cleanup() {
		inputElement.removeEventListener('input', handleInput);
		inputElement.removeEventListener('keydown', handleKeydown);
		document.removeEventListener('click', handleClickOutside);
		if (suggestionsContainer && suggestionsContainer.parentNode) {
			suggestionsContainer.parentNode.removeChild(suggestionsContainer);
		}
	};
}

