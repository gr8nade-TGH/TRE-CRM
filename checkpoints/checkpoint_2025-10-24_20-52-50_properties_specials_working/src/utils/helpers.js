/**
 * Utility Helper Functions
 * Common utility functions used throughout the application
 */

/**
 * Format ISO date string to localized date/time string in Central Time
 * @param {string} iso - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(iso) {
	try {
		return new Date(iso).toLocaleString('en-US', {
			timeZone: 'America/Chicago',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	} catch {
		return iso;
	}
}

/**
 * Show a modal by removing the 'hidden' class
 * @param {string} modalId - ID of the modal element
 */
export function showModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) modal.classList.remove('hidden');
}

/**
 * Hide a modal by adding the 'hidden' class
 * @param {string} modalId - ID of the modal element
 */
export function hideModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) modal.classList.add('hidden');
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function toast(message, type = 'info', duration = 3000) {
	// Remove any existing toasts
	const existingToast = document.querySelector('.toast');
	if (existingToast) {
		existingToast.remove();
	}

	// Create toast element
	const toastEl = document.createElement('div');
	toastEl.className = `toast toast-${type}`;
	toastEl.textContent = message;

	// Add to body
	document.body.appendChild(toastEl);

	// Trigger animation
	setTimeout(() => {
		toastEl.classList.add('show');
	}, 10);

	// Remove after duration
	setTimeout(() => {
		toastEl.classList.remove('show');
		setTimeout(() => {
			toastEl.remove();
		}, 300);
	}, duration);
}

/**
 * Show an element by removing the 'hidden' class
 * @param {HTMLElement} element - Element to show
 */
export function show(element) {
	if (element) {
		element.classList.remove('hidden');
		element.style.display = '';
	}
}

/**
 * Hide an element by adding the 'hidden' class
 * @param {HTMLElement} element - Element to hide
 */
export function hide(element) {
	if (element) {
		element.classList.add('hidden');
	}
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

/**
 * Throttle function to limit how often a function can be called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
	let inThrottle;
	return function(...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => inThrottle = false, limit);
		}
	};
}

/**
 * Generate a unique ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency
	}).format(amount);
}

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
	const cleaned = ('' + phone).replace(/\D/g, '');
	const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
	if (match) {
		return '(' + match[1] + ') ' + match[2] + '-' + match[3];
	}
	return phone;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, length, suffix = '...') {
	if (!str || str.length <= length) return str;
	return str.substring(0, length) + suffix;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value or null
 */
export function getQueryParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

/**
 * Set query parameter in URL
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
export function setQueryParam(param, value) {
	const url = new URL(window.location);
	url.searchParams.set(param, value);
	window.history.pushState({}, '', url);
}

/**
 * Update sort headers in a table
 * EXACT COPY from script.js (lines 6953-6981)
 * @param {string} tableId - ID of the table element
 */
export function updateSortHeaders(tableId) {
	console.log('updateSortHeaders called with tableId:', tableId);
	const table = document.getElementById(tableId);
	if (!table) {
		console.log('Table not found:', tableId);
		return;
	}

	const currentState = window.state || { sort: { key: null, dir: null } };
	console.log('updateSortHeaders - currentState.sort:', currentState.sort);
	const headers = table.querySelectorAll('th[data-sort]');
	console.log('Found sortable headers:', headers.length);
	headers.forEach(header => {
		const column = header.dataset.sort;
		const icon = header.querySelector('.sort-icon');

		if (column === currentState.sort.key && currentState.sort.dir !== 'none') {
			header.classList.add('sorted');
			if (icon) {
				icon.textContent = currentState.sort.dir === 'asc' ? '↑' : '↓';
			}
		} else {
			header.classList.remove('sorted');
			if (icon) {
				icon.textContent = '↕';
			}
		}
	});
}
