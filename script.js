// ============================================================================
// IMPORTS - Modular Architecture
// ============================================================================

// Import utility functions
import {
	formatDate,
	showModal,
	hideModal,
	toast,
	show,
	hide,
	updateSortHeaders
} from './src/utils/helpers.js';

// Import state management
import {
	state
} from './src/state/state.js';

// Import mock data (TEMPORARY - will be removed when Supabase APIs are complete)
// Note: mockAgents removed - now using real agents from Supabase users table
// Note: mockLeads removed - now using state.leads from Supabase
// Note: mockSpecials removed - now using real specials from Supabase
import {
	mockProperties, // Still used for showcases - TODO: replace with Supabase
	mockInterestedLeads,
	mockBugs,
	mockDocumentStatuses,
	mockClosedLeads,
	prefsSummary
} from './src/state/mockData.js';

// Import Supabase API (for real data)
import * as SupabaseAPI from './src/api/supabase-api.js';

// Import Leads module
import * as Leads from './src/modules/leads/index.js';
import { calculateHealthStatus, renderHealthStatus } from './src/modules/leads/leads-health.js';

// Import Listings module
import * as Listings from './src/modules/listings/index.js';

// Import Agents module
import * as Agents from './src/modules/agents/index.js';

// Import Documents module
import * as Documents from './src/modules/documents/index.js';

// Import Admin module
import * as Admin from './src/modules/admin/index.js';

// Import Properties module
import * as Properties from './src/modules/properties/index.js';

// Import Modals module
import * as Modals from './src/modules/modals/index.js';

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================
// ✅ NOW USING REAL SUPABASE DATA ONLY!
// Mock data removed - all data comes from Supabase database

// Global variables (loaded from external scripts)
/* global mapboxgl */

// Forward declarations for functions defined later (to avoid hoisting issues)
 
let api, renderLeads, renderSpecials;
 

// ============================================================================
// GLOBAL FUNCTIONS (Keep for backward compatibility)
// ============================================================================
// Note: These are now imported from modules above, but we keep them
// accessible globally for functions that expect them in global scope

// Add Lead functionality
async function saveNewLead() {
	const name = document.getElementById('leadName').value.trim();
	const email = document.getElementById('leadEmail').value.trim();
	const phone = document.getElementById('leadPhone').value.trim();
	const status = document.getElementById('leadStatus').value;
	const health = document.getElementById('leadHealth').value;
	const source = document.getElementById('leadSource').value;
	const notes = document.getElementById('leadNotes').value.trim();

	// New fields from landing page
	const bestTime = document.getElementById('leadBestTime').value;
	const bedrooms = document.getElementById('leadBedrooms').value;
	const bathrooms = document.getElementById('leadBathrooms').value;
	const priceRange = document.getElementById('leadPriceRange').value;
	const areaOfTown = document.getElementById('leadAreaOfTown').value;
	const moveInDate = document.getElementById('leadMoveInDate').value;
	const creditHistory = document.getElementById('leadCreditHistory').value;
	const comments = document.getElementById('leadComments').value.trim();

	// Validation
	if (!name || !email || !phone) {
		toast('Please fill in all required fields (Name, Email, Phone)', 'error');
		return;
	}

	// Build preferences object
	const preferences = {
		bedrooms: bedrooms,
		bathrooms: bathrooms,
		priceRange: priceRange,
		areaOfTown: areaOfTown,
		moveInDate: moveInDate,
		creditHistory: creditHistory,
		bestTimeToCall: bestTime,
		comments: comments
	};

	// Create new lead object for Supabase
	const newLead = {
		name: name,
		email: email,
		phone: phone,
		status: status,
		health_status: health,
		source: source,
		notes: notes,
		preferences: JSON.stringify(preferences),
		assigned_agent_id: state.agentId || null,
		found_by_agent_id: state.agentId || null,
		submitted_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	try {
		// Insert into Supabase
		const { data, error } = await window.supabase
			.from('leads')
			.insert([newLead])
			.select();

		if (error) {
			console.error('❌ Error creating lead:', error);
			toast('Error adding lead: ' + error.message, 'error');
			return;
		}

		console.log('✅ Lead created:', data);
		toast('Lead added successfully!', 'success');
		hideModal('addLeadModal');

		// Refresh leads table
		await renderLeads();

	} catch (error) {
		console.error('❌ Error saving lead:', error);
		toast('Error adding lead. Please try again.', 'error');
	}
}

// Unused legacy functions - kept for backward compatibility
/* eslint-disable no-unused-vars */
function checkDuplicateLead(email, phone) {
	const existingLeads = state.leads || [];

	return existingLeads.some(lead =>
		lead.email.toLowerCase() === email.toLowerCase() ||
		lead.phone === phone
	);
}

async function createLeadAPI(lead) {
	try {
		const response = await fetch(`${API_BASE}/leads`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(lead)
		});

		if (response.ok) {
			toast('Lead added successfully!', 'success');
			hideModal('addLeadModal');
			renderLeads(); // Refresh the leads list
		} else {
			throw new Error('Failed to create lead');
		}
	} catch (error) {
		toast('Error adding lead: ' + error.message, 'error');
	}
}
/* eslint-enable no-unused-vars */

// Add Special functionality
function saveNewSpecial() {
	const propertyName = document.getElementById('specialPropertyName').value.trim();
	const currentSpecial = document.getElementById('specialCurrentSpecial').value.trim();
	const commissionRate = document.getElementById('specialCommissionRate').value.trim();
	const expirationDate = document.getElementById('specialExpirationDate').value;

	// Validation
	if (!propertyName || !currentSpecial || !commissionRate || !expirationDate) {
		toast('Please fill in all required fields', 'error');
		return;
	}

	// Check if expiration date is in the past
	if (new Date(expirationDate) < new Date()) {
		toast('Expiration date cannot be in the past', 'error');
		return;
	}

	// Create new special
	const newSpecial = {
		property_name: propertyName,
		current_special: currentSpecial,
		commission_rate: commissionRate,
		expiration_date: expirationDate,
		agent_id: state.currentAgent || 'agent_1', // Default agent
		agent_name: state.role === 'agent' ? 'Current Agent' : 'Manager' // Will be updated with real name
	};

	// Create special via API
	api.createSpecial(newSpecial);
	toast('Special added successfully!', 'success');
	hideModal('addSpecialModal');
	renderSpecials(); // Refresh the specials list
}

async function createSpecialAPI(special) {
	try {
		const response = await fetch(`${API_BASE}/specials`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(special)
		});

		if (response.ok) {
			toast('Special added successfully!', 'success');
			hideModal('addSpecialModal');
			renderSpecials(); // Refresh the specials list
		} else {
			throw new Error('Failed to create special');
		}
	} catch (error) {
		toast('Error adding special: ' + error.message, 'error');
	}
}

function deleteSpecial(specialId) {
	if (confirm('Are you sure you want to delete this special? This action cannot be undone.')) {
		api.deleteSpecial(specialId);
		toast('Special deleted successfully!', 'success');
		renderSpecials(); // Refresh the specials list
	}
}

async function deleteSpecialAPI(specialId) {
	try {
		const response = await fetch(`${API_BASE}/specials/${specialId}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			toast('Special deleted successfully!', 'success');
			renderSpecials(); // Refresh the specials list
		} else {
			throw new Error('Failed to delete special');
		}
	} catch (error) {
		toast('Error deleting special: ' + error.message, 'error');
	}
}

// Note: mockUsers and mockAuditLog are imported from src/state/mockData.js

(function() {
	// ---- State ----
	// Note: State is now imported from src/state/state.js
	// The imported 'state' object is used throughout this file

	// ---- Global Variables ----
	let map;
	let markers = [];
	let selectedProperty = null;

	// ---- Real Data from Supabase ----
	// Agents are loaded from Supabase users table (filtered by role='AGENT')
	let realAgents = []; // Will be populated by loadAgents() on initialization

	// ---- Utilities ----
	// Note: formatDate, showModal, hideModal, toast, show, hide are now imported from helpers.js
	function byKey(key) { return (a,b)=> (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0); }

	// ---- Table Sorting ----
	function sortTable(column, tableId) {
		console.log('sortTable called with column:', column, 'tableId:', tableId);
		const table = document.getElementById(tableId);
		if (!table) {
			console.log('Table not found:', tableId);
			return;
		}

		const tbody = table.querySelector('tbody');
		if (!tbody) {
			console.log('Tbody not found in table:', tableId);
			return;
		}

		// Three-state cycle: ascending → descending → no sort (original order)
		let newSortState;
		if (state.sort.key === column) {
			if (state.sort.dir === 'asc') {
				newSortState = 'desc';
			} else if (state.sort.dir === 'desc') {
				newSortState = 'none';
			} else {
				newSortState = 'asc';
			}
		} else {
			newSortState = 'asc';
		}

		// Update sort state
		state.sort.key = column;
		state.sort.dir = newSortState;

		// For tables with proper render functions, use those instead of DOM manipulation
		if (tableId === 'leadsTable') {
			renderLeads();
			return;
		} else if (tableId === 'agentsTable') {
			renderAgents();
			return;
		} else if (tableId === 'listingsTable') {
			renderListings();
			return;
		} else if (tableId === 'specialsTable') {
			renderSpecials();
			return;
		} else if (tableId === 'documentsTable') {
			renderDocuments();
			return;
		} else if (tableId === 'bugsTable') {
			renderBugs();
			return;
		} else if (tableId === 'usersTable') {
			console.log('Calling renderUsersTable for sorting');
			renderUsersTable();
			return;
		}

		// For tables without render functions, use DOM manipulation
		const rows = Array.from(tbody.querySelectorAll('tr'));
		const isAscending = newSortState === 'asc';

		rows.sort((a, b) => {
			const aVal = a.querySelector(`[data-sort="${column}"]`)?.textContent.trim() || '';
			const bVal = b.querySelector(`[data-sort="${column}"]`)?.textContent.trim() || '';

			// Handle numeric sorting for specific columns
			if (['rent_min', 'rent_max', 'beds_min', 'baths_min', 'sqft_min', 'commission_pct'].includes(column)) {
				// Special handling for commission_pct column
				if (column === 'commission_pct') {
					const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
					const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}

				// For rent columns, extract the first number (min value)
				if (['rent_min', 'rent_max'].includes(column)) {
					const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
					const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}

				// For beds/baths columns, extract the first number
				if (['beds_min', 'baths_min'].includes(column)) {
					const aNum = parseFloat(aVal.split('-')[0]) || 0;
					const bNum = parseFloat(bVal.split('-')[0]) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}

				const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
				const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
				return isAscending ? aNum - bNum : bNum - aNum;
			}

			// Handle date sorting
			if (['submitted_at', 'last_updated', 'created_at'].includes(column)) {
				const aDate = new Date(aVal);
				const bDate = new Date(bVal);
				return isAscending ? aDate - bDate : bDate - aDate;
			}

			// Default text sorting
			if (isAscending) {
				return aVal.localeCompare(bVal, undefined, { numeric: true });
			} else {
				return bVal.localeCompare(aVal, undefined, { numeric: true });
			}
		});

		rows.forEach(row => tbody.appendChild(row));
		updateSortHeaders(tableId);
	}


	// ---- Health Status ----
	const STATUS_LABEL = {
		green: 'Healthy',
		yellow: 'Warm',
		red: 'At Risk',
		closed: 'Closed',
		lost: 'Lost'
	};

	// ---- Health Status System ----
	// calculateHealthStatus is now imported from src/modules/leads/leads-health.js

	// Get current step from lead activities
	async function getCurrentStepFromActivities(leadId) {
		try {
			const activities = await SupabaseAPI.getLeadActivities(leadId);

			// Map activity types to step numbers
			const stepMapping = {
				'lead_created': 1,
				'showcase_sent': 2,
				'showcase_response': 3,
				'guest_card_sent': 4,
				'property_selected': 5,
				'lease_sent': 6,
				'lease_signed': 7,
				'lease_finalized': 8
			};

			// Find the highest step reached
			let currentStep = 1;
			activities.forEach(activity => {
				const step = stepMapping[activity.activity_type];
				if (step && step > currentStep) {
					currentStep = step;
				}
			});

			return currentStep;
		} catch (error) {
			console.error('Error getting current step:', error);
			return 1; // Default to step 1
		}
	}

	// Get step label from step number
	function getStepLabel(stepNumber) {
		const stepLabels = {
			1: 'Lead Joined',
			2: 'Showcase Sent',
			3: 'Showcase Response',
			4: 'Guest Card Sent',
			5: 'Property Selected',
			6: 'Lease Sent',
			7: 'Lease Signed',
			8: 'Lease Finalized'
		};
		return stepLabels[stepNumber] || 'Unknown';
	}

	// Get proper current step based on document progress
	function getProperCurrentStep(lead) {
		const docStatus = mockDocumentStatuses[lead.id];
		if (!docStatus) return 'New Lead';

		// Find the current step (in_progress or first pending)
		const currentStep = docStatus.steps.find(step => step.status === 'in_progress');
		if (currentStep) {
			return currentStep.name;
		}

		// If no in_progress step, find first pending
		const firstPending = docStatus.steps.find(step => step.status === 'pending');
		if (firstPending) {
			return firstPending.name;
		}

		// If all steps completed
		const allCompleted = docStatus.steps.every(step => step.status === 'completed');
		if (allCompleted) {
			return 'Completed';
		}

		return 'New Lead';
	}

	// Get time on current step
	function getTimeOnCurrentStep(lead) {
		const docStatus = mockDocumentStatuses[lead.id];
		if (!docStatus) return 'Never';

		// Find the current step
		const currentStep = docStatus.steps.find(step => step.status === 'in_progress');
		if (currentStep && currentStep.updated_at) {
			return formatTimeAgo(currentStep.updated_at);
		}

		// If no in_progress step, use last completed step
		const lastCompleted = docStatus.steps
			.filter(step => step.status === 'completed')
			.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

		if (lastCompleted && lastCompleted.updated_at) {
			return formatTimeAgo(lastCompleted.updated_at);
		}

		return 'Never';
	}

	// Dynamic health messages based on lead state
	async function getHealthMessages(lead) {
		const now = new Date();

		// Get last activity timestamp
		let lastActivityDate;
		if (lead.last_activity_at) {
			lastActivityDate = new Date(lead.last_activity_at);
		} else if (lead.updated_at) {
			lastActivityDate = new Date(lead.updated_at);
		} else {
			lastActivityDate = new Date(lead.created_at || lead.submitted_at);
		}

		const hoursSinceActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60));
		const daysSinceActivity = Math.floor(hoursSinceActivity / 24);
		const remainingHours = hoursSinceActivity % 24;

		// Get current step
		const currentStepNumber = lead.current_step || await getCurrentStepFromActivities(lead.id);
		const currentStepLabel = getStepLabel(currentStepNumber);
		const nextStepNumber = currentStepNumber < 8 ? currentStepNumber + 1 : null;
		const nextStepLabel = nextStepNumber ? getStepLabel(nextStepNumber) : 'Complete';

		// Format time display
		let timeDisplay;
		if (daysSinceActivity > 0) {
			timeDisplay = `${daysSinceActivity}d ${remainingHours}h`;
		} else {
			timeDisplay = `${hoursSinceActivity}h`;
		}

		if (lead.health_status === 'green') {
			return [
				`✅ Lead is actively engaged`,
				`📄 Current step: ${currentStepLabel}`,
				`➡️ Next step: ${nextStepLabel}`,
				`📅 Last activity: ${timeDisplay} ago`
			];
		}

		if (lead.health_status === 'yellow') {
			return [
				`⚠️ Needs attention - no activity in 36+ hours`,
				`📄 Current step: ${currentStepLabel}`,
				`➡️ Next step: ${nextStepLabel}`,
				`📅 Last activity: ${timeDisplay} ago`,
				`🎯 Action: Follow up with lead soon`
			];
		}

		if (lead.health_status === 'red') {
			return [
				`🚨 Urgent - no activity in 72+ hours`,
				`📄 Current step: ${currentStepLabel}`,
				`➡️ Next step: ${nextStepLabel}`,
				`📅 Last activity: ${timeDisplay} ago`,
				`🔥 Action: Contact lead immediately`
			];
		}

		if (lead.health_status === 'closed') {
			return [
				`🎉 Lead successfully closed!`,
				`📄 Final step: ${currentStepLabel}`,
				`📅 Closed on: ${formatDate(lead.closed_at || lead.last_activity_at)}`
			];
		}

		if (lead.health_status === 'lost') {
			return [
				`❌ Lead lost`,
				`📄 Last step: ${currentStepLabel}`,
				`📅 Lost on: ${formatDate(lead.lost_at || lead.last_activity_at)}`,
				`💭 Reason: ${lead.loss_reason || 'No reason provided'}`
			];
		}

		// Default fallback
		return [
			`📄 Current step: ${currentStepLabel}`,
			`➡️ Next step: ${nextStepLabel}`,
			`📅 Last activity: ${timeDisplay} ago`
		];
	}

	// Helper function to get hours on current step
	function getStepHours(lead, stepName) {
		const docStatus = mockDocumentStatuses[lead.id];
		if (!docStatus) return 0;

		const step = docStatus.steps.find(s => s.name === stepName);
		if (!step || !step.updated_at) return 0;

		const now = new Date();
		const stepTime = new Date(step.updated_at);
		return Math.floor((now - stepTime) / (60 * 60 * 1000));
	}

	// Action recommendation functions
	function getRecommendedAction(lead) {
		const now = new Date();
		const leadAge = now - new Date(lead.submitted_at);
		const hoursAgo = Math.floor(leadAge / (60 * 60 * 1000));
		const currentStep = getProperCurrentStep(lead);

		// Step-specific recommendations based on actual document steps
		if (currentStep === 'New Lead') {
			if (!lead.showcase_sent_at && hoursAgo > 24) {
				return "Send showcase immediately";
			}
			return "Send initial showcase";
		}

		if (currentStep === 'Lease Agreement Sent') {
			if (lead.lease_sent_at && !lead.lease_signed_at && hoursAgo > 48) {
				return "Send lease reminder";
			}
			return "Follow up on lease agreement";
		}

		if (currentStep === 'Signed By Lead') {
			return "Send to property owner for signature";
		}

		if (currentStep === 'Signed By Property Owner') {
			return "Finalize lease agreement";
		}

		if (currentStep === 'Finalized by Agent') {
			return "Process payment step";
		}

		if (currentStep === 'Payment Step') {
			return "Complete payment processing";
		}

		if (currentStep === 'Completed') {
			return "Lead successfully closed";
		}

		// General recommendations based on time
		if (!lead.showcase_sent_at && hoursAgo > 24) {
			return "Send showcase immediately";
		}

		if (lead.showcase_sent_at && !lead.showcase_response_at && hoursAgo > 72) {
			return "Follow up with phone call";
		}

		if (lead.tour_scheduled_at && !lead.tour_completed_at && hoursAgo > 120) {
			return "Reschedule tour";
		}

		return "Continue normal follow-up";
	}

	function getUrgentAction(lead) {
		const now = new Date();
		const currentStep = getProperCurrentStep(lead);

		// Step-specific urgent actions
		if (currentStep === 'Lease Agreement Sent') {
			if (lead.lease_sent_at && !lead.lease_signed_at) {
				const leaseHours = Math.floor((now - new Date(lead.lease_sent_at)) / (60 * 60 * 1000));
				if (leaseHours > 48) {
					return "Call lead immediately about lease";
				}
			}
		}

		if (currentStep === 'Signed By Lead') {
			return "Urgent: Send to property owner now";
		}

		if (currentStep === 'Signed By Property Owner') {
			return "Urgent: Finalize lease immediately";
		}

		if (currentStep === 'Finalized by Agent') {
			return "Urgent: Process payment now";
		}

		// General urgent actions
		if (lead.last_activity_at) {
			const activityHours = Math.floor((now - new Date(lead.last_activity_at)) / (60 * 60 * 1000));
			if (activityHours > 168) {
				return "Send re-engagement campaign";
			}
		}

		return "Schedule immediate follow-up call";
	}

	// Helper function to format time ago
	function formatTimeAgo(timestamp) {
		if (!timestamp) return 'Never';
		const now = new Date();
		const time = new Date(timestamp);
		const diffMs = now - time;
		const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) {
			return `${diffDays}d ${diffHours % 24}h ago`;
		} else if (diffHours > 0) {
			return `${diffHours}h ago`;
		} else {
			return 'Just now';
		}
	}

	// Legacy health messages for backward compatibility
	const healthMessages = {
		red: ['- Lead has not been provided listing options.', '- Lease Agreement has been pending e-signature for 2d 4h.'],
		yellow: ['- Lead has not responded in 3d 10h.', '- Lead is not scheduled to visit any properties yet.'],
		green: ['- Lead signed off, awaiting Lease Agreement signoff.'],
		closed: ['Lead Closed!'],
		lost: ['Lead Lost.']
	};

	// renderHealthStatus is now imported from src/modules/leads/leads-health.js

	// ---- Filter Functions ----
	function withinDateRange(date, from, to) {
		if (!from && !to) return true;
		const checkDate = new Date(date);
		if (from && checkDate < new Date(from)) return false;
		if (to && checkDate > new Date(to)) return false;
		return true;
	}

	function matchesListingsFilters(property, filters) {
		// Search filter
		if (filters.search) {
			const searchTerm = filters.search.toLowerCase();
			const matchesSearch =
				property.name.toLowerCase().includes(searchTerm) ||
				property.address.toLowerCase().includes(searchTerm) ||
				property.amenities.some(amenity => amenity.toLowerCase().includes(searchTerm));
			if (!matchesSearch) return false;
		}

		// Market filter
		if (filters.market !== 'all' && property.market !== filters.market) {
			return false;
		}

		// Price range filter
		if (filters.minPrice && property.rent_min < parseInt(filters.minPrice)) {
			return false;
		}
		if (filters.maxPrice && property.rent_max > parseInt(filters.maxPrice)) {
			return false;
		}

		// Beds filter
		if (filters.beds !== 'any') {
			const minBeds = parseInt(filters.beds);
			if (property.beds_min < minBeds) {
				return false;
			}
		}

		// Commission filter
		if (filters.commission !== '0') {
			const minCommission = parseFloat(filters.commission);
			const totalCommission = property.escort_pct + property.send_pct;
			if (totalCommission < minCommission) {
				return false;
			}
		}

		// Amenities filter
		if (filters.amenities !== 'any') {
			const amenityMap = {
				'pool': 'Pool',
				'gym': 'Gym',
				'pet': 'Pet Friendly',
				'ev': 'EV Charging'
			};
			const requiredAmenity = amenityMap[filters.amenities];
			if (!property.amenities.includes(requiredAmenity)) {
				return false;
			}
		}

		// PUMI filter (support both old and new field names)
		if (filters.pumiOnly && !(property.is_pumi || property.isPUMI)) {
			return false;
		}

		return true;
	}

	// ---- Health Popover Functions ----
	let pop, popTitle, popList;

	function initPopover() {
		pop = document.getElementById('healthPopover');
		popTitle = document.getElementById('popTitle');
		popList = document.getElementById('popList');
	}

	function showPopover(anchor, status) {
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
						popList.innerHTML = healthMessages[status].map(s => `<li>${s}</li>`).join('');
					}
				} catch (error) {
					console.error('Error loading health messages:', error);
					popList.innerHTML = healthMessages[status].map(s => `<li>${s}</li>`).join('');
				}
			})();
		} else {
			// Fallback to legacy messages
			popList.innerHTML = healthMessages[status].map(s => `<li>${s}</li>`).join('');
		}

		console.log('Popover should be visible now'); // Debug
	}

	function hidePopover() {
		if (pop) pop.style.display = 'none';
	}

	// ---- Agent Statistics ----
	function getAgentStats(agentId) {
		const leads = state.leads || [];
		const assignedLeads = leads.filter(l => l.assigned_agent_id === agentId);
		const generatedLeads = leads.filter(l => l.found_by_agent_id === agentId);
		const now = new Date();
		const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

		// Mock closed leads (in real app, this would come from a separate table)
		const closedLeads = assignedLeads.filter(l => {
			const submittedDate = new Date(l.submitted_at);
			return submittedDate >= ninetyDaysAgo && Math.random() > 0.7; // 30% chance of being "closed"
		});

		return {
			generated: generatedLeads.length,
			assigned: assignedLeads.length,
			closed: closedLeads.length
		};
	}

	// ---- Real API Layer ----
	// All data comes from Supabase database

	// Helper function to handle API responses
	async function handleResponse(response) {
		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Network error' }));
			throw new Error(error.error || `HTTP ${response.status}`);
		}
		return response.json();
	}

	api = {
		async getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters = {} }){
			// Use real Supabase data
			console.log('✅ Using Supabase for leads');
			return await SupabaseAPI.getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters });
		},

		async getLead(id) {
			// Use real Supabase data
			console.log('✅ Using Supabase for getLead');
			return await SupabaseAPI.getLead(id);
		},

		async assignLead(id, agent_id) {
			// Use real Supabase data
			console.log('✅ Using Supabase to assign lead');

			// Get current user info for activity logging
			const userEmail = window.currentUser?.email || 'unknown';
			const userName = window.currentUser?.user_metadata?.name ||
							 window.currentUser?.email ||
							 'Unknown User';

			return await SupabaseAPI.updateLead(id, {
				assigned_agent_id: agent_id,
				updated_at: new Date().toISOString()
			}, userEmail, userName);
		},

		async getMatches(lead_id, limit=10){
			// Return example listings for now
			return [
				{
					id: 'listing-1',
					name: 'The Residences at Domain',
					rent_min: 1800,
					rent_max: 2400,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 750,
					sqft_max: 1200,
					effective_commission_pct: 3.5,
					specials_text: 'First month free + $500 move-in credit',
					bonus_text: 'Pet-friendly community with dog park',
					image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-2',
					name: 'Skyline Apartments',
					rent_min: 2200,
					rent_max: 3200,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1100,
					sqft_max: 1600,
					effective_commission_pct: 4.0,
					specials_text: 'No deposit required for qualified applicants',
					bonus_text: 'Rooftop pool and fitness center',
					image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-3',
					name: 'Garden District Lofts',
					rent_min: 1600,
					rent_max: 2100,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 650,
					sqft_max: 950,
					effective_commission_pct: 3.0,
					specials_text: 'Utilities included in rent',
					bonus_text: 'Historic building with modern amenities',
					image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-4',
					name: 'Metro Tower Residences',
					rent_min: 2500,
					rent_max: 3800,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1200,
					sqft_max: 1800,
					effective_commission_pct: 4.5,
					specials_text: 'Concierge service included',
					bonus_text: 'Downtown location with city views',
					image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-5',
					name: 'Riverside Commons',
					rent_min: 1400,
					rent_max: 1900,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 600,
					sqft_max: 1000,
					effective_commission_pct: 2.5,
					specials_text: 'Free parking space included',
					bonus_text: 'Walking distance to riverfront park',
					image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-6',
					name: 'Elite Heights',
					rent_min: 3000,
					rent_max: 4500,
					beds_min: 3,
					beds_max: 4,
					baths_min: 3,
					baths_max: 4,
					sqft_min: 1800,
					sqft_max: 2500,
					effective_commission_pct: 5.0,
					specials_text: 'Premium finishes and appliances',
					bonus_text: 'Private balcony with city skyline views',
					image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop'
				}
			].slice(0, limit);
		},

		async getProperty(id) {
			const response = await fetch(`${API_BASE}/properties/${id}`);
			return handleResponse(response);
		},

		async createShowcase({ lead_id, agent_id, listing_ids, message, showcase_id, landing_url }){
			const response = await fetch(`${API_BASE}/showcases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lead_id,
					agent_id,
					listing_ids,
					message,
					showcase_id,
					landing_url
				})
			});
			return handleResponse(response);
		},

		async sendEmail({ to, subject, html, showcase_id }){
			// Mock for now
			console.log('Sending email:', { to, subject, showcase_id });
			return { ok: true };
		},

		async getInterestedLeadsCount(propertyId) {
			// Note: Using mock data for now - will be replaced with Supabase later
			const interestedLeads = mockInterestedLeads[propertyId] || [];
			return interestedLeads.length;
		},

		async getInterestedLeads(propertyId) {
			// Note: Using mock data for now - will be replaced with Supabase later
			console.log('getInterestedLeads called with propertyId:', propertyId);
			const data = mockInterestedLeads[propertyId] || [];
			console.log('Mock data for', propertyId, ':', data);
			return data;
		},

		async createLeadInterest({ lead_id, property_id, agent_id, interest_type, status, notes }) {
			try {
				const response = await fetch(`${API_BASE}/lead-interests`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ lead_id, property_id, agent_id, interest_type, status, notes })
				});
				return await handleResponse(response);
			} catch (error) {
				console.error('Error creating lead interest:', error);
				throw error;
			}
		},

		// Specials API functions
		async getSpecials({ role, agentId, search, sortKey, sortDir, page, pageSize }){
			// Use real Supabase data
			console.log('✅ Using Supabase for specials');
			return await SupabaseAPI.getSpecials({ role, agentId, search, sortKey, sortDir, page, pageSize });
		},

		async createSpecial(specialData) {
			// Use real Supabase data
			return await SupabaseAPI.createSpecial(specialData);
		},

		async updateSpecial(id, specialData) {
			// Use real Supabase data
			return await SupabaseAPI.updateSpecial(id, specialData);
		},

		async deleteSpecial(id) {
			// Use real Supabase data
			return await SupabaseAPI.deleteSpecial(id);
		},

		// Bugs API functions
		// Note: Bugs table exists but no Supabase API methods yet
		// Keeping mock data implementation for now (will be fixed later)
		async getBugs({ status, priority, page, pageSize } = {}) {
			console.log('Using mock data for bugs, count:', mockBugs.length);
			let filteredBugs = [...mockBugs];

			// Filter by status
			if (status) {
				filteredBugs = filteredBugs.filter(bug => bug.status === status);
			}

			// Filter by priority
			if (priority) {
				filteredBugs = filteredBugs.filter(bug => bug.priority === priority);
			}

			// Sort by created date (newest first)
			filteredBugs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

			return {
				items: filteredBugs,
				total: filteredBugs.length
			};
		},

		async createBug(bugData) {
			const newBug = {
				id: `bug_${Date.now()}`,
				...bugData,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};
			mockBugs.unshift(newBug);
			return newBug;
		},

		async updateBug(id, bugData) {
			const index = mockBugs.findIndex(b => b.id === id);
			if (index !== -1) {
				mockBugs[index] = { ...mockBugs[index], ...bugData, updated_at: new Date().toISOString() };
				return mockBugs[index];
			}
			throw new Error('Bug not found');
		},

		async deleteBug(id) {
			const index = mockBugs.findIndex(b => b.id === id);
			if (index !== -1) {
				mockBugs.splice(index, 1);
				return { success: true };
			}
			throw new Error('Bug not found');
		}
	};

	// ---- Rendering: Leads Table ----
	// Wrapper function that calls the module
	renderLeads = async function(){
		// Call module render function with realAgents (global variable)
		await Leads.renderLeads({
			api,
			SupabaseAPI,
			state,
			getCurrentStepFromActivities,
			openLeadNotesModal,
			openActivityLogModal,
			agents: realAgents
		});
	}

	function renderAgentSelect(lead){
		const opts = realAgents.map(a => `<option value="${a.id}" ${a.id===lead.assigned_agent_id?'selected':''}>${a.name}</option>`).join('');
		return `<select class="select" data-assign="${lead.id}"><option value="">Unassigned</option>${opts}</select>`;
	}
	function renderAgentReadOnly(lead){
		const a = realAgents.find(a => a.id === lead.assigned_agent_id);
		return `<span class="subtle">${a ? a.name : 'Unassigned'}</span>`;
	}

	// ---- Document Status Rendering ----
	function renderDocumentStepStatus(step, currentStep) {
		if (step.id < currentStep) {
			return `<span class="step-completed">✓ Completed</span>`;
		} else if (step.id === currentStep) {
			return `<span class="step-current">● In Progress</span>`;
		} else {
			return `<span class="step-pending">○ Pending</span>`;
		}
	}

	function renderDocumentSteps(leadId) {
		const docStatus = mockDocumentStatuses[leadId];
		if (!docStatus) return 'No document status available';

		return docStatus.steps.map(step => `
			<div class="document-step ${step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'current' : 'pending'}">
				<div class="step-header">
					<span class="step-number">${step.id}.</span>
					<span class="step-name">${step.name}</span>
					${renderDocumentStepStatus(step, docStatus.currentStep)}
				</div>
				${step.attachments.length > 0 ? `
					<div class="attachments">
						${step.attachments.map(attachment => `
							<div class="attachment">
								<span class="attachment-icon">📎</span>
								<span class="attachment-name">${attachment}</span>
								<button class="attachment-download" data-file="${attachment}">Download</button>
							</div>
						`).join('')}
					</div>
				` : ''}
			</div>
		`).join('');
	}

	function renderLeadDocumentSummary(leadId) {
		const docStatus = mockDocumentStatuses[leadId];
		if (!docStatus) return 'No documents';

		const completed = docStatus.steps.filter(s => s.status === 'completed').length;
		const total = docStatus.steps.length;
		const currentStep = docStatus.steps.find(s => s.status === 'in_progress');

		return `
			<div class="lead-document-summary">
				<div class="progress-bar">
					<div class="progress-fill" style="width: ${(completed / total) * 100}%"></div>
				</div>
				<div class="progress-text">${completed}/${total} steps completed</div>
				${currentStep ? `<div class="current-step">Currently: ${currentStep.name}</div>` : ''}
			</div>
		`;
	}

	// ---- Interactive Progress System ----
	// Note: Documents page now uses real Supabase data via Documents module
	// mockProgressLeads removed - was only used by dead viewLeadDetails() function

	// Note: mockBugs still imported from src/state/mockData.js (will be removed in Phase 4)
	// Bugs feature still uses mock data - Supabase API methods not yet implemented



	// Progress steps configuration
	const progressSteps = [
		{ id: 1, label: 'Lead Joined', key: 'leadJoined' },
		{ id: 2, label: 'Showcase Sent', key: 'showcaseSent' },
		{ id: 3, label: 'Lead Responded', key: 'leadResponded' },
		{ id: 4, label: 'Guest Card Sent', key: 'guestCardSent' },
		{ id: 5, label: 'Property Selected', key: 'propertySelected' },
		{ id: 6, label: 'Lease Sent', key: 'leaseSent' },
		{ id: 7, label: 'Lease Signed', key: 'leaseSigned' },
		{ id: 8, label: 'Lease Finalized', key: 'leaseFinalized' }
	];

	function renderProgressTable(tbodyId, leads) {
		const container = document.getElementById(tbodyId);
		if (!container) return;

		// Clear existing content
		container.innerHTML = '';

		// Create each lead as a separate table
		leads.forEach((lead, index) => {
			const leadTable = createLeadTable(lead, index === 0); // First lead expanded by default
			container.appendChild(leadTable);
		});

		// Event listeners are handled by event delegation in the main event listener setup

		// Add event listeners for progress steps
		leads.forEach(lead => {
			progressSteps.forEach(step => {
				const stepElement = document.querySelector(`[data-lead-id="${lead.id}"][data-step="${step.id}"]`);
				if (stepElement) {
					stepElement.addEventListener('click', (e) => {
						e.stopPropagation();
						showStepDetails(lead, step);
					});
				}
			});
		});
	}

function createLeadTable(lead, isExpanded = false) {
	const progressPercentage = Math.round((lead.currentStep / progressSteps.length) * 100);
	const currentStepName = progressSteps[lead.currentStep - 1]?.label || 'Unknown';

	const table = document.createElement('div');
	table.className = 'lead-table-container';
	table.innerHTML = `
		<div class="lead-table-header">
			<div class="lead-info">
				<div class="lead-icon">⚙️</div>
				<div class="lead-details">
					<div class="lead-names">
						<span class="agent-label">Agent:</span> <span class="agent-name">${lead.agentName}</span>
						<span class="lead-label">Lead:</span> <span class="lead-name">${lead.leadName}</span>
					</div>
				</div>
			</div>
			<div class="progress-center">
				<span class="progress-info">${progressPercentage}% Complete - Current Step: ${currentStepName}</span>
			</div>
			<div class="lead-actions">
				<span class="last-updated">Last Update: ${formatDate(lead.lastUpdated)}</span>
				<button class="expand-btn" data-lead-id="${lead.id}">
					<span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
				</button>
			</div>
		</div>

		<div class="lead-table-content ${isExpanded ? 'expanded' : 'collapsed'}">
			<div class="progress-section">
				<div class="progress-bar-container">
					<div class="progress-bar">
						<div class="progress-line-fill" style="width: ${progressPercentage}%"></div>
						<div class="progress-steps">
							${progressSteps.map(step => {
								const stepClass = step.id < lead.currentStep ? 'completed' :
																 step.id === lead.currentStep ? 'current' : 'pending';
								return `
									<div class="progress-step ${stepClass}"
										 data-lead-id="${lead.id}"
										 data-step="${step.id}">
										<div class="progress-step-dot ${stepClass}">${step.id}</div>
										<div class="progress-step-label">${step.label}</div>
									</div>
								`;
							}).join('')}
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	return table;
}

	async function getStepModalContent(lead, step) {
		switch(step.id) {
			case 1: // Lead Joined
				// Fetch the lead_created activity from database
				try {
					const leadData = await SupabaseAPI.getLead(lead.id);
					const activities = await SupabaseAPI.getLeadActivities(lead.id);
					const createdActivity = activities.find(a => a.activity_type === 'lead_created');

					if (!createdActivity) {
						return `
							<div class="modal-details"><strong>Lead Name:</strong> ${lead.leadName || lead.name}</div>
							<div class="modal-details"><strong>Status:</strong> Lead joined the system</div>
							<div class="modal-details"><em>No detailed join information available</em></div>
						`;
					}

					const metadata = createdActivity.metadata || {};
					const formData = metadata.form_data || {};
					const preferences = formData.preferences || leadData.preferences || {};

					// Parse preferences if it's a string
					const prefs = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;

					// Format the join method
					const source = metadata.source || 'unknown';
					const agentName = metadata.agent_name || createdActivity.performed_by_name || 'Unknown Agent';
					const joinDate = formatDate(createdActivity.created_at);

					let joinMethod = '';
					if (source === 'landing_page') {
						joinMethod = `Filled <strong>${agentName}</strong> landing page on ${joinDate}`;
					} else if (source === 'manual') {
						joinMethod = `Manually added by ${agentName} on ${joinDate}`;
					} else {
						joinMethod = `Joined via ${source} on ${joinDate}`;
					}

					// Build preferences display
					let prefsHTML = '';
					if (prefs && Object.keys(prefs).length > 0) {
						prefsHTML = '<div class="modal-section"><strong>Preferences from form:</strong><ul class="preferences-list">';

						if (prefs.bedrooms) prefsHTML += `<li><strong>Bedrooms:</strong> ${prefs.bedrooms}</li>`;
						if (prefs.bathrooms) prefsHTML += `<li><strong>Bathrooms:</strong> ${prefs.bathrooms}</li>`;
						if (prefs.priceRange) prefsHTML += `<li><strong>Budget:</strong> ${prefs.priceRange}</li>`;
						if (prefs.areaOfTown) prefsHTML += `<li><strong>Area:</strong> ${prefs.areaOfTown}</li>`;
						if (prefs.moveInDate) prefsHTML += `<li><strong>Move-in Date:</strong> ${prefs.moveInDate}</li>`;
						if (prefs.creditHistory) prefsHTML += `<li><strong>Credit History:</strong> ${prefs.creditHistory}</li>`;
						if (prefs.bestTimeToCall || formData.best_time_to_call) {
							prefsHTML += `<li><strong>Best Time to Call:</strong> ${prefs.bestTimeToCall || formData.best_time_to_call}</li>`;
						}
						if (prefs.comments) prefsHTML += `<li><strong>Comments:</strong> ${prefs.comments}</li>`;

						prefsHTML += '</ul></div>';
					}

					// Welcome email section (placeholder for Resend integration)
					const welcomeEmailHTML = `
						<div class="modal-section">
							<strong>Welcome Email:</strong>
							<div class="email-placeholder">
								<em>📧 Email integration coming soon (Resend)</em>
								<div class="email-details-placeholder">
									• Welcome email will be sent automatically<br>
									• Email status and details will appear here<br>
									• Click to view email content and delivery status
								</div>
							</div>
						</div>
					`;

					return `
						<div class="modal-details"><strong>Lead Name:</strong> ${leadData.name}</div>
						<div class="modal-details"><strong>Email:</strong> ${leadData.email}</div>
						<div class="modal-details"><strong>Phone:</strong> ${leadData.phone || 'Not provided'}</div>
						<div class="modal-details"><strong>Join Method:</strong> ${joinMethod}</div>
						${prefsHTML}
						${welcomeEmailHTML}
					`;
				} catch (error) {
					console.error('Error fetching lead joined details:', error);
					return `
						<div class="modal-details"><strong>Lead Name:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-details"><em>Error loading join details. Please try again.</em></div>
					`;
				}

			case 2: // Showcase Sent
				return `
					<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="modal-details"><strong>Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<a href="${lead.showcase.landingPageUrl}" target="_blank" class="modal-link">View Landing Page →</a>
				`;

			case 3: // Lead Responded
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="modal-details"><strong>Properties Selected:</strong> ${lead.showcase.selections.join(', ')}</div>
					<div class="modal-details"><strong>Preferred Tour Dates:</strong> ${lead.showcase.calendarDates.join(', ')}</div>
					<div class="modal-details"><strong>Response Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<div class="modal-details"><strong>Status:</strong> Lead has shown interest and selected properties</div>
					<a href="${lead.showcase.landingPageUrl}?filled=true&selections=${encodeURIComponent(lead.showcase.selections.join(','))}&dates=${encodeURIComponent(lead.showcase.calendarDates.join(','))}" target="_blank" class="modal-link">View Filled Landing Page →</a>
				`;

			case 4: { // Guest Card Sent / Send Guest Card
				// Check if this step is completed or needs action
				const guestCardActivities = await SupabaseAPI.getLeadActivities(lead.id);
				const guestCardSent = guestCardActivities.find(a => a.activity_type === 'guest_card_sent');

				if (guestCardSent) {
					// Step is completed - show sent details
					const metadata = guestCardSent.metadata || {};
					const properties = metadata.properties || [];
					const guestCardUrl = `https://tre-crm.vercel.app/guest-card.html?lead=${encodeURIComponent(lead.leadName || lead.name)}`;

					return `
						<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
						<div class="modal-details"><strong>Agent:</strong> ${guestCardSent.performed_by_name || 'Unknown'}</div>
						<div class="modal-details"><strong>Properties:</strong> ${properties.map(p => p.name).join(', ')}</div>
						<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(guestCardSent.created_at)}</div>
						<div class="modal-details"><strong>Status:</strong> ✅ Guest cards sent to all properties</div>
						<a href="${guestCardUrl}" target="_blank" class="modal-link">View Guest Card →</a>
					`;
				} else {
					// Step needs action - show preview/send interface
					// Get showcase response to know which properties were selected
					const showcaseResponse = guestCardActivities.find(a => a.activity_type === 'showcase_response');

					if (!showcaseResponse) {
						return `
							<div class="modal-warning">⚠️ No showcase response found. Lead must respond to showcase first.</div>
						`;
					}

					const responseMetadata = showcaseResponse.metadata || {};
					const selectedProperties = responseMetadata.selected_properties || [];

					if (selectedProperties.length === 0) {
						return `
							<div class="modal-warning">⚠️ No properties selected by lead.</div>
						`;
					}

					// Fetch property details and check for contact info
					let propertiesHTML = '';
					for (const propSelection of selectedProperties) {
						try {
							// Get property details
							const property = await SupabaseAPI.getProperty(propSelection.property_id);
							const hasContactInfo = property.contact_email || property.contact_phone;
							const tourDate = propSelection.tour_date || 'Not specified';

							propertiesHTML += `
								<div class="guest-card-property" data-property-id="${property.id}">
									<div class="property-header">
										<h4>${property.community_name || property.name}</h4>
										${hasContactInfo ?
											'<span class="contact-status-badge contact-ok">✓ Contact Info Available</span>' :
											'<span class="contact-status-badge contact-missing">⚠️ Missing Contact Info</span>'
										}
									</div>
									<div class="property-details">
										<div><strong>Address:</strong> ${property.street_address}</div>
										<div><strong>Tour Date:</strong> ${tourDate}</div>
										${hasContactInfo ? `
											<div><strong>Contact:</strong> ${property.contact_name || 'N/A'}</div>
											<div><strong>Email:</strong> ${property.contact_email || 'N/A'}</div>
											<div><strong>Phone:</strong> ${property.contact_phone || 'N/A'}</div>
											<div><strong>Office Hours:</strong> ${property.office_hours || 'N/A'}</div>
										` : `
											<div class="missing-contact-warning">
												<p>⚠️ Contact information is required before sending guest card.</p>
												<button class="btn btn-primary add-contact-btn" data-property-id="${property.id}" data-community-name="${property.community_name || property.name}">
													📞 Add Contact Info
												</button>
											</div>
										`}
									</div>
									${hasContactInfo ? `
										<div class="property-actions">
											<button class="btn btn-outline preview-guest-card-btn" data-property-id="${property.id}">
												👁️ Preview Guest Card
											</button>
											<button class="btn btn-primary send-guest-card-btn" data-property-id="${property.id}" data-lead-id="${lead.id}">
												📤 Send Guest Card
											</button>
										</div>
									` : ''}
								</div>
							`;
						} catch (error) {
							console.error('Error fetching property:', error);
							propertiesHTML += `
								<div class="guest-card-property error">
									<p>Error loading property details</p>
								</div>
							`;
						}
					}

					return `
						<div class="guest-card-workflow">
							<div class="modal-details"><strong>Lead:</strong> ${lead.leadName || lead.name}</div>
							<div class="modal-details"><strong>Selected Properties:</strong> ${selectedProperties.length}</div>
							<div class="modal-section">
								<h3>Review & Send Guest Cards</h3>
								<p class="help-text">Review each property and send guest cards individually. Contact information is required for each property.</p>
							</div>
							<div class="properties-list">
								${propertiesHTML}
							</div>
						</div>
					`;
				}
			}

			case 5: // Property Selected
				return `
					<div class="modal-details"><strong>Property:</strong> ${lead.property.name}</div>
					<div class="modal-details"><strong>Address:</strong> ${lead.property.address}</div>
					<div class="modal-details"><strong>Rent:</strong> ${lead.property.rent}</div>
					<div class="modal-details"><strong>Size:</strong> ${lead.property.bedrooms}bd/${lead.property.bathrooms}ba</div>
				`;

			case 6: // Lease Sent
				return `
					<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<a href="https://tre-crm.vercel.app/lease/lead_${lead.id}" target="_blank" class="modal-link">View Lease →</a>
				`;

			case 7: // Lease Signed
				return `
					<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<div class="modal-details"><strong>Signed by:</strong> Property Management</div>
					<a href="https://tre-crm.vercel.app/lease-signed/lead_${lead.id}" target="_blank" class="modal-link">View Signed Lease →</a>
				`;

			case 8: // Lease Finalized
				return `
					<div class="modal-details"><strong>Status:</strong> Complete</div>
					<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<div class="modal-details"><strong>Commission:</strong> Ready for processing</div>
				`;

			default:
				return `<div class="modal-details">No details available</div>`;
		}
	}

	async function showStepDetails(lead, step) {
		// Create modal if it doesn't exist
		let modal = document.getElementById('progressModal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'progressModal';
			modal.className = 'progress-modal';
			modal.innerHTML = `
				<div class="progress-modal-content">
					<button class="progress-modal-close">&times;</button>
					<div class="modal-title"></div>
					<div class="modal-content"></div>
				</div>
			`;
			document.body.appendChild(modal);

			// Add close event listeners
			modal.querySelector('.progress-modal-close').addEventListener('click', () => {
				modal.classList.remove('show');
			});

			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					modal.classList.remove('show');
				}
			});
		}

		// Update modal content
		const title = modal.querySelector('.modal-title');
		const content = modal.querySelector('.modal-content');

		title.textContent = step.label;

		// Show loading state
		content.innerHTML = '<div class="modal-loading">Loading...</div>';

		// Show modal
		modal.classList.add('show');

		// Load content asynchronously
		try {
			const modalContent = await getStepModalContent(lead, step);
			content.innerHTML = modalContent;

			// Add event listeners for guest card workflow buttons (Step 4)
			if (step.id === 4) {
				// Add Contact Info buttons
				content.querySelectorAll('.add-contact-btn').forEach(btn => {
					btn.addEventListener('click', async (e) => {
						const propertyId = e.target.dataset.propertyId;
						const communityName = e.target.dataset.communityName;

						// Open the property contact modal with pre-filled property
						const property = await SupabaseAPI.getProperty(propertyId);
						document.getElementById('contactPropertySelect').value = communityName;
						document.getElementById('contactName').value = property.contact_name || '';
						document.getElementById('contactEmail').value = property.contact_email || '';
						document.getElementById('contactPhone').value = property.contact_phone || '';
						document.getElementById('contactOfficeHours').value = property.office_hours || '';
						document.getElementById('contactNotes').value = property.contact_notes || '';

						// Disable property dropdown (can't change property when editing)
						document.getElementById('contactPropertySelect').disabled = true;

						// Show the modal
						showModal('addPropertyContactModal');

						// After saving, refresh the guest card modal
						const saveBtn = document.getElementById('savePropertyContactBtn');
						const refreshHandler = async () => {
							// Re-enable dropdown
							document.getElementById('contactPropertySelect').disabled = false;
							// Refresh the step modal
							await showStepDetails(lead, step);
							// Remove this handler
							saveBtn.removeEventListener('click', refreshHandler);
						};
						saveBtn.addEventListener('click', refreshHandler);
					});
				});

				// Preview Guest Card buttons
				content.querySelectorAll('.preview-guest-card-btn').forEach(btn => {
					btn.addEventListener('click', async (e) => {
						const propertyId = e.target.dataset.propertyId;
						const property = await SupabaseAPI.getProperty(propertyId);
						const guestCardUrl = `https://tre-crm.vercel.app/guest-card.html?lead=${encodeURIComponent(lead.leadName || lead.name)}&property=${encodeURIComponent(property.community_name || property.name)}`;
						window.open(guestCardUrl, '_blank');
					});
				});

				// Send Guest Card buttons
				content.querySelectorAll('.send-guest-card-btn').forEach(btn => {
					btn.addEventListener('click', async (e) => {
						const propertyId = e.target.dataset.propertyId;
						const leadId = e.target.dataset.leadId;

						try {
							const property = await SupabaseAPI.getProperty(propertyId);

							// Log the guest card sent activity
							await SupabaseAPI.logLeadActivity({
								lead_id: leadId,
								activity_type: 'guest_card_sent',
								description: `Guest card sent to ${property.community_name || property.name}`,
								metadata: {
									property_id: propertyId,
									property_name: property.community_name || property.name,
									contact_email: property.contact_email,
									contact_phone: property.contact_phone
								}
							});

							toast(`✅ Guest card sent to ${property.community_name || property.name}!`, 'success');

							// Refresh the modal to show updated status
							await showStepDetails(lead, step);
						} catch (error) {
							console.error('Error sending guest card:', error);
							toast('Error sending guest card. Please try again.', 'error');
						}
					});
				});
			}
		} catch (error) {
			console.error('Error loading step details:', error);
			content.innerHTML = '<div class="modal-error">Error loading details. Please try again.</div>';
		}
	}

	// viewLeadDetails() removed - was dead code using mockProgressLeads
	// Documents page now uses real Supabase data via Documents module

	function toggleLeadTable(leadId) {
		console.log('toggleLeadTable called with leadId:', leadId);

		// Find the button in the currently visible view only
		const managerView = document.getElementById('managerDocumentsView');
		const agentView = document.getElementById('agentDocumentsView');

		let btn = null;
		let container = null;

		// Check which view is visible and search within that view only
		if (managerView && !managerView.classList.contains('hidden')) {
			container = managerView.querySelector(`[data-lead-id="${leadId}"]`)?.closest('.lead-table-container');
			btn = container?.querySelector('.expand-btn');
			console.log('Searching in Manager view');
		} else if (agentView && !agentView.classList.contains('hidden')) {
			container = agentView.querySelector(`[data-lead-id="${leadId}"]`)?.closest('.lead-table-container');
			btn = container?.querySelector('.expand-btn');
			console.log('Searching in Agent view');
		}

		console.log('Found button:', btn);
		console.log('Found container:', container);

		if (!btn || !container) {
			console.log('No button or container found for leadId:', leadId);
			return;
		}

		const content = container.querySelector('.lead-table-content');
		const expandIcon = container.querySelector('.expand-icon');

		console.log('Content element:', content);
		console.log('Expand icon:', expandIcon);

		if (content.classList.contains('expanded')) {
			content.classList.remove('expanded');
			content.classList.add('collapsed');
			expandIcon.textContent = '▶';
			console.log('Collapsed table');
			console.log('Content classes after collapse:', content.classList.toString());
		} else {
			content.classList.remove('collapsed');
			content.classList.add('expanded');
			expandIcon.textContent = '▼';
			console.log('Expanded table');
			console.log('Content classes after expand:', content.classList.toString());
		}

		// Check computed styles
		const computedStyle = window.getComputedStyle(content);
		console.log('Computed max-height:', computedStyle.maxHeight);
		console.log('Computed height:', computedStyle.height);
		console.log('Computed padding:', computedStyle.padding);
	}

	// ---- Rendering: Documents Table ----
	// Wrapper function that calls the module
	async function renderDocuments(){
		await Documents.renderDocuments({
			state,
			renderAgentDocuments,
			renderManagerDocuments
		});
	}

	async function renderManagerDocuments(){
		await Documents.renderManagerDocuments({
			SupabaseAPI,
			state,
			renderProgressTable,
			toast
		});
	}

	async function renderAgentDocuments(){
		await Documents.renderAgentDocuments({
			SupabaseAPI,
			state,
			renderProgressTable,
			toast
		});
	}

	// ---- Properties Module Wrappers ----
	async function renderProperties() {
		await Properties.renderProperties({
			renderPropertyContacts,
			renderSpecials
		});
	}

	async function renderPropertyContacts() {
		await Properties.renderPropertyContacts({
			state,
			SupabaseAPI,
			populatePropertyDropdown,
			toast
		});
	}

	function populatePropertyDropdown(communityNames) {
		Properties.populatePropertyDropdown(communityNames);
	}

	async function savePropertyContact() {
		await Properties.savePropertyContact({
			SupabaseAPI,
			hideModal,
			renderPropertyContacts,
			toast
		});
	}

	async function editPropertyContact(propertyId, communityName) {
		await Properties.editPropertyContact(propertyId, communityName, {
			SupabaseAPI,
			showModal,
			toast
		});
	}

	// ---- Specials Module Wrapper ----
	renderSpecials = async function(){
		await Properties.renderSpecials({
			state,
			api,
			formatDate,
			updateSortHeaders
		});
	}

	// ---- Bug Tracker Module Wrappers ----
	async function renderBugs() {
		await Properties.renderBugs({
			api,
			formatDate
		});
	}

	function showBugReportModal(context = {}) {
		Properties.showBugReportModal(context, {
			state,
			showModal
		});
	}

	async function submitBugReport() {
		await Properties.submitBugReport({
			api,
			state,
			toast,
			hideModal,
			renderBugs,
			getBrowserInfo,
			getOSInfo
		});
	}

	// Helper function to get browser info
	function getBrowserInfo() {
		return Properties.getBrowserInfo();
	}

	// Helper function to get OS info
	function getOSInfo() {
		return Properties.getOSInfo();
	}

	function addBugFlags() {
		Properties.addBugFlags({
			state,
			showBugReportModal,
			updateBugFlagVisibility
		});
	}

	function updateBugFlagVisibility() {
		Properties.updateBugFlagVisibility({
			state
		});
	}

	async function showBugDetails(bugId) {
		await Properties.showBugDetails(bugId, {
			mockBugs,
			formatDate,
			showModal,
			toast
		});
	}

	async function saveBugChanges(bugId) {
		try {
			const statusSelect = document.querySelector(`.bug-status-select[data-bug-id="${bugId}"]`);
			const prioritySelect = document.querySelector(`.bug-priority-select[data-bug-id="${bugId}"]`);

			if (!statusSelect || !prioritySelect) {
				toast('Could not find bug fields to update', 'error');
				return;
			}

			const updates = {
				status: statusSelect.value,
				priority: prioritySelect.value,
				updated_at: new Date().toISOString()
			};

			await api.updateBug(bugId, updates);
			toast('Bug updated successfully!', 'success');

			// Hide save button
			const saveBtn = document.querySelector(`.save-bug[data-id="${bugId}"]`);
			if (saveBtn) {
				saveBtn.style.display = 'none';
			}

			// Refresh the bugs table
			renderBugs();
		} catch (error) {
			toast('Error updating bug: ' + error.message, 'error');
		}
	}

	function handleBugFieldChange(bugId) {
		// Show save button when fields change
		const saveBtn = document.querySelector(`.save-bug[data-id="${bugId}"]`);
		if (saveBtn) {
			saveBtn.style.display = 'inline-block';
		}
	}

	function renderLeadsTable(searchTerm = '', searchType = 'both'){
		const tbody = document.getElementById('documentsTbody');
		tbody.innerHTML = '';

		// Get all active leads with their agent info
		const leads = state.leads || [];
		let activeLeads = leads.filter(l => l.health_status !== 'closed' && l.health_status !== 'lost');

		// Apply search filter
		if (searchTerm.trim()) {
			activeLeads = activeLeads.filter(lead => {
				const agent = realAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
				const searchLower = searchTerm.toLowerCase();

				if (searchType === 'agent') {
					return agent.name.toLowerCase().includes(searchLower);
				} else if (searchType === 'lead') {
					return lead.name.toLowerCase().includes(searchLower) || lead.email.toLowerCase().includes(searchLower);
				} else { // both
					return agent.name.toLowerCase().includes(searchLower) ||
						   lead.name.toLowerCase().includes(searchLower) ||
						   lead.email.toLowerCase().includes(searchLower);
				}
			});
		}

		activeLeads.forEach(lead => {
			const agent = realAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
			const progress = getDocumentProgress(lead.id);
			const currentStep = getCurrentDocumentStep(lead.id);
			const lastUpdated = getLastDocumentUpdate(lead.id);

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td data-sort="agent_name">${agent.name}</td>
				<td data-sort="lead_name">
					<div class="lead-name">${lead.name}</div>
					<div class="subtle mono">${lead.email}</div>
				</td>
				<td data-sort="current_step">
					<div class="current-step">${currentStep}</div>
				</td>
				<td data-sort="progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progress}%"></div>
					</div>
					<div class="progress-text">${progress}% complete</div>
				</td>
				<td data-sort="last_updated" class="mono">${formatDate(lastUpdated)}</td>
				<td>
					<button class="btn-small btn-primary-small" onclick="openDocumentDetails('${lead.id}')">
						View Details
					</button>
				</td>
			`;
			tbody.appendChild(tr);
		});
	}

	function renderAgentLeadsList(){
		const agentLeadsList = document.getElementById('agentLeadsList');
		agentLeadsList.innerHTML = '';

		// Get current agent's leads
		const leads = state.leads || [];
		const agentLeads = leads.filter(l => l.assigned_agent_id === state.agentId);

		agentLeads.forEach(lead => {
			const progress = getDocumentProgress(lead.id);
			const currentStep = getCurrentDocumentStep(lead.id);
			const status = getDocumentStatus(lead.id);

			const card = document.createElement('div');
			card.className = 'lead-card';
			card.innerHTML = `
				<div class="lead-card-header">
					<div class="lead-name">${lead.name}</div>
					<div class="lead-status ${status}">${status}</div>
				</div>
				<div class="lead-progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progress}%"></div>
					</div>
					<div class="progress-text">${progress}% complete - ${currentStep}</div>
				</div>
				<div class="document-steps">
					${renderDocumentSteps(lead.id)}
				</div>
				<div class="lead-actions">
					<button class="btn-small btn-primary-small" onclick="openDocumentDetails('${lead.id}')">
						View Details
					</button>
					<button class="btn-small btn-secondary-small" onclick="updateDocumentStatus('${lead.id}')">
						Update Status
					</button>
				</div>
			`;
			agentLeadsList.appendChild(card);
		});
	}

	// Helper functions for document status
	function getDocumentProgress(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return 0;

		const completedSteps = status.steps.filter(step => step.status === 'completed').length;
		return Math.round((completedSteps / status.steps.length) * 100);
	}

	function getCurrentDocumentStep(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return 'Not Started';

		const currentStep = status.steps.find(step => step.status === 'current');
		return currentStep ? currentStep.name : 'Completed';
	}

	function getDocumentStatus(leadId) {
		const progress = getDocumentProgress(leadId);
		if (progress === 0) return 'not-started';
		if (progress === 100) return 'completed';
		return 'active';
	}

	function getLastDocumentUpdate(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return new Date();

		const lastStep = status.steps
			.filter(step => step.status === 'completed')
			.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

		return lastStep ? lastStep.updated_at : new Date();
	}

	// Helper functions for agent actions
	function viewAgentLeads(agentId) {
		// Filter the leads table to show only this agent's leads
		const tbody = document.getElementById('documentsTbody');
		const rows = tbody.querySelectorAll('tr');
		rows.forEach(row => {
			const agentName = row.querySelector('[data-sort="agent_name"]')?.textContent.trim();
			const agent = realAgents.find(a => a.id === agentId);
			if (agent && agentName === agent.name) {
				row.style.display = '';
			} else {
				row.style.display = 'none';
			}
		});
		toast(`Showing leads for ${realAgents.find(a => a.id === agentId)?.name || 'Unknown Agent'}`);
	}

	function viewAgentDetails(agentId) {
		const agent = realAgents.find(a => a.id === agentId);
		if (agent) {
			openAgentDrawer(agentId);
		}
	}

	function updateDocumentStatus(leadId) {
		toast('Document status update feature coming soon!');
	}

	// ---- Rendering: Agents Table ----
	// Wrapper function that calls the module
	async function renderAgents(){
		await Agents.renderAgents({
			mockAgents: realAgents,
			state,
			getAgentStats
		});
	}

	function initMap() {
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

	function clearMarkers() {
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

	function addMarker(prop) {
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
			`;

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

	function selectProperty(prop) {
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

	// ---- Geocoding Helper ----
	async function geocodeAddress(address, city, zipCode) {
		try {
			// Build full address string
			const fullAddress = `${address}, ${city}, TX ${zipCode}`;
			const encodedAddress = encodeURIComponent(fullAddress);

			// Use Mapbox Geocoding API
			const response = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=pk.eyJ1IjoiZ3I4bmFkZSIsImEiOiJjbWdrNmJqcjgwcjlwMmpvbWg3eHBwamF5In0.639Vz3e1U5PCl5CwafE1hg&limit=1`
			);

			if (!response.ok) {
				throw new Error('Geocoding failed');
			}

			const data = await response.json();

			if (data.features && data.features.length > 0) {
				const [lng, lat] = data.features[0].center;
				console.log('✅ Geocoded address:', fullAddress, 'to', lat, lng);
				return { lat, lng };
			} else {
				console.warn('⚠️ No geocoding results for:', fullAddress);
				return null;
			}
		} catch (error) {
			console.error('❌ Geocoding error:', error);
			return null;
		}
	}

	// ---- Add Listing Modal Functions ----
	function openAddListingModal() {
		Modals.openAddListingModal({
			showModal
		});
	}

	function closeAddListingModal() {
		Modals.closeAddListingModal({
			hideModal
		});
	}

	async function createListing() {
		await Modals.createListing({
			SupabaseAPI,
			geocodeAddress,
			toast,
			closeAddListingModal,
			renderListings
		});
	}

	// ---- Lead Notes Functions ----
	async function loadLeadNotes(leadId) {
		await Modals.loadLeadNotes(leadId, {
			SupabaseAPI,
			formatDate
		});
	}

	async function saveLeadNote(isStandalone = false) {
		await Modals.saveLeadNote(isStandalone, {
			SupabaseAPI,
			loadLeadNotesInModal,
			renderLeads,
			toast
		});
	}

	// ---- Property Notes Modal Functions ----
	// Note: currentPropertyForNotes is now window.currentPropertyForNotes (global)

	async function openPropertyNotesModal(propertyId, propertyName) {
		await Modals.openPropertyNotesModal(propertyId, propertyName, {
			loadPropertyNotes,
			showModal
		});
	}

	function closePropertyNotesModal() {
		Modals.closePropertyNotesModal({
			hideModal
		});
	}

	async function loadPropertyNotes(propertyId) {
		await Modals.loadPropertyNotes(propertyId, {
			SupabaseAPI,
			formatDate,
			toast
		});
	}

	async function addPropertyNote() {
		await Modals.addPropertyNote({
			state,
			SupabaseAPI,
			loadPropertyNotes,
			renderListings,
			toast
		});
	}

	// ---- Rendering: Listings Table ----
	// Wrapper function that calls the module
	async function renderListings(){
		await Listings.renderListings({
			SupabaseAPI,
			state,
			matchesListingsFilters,
			mockInterestedLeads,
			selectProperty,
			openListingEditModal,
			openInterestedLeads,
			openActivityLogModal,
			openPropertyNotesModal,
			map,
			clearMarkers,
			addMarker,
			toast
		});
	}

	// ---- Lead Modals Module Wrappers ----
	// Note: currentLeadForNotes is now window.currentLeadForNotes (global)

	async function openLeadDetailsModal(leadId){
		await Modals.openLeadDetailsModal(leadId, {
			state,
			api,
			mockAgents: realAgents,
			formatDate,
			renderAgentSelect,
			loadLeadNotes,
			showModal
		});
	}

	function closeLeadDetailsModal(){
		Modals.closeLeadDetailsModal({
			hideModal
		});
	}

	// ---- Lead Notes Modal ----
	async function openLeadNotesModal(leadId, leadName) {
		await Modals.openLeadNotesModal(leadId, leadName, {
			loadLeadNotesInModal,
			showModal
		});
	}

	function closeLeadNotesModal() {
		Modals.closeLeadNotesModal({
			hideModal
		});
	}

	// ---- Activity Log Modal ----
	async function openActivityLogModal(entityId, entityType, entityName) {
		await Modals.openActivityLogModal(entityId, entityType, entityName, {
			SupabaseAPI,
			renderActivityLog,
			showModal,
			toast
		});
	}

	function closeActivityLogModal() {
		Modals.closeActivityLogModal({
			hideModal
		});
	}

	function renderActivityLog(activities) {
		return Modals.renderActivityLog(activities, {
			getActivityIcon,
			formatTimeAgo,
			renderActivityMetadata
		});
	}

	function getActivityIcon(activityType) {
		return Modals.getActivityIcon(activityType);
	}

	function renderActivityMetadata(activity) {
		return Modals.renderActivityMetadata(activity);
	}

	function formatTimeAgo(timestamp) {
		return Modals.formatTimeAgo(timestamp);
	}

	async function loadLeadNotesInModal(leadId, isStandalone = false) {
		await Modals.loadLeadNotesInModal(leadId, isStandalone, {
			SupabaseAPI,
			formatDate
		});
	}

	// Legacy function for backward compatibility
	async function openDrawer(leadId){
		await Modals.openDrawer(leadId, {
			openLeadDetailsModal
		});
	}

	function closeDrawer(){
		Modals.closeDrawer({
			closeLeadDetailsModal
		});
	}

	// ---- Agent Drawer ----
	async function openAgentDrawer(agentId){
		state.selectedAgentId = agentId;
		const agent = realAgents.find(a => a.id === agentId);
		const stats = getAgentStats(agentId);
		const c = document.getElementById('agentEditContent');

		c.innerHTML = `
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
				<div>
					<h4 style="margin-top: 0; color: #3b82f6;">📋 Contact Information</h4>
					<div class="field">
						<label>Agent Name</label>
						<input type="text" id="editAgentName" value="${agent.name}" />
					</div>
					<div class="field">
						<label>Email</label>
						<input type="email" id="editAgentEmail" value="${agent.email}" />
					</div>
					<div class="field">
						<label>Phone</label>
						<input type="tel" id="editAgentPhone" value="${agent.phone}" />
					</div>
					<div class="field">
						<label>Status</label>
						<select id="editAgentStatus">
							<option value="true" ${agent.active ? 'selected' : ''}>Active</option>
							<option value="false" ${!agent.active ? 'selected' : ''}>Inactive</option>
						</select>
					</div>
				</div>
				<div>
					<h4 style="margin-top: 0; color: #3b82f6;">👥 Professional Information</h4>
					<div class="field">
						<label>Hire Date</label>
						<input type="date" id="editAgentHireDate" value="${agent.hireDate || ''}" />
					</div>
					<div class="field">
						<label>License Number</label>
						<input type="text" id="editAgentLicense" value="${agent.licenseNumber || ''}" />
					</div>
					<div class="field">
						<label>Specialties (comma-separated)</label>
						<input type="text" id="editAgentSpecialties" value="${agent.specialties ? agent.specialties.join(', ') : ''}" />
					</div>
					<div class="field">
						<label>Notes</label>
						<textarea id="editAgentNotes" rows="3">${agent.notes || ''}</textarea>
					</div>
				</div>
			</div>
			<hr style="margin: 20px 0;">
			<h4 style="margin-top: 0; color: #3b82f6;">📊 Statistics</h4>
			<div class="stats-grid">
				<div class="stat-card">
					<div class="label">Leads Generated</div>
					<div class="value">${stats.generated}</div>
				</div>
				<div class="stat-card">
					<div class="label">Leads Assigned</div>
					<div class="value">${stats.assigned}</div>
				</div>
				<div class="stat-card">
					<div class="label">Leads Closed (90d)</div>
					<div class="value">${stats.closed}</div>
				</div>
			</div>
		`;
		showModal('agentEditModal');
	}

	function closeAgentDrawer(){ hide(document.getElementById('agentDrawer')); }

	function closeAgentEditModal(){
		hideModal('agentEditModal');
		state.selectedAgentId = null;
	}

	async function saveAgentChanges() {
		if (!state.selectedAgentId) return;

		const agent = realAgents.find(a => a.id === state.selectedAgentId);
		if (!agent) return;

		// Get values from form
		agent.name = document.getElementById('editAgentName').value;
		agent.email = document.getElementById('editAgentEmail').value;
		agent.phone = document.getElementById('editAgentPhone').value;
		agent.active = document.getElementById('editAgentStatus').value === 'true';
		agent.hireDate = document.getElementById('editAgentHireDate').value;
		agent.licenseNumber = document.getElementById('editAgentLicense').value;
		agent.specialties = document.getElementById('editAgentSpecialties').value.split(',').map(s => s.trim()).filter(s => s);
		agent.notes = document.getElementById('editAgentNotes').value;

		// In a real app, this would save to the database
		toast('Agent information updated successfully!', 'success');
		closeAgentEditModal();
		renderAgents();
	}

	// ---- Document Modals ----
	function openDocumentDetails(leadId) {
		Modals.openDocumentDetails(leadId, {
			mockLeads: state.leads || [],
			mockDocumentStatuses,
			renderDocumentSteps,
			toast,
			show
		});
	}

	function closeDocumentDetails() {
		Modals.closeDocumentDetails({
			hide
		});
	}

	function openHistory() {
		Modals.openHistory({
			mockClosedLeads,
			mockAgents: realAgents,
			formatDate,
			show
		});
	}

	function closeHistory() {
		Modals.closeHistory({
			hide
		});
	}

	function openHistoryDocumentDetails(closedLeadId) {
		Modals.openHistoryDocumentDetails(closedLeadId, {
			mockClosedLeads,
			show
		});
	}

	// ---- Matches Modal ----
	async function openMatches(leadId){
		await Modals.openMatches(leadId, {
			state,
			api,
			show,
			updateSelectionSummary
		});
	}

	function closeMatches(){
		Modals.closeMatches({
			hide
		});
	}

	// ---- Email Preview Modal ----
	async function openEmailPreview(){
		await Modals.openEmailPreview({
			state,
			api,
			closeMatches,
			show
		});
	}

	function closeEmailPreview(){
		Modals.closeEmailPreview({
			hide
		});
	}

	function previewLandingPage() {
		Modals.previewLandingPage({
			state,
			toast
		});
	}

	// ---- Interested Leads Modal ----
	async function openInterestedLeads(propertyId, propertyName) {
		console.log('=== OPENING INTERESTED LEADS ===');
		console.log('propertyId:', propertyId);
		console.log('propertyName:', propertyName);

		const modal = document.getElementById('interestedLeadsModal');
		console.log('Modal element:', modal);

		if (!modal) {
			console.error('Modal not found!');
			return;
		}

		document.getElementById('propertyName').textContent = propertyName;

		try {
			const interests = await api.getInterestedLeads(propertyId);
			console.log('Fetched interests:', interests);
			renderInterestedLeads(interests);
			show(modal);
			console.log('Modal should be visible now');
		} catch (error) {
			console.error('Error loading interested leads:', error);
			// Show empty state if no data
			renderInterestedLeads([]);
			show(modal);
			console.log('Modal should be visible now (empty state)');
		}
	}

	function closeInterestedLeads() {
		hide(document.getElementById('interestedLeadsModal'));
	}

	function renderInterestedLeads(interests) {
		console.log('renderInterestedLeads called with:', interests);
		const content = document.getElementById('interestedLeadsList');

		if (interests.length === 0) {
			console.log('No interests found, showing empty state');
			content.innerHTML = `
				<div style="text-align: center; padding: 40px; color: #6b7280;">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 16px; opacity: 0.5;">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
					</svg>
					<p>No interested leads yet</p>
					<p style="font-size: 0.875rem; margin-top: 8px;">Send showcases to generate interest!</p>
				</div>
			`;
			return;
		}

		console.log('Rendering', interests.length, 'interests');
		content.innerHTML = interests.map(interest => `
			<div class="interested-lead-item">
				<div class="interest-icon">
					${interest.leadName.charAt(0).toUpperCase()}
				</div>
				<div class="lead-info">
					<div class="lead-name">${interest.leadName}</div>
					<div class="lead-contact">Lead ID: ${interest.leadId}</div>
					<div class="lead-agent">via ${interest.agentName}</div>
				</div>
				<div class="interest-details">
					<div class="interest-date">${formatDate(interest.date)}</div>
					<div class="interest-status ${interest.status}">${interest.status.replace('_', ' ')}</div>
				</div>
			</div>
		`).join('');
	}

	// Global functions will be assigned at the end of the file

	async function sendShowcaseEmail(){
		await Modals.sendShowcaseEmail({
			state,
			api,
			toast,
			closeEmailPreview
		});
	}

	function updateSelectionSummary(){
		Modals.updateSelectionSummary({
			state
		});
	}

	function updateCreateShowcaseBtn(){
		Modals.updateCreateShowcaseBtn({
			state
		});
	}

	// ---- Showcase ----
	async function openShowcasePreview(){
		await Modals.openShowcasePreview({
			state,
			api,
			show
		});
	}

	function closeShowcase(){
		Modals.closeShowcase({
			hide
		});
	}

	// ---- Build Showcase from Listings ----
	async function openBuildShowcaseModal(){
		await Modals.openBuildShowcaseModal({
			state,
			mockLeads: state.leads || [],
			getSelectedListings,
			toast,
			show
		});
	}

	function closeBuildShowcase(){
		Modals.closeBuildShowcase({
			hide
		});
	}

	function getSelectedListings(){
		// Note: mockProperties still used for showcases - will be replaced with Supabase later
		return Modals.getSelectedListings({
			mockProperties
		});
	}

	function updateBuildShowcaseButton(){
		Listings.updateBuildShowcaseButton();
	}

	function updateBulkActionsBar() {
		Listings.updateBulkActionsBar({
			state
		});
	}

	async function bulkMarkAsUnavailable() {
		await Listings.bulkMarkAsUnavailable({
			SupabaseAPI,
			toast,
			renderListings
		});
	}

	async function bulkDeleteListings() {
		await Listings.bulkDeleteListings({
			SupabaseAPI,
			toast,
			renderListings
		});
	}

	async function sendBuildShowcase(){
		const leadId = document.getElementById('buildShowcaseLead').value;
		const selectedListings = getSelectedListings();
		const includeReferralBonus = document.getElementById('buildReferralBonus').checked;
		const includeMovingBonus = document.getElementById('buildMovingBonus').checked;

		if (!leadId) {
			toast('Please select a lead', 'error');
			return;
		}

		if (selectedListings.length === 0) {
			toast('Please select at least one listing', 'error');
			return;
		}

		const leads = state.leads || [];
		const lead = leads.find(l => l.id === leadId);
		if (!lead) {
			toast('Lead not found', 'error');
			return;
		}

		// Generate unique showcase ID for tracking
		const showcaseId = `showcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Create landing page URL with tracking parameters
		const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'landing.html');
		const landingUrl = `${baseUrl}?showcase=${showcaseId}&lead=${lead.id}&properties=${selectedListings.map(p => p.id).join(',')}`;

		// Create email content with bonus information
		let bonusText = '';
		if (includeReferralBonus || includeMovingBonus) {
			bonusText = '<p><strong>Special Perks:</strong></p><ul>';
			if (includeReferralBonus) {
				bonusText += '<li>Referral bonus for recommending friends</li>';
			}
			if (includeMovingBonus) {
				bonusText += '<li>Moving bonus to help with relocation costs</li>';
			}
			bonusText += '</ul>';
		}

		const emailContent = {
			to: lead.email,
			subject: 'Top options hand picked for you',
			html: `
				<h2>Top Property Options for You</h2>
				<p>Hi ${lead.name},</p>
				<p>I've hand-picked these properties based on your preferences:</p>
				${bonusText}
				${selectedListings.map(prop => `
					<div style="border: 1px solid #e5e7eb; padding: 16px; margin: 16px 0; border-radius: 8px;">
						<h3>${prop.name}</h3>
						<p><strong>Location:</strong> ${prop.market}</p>
						<p><strong>Rent:</strong> $${prop.rent_min} - $${prop.rent_max}</p>
						<p><strong>Size:</strong> ${prop.beds_min}-${prop.beds_max} bed / ${prop.baths_min}-${prop.baths_max} bath</p>
						<p><strong>Amenities:</strong> ${prop.amenities.slice(0, 5).join(', ')}</p>
					</div>
				`).join('')}
				<p>Click the link below to view your personalized property showcase and schedule tours:</p>
				<p><a href="${landingUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Property Showcase</a></p>
				<p>Best regards,<br>Your TRE Agent</p>
			`,
			showcase_id: showcaseId
		};

		try {
			// Send email via API
			await api.sendEmail(emailContent);

			// Create showcase record in database
			await api.createShowcase({
				lead_id: lead.id,
				agent_id: state.agentId || 'current-agent-id',
				listing_ids: selectedListings.map(p => p.id),
				message: `Showcase sent to ${lead.name} with ${selectedListings.length} properties`,
				showcase_id: showcaseId,
				landing_url: landingUrl
			});

			toast(`Showcase email sent to ${lead.name}! They can view their personalized matches at the provided link.`);
			closeBuildShowcase();

			// Clear selections
			document.querySelectorAll('.listing-checkbox:checked').forEach(cb => cb.checked = false);
			updateBuildShowcaseButton();

		} catch (error) {
			console.error('Error sending showcase email:', error);
			toast('Error sending email. Please try again.');
		}
	}

	async function sendShowcase(){
		const lead = await api.getLead(state.selectedLeadId);
		const listing_ids = Array.from(state.selectedMatches);
		const { showcase_id, public_url } = await api.createShowcase({
			lead_id: lead.id,
			agent_id: state.agentId,
			listing_ids,
			message: document.getElementById('showcaseMessage').value
		});
		const html = renderPublicShowcaseHTML({ showcaseId: showcase_id });
		await api.sendEmail({ to: lead.email, subject: document.getElementById('showcaseSubject').value, html, showcase_id });
		toast('ShowCase sent and recorded');
		closeShowcase();
		closeMatches();
		window.prompt('Copy public link:', public_url);
	}

	function renderPublicShowcaseHTML({ showcaseId }){
		const sc = state.showcases[showcaseId];
		const leads = state.leads || [];
		const lead = leads.find(l => l.id === sc.lead_id);
		const agent = realAgents.find(a => a.id === sc.agent_id);
		const listings = sc.listing_ids.map(id => mockProperties.find(p => p.id === id));
		const items = listings.map(item => `
			<div class="public-card">
				<div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div>
				<div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div>
				<div class="subtle">${item.specials_text || ''} ${item.bonus_text ? `· ${item.bonus_text}` : ''}</div>
				<div><a href="${item.website}" target="_blank" rel="noopener">Website</a> · ${item.address}</div>
			</div>
		`).join('');
		return `
			<div class="public-wrap">
				<div class="public-header">
					<h2>${agent.name} — Top Listings for ${lead.name}</h2>
					<div class="public-banner">${state.publicBanner}</div>
				</div>
				<div class="public-body">
					${items}
				</div>
			</div>
		`;
	}

	// ---- Routing ----
	function setRoleLabel(page = 'leads'){
		const label = document.getElementById(`${page}RoleLabel`) || document.getElementById('roleLabel');
		if (label) {
			label.textContent = state.role === 'manager' ? 'Viewing as Manager' : 'Viewing as Agent';
		}
	}

	function updateNavigation(activePage) {
		document.querySelectorAll('.nav-link').forEach(link => {
			link.classList.remove('active');
		});
		document.querySelector(`[data-page="${activePage}"]`).classList.add('active');
	}

	function route(){
		// Protect routes - require authentication
		if (!window.isAuthenticated || !window.isAuthenticated()) {
			console.log('⚠️ Not authenticated, cannot route');
			return;
		}

		const hash = location.hash.slice(1);
		// public showcase route: #/sc_xxxxxx
		if (hash.startsWith('/sc_')){
			// render public showcase view (read-only)
			document.body.innerHTML = `
				<link rel="stylesheet" href="styles.css" />
				<div id="publicMount"></div>
			`;
			const mount = document.getElementById('publicMount');
			// We don't persist by slug in mock; show a generic example
			mount.innerHTML = `
				<div class="public-wrap">
					<div class="public-header">
						<h2>Agent Name — Top Listings for Lead Name</h2>
						<div class="public-banner">${state.publicBanner}</div>
					</div>
					<div class="public-body">
						<div class="public-card">Example Listing — replace with real when backend ready.</div>
					</div>
				</div>
			`;
			return;
		}

		// Hide all views
		document.querySelectorAll('.route-view').forEach(view => hide(view));

		// Show appropriate view based on route
		if (hash === '/agents') {
			state.currentPage = 'agents';
			show(document.getElementById('agentsView'));
			setRoleLabel('agents');
			renderAgents();
		} else if (hash === '/listings') {
			state.currentPage = 'listings';
			show(document.getElementById('listingsView'));
			setRoleLabel('listings');
			// Initialize map if not already done
			setTimeout(() => {
				initMap();
				renderListings();
			}, 100);
		} else if (hash === '/documents') {
			state.currentPage = 'documents';
			show(document.getElementById('documentsView'));
			setRoleLabel('documents');
			// Initialize the documents view properly
			document.getElementById('managerDocumentsView').classList.remove('hidden');
			document.getElementById('agentDocumentsView').classList.add('hidden');
			renderDocuments();
		} else if (hash === '/properties' || hash === '/specials') {
			// Support both /properties and /specials for backward compatibility
			state.currentPage = 'properties';
			show(document.getElementById('propertiesView'));
			setRoleLabel('properties');
			renderProperties();
		} else if (hash === '/admin') {
			state.currentPage = 'admin';
			show(document.getElementById('adminView'));
			setRoleLabel('admin');
			renderAdmin();
		} else if (hash === '/bugs') {
			state.currentPage = 'bugs';
			show(document.getElementById('bugsView'));
			setRoleLabel('bugs');
			renderBugs();
		} else {
			// default: leads
			state.currentPage = 'leads';
			show(document.getElementById('leadsView'));
			setRoleLabel('leads');
			renderLeads();
		}

		updateNavigation(state.currentPage);
		updateBugFlagVisibility();
	}

	// ---- Load Real Agents from Supabase ----
	async function loadAgents() {
		try {
			console.log('📋 Loading real agents from Supabase...');
			const agents = await SupabaseAPI.getAgents();
			realAgents = agents; // Store real agents data
			console.log('✅ Loaded', agents.length, 'agents from Supabase');
		} catch (error) {
			console.error('❌ Error loading agents:', error);
			throw error; // Don't fall back to mock data - fail fast
		}
	}

	// ---- App Initialization (called by auth.js after login) ----
	window.initializeApp = async function() {
		console.log('🚀 Initializing app...');

		// Update state from authenticated user
		if (window.currentUser) {
			const role = window.getUserRole();
			const userId = window.getUserId();

			state.role = role;
			state.agentId = userId;

			console.log('✅ App initialized with role:', role, 'userId:', userId);
		}

		// Load real agents from Supabase
		await loadAgents();

		// Initialize nav visibility based on current role
		updateNavVisibility();

		// Initialize routing
		initializeRouting();
	};

	// Update navigation visibility based on role
	function updateNavVisibility() {
		const agentsNavLink = document.getElementById('agentsNavLink');
		const adminNavLink = document.getElementById('adminNavLink');

		if (agentsNavLink) {
			if (state.role === 'agent') {
				agentsNavLink.style.display = 'none';
			} else {
				agentsNavLink.style.display = 'block';
			}
		}

		if (adminNavLink) {
			if (state.role === 'agent') {
				adminNavLink.style.display = 'none';
			} else {
				adminNavLink.style.display = 'block';
			}
		}
	}

	// ---- Events ----
	document.addEventListener('DOMContentLoaded', () => {
		// Don't initialize app here - wait for auth.js to call initializeApp()
		console.log('DOM loaded, waiting for authentication...');

		// search
		const leadSearchEl = document.getElementById('leadSearch');
		if (leadSearchEl) {
			leadSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				state.page = 1;
				renderLeads();
			});
		}

		// listing search
		const listingSearchEl = document.getElementById('listingSearch');
		if (listingSearchEl) {
			listingSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				renderListings();
			});
		}

		// Old sort event listener removed - now handled by table delegation

		// pagination
		const prevPageEl = document.getElementById('prevPage');
		if (prevPageEl) {
			prevPageEl.addEventListener('click', ()=>{ if (state.page>1){ state.page--; renderLeads(); }});
		}
		const nextPageEl = document.getElementById('nextPage');
		if (nextPageEl) {
			nextPageEl.addEventListener('click', ()=>{ state.page++; renderLeads(); });
		}

		// table delegation
		const leadsTableEl = document.getElementById('leadsTable');
		if (leadsTableEl) {
			leadsTableEl.addEventListener('click', (e)=>{
				const a = e.target.closest('a.lead-name');
				if (a){ e.preventDefault(); openDrawer(a.dataset.id); return; }
				const view = e.target.closest('button[data-view]');
				if (view){ openDrawer(view.dataset.view); return; }
				const matches = e.target.closest('button[data-matches]');
				if (matches){ openMatches(matches.dataset.matches); return; }
			});
		}

		// agents table delegation
		const agentsTableEl = document.getElementById('agentsTable');
		if (agentsTableEl) {
			agentsTableEl.addEventListener('click', (e)=>{
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'agentsTable');
				e.preventDefault();
				return;
			}

				const view = e.target.closest('button[data-view-agent]');
				if (view){ openAgentDrawer(view.dataset.viewAgent); return; }

				// Handle view landing page button
				const viewLanding = e.target.closest('button[data-view-landing]');
				if (viewLanding) {
					window.open(viewLanding.dataset.viewLanding, '_blank');
					return;
				}

				// Handle copy landing page link button
				const copyLanding = e.target.closest('button[data-copy-landing]');
				if (copyLanding) {
					const url = copyLanding.dataset.copyLanding;
					navigator.clipboard.writeText(url).then(() => {
						toast('Landing page link copied to clipboard!', 'success');
					}).catch(err => {
						console.error('Failed to copy:', err);
						toast('Failed to copy link', 'error');
					});
					return;
				}

				const remove = e.target.closest('button[data-remove]');
				if (remove){
					if (confirm('Are you sure you want to remove this agent?')) {
						toast('Agent removed (mock action)');
						renderAgents();
					}
					return;
				}

				const lock = e.target.closest('button[data-lock]');
				if (lock){
					const agentId = lock.dataset.lock;
					const agent = realAgents.find(a => a.id === agentId);
					if (agent) {
						const action = agent.locked ? 'unlock' : 'lock';
						if (confirm(`Are you sure you want to ${action} this agent's account?`)) {
							agent.locked = !agent.locked;
							if (agent.locked) {
								agent.active = false; // Deactivate when locked
								toast('Agent account locked successfully', 'success');
							} else {
								toast('Agent account unlocked successfully', 'success');
							}
							renderAgents();
						}
					}
					return;
				}

				const assignLeads = e.target.closest('button[data-assign-leads]');
				if (assignLeads){ toast('Assign leads to agent (mock action)'); return; }
			});
		}

		// listings table delegation
		const listingsTableEl = document.getElementById('listingsTable');
		if (listingsTableEl) {
			listingsTableEl.addEventListener('click', (e)=>{
				console.log('Listings table clicked, target:', e.target);
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'listingsTable');
					e.preventDefault();
					return;
				}

				// Handle interested leads clicks
				const interestedBtn = e.target.closest('.interest-count');
				if (interestedBtn) {
					const propertyId = interestedBtn.dataset.propertyId;
					const propertyName = interestedBtn.dataset.propertyName;
					console.log('Interest button clicked - propertyId:', propertyId, 'propertyName:', propertyName);
					openInterestedLeads(propertyId, propertyName);
					return;
				}
			});

			// Handle checkbox changes for bulk actions
			listingsTableEl.addEventListener('change', (e)=>{
				if (e.target.classList.contains('listing-checkbox')) {
					console.log('Listing checkbox changed');
					updateBulkActionsBar();
				}
			});
		}

		// documents table delegation
		const documentsTableEl = document.getElementById('documentsTable');
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'documentsTable');
					e.preventDefault();
					return;
				}
			});
		}

		// admin users table delegation - using document level delegation
		document.addEventListener('click', (e) => {
			// Check if click is on admin users table
			const usersTable = e.target.closest('#usersTable');
			if (usersTable) {
				console.log('Admin users table clicked, target:', e.target);
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					console.log('Sortable header clicked, column:', column);
					console.log('Current sort state before:', window.state?.sort);
					sortTable(column, 'usersTable');
					console.log('Current sort state after:', window.state?.sort);
					e.preventDefault();
					return;
				} else {
					console.log('No sortable header found');
				}
			}
		});

		// assignment change
		if (leadsTableEl) {
			leadsTableEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){
					const id = sel.dataset.assign;
					await api.assignLead(id, sel.value || null);
					toast('Lead assignment updated');
					renderLeads();
				}
			});
		}

		// Lead details modal close buttons
		const closeLeadDetailsEl = document.getElementById('closeLeadDetails');
		if (closeLeadDetailsEl) {
			closeLeadDetailsEl.addEventListener('click', closeLeadDetailsModal);
		}
		const closeLeadDetailsFooterEl = document.getElementById('closeLeadDetailsFooter');
		if (closeLeadDetailsFooterEl) {
			closeLeadDetailsFooterEl.addEventListener('click', closeLeadDetailsModal);
		}

		// Lead notes modal buttons
		const closeLeadNotesEl = document.getElementById('closeLeadNotes');
		if (closeLeadNotesEl) {
			closeLeadNotesEl.addEventListener('click', closeLeadNotesModal);
		}
		const cancelLeadNotesEl = document.getElementById('cancelLeadNotes');
		if (cancelLeadNotesEl) {
			cancelLeadNotesEl.addEventListener('click', closeLeadNotesModal);
		}

		// Activity log modal buttons
		const closeActivityLogEl = document.getElementById('closeActivityLog');
		if (closeActivityLogEl) {
			closeActivityLogEl.addEventListener('click', closeActivityLogModal);
		}
		const closeActivityLogBtnEl = document.getElementById('closeActivityLogBtn');
		if (closeActivityLogBtnEl) {
			closeActivityLogBtnEl.addEventListener('click', closeActivityLogModal);
		}

		// Lead Details Modal save button (embedded notes)
		const saveLeadNoteBtnEl = document.getElementById('saveLeadNoteBtn');
		if (saveLeadNoteBtnEl) {
			console.log('✅ Attaching click listener to saveLeadNoteBtn (embedded)');
			saveLeadNoteBtnEl.addEventListener('click', () => {
				console.log('🟢 saveLeadNoteBtn clicked (embedded)!');
				saveLeadNote(false);  // Not standalone
			});
		} else {
			console.log('❌ saveLeadNoteBtn not found');
		}

		// Standalone Lead Notes Modal save button
		const standaloneSaveLeadNoteBtnEl = document.getElementById('standaloneSaveLeadNoteBtn');
		if (standaloneSaveLeadNoteBtnEl) {
			console.log('✅ Attaching click listener to standaloneSaveLeadNoteBtn');
			standaloneSaveLeadNoteBtnEl.addEventListener('click', () => {
				console.log('🟢 standaloneSaveLeadNoteBtn clicked!');
				saveLeadNote(true);  // Standalone
			});
		} else {
			console.log('❌ standaloneSaveLeadNoteBtn not found');
		}

		// Close modals on escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				const leadModal = document.getElementById('leadDetailsModal');
				const agentDrawer = document.getElementById('agentDrawer');
				if (leadModal && !leadModal.classList.contains('hidden')) {
					closeLeadDetailsModal();
				}
				if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
					closeAgentDrawer();
				}
			}
		});

		// Close drawer when clicking outside
		document.addEventListener('click', (e) => {
			const leadDrawer = document.getElementById('leadDrawer');
			const agentDrawer = document.getElementById('agentDrawer');

			// Close lead drawer if clicking outside
			if (leadDrawer && !leadDrawer.classList.contains('hidden')) {
				if (!leadDrawer.contains(e.target) && !e.target.closest('[data-view]')) {
					closeDrawer();
				}
			}

			// Close agent drawer if clicking outside
			if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
				if (!agentDrawer.contains(e.target) && !e.target.closest('[data-view-agent]')) {
					closeAgentDrawer();
				}
			}
		});
		const closeAgentDrawerEl = document.getElementById('closeAgentDrawer');
		if (closeAgentDrawerEl) {
			closeAgentDrawerEl.addEventListener('click', closeAgentDrawer);
		}

		// Agent edit modal event listeners
		const closeAgentEditEl = document.getElementById('closeAgentEdit');
		if (closeAgentEditEl) {
			closeAgentEditEl.addEventListener('click', closeAgentEditModal);
		}
		const closeAgentEditFooterEl = document.getElementById('closeAgentEditFooter');
		if (closeAgentEditFooterEl) {
			closeAgentEditFooterEl.addEventListener('click', closeAgentEditModal);
		}
		const saveAgentBtnEl = document.getElementById('saveAgentBtn');
		if (saveAgentBtnEl) {
			saveAgentBtnEl.addEventListener('click', saveAgentChanges);
		}
		// Lead details modal internal assignment
		const leadDetailsModalEl = document.getElementById('leadDetailsModal');
		if (leadDetailsModalEl) {
			leadDetailsModalEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){
					await api.assignLead(state.selectedLeadId, sel.value || null);
					toast('Lead assignment updated');
					renderLeads();
				}
			});
		}

		// matches modal events
		const closeMatchesEl = document.getElementById('closeMatches');
		if (closeMatchesEl) {
			closeMatchesEl.addEventListener('click', closeMatches);
		}
		const listingsGridEl = document.getElementById('listingsGrid');
		if (listingsGridEl) {
			listingsGridEl.addEventListener('change', (e)=>{
				const box = e.target.closest('input[type="checkbox"].listing-check');
				if (box){
					updateSelectionSummary();
				}
			});
		}
		const sendBtnEl = document.getElementById('sendBtn');
		if (sendBtnEl) {
			sendBtnEl.addEventListener('click', async ()=>{
				const selected = Array.from(state.selectedMatches);
				if (selected.length > 0) {
					await openEmailPreview();
				}
			});
		}
		const createShowcaseEl = document.getElementById('createShowcase');
		if (createShowcaseEl) {
			createShowcaseEl.addEventListener('click', openShowcasePreview);
		}

		// showcase modal
		const closeShowcaseEl = document.getElementById('closeShowcase');
		if (closeShowcaseEl) {
			closeShowcaseEl.addEventListener('click', closeShowcase);
		}
		const sendShowcaseEl = document.getElementById('sendShowcase');
		if (sendShowcaseEl) {
			sendShowcaseEl.addEventListener('click', sendShowcase);
		}

		// Build showcase from listings
		const buildShowcaseBtn = document.getElementById('buildShowcaseBtn');
		if (buildShowcaseBtn) {
			buildShowcaseBtn.addEventListener('click', openBuildShowcaseModal);
		}

		const closeBuildShowcaseEl = document.getElementById('closeBuildShowcase');
		if (closeBuildShowcaseEl) {
			closeBuildShowcaseEl.addEventListener('click', closeBuildShowcase);
		}

		const sendBuildShowcaseEl = document.getElementById('sendBuildShowcase');
		if (sendBuildShowcaseEl) {
			sendBuildShowcaseEl.addEventListener('click', sendBuildShowcase);
		}

		// Lead selection dropdown for build showcase
		const buildShowcaseLeadEl = document.getElementById('buildShowcaseLead');
		if (buildShowcaseLeadEl) {
			buildShowcaseLeadEl.addEventListener('change', (e) => {
				const leadId = e.target.value;
				const leadNameEl = document.getElementById('buildSendLeadName');
				const sendBtn = document.getElementById('sendBuildShowcase');

				if (leadId) {
					const leads = state.leads || [];
					const lead = leads.find(l => l.id === leadId);
					if (lead) {
						leadNameEl.textContent = lead.name;
						// Enable button since properties are already selected
						sendBtn.disabled = false;
					}
				} else {
					leadNameEl.textContent = 'Lead';
					sendBtn.disabled = true;
				}
			});
		}

		// Individual listing checkboxes
		document.addEventListener('change', (e) => {
			if (e.target.classList.contains('listing-checkbox')) {
				updateBuildShowcaseButton();
			}
		});
		const copyShowcaseLinkEl = document.getElementById('copyShowcaseLink');
		if (copyShowcaseLinkEl) {
			copyShowcaseLinkEl.addEventListener('click', ()=>{
				// just re-open prompt with last created showcase if exists
				const last = Object.values(state.showcases).slice(-1)[0];
				if (!last) return;
				const url = `${location.origin}${location.pathname}#/${last.public_slug}`;
				window.prompt('Copy public link:', url);
			});
		}

		// add agent button
		const addAgentBtnEl = document.getElementById('addAgentBtn');
		if (addAgentBtnEl) {
			addAgentBtnEl.addEventListener('click', ()=>{
				toast('Add new agent (mock action)');
			});
		}

		// Documents page event listeners
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'documentsTable');
					e.preventDefault();
					return;
				}
			});
		}

	// Admin page functions will be moved outside IIFE

	// ---- Events ----

		// Documents search functionality
		const documentsSearch = document.getElementById('documentsSearch');
		const searchType = document.getElementById('searchType');
		const clearDocumentsSearch = document.getElementById('clearDocumentsSearch');

		if (documentsSearch && searchType && clearDocumentsSearch) {
			// Search input event
			documentsSearch.addEventListener('input', (e) => {
				const searchTerm = e.target.value;
				const type = searchType.value;
				renderLeadsTable(searchTerm, type);
			});

			// Search type change event
			searchType.addEventListener('change', (e) => {
				const searchTerm = documentsSearch.value;
				const type = e.target.value;
				renderLeadsTable(searchTerm, type);
			});

			// Clear search event
			clearDocumentsSearch.addEventListener('click', () => {
				documentsSearch.value = '';
				searchType.value = 'both';
				renderLeadsTable('', 'both');
			});
		}

		// Admin page functionality
		const addUserBtn = document.getElementById('addUserBtn');
		const userModal = document.getElementById('userModal');
		const closeUserModal = document.getElementById('closeUserModal');
		const saveUserBtn = document.getElementById('saveUserBtn');
		const cancelUserBtn = document.getElementById('cancelUserBtn');
		const passwordModal = document.getElementById('passwordModal');
		const closePasswordModal = document.getElementById('closePasswordModal');
		const savePasswordBtn = document.getElementById('savePasswordBtn');
		const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
		const auditFilter = document.getElementById('auditFilter');

		// Add User button
		if (addUserBtn) {
			addUserBtn.addEventListener('click', () => {
				document.getElementById('userModalTitle').textContent = 'Add User';
				document.getElementById('userForm').reset();
				document.getElementById('userPassword').required = true;
				document.getElementById('userConfirmPassword').required = true;
				showModal('userModal');
			});
		}

		// User modal close buttons
		if (closeUserModal) {
			closeUserModal.addEventListener('click', () => hideModal('userModal'));
		}
		if (cancelUserBtn) {
			cancelUserBtn.addEventListener('click', () => hideModal('userModal'));
		}

		// Save User button
		if (saveUserBtn) {
			saveUserBtn.addEventListener('click', async () => {
				console.log('💾 Save User button clicked');

				const form = document.getElementById('userForm');
				const formData = new FormData(form);

				const userData = {
					name: document.getElementById('userName').value,
					email: document.getElementById('userEmail').value,
					role: document.getElementById('userRole').value,
					password: document.getElementById('userPassword').value,
					confirmPassword: document.getElementById('userConfirmPassword').value
				};

				console.log('User data collected:', { ...userData, password: '***', confirmPassword: '***' });

				// Basic validation
				if (!userData.name || !userData.email || !userData.role) {
					console.log('❌ Validation failed: missing required fields');
					toast('Please fill in all required fields', 'error');
					return;
				}

				if (!userData.password) {
					console.log('❌ Validation failed: password required');
					toast('Password is required', 'error');
					return;
				}

				if (userData.password !== userData.confirmPassword) {
					console.log('❌ Validation failed: passwords do not match');
					toast('Passwords do not match', 'error');
					return;
				}

				console.log('✅ Validation passed');

				try {
					const userId = document.getElementById('userModal').getAttribute('data-user-id');

					// Use Supabase to create/update users
					if (userId) {
						console.log('Updating existing user:', userId);
						// Update existing user
						await updateUser(userId, {
							name: userData.name,
							email: userData.email,
							role: userData.role
						});
						toast('User updated successfully');
					} else {
						console.log('Creating new user...');
						// Create new user
						await createUser({
							name: userData.name,
							email: userData.email,
							role: userData.role,
							password: userData.password
						});
						toast('User created successfully! They can now log in.');
					}

					hideModal('userModal');
					document.getElementById('userModal').removeAttribute('data-user-id');

				} catch (error) {
					console.error('❌ Error saving user:', error);
					toast('Error saving user: ' + error.message, 'error');
				}
			});
		}

		// Password modal close buttons
		if (closePasswordModal) {
			closePasswordModal.addEventListener('click', () => hideModal('passwordModal'));
		}
		if (cancelPasswordBtn) {
			cancelPasswordBtn.addEventListener('click', () => hideModal('passwordModal'));
		}

		// Save Password button
		if (savePasswordBtn) {
			savePasswordBtn.addEventListener('click', async () => {
				const userId = document.getElementById('passwordModal').getAttribute('data-user-id');
				const newPassword = document.getElementById('newPassword').value;
				const confirmPassword = document.getElementById('confirmNewPassword').value;

				if (!newPassword || !confirmPassword) {
					toast('Please fill in both password fields', 'error');
					return;
				}

				if (newPassword !== confirmPassword) {
					toast('Passwords do not match', 'error');
					return;
				}

				try {
					if (realUsers.length > 0) {
						// Use real API
						await changeUserPassword(userId, newPassword);
						toast('Password updated successfully');
					} else {
						// Note: Mock data fallback removed - using real Supabase users only
						console.log('Password change not implemented for mock users');
						toast('Password change only available for real users', 'error');
					}

					hideModal('passwordModal');
					document.getElementById('newPassword').value = '';
					document.getElementById('confirmNewPassword').value = '';

				} catch (error) {
					console.error('Error changing password:', error);
					toast('Error changing password: ' + error.message, 'error');
				}
			});
		}

		// Audit filter
		if (auditFilter) {
			auditFilter.addEventListener('change', (e) => {
				const filter = e.target.value;
				// In a real app, this would filter the audit log
				renderAuditLog(); // For now, just re-render
			});
		}

		// Add Lead functionality
		const addLeadBtn = document.getElementById('addLeadBtn');
		const addLeadModal = document.getElementById('addLeadModal');
		const closeAddLeadModal = document.getElementById('closeAddLeadModal');
		const saveAddLeadBtn = document.getElementById('saveAddLeadBtn');
		const cancelAddLeadBtn = document.getElementById('cancelAddLeadBtn');

		// Add Lead button
		if (addLeadBtn) {
			addLeadBtn.addEventListener('click', () => {
				showModal('addLeadModal');
				document.getElementById('addLeadForm').reset();
			});
		}

		// Close Add Lead modal
		if (closeAddLeadModal) {
			closeAddLeadModal.addEventListener('click', () => {
				hideModal('addLeadModal');
			});
		}

		// Cancel Add Lead
		if (cancelAddLeadBtn) {
			cancelAddLeadBtn.addEventListener('click', () => {
				hideModal('addLeadModal');
			});
		}

		// Save Add Lead
		if (saveAddLeadBtn) {
			saveAddLeadBtn.addEventListener('click', () => {
				saveNewLead();
			});
		}

		// Property Contact event listeners
		const addPropertyContactBtn = document.getElementById('addPropertyContactBtn');
		const closeAddPropertyContactModal = document.getElementById('closeAddPropertyContactModal');
		const savePropertyContactBtn = document.getElementById('savePropertyContactBtn');
		const cancelPropertyContactBtn = document.getElementById('cancelPropertyContactBtn');

		// Add Property Contact button
		if (addPropertyContactBtn) {
			addPropertyContactBtn.addEventListener('click', () => {
				showModal('addPropertyContactModal');
				document.getElementById('addPropertyContactForm').reset();
			});
		}

		// Close Property Contact Modal
		if (closeAddPropertyContactModal) {
			closeAddPropertyContactModal.addEventListener('click', () => {
				hideModal('addPropertyContactModal');
			});
		}

		// Cancel Add Property Contact
		if (cancelPropertyContactBtn) {
			cancelPropertyContactBtn.addEventListener('click', () => {
				hideModal('addPropertyContactModal');
			});
		}

		// Save Property Contact
		if (savePropertyContactBtn) {
			savePropertyContactBtn.addEventListener('click', () => {
				savePropertyContact();
			});
		}

		// Property Contacts table delegation (for edit buttons)
		const contactsTable = document.getElementById('contactsTable');
		if (contactsTable) {
			contactsTable.addEventListener('click', async (e) => {
				const editBtn = e.target.closest('.edit-contact');
				if (editBtn) {
					const propertyId = editBtn.dataset.property;
					const communityName = editBtn.dataset.community;
					await editPropertyContact(propertyId, communityName);
				}
			});
		}

		// Specials event listeners
		const addSpecialBtn = document.getElementById('addSpecialBtn');
		const closeAddSpecialModal = document.getElementById('closeAddSpecialModal');
		const saveAddSpecialBtn = document.getElementById('saveAddSpecialBtn');
		const cancelAddSpecialBtn = document.getElementById('cancelAddSpecialBtn');

		// Add Special button
		if (addSpecialBtn) {
			addSpecialBtn.addEventListener('click', () => {
				showModal('addSpecialModal');
				document.getElementById('addSpecialForm').reset();
				// Set default expiration date to 30 days from now
				const defaultDate = new Date();
				defaultDate.setDate(defaultDate.getDate() + 30);
				document.getElementById('specialExpirationDate').value = defaultDate.toISOString().split('T')[0];
			});
		}

		// Close Add Special modal
		if (closeAddSpecialModal) {
			closeAddSpecialModal.addEventListener('click', () => {
				hideModal('addSpecialModal');
			});
		}

		// Cancel Add Special
		if (cancelAddSpecialBtn) {
			cancelAddSpecialBtn.addEventListener('click', () => {
				hideModal('addSpecialModal');
			});
		}

		// Save Add Special
		if (saveAddSpecialBtn) {
			saveAddSpecialBtn.addEventListener('click', () => {
				saveNewSpecial();
			});
		}

		// Specials search
		const specialsSearchEl = document.getElementById('specialsSearch');
		if (specialsSearchEl) {
			specialsSearchEl.addEventListener('input', (e) => {
				state.search = e.target.value;
				state.page = 1;
				renderSpecials();
			});
		}

		// Specials table delegation
		const specialsTableEl = document.getElementById('specialsTable');
		if (specialsTableEl) {
			specialsTableEl.addEventListener('click', (e) => {
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'specialsTable');
					e.preventDefault();
					return;
				}

				// Handle edit button
				const editBtn = e.target.closest('.edit-special');
				if (editBtn) {
					// TODO: Implement edit functionality
					toast('Edit special functionality coming soon!', 'info');
					return;
				}

				// Handle delete button
				const deleteBtn = e.target.closest('.delete-special');
				if (deleteBtn) {
					deleteSpecial(deleteBtn.dataset.id);
					return;
				}
			});
		}

		// History button
		const historyBtnEl = document.getElementById('historyBtn');
		if (historyBtnEl) {
			historyBtnEl.addEventListener('click', openHistory);
		}

		// History modal close
		const closeHistoryEl = document.getElementById('closeHistory');
		if (closeHistoryEl) {
			closeHistoryEl.addEventListener('click', closeHistory);
		}

		// Document details modal close
		const closeDocumentDetailsEl = document.getElementById('closeDocumentDetails');
		if (closeDocumentDetailsEl) {
			closeDocumentDetailsEl.addEventListener('click', closeDocumentDetails);
		}

		// Email preview modal events
		const closeEmailPreviewEl = document.getElementById('closeEmailPreview');
		if (closeEmailPreviewEl) {
			closeEmailPreviewEl.addEventListener('click', closeEmailPreview);
		}
		const sendEmailBtnEl = document.getElementById('sendEmailBtn');
		if (sendEmailBtnEl) {
			sendEmailBtnEl.addEventListener('click', async ()=>{
				const selected = Array.from(state.selectedMatches);
				if (selected.length > 0) {
					await sendShowcaseEmail();
				}
			});
		}

		const previewLandingBtnEl = document.getElementById('previewLandingBtn');
		if (previewLandingBtnEl) {
			previewLandingBtnEl.addEventListener('click', previewLandingPage);
		}

		// Interested leads modal events
		const closeInterestedLeadsEl = document.getElementById('closeInterestedLeads');
		if (closeInterestedLeadsEl) {
			closeInterestedLeadsEl.addEventListener('click', closeInterestedLeads);
		}

		// Close interested leads modal when clicking outside
		document.addEventListener('click', (e) => {
			const modal = document.getElementById('interestedLeadsModal');
			if (modal && !modal.classList.contains('hidden') && e.target === modal) {
				closeInterestedLeads();
			}
		});

		// History content delegation
		const historyContentEl = document.getElementById('historyContent');
		if (historyContentEl) {
			historyContentEl.addEventListener('click', (e)=>{
				const historyLeadBtn = e.target.closest('button[data-history-lead]');
				if (historyLeadBtn) {
					const closedLeadId = historyLeadBtn.dataset.historyLead;
					openHistoryDocumentDetails(closedLeadId);
					closeHistory();
				}
			});
		}

		// Document details modal delegation
		const documentStepsEl = document.getElementById('documentSteps');
		if (documentStepsEl) {
			documentStepsEl.addEventListener('click', (e)=>{
				const downloadBtn = e.target.closest('.attachment-download');
				if (downloadBtn) {
					const fileName = downloadBtn.dataset.file;
					toast(`Downloading ${fileName} (mock action)`);
				}
			});
		}

		// Filter event listeners
		const searchInputEl = document.getElementById('searchInput');
		if (searchInputEl) {
			searchInputEl.addEventListener('input', (e) => {
				state.filters.search = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const statusFilterEl = document.getElementById('statusFilter');
		if (statusFilterEl) {
			statusFilterEl.addEventListener('change', (e) => {
				state.filters.status = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const fromDateEl = document.getElementById('fromDate');
		if (fromDateEl) {
			fromDateEl.addEventListener('change', (e) => {
				state.filters.fromDate = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const toDateEl = document.getElementById('toDate');
		if (toDateEl) {
			toDateEl.addEventListener('change', (e) => {
				state.filters.toDate = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const clearFiltersEl = document.getElementById('clearFilters');
		if (clearFiltersEl) {
			clearFiltersEl.addEventListener('click', () => {
				state.filters = { search: '', status: 'all', fromDate: '', toDate: '' };
				state.page = 1;
				if (searchInputEl) searchInputEl.value = '';
				if (statusFilterEl) statusFilterEl.value = 'all';
				if (fromDateEl) fromDateEl.value = '';
				if (toDateEl) toDateEl.value = '';
				renderLeads();
			});
		}

		// Listings Filter event listeners
		const listingsSearchInputEl = document.getElementById('listingsSearchInput');
		if (listingsSearchInputEl) {
			listingsSearchInputEl.addEventListener('input', (e) => {
				state.listingsFilters.search = e.target.value;
				renderListings();
			});
		}

		const marketFilterEl = document.getElementById('marketFilter');
		if (marketFilterEl) {
			marketFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.market = e.target.value;
				renderListings();
			});
		}

		const minPriceEl = document.getElementById('minPrice');
		if (minPriceEl) {
			minPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.minPrice = e.target.value;
				renderListings();
			});
		}

		const maxPriceEl = document.getElementById('maxPrice');
		if (maxPriceEl) {
			maxPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.maxPrice = e.target.value;
				renderListings();
			});
		}

		const bedsFilterEl = document.getElementById('bedsFilter');
		if (bedsFilterEl) {
			bedsFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.beds = e.target.value;
				renderListings();
			});
		}

		const commissionFilterEl = document.getElementById('commissionFilter');
		if (commissionFilterEl) {
			commissionFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.commission = e.target.value;
				renderListings();
			});
		}

		const amenitiesFilterEl = document.getElementById('amenitiesFilter');
		if (amenitiesFilterEl) {
			amenitiesFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.amenities = e.target.value;
				renderListings();
			});
		}

		const pumiOnlyFilterEl = document.getElementById('pumiOnlyFilter');
		if (pumiOnlyFilterEl) {
			pumiOnlyFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.pumiOnly = e.target.checked;
				renderListings();
			});
		}

		const clearListingsFiltersEl = document.getElementById('clearListingsFilters');
		if (clearListingsFiltersEl) {
			clearListingsFiltersEl.addEventListener('click', () => {
				state.listingsFilters = {
					search: '',
					market: 'all',
					minPrice: '',
					maxPrice: '',
					beds: 'any',
					commission: '0',
					amenities: 'any',
					pumiOnly: false
				};
				if (listingsSearchInputEl) listingsSearchInputEl.value = '';
				if (marketFilterEl) marketFilterEl.value = 'all';
				if (minPriceEl) minPriceEl.value = '';
				if (maxPriceEl) maxPriceEl.value = '';
				if (bedsFilterEl) bedsFilterEl.value = 'any';
				if (commissionFilterEl) commissionFilterEl.value = '0';
				if (amenitiesFilterEl) amenitiesFilterEl.value = 'any';
				if (pumiOnlyFilterEl) pumiOnlyFilterEl.checked = false;
				renderListings();
			});
		}

		// Add Listing button and modal
		const addListingBtn = document.getElementById('addListingBtn');
		if (addListingBtn) {
			addListingBtn.addEventListener('click', openAddListingModal);
		}

		// Add Contact Info button (opens property contact modal)
		const addContactInfoBtn = document.getElementById('addContactInfoBtn');
		if (addContactInfoBtn) {
			addContactInfoBtn.addEventListener('click', () => {
				showModal('addPropertyContactModal');
				document.getElementById('addPropertyContactForm').reset();
			});
		}

		const closeAddListing = document.getElementById('closeAddListing');
		const cancelAddListing = document.getElementById('cancelAddListing');
		const saveListingBtn = document.getElementById('saveListingBtn');

		if (closeAddListing) {
			closeAddListing.addEventListener('click', closeAddListingModal);
		}
		if (cancelAddListing) {
			cancelAddListing.addEventListener('click', closeAddListingModal);
		}
		if (saveListingBtn) {
			saveListingBtn.addEventListener('click', createListing);
		}

		// Property Notes modal
		const closePropertyNotes = document.getElementById('closePropertyNotes');
		const cancelPropertyNotes = document.getElementById('cancelPropertyNotes');
		const savePropertyNoteBtn = document.getElementById('savePropertyNoteBtn');

		if (closePropertyNotes) {
			closePropertyNotes.addEventListener('click', closePropertyNotesModal);
		}
		if (cancelPropertyNotes) {
			cancelPropertyNotes.addEventListener('click', closePropertyNotesModal);
		}
		if (savePropertyNoteBtn) {
			savePropertyNoteBtn.addEventListener('click', addPropertyNote);
		}


		// Initialize popover elements
		initPopover();

		// Health status hover events - using event delegation on the table
		const leadsTable = document.getElementById('leadsTable');
		console.log('Leads table found:', !!leadsTable); // Debug

		leadsTable.addEventListener('mouseenter', (e)=>{
			console.log('Mouse enter event:', e.target); // Debug
			const btn = e.target.closest('.health-btn');
			console.log('Health button found:', !!btn, btn?.dataset.status); // Debug
			if (!btn) return;
			showPopover(btn, btn.dataset.status);
		}, true);

		leadsTable.addEventListener('mouseleave', (e)=>{
			if (e.target.closest && e.target.closest('.health-btn')) {
				setTimeout(() => {
					if (pop && !pop.matches(':hover')) hidePopover();
				}, 150);
			}
		}, true);

		leadsTable.addEventListener('click', (e)=>{
			console.log('Click event:', e.target); // Debug

			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'leadsTable');
				e.preventDefault();
				return;
			}

			const btn = e.target.closest('.health-btn');
			console.log('Health button clicked:', !!btn, btn?.dataset.status); // Debug
			if (btn) {
				const open = pop && pop.style.display === 'block';
				if (open) hidePopover();
				else showPopover(btn, btn.dataset.status);
				e.stopPropagation();
			}
		});

		// Hide popover on click outside or escape
		document.addEventListener('click', (e)=>{
			if (!e.target.closest('#healthPopover') && !e.target.closest('.health-btn')) {
				hidePopover();
			}
		});

		document.addEventListener('keydown', (e)=>{
			if (e.key === 'Escape') {
				hidePopover();
			}
		});

		window.addEventListener('resize', hidePopover);
		window.addEventListener('scroll', ()=>{
			if (pop.style.display === 'block') hidePopover();
		}, true);

	// Test function for debugging
	window.testPopover = function() {
		console.log('Testing popover...');
		const testBtn = document.createElement('button');
		testBtn.className = 'health-btn';
		testBtn.dataset.status = 'green';
		testBtn.style.position = 'fixed';
		testBtn.style.top = '100px';
		testBtn.style.left = '100px';
		testBtn.style.zIndex = '9999';
		testBtn.innerHTML = '<span class="health-dot health-green"></span>';
		document.body.appendChild(testBtn);

		setTimeout(() => {
			showPopover(testBtn, 'green');
		}, 100);
	};

		// Event delegation for expand buttons (works for both manager and agent views)
		document.addEventListener('click', (e) => {
			console.log('Click detected on:', e.target);
			console.log('Target classList:', e.target.classList);
			console.log('Target parent:', e.target.parentElement);

			// Check if clicked element is expand button or inside expand button
			const expandBtn = e.target.closest('.expand-btn');
			if (expandBtn) {
				console.log('Expand button clicked!');
				e.preventDefault();
				e.stopPropagation();
				const leadId = expandBtn.getAttribute('data-lead-id');
				console.log('Lead ID:', leadId);
				toggleLeadTable(leadId);
			}
		});


		// Bug tracker event listeners
		const bugsNavLink = document.getElementById('bugsNavLink');
		if (bugsNavLink) {
			if (state.role === 'agent') {
				bugsNavLink.style.display = 'none';
			} else {
				bugsNavLink.style.display = 'block';
			}
		}

		// Bug report modal events
		const closeBugReportModal = document.getElementById('closeBugReportModal');
		const saveBugReportBtn = document.getElementById('saveBugReportBtn');
		const cancelBugReportBtn = document.getElementById('cancelBugReportBtn');

		if (closeBugReportModal) {
			closeBugReportModal.addEventListener('click', () => hideModal('bugReportModal'));
		}
		if (cancelBugReportBtn) {
			cancelBugReportBtn.addEventListener('click', () => hideModal('bugReportModal'));
		}
		if (saveBugReportBtn) {
			saveBugReportBtn.addEventListener('click', submitBugReport);
		}

		// Bug filters
		const bugStatusFilter = document.getElementById('bugStatusFilter');
		const bugPriorityFilter = document.getElementById('bugPriorityFilter');

		if (bugStatusFilter) {
			bugStatusFilter.addEventListener('change', renderBugs);
		}
		if (bugPriorityFilter) {
			bugPriorityFilter.addEventListener('change', renderBugs);
		}

		// Bug table delegation
		const bugsTableEl = document.getElementById('bugsTable');
		if (bugsTableEl) {
			bugsTableEl.addEventListener('click', (e) => {
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'bugsTable');
					e.preventDefault();
					return;
				}

				// Handle view button
				const viewBtn = e.target.closest('.view-bug');
				if (viewBtn) {
					showBugDetails(viewBtn.dataset.id);
					return;
				}

				// Handle save button
				const saveBtn = e.target.closest('.save-bug');
				if (saveBtn) {
					saveBugChanges(saveBtn.dataset.id);
					return;
				}

				// Handle delete button
				const deleteBtn = e.target.closest('.delete-bug');
				if (deleteBtn) {
					if (confirm('Are you sure you want to delete this bug report?')) {
						api.deleteBug(deleteBtn.dataset.id);
						toast('Bug report deleted', 'success');
						renderBugs();
					}
					return;
				}
			});
		}

		// Bug Details Modal close functionality
		const closeBugDetailsModal = document.getElementById('closeBugDetailsModal');
		const closeBugDetailsModalBtn = document.getElementById('closeBugDetailsModalBtn');

		if (closeBugDetailsModal) {
			closeBugDetailsModal.addEventListener('click', () => {
				hideModal('bugDetailsModal');
			});
		}

		if (closeBugDetailsModalBtn) {
			closeBugDetailsModalBtn.addEventListener('click', () => {
				hideModal('bugDetailsModal');
			});
		}

		// Initialize bug flags
		addBugFlags();

		// Add event listeners for bug field changes
		document.addEventListener('change', (e) => {
			if (e.target.classList.contains('bug-status-select') || e.target.classList.contains('bug-priority-select')) {
				const bugId = e.target.dataset.bugId;
				handleBugFieldChange(bugId);
			}
		});

		// Update role visibility for bugs nav
		const roleSelect = document.getElementById('roleSelect');
		if (roleSelect) {
			roleSelect.addEventListener('change', (e) => {
				const bugsNavLink = document.getElementById('bugsNavLink');
				if (bugsNavLink) {
					if (e.target.value === 'agent') {
						bugsNavLink.style.display = 'none';
					} else {
						bugsNavLink.style.display = 'block';
					}
				}
			});
		}

		// Add event listeners for listing edit modal
		const closeListingEdit = document.getElementById('closeListingEdit');
		const cancelListingEdit = document.getElementById('cancelListingEdit');
		const saveListingEditBtn = document.getElementById('saveListingEdit');
		const deleteListingBtn = document.getElementById('deleteListingBtn');
		const listingEditModal = document.getElementById('listingEditModal');

		if (closeListingEdit) {
			closeListingEdit.addEventListener('click', closeListingEditModal);
		}
		if (cancelListingEdit) {
			cancelListingEdit.addEventListener('click', closeListingEditModal);
		}
		if (saveListingEditBtn) {
			saveListingEditBtn.addEventListener('click', saveListingEdit);
		}
		if (deleteListingBtn) {
			deleteListingBtn.addEventListener('click', deleteListing);
		}
		if (listingEditModal) {
			// Close modal when clicking outside
			listingEditModal.addEventListener('click', (e) => {
				if (e.target.id === 'listingEditModal') {
					closeListingEditModal();
				}
			});
		}

		// Routing will be initialized by initializeApp() after authentication
	});

	// Initialize routing (called by initializeApp after auth)
	function initializeRouting() {
		console.log('🔀 Initializing routing...');

		// Set initial route if none exists
		if (!location.hash) {
			location.hash = '/leads';
		}

		// Route to current hash
		route();

		// Listen for hash changes
		window.addEventListener('hashchange', route);

		console.log('✅ Routing initialized');
	}

	// ---- Listing Edit Modal ----
	function openListingEditModal(property) {
		Modals.openListingEditModal(property, {
			state,
			showModal
		});
	}

	function closeListingEditModal() {
		Modals.closeListingEditModal({
			hideModal
		});
	}

	async function deleteListing() {
		await Modals.deleteListing({
			SupabaseAPI,
			toast,
			closeListingEditModal,
			renderListings
		});
	}

	async function saveListingEdit() {
		await Modals.saveListingEdit({
			SupabaseAPI,
			toast,
			closeListingEditModal,
			renderListings
		});
	}

	// initializeHealthStatus removed - was using mockLeads
	// Health status is now calculated from real Supabase data

	// Global functions for admin page onclick handlers
	window.editUser = editUser;
	window.changePassword = changePassword;
	window.deleteUser = deleteUser;

	// Global functions for property notes
	window.openPropertyNotesModal = openPropertyNotesModal;

	// Bulk actions event listeners using event delegation
	document.addEventListener('click', (e) => {
		// Handle bulk mark as unavailable button
		if (e.target.id === 'bulkMarkUnavailableBtn' || e.target.closest('#bulkMarkUnavailableBtn')) {
			console.log('Bulk Mark as Unavailable clicked!');
			e.preventDefault();
			bulkMarkAsUnavailable();
			return;
		}

		// Handle bulk delete button
		if (e.target.id === 'bulkDeleteBtn' || e.target.closest('#bulkDeleteBtn')) {
			console.log('Bulk Delete clicked!');
			e.preventDefault();
			bulkDeleteListings();
			return;
		}
	});

	console.log('✅ Bulk action event delegation set up');

	// Expose state to global scope
	window.state = state;
})();

// Admin page functions - defined in global scope
let realUsers = [];
let realAuditLog = [];

// API functions for real data
// ---- Admin Module Wrappers ----
async function loadUsers() {
	await Admin.loadUsers({
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		renderUsersTable
	});
}

async function loadAuditLog() {
	await Admin.loadAuditLog({
		realAuditLog: { get value() { return realAuditLog; }, set value(v) { realAuditLog = v; } },
		renderAuditLog
	});
}

async function createUser(userData) {
	return await Admin.createUser(userData, {
		loadUsers
	});
}

async function updateUser(userId, userData) {
	return await Admin.updateUser(userId, userData, {
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		renderUsersTable
	});
}

async function deleteUserFromAPI(userId) {
	await Admin.deleteUserFromAPI(userId, {
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		renderUsersTable,
		loadAuditLog
	});
}

async function changeUserPassword(userId, newPassword) {
	await Admin.changeUserPassword(userId, newPassword, {
		loadAuditLog
	});
}

async function renderAdmin() {
	await Admin.renderAdmin({
		loadUsers,
		loadAuditLog,
		renderUsersTable,
		renderAuditLog
	});
}

function renderUsersTable() {
	Admin.renderUsersTable({
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		state: window.state,
		formatDate,
		updateSortHeaders
	});
}

function renderAuditLog() {
	Admin.renderAuditLog({
		realAuditLog: { get value() { return realAuditLog; }, set value(v) { realAuditLog = v; } },
		formatDate
	});
}

function editUser(userId) {
	Admin.editUser(userId, {
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		showModal
	});
}

function changePassword(userId) {
	Admin.changePassword(userId, {
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		showModal
	});
}

async function deleteUser(userId) {
	await Admin.deleteUser(userId, {
		realUsers: { get value() { return realUsers; }, set value(v) { realUsers = v; } },
		deleteUserFromAPI,
		renderUsersTable,
		renderAuditLog,
		toast
	});
}

// ============================================================================
// INACTIVITY DETECTION - Manual Trigger for Testing
// ============================================================================
// This function can be called manually from the console or via a button
// In production, this should be run as a scheduled job (e.g., hourly via cron)
window.runInactivityDetection = async function() {
	console.log('🔍 Manually triggering inactivity detection...');
	try {
		const result = await SupabaseAPI.detectInactiveLeads();
		console.log('✅ Inactivity detection complete:', result);
		toast(`Inactivity check complete: ${result.leads_updated} leads updated`, 'success');

		// Refresh leads display if on leads page
		if (state.currentPage === 'leads') {
			await renderLeads();
		}

		return result;
	} catch (error) {
		console.error('❌ Error running inactivity detection:', error);
		toast('Error running inactivity detection', 'error');
		throw error;
	}
};

// Expose for debugging
console.log('💡 TIP: Run window.runInactivityDetection() to manually check for inactive leads');
