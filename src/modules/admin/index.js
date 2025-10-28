// Admin Module - Barrel Export
// Combines all admin functionality

import * as AdminAPI from './admin-api.js';
import * as AdminRendering from './admin-rendering.js';
import * as AdminActions from './admin-actions.js';

export {
	AdminAPI,
	AdminRendering,
	AdminActions
};

// Re-export individual functions for convenience
export { loadUsers, loadAuditLog, createUser, updateUser, deleteUserFromAPI, changeUserPassword } from './admin-api.js';
export { renderAdmin, renderUsersTable, renderAuditLog, resetUsersPagination, resetAuditLogPagination } from './admin-rendering.js';
export { editUser, changePassword, deleteUser } from './admin-actions.js';

