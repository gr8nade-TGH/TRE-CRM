/**
 * Utility Helper Functions
 * Common utility functions used throughout the application
 */

/**
 * Format date from ISO string to readable format
 * @param {string} iso - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(iso) {
    if (!iso) return 'N/A';
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

/**
 * Format time ago from timestamp
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Time ago string
 */
export function formatTimeAgo(timestamp) {
    if (!timestamp) return 'N/A';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatDate(timestamp);
}

/**
 * Generate a URL slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
export function generateSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/**
 * Generate landing page URL for agent
 * @param {string} agentId - Agent ID
 * @returns {string} Landing page URL
 */
export function generateLandingPageUrl(agentId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/agent.html?agent=${agentId}`;
}

/**
 * Show element
 * @param {HTMLElement} el - Element to show
 */
export function show(el) {
    if (el) el.classList.remove('hidden');
}

/**
 * Hide element
 * @param {HTMLElement} el - Element to hide
 */
export function hide(el) {
    if (el) el.classList.add('hidden');
}

/**
 * Show modal
 * @param {string} modalId - Modal ID
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Focus first input if available
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Hide modal
 * @param {string} modalId - Modal ID
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

/**
 * Show toast message
 * @param {string} message - Message to show
 * @param {string} type - Toast type (success, error, info)
 */
export function toast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    if (toastEl) {
        toastEl.textContent = message;
        toastEl.className = `toast toast-${type}`;
        show(toastEl);
        setTimeout(() => hide(toastEl), 2000);
    }
}

/**
 * Debounce function calls
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
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Generate random date within range
 * @param {number} daysBack - Number of days back from today
 * @returns {string} ISO date string
 */
export function randomDate(daysBack = 30) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
    return new Date(randomTime).toISOString();
}

/**
 * Check if date is within range
 * @param {string} date - Date to check
 * @param {string} from - Start date
 * @param {string} to - End date
 * @returns {boolean} True if within range
 */
export function withinDateRange(date, from, to) {
    const checkDate = new Date(date);
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return checkDate >= fromDate && checkDate <= toDate;
}

/**
 * Sort array by key
 * @param {string} key - Key to sort by
 * @returns {Function} Sort function
 */
export function byKey(key) {
    return (a, b) => {
        if (a[key] > b[key]) return 1;
        if (a[key] < b[key]) return -1;
        return 0;
    };
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid phone
 */
export function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}
