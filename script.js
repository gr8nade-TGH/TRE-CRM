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
import { geocodeAddress } from './src/utils/geocoding.js';

// Import event listeners setup
import { setupAllEventListeners } from './src/events/dom-event-listeners.js';
import { createLeadTable as createLeadTableUtil } from './src/renders/lead-table.js';
import { showStepDetails as showStepDetailsUtil } from './src/renders/progress-modals.js';

// Import Leads module
import * as Leads from './src/modules/leads/index.js';
import { calculateHealthStatus, renderHealthStatus } from './src/modules/leads/leads-health.js';

// Import Listings module
import * as Listings from './src/modules/listings/index.js';
import { downloadCSVTemplate, importCSV } from './src/modules/listings/csv-import.js';

// Import Agents module
import * as Agents from './src/modules/agents/index.js';

// Import Profile module
import {
	updateProfile as updateUserProfile,
	changePassword as changeOwnPassword,
	updateNotificationPreferences,
	openProfileModal
} from './src/modules/profile/profile-actions.js';

// Import Documents module
import * as Documents from './src/modules/documents/index.js';

// Import Admin module
import * as Admin from './src/modules/admin/index.js';

// Import Properties module
import * as Properties from './src/modules/properties/index.js';

// Import Modals module
import * as Modals from './src/modules/modals/index.js';

// Import Routing module
import * as Routing from './src/routing/index.js';

// Import Initialization module
import * as Init from './src/init/index.js';

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
// Note: These wrapper functions are defined inside the IIFE below
// where they have access to renderLeads, renderSpecials, etc.

// Note: mockUsers and mockAuditLog are imported from src/state/mockData.js

(function() {
	// ---- State ----
	// Note: State is now imported from src/state/state.js
	// The imported 'state' object is used throughout this file

	// ---- Global Variables ----
	// Map state is now managed by map-manager.js module

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

	// ---- Listings Filters ----
	// Wrapper function for matchesListingsFilters - calls module function
	function matchesListingsFilters(property, filters) {
		return Listings.matchesListingsFilters(property, filters);
	}

	// ---- Health Popover Functions ----
	// Wrapper functions for health popover - calls module functions
	function initPopover() {
		Leads.initPopover();
	}

	function showPopover(anchor, status) {
		Leads.showPopover(anchor, status, {
			SupabaseAPI,
			getHealthMessages
		});
	}

	function hidePopover() {
		Leads.hidePopover();
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

	// ---- Lead Forms ----
	// Wrapper function for saveNewLead - calls module function
	// Must be inside IIFE to access renderLeads
	window.saveNewLead = async function() {
		await Leads.saveNewLead({
			SupabaseAPI,
			state,
			toast,
			hideModal,
			renderLeads
		});
	}

	function renderAgentSelect(lead){
		const opts = realAgents.map(a => `<option value="${a.id}" ${a.id===lead.assigned_agent_id?'selected':''}>${a.name}</option>`).join('');
		return `<select class="select" data-assign="${lead.id}"><option value="">Unassigned</option>${opts}</select>`;
	}

	// ---- Document Status Rendering ----
	// Wrapper functions for document status - calls module functions
	function renderDocumentStepStatus(step, currentStep) {
		return Documents.renderDocumentStepStatus(step, currentStep);
	}

	function renderDocumentSteps(leadId) {
		return Documents.renderDocumentSteps(leadId, mockDocumentStatuses);
	}

	// ---- Interactive Progress System ----
	// Note: Documents page now uses real Supabase data via Documents module
	// mockProgressLeads removed - was only used by dead viewLeadDetails() function

	// Note: mockBugs still imported from src/state/mockData.js (will be removed in Phase 4)
	// Bugs feature still uses mock data - Supabase API methods not yet implemented



	// Progress steps configuration - imported from module
	const progressSteps = Documents.progressSteps;

	// Wrapper function for renderProgressTable - calls module function
	function renderProgressTable(tbodyId, leads) {
		Documents.renderProgressTable(tbodyId, leads, {
			createLeadTable,
			showStepDetails
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

	// Wrapper function for toggleLeadTable - calls module function
	function toggleLeadTable(leadId) {
		Documents.toggleLeadTable(leadId);
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

	// ---- Specials Actions ----
	// Wrapper functions for specials - must be inside IIFE to access renderSpecials
	window.saveNewSpecial = function() {
		Properties.saveNewSpecial({
			api,
			toast,
			hideModal,
			renderSpecials,
			state
		});
	}

	window.deleteSpecial = function(specialId) {
		Properties.deleteSpecial(specialId, {
			api,
			toast,
			renderSpecials
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

	// Wrapper function for renderLeadsTable - calls module function
	function renderLeadsTable(searchTerm = '', searchType = 'both'){
		Documents.renderLeadsTable(searchTerm, searchType, {
			state,
			realAgents,
			mockDocumentStatuses,
			formatDate
		});
	}

	// Helper functions for document status - wrapper functions that call module functions
	function getDocumentProgress(leadId) {
		return Documents.getDocumentProgress(leadId, mockDocumentStatuses);
	}

	function getCurrentDocumentStep(leadId) {
		return Documents.getCurrentDocumentStep(leadId, mockDocumentStatuses);
	}

	function getDocumentStatus(leadId) {
		return Documents.getDocumentStatus(leadId, mockDocumentStatuses);
	}

	function getLastDocumentUpdate(leadId) {
		return Documents.getLastDocumentUpdate(leadId, mockDocumentStatuses);
	}

	function updateDocumentStatus(leadId) {
		Documents.updateDocumentStatus(leadId, toast);
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

	// ---- Map Management ----
	// Wrapper functions for map management - calls module functions
	function initMap() {
		Listings.initMap();
	}

	function clearMarkers() {
		Listings.clearMarkers();
	}

	function addMarker(prop) {
		Listings.addMarker(prop);
	}

	function selectProperty(prop) {
		Listings.selectProperty(prop);
	}

	// ---- Geocoding Helper ----
	// Moved to src/utils/geocoding.js for reusability

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
			map: Listings.getMap(), // Get map instance from module
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
	// Wrapper functions for routing - calls module functions
	function setRoleLabel(page = 'leads'){
		Routing.setRoleLabel(page, state);
	}

	function updateNavigation(activePage) {
		Routing.updateNavigation(activePage);
	}

	function route(){
		Routing.route({
			state,
			hide,
			show,
			setRoleLabel,
			renderAgents,
			renderListings,
			renderDocuments,
			renderProperties,
			renderAdmin,
			renderBugs,
			renderLeads,
			initMap,
			updateNavigation,
			updateBugFlagVisibility
		});
	}

	// ---- Load Real Agents from Supabase ----
	// Wrapper function for loadAgents - calls module function
	async function loadAgents() {
		return await Init.loadAgents(SupabaseAPI);
	}

	// ---- App Initialization (called by auth.js after login) ----
	window.initializeApp = async function() {
		await Init.initializeApp({
			state,
			SupabaseAPI,
			updateNavVisibility,
			initializeRouting,
			setRealAgents: (agents) => { realAgents = agents; }
		});
	};

	// Update navigation visibility based on role - wrapper function
	function updateNavVisibility() {
		Routing.updateNavVisibility(state);
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
			SupabaseAPI,

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

			// Profile functions
			updateProfile: updateUserProfile,
			changePassword: changeOwnPassword,
			updateNotificationPreferences,
			openProfileModal,

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

			// CSV import/export functions
			downloadCSVTemplate,
			importCSV,

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

	// Initialize routing (called by initializeApp after auth) - wrapper function
	function initializeRouting() {
		Routing.initializeRouting(route);
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
