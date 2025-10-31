// Modals Module - Barrel Export
// Phase 7A: Lead Modals
// Phase 7B: Property/Listing Modals
// Phase 7C: Document/History Modals
// Phase 7D: Showcase/Email/Matches Modals

import * as LeadModals from './lead-modals.js';
import * as LeadNotes from './lead-notes.js';
import * as ListingModals from './listing-modals.js';
import * as PropertyNotes from './property-notes.js';
import * as DocumentModals from './document-modals.js';
import * as ShowcaseModals from './showcase-modals.js';

export {
	LeadModals,
	LeadNotes,
	ListingModals,
	PropertyNotes,
	DocumentModals,
	ShowcaseModals
};

// Re-export individual functions for convenience

// Lead Modals
export {
	openLeadDetailsModal,
	closeLeadDetailsModal,
	openLeadNotesModal,
	closeLeadNotesModal,
	openActivityLogModal,
	closeActivityLogModal,
	renderActivityLog,
	getActivityIcon,
	renderActivityMetadata,
	formatTimeAgo
} from './lead-modals.js';

// Lead Notes
export {
	loadLeadNotes,
	saveLeadNote,
	loadLeadNotesInModal,
	openDrawer,
	closeDrawer
} from './lead-notes.js';

// Listing Modals
export {
	openAddListingModal,
	closeAddListingModal,
	createListing,
	openListingEditModal,
	closeListingEditModal,
	deleteListing,
	saveListingEdit
} from './listing-modals.js';

// Property Notes
export {
	openPropertyNotesModal,
	closePropertyNotesModal,
	loadPropertyNotes,
	addPropertyNote
} from './property-notes.js';

// Document Modals
export {
	openDocumentDetails,
	closeDocumentDetails,
	openHistory,
	closeHistory,
	openHistoryDocumentDetails
} from './document-modals.js';

// Showcase/Email/Matches Modals
export {
	openMatches,
	closeMatches,
	openEmailPreview,
	closeEmailPreview,
	togglePreviewMode,
	previewLandingPage,
	sendShowcaseEmail,
	updateSelectionSummary,
	updateCreateShowcaseBtn,
	openShowcasePreview,
	closeShowcase,
	openBuildShowcaseModal,
	closeBuildShowcase,
	getSelectedListings
} from './showcase-modals.js';

