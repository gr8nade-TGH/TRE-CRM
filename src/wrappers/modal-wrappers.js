/**
 * Modal Wrapper Functions
 * Centralizes all modal-related wrapper functions to reduce script.js size
 */

import * as Modals from '../modules/modals/index.js';
import * as Properties from '../modules/properties/index.js';
import * as Emails from '../modules/emails/index.js';

/**
 * Create modal wrapper functions with dependencies
 * @param {Object} deps - Dependencies object
 * @returns {Object} Object containing all modal wrapper functions
 */
export function createModalWrappers(deps) {
	const {
		state,
		api,
		SupabaseAPI,
		realAgents,
		mockBugs,
		mockClosedLeads,
		mockDocumentStatuses,
		formatDate,
		showModal,
		hideModal,
		toast,
		show,
		hide,
		geocodeAddress,
		renderLeads,
		renderListings,
		renderBugs,
		renderAgents,
		loadLeadNotesInModal,
		loadPropertyNotes,
		renderAgentSelect,
		selectProperty,
		openListingEditModal,
		openInterestedLeads,
		openActivityLogModal,
		openPropertyNotesModal
	} = deps;

	return {
		// Add Listing Modal
		openAddListingModal() {
			Modals.openAddListingModal({ showModal });
		},

		closeAddListingModal() {
			Modals.closeAddListingModal({ hideModal });
		},

		async createListing() {
			await Modals.createListing({
				SupabaseAPI,
				geocodeAddress,
				toast,
				closeAddListingModal: this.closeAddListingModal,
				renderListings
			});
		},

		// Lead Notes Modal
		async loadLeadNotes(leadId) {
			await Modals.loadLeadNotes(leadId, { SupabaseAPI, formatDate });
		},

		async saveLeadNote(isStandalone = false) {
			await Modals.saveLeadNote(isStandalone, {
				SupabaseAPI,
				loadLeadNotesInModal,
				renderLeads,
				toast
			});
		},

		async openLeadNotesModal(leadId, leadName) {
			await Modals.openLeadNotesModal(leadId, leadName, {
				loadLeadNotesInModal,
				showModal
			});
		},

		closeLeadNotesModal() {
			Modals.closeLeadNotesModal({ hideModal });
		},

		async loadLeadNotesInModal(leadId, isStandalone = false) {
			await Modals.loadLeadNotesInModal(leadId, isStandalone, {
				SupabaseAPI,
				formatDate
			});
		},

		// Property Notes Modal
		async openPropertyNotesModal(propertyId, propertyName) {
			await Modals.openPropertyNotesModal(propertyId, propertyName, {
				loadPropertyNotes,
				showModal
			});
		},

		closePropertyNotesModal() {
			Modals.closePropertyNotesModal({ hideModal });
		},

		async loadPropertyNotes(propertyId) {
			await Modals.loadPropertyNotes(propertyId, {
				SupabaseAPI,
				formatDate,
				toast
			});
		},

		async addPropertyNote() {
			await Modals.addPropertyNote({
				state,
				SupabaseAPI,
				loadPropertyNotes,
				renderListings,
				toast
			});
		},

		// Lead Details Modal
		async openLeadDetailsModal(leadId) {
			await Modals.openLeadDetailsModal(leadId, {
				state,
				api,
				mockAgents: realAgents,
				formatDate,
				renderAgentSelect,
				loadLeadNotes: this.loadLeadNotes,
				showModal
			});
		},

		closeLeadDetailsModal() {
			Modals.closeLeadDetailsModal({ hideModal });
		},

		// Activity Log Modal
		async openActivityLogModal(entityId, entityType, entityName) {
			await Modals.openActivityLogModal(entityId, entityType, entityName, {
				SupabaseAPI,
				renderActivityLog: this.renderActivityLog,
				showModal,
				toast
			});
		},

		closeActivityLogModal() {
			Modals.closeActivityLogModal({ hideModal });
		},

		renderActivityLog(activities) {
			return Modals.renderActivityLog(activities, {
				getActivityIcon: Modals.getActivityIcon,
				formatTimeAgo: Modals.formatTimeAgo,
				renderActivityMetadata: Modals.renderActivityMetadata
			});
		},

		// Listing Edit Modal
		async openListingEditModal(property) {
			await Modals.openListingEditModal(property, {
				showModal,
				geocodeAddress
			});
		},

		closeListingEditModal() {
			Modals.closeListingEditModal({ hideModal });
		},

		async deleteListing() {
			await Modals.deleteListing({
				state,
				SupabaseAPI,
				toast,
				closeListingEditModal: this.closeListingEditModal,
				renderListings
			});
		},

		async saveListingEdit() {
			await Modals.saveListingEdit({
				state,
				SupabaseAPI,
				geocodeAddress,
				toast,
				closeListingEditModal: this.closeListingEditModal,
				renderListings
			});
		},

		// Legacy Drawer Functions
		async openDrawer(leadId) {
			await Modals.openDrawer(leadId, {
				openLeadDetailsModal: this.openLeadDetailsModal
			});
		},

		closeDrawer() {
			Modals.closeDrawer({
				closeLeadDetailsModal: this.closeLeadDetailsModal
			});
		},

		// History Modal
		openHistory() {
			Modals.openHistory({
				mockClosedLeads,
				formatDate,
				showModal
			});
		},

		openHistoryDocumentDetails(closedLeadId) {
			Modals.openHistoryDocumentDetails(closedLeadId, {
				mockClosedLeads,
				mockDocumentStatuses,
				showModal
			});
		},

		closeHistory() {
			Modals.closeHistory({ hideModal });
		},

		// Matches Modal
		async openMatches(leadId) {
			await Modals.openMatches(leadId, {
				state,
				SupabaseAPI,
				showModal
			});
		},

		closeMatches() {
			Modals.closeMatches({ hideModal });
		},

		// Email Preview Modal
		async openEmailPreview() {
			await Modals.openEmailPreview({
				state,
				SupabaseAPI,
				showModal
			});
		},

		// Landing Page Preview
		previewLandingPage() {
			Modals.previewLandingPage({
				state,
				showModal
			});
		},

		// Showcase Email Modal
		async sendShowcaseEmail() {
			await Modals.sendShowcaseEmail({
				state,
				SupabaseAPI,
				toast,
				hideModal
			});
		},

		updateSelectionSummary() {
			Modals.updateSelectionSummary({
				state
			});
		},

		// Showcase Preview Modal
		async openShowcasePreview() {
			await Modals.openShowcasePreview({
				state,
				SupabaseAPI
			});
		},

		// Build Showcase Modal
		async openBuildShowcaseModal() {
			await Modals.openBuildShowcaseModal({
				state,
				SupabaseAPI,
				showModal
			});
		},

		closeBuildShowcase() {
			Modals.closeBuildShowcase({ hide });
		},

		// Bug Report Modal
		showBugReportModal(context = {}) {
			Properties.showBugReportModal(context, { state, showModal });
		},

		async submitBugReport() {
			await Properties.submitBugReport({
				api,
				state,
				toast,
				hideModal,
				renderBugs,
				getBrowserInfo: Properties.getBrowserInfo,
				getOSInfo: Properties.getOSInfo
			});
		},

		async showBugDetails(bugId) {
			await Properties.showBugDetails(bugId, {
				mockBugs,
				formatDate,
				showModal,
				toast
			});
		},

		// Email Preview
		showEmailPreview(emailId) {
			Emails.showEmailDetails(emailId, { api, showModal, formatDate });
		},

		async showTemplatePreview(templateId) {
			await Emails.showTemplatePreview(templateId, { api, showModal });
		}
	};
}

