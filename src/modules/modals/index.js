// Modals Module - Barrel Export
// Phase 7A: Lead Modals only (more modals to be added in phases 7B, 7C, 7D)

import * as LeadModals from './lead-modals.js';
import * as LeadNotes from './lead-notes.js';

export {
	LeadModals,
	LeadNotes
};

// Re-export individual functions for convenience
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

export {
	loadLeadNotes,
	saveLeadNote,
	loadLeadNotesInModal,
	openDrawer,
	closeDrawer
} from './lead-notes.js';

