/**
 * Validation Utility Functions
 * Functions for validating user input and data
 */

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate phone number (US format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export function isValidPhone(phone) {
	const cleaned = ('' + phone).replace(/\D/g, '');
	return cleaned.length === 10;
}

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @returns {boolean} True if not empty
 */
export function isRequired(value) {
	if (value === null || value === undefined) return false;
	if (typeof value === 'string') return value.trim() !== '';
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} True if meets minimum length
 */
export function minLength(value, minLength) {
	if (!value) return false;
	return value.length >= minLength;
}

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if within maximum length
 */
export function maxLength(value, maxLength) {
	if (!value) return true;
	return value.length <= maxLength;
}

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export function inRange(value, min, max) {
	const num = Number(value);
	if (isNaN(num)) return false;
	return num >= min && num <= max;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate date
 * @param {string} date - Date string to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(date) {
	const d = new Date(date);
	return d instanceof Date && !isNaN(d);
}

/**
 * Validate future date
 * @param {string} date - Date string to validate
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
	if (!isValidDate(date)) return false;
	return new Date(date) > new Date();
}

/**
 * Validate past date
 * @param {string} date - Date string to validate
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(date) {
	if (!isValidDate(date)) return false;
	return new Date(date) < new Date();
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Object with isValid and strength properties
 */
export function validatePassword(password) {
	const result = {
		isValid: false,
		strength: 'weak',
		errors: []
	};

	if (!password) {
		result.errors.push('Password is required');
		return result;
	}

	if (password.length < 8) {
		result.errors.push('Password must be at least 8 characters');
	}

	if (!/[a-z]/.test(password)) {
		result.errors.push('Password must contain at least one lowercase letter');
	}

	if (!/[A-Z]/.test(password)) {
		result.errors.push('Password must contain at least one uppercase letter');
	}

	if (!/[0-9]/.test(password)) {
		result.errors.push('Password must contain at least one number');
	}

	if (!/[!@#$%^&*]/.test(password)) {
		result.errors.push('Password must contain at least one special character (!@#$%^&*)');
	}

	// Calculate strength
	let strength = 0;
	if (password.length >= 8) strength++;
	if (password.length >= 12) strength++;
	if (/[a-z]/.test(password)) strength++;
	if (/[A-Z]/.test(password)) strength++;
	if (/[0-9]/.test(password)) strength++;
	if (/[!@#$%^&*]/.test(password)) strength++;

	if (strength <= 2) result.strength = 'weak';
	else if (strength <= 4) result.strength = 'medium';
	else result.strength = 'strong';

	result.isValid = result.errors.length === 0;
	return result;
}

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Object with isValid and errors properties
 */
export function validateForm(data, rules) {
	const errors = {};
	let isValid = true;

	for (const field in rules) {
		const value = data[field];
		const fieldRules = rules[field];

		for (const rule of fieldRules) {
			const { type, message, ...params } = rule;

			let valid = true;

			switch (type) {
				case 'required':
					valid = isRequired(value);
					break;
				case 'email':
					valid = isValidEmail(value);
					break;
				case 'phone':
					valid = isValidPhone(value);
					break;
				case 'minLength':
					valid = minLength(value, params.min);
					break;
				case 'maxLength':
					valid = maxLength(value, params.max);
					break;
				case 'range':
					valid = inRange(value, params.min, params.max);
					break;
				case 'url':
					valid = isValidUrl(value);
					break;
				case 'date':
					valid = isValidDate(value);
					break;
				case 'futureDate':
					valid = isFutureDate(value);
					break;
				case 'pastDate':
					valid = isPastDate(value);
					break;
				case 'custom':
					valid = params.validator(value, data);
					break;
			}

			if (!valid) {
				if (!errors[field]) errors[field] = [];
				errors[field].push(message);
				isValid = false;
			}
		}
	}

	return { isValid, errors };
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
	const div = document.createElement('div');
	div.textContent = html;
	return div.innerHTML;
}

/**
 * Validate credit card number (Luhn algorithm)
 * @param {string} cardNumber - Credit card number
 * @returns {boolean} True if valid card number
 */
export function isValidCreditCard(cardNumber) {
	const cleaned = cardNumber.replace(/\D/g, '');
	if (cleaned.length < 13 || cleaned.length > 19) return false;

	let sum = 0;
	let isEven = false;

	for (let i = cleaned.length - 1; i >= 0; i--) {
		let digit = parseInt(cleaned[i]);

		if (isEven) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}

		sum += digit;
		isEven = !isEven;
	}

	return sum % 10 === 0;
}

/**
 * Validate ZIP code (US format)
 * @param {string} zip - ZIP code to validate
 * @returns {boolean} True if valid ZIP code
 */
export function isValidZip(zip) {
	const zipRegex = /^\d{5}(-\d{4})?$/;
	return zipRegex.test(zip);
}

