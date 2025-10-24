// Utility functions
import {
	formatDate,
	showModal,
	hideModal,
	toast,
	show,
	hide,
	updateSortHeaders
} from './src/utils/helpers.js';
import {
	state
} from './src/state/state.js';
import {
	mockProperties,
	mockInterestedLeads,
	mockBugs,
	mockDocumentStatuses,
	mockClosedLeads
} from './src/state/mockData.js';
import * as SupabaseAPI from './src/api/supabase-api.js';
import { createAPI } from './src/api/api-wrapper.js';
import { getStepModalContent as getStepModalContentUtil } from './src/utils/step-modal-content.js';
import { sortTable as sortTableUtil } from './src/utils/table-sorting.js';
import { sendBuildShowcase as sendBuildShowcaseUtil } from './src/utils/showcase-builder.js';
import { getCurrentStepFromActivities as getCurrentStepUtil, getHealthMessages as getHealthMessagesUtil } from './src/utils/lead-health.js';
import { openAgentDrawer as openAgentDrawerUtil, saveAgentChanges as saveAgentChangesUtil } from './src/utils/agent-drawer.js';
import { geocodeAddress } from './src/utils/geocoding.js';
import { setupAllEventListeners } from './src/events/dom-event-listeners.js';
import { createLeadTable as createLeadTableUtil } from './src/renders/lead-table.js';
import { showStepDetails as showStepDetailsUtil } from './src/renders/progress-modals.js';
import { createDependencies } from './src/init/dependencies.js';
import * as Leads from './src/modules/leads/index.js';
import * as Listings from './src/modules/listings/index.js';
import { downloadCSVTemplate, importCSV } from './src/modules/listings/csv-import.js';
import * as Agents from './src/modules/agents/index.js';
import { updateProfile as updateUserProfile, changePassword as changeOwnPassword, updateNotificationPreferences, openProfileModal } from './src/modules/profile/profile-actions.js';
import * as Documents from './src/modules/documents/index.js';
import * as Admin from './src/modules/admin/index.js';
import * as Properties from './src/modules/properties/index.js';
import * as Modals from './src/modules/modals/index.js';
import * as Showcases from './src/modules/showcases/index.js';
import * as Routing from './src/routing/index.js';
import * as Init from './src/init/index.js';

/* global mapboxgl */
let api, renderLeads, renderSpecials;

(function() {
	// Real agents loaded from Supabase users table
	let realAgents = [];

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

	async function getCurrentStepFromActivities(leadId) {
		return await getCurrentStepUtil(leadId);
	}

	async function getHealthMessages(lead) {
		return await getHealthMessagesUtil(lead, formatDate);
	}

	function showPopover(anchor, status) {
		Leads.showPopover(anchor, status, {
			SupabaseAPI,
			getHealthMessages
		});
	}

	function initPopover() {
		Leads.initPopover();
	}

	function hidePopover() {
		Leads.hidePopover();
	}

	function toggleLeadTable(leadId) {
		Documents.toggleLeadTable(leadId);
	}

	function updateBulkActionsBar() {
		Listings.updateBulkActionsBar({ state });
	}

	function selectProperty(prop) {
		Listings.selectProperty(prop);
	}

	function clearMarkers() {
		Listings.clearMarkers();
	}

	function addMarker(prop) {
		Listings.addMarker(prop);
	}

	api = createAPI({
		mockInterestedLeads,
		mockBugs
	});

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

	const progressSteps = Documents.progressSteps;

	function renderProgressTable(tbodyId, leads) {
		Documents.renderProgressTable(tbodyId, leads, {
			createLeadTable,
			showStepDetails
		});
	}

	function createLeadTable(lead, isExpanded = false) {
		return createLeadTableUtil(lead, isExpanded, {
			progressSteps,
			formatDate
		});
	}

	async function getStepModalContent(lead, step) {
		return await getStepModalContentUtil(lead, step, formatDate);
	}

	async function showStepDetails(lead, step) {
		return await showStepDetailsUtil(lead, step, {
			getStepModalContent,
			showModal,
			toast,
			SupabaseAPI
		});
	}

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

	async function renderProperties() {
		await Properties.renderProperties({
			renderPropertyContacts,
			renderSpecials
		});
	}

	function populatePropertyDropdown(communityNames) {
		Properties.populatePropertyDropdown(communityNames);
	}

	async function populateSpecialPropertyDropdown() {
		await Properties.populateSpecialPropertyDropdown(SupabaseAPI);
	}

	async function renderPropertyContacts() {
		await Properties.renderPropertyContacts({
			state,
			SupabaseAPI,
			populatePropertyDropdown,
			toast
		});
	}

	async function savePropertyContact() {
		await Properties.savePropertyContact({ SupabaseAPI, hideModal, renderPropertyContacts, toast });
	}
	async function editPropertyContact(propertyId, communityName) {
		await Properties.editPropertyContact(propertyId, communityName, { SupabaseAPI, showModal, toast });
	}

	renderSpecials = async function(){
		await Properties.renderSpecials({
			state,
			api,
			formatDate,
			updateSortHeaders
		});
	}

	window.saveNewSpecial = function() {
		Properties.saveNewSpecial({ api, toast, hideModal, renderSpecials, state });
	}
	window.deleteSpecial = function(specialId) {
		Properties.deleteSpecial(specialId, { api, toast, renderSpecials });
	}
	async function renderBugs() {
		await Properties.renderBugs({ api, formatDate });
	}
	function showBugReportModal(context = {}) {
		Properties.showBugReportModal(context, { state, showModal });
	}

	async function submitBugReport() {
		await Properties.submitBugReport({
			api, state, toast, hideModal, renderBugs,
			getBrowserInfo: Properties.getBrowserInfo,
			getOSInfo: Properties.getOSInfo
		});
	}
	function addBugFlags() {
		Properties.addBugFlags({
			state,
			showBugReportModal,
			updateBugFlagVisibility: () => Properties.updateBugFlagVisibility({ state })
		});
	}
	async function showBugDetails(bugId) {
		await Properties.showBugDetails(bugId, { mockBugs, formatDate, showModal, toast });
	}
	async function saveBugChanges(bugId) {
		await Properties.saveBugChanges(bugId, { api, toast, renderBugs });
	}
	function renderLeadsTable(searchTerm = '', searchType = 'both'){
		Documents.renderLeadsTable(searchTerm, searchType, {
			state,
			realAgents,
			mockDocumentStatuses,
			formatDate
		});
	}

	async function renderAgents(){
		await Agents.renderAgents({
			mockAgents: realAgents,
			state,
			getAgentStats: (agentId) => Agents.getAgentStats(agentId, { leads: state.leads || [] })
		});
	}

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
		await Modals.createListing({ SupabaseAPI, geocodeAddress, toast, closeAddListingModal, renderListings });
	}
	async function loadLeadNotes(leadId) {
		await Modals.loadLeadNotes(leadId, { SupabaseAPI, formatDate });
	}
	async function saveLeadNote(isStandalone = false) {
		await Modals.saveLeadNote(isStandalone, { SupabaseAPI, loadLeadNotesInModal, renderLeads, toast });
	}
	async function openPropertyNotesModal(propertyId, propertyName) {
		await Modals.openPropertyNotesModal(propertyId, propertyName, { loadPropertyNotes, showModal });
	}
	function closePropertyNotesModal() {
		Modals.closePropertyNotesModal({ hideModal });
	}
	async function loadPropertyNotes(propertyId) {
		await Modals.loadPropertyNotes(propertyId, { SupabaseAPI, formatDate, toast });
	}
	async function addPropertyNote() {
		await Modals.addPropertyNote({ state, SupabaseAPI, loadPropertyNotes, renderListings, toast });
	}

	async function renderListings(){
		await Listings.renderListings({
			SupabaseAPI,
			state,
			matchesListingsFilters: Listings.matchesListingsFilters,
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

	async function openActivityLogModal(entityId, entityType, entityName) {
		await Modals.openActivityLogModal(entityId, entityType, entityName, {
			SupabaseAPI,
			renderActivityLog,
			showModal,
			toast
		});
	}

	function renderActivityLog(activities) {
		return Modals.renderActivityLog(activities, {
			getActivityIcon,
			formatTimeAgo,
			renderActivityMetadata
		});
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

	async function openAgentDrawer(agentId){
		await openAgentDrawerUtil({
			agentId,
			state,
			realAgents,
			getAgentStats: (agentId) => Agents.getAgentStats(agentId, { leads: state.leads || [] }),
			showModal
		});
	}

	function closeAgentEditModal(){
		hideModal('agentEditModal');
		state.selectedAgentId = null;
	}

	async function saveAgentChanges() {
		await saveAgentChangesUtil({
			state,
			realAgents,
			toast,
			closeAgentEditModal,
			renderAgents
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

	function openHistoryDocumentDetails(closedLeadId) {
		Modals.openHistoryDocumentDetails(closedLeadId, {
			mockClosedLeads,
			show
		});
	}

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

	async function openEmailPreview(){
		await Modals.openEmailPreview({
			state,
			api,
			closeMatches,
			show
		});
	}

	function previewLandingPage() {
		Modals.previewLandingPage({
			state,
			toast
		});
	}

	async function openInterestedLeads(propertyId, propertyName) {
		await Showcases.openInterestedLeads(propertyId, propertyName, { api, show });
	}

	async function sendShowcaseEmail(){
		await Modals.sendShowcaseEmail({
			state,
			api,
			toast,
			closeEmailPreview: () => Modals.closeEmailPreview({ hide })
		});
	}

	function updateSelectionSummary(){
		Modals.updateSelectionSummary({
			state
		});
	}

	async function openShowcasePreview(){
		await Modals.openShowcasePreview({
			state,
			api,
			show
		});
	}

	async function openBuildShowcaseModal(){
		await Modals.openBuildShowcaseModal({
			state,
			mockLeads: state.leads || [],
			getSelectedListings: () => Modals.getSelectedListings({ mockProperties }),
			toast,
			show
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

	async function sendBuildShowcase() {
		await sendBuildShowcaseUtil({
			state,
			api,
			toast,
			closeBuildShowcase: () => Modals.closeBuildShowcase({ hide }),
			updateBuildShowcaseButton: Listings.updateBuildShowcaseButton,
			getSelectedListings: () => Modals.getSelectedListings({ mockProperties })
		});
	}

	async function sendShowcase(){
		await Showcases.sendShowcase({
			state, api, realAgents, mockProperties, toast,
			closeShowcase: () => Modals.closeShowcase({ hide }),
			closeMatches
		});
	}

	function closeBuildShowcase() {
		Modals.closeBuildShowcase({ hide });
	}

	function setRoleLabel(page = 'leads'){
		Routing.setRoleLabel(page, state);
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
			initMap: Listings.initMap,
			updateNavigation: Routing.updateNavigation,
			updateBugFlagVisibility: () => Properties.updateBugFlagVisibility({ state })
		});
	}

	window.initializeApp = async function() {
		await Init.initializeApp({
			state,
			SupabaseAPI,
			updateNavVisibility: () => Routing.updateNavVisibility(state),
			initializeRouting: () => Routing.initializeRouting(route),
			setRealAgents: (agents) => { realAgents = agents; }
		});
	};

	document.addEventListener('DOMContentLoaded', () => {
		console.log('DOM loaded, waiting for authentication...');

		import('./src/modules/modals/unit-modals.js').then(module => {
			module.initializeUnitModalListeners();
		});

		window.addEventListener('refreshListings', () => {
			if (state.currentPage === 'listings') {
				renderListings();
			}
		});

		// Create and inject all dependencies
		const deps = createDependencies({
			state, realAgents, realUsers, api, mockClosedLeads, SupabaseAPI,
			renderLeads, renderListings, renderAgents, renderDocuments, renderSpecials,
			renderBugs, renderAdmin, renderLeadsTable, renderProperties, renderAuditLog,
			openDrawer, closeDrawer, openAgentDrawer, openMatches,
			closeMatches, showModal, hideModal, closeLeadDetailsModal, closeLeadNotesModal,
			closeAgentEditModal,
			openInterestedLeads,
			openPropertyNotesModal, closePropertyNotesModal, openAddListingModal,
			closeAddListingModal, openBuildShowcaseModal, openShowcasePreview,
			saveNewLead, savePropertyContact, editPropertyContact, saveNewSpecial,
			deleteSpecial, createListing, addPropertyNote, saveAgentChanges, saveLeadNote,
			updateUser, createUser, changeUserPassword, saveListingEdit, deleteListing,
			updateUserProfile, changeOwnPassword, updateNotificationPreferences, openProfileModal,
			sortTable, toast, formatDate, showPopover, initPopover, hidePopover, toggleLeadTable,
			updateBulkActionsBar,
			updateBuildShowcaseButton: Listings.updateBuildShowcaseButton,
			bulkMarkAsUnavailable, bulkDeleteListings, downloadCSVTemplate, importCSV,
			submitBugReport, saveBugChanges, addBugFlags, showBugDetails,
			sendBuildShowcase, sendShowcase, closeBuildShowcase, updateSelectionSummary,
			openEmailPreview, previewLandingPage, openHistory,
			sendShowcaseEmail, openHistoryDocumentDetails
		});

		setupAllEventListeners(deps);
	});

	async function openListingEditModal(property) {
		await Modals.openListingEditModal(property, {
			state,
			showModal,
			SupabaseAPI
		});
	}

	async function deleteListing() {
		await Modals.deleteListing({
			SupabaseAPI,
			toast,
			closeListingEditModal: () => Modals.closeListingEditModal({ hideModal }),
			renderListings
		});
	}

	async function saveListingEdit() {
		await Modals.saveListingEdit({
			SupabaseAPI,
			toast,
			closeListingEditModal: () => Modals.closeListingEditModal({ hideModal }),
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
