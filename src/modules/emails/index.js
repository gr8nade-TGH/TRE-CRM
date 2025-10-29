/**
 * Emails Module - Barrel Export
 * Exports all email-related functions
 */

// Email helper functions (sending emails)
export {
    sendWelcomeEmail,
    sendAgentAssignmentEmail,
    sendLeadCreatedEmails
} from './email-helpers.js';

// Email rendering functions (dashboard UI)
export {
    renderEmails,
    renderEmailStatistics,
    renderEmailLogs,
    renderEmailTemplates,
    previousEmailsPage,
    nextEmailsPage,
    resetEmailsPagination
} from './emails-rendering.js';

// Email action functions (user interactions)
export {
    showEmailDetails,
    showTemplatePreview,
    sendTestEmail,
    filterEmailsByStatus,
    searchEmails
} from './emails-actions.js';

