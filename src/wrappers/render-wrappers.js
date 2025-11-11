/**
 * Render Wrapper Functions
 * Centralizes all rendering-related wrapper functions to reduce script.js size
 */

import * as Documents from '../modules/documents/index.js';
import * as Properties from '../modules/properties/index.js';
import * as Agents from '../modules/agents/index.js';
import * as Emails from '../modules/emails/index.js';
import * as Admin from '../modules/admin/index.js';
import * as Listings from '../modules/listings/index.js';

/**
 * Create render wrapper functions with dependencies
 * @param {Object} deps - Dependencies object
 * @returns {Object} Object containing all render wrapper functions
 */
export function createRenderWrappers(deps) {
	const {
		state,
		api,
		SupabaseAPI,
		realAgents,
		mockDocumentStatuses,
		mockInterestedLeads,
		formatDate,
		toast,
		showModal,
		hideModal,
		selectProperty,
		openListingEditModal,
		openInterestedLeads,
		openActivityLogModal,
		openPropertyNotesModal,
		clearMarkers,
		addMarker,
		showEmailPreview,
		showModal: showModalFn,
		changePassword,
		deleteUser
	} = deps;

	return {
		// Documents Rendering
		async renderDocuments() {
			await Documents.renderDocuments({
				state,
				api,
				formatDate
			});
		},

		async renderManagerDocuments() {
			await Documents.renderManagerDocuments({
				state,
				api,
				formatDate
			});
		},

		async renderAgentDocuments() {
			await Documents.renderAgentDocuments({
				state,
				api,
				formatDate
			});
		},

		renderLeadsTable(searchTerm = '', searchType = 'both') {
			Documents.renderLeadsTable(searchTerm, searchType, {
				state,
				realAgents,
				mockDocumentStatuses,
				formatDate
			});
		},

		renderProgressTable(tbodyId, leads) {
			Documents.renderProgressTable(tbodyId, leads, {
				state,
				formatDate
			});
		},

		// Properties Rendering
		async renderProperties() {
			await Properties.renderProperties({
				SupabaseAPI,
				state,
				formatDate
			});
		},

		populatePropertyDropdown(communityNames) {
			Properties.populatePropertyDropdown(communityNames);
		},

		async populateSpecialPropertyDropdown() {
			await Properties.populateSpecialPropertyDropdown(SupabaseAPI);
		},

		async renderPropertyContacts() {
			// Legacy function - now calls renderProperties
			console.log('📞 renderPropertyContacts called (legacy) - redirecting to renderProperties');
			await this.renderProperties();
		},

		async renderBugs() {
			await Properties.renderBugs({ api, formatDate });
		},

		// Agents Rendering
		async renderAgents() {
			await Agents.renderAgents({
				mockAgents: realAgents,
				state,
				getAgentStats: (agentId) => Agents.getAgentStats(agentId, {
					leads: state.leads || []
				})
			});
		},

		// Listings Rendering
		async renderListings(autoSelectProperty = null) {
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
				map: Listings.getMap(),
				clearMarkers,
				addMarker,
				toast
			}, autoSelectProperty);
		},

		// Emails Rendering
		async renderEmails() {
			await Emails.renderEmails({ api, state, showEmailPreview });
		},

		// Admin Rendering
		async renderAdmin() {
			await Admin.renderAdmin({
				state,
				loadUsers: async () => {
					await Admin.loadUsers({ api, state });
				},
				loadAuditLog: async () => {
					await Admin.loadAuditLog({ api, state });
				}
			});
		},

		renderUsersTable() {
			Admin.renderUsersTable({
				state,
				editUser: (userId) => {
					Admin.editUser(userId, {
						state,
						showModal: showModalFn
					});
				},
				changePassword,
				deleteUser
			});
		},

		renderAuditLog() {
			Admin.renderAuditLog({
				state,
				formatDate
			});
		}
	};
}

