/**
 * Admin Feature Module
 * Handles all admin-related functionality
 */

import { get, set, update } from '../../core/state.js';
import { registerRoute } from '../../core/router.js';
import { formatDate, toast } from '../../utils/helpers.js';
import supabaseService from '../../api/supabase.js';

class AdminManager {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Register route handler
        registerRoute('admin', this.renderAdmin.bind(this));
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('🔧 Admin: Module initialized');
    }
    
    setupEventListeners() {
        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }
    }
    
    async renderAdmin() {
        try {
            console.log('🔧 Admin: Rendering admin page');
            
            // Check if user has admin access
            const role = get('role');
            if (role !== 'super_user') {
                toast('Access denied. Super user role required.', 'error');
                return;
            }
            
            // Load admin data
            await this.loadAdminData();
            
            // Render admin interface
            this.renderUsersTable();
            this.renderAuditLog();
            
        } catch (error) {
            console.error('🔧 Admin: Error rendering admin', error);
            toast('Failed to load admin data', 'error');
        }
    }
    
    async loadAdminData() {
        try {
            // Load users and audit log
            // This would typically load from Supabase
            console.log('🔧 Admin: Loading admin data');
            
        } catch (error) {
            console.error('🔧 Admin: Error loading admin data', error);
        }
    }
    
    renderUsersTable() {
        const tbody = document.getElementById('usersTbody');
        if (!tbody) return;
        
        // Mock users data for now
        const users = [
            {
                id: 'user_1',
                name: 'John Manager',
                email: 'manager@tre.com',
                role: 'manager',
                created_at: '2024-01-01T00:00:00Z'
            },
            {
                id: 'user_2',
                name: 'Alex Agent',
                email: 'alex@example.com',
                role: 'agent',
                created_at: '2024-01-15T00:00:00Z'
            }
        ];
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge status-${user.role}">
                        ${user.role}
                    </span>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="changePassword('${user.id}')">
                            Password
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        console.log('🔧 Admin: Users table rendered');
    }
    
    renderAuditLog() {
        const tbody = document.getElementById('auditTbody');
        if (!tbody) return;
        
        // Mock audit log data for now
        const auditLog = [
            {
                id: 'audit_1',
                action: 'user_created',
                performed_by: 'manager_1',
                performed_by_name: 'John Manager',
                timestamp: '2024-01-15T10:30:00Z',
                details: 'Created new agent user: alex@example.com'
            },
            {
                id: 'audit_2',
                action: 'lead_updated',
                performed_by: 'agent_1',
                performed_by_name: 'Alex Agent',
                timestamp: '2024-01-14T16:30:00Z',
                details: 'Email updated to alex@trecrm.com'
            }
        ];
        
        tbody.innerHTML = auditLog.map(entry => `
            <tr>
                <td>${entry.action}</td>
                <td>${entry.performed_by_name}</td>
                <td>${formatDate(entry.timestamp)}</td>
                <td>${entry.details}</td>
            </tr>
        `).join('');
        
        console.log('🔧 Admin: Audit log rendered');
    }
    
    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    async saveNewUser(userData) {
        try {
            // Try to save to Supabase first
            try {
                const result = await supabaseService.createUser(userData);
                console.log('🔧 Admin: User saved to Supabase', result);
                toast('User created successfully', 'success');
                return result;
                
            } catch (error) {
                console.warn('🔧 Admin: Supabase save failed', error);
                throw error;
            }
            
        } catch (error) {
            console.error('🔧 Admin: Error saving user', error);
            toast('Failed to create user', 'error');
            throw error;
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();

// Export for global access
window.adminManager = adminManager;
window.editUser = (userId) => {
    console.log('🔧 Admin: Edit user', userId);
    // This will be implemented with the edit user modal
};

window.changePassword = (userId) => {
    console.log('🔧 Admin: Change password for user', userId);
    // This will be implemented with the change password modal
};

window.deleteUser = (userId) => {
    console.log('🔧 Admin: Delete user', userId);
    // This will be implemented with the delete confirmation
};

export default adminManager;
