/**
 * Accessibility Utilities
 * Provides keyboard shortcuts, ARIA labels, and screen reader support
 */

/**
 * Initialize keyboard shortcuts for the application
 * @param {Object} handlers - Object containing handler functions
 */
export function initKeyboardShortcuts(handlers = {}) {
	const {
		onEscape,
		onCtrlS,
		onCtrlEnter,
		onArrowUp,
		onArrowDown
	} = handlers;

	document.addEventListener('keydown', (e) => {
		// Escape key - Close modals
		if (e.key === 'Escape' && onEscape) {
			onEscape(e);
		}

		// Ctrl+S or Cmd+S - Save (prevent default browser save)
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			if (onCtrlS) {
				onCtrlS(e);
			}
		}

		// Ctrl+Enter or Cmd+Enter - Submit forms
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			if (onCtrlEnter) {
				onCtrlEnter(e);
			}
		}

		// Arrow keys for navigation (when not in input)
		if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
			if (e.key === 'ArrowUp' && onArrowUp) {
				e.preventDefault();
				onArrowUp(e);
			}
			if (e.key === 'ArrowDown' && onArrowDown) {
				e.preventDefault();
				onArrowDown(e);
			}
		}
	});

	console.log('⌨️ Keyboard shortcuts initialized');
}

/**
 * Add ARIA labels to modal elements
 * @param {string} modalId - Modal element ID
 * @param {Object} options - ARIA label options
 */
export function addModalARIA(modalId, options = {}) {
	const {
		label = 'Dialog',
		describedBy = null,
		role = 'dialog'
	} = options;

	const modal = document.getElementById(modalId);
	if (!modal) {
		console.warn(`⚠️ Modal ${modalId} not found for ARIA labels`);
		return;
	}

	modal.setAttribute('role', role);
	modal.setAttribute('aria-modal', 'true');
	modal.setAttribute('aria-label', label);

	if (describedBy) {
		modal.setAttribute('aria-describedby', describedBy);
	}

	// Add aria-hidden to background when modal is open
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.attributeName === 'style') {
				const isVisible = modal.style.display !== 'none';
				document.body.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
			}
		});
	});

	observer.observe(modal, { attributes: true });
}

/**
 * Add ARIA labels to form inputs
 * @param {string} formId - Form element ID
 */
export function addFormARIA(formId) {
	const form = document.getElementById(formId);
	if (!form) {
		console.warn(`⚠️ Form ${formId} not found for ARIA labels`);
		return;
	}

	// Find all inputs without labels
	const inputs = form.querySelectorAll('input, select, textarea');
	inputs.forEach((input) => {
		// Skip if already has aria-label or associated label
		if (input.getAttribute('aria-label') || input.id && form.querySelector(`label[for="${input.id}"]`)) {
			return;
		}

		// Try to find nearby text as label
		const placeholder = input.getAttribute('placeholder');
		const name = input.getAttribute('name');

		if (placeholder) {
			input.setAttribute('aria-label', placeholder);
		} else if (name) {
			// Convert camelCase or snake_case to readable text
			const label = name
				.replace(/([A-Z])/g, ' $1')
				.replace(/_/g, ' ')
				.trim()
				.replace(/^\w/, c => c.toUpperCase());
			input.setAttribute('aria-label', label);
		}
	});

	// Mark required fields
	const requiredInputs = form.querySelectorAll('[required]');
	requiredInputs.forEach((input) => {
		input.setAttribute('aria-required', 'true');
	});

	// Mark invalid fields
	const invalidInputs = form.querySelectorAll(':invalid');
	invalidInputs.forEach((input) => {
		input.setAttribute('aria-invalid', 'true');
	});
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
	let announcer = document.getElementById('sr-announcer');

	if (!announcer) {
		announcer = document.createElement('div');
		announcer.id = 'sr-announcer';
		announcer.setAttribute('role', 'status');
		announcer.setAttribute('aria-live', priority);
		announcer.setAttribute('aria-atomic', 'true');
		announcer.style.cssText = `
			position: absolute;
			left: -10000px;
			width: 1px;
			height: 1px;
			overflow: hidden;
		`;
		document.body.appendChild(announcer);
	}

	// Update aria-live if priority changed
	announcer.setAttribute('aria-live', priority);

	// Clear and set message (forces screen reader to announce)
	announcer.textContent = '';
	setTimeout(() => {
		announcer.textContent = message;
	}, 100);
}

/**
 * Trap focus within a modal
 * @param {HTMLElement} modal - Modal element
 */
export function trapFocus(modal) {
	if (!modal) return;

	const focusableElements = modal.querySelectorAll(
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
	);

	if (focusableElements.length === 0) return;

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	// Focus first element when modal opens
	setTimeout(() => {
		firstElement.focus();
	}, 100);

	// Trap focus
	modal.addEventListener('keydown', (e) => {
		if (e.key !== 'Tab') return;

		if (e.shiftKey) {
			// Shift+Tab
			if (document.activeElement === firstElement) {
				e.preventDefault();
				lastElement.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastElement) {
				e.preventDefault();
				firstElement.focus();
			}
		}
	});
}

/**
 * Add loading state with ARIA attributes
 * @param {HTMLElement} element - Element to add loading state to
 * @param {boolean} isLoading - Whether element is loading
 */
export function setLoadingState(element, isLoading) {
	if (!element) return;

	if (isLoading) {
		element.setAttribute('aria-busy', 'true');
		element.setAttribute('aria-live', 'polite');
		announceToScreenReader('Loading...', 'polite');
	} else {
		element.removeAttribute('aria-busy');
		element.removeAttribute('aria-live');
	}
}

/**
 * Add skip navigation link
 */
export function addSkipNavigation() {
	const skipLink = document.createElement('a');
	skipLink.href = '#main-content';
	skipLink.textContent = 'Skip to main content';
	skipLink.className = 'skip-nav';
	skipLink.style.cssText = `
		position: absolute;
		top: -40px;
		left: 0;
		background: #000;
		color: #fff;
		padding: 8px;
		text-decoration: none;
		z-index: 100000;
	`;

	skipLink.addEventListener('focus', () => {
		skipLink.style.top = '0';
	});

	skipLink.addEventListener('blur', () => {
		skipLink.style.top = '-40px';
	});

	document.body.insertBefore(skipLink, document.body.firstChild);

	// Ensure main content has ID
	const mainContent = document.querySelector('main, [role="main"], .content');
	if (mainContent && !mainContent.id) {
		mainContent.id = 'main-content';
	}
}

/**
 * Initialize all accessibility features
 * @param {Object} options - Configuration options
 */
export function initAccessibility(options = {}) {
	const {
		keyboardShortcuts = true,
		skipNavigation = true,
		modalARIA = true,
		formARIA = true
	} = options;

	console.log('♿ Initializing accessibility features...');

	if (skipNavigation) {
		addSkipNavigation();
	}

	if (keyboardShortcuts) {
		initKeyboardShortcuts({
			onEscape: () => {
				// Close topmost modal
				const modals = document.querySelectorAll('.modal[style*="display: block"], .modal[style*="display:block"]');
				if (modals.length > 0) {
					const topModal = modals[modals.length - 1];
					const closeBtn = topModal.querySelector('.close, [data-dismiss="modal"]');
					if (closeBtn) {
						closeBtn.click();
					}
				}
			},
			onCtrlS: () => {
				// Find visible save button
				const saveBtn = document.querySelector('button[id*="save"]:not([disabled]), button[id*="Save"]:not([disabled])');
				if (saveBtn && saveBtn.offsetParent !== null) {
					saveBtn.click();
					announceToScreenReader('Saving...', 'assertive');
				}
			}
		});
	}

	if (modalARIA) {
		// Add ARIA to common modals
		const modalIds = [
			'leadDetailsModal',
			'listingEditModal',
			'addListingModal',
			'propertyNotesModal',
			'activityLogModal',
			'bugReportModal'
		];

		modalIds.forEach((modalId) => {
			const modal = document.getElementById(modalId);
			if (modal) {
				addModalARIA(modalId, {
					label: modalId.replace('Modal', '').replace(/([A-Z])/g, ' $1').trim()
				});
			}
		});
	}

	console.log('✅ Accessibility features initialized');
}

