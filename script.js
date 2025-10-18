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
	hide
} from './src/utils/helpers.js';

// Import state management
import {
	state
} from './src/state/state.js';

// Import mock data (TEMPORARY - will be removed in Phase 2B)
import {
	mockAgents as mockAgentsOriginal,
	mockLeads,
	mockInterestedLeads,
	mockProperties,
	mockSpecials,
	mockBugs,
	mockDocumentStatuses,
	mockClosedLeads,
	prefsSummary
} from './src/state/mockData.js';

// Import Supabase API (for real data)
import * as SupabaseAPI from './src/api/supabase-api.js';

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================
const USE_MOCK_DATA = false; // ✅ NOW USING REAL SUPABASE DATA!
const API_BASE = null; // Not using REST API, using Supabase directly

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
	const existingLeads = USE_MOCK_DATA ? mockLeads : state.leads || [];

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

	// Add to mock data or call API
	if (USE_MOCK_DATA) {
		api.createSpecial(newSpecial);
		toast('Special added successfully!', 'success');
		hideModal('addSpecialModal');
		renderSpecials(); // Refresh the specials list
	} else {
		// In production, this would call the API
		createSpecialAPI(newSpecial);
	}
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
		if (USE_MOCK_DATA) {
			api.deleteSpecial(specialId);
			toast('Special deleted successfully!', 'success');
			renderSpecials(); // Refresh the specials list
		} else {
			deleteSpecialAPI(specialId);
		}
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

	// ---- Mock Data ----
	// Note: All mock data (mockAgents, mockLeads, mockProperties, etc.) is imported from src/state/mockData.js
	// prefsSummary and randomDate helper functions are also imported from there

	// Real agents loaded from Supabase (replaces mockAgents)
	let mockAgents = mockAgentsOriginal; // Start with mock data, will be replaced with real data

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

	// Health calculation function
	function calculateHealthStatus(lead) {
		const now = new Date();
		const leadAge = now - new Date(lead.submitted_at);
		let healthScore = 100; // Start with perfect health

		// Get proper current step info
		const currentStep = getProperCurrentStep(lead);
		const stepHours = getStepHours(lead, currentStep);

		// Time-based deductions
		if (leadAge > 24 * 60 * 60 * 1000 && !lead.showcase_sent_at) {
			healthScore -= 20; // No showcase sent in 24h
		}

		if (lead.showcase_sent_at && leadAge > 72 * 60 * 60 * 1000 && !lead.showcase_response_at) {
			healthScore -= 30; // No response to showcase in 72h
		}

		if (lead.lease_sent_at && leadAge > 48 * 60 * 60 * 1000 && !lead.lease_signed_at) {
			healthScore -= 40; // Lease pending signature for 48h
		}

		if (leadAge > 120 * 60 * 60 * 1000 && !lead.tour_scheduled_at) {
			healthScore -= 25; // No tour scheduled in 5 days
		}

		if (leadAge > 168 * 60 * 60 * 1000 && !lead.last_activity_at) {
			healthScore -= 50; // No activity for 7 days
		}

		// Document step timing deductions (3-day rule)
		if (currentStep !== 'New Lead' && currentStep !== 'Completed') {
			if (stepHours > 72) { // 3 days
				healthScore -= 25; // Major deduction for being stuck on step
			} else if (stepHours > 48) { // 2 days
				healthScore -= 15; // Moderate deduction
			} else if (stepHours > 24) { // 1 day
				healthScore -= 5; // Minor deduction
			}
		}

		// Event-based adjustments
		lead.events?.forEach(event => {
			const eventImpacts = {
				'SHOWCASE_OPENED': 1,
				'SHOWCASE_CLICKED': 2,
				'TOUR_SCHEDULED': 3,
				'LEASE_SIGNED': 5,
				'PAYMENT_RECEIVED': 10,
				'EMAIL_BOUNCED': -2,
				'NO_SHOW_TOUR': -3,
				'LEASE_DECLINED': -5,
				'COMPETITOR_CHOSEN': -8
			};

			if (eventImpacts[event.type]) {
				healthScore += eventImpacts[event.type];
			}
		});

		// Document progress bonus
		const docProgress = getDocumentProgress(lead.id);
		healthScore += (docProgress * 0.2); // Up to 20 points for full progress

		// Ensure score stays within bounds
		healthScore = Math.max(0, Math.min(100, healthScore));

		// Determine final status
		if (healthScore >= 80) return 'green';
		if (healthScore >= 50) return 'yellow';
		if (healthScore >= 20) return 'red';
		return 'lost';
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
	function getHealthMessages(lead) {
		const now = new Date();
		const leadAge = now - new Date(lead.submitted_at);
		const hoursAgo = Math.floor(leadAge / (60 * 60 * 1000));

		// Get proper current step and timing
		const currentStep = getProperCurrentStep(lead);
		const timeOnCurrentStep = getTimeOnCurrentStep(lead);

		if (lead.health_status === 'green') {
			return [
				`✅ Lead is actively engaged`,
				`📄 Current step: ${currentStep}`,
				`⏰ Time on current step: ${timeOnCurrentStep}`,
				`📅 Last activity: ${formatTimeAgo(lead.last_activity_at)}`
			];
		}

		if (lead.health_status === 'yellow') {
			const messages = [`⚠️ Needs attention`];

			messages.push(`📄 Current step: ${currentStep}`);
			messages.push(`⏰ Time on current step: ${timeOnCurrentStep}`);

			// Add step-specific warnings
			if (currentStep !== 'New Lead' && currentStep !== 'Completed') {
				const stepHours = getStepHours(lead, currentStep);
				if (stepHours > 72) { // 3 days
					messages.push(`⏰ On ${currentStep} for ${Math.floor(stepHours/24)}d ${stepHours%24}h - needs action`);
				}
			}

			if (!lead.showcase_sent_at && hoursAgo > 24) {
				messages.push(`📧 No showcase sent in ${hoursAgo}h - send immediately`);
			}

			if (lead.showcase_sent_at && !lead.showcase_response_at && hoursAgo > 72) {
				messages.push(`📞 No response to showcase in ${hoursAgo}h - follow up needed`);
			}

			if (!lead.tour_scheduled_at && hoursAgo > 120) {
				messages.push(`📅 No tour scheduled in ${hoursAgo}h - schedule tour`);
			}

			messages.push(`🎯 Recommended action: ${getRecommendedAction(lead)}`);
			return messages;
		}

		if (lead.health_status === 'red') {
			const messages = [`🚨 Urgent action required`];

			messages.push(`📄 Current step: ${currentStep}`);
			messages.push(`⏰ Time on current step: ${timeOnCurrentStep}`);

			// Add urgent step warnings
			if (currentStep !== 'New Lead' && currentStep !== 'Completed') {
				const stepHours = getStepHours(lead, currentStep);
				if (stepHours > 72) { // 3 days
					messages.push(`🚨 On ${currentStep} for ${Math.floor(stepHours/24)}d ${stepHours%24}h - URGENT`);
				}
			}

			if (lead.lease_sent_at && !lead.lease_signed_at) {
				const leaseHours = Math.floor((now - new Date(lead.lease_sent_at)) / (60 * 60 * 1000));
				messages.push(`⏰ Lease pending signature for ${leaseHours}h`);
			}

			if (lead.showcase_sent_at && !lead.showcase_response_at) {
				const showcaseHours = Math.floor((now - new Date(lead.showcase_sent_at)) / (60 * 60 * 1000));
				messages.push(`📧 No response to showcase for ${showcaseHours}h`);
			}

			messages.push(`🔥 Immediate action: ${getUrgentAction(lead)}`);
			return messages;
		}

		if (lead.health_status === 'closed') {
			return [
				`🎉 Lead successfully closed!`,
				`📄 Final step: ${currentStep}`,
				`📅 Closed on: ${formatDate(lead.closed_at || lead.last_activity_at)}`,
				`⭐ Final health score: ${lead.health_score}/100`
			];
		}

		return [
			`❌ Lead lost`,
			`📄 Last step: ${currentStep}`,
			`📅 Lost on: ${formatDate(lead.lost_at || lead.last_activity_at)}`,
			`💭 Reason: ${lead.loss_reason || 'No reason provided'}`
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

	function renderHealthStatus(status, lead = null) {
		// Calculate health status if lead is provided
		if (lead) {
			const calculatedStatus = calculateHealthStatus(lead);
			lead.health_status = calculatedStatus;
			lead.health_score = Math.max(0, Math.min(100, lead.health_score || 100));
			lead.health_updated_at = new Date().toISOString();
		}

		const finalStatus = lead ? lead.health_status : status;

		if (finalStatus === 'green') {
			return `<button class="health-btn" data-status="green" aria-label="Healthy" data-lead-id="${lead?.id || ''}"><span class="health-dot health-green"></span></button>`;
		}
		if (finalStatus === 'yellow') {
			return `<button class="health-btn" data-status="yellow" aria-label="Warm" data-lead-id="${lead?.id || ''}"><span class="health-dot health-yellow"></span></button>`;
		}
		if (finalStatus === 'red') {
			return `<button class="health-btn" data-status="red" aria-label="At Risk" data-lead-id="${lead?.id || ''}"><span class="health-dot health-red"></span></button>`;
		}
		if (finalStatus === 'closed') {
			return `<button class="health-btn" data-status="closed" aria-label="Closed" data-lead-id="${lead?.id || ''}"><span class="health-icon health-check"><svg viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg></span></button>`;
		}
		return `<button class="health-btn" data-status="lost" aria-label="Lost" data-lead-id="${lead?.id || ''}"><span class="health-icon health-lost"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button>`;
	}

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
		const lead = leadId ? mockLeads.find(l => l.id === leadId) : null;

		console.log('Showing popover for status:', status, 'lead:', lead?.name); // Debug

		if (lead) {
			// Use dynamic messages
			const messages = getHealthMessages(lead);
			popTitle.textContent = `Status — ${STATUS_LABEL[status] || status} (${lead.health_score}/100)`;
			popList.innerHTML = messages.map(s => `<li>${s}</li>`).join('');
		} else {
			// Fallback to legacy messages
		popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
		popList.innerHTML = healthMessages[status].map(s => `<li>${s}</li>`).join('');
		}

		const r = anchor.getBoundingClientRect();
		const top = r.bottom + 10;
		let left = r.left - 12;
		if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
		if (left < 8) left = 8;
		pop.style.top = `${Math.round(top)}px`;
		pop.style.left = `${Math.round(left)}px`;
		pop.style.display = 'block';
		console.log('Popover should be visible now'); // Debug
	}

	function hidePopover() {
		if (pop) pop.style.display = 'none';
	}

	// ---- Agent Statistics ----
	function getAgentStats(agentId) {
		const assignedLeads = mockLeads.filter(l => l.assigned_agent_id === agentId);
		const now = new Date();
		const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

		// Mock closed leads (in real app, this would come from a separate table)
		const closedLeads = assignedLeads.filter(l => {
			const submittedDate = new Date(l.submitted_at);
			return submittedDate >= ninetyDaysAgo && Math.random() > 0.7; // 30% chance of being "closed"
		});

		return {
			assigned: assignedLeads.length,
			closed: closedLeads.length
		};
	}

	// ---- Real API Layer ----
	// Use Supabase for data storage
	// Note: USE_MOCK_DATA and API_BASE are now defined at the top of the file

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
			if (!USE_MOCK_DATA) {
				// Use real Supabase data
				console.log('✅ Using Supabase for leads');
				return await SupabaseAPI.getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters });
			}

			// Fallback to mock data
			if (USE_MOCK_DATA) {
				console.log('Using mock data for leads, count:', mockLeads.length);

				// Apply filters to mock data
				let filteredLeads = [...mockLeads];

				// Apply status filter
				if (filters.status && filters.status !== 'all') {
					filteredLeads = filteredLeads.filter(lead => lead.health_status === filters.status);
				}

				// Apply date filters
				if (filters.fromDate) {
					const fromDate = new Date(filters.fromDate);
					filteredLeads = filteredLeads.filter(lead => new Date(lead.submitted_at) >= fromDate);
				}

				if (filters.toDate) {
					const toDate = new Date(filters.toDate);
					toDate.setHours(23, 59, 59, 999); // End of day
					filteredLeads = filteredLeads.filter(lead => new Date(lead.submitted_at) <= toDate);
				}

				// Apply search filter
				if (search) {
					const searchLower = search.toLowerCase();
					filteredLeads = filteredLeads.filter(lead =>
						lead.name.toLowerCase().includes(searchLower) ||
						lead.email.toLowerCase().includes(searchLower) ||
						lead.phone.includes(search)
					);
				}

				// Apply sorting
				if (sortKey && sortDir && sortDir !== 'none') {
					filteredLeads.sort((a, b) => {
						let aVal, bVal;

						if (sortKey === 'name') {
							aVal = a.name.toLowerCase();
							bVal = b.name.toLowerCase();
						} else if (sortKey === 'health_status') {
							aVal = a.health_status;
							bVal = b.health_status;
						} else if (sortKey === 'submitted_at') {
							aVal = new Date(a.submitted_at);
							bVal = new Date(b.submitted_at);
						} else if (sortKey === 'assigned_agent_id') {
							const agentA = mockAgents.find(agent => agent.id === a.assigned_agent_id);
							const agentB = mockAgents.find(agent => agent.id === b.assigned_agent_id);
							aVal = agentA ? agentA.name : 'Unassigned';
							bVal = agentB ? agentB.name : 'Unassigned';
						} else {
							return 0;
						}

						// Handle date sorting
				if (sortKey === 'submitted_at') {
							return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
						} else {
							// Text sorting
							if (sortDir === 'asc') {
								return aVal.localeCompare(bVal);
							} else {
								return bVal.localeCompare(aVal);
							}
						}
					});
				}

				return {
					items: filteredLeads,
					total: filteredLeads.length
				};
			}

			const params = new URLSearchParams({
				role,
				agentId,
				search,
				sortKey,
				sortDir,
				page,
				pageSize,
				...filters
			});

			const response = await fetch(`${API_BASE}/leads?${params}`);
			return handleResponse(response);
		},

		async getLead(id) {
			if (!USE_MOCK_DATA) {
				// Use real Supabase data
				console.log('✅ Using Supabase for getLead');
				return await SupabaseAPI.getLead(id);
			}

			// Fallback to mock data
			if (USE_MOCK_DATA) {
				return mockLeads.find(lead => lead.id === id) || mockLeads[0];
			}

			const response = await fetch(`${API_BASE}/leads/${id}`);
			return handleResponse(response);
		},

		async assignLead(id, agent_id) {
			if (!USE_MOCK_DATA) {
				// Use real Supabase data
				console.log('✅ Using Supabase to assign lead');
				return await SupabaseAPI.updateLead(id, {
					assigned_agent_id: agent_id,
					updated_at: new Date().toISOString()
				});
			}

			const response = await fetch(`${API_BASE}/leads/${id}/assign`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ agent_id })
			});
			return handleResponse(response);
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
			if (USE_MOCK_DATA) {
				const interestedLeads = mockInterestedLeads[propertyId] || [];
				return interestedLeads.length;
			}

			try {
				const response = await fetch(`${API_BASE}/properties/${propertyId}/interests`);
				const interests = await handleResponse(response);
				return interests.length;
			} catch (error) {
				console.error('Error fetching interested leads count:', error);
				return 0;
			}
		},

		async getInterestedLeads(propertyId) {
			console.log('getInterestedLeads called with propertyId:', propertyId);
			if (USE_MOCK_DATA) {
				const data = mockInterestedLeads[propertyId] || [];
				console.log('Mock data for', propertyId, ':', data);
				return data;
			}

			try {
				const response = await fetch(`${API_BASE}/properties/${propertyId}/interests`);
				return await handleResponse(response);
			} catch (error) {
				console.error('Error fetching interested leads:', error);
				return [];
			}
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
			if (!USE_MOCK_DATA) {
				// Use real Supabase data
				console.log('✅ Using Supabase for specials');
				return await SupabaseAPI.getSpecials({ role, agentId, search, sortKey, sortDir, page, pageSize });
			}

			if (USE_MOCK_DATA) {
				console.log('Using mock data for specials, count:', mockSpecials.length);
				let filteredSpecials = [...mockSpecials];

				// Filter by agent if role is agent
				if (role === 'agent' && agentId) {
					filteredSpecials = filteredSpecials.filter(special => special.agent_id === agentId);
				}

				// Apply search filter
				if (search) {
					filteredSpecials = filteredSpecials.filter(special =>
						special.property_name.toLowerCase().includes(search.toLowerCase()) ||
						special.current_special.toLowerCase().includes(search.toLowerCase())
					);
				}

				// Apply sorting
				if (sortKey && sortDir) {
					filteredSpecials.sort((a, b) => {
						let aVal = a[sortKey];
						let bVal = b[sortKey];

						if (sortKey === 'expiration_date' || sortKey === 'created_at') {
							aVal = new Date(aVal);
							bVal = new Date(bVal);
						}

						if (sortDir === 'asc') {
							return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
						} else {
							return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
						}
					});
				}

				return {
					items: filteredSpecials,
					total: filteredSpecials.length
				};
			}

			const params = new URLSearchParams({
				role,
				agentId,
				search,
				sortKey,
				sortDir,
				page,
				pageSize
			});

			const response = await fetch(`${API_BASE}/specials?${params}`);
			return handleResponse(response);
		},

		async createSpecial(specialData) {
			if (USE_MOCK_DATA) {
				const newSpecial = {
					id: 'special_' + Date.now(),
					...specialData,
					created_at: new Date().toISOString()
				};
				mockSpecials.unshift(newSpecial); // Add to beginning for newest first
				return newSpecial;
			}

			const response = await fetch(`${API_BASE}/specials`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(specialData)
			});
			return handleResponse(response);
		},

		async updateSpecial(id, specialData) {
			if (USE_MOCK_DATA) {
				const index = mockSpecials.findIndex(s => s.id === id);
				if (index !== -1) {
					mockSpecials[index] = { ...mockSpecials[index], ...specialData };
					return mockSpecials[index];
				}
				throw new Error('Special not found');
			}

			const response = await fetch(`${API_BASE}/specials/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(specialData)
			});
			return handleResponse(response);
		},

		async deleteSpecial(id) {
			if (USE_MOCK_DATA) {
				const index = mockSpecials.findIndex(s => s.id === id);
				if (index !== -1) {
					mockSpecials.splice(index, 1);
					return { success: true };
				}
				throw new Error('Special not found');
			}

			const response = await fetch(`${API_BASE}/specials/${id}`, {
				method: 'DELETE'
			});
			return handleResponse(response);
		},

		// Bug API functions
		async getBugs({ status, priority, page, pageSize } = {}) {
			if (USE_MOCK_DATA) {
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
			}

			const response = await fetch(`${API_BASE}/bugs?${new URLSearchParams({ status, priority, page, pageSize })}`);
			return handleResponse(response);
		},

		async createBug(bugData) {
			if (USE_MOCK_DATA) {
				const newBug = {
					id: `bug_${Date.now()}`,
					...bugData,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				};
				mockBugs.unshift(newBug);
				return newBug;
			}

			// Create FormData for file upload
			const formData = new FormData();

			// Add all bug data fields
			Object.keys(bugData).forEach(key => {
				if (key === 'screenshot' && bugData[key]) {
					// Handle file upload
					formData.append('screenshot', bugData[key]);
				} else if (key === 'technical_context') {
					// Stringify JSON fields
					formData.append(key, JSON.stringify(bugData[key]));
				} else if (bugData[key] !== null && bugData[key] !== undefined) {
					formData.append(key, bugData[key]);
				}
			});

			const response = await fetch(`${API_BASE}/bugs`, {
				method: 'POST',
				body: formData
			});
			return handleResponse(response);
		},

		async updateBug(id, bugData) {
			if (USE_MOCK_DATA) {
				const index = mockBugs.findIndex(b => b.id === id);
				if (index !== -1) {
					mockBugs[index] = { ...mockBugs[index], ...bugData, updated_at: new Date().toISOString() };
					return mockBugs[index];
				}
				throw new Error('Bug not found');
			}

			const response = await fetch(`${API_BASE}/bugs/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bugData)
			});
			return handleResponse(response);
		},

		async deleteBug(id) {
			if (USE_MOCK_DATA) {
				const index = mockBugs.findIndex(b => b.id === id);
				if (index !== -1) {
					mockBugs.splice(index, 1);
					return { success: true };
				}
				throw new Error('Bug not found');
			}

			const response = await fetch(`${API_BASE}/bugs/${id}`, {
				method: 'DELETE'
			});
			return handleResponse(response);
		}
	};

	// ---- Rendering: Leads Table ----
	renderLeads = async function(){
		console.log('renderLeads called'); // Debug
		const tbody = document.getElementById('leadsTbody');
		console.log('tbody element:', tbody); // Debug
		const { items, total } = await api.getLeads({
			role: state.role,
			agentId: state.agentId,
			search: state.search,
			sortKey: state.sort.key,
			sortDir: state.sort.dir,
			page: state.page,
			pageSize: state.pageSize,
			filters: state.filters
		});
		console.log('API returned:', { items, total }); // Debug
		tbody.innerHTML = '';

		// Fetch notes counts for all leads (if using Supabase)
		const notesCountsPromises = !USE_MOCK_DATA ? items.map(lead =>
			SupabaseAPI.getLeadNotesCount(lead.id).then(count => ({ leadId: lead.id, count }))
		) : [];
		const notesCounts = !USE_MOCK_DATA ? await Promise.all(notesCountsPromises) : [];
		const notesCountMap = {};
		notesCounts.forEach(({ leadId, count }) => {
			notesCountMap[leadId] = count;
		});

		items.forEach(lead => {
			const notesCount = notesCountMap[lead.id] || 0;
			const notesIcon = notesCount > 0 ? `<span class="notes-icon" data-lead-id="${lead.id}" style="cursor: pointer; font-size: 16px; color: #fbbf24; margin-left: 8px;" title="${notesCount} comment(s)">📝</span>` : '';

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>
					<a href="#" class="lead-name" data-id="${lead.id}">${lead.name}</a>${notesIcon}
					<div class="subtle mono">${lead.email} · ${lead.phone}</div>
				</td>
				<td><button class="action-btn secondary" data-view="${lead.id}" title="View/Edit Details">View/Edit</button></td>
				<td data-sort="health_status">${renderHealthStatus(lead.health_status, lead)}</td>
				<td class="mono" data-sort="submitted_at">${formatDate(lead.submitted_at)}</td>
				<td class="mono">
					<span class="badge-dot"><span class="dot"></span>${prefsSummary(lead.prefs)}</span>
				</td>
				<td><button class="icon-btn showcase-btn" data-matches="${lead.id}" title="Top Listing Options">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
						<path d="M9 9h6v6H9z"/>
						<path d="M9 3v6"/>
						<path d="M9 15v6"/>
						<path d="M15 3v6"/>
						<path d="M15 15v6"/>
						<path d="M3 9h6"/>
						<path d="M15 9h6"/>
						<path d="M3 15h6"/>
						<path d="M15 15h6"/>
					</svg>
				</button></td>
				<td data-sort="assigned_agent_id">
					${state.role === 'manager' ? renderAgentSelect(lead) : renderAgentReadOnly(lead)}
				</td>
			`;
			tbody.appendChild(tr);
		});

		// Add click listeners for notes icons
		document.querySelectorAll('.notes-icon').forEach(icon => {
			icon.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const leadId = e.target.dataset.leadId;
				// Get lead name for modal title
				const lead = await api.getLead(leadId);
				openLeadNotesModal(leadId, lead.name);
			});
		});

		// Debug: Check if health buttons exist
		const healthButtons = document.querySelectorAll('.health-btn');
		console.log('Health buttons found:', healthButtons.length);
		document.getElementById('pageInfo').textContent = `Page ${state.page} · ${total} total`;

		// Update sort headers
		updateSortHeaders('leadsTable');
	}

	function renderAgentSelect(lead){
		const opts = mockAgents.map(a => `<option value="${a.id}" ${a.id===lead.assigned_agent_id?'selected':''}>${a.name}</option>`).join('');
		return `<select class="select" data-assign="${lead.id}"><option value="">Unassigned</option>${opts}</select>`;
	}
	function renderAgentReadOnly(lead){
		const a = mockAgents.find(a => a.id === lead.assigned_agent_id);
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

	// Mock data for progress tracking
	const mockProgressLeads = [
		{
			id: 'lead_1',
			leadName: 'Sarah Johnson',
			agentName: 'Alex Agent',
			agentEmail: 'alex@trecrm.com',
			currentStep: 3,
			lastUpdated: '2024-01-15T10:30:00Z',
			status: 'current',
			property: {
				name: 'The Howard',
				address: '123 Main St, Austin, TX',
				rent: '$1,200/month',
				bedrooms: 1,
				bathrooms: 1
			},
		showcase: {
			sent: true,
			landingPageUrl: 'https://tre-crm.vercel.app/landing.html?showcase=lead_1&lead=Sarah%20Johnson&agent=Alex%20Agent&properties=the-howard,community-2',
			selections: ['The Howard', 'Community 2'],
			calendarDates: ['2024-01-20', '2024-01-22']
		},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_1'
			},
			lease: {
				sent: false,
				signed: false,
				finalized: false,
				property: 'The Howard',
				apartment: 'Unit 205'
			}
		},
		{
			id: 'lead_2',
			leadName: 'Mike Chen',
			agentName: 'Bailey Broker',
			agentEmail: 'bailey@trecrm.com',
			currentStep: 5,
			lastUpdated: '2024-01-14T15:45:00Z',
			status: 'current',
			property: {
				name: 'Waterford Park',
				address: '456 Oak Ave, Dallas, TX',
				rent: '$1,400/month',
				bedrooms: 2,
				bathrooms: 2
			},
		showcase: {
			sent: true,
			landingPageUrl: 'https://tre-crm.vercel.app/landing.html?showcase=lead_2&lead=Mike%20Chen&agent=Bailey%20Broker&properties=waterford-park',
			selections: ['Waterford Park'],
			calendarDates: ['2024-01-18']
		},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_2'
			},
			lease: {
				sent: true,
				signed: false,
				finalized: false,
				property: 'Waterford Park',
				apartment: 'Unit 312'
			}
		},
		{
			id: 'lead_3',
			leadName: 'Emily Davis',
			agentName: 'Alex Agent',
			agentEmail: 'alex@trecrm.com',
			currentStep: 7,
			lastUpdated: '2024-01-13T09:20:00Z',
			status: 'completed',
			property: {
				name: 'Community 1',
				address: '789 Pine St, Houston, TX',
				rent: '$1,100/month',
				bedrooms: 1,
				bathrooms: 1
			},
		showcase: {
			sent: true,
			landingPageUrl: 'https://tre-crm.vercel.app/landing.html?showcase=lead_3&lead=Emily%20Davis&agent=Alex%20Agent&properties=community-1',
			selections: ['Community 1'],
			calendarDates: ['2024-01-15']
		},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_3'
			},
			lease: {
				sent: true,
				signed: true,
				finalized: true,
				property: 'Community 1',
				apartment: 'Unit 101'
			}
		}
	];

	// Mock data for specials
	const mockSpecials = [
		{
			id: 'special_1',
			property_name: 'The Howard',
			current_special: 'First month free + $500 off security deposit',
			commission_rate: '8%',
			expiration_date: '2024-02-15',
			agent_id: 'agent_1',
			agent_name: 'Alex Agent',
			created_at: '2024-01-10T09:00:00Z'
		},
		{
			id: 'special_2',
			property_name: 'Waterford Park',
			current_special: 'Move-in special: $200 off first month rent',
			commission_rate: '6%',
			expiration_date: '2024-02-28',
			agent_id: 'agent_2',
			agent_name: 'Bailey Broker',
			created_at: '2024-01-12T14:30:00Z'
		},
		{
			id: 'special_3',
			property_name: 'Community 1',
			current_special: 'Limited time: Waived application fee + $300 credit',
			commission_rate: '7%',
			expiration_date: '2024-01-31',
			agent_id: 'agent_1',
			agent_name: 'Alex Agent',
			created_at: '2024-01-08T11:15:00Z'
		},
		{
			id: 'special_4',
			property_name: 'The Heights',
			current_special: 'New Year special: 2 months free parking + gym membership',
			commission_rate: '5%',
			expiration_date: '2024-03-01',
			agent_id: 'agent_3',
			agent_name: 'Chris Consultant',
			created_at: '2024-01-05T16:45:00Z'
		}
	];

	// Mock data for bugs
	const mockBugs = [
		{
			id: 'bug_1',
			title: 'Table sorting not working on Listings page',
			description: 'When I click on column headers in the Listings table, the rows don\'t reorder properly.',
			expected: 'Rows should sort by the selected column (ascending/descending)',
			steps: '1. Go to Listings page\n2. Click on "Rent Range" column header\n3. Notice rows don\'t sort',
			status: 'pending',
			priority: 'high',
			category: 'functionality',
			page: 'listings',
			page_url: '#/listings',
			reported_by: 'Sarah Johnson',
			reported_by_id: 'agent_1',
			created_at: '2024-01-25T10:30:00Z',
			updated_at: '2024-01-25T10:30:00Z',
			assigned_to: null,
			resolution_notes: null,
			technical_context: {
				browser: 'Chrome 120.0.6099.109',
				user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				screen_resolution: '1920x1080',
				viewport: '1920x937',
				role: 'manager',
				agent_id: 'agent_1'
			}
		},
		{
			id: 'bug_2',
			title: 'Mobile navigation cuts off on small screens',
			description: 'On mobile devices, the right side of the navigation bar gets cut off and I can\'t see "Admin" or the role dropdown.',
			expected: 'All navigation items should be visible and accessible on mobile',
			steps: '1. Open app on mobile device\n2. Look at navigation bar\n3. Notice "Admin" and role dropdown are cut off',
			status: 'resolved',
			priority: 'medium',
			category: 'ui',
			page: 'global',
			page_url: 'all pages',
			reported_by: 'Mike Chen',
			reported_by_id: 'agent_2',
			created_at: '2024-01-24T15:45:00Z',
			updated_at: '2024-01-25T09:15:00Z',
			assigned_to: 'Developer',
			resolution_notes: 'Added horizontal scroll to navigation on mobile devices',
			technical_context: {
				browser: 'Safari Mobile 17.2',
				user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
				screen_resolution: '375x812',
				viewport: '375x667',
				role: 'agent',
				agent_id: 'agent_2'
			}
		},
		{
			id: 'bug_3',
			title: 'Test bug with screenshot attachment',
			description: 'This is a test bug report to demonstrate the screenshot functionality. The image should be visible when viewing bug details.',
			expected: 'Screenshot should display properly in the bug details view',
			steps: '1. Submit a bug report with screenshot\n2. View bug details\n3. Screenshot should be visible',
			status: 'pending',
			priority: 'low',
			category: 'ui',
			page: 'bugs',
			page_url: '#/bugs',
			reported_by: 'Test User',
			reported_by_id: 'test_user',
			created_at: '2024-01-26T10:00:00Z',
			updated_at: '2024-01-26T10:00:00Z',
			assigned_to: null,
			resolution_notes: null,
			screenshot: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz4KPHRleHQgeD0iMjAwIiB5PSIxNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U2NyZWVuc2hvdCBFeGFtcGxlPC90ZXh0Pgo8L3N2Zz4K',
			technical_context: {
				browser: 'Chrome 120.0.6099.109',
				user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
				screen_resolution: '1920x1080',
				viewport: '1920x937',
				role: 'manager',
				agent_id: 'test_user'
			}
		}
	];

	// Progress steps configuration
	const progressSteps = [
		{ id: 1, label: 'Showcase Sent', key: 'showcaseSent' },
		{ id: 2, label: 'Lead Responded', key: 'leadResponded' },
		{ id: 3, label: 'Guest Card Sent', key: 'guestCardSent' },
		{ id: 4, label: 'Property Selected', key: 'propertySelected' },
		{ id: 5, label: 'Lease Sent', key: 'leaseSent' },
		{ id: 6, label: 'Lease Signed', key: 'leaseSigned' },
		{ id: 7, label: 'Lease Finalized', key: 'leaseFinalized' }
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

	function getStepModalContent(lead, step) {
		switch(step.id) {
			case 1: // Showcase Sent
				return `
					<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="modal-details"><strong>Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<a href="${lead.showcase.landingPageUrl}" target="_blank" class="modal-link">View Landing Page →</a>
				`;

			case 2: // Lead Responded
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="modal-details"><strong>Properties Selected:</strong> ${lead.showcase.selections.join(', ')}</div>
					<div class="modal-details"><strong>Preferred Tour Dates:</strong> ${lead.showcase.calendarDates.join(', ')}</div>
					<div class="modal-details"><strong>Response Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<div class="modal-details"><strong>Status:</strong> Lead has shown interest and selected properties</div>
					<a href="${lead.showcase.landingPageUrl}?filled=true&selections=${encodeURIComponent(lead.showcase.selections.join(','))}&dates=${encodeURIComponent(lead.showcase.calendarDates.join(','))}" target="_blank" class="modal-link">View Filled Landing Page →</a>
				`;

			case 3: { // Guest Card Sent
				const guestCardUrl = `https://tre-crm.vercel.app/guest-card.html?lead=${encodeURIComponent(lead.leadName)}&agent=${encodeURIComponent(lead.agentName)}&property=${encodeURIComponent(lead.showcase.selections.join(','))}&date=${encodeURIComponent(formatDate(lead.lastUpdated))}&agentPhone=210-391-4044&phoneNumber=210-579-6189&moveInDate=ASAP&bedrooms=${lead.property.bedrooms}&bathrooms=${lead.property.bathrooms}&priceRange=${lead.property.rent}&agentNotes=Guest card sent for property tour scheduling`;
				return `
					<div class="modal-details"><strong>Lead:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="modal-details"><strong>Properties:</strong> ${lead.showcase.selections.join(', ')}</div>
					<div class="modal-details"><strong>Sent Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<div class="modal-details"><strong>Status:</strong> Guest card prepared and sent to properties</div>
					<a href="${guestCardUrl}" target="_blank" class="modal-link">View Filled Guest Card →</a>
				`;
			}

			case 4: // Property Selected
				return `
					<div class="modal-details"><strong>Property:</strong> ${lead.property.name}</div>
					<div class="modal-details"><strong>Address:</strong> ${lead.property.address}</div>
					<div class="modal-details"><strong>Rent:</strong> ${lead.property.rent}</div>
					<div class="modal-details"><strong>Size:</strong> ${lead.property.bedrooms}bd/${lead.property.bathrooms}ba</div>
				`;

			case 5: // Lease Sent
				return `
					<div class="modal-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<a href="https://tre-crm.vercel.app/lease/lead_${lead.id}" target="_blank" class="modal-link">View Lease →</a>
				`;

			case 6: // Lease Signed
				return `
					<div class="modal-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="modal-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<div class="modal-details"><strong>Signed by:</strong> Property Management</div>
					<a href="https://tre-crm.vercel.app/lease-signed/lead_${lead.id}" target="_blank" class="modal-link">View Signed Lease →</a>
				`;

			case 7: // Lease Finalized
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

	function showStepDetails(lead, step) {
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
		content.innerHTML = getStepModalContent(lead, step);

		// Show modal
		modal.classList.add('show');
	}

	function viewLeadDetails(leadId) {
		const lead = mockProgressLeads.find(l => l.id === leadId);
		if (!lead) return;

		const currentStep = progressSteps[lead.currentStep - 1];
		showStepDetails(lead, currentStep);
	}

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
	async function renderDocuments(){
		if (state.role === 'agent') {
			renderAgentDocuments();
		} else {
			renderManagerDocuments();
		}
	}

	async function renderManagerDocuments(){
		// Show manager view, hide agent view
		document.getElementById('managerDocumentsView').classList.remove('hidden');
		document.getElementById('agentDocumentsView').classList.add('hidden');

		// Render progress table
		renderProgressTable('documentsTbody', mockProgressLeads);
	}

	async function renderAgentDocuments(){
		// Show agent view, hide manager view
		document.getElementById('managerDocumentsView').classList.add('hidden');
		document.getElementById('agentDocumentsView').classList.remove('hidden');

		// Filter leads for agent view
		const agentLeads = mockProgressLeads.filter(lead => lead.agentName === 'Alex Agent');
		renderProgressTable('agentDocumentsTbody', agentLeads);
	}

	// ---- Rendering: Specials Table ----
	renderSpecials = async function(){
		console.log('renderSpecials called');
		const tbody = document.getElementById('specialsTbody');
		if (!tbody) return;

		const { items, total } = await api.getSpecials({
			role: state.role,
			agentId: state.agentId,
			search: state.search,
			sortKey: state.sort.key,
			sortDir: state.sort.dir,
			page: state.page,
			pageSize: state.pageSize
		});

		console.log('Specials API returned:', { items, total });
		tbody.innerHTML = '';

		items.forEach(special => {
			const tr = document.createElement('tr');
			const isExpired = new Date(special.expiration_date) < new Date();
			const expiresSoon = new Date(special.expiration_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

			tr.innerHTML = `
				<td data-sort="property_name">
					<div class="special-property-name">${special.property_name}</div>
					${isExpired ? '<div class="special-expired">EXPIRED</div>' : ''}
					${expiresSoon && !isExpired ? '<div class="special-expires-soon">Expires Soon</div>' : ''}
				</td>
				<td>
					<div class="special-description">${special.current_special}</div>
				</td>
				<td data-sort="commission_rate" class="mono">${special.commission_rate}</td>
				<td data-sort="expiration_date" class="mono ${isExpired ? 'expired' : ''}">${formatDate(special.expiration_date)}</td>
				<td data-sort="agent_name" class="mono">${special.agent_name}</td>
				<td data-sort="created_at" class="mono">${formatDate(special.created_at)}</td>
				<td>
					<div class="action-buttons">
						<button class="icon-btn edit-special" data-id="${special.id}" title="Edit">✏️</button>
						<button class="icon-btn delete-special" data-id="${special.id}" title="Delete">🗑️</button>
					</div>
				</td>
			`;

			tbody.appendChild(tr);
		});

		// Update sort headers
		updateSortHeaders('specialsTable');
	}

	// ---- Bug Tracker Functions ----
	async function renderBugs() {
		console.log('renderBugs called');
		const tbody = document.getElementById('bugsTbody');
		if (!tbody) return;

		const statusFilter = document.getElementById('bugStatusFilter')?.value || '';
		const priorityFilter = document.getElementById('bugPriorityFilter')?.value || '';

		const { items, total } = await api.getBugs({
			status: statusFilter,
			priority: priorityFilter
		});

		console.log('Bugs API returned:', { items, total });
		tbody.innerHTML = '';

		items.forEach(bug => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td data-sort="id" class="mono">${bug.id}</td>
				<td data-sort="title">
					<div style="font-weight: 600; margin-bottom: 4px;">${bug.title}</div>
					<div style="font-size: 12px; color: var(--muted);">${bug.category}</div>
				</td>
				<td data-sort="status">
					<select class="bug-status-select" data-bug-id="${bug.id}" data-field="status">
						<option value="pending" ${bug.status === 'pending' ? 'selected' : ''}>Pending</option>
						<option value="in_progress" ${bug.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
						<option value="resolved" ${bug.status === 'resolved' ? 'selected' : ''}>Resolved</option>
						<option value="closed" ${bug.status === 'closed' ? 'selected' : ''}>Closed</option>
					</select>
				</td>
				<td data-sort="priority">
					<select class="bug-priority-select" data-bug-id="${bug.id}" data-field="priority">
						<option value="low" ${bug.priority === 'low' ? 'selected' : ''}>Low</option>
						<option value="medium" ${bug.priority === 'medium' ? 'selected' : ''}>Medium</option>
						<option value="high" ${bug.priority === 'high' ? 'selected' : ''}>High</option>
						<option value="critical" ${bug.priority === 'critical' ? 'selected' : ''}>Critical</option>
					</select>
				</td>
				<td data-sort="page" class="mono">${bug.page}</td>
				<td data-sort="reported_by" class="mono">${bug.reported_by}</td>
				<td data-sort="created_at" class="mono">${formatDate(bug.created_at)}</td>
				<td>
					<div class="action-buttons">
						<button class="icon-btn view-bug" data-id="${bug.id}" title="View Details">👁️</button>
						<button class="icon-btn save-bug" data-id="${bug.id}" title="Save Changes" style="display: none;">💾</button>
						<button class="icon-btn delete-bug" data-id="${bug.id}" title="Delete">🗑️</button>
					</div>
				</td>
			`;
			tbody.appendChild(tr);
		});
	}

	function showBugReportModal(context = {}) {
		// Pre-fill context data
		document.getElementById('bugTitle').value = context.title || '';
		document.getElementById('bugDescription').value = context.description || '';
		document.getElementById('bugSteps').value = context.steps || '';

		// Store context for submission
		window.currentBugContext = {
			page: context.page || state.currentPage,
			page_url: context.page_url || location.hash,
			reported_by: state.role === 'agent' ? 'Current Agent' : 'Manager',
			reported_by_id: state.agentId || 'unknown',
			technical_context: {
				browser: navigator.userAgent,
				screen_resolution: `${screen.width}x${screen.height}`,
				viewport: `${window.innerWidth}x${window.innerHeight}`,
				role: state.role,
				agent_id: state.agentId
			}
		};

		showModal('bugReportModal');
	}

	async function submitBugReport() {
		const title = document.getElementById('bugTitle').value.trim();
		const description = document.getElementById('bugDescription').value.trim();
		const expected = document.getElementById('bugExpected').value.trim();
		const steps = document.getElementById('bugSteps').value.trim();
		const priority = document.getElementById('bugPriority').value;
		const category = document.getElementById('bugCategory').value;
		const screenshotFile = document.getElementById('bugScreenshot').files[0];

		if (!title || !description) {
			toast('Please fill in the required fields', 'error');
			return;
		}

		// Get current user context
		const currentUser = window.currentUser;
		const currentPage = getCurrentPageName();

		const bugData = {
			title,
			description,
			expected: expected || null,
			steps: steps || null,
			priority,
			category,
			status: 'pending',
			page: currentPage,
			page_url: window.location.href,
			reported_by: currentUser?.id || 'unknown',
			reported_by_name: currentUser?.name || 'Unknown User',
			technical_context: {
				userAgent: navigator.userAgent,
				screenResolution: `${screen.width}x${screen.height}`,
				viewport: `${window.innerWidth}x${window.innerHeight}`,
				url: window.location.href,
				timestamp: new Date().toISOString(),
				browser: getBrowserInfo(),
				os: getOSInfo()
			},
			screenshot: screenshotFile // Pass file directly for real API
		};

		try {
			await api.createBug(bugData);
			toast('Bug report submitted successfully!', 'success');
			hideModal('bugReportModal');
			document.getElementById('bugReportForm').reset();

			// Refresh bugs table if we're on the bugs page
			if (state.currentPage === 'bugs') {
				renderBugs();
			}
		} catch (error) {
			toast('Error submitting bug report: ' + error.message, 'error');
		}
	}

	// Helper function to get current page name
	function getCurrentPageName() {
		const hash = window.location.hash;
		if (hash.includes('#/leads')) return 'Leads';
		if (hash.includes('#/listings')) return 'Listings';
		if (hash.includes('#/documents')) return 'Documents';
		if (hash.includes('#/admin')) return 'Admin';
		if (hash.includes('#/specials')) return 'Specials';
		if (hash.includes('#/bugs')) return 'Bugs';
		return 'Home';
	}

	// Helper function to get browser info
	function getBrowserInfo() {
		const ua = navigator.userAgent;
		if (ua.includes('Chrome')) return 'Chrome';
		if (ua.includes('Firefox')) return 'Firefox';
		if (ua.includes('Safari')) return 'Safari';
		if (ua.includes('Edge')) return 'Edge';
		return 'Unknown';
	}

	// Helper function to get OS info
	function getOSInfo() {
		const ua = navigator.userAgent;
		if (ua.includes('Windows')) return 'Windows';
		if (ua.includes('Mac')) return 'macOS';
		if (ua.includes('Linux')) return 'Linux';
		if (ua.includes('Android')) return 'Android';
		if (ua.includes('iOS')) return 'iOS';
		return 'Unknown';
	}

	function addBugFlags() {
		// Remove existing flags
		document.querySelectorAll('.bug-flag').forEach(flag => flag.remove());

		// Add single flag that adapts to current page
		const flag = document.createElement('button');
		flag.className = 'bug-flag';
		flag.innerHTML = '🐛';
		flag.title = 'Report Bug';
		flag.style.display = 'none'; // Hidden by default

		flag.addEventListener('click', () => {
			const currentPage = state.currentPage || 'leads';
			const pageName = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

			console.log('Bug flag clicked on page:', currentPage); // Debug log

			showBugReportModal({
				page: currentPage,
				page_url: `#/${currentPage}`,
				title: `Issue on ${pageName} page`
			});
		});

		document.body.appendChild(flag);

		// Show flag for current page
		updateBugFlagVisibility();
	}

	function updateBugFlagVisibility() {
		const flag = document.querySelector('.bug-flag');
		if (!flag) return;

		// Hide flag on bugs page, show on all other pages
		const currentPage = state.currentPage;
		if (currentPage === 'bugs') {
			flag.style.display = 'none';
		} else {
			flag.style.display = 'flex';
		}
	}

	async function showBugDetails(bugId) {
		try {
			// Find bug in mock data
			const bug = mockBugs.find(b => b.id === bugId);
			if (!bug) {
				toast('Bug not found', 'error');
				return;
			}

			const content = document.getElementById('bugDetailsContent');
			content.innerHTML = `
				<div class="bug-details-section">
					<h4>🐛 ${bug.title}</h4>
					<p><strong>Status:</strong> <span class="bug-status ${bug.status}">${bug.status.replace('_', ' ')}</span></p>
					<p><strong>Priority:</strong> <span class="bug-priority ${bug.priority}">${bug.priority}</span></p>
					<p><strong>Category:</strong> ${bug.category}</p>
					<p><strong>Page:</strong> ${bug.page}</p>
					<p><strong>Reported by:</strong> ${bug.reported_by}</p>
					<p><strong>Created:</strong> ${formatDate(bug.created_at)}</p>
					<p><strong>Last updated:</strong> ${formatDate(bug.updated_at)}</p>
				</div>

				<div class="bug-details-section">
					<h4>Description</h4>
					<p>${bug.description}</p>
				</div>

				${bug.expected ? `
				<div class="bug-details-section">
					<h4>Expected Behavior</h4>
					<p>${bug.expected}</p>
				</div>
				` : ''}

				${bug.steps ? `
				<div class="bug-details-section">
					<h4>Steps to Reproduce</h4>
					<pre class="bug-context">${bug.steps}</pre>
				</div>
				` : ''}

				${bug.screenshot ? `
				<div class="bug-details-section">
					<h4>Screenshot</h4>
					<img src="${bug.screenshot}" alt="Bug screenshot" style="max-width: 100%; border: 1px solid var(--rule); border-radius: 6px;">
				</div>
				` : ''}

				<div class="bug-details-section">
					<h4>Technical Context</h4>
					<pre class="bug-context">Browser: ${bug.technical_context.browser}
Screen: ${bug.technical_context.screen_resolution}
Viewport: ${bug.technical_context.viewport}
Role: ${bug.technical_context.role}
Agent ID: ${bug.technical_context.agent_id}</pre>
				</div>

				${bug.resolution_notes ? `
				<div class="bug-details-section">
					<h4>Resolution Notes</h4>
					<p>${bug.resolution_notes}</p>
				</div>
				` : ''}
			`;

			showModal('bugDetailsModal');
		} catch (error) {
			toast('Error loading bug details: ' + error.message, 'error');
		}
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
		let activeLeads = mockLeads.filter(l => l.health_status !== 'closed' && l.health_status !== 'lost');

		// Apply search filter
		if (searchTerm.trim()) {
			activeLeads = activeLeads.filter(lead => {
				const agent = mockAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
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
			const agent = mockAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
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
		const agentLeads = mockLeads.filter(l => l.assigned_agent_id === state.agentId);

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
			const agent = mockAgents.find(a => a.id === agentId);
			if (agent && agentName === agent.name) {
				row.style.display = '';
			} else {
				row.style.display = 'none';
			}
		});
		toast(`Showing leads for ${mockAgents.find(a => a.id === agentId)?.name || 'Unknown Agent'}`);
	}

	function viewAgentDetails(agentId) {
		const agent = mockAgents.find(a => a.id === agentId);
		if (agent) {
			openAgentDrawer(agentId);
		}
	}

	function updateDocumentStatus(leadId) {
		toast('Document status update feature coming soon!');
	}

	// ---- Rendering: Agents Table ----
	async function renderAgents(){
		const tbody = document.getElementById('agentsTbody');
		tbody.innerHTML = '';

		// Apply sorting if active
		const agentsToRender = [...mockAgents];
		if (state.sort.key && state.sort.dir && state.sort.dir !== 'none') {
			agentsToRender.sort((a, b) => {
				const statsA = getAgentStats(a.id);
				const statsB = getAgentStats(b.id);

				let aVal, bVal;
				if (state.sort.key === 'name') {
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
				} else if (state.sort.key === 'leads_assigned') {
					aVal = statsA.assigned;
					bVal = statsB.assigned;
				} else if (state.sort.key === 'leads_closed') {
					aVal = statsA.closed;
					bVal = statsB.closed;
				} else {
					return 0;
				}

				if (state.sort.key === 'leads_assigned' || state.sort.key === 'leads_closed') {
					// Numeric sorting
					const aNum = parseInt(aVal) || 0;
					const bNum = parseInt(bVal) || 0;
					return state.sort.dir === 'asc' ? aNum - bNum : bNum - aNum;
				} else {
					// Text sorting
					if (state.sort.dir === 'asc') {
						return aVal.localeCompare(bVal);
					} else {
						return bVal.localeCompare(aVal);
					}
				}
			});
		}

		agentsToRender.forEach(agent => {
			const stats = getAgentStats(agent.id);
			// Generate landing page URL with agent slug (name-based)
			const agentSlug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			// Use Vercel production URL for landing pages
			const landingUrl = `https://tre-crm.vercel.app/landing/${agentSlug}`;

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td data-sort="name">
					<div class="lead-name">${agent.name}</div>
					<div class="subtle mono">${agent.email} · ${agent.phone}</div>
					${!agent.active ? '<span class="subtle" style="color: #dc2626;">Inactive</span>' : ''}
				</td>
				<td><button class="action-btn secondary" data-view-agent="${agent.id}" title="View Details">View</button></td>
				<td class="mono" data-sort="leads_assigned">${stats.assigned}</td>
				<td class="mono" data-sort="leads_closed">${stats.closed}</td>
				<td>
					<button class="action-btn secondary" data-view-landing="${landingUrl}" title="View Landing Page" style="margin-right: 8px;">
						<span style="margin-right: 4px;">🌐</span> View Page
					</button>
					<button class="action-btn secondary" data-copy-landing="${landingUrl}" title="Copy Landing Page URL">
						<span style="margin-right: 4px;">📋</span> Copy Link
					</button>
				</td>
				<td>
					<button class="action-btn" data-remove="${agent.id}">Remove Agent</button>
					<button class="action-btn" data-edit="${agent.id}">Change Info</button>
					<button class="action-btn" data-assign-leads="${agent.id}">Assign Leads</button>
				</td>
			`;
			tbody.appendChild(tr);
		});

		// Update sort headers
		updateSortHeaders('agentsTable');
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
		const form = document.getElementById('addListingForm');

		// Reset form
		if (form) {
			form.reset();
		}

		// Set default date to today
		const lastUpdatedInput = document.getElementById('listingLastUpdated');
		if (lastUpdatedInput) {
			lastUpdatedInput.valueAsDate = new Date();
		}

		showModal('addListingModal');
	}

	function closeAddListingModal() {
		hideModal('addListingModal');
	}

	async function createListing() {
		try {
			// Debug: Check current user state
			console.log('🔍 Current user state:', {
				agentId: state.agentId,
				currentUser: window.currentUser,
				userId: window.getUserId()
			});

			// Get form values
			const communityName = document.getElementById('listingCommunityName').value.trim();
			const streetAddress = document.getElementById('listingStreetAddress').value.trim();
			const market = document.getElementById('listingMarket').value;
			const zipCode = document.getElementById('listingZipCode').value.trim();
			const bedRange = document.getElementById('listingBedRange').value.trim();
			const bathRange = document.getElementById('listingBathRange').value.trim();
			const rentMin = parseInt(document.getElementById('listingRentMin').value);
			const rentMax = parseInt(document.getElementById('listingRentMax').value);
			const commission = parseFloat(document.getElementById('listingCommission').value);
			const amenitiesInput = document.getElementById('listingAmenities').value.trim();
			const isPUMI = document.getElementById('listingIsPUMI').checked;
			const lastUpdated = document.getElementById('listingLastUpdated').value;
			const contactEmail = document.getElementById('listingContactEmail').value.trim();
			const leasingLink = document.getElementById('listingLeasingLink').value.trim();
			const mapLat = document.getElementById('listingMapLat').value;
			const mapLng = document.getElementById('listingMapLng').value;
			const noteContent = document.getElementById('listingNotes').value.trim();

			// Validation
			if (!communityName || !streetAddress || !market || !zipCode || !bedRange || !bathRange || !rentMin || !rentMax || !commission) {
				toast('Please fill in all required fields', 'error');
				return;
			}

			if (rentMin >= rentMax) {
				toast('Rent Max must be greater than Rent Min', 'error');
				return;
			}

			// Parse amenities
			const amenities = amenitiesInput ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a) : [];

			// Geocode address if lat/lng not provided
			let lat = mapLat ? parseFloat(mapLat) : null;
			let lng = mapLng ? parseFloat(mapLng) : null;

			if (!lat || !lng) {
				console.log('🗺️ Geocoding address...');
				const coords = await geocodeAddress(streetAddress, market, zipCode);
				if (coords) {
					lat = coords.lat;
					lng = coords.lng;
					toast('Address geocoded successfully!', 'success');
				} else {
					// Address validation failed - reject the submission
					toast('Error: Invalid address. Please enter a valid street address.', 'error');
					return;
				}
			}

			// Get user email for created_by (public.users uses email as PK, not UUID)
			const userEmail = window.currentUser?.email || null;

			// Create property data
			const now = new Date().toISOString();
			const propertyData = {
				id: `prop_${Date.now()}`,
				// New schema fields
				community_name: communityName,
				street_address: streetAddress,
				city: market,
				market: market,
				zip_code: zipCode,
				bed_range: bedRange,
				bath_range: bathRange,
				rent_range_min: rentMin,
				rent_range_max: rentMax,
				commission_pct: commission,
				amenities: amenities,
				is_pumi: isPUMI,
				last_updated: lastUpdated || now,
				contact_email: contactEmail || null,
				leasing_link: leasingLink || null,
				map_lat: lat,
				map_lng: lng,
				created_by: userEmail,
				created_at: now,
				updated_at: now,
				// Old schema fields (for backward compatibility)
				name: communityName,
				address: streetAddress,
				// Also set lat/lng for old schema
				lat: lat,
				lng: lng
			};

			console.log('Creating property:', propertyData);

			// Create property in Supabase
			const newProperty = await SupabaseAPI.createProperty(propertyData);
			console.log('✅ Property created:', newProperty);

			// If there's a note, create it
			if (noteContent && userEmail) {
				const authorName = window.currentUser?.user_metadata?.name ||
								   window.currentUser?.email ||
								   'Unknown';
				const noteData = {
					property_id: newProperty.id,
					content: noteContent,
					author_id: userEmail,
					author_name: authorName
				};
				try {
					await SupabaseAPI.createPropertyNote(noteData);
					console.log('✅ Property note created');
				} catch (noteError) {
					console.error('❌ Error creating note (continuing anyway):', noteError);
					// Don't fail the whole operation if note creation fails
				}
			} else if (noteContent && !userEmail) {
				console.warn('⚠️ Cannot create note: user email not available');
			}

			toast('Listing created successfully!', 'success');
			closeAddListingModal();

			// Refresh listings
			await renderListings();
		} catch (error) {
			console.error('❌ Error creating listing:', error);
			console.error('Error details:', JSON.stringify(error, null, 2));
			const errorMsg = error.message || error.msg || 'Unknown error';
			toast(`Error creating listing: ${errorMsg}`, 'error');
		}
	}

	// ---- Lead Notes Functions ----
	async function loadLeadNotes(leadId) {
		if (USE_MOCK_DATA) {
			document.getElementById('leadNotesContent').innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
			return;
		}

		try {
			const notes = await SupabaseAPI.getLeadNotes(leadId);
			const notesContainer = document.getElementById('leadNotesContent');

			if (!notes || notes.length === 0) {
				notesContainer.innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
				return;
			}

			notesContainer.innerHTML = notes.map(note => `
				<div class="note-item" style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
						<strong style="color: #1f2937;">${note.author_name}</strong>
						<span class="subtle mono" style="font-size: 12px;">${formatDate(note.created_at)}</span>
					</div>
					<div style="color: #4b5563;">${note.content}</div>
				</div>
			`).join('');
		} catch (error) {
			console.error('Error loading lead notes:', error);
			document.getElementById('leadNotesContent').innerHTML = '<p class="subtle" style="color: #ef4444;">Error loading comments</p>';
		}
	}

	async function saveLeadNote() {
		console.log('🔵 saveLeadNote called');
		console.log('currentLeadForNotes:', currentLeadForNotes);

		const noteInput = document.getElementById('newLeadNote');
		const content = noteInput.value.trim();
		console.log('Note content:', content);

		if (!content) {
			toast('Please enter a comment', 'error');
			return;
		}

		if (!currentLeadForNotes) {
			toast('No lead selected', 'error');
			return;
		}

		if (USE_MOCK_DATA) {
			toast('Notes feature requires Supabase connection', 'error');
			return;
		}

		try {
			// Use window.currentUser.email as author_id (matches users table)
			const authorId = window.currentUser?.email;
			const authorName = window.currentUser?.user_metadata?.name ||
			                   window.currentUser?.email ||
			                   'Unknown User';

			console.log('👤 Current user:', window.currentUser);
			console.log('📧 Author ID:', authorId);
			console.log('👨 Author Name:', authorName);

			if (!authorId) {
				toast('User not authenticated', 'error');
				return;
			}

			const noteData = {
				lead_id: currentLeadForNotes,
				content: content,
				author_id: authorId,  // Use email, not UUID
				author_name: authorName
			};

			console.log('💾 Saving note data:', noteData);
			const result = await SupabaseAPI.createLeadNote(noteData);
			console.log('✅ Note saved successfully:', result);

			noteInput.value = '';

			// Reload notes in the modal
			console.log('🔄 Reloading notes in modal...');
			await loadLeadNotesInModal(currentLeadForNotes);

			// Refresh leads table to update note icon
			console.log('🔄 Refreshing leads table...');
			await renderLeads();

			toast('Comment added successfully!', 'success');
		} catch (error) {
			console.error('❌ Error saving lead note:', error);
			toast('Error saving comment', 'error');
		}
	}

	// ---- Property Notes Modal Functions ----
	let currentPropertyForNotes = null;

	async function openPropertyNotesModal(propertyId, propertyName) {
		currentPropertyForNotes = propertyId;

		const modal = document.getElementById('propertyNotesModal');
		const modalHeader = modal ? modal.querySelector('.modal-header h3') : null;
		if (modalHeader) {
			modalHeader.textContent = `📝 Notes: ${propertyName}`;
		}

		// Clear note input
		const noteInput = document.getElementById('newPropertyNote');
		if (noteInput) {
			noteInput.value = '';
		}

		// Load and display notes
		await loadPropertyNotes(propertyId);

		showModal('propertyNotesModal');
	}

	function closePropertyNotesModal() {
		hideModal('propertyNotesModal');
		currentPropertyForNotes = null;
	}

	async function loadPropertyNotes(propertyId) {
		try {
			const notes = await SupabaseAPI.getPropertyNotes(propertyId);
			const notesContent = document.getElementById('propertyNotesContent');

			if (notes.length === 0) {
				notesContent.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No notes yet. Add one below!</p>';
				return;
			}

			notesContent.innerHTML = notes.map(note => `
				<div class="note-item" style="border-bottom: 1px solid #e2e8f0; padding: 15px 0;">
					<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
						<div>
							<strong style="color: #1e293b;">${note.author_name}</strong>
							<span style="color: #64748b; font-size: 13px; margin-left: 10px;">
								${formatDate(note.created_at)}
							</span>
						</div>
					</div>
					<div style="color: #475569; line-height: 1.6;">
						${note.content}
					</div>
				</div>
			`).join('');
		} catch (error) {
			console.error('Error loading property notes:', error);
			toast('Error loading notes', 'error');
		}
	}

	async function addPropertyNote() {
		if (!currentPropertyForNotes) {
			toast('No property selected', 'error');
			return;
		}

		const noteContent = document.getElementById('newPropertyNote').value.trim();

		if (!noteContent) {
			toast('Please enter a note', 'error');
			return;
		}

		try {
			const noteData = {
				property_id: currentPropertyForNotes,
				content: noteContent,
				author_id: state.userId,
				author_name: state.userName || 'Unknown'
			};

			await SupabaseAPI.createPropertyNote(noteData);
			toast('Note added successfully!', 'success');

			// Clear input
			document.getElementById('newPropertyNote').value = '';

			// Reload notes
			await loadPropertyNotes(currentPropertyForNotes);

			// Refresh listings to update note icon
			await renderListings();
		} catch (error) {
			console.error('Error adding note:', error);
			toast(`Error adding note: ${error.message}`, 'error');
		}
	}

	// ---- Rendering: Listings Table ----
	async function renderListings(){
		const tbody = document.getElementById('listingsTbody');
		if (!tbody) {
			console.error('listingsTbody not found!');
			return;
		}

		try {
			// Fetch properties from Supabase
			const properties = await SupabaseAPI.getProperties({
				search: state.search,
				market: state.listingsFilters.market !== 'all' ? state.listingsFilters.market : null,
				minPrice: state.listingsFilters.minPrice,
				maxPrice: state.listingsFilters.maxPrice,
				beds: state.listingsFilters.beds !== 'any' ? state.listingsFilters.beds : null
			});

			// Filter out unavailable listings (is_available = false)
			const availableProperties = properties.filter(prop => {
				// If is_available field doesn't exist yet, assume available
				return prop.is_available !== false;
			});

			// Fetch notes count for each property (with error handling for missing table)
			const propertiesWithNotes = await Promise.all(
				availableProperties.map(async (prop) => {
					try {
						const notes = await SupabaseAPI.getPropertyNotes(prop.id);
						return { ...prop, notesCount: notes.length };
					} catch (error) {
						// If property_notes table doesn't exist yet, just return property without notes
						console.warn('Property notes not available yet (run migration)');
						return { ...prop, notesCount: 0 };
					}
				})
			);

			let filtered = propertiesWithNotes;

			// Apply additional filters
			filtered = filtered.filter(prop => matchesListingsFilters(prop, state.listingsFilters));

		// Apply sorting if active
		if (state.sort.key && state.sort.dir && state.sort.dir !== 'none') {
			filtered.sort((a, b) => {
				let aVal, bVal;

				if (state.sort.key === 'name') {
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
				} else if (state.sort.key === 'rent_min') {
					aVal = a.rent_min;
					bVal = b.rent_min;
				} else if (state.sort.key === 'commission_pct') {
					aVal = Math.max(a.escort_pct, a.send_pct);
					bVal = Math.max(b.escort_pct, b.send_pct);
				} else {
					return 0;
				}

				// Handle numeric sorting
				if (['rent_min', 'commission_pct'].includes(state.sort.key)) {
					const aNum = typeof aVal === 'number' ? aVal : parseFloat(aVal) || 0;
					const bNum = typeof bVal === 'number' ? bVal : parseFloat(bVal) || 0;
					return state.sort.dir === 'asc' ? aNum - bNum : bNum - aNum;
				} else {
					// Text sorting
					if (state.sort.dir === 'asc') {
						return aVal.localeCompare(bVal);
					} else {
						return bVal.localeCompare(aVal);
					}
				}
			});
		}

		tbody.innerHTML = '';
		console.log('Rendering', filtered.length, 'filtered properties');
		filtered.forEach((prop, index) => {
			console.log(`Property ${index + 1}:`, prop.name, 'isPUMI:', prop.isPUMI);

			const tr = document.createElement('tr');
			tr.dataset.propertyId = prop.id;

			// Add PUMI class for styling
			if (prop.isPUMI) {
				tr.classList.add('pumi-listing');
				console.log('Added pumi-listing class to:', prop.name);
			}

			const communityName = prop.community_name || prop.name;
			const address = prop.street_address || prop.address;
			const bedRange = prop.bed_range || `${prop.beds_min}-${prop.beds_max} bed`;
			const bathRange = prop.bath_range || `${prop.baths_min}-${prop.baths_max} bath`;
			const rentMin = prop.rent_range_min || prop.rent_min;
			const rentMax = prop.rent_range_max || prop.rent_max;
			const commission = prop.commission_pct || Math.max(prop.escort_pct || 0, prop.send_pct || 0);
			const isPUMI = prop.is_pumi || prop.isPUMI;
			const markedForReview = prop.mark_for_review || prop.markForReview;

			tr.innerHTML = `
				<td><input type="checkbox" class="listing-checkbox" data-listing-id="${prop.id}"></td>
				<td data-sort="name">
					<div class="lead-name">
						${communityName}
						${isPUMI ? '<span class="pumi-label">PUMI</span>' : ''}
						${markedForReview ? '<span class="review-flag" title="Marked for Review">🚩</span>' : ''}
					</div>
					<div class="subtle mono">${address}</div>
					<div class="community-details">
						<span class="market-info">${prop.market}</span>
						<span class="beds-baths">${bedRange} / ${bathRange}</span>
					</div>
					<div class="community-meta">
						<div class="listing-controls">
							${state.role === 'manager' ? `
								<div class="gear-icon" data-property-id="${prop.id}" data-property-name="${communityName}" title="Edit Listing & Mark PUMI">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #6b7280;">
										<path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
									</svg>
								</div>
							` : ''}
							<div class="interest-count" data-property-id="${prop.id}" data-property-name="${communityName}">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #ef4444;">
									<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
								</svg>
								<span>${mockInterestedLeads[prop.id] ? mockInterestedLeads[prop.id].length : 0}</span>
							</div>
							${prop.notesCount > 0 ? `
								<div class="notes-count" onclick="openPropertyNotesModal('${prop.id}', '${communityName.replace(/'/g, "\\'")}')" title="${prop.notesCount} note(s)" style="cursor: pointer;">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #3b82f6;">
										<path d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,5V19H19V12H12V5H5Z"/>
									</svg>
									<span>${prop.notesCount}</span>
								</div>
							` : ''}
						</div>
						<div class="last-updated">Updated: ${formatDate(prop.pricing_last_updated || prop.last_updated)}</div>
					</div>
				</td>
				<td class="mono" data-sort="rent_min">$${rentMin} - $${rentMax}</td>
				<td class="mono" data-sort="commission_pct">${commission}%</td>
			`;

			// Add click handler to table row
			tr.addEventListener('click', (e) => {
				// Don't trigger if clicking on gear icon or heart icon
				if (!e.target.closest('.gear-icon') && !e.target.closest('.interest-count')) {
				selectProperty(prop);
				}
			});

			// Add gear icon click handler (manager only)
			if (state.role === 'manager') {
				const gearIcon = tr.querySelector('.gear-icon');
				if (gearIcon) {
					gearIcon.addEventListener('click', (e) => {
						e.stopPropagation();
						openListingEditModal(prop);
					});
				}
			}

			// Add interest count click handler
			const interestCount = tr.querySelector('.interest-count');
			if (interestCount) {
				interestCount.addEventListener('click', (e) => {
					console.log('=== HEART ICON CLICKED ===');
					console.log('Property ID:', prop.id);
					console.log('Property Name:', prop.name);
					e.stopPropagation();
					openInterestedLeads(prop.id, prop.name);
				});
			}

			tbody.appendChild(tr);
		});

		// Update map - simplified marker addition
		if (map) {
			console.log('Map exists, clearing markers and adding new ones');
			clearMarkers();

			// Add markers directly (only for properties with valid coordinates)
			if (filtered.length > 0) {
				const validProps = filtered.filter(prop => prop.lat && prop.lng);
				console.log('Adding', validProps.length, 'markers to map (out of', filtered.length, 'total properties)');
				validProps.forEach(prop => {
					console.log('Adding marker for:', prop.name, 'at', prop.lng, prop.lat);
					try {
						addMarker(prop);
					} catch (error) {
						console.error('Error adding marker for', prop.name, ':', error);
					}
				});
			}
		} else {
			console.log('Map not available yet');
		}

		// Ensure map fills container after rendering
		setTimeout(() => {
			if (map) map.resize();
		}, 100);

		// Update sort headers
		updateSortHeaders('listingsTable');

		// Debug table column widths
		console.log('=== TABLE WIDTH DEBUG ===');
		const table = document.getElementById('listingsTable');
		if (table) {
			const cols = table.querySelectorAll('th');
			cols.forEach((col, i) => {
				console.log(`Column ${i + 1}:`, col.textContent.trim(), 'Width:', col.offsetWidth + 'px');
			});

			const firstCol = table.querySelector('th:first-child');
			if (firstCol) {
				console.log('First column computed style:', getComputedStyle(firstCol).width);
				console.log('First column offsetWidth:', firstCol.offsetWidth);
			}
		}
		} catch (error) {
			console.error('Error rendering listings:', error);
			toast('Error loading listings', 'error');
			tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Error loading listings. Please try again.</td></tr>';
		}
	}

	// ---- Lead Details Modal (Center-aligned) ----
	let currentLeadForNotes = null;

	async function openLeadDetailsModal(leadId){
		state.selectedLeadId = leadId;
		currentLeadForNotes = leadId;

		const lead = await api.getLead(leadId);
		const c = document.getElementById('leadDetailsContent');

		// Get agent names
		const foundBy = mockAgents.find(a => a.id === lead.found_by_agent_id)?.name || 'Unknown';
		const assignedTo = mockAgents.find(a => a.id === lead.assigned_agent_id)?.name || 'Unassigned';

		// Parse preferences (handle both JSON string and object)
		let prefs = lead.preferences || lead.prefs || {};
		if (typeof prefs === 'string') {
			try {
				prefs = JSON.parse(prefs);
			} catch (e) {
				console.error('Error parsing preferences:', e);
				prefs = {};
			}
		}

		c.innerHTML = `
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
				<div>
					<h4 style="margin-top: 0; color: #3b82f6;">📋 Contact Information</h4>
					<div class="field"><label>Name</label><div class="value">${lead.name || '—'}</div></div>
					<div class="field"><label>Email</label><div class="value">${lead.email || '—'}</div></div>
					<div class="field"><label>Phone</label><div class="value">${lead.phone || '—'}</div></div>
					<div class="field"><label>Best Time to Call</label><div class="value">${prefs.bestTimeToCall || prefs.best_time_to_call || '—'}</div></div>
					<div class="field"><label>Submitted</label><div class="value mono">${formatDate(lead.submitted_at || lead.created_at)}</div></div>
				</div>
				<div>
					<h4 style="margin-top: 0; color: #3b82f6;">👥 Agent Information</h4>
					<div class="field"><label>Found By Agent</label><div class="value" style="font-weight: 600; color: #10b981;">${foundBy}</div></div>
					<div class="field"><label>Currently Assigned To</label><div class="value">${state.role==='manager' ? renderAgentSelect(lead) : assignedTo}</div></div>
					<div class="field"><label>Source</label><div class="value">${lead.source || '—'}</div></div>
				</div>
			</div>
			<hr style="margin: 20px 0;">
			<h4 style="margin-top: 0; color: #3b82f6;">🏠 Preferences</h4>
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
				<div>
					<div class="field"><label>Bedrooms</label><div class="value">${prefs.bedrooms || prefs.beds || '—'}</div></div>
					<div class="field"><label>Bathrooms</label><div class="value">${prefs.bathrooms || prefs.baths || '—'}</div></div>
					<div class="field"><label>Budget</label><div class="value">${prefs.priceRange || prefs.price_range || (prefs.budget_min && prefs.budget_max ? `$${prefs.budget_min} - $${prefs.budget_max}` : '—')}</div></div>
					<div class="field"><label>Area of Town</label><div class="value">${prefs.areaOfTown || prefs.area_of_town || (prefs.neighborhoods ? prefs.neighborhoods.join(', ') : '—')}</div></div>
				</div>
				<div>
					<div class="field"><label>Move-in Date</label><div class="value">${prefs.moveInDate || prefs.move_in_date || prefs.move_in || '—'}</div></div>
					<div class="field"><label>Credit History</label><div class="value">${prefs.creditHistory || prefs.credit_history || prefs.credit_tier || '—'}</div></div>
					<div class="field"><label>Comments</label><div class="value">${prefs.comments || prefs.notes || '—'}</div></div>
				</div>
			</div>
		`;

		// Load notes
		await loadLeadNotes(leadId);

		showModal('leadDetailsModal');
	}

	function closeLeadDetailsModal(){
		console.log('closeLeadDetailsModal called');
		hideModal('leadDetailsModal');
		currentLeadForNotes = null;
	}

	// ---- Lead Notes Modal ----
	async function openLeadNotesModal(leadId, leadName) {
		currentLeadForNotes = leadId;

		// Set modal title
		document.getElementById('leadNotesTitle').textContent = `📝 Notes: ${leadName}`;

		// Load notes
		await loadLeadNotesInModal(leadId);

		// Clear input
		document.getElementById('newLeadNote').value = '';

		showModal('leadNotesModal');
	}

	function closeLeadNotesModal() {
		hideModal('leadNotesModal');
		currentLeadForNotes = null;
	}

	async function loadLeadNotesInModal(leadId) {
		console.log('🔵 loadLeadNotesInModal called with leadId:', leadId);

		if (USE_MOCK_DATA) {
			document.getElementById('leadNotesContent').innerHTML = '<p class="subtle">Notes feature requires Supabase connection</p>';
			return;
		}

		try {
			console.log('📡 Fetching notes from Supabase...');
			const notes = await SupabaseAPI.getLeadNotes(leadId);
			console.log('📥 Received notes:', notes);

			const notesContainer = document.getElementById('leadNotesContent');

			if (!notes || notes.length === 0) {
				console.log('ℹ️ No notes found for this lead');
				notesContainer.innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
				return;
			}

			console.log(`✅ Displaying ${notes.length} notes`);
			notesContainer.innerHTML = notes.map(note => `
				<div class="note-item" style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
					<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
						<strong style="color: #1f2937;">${note.author_name}</strong>
						<span class="subtle mono" style="font-size: 12px;">${formatDate(note.created_at)}</span>
					</div>
					<div style="color: #4b5563;">${note.content}</div>
				</div>
			`).join('');
		} catch (error) {
			console.error('❌ Error loading lead notes:', error);
			document.getElementById('leadNotesContent').innerHTML = '<p class="subtle" style="color: #ef4444;">Error loading comments</p>';
		}
	}

	// Legacy function for backward compatibility
	async function openDrawer(leadId){
		await openLeadDetailsModal(leadId);
	}

	function closeDrawer(){
		closeLeadDetailsModal();
	}

	// ---- Agent Drawer ----
	async function openAgentDrawer(agentId){
		state.selectedAgentId = agentId;
		const agent = mockAgents.find(a => a.id === agentId);
		const stats = getAgentStats(agentId);
		const c = document.getElementById('agentDrawerContent');

		c.innerHTML = `
			<div class="field"><label>Agent Name</label><div class="value">${agent.name}</div></div>
			<div class="field"><label>Contact</label><div class="value">${agent.email} · ${agent.phone}</div></div>
			<div class="field"><label>Status</label><div class="value">${agent.active ? 'Active' : 'Inactive'}</div></div>
			<div class="field"><label>Hire Date</label><div class="value mono">${formatDate(agent.hireDate)}</div></div>
			<div class="field"><label>License Number</label><div class="value mono">${agent.licenseNumber}</div></div>
			<div class="field"><label>Specialties</label><div class="value">${agent.specialties.join(', ')}</div></div>
			<div class="field"><label>Notes</label><div class="value">${agent.notes}</div></div>
			<hr />
			<div class="stats-grid">
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
		show(document.getElementById('agentDrawer'));
	}

	function closeAgentDrawer(){ hide(document.getElementById('agentDrawer')); }

	// ---- Document Modals ----
	function openDocumentDetails(leadId) {
		const lead = mockLeads.find(l => l.id === leadId);
		const docStatus = mockDocumentStatuses[leadId];

		if (!lead || !docStatus) {
			toast('Document details not available for this lead');
			return;
		}

		document.getElementById('documentLeadName').textContent = lead.name;
		document.getElementById('documentSteps').innerHTML = renderDocumentSteps(leadId);
		show(document.getElementById('documentDetailsModal'));
	}

	function closeDocumentDetails() {
		hide(document.getElementById('documentDetailsModal'));
	}

	function openHistory() {
		const historyContent = document.getElementById('historyContent');
		historyContent.innerHTML = `
			<div class="history-list">
				${mockClosedLeads.map(closedLead => {
					const agent = mockAgents.find(a => a.id === closedLead.agent_id);
					return `
						<div class="history-item">
							<div class="history-header">
								<div class="lead-info">
									<h4>${closedLead.name}</h4>
									<div class="agent-info">Agent: ${agent ? agent.name : 'Unknown'}</div>
									<div class="closed-date">Closed: ${formatDate(closedLead.closed_date)}</div>
								</div>
								<button class="btn btn-secondary" data-history-lead="${closedLead.id}">View Documents</button>
							</div>
						</div>
					`;
				}).join('')}
			</div>
		`;
		show(document.getElementById('historyModal'));
	}

	function closeHistory() {
		hide(document.getElementById('historyModal'));
	}

	function openHistoryDocumentDetails(closedLeadId) {
		const closedLead = mockClosedLeads.find(l => l.id === closedLeadId);
		if (!closedLead) return;

		document.getElementById('documentLeadName').textContent = closedLead.name + ' (Closed)';
		document.getElementById('documentSteps').innerHTML = closedLead.steps.map(step => `
			<div class="document-step completed">
				<div class="step-header">
					<span class="step-number">${step.id}.</span>
					<span class="step-name">${step.name}</span>
					<span class="step-completed">✓ Completed</span>
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
		show(document.getElementById('documentDetailsModal'));
	}

	// ---- Matches Modal ----
	async function openMatches(leadId){
		state.selectedLeadId = leadId;
		state.selectedMatches = new Set();
		const lead = await api.getLead(leadId);
		const grid = document.getElementById('listingsGrid');
		const list = await api.getMatches(leadId, 10);
		state.currentMatches = list;

		// Update modal title and send button
		document.getElementById('leadNameTitle2').textContent = lead.name;
		document.getElementById('sendLeadName').textContent = lead.name;

		grid.innerHTML = '';
		list.forEach(item => {
			const card = document.createElement('article');
			card.className = 'listing-card';
			card.innerHTML = `
				<div class="listing-image">
					<img src="${item.image_url}" alt="${item.name}" loading="lazy">
					<div class="listing-badge">${item.effective_commission_pct}% Commission</div>
				</div>
				<div class="listing-content">
					<div class="listing-header">
						<h3 class="listing-name">${item.name}</h3>
						<div class="listing-rating">
							<span class="stars">★★★★☆</span>
							<span class="rating-text">4.2</span>
						</div>
					</div>
					<div class="listing-price">
						<div class="price-amount">$${item.rent_min.toLocaleString()} - $${item.rent_max.toLocaleString()}/mo</div>
						<div class="listing-specs">${item.beds_min}-${item.beds_max} bd • ${item.baths_min}-${item.baths_max} ba • ${item.sqft_min.toLocaleString()}-${item.sqft_max.toLocaleString()} sqft</div>
					</div>
					<div class="listing-features">
						<div class="feature-tag">${item.specials_text}</div>
						<div class="feature-tag secondary">${item.bonus_text}</div>
					</div>
					<div class="listing-footer">
						<label class="listing-checkbox">
							<input type="checkbox" class="listing-check" data-id="${item.id}">
							<span class="checkmark"></span>
							<span class="checkbox-text">Select Property</span>
						</label>
						<div class="listing-actions">
							<button class="listing-action-btn" title="View more details">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			`;
			grid.appendChild(card);
		});
		updateSelectionSummary();
		show(document.getElementById('matchesModal'));
	}
	function closeMatches(){ hide(document.getElementById('matchesModal')); }

	// ---- Email Preview Modal ----
	async function openEmailPreview(){
		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop =>
			state.selectedMatches.has(prop.id)
		);

		// Update email content
		document.getElementById('previewLeadName').textContent = lead.name;
		document.getElementById('previewAgentEmail').textContent = 'agent@trecrm.com';
		document.getElementById('agentEmail').textContent = 'agent@trecrm.com';
		document.getElementById('emailRecipient').textContent = `To: ${lead.email}`;
		document.getElementById('previewAgentName').textContent = 'Your Agent';

		// Render selected properties
		const propertiesGrid = document.getElementById('previewProperties');
		propertiesGrid.innerHTML = '';

		selectedProperties.forEach(property => {
			const card = document.createElement('div');
			card.className = 'preview-property-card';
			card.innerHTML = `
				<div class="preview-property-image">
					<img src="${property.image_url}" alt="${property.name}" loading="lazy">
				</div>
				<div class="preview-property-content">
					<div class="preview-property-name">${property.name}</div>
					<div class="preview-property-price">$${property.rent_min.toLocaleString()} - $${property.rent_max.toLocaleString()}/mo</div>
					<div class="preview-property-specs">${property.beds_min}-${property.beds_max} bd • ${property.baths_min}-${property.baths_max} ba</div>
				</div>
			`;
			propertiesGrid.appendChild(card);
		});

		// Close matches modal and open email preview
		closeMatches();
		show(document.getElementById('emailPreviewModal'));
	}

	function closeEmailPreview(){
		hide(document.getElementById('emailPreviewModal'));
	}

	function previewLandingPage() {
		// Get the selected properties from the current showcase
		const selectedProperties = Array.from(state.selectedMatches);
		const propertyIds = selectedProperties.join(',');

		// Get current agent name (in real app, this would come from user data)
		const agentName = 'John Smith'; // This would be dynamic in production

		// Create a preview URL with sample data
		const previewUrl = `landing.html?showcase=preview_${Date.now()}&lead=sample_lead&agent=${encodeURIComponent(agentName)}&properties=${propertyIds}`;

		// Open in a new tab
		window.open(previewUrl, '_blank');

		toast('Opening landing page preview in new tab...');
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
		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop =>
			state.selectedMatches.has(prop.id)
		);
		const includeReferralBonus = document.getElementById('referralBonus').checked;
		const includeMovingBonus = document.getElementById('movingBonus').checked;

		// Generate unique showcase ID for tracking
		const showcaseId = `showcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Create landing page URL with tracking parameters
		const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'landing.html');
		const landingUrl = `${baseUrl}?showcase=${showcaseId}&lead=${lead.id}&properties=${Array.from(state.selectedMatches).join(',')}`;

		// Create bonus perks text
		let bonusPerks = '';
		if (includeReferralBonus || includeMovingBonus) {
			bonusPerks = '<ul style="margin: 20px 0; padding-left: 0; list-style: none;">';
			if (includeReferralBonus) {
				bonusPerks += '<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🎁 <strong>Referral bonus</strong> for recommending friends</li>';
			}
			if (includeMovingBonus) {
				bonusPerks += '<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🚚 <strong>Moving bonus</strong> to help with relocation costs</li>';
			}
			bonusPerks += '</ul>';
		}

		// Create email content
		const emailContent = {
			to: lead.email,
			subject: 'Top options hand picked for you',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<div style="text-align: center; padding: 20px; background: #f8fafc;">
						<h1 style="color: #1e293b; margin-bottom: 10px;">🏠 Your Perfect Home Awaits</h1>
						<p style="color: #64748b; font-size: 18px;">Hand-picked properties just for you by our expert team</p>
					</div>

					<div style="padding: 30px;">
						<p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi ${lead.name},</p>

						<p style="font-size: 16px; color: #374151; margin-bottom: 20px;">We have some great fits for you! Go through me and you'll get these perks:</p>

						<ul style="margin: 20px 0; padding-left: 0; list-style: none;">
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🎯 <strong>Exclusive access</strong> to properties before they hit the market</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">💰 <strong>Better pricing</strong> through our direct relationships</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">⚡ <strong>Priority scheduling</strong> for property tours</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🛡️ <strong>Expert guidance</strong> throughout your search</li>
						</ul>

						${bonusPerks}

						<p style="font-size: 16px; color: #374151; margin-bottom: 30px;">Here's a list of options based on what you're looking for. Click which ones you're interested in and hit submit, and then we'll schedule you to go take a look at them!</p>

						<div style="text-align: center; margin: 30px 0;">
							<a href="${landingUrl}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">View Your Personalized Property Matches</a>
						</div>

						<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 14px;">
							<p>Best regards,<br>Your Agent<br>TRE CRM Team</p>
						</div>
					</div>
				</div>
			`
		};

		try {
			// Send email via API
			await api.sendEmail(emailContent);

			// Create showcase record in database
			await api.createShowcase({
				lead_id: lead.id,
				agent_id: 'current-agent-id', // In real app, get from current user
				listing_ids: Array.from(state.selectedMatches),
				message: `Showcase sent to ${lead.name} with ${selectedProperties.length} properties`,
				showcase_id: showcaseId,
				landing_url: landingUrl
			});

			toast(`Showcase email sent to ${lead.name}! They can view their personalized matches at the provided link.`);
			closeEmailPreview();

		} catch (error) {
			console.error('Error sending showcase email:', error);
			toast('Error sending email. Please try again.');
		}
	}

	function updateSelectionSummary(){
		const checkboxes = document.querySelectorAll('.listing-check');
		const checked = Array.from(checkboxes).filter(cb => cb.checked);
		const selectedCount = document.getElementById('selectedCount');
		const sendBtn = document.getElementById('sendBtn');

		selectedCount.textContent = checked.length;
		sendBtn.disabled = checked.length === 0;

		// Update state
		state.selectedMatches.clear();
		checked.forEach(cb => state.selectedMatches.add(cb.dataset.id));
	}

	function updateCreateShowcaseBtn(){
		const btn = document.getElementById('createShowcase');
		btn.disabled = state.selectedMatches.size === 0;
	}

	// ---- Showcase ----
	async function openShowcasePreview(){
		const lead = await api.getLead(state.selectedLeadId);
		document.getElementById('showcaseTo').value = lead.email;
		const selected = Array.from(state.selectedMatches);
		const preview = document.getElementById('showcasePreview');
		preview.innerHTML = selected.map(id => {
			const item = state.currentMatches.find(x => x.id === id);
			return `<div class="public-card"><div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div><div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div><div class="subtle">${item.specials_text || ''}</div></div>`;
		}).join('');
		show(document.getElementById('showcaseModal'));
	}
	function closeShowcase(){ hide(document.getElementById('showcaseModal')); }

	// ---- Build Showcase from Listings ----
	async function openBuildShowcaseModal(){
		const selectedListings = getSelectedListings();
		if (selectedListings.length === 0) {
			toast('Please select at least one listing', 'error');
			return;
		}

		// Populate lead dropdown with leads assigned to current agent
		const leadSelect = document.getElementById('buildShowcaseLead');
		leadSelect.innerHTML = '<option value="">Choose a lead...</option>';

		// Get leads assigned to current agent (in real app, this would filter by agent)
		const agentLeads = mockLeads.filter(lead =>
			lead.assigned_agent_id === state.agentId || state.role === 'manager'
		);

		agentLeads.forEach(lead => {
			const option = document.createElement('option');
			option.value = lead.id;
			option.textContent = `${lead.name} (${lead.email})`;
			leadSelect.appendChild(option);
		});

		// Update selection count
		document.getElementById('buildSelectedCount').textContent = selectedListings.length;

		// Populate listings grid with selected properties (same format as Top Listing Options)
		const listingsGrid = document.getElementById('buildListingsGrid');
		listingsGrid.innerHTML = selectedListings.map(prop => {
			return `
				<div class="listing-card" data-property-id="${prop.id}">
					<div class="listing-image">
						<img src="${prop.image_url || 'https://via.placeholder.com/300x200?text=Property+Image'}" alt="${prop.name}" />
						<div class="commission-badge">${Math.max(prop.escort_pct, prop.send_pct)}% Commission</div>
					</div>
					<div class="listing-content">
						<h4>${prop.name}</h4>
						<div class="listing-rating">
							<span class="stars">★★★★★</span>
							<span class="rating-number">4.2</span>
						</div>
						<p class="listing-price">$${prop.rent_min} - $${prop.rent_max}/mo</p>
						<p class="listing-details">${prop.beds_min}-${prop.beds_max} bd • ${prop.baths_min}-${prop.baths_max} ba • ${prop.sqft_min}-${prop.sqft_max} sqft</p>
						<div class="listing-amenities">
							${prop.amenities.slice(0, 2).map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
						</div>
						<div class="listing-selection">
							<span>Selected Property</span>
							<input type="checkbox" class="listing-check" checked disabled>
						</div>
					</div>
				</div>
			`;
		}).join('');

		show(document.getElementById('buildShowcaseModal'));
	}

	function closeBuildShowcase(){
		hide(document.getElementById('buildShowcaseModal'));
	}

	function getSelectedListings(){
		const checkboxes = document.querySelectorAll('.listing-checkbox:checked');
		return Array.from(checkboxes).map(cb => {
			const listingId = cb.dataset.listingId;
			return mockProperties.find(prop => prop.id === listingId);
		}).filter(Boolean);
	}

	function updateBuildShowcaseButton(){
		const selectedCount = document.querySelectorAll('.listing-checkbox:checked').length;
		const buildBtn = document.getElementById('buildShowcaseBtn');
		buildBtn.disabled = selectedCount === 0;
		buildBtn.textContent = selectedCount > 0 ? `Build Showcase (${selectedCount})` : 'Build Showcase';

		// Update bulk actions bar visibility
		updateBulkActionsBar();
	}

	function updateBulkActionsBar() {
		const selectedCount = document.querySelectorAll('.listing-checkbox:checked').length;
		const bulkActionsBar = document.getElementById('bulkActionsBar');
		const bulkActionsCount = document.getElementById('bulkActionsCount');
		const bulkMarkUnavailableBtn = document.getElementById('bulkMarkUnavailableBtn');
		const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

		if (!bulkActionsBar) return;

		// Show/hide bulk actions bar based on selection and role
		const isManagerOrSuperUser = state.role === 'manager' || state.role === 'super_user';

		if (selectedCount > 0 && isManagerOrSuperUser) {
			bulkActionsBar.classList.remove('hidden');
			bulkActionsCount.textContent = `${selectedCount} selected`;
		} else {
			bulkActionsBar.classList.add('hidden');
		}
	}

	async function bulkMarkAsUnavailable() {
		const checkboxes = document.querySelectorAll('.listing-checkbox:checked');
		const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.listingId);

		if (selectedIds.length === 0) {
			toast('No listings selected', 'error');
			return;
		}

		const confirmed = confirm(`Are you sure you want to mark ${selectedIds.length} listing(s) as unavailable? They will be removed from the listings table but can be restored later.`);

		if (!confirmed) return;

		try {
			console.log('Marking listings as unavailable:', selectedIds);

			// Update each property to set is_available = false
			for (const id of selectedIds) {
				await SupabaseAPI.updateProperty(id, { is_available: false });
			}

			// Show success message
			toast(`${selectedIds.length} listing(s) marked as unavailable`, 'success');

			// Clear selections and refresh
			checkboxes.forEach(cb => cb.checked = false);
			updateBulkActionsBar();
			await renderListings();
		} catch (error) {
			console.error('Error marking listings as unavailable:', error);
			toast(`Error: ${error.message}`, 'error');
		}
	}

	async function bulkDeleteListings() {
		console.log('bulkDeleteListings called!');
		const checkboxes = document.querySelectorAll('.listing-checkbox:checked');
		const selectedIds = Array.from(checkboxes).map(cb => cb.dataset.listingId);

		console.log('Selected IDs for deletion:', selectedIds);

		if (selectedIds.length === 0) {
			toast('No listings selected', 'error');
			return;
		}

		const confirmed = confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} listing(s)?\n\nThis action CANNOT be undone. The listings will be gone forever.`);

		console.log('First confirmation:', confirmed);
		if (!confirmed) return;

		// Double confirmation for safety
		const doubleConfirmed = confirm(`This is your final confirmation. Delete ${selectedIds.length} listing(s) permanently?`);

		console.log('Second confirmation:', doubleConfirmed);
		if (!doubleConfirmed) return;

		try {
			console.log('Deleting listings:', selectedIds);

			// Delete each property
			for (const id of selectedIds) {
				console.log('Deleting property:', id);
				const result = await SupabaseAPI.deleteProperty(id);
				console.log('Delete result for', id, ':', result);
			}

			console.log('All deletions complete. Refreshing listings...');

			// Show success message
			toast(`${selectedIds.length} listing(s) deleted permanently`, 'success');

			// Clear selections and refresh
			checkboxes.forEach(cb => cb.checked = false);
			updateBulkActionsBar();

			console.log('Calling renderListings()...');
			await renderListings();
			console.log('renderListings() complete');
		} catch (error) {
			console.error('Error deleting listings:', error);
			console.error('Error stack:', error.stack);
			toast(`Error: ${error.message}`, 'error');
		}
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

		const lead = mockLeads.find(l => l.id === leadId);
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
		const lead = mockLeads.find(l => l.id === sc.lead_id);
		const agent = mockAgents.find(a => a.id === sc.agent_id);
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
		} else if (hash === '/specials') {
			state.currentPage = 'specials';
			show(document.getElementById('specialsView'));
			setRoleLabel('specials');
			renderSpecials();
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
		if (USE_MOCK_DATA) {
			console.log('📋 Using mock agents data');
			return;
		}

		try {
			console.log('📋 Loading real agents from Supabase...');
			const agents = await SupabaseAPI.getAgents();
			mockAgents = agents; // Replace mock data with real data
			console.log('✅ Loaded', agents.length, 'agents from Supabase');
		} catch (error) {
			console.error('❌ Error loading agents:', error);
			console.log('⚠️ Falling back to mock agents data');
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
				const edit = e.target.closest('button[data-edit]');
				if (edit){ toast('Edit agent info (mock action)'); return; }
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
		const saveLeadNoteBtnEl = document.getElementById('saveLeadNoteBtn');
		if (saveLeadNoteBtnEl) {
			console.log('✅ Attaching click listener to saveLeadNoteBtn');
			saveLeadNoteBtnEl.addEventListener('click', () => {
				console.log('🟢 saveLeadNoteBtn clicked!');
				saveLeadNote();
			});
		} else {
			console.log('❌ saveLeadNoteBtn not found');
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
					const lead = mockLeads.find(l => l.id === leadId);
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
		console.log('Opening listing edit modal for:', property);

		// Populate the modal with current property data
		document.getElementById('editListingName').textContent = property.name || property.community_name;
		document.getElementById('editPropertyName').value = property.name || property.community_name;
		document.getElementById('editAddress').value = property.address || property.street_address;
		document.getElementById('editMarket').value = property.market || property.city;
		document.getElementById('editPhone').value = property.phone || property.contact_email || '';
		document.getElementById('editRentMin').value = property.rent_min || property.rent_range_min || 0;
		document.getElementById('editRentMax').value = property.rent_max || property.rent_range_max || 0;
		document.getElementById('editBedsMin').value = property.beds_min || 0;
		document.getElementById('editBedsMax').value = property.beds_max || 0;
		document.getElementById('editBathsMin').value = property.baths_min || 0;
		document.getElementById('editBathsMax').value = property.baths_max || 0;
		document.getElementById('editEscortPct').value = property.escort_pct || property.commission_pct || 0;
		document.getElementById('editSendPct').value = property.send_pct || property.commission_pct || 0;
		document.getElementById('editWebsite').value = property.website || property.leasing_link || '';
		document.getElementById('editAmenities').value = Array.isArray(property.amenities) ? property.amenities.join(', ') : '';
		document.getElementById('editSpecials').value = property.specials_text || '';
		document.getElementById('editBonus').value = property.bonus_text || '';
		document.getElementById('editIsPUMI').checked = property.is_pumi || property.isPUMI || false;
		document.getElementById('editMarkForReview').checked = property.mark_for_review || property.markForReview || false;

		// Show/hide delete button based on role
		const deleteBtn = document.getElementById('deleteListingBtn');
		if (deleteBtn) {
			if (state.role === 'manager' || state.role === 'super_user') {
				deleteBtn.style.display = 'block';
			} else {
				deleteBtn.style.display = 'none';
			}
		}

		// Store the current property for saving
		window.currentEditingProperty = property;

		// Show the modal
		showModal('listingEditModal');
	}

	function closeListingEditModal() {
		hideModal('listingEditModal');
		window.currentEditingProperty = null;
	}

	async function deleteListing() {
		const property = window.currentEditingProperty;
		if (!property) return;

		// Confirm deletion
		const propertyName = property.name || property.community_name;
		const confirmed = confirm(`Are you sure you want to delete "${propertyName}"? This action cannot be undone.`);

		if (!confirmed) return;

		try {
			console.log('Deleting property:', property.id);

			// Delete from Supabase
			await SupabaseAPI.deleteProperty(property.id);

			// Show success message
			toast(`Listing "${propertyName}" deleted successfully!`, 'success');

			// Close modal and refresh display
			closeListingEditModal();
			await renderListings();
		} catch (error) {
			console.error('Error deleting listing:', error);
			console.error('Error details:', JSON.stringify(error, null, 2));
			toast(`Error deleting listing: ${error.message}`, 'error');
		}
	}

	async function saveListingEdit() {
		const property = window.currentEditingProperty;
		if (!property) return;

		try {
			// Get form data - ONLY use new schema field names
			const formData = {
				community_name: document.getElementById('editPropertyName').value,
				street_address: document.getElementById('editAddress').value,
				city: document.getElementById('editMarket').value,
				contact_email: document.getElementById('editPhone').value, // Using contact_email for phone
				rent_range_min: parseInt(document.getElementById('editRentMin').value),
				rent_range_max: parseInt(document.getElementById('editRentMax').value),
				bed_range: `${document.getElementById('editBedsMin').value}-${document.getElementById('editBedsMax').value}`,
				bath_range: `${document.getElementById('editBathsMin').value}-${document.getElementById('editBathsMax').value}`,
				commission_pct: Math.max(parseFloat(document.getElementById('editEscortPct').value), parseFloat(document.getElementById('editSendPct').value)),
				leasing_link: document.getElementById('editWebsite').value,
				amenities: document.getElementById('editAmenities').value.split(',').map(a => a.trim()).filter(a => a),
				is_pumi: document.getElementById('editIsPUMI').checked,
				mark_for_review: document.getElementById('editMarkForReview').checked,
				updated_at: new Date().toISOString()
			};

			console.log('Saving listing with data:', formData);

			// Update in Supabase
			await SupabaseAPI.updateProperty(property.id, formData);

			// Show success message
			toast(`Listing "${formData.community_name}" updated successfully!`, 'success');

			// Close modal and refresh display
			closeListingEditModal();
			await renderListings();
		} catch (error) {
			console.error('Error updating listing:', error);
			console.error('Error details:', JSON.stringify(error, null, 2));
			toast(`Error updating listing: ${error.message}`, 'error');
		}
	}

	// Initialize health status for all leads
	function initializeHealthStatus() {
		mockLeads.forEach(lead => {
			const calculatedStatus = calculateHealthStatus(lead);
			lead.health_status = calculatedStatus;
			lead.health_updated_at = new Date().toISOString();
		});
		console.log('Health status initialized for all leads');
	}

	// Initialize health status when page loads
	document.addEventListener('DOMContentLoaded', () => {
		initializeHealthStatus();
	});

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

// Global function for updating sort headers
function updateSortHeaders(tableId) {
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

// Admin page functions - defined in global scope
let realUsers = [];
let realAuditLog = [];

// API functions for real data
async function loadUsers() {
	try {
		console.log('Loading users from Supabase...');

		// Call our serverless function to list users
		const response = await fetch('/api/list-users');

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch users');
		}

		const result = await response.json();
		realUsers = result.users || [];
		console.log('✅ Loaded users from Supabase:', realUsers.length);
		renderUsersTable();
	} catch (error) {
		console.error('Error loading users:', error);
		// Fall back to mock data on error
		realUsers = [];
		renderUsersTable();
	}
}

async function loadAuditLog() {
	// Check if we're running locally or on production
	const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
		? 'http://localhost:3001/api'
		: null;

	if (!apiBase) {
		console.log('API_BASE not available, using mock data');
		realAuditLog = [];
		renderAuditLog();
		return;
	}

	try {
		const response = await fetch(`${apiBase}/audit-log`);
		if (!response.ok) throw new Error('Failed to fetch audit log');
		realAuditLog = await response.json();
		console.log('Loaded audit log from API:', realAuditLog.length);
		renderAuditLog();
	} catch (error) {
		console.error('Error loading audit log:', error);
		throw error;
	}
}

async function createUser(userData) {
	try {
		console.log('Creating user with Supabase:', userData);

		// Call our serverless function to create the user
		// This uses the service role key on the backend
		const response = await fetch('/api/create-user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email: userData.email,
				password: userData.password,
				name: userData.name,
				role: userData.role
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create user');
		}

		const result = await response.json();
		console.log('✅ User created successfully:', result.user);

		// Reload users from Supabase to refresh the table
		await loadUsers();

		return result.user;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

async function updateUser(userId, userData) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
			? 'http://localhost:3001/api'
			: null;
		if (!apiBase) throw new Error('API not available in production');

		const response = await fetch(`${apiBase}/users/${userId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...userData,
				updatedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to update user');
		const updatedUser = await response.json();
		const index = realUsers.findIndex(u => u.id === userId);
		if (index !== -1) realUsers[index] = updatedUser;
		renderUsersTable();
		return updatedUser;
	} catch (error) {
		console.error('Error updating user:', error);
		throw error;
	}
}

async function deleteUserFromAPI(userId) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
			? 'http://localhost:3001/api'
			: null;
		if (!apiBase) throw new Error('API not available in production');

		const response = await fetch(`${apiBase}/users/${userId}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				deletedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to delete user');
		realUsers = realUsers.filter(u => u.id !== userId);
		renderUsersTable();
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error deleting user:', error);
		throw error;
	}
}

async function changeUserPassword(userId, newPassword) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
			? 'http://localhost:3001/api'
			: null;
		if (!apiBase) throw new Error('API not available in production');

		const response = await fetch(`${apiBase}/users/${userId}/password`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				newPassword,
				updatedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to change password');
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error changing password:', error);
		throw error;
	}
}

async function renderAdmin() {
	const currentRole = window.state?.role || 'manager';
	const adminRoleLabel = document.getElementById('adminRoleLabel');

	if (adminRoleLabel) {
		adminRoleLabel.textContent = `Role: ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`;
	}

	// Load real data from API
	try {
		await loadUsers();
		await loadAuditLog();
	} catch (error) {
		console.error('Error loading admin data:', error);
		// Fallback to mock data for demo
		console.log('Using mock data for admin page');
	}

	// Always render the table (either with real data or mock data)
	renderUsersTable();
	renderAuditLog();
}

function renderUsersTable() {
	console.log('renderUsersTable called, realUsers:', realUsers?.length || 0);
	const tbody = document.getElementById('usersTbody');
	if (!tbody) {
		console.log('usersTbody not found');
		return;
	}

	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.length > 0 ? [...realUsers] : [];
	console.log('Users to render:', users.length);

	// Apply sorting if active
	const currentState = window.state || { sort: { key: null, dir: null } };
	console.log('renderUsersTable - currentState.sort:', currentState.sort);
	if (currentState.sort.key && currentState.sort.dir && currentState.sort.dir !== 'none') {
		console.log('Applying sorting to users, key:', currentState.sort.key, 'dir:', currentState.sort.dir);
		try {
			users.sort((a, b) => {
				let aVal, bVal;

				if (currentState.sort.key === 'name') {
					aVal = (a.name || '').toLowerCase();
					bVal = (b.name || '').toLowerCase();
				} else if (currentState.sort.key === 'role') {
					aVal = a.role || '';
					bVal = b.role || '';
				} else if (currentState.sort.key === 'status') {
					aVal = a.status || '';
					bVal = b.status || '';
				} else if (currentState.sort.key === 'created_at') {
					aVal = new Date(a.created_at || 0);
					bVal = new Date(b.created_at || 0);
				} else {
					return 0;
				}

				// Handle date sorting
				if (currentState.sort.key === 'created_at') {
					return currentState.sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
				} else {
					// Text sorting
					if (currentState.sort.dir === 'asc') {
						return aVal.localeCompare(bVal);
					} else {
						return bVal.localeCompare(aVal);
					}
				}
			});
		} catch (error) {
			console.error('Error sorting users:', error);
		}
	}

	tbody.innerHTML = users.map(user => {
		const createdBy = user.created_by === 'system' ? 'System' :
			users.find(u => u.id === user.created_by)?.name || 'Unknown';

		return `
			<tr>
				<td data-sort="${user.name}">${user.name}</td>
				<td data-sort="${user.email}">${user.email}</td>
				<td data-sort="${user.role}">
					<span class="role-badge role-${user.role}">${user.role.replace('_', ' ')}</span>
				</td>
				<td data-sort="${user.status}">
					<span class="user-status ${user.status}">${user.status}</span>
				</td>
				<td data-sort="${user.created_at}">${formatDate(user.created_at)}</td>
				<td>
					<div class="user-actions">
						<button class="btn btn-secondary btn-small" onclick="editUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
							</svg>
							Edit
						</button>
						<button class="btn btn-secondary btn-small" onclick="changePassword('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
							</svg>
							Password
						</button>
						<button class="btn btn-danger btn-small" onclick="deleteUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
							</svg>
							Delete
						</button>
					</div>
				</td>
			</tr>
		`;
	}).join('');

	// Update sort headers
	updateSortHeaders('usersTable');
}

function renderAuditLog() {
	const auditLog = document.getElementById('auditLog');
	if (!auditLog) return;

	// Use real audit log from Supabase (no mock data fallback)
	const logs = realAuditLog.length > 0 ? realAuditLog : [];
	auditLog.innerHTML = logs.map(entry => {
		const actionIcons = {
			user_created: '👤',
			user_updated: '✏️',
			user_deleted: '🗑️',
			role_changed: '🔄',
			password_changed: '🔐'
		};

		return `
			<div class="audit-entry">
				<div class="audit-icon ${entry.action}">
					${actionIcons[entry.action] || '📝'}
				</div>
				<div class="audit-content">
					<div class="audit-action">${entry.details}</div>
					<div class="audit-details">
						User: ${entry.user_name} (${entry.user_email}) |
						By: ${entry.performed_by_name}
					</div>
				</div>
				<div class="audit-timestamp">${formatDate(entry.timestamp)}</div>
			</div>
		`;
	}).join('');
}

function editUser(userId) {
	console.log('editUser called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.length > 0 ? realUsers : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found:', userId);
		return;
	}

	document.getElementById('userModalTitle').textContent = 'Edit User';
	document.getElementById('userName').value = user.name;
	document.getElementById('userEmail').value = user.email;
	document.getElementById('userRole').value = user.role.toLowerCase();
	document.getElementById('userPassword').value = '';
	document.getElementById('userConfirmPassword').value = '';
	document.getElementById('userPassword').required = false;
	document.getElementById('userConfirmPassword').required = false;

	// Store user ID for update
	document.getElementById('userModal').setAttribute('data-user-id', userId);

	showModal('userModal');
}

function changePassword(userId) {
	console.log('changePassword called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.length > 0 ? realUsers : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for password change:', userId);
		return;
	}

	document.getElementById('passwordModal').setAttribute('data-user-id', userId);
	showModal('passwordModal');
}

async function deleteUser(userId) {
	console.log('deleteUser called with:', userId);
	// Use real users from Supabase (no mock data fallback)
	const users = realUsers.length > 0 ? realUsers : [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for deletion:', userId);
		return;
	}

	if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
		try {
			if (realUsers.length > 0) {
				// Use real API
				await deleteUserFromAPI(userId);
				toast('User deleted successfully');
			} else {
				// Fallback to mock data
				const userIndex = users.findIndex(u => u.id === userId);
				if (userIndex > -1) {
					users.splice(userIndex, 1);

					// Note: Audit log functionality removed for mock users
					// Real audit log is handled by Supabase

					renderUsersTable();
					renderAuditLog();
					toast('User deleted successfully');
				}
			}
	} catch (error) {
		console.error('Error deleting user:', error);
		toast('Error deleting user', 'error');
	}
	}
}

// formatDate is already globally accessible
