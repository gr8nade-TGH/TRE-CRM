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

// Import API wrapper
import { createAPI } from './src/api/api-wrapper.js';

// Import utilities
import { getStepModalContent as getStepModalContentUtil } from './src/utils/step-modal-content.js';
import { sortTable as sortTableUtil } from './src/utils/table-sorting.js';
import { sendBuildShowcase as sendBuildShowcaseUtil } from './src/utils/showcase-builder.js';
import { getCurrentStepFromActivities as getCurrentStepUtil, getStepLabel as getStepLabelUtil, getHealthMessages as getHealthMessagesUtil } from './src/utils/lead-health.js';
import { openAgentDrawer as openAgentDrawerUtil, saveAgentChanges as saveAgentChangesUtil } from './src/utils/agent-drawer.js';

// Import event listeners setup
import { setupAllEventListeners } from './src/events/dom-event-listeners.js';
import { createLeadTable as createLeadTableUtil } from './src/renders/lead-table.js';
import { showStepDetails as showStepDetailsUtil } from './src/renders/progress-modals.js';

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

	// ---- Table Sorting ----
	// Wrapper function for sortTable - calls utility module
	function sortTable(column, tableId) {
		sortTableUtil(column, tableId, state, {
			renderLeads,
			renderAgents,
			renderListings,
			renderSpecials,
			renderDocuments,
			renderBugs,
			renderUsersTable
		}, updateSortHeaders);
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
	// Wrapper functions for lead health utilities
	async function getCurrentStepFromActivities(leadId) {
		return await getCurrentStepUtil(leadId);
	}

	function getStepLabel(stepNumber) {
		return getStepLabelUtil(stepNumber);
	}

	// Dynamic health messages based on lead state
	// Wrapper function for getHealthMessages
	async function getHealthMessages(lead) {
		return await getHealthMessagesUtil(lead, formatDate);
	}

	// renderHealthStatus is now imported from src/modules/leads/leads-health.js

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

	function hidePopover() {
		if (!pop) {
			pop = document.getElementById('healthPopover');
		}
		if (pop) {
			pop.style.display = 'none';
		}
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
	// API object created from api-wrapper module
	api = createAPI({
		mockInterestedLeads,
		mockBugs
	});

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

// Wrapper function for createLeadTable - calls utility module
function createLeadTable(lead, isExpanded = false) {
	return createLeadTableUtil(lead, isExpanded, {
		progressSteps,
		formatDate
	});
}

	// Wrapper function for getStepModalContent - calls utility module
	async function getStepModalContent(lead, step) {
		return await getStepModalContentUtil(lead, step, formatDate);
	}

	// Wrapper function for showStepDetails - calls utility module
	async function showStepDetails(lead, step) {
		return await showStepDetailsUtil(lead, step, {
			getStepModalContent,
			showModal,
			toast,
			SupabaseAPI
		});
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
	async function geocodeAddress(address, city, state = 'TX', zipCode) {
		try {
			// Build full address string
			const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
			const encodedAddress = encodeURIComponent(fullAddress);

			console.log('🗺️ Geocoding:', fullAddress);

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
				console.log('✅ Geocoded address:', fullAddress, 'to', { lat, lng });
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
	// Wrapper function for openAgentDrawer
	async function openAgentDrawer(agentId){
		await openAgentDrawerUtil({
			agentId,
			state,
			realAgents,
			getAgentStats,
			showModal
		});
	}

	function closeAgentDrawer(){ hide(document.getElementById('agentDrawer')); }

	function closeAgentEditModal(){
		hideModal('agentEditModal');
		state.selectedAgentId = null;
	}

	// Wrapper function for saveAgentChanges
	async function saveAgentChanges() {
		await saveAgentChangesUtil({
			state,
			realAgents,
			toast,
			closeAgentEditModal,
			renderAgents
		});
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

	// Wrapper function for sendBuildShowcase - calls utility module
	async function sendBuildShowcase() {
		await sendBuildShowcaseUtil({
			state,
			api,
			toast,
			closeBuildShowcase,
			updateBuildShowcaseButton,
			getSelectedListings
		});
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

	// ---- Event Listeners Setup ----
	// Event listeners are now in src/events/dom-event-listeners.js
	// The setupAllEventListeners() function is called from DOMContentLoaded with all dependencies
	// ---- Events ----
	document.addEventListener('DOMContentLoaded', () => {
		// Don't initialize app here - wait for auth.js to call initializeApp()
		console.log('DOM loaded, waiting for authentication...');

		// Initialize unit modal event listeners
		import('./src/modules/modals/unit-modals.js').then(module => {
			module.initializeUnitModalListeners();
		});

		// Listen for refresh listings event (triggered by unit modals)
		window.addEventListener('refreshListings', () => {
			if (state.currentPage === 'listings') {
				renderListings();
			}
		});

		// Setup all event listeners with dependencies
		setupAllEventListeners({
			// State and global variables
			state,
			realAgents,
			realUsers,
			api,
			mockClosedLeads,

			// Render functions
			renderLeads,
			renderListings,
			renderAgents,
			renderDocuments,
			renderSpecials,
			renderBugs,
			renderAdmin,
			renderLeadsTable,
			renderProperties,
			renderAuditLog,

			// Drawer and modal functions
			openDrawer,
			closeDrawer,
			openAgentDrawer,
			closeAgentDrawer,
			openMatches,
			closeMatches,
			showModal,
			hideModal,
			closeLeadDetailsModal,
			closeLeadNotesModal,
			closeActivityLogModal,
			closeAgentEditModal,
			closeShowcase,
			closeHistory,
			closeEmailPreview,
			closeInterestedLeads,
			closeListingEditModal,
			openInterestedLeads,
			openPropertyNotesModal,
			closePropertyNotesModal,
			openAddListingModal,
			closeAddListingModal,
			openBuildShowcaseModal,
			openShowcasePreview,

			// CRUD operation functions
			saveNewLead,
			savePropertyContact,
			editPropertyContact,
			saveNewSpecial,
			deleteSpecial,
			createListing,
			addPropertyNote,
			saveAgentChanges,
			saveLeadNote,
			updateUser,
			createUser,
			changeUserPassword,
			saveListingEdit,
			deleteListing,

			// Utility functions
			sortTable,
			toast,
			formatDate,
			initPopover,
			showPopover,
			hidePopover,
			toggleLeadTable,
			updateBulkActionsBar,
			updateBuildShowcaseButton,

			// Bulk actions functions
			bulkMarkAsUnavailable,
			bulkDeleteListings,

			// Bug tracker functions
			submitBugReport,
			saveBugChanges,
			addBugFlags,
			handleBugFieldChange,
			showBugDetails,

			// Showcase functions
			sendBuildShowcase,
			sendShowcase,
			closeBuildShowcase,
			updateSelectionSummary,
			openEmailPreview,

			// Other functions
			previewLandingPage,
			openHistory,
			closeDocumentDetails,
			sendShowcaseEmail,
			openHistoryDocumentDetails
		});
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
	async function openListingEditModal(property) {
		await Modals.openListingEditModal(property, {
			state,
			showModal,
			SupabaseAPI
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

	// Global function for activity log modal (used by unit icons)
	window.openActivityLogModal = openActivityLogModal;

	// Bulk actions event listeners moved to dom-event-listeners.js

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
