/**
 * Edge Case Handlers
 * Provides graceful fallbacks for missing data and error scenarios
 */

/**
 * Get safe value with fallback
 * @param {*} value - Value to check
 * @param {*} fallback - Fallback value
 * @returns {*} Value or fallback
 */
export function getSafeValue(value, fallback = 'N/A') {
	if (value === null || value === undefined || value === '') {
		return fallback;
	}
	return value;
}

/**
 * Get safe array with fallback
 * @param {Array} arr - Array to check
 * @param {Array} fallback - Fallback array
 * @returns {Array} Array or fallback
 */
export function getSafeArray(arr, fallback = []) {
	if (!Array.isArray(arr) || arr.length === 0) {
		return fallback;
	}
	return arr;
}

/**
 * Get safe object with fallback
 * @param {Object} obj - Object to check
 * @param {Object} fallback - Fallback object
 * @returns {Object} Object or fallback
 */
export function getSafeObject(obj, fallback = {}) {
	if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
		return fallback;
	}
	return obj;
}

/**
 * Render empty state message
 * @param {string} message - Message to display
 * @param {string} icon - Icon to display (emoji)
 * @returns {string} HTML for empty state
 */
export function renderEmptyState(message, icon = '📭') {
	return `
		<div class="empty-state" style="
			text-align: center;
			padding: 60px 20px;
			color: #6b7280;
		">
			<div style="font-size: 64px; margin-bottom: 16px;">${icon}</div>
			<p style="font-size: 18px; font-weight: 500; margin: 0;">${message}</p>
		</div>
	`;
}

/**
 * Render loading skeleton
 * @param {number} rows - Number of skeleton rows
 * @returns {string} HTML for loading skeleton
 */
export function renderLoadingSkeleton(rows = 3) {
	const skeletonRow = `
		<div class="skeleton-row" style="
			background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
			background-size: 200% 100%;
			animation: skeleton-loading 1.5s infinite;
			height: 60px;
			margin-bottom: 12px;
			border-radius: 8px;
		"></div>
	`;

	return `
		<div class="skeleton-container">
			<style>
				@keyframes skeleton-loading {
					0% { background-position: 200% 0; }
					100% { background-position: -200% 0; }
				}
			</style>
			${skeletonRow.repeat(rows)}
		</div>
	`;
}

/**
 * Handle missing customer preferences
 * @param {Object} preferences - Customer preferences object
 * @returns {Object} Preferences with defaults
 */
export function handleMissingPreferences(preferences) {
	if (!preferences || typeof preferences !== 'object') {
		return {
			bedrooms: null,
			bathrooms: null,
			budget: null,
			moveInDate: null,
			creditHistory: null,
			pets: null,
			notes: ''
		};
	}

	return {
		bedrooms: preferences.bedrooms || preferences.beds || null,
		bathrooms: preferences.bathrooms || preferences.baths || null,
		budget: preferences.budget || preferences.priceRange || preferences.price_range || null,
		moveInDate: preferences.moveInDate || preferences.move_in_date || null,
		creditHistory: preferences.creditHistory || preferences.credit_history || null,
		pets: preferences.pets || null,
		notes: preferences.notes || ''
	};
}

/**
 * Handle missing property data
 * @param {Object} property - Property object
 * @returns {Object} Property with defaults
 */
export function handleMissingPropertyData(property) {
	if (!property || typeof property !== 'object') {
		return {
			id: null,
			community_name: 'Unknown Property',
			city: 'Unknown',
			amenities: [],
			is_pumi: false,
			commission_pct: 0,
			lat: null,
			lng: null
		};
	}

	return {
		id: property.id || null,
		community_name: property.community_name || 'Unknown Property',
		city: property.city || 'Unknown',
		amenities: Array.isArray(property.amenities) ? property.amenities : [],
		is_pumi: property.is_pumi || false,
		commission_pct: property.commission_pct || 0,
		lat: property.lat || null,
		lng: property.lng || null
	};
}

/**
 * Handle missing unit data
 * @param {Object} unit - Unit object
 * @returns {Object} Unit with defaults
 */
export function handleMissingUnitData(unit) {
	if (!unit || typeof unit !== 'object') {
		return {
			id: null,
			unit_number: 'N/A',
			floor: null,
			rent: null,
			available_from: null,
			is_available: false,
			status: 'unknown'
		};
	}

	return {
		id: unit.id || null,
		unit_number: unit.unit_number || 'N/A',
		floor: unit.floor || null,
		rent: unit.rent || null,
		available_from: unit.available_from || null,
		is_available: unit.is_available !== undefined ? unit.is_available : false,
		status: unit.status || 'unknown'
	};
}

/**
 * Handle Smart Match calculation errors
 * @param {Error} error - Error object
 * @param {string} leadId - Lead ID
 * @returns {Object} Fallback match data
 */
export function handleSmartMatchError(error, leadId) {
	console.error(`❌ Smart Match error for lead ${leadId}:`, error);

	return {
		score: 0,
		matches: [],
		error: true,
		errorMessage: 'Unable to calculate match scores. Please check customer preferences.'
	};
}

/**
 * Validate and sanitize email address
 * @param {string} email - Email to validate
 * @returns {Object} { isValid: boolean, sanitized: string }
 */
export function validateEmail(email) {
	if (!email || typeof email !== 'string') {
		return { isValid: false, sanitized: '' };
	}

	const sanitized = email.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	return {
		isValid: emailRegex.test(sanitized),
		sanitized
	};
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone to validate
 * @returns {Object} { isValid: boolean, sanitized: string, formatted: string }
 */
export function validatePhone(phone) {
	if (!phone || typeof phone !== 'string') {
		return { isValid: false, sanitized: '', formatted: '' };
	}

	// Remove all non-digit characters
	const sanitized = phone.replace(/\D/g, '');

	// Check if it's a valid US phone number (10 digits)
	const isValid = sanitized.length === 10 || sanitized.length === 11;

	// Format as (XXX) XXX-XXXX
	let formatted = sanitized;
	if (sanitized.length === 10) {
		formatted = `(${sanitized.slice(0, 3)}) ${sanitized.slice(3, 6)}-${sanitized.slice(6)}`;
	} else if (sanitized.length === 11 && sanitized[0] === '1') {
		formatted = `+1 (${sanitized.slice(1, 4)}) ${sanitized.slice(4, 7)}-${sanitized.slice(7)}`;
	}

	return {
		isValid,
		sanitized,
		formatted
	};
}

/**
 * Handle API errors gracefully
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {Object} Error details
 */
export function handleAPIError(error, context = 'API call') {
	console.error(`❌ ${context} failed:`, error);

	let userMessage = 'An unexpected error occurred. Please try again.';
	let shouldRetry = true;

	// Check for specific error types
	if (error.message?.includes('network') || error.message?.includes('fetch')) {
		userMessage = 'Network error. Please check your connection and try again.';
		shouldRetry = true;
	} else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
		userMessage = 'Session expired. Please log in again.';
		shouldRetry = false;
	} else if (error.message?.includes('403') || error.message?.includes('forbidden')) {
		userMessage = 'You do not have permission to perform this action.';
		shouldRetry = false;
	} else if (error.message?.includes('404') || error.message?.includes('not found')) {
		userMessage = 'The requested resource was not found.';
		shouldRetry = false;
	} else if (error.message?.includes('500') || error.message?.includes('server')) {
		userMessage = 'Server error. Please try again later.';
		shouldRetry = true;
	}

	return {
		error,
		userMessage,
		shouldRetry,
		context
	};
}

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result of function
 */
export async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
	let lastError;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			console.warn(`⚠️ Retry ${i + 1}/${maxRetries} failed:`, error.message);

			if (i < maxRetries - 1) {
				// Wait with exponential backoff
				await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
			}
		}
	}

	throw lastError;
}

/**
 * Check if data is stale and needs refresh
 * @param {Date|string} lastUpdated - Last update timestamp
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {boolean} True if data is stale
 */
export function isDataStale(lastUpdated, maxAge = 5 * 60 * 1000) {
	if (!lastUpdated) return true;

	const lastUpdateTime = new Date(lastUpdated).getTime();
	const now = Date.now();

	return (now - lastUpdateTime) > maxAge;
}

