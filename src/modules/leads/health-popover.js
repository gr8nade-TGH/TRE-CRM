// Health Popover - Health status popover functionality
// Extracted from script.js lines 415-490

// Popover elements (initialized on first use)
let pop, popTitle, popList;

// Status labels
const STATUS_LABEL = {
	green: 'Healthy',
	yellow: 'Warm',
	red: 'At Risk',
	closed: 'Closed',
	lost: 'Lost'
};

/**
 * Initialize popover elements
 */
export function initPopover() {
	pop = document.getElementById('healthPopover');
	popTitle = document.getElementById('popTitle');
	popList = document.getElementById('popList');
}

/**
 * Show health status popover
 * @param {HTMLElement} anchor - Element to anchor the popover to
 * @param {string} status - Health status (green, yellow, red, closed, lost)
 */
export function showPopover(anchor, status, options) {
	const { SupabaseAPI, getHealthMessages } = options;
	
	console.log('showPopover called with status:', status); // Debug
	if (!pop || !popTitle || !popList) {
		console.log('Initializing popover elements...'); // Debug
		initPopover();
	}
	if (!pop) {
		console.log('Popover element not found!'); // Debug
		return;
	}

	// Get lead ID from the button
	const leadId = anchor.getAttribute('data-lead-id');

	console.log('Showing popover for status:', status, 'leadId:', leadId); // Debug

	// Show loading state first
	popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
	popList.innerHTML = '<li>Loading...</li>';

	const r = anchor.getBoundingClientRect();
	const top = r.bottom + 10;
	let left = r.left - 12;
	if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
	if (left < 8) left = 8;
	pop.style.top = `${Math.round(top)}px`;
	pop.style.left = `${Math.round(left)}px`;
	pop.style.display = 'block';

	// Load lead data and messages asynchronously
	if (leadId) {
		(async () => {
			try {
				const lead = await SupabaseAPI.getLead(leadId);
				if (lead) {
					const messages = await getHealthMessages(lead);
					popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
					popList.innerHTML = messages.map(s => `<li>${s}</li>`).join('');
				} else {
					// Lead not found - show generic status message
					popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
					popList.innerHTML = `<li>Unable to load lead details</li>`;
				}
			} catch (error) {
				console.error('Error loading health messages:', error);
				// Error fallback - show generic status message
				popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
				popList.innerHTML = `<li>Unable to load lead details</li>`;
			}
		})();
	} else {
		// No leadId provided - show generic status message
		popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
		popList.innerHTML = `<li>No lead information available</li>`;
	}

	console.log('Popover should be visible now'); // Debug
}

/**
 * Hide health status popover
 */
export function hidePopover() {
	if (!pop) {
		pop = document.getElementById('healthPopover');
	}
	if (pop) {
		pop.style.display = 'none';
	}
}

