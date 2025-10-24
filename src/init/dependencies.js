/**
 * Dependency Injection Container
 * 
 * Creates and manages all dependencies needed by the application.
 * This centralizes dependency creation and makes testing easier.
 */

/**
 * Create all dependencies for the application
 * @param {Object} context - Context object containing state, API, etc.
 * @returns {Object} All dependencies needed by event listeners and modules
 */
export function createDependencies(context) {
	const {
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
		openMatches,
		closeMatches,
		showModal,
		hideModal,
		closeLeadDetailsModal,
		closeLeadNotesModal,
		closeAgentEditModal,
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
		saveEditedSpecial,
		deleteEditedSpecial,
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
		updateUserProfile,
		changeOwnPassword,
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
		populateSpecialPropertyDropdown,
		populatePropertyDropdownForContact,

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
	} = context;
	
	return {
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
		openMatches,
		closeMatches,
		showModal,
		hideModal,
		closeLeadDetailsModal,
		closeLeadNotesModal,
		closeAgentEditModal,
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
		saveEditedSpecial,
		deleteEditedSpecial,
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
		populateSpecialPropertyDropdown,
		populatePropertyDropdownForContact,

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
	};
}

