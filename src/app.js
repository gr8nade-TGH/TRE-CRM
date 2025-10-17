/**
 * Main Application Entry Point
 * Initializes the TRE CRM application
 */

import { get, set, update, subscribe } from './core/state.js';
import router, { registerRoute } from './core/router.js';
import { toast } from './utils/helpers.js';

// Import feature modules
import './features/leads/leads.js';
import './features/agents/agents.js';
import './features/listings/listings.js';
import './features/admin/admin.js';

// Import components
import './components/modals.js';
import './components/navigation.js';

class App {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 TRE CRM: Initializing application...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
        } catch (error) {
            console.error('🚀 TRE CRM: Initialization failed', error);
            toast('Application initialization failed', 'error');
        }
    }
    
    async initializeApp() {
        try {
            // Initialize authentication
            await this.initializeAuth();
            
            // Set up routing
            this.setupRouting();
            
            // Set up global event listeners
            this.setupGlobalListeners();
            
            // Set up state subscriptions
            this.setupStateSubscriptions();
            
            // Initialize UI
            this.initializeUI();
            
            this.initialized = true;
            console.log('🚀 TRE CRM: Application initialized successfully');
            
        } catch (error) {
            console.error('🚀 TRE CRM: App initialization failed', error);
            toast('Failed to initialize application', 'error');
        }
    }
    
    async initializeAuth() {
        try {
            // Check for existing session
            const session = localStorage.getItem('tre_session');
            if (session) {
                const userData = JSON.parse(session);
                set('user', userData);
                set('role', userData.role);
                if (userData.agent_id) {
                    set('agentId', userData.agent_id);
                }
                console.log('🔐 Auth: User session restored');
            }
        } catch (error) {
            console.error('🔐 Auth: Session restoration failed', error);
        }
    }
    
    setupRouting() {
        // Register route handlers
        registerRoute('leads', () => {
            console.log('🔧 Router: Loading leads page');
            this.loadLeadsPage();
        });
        
        registerRoute('agents', () => {
            console.log('🔧 Router: Loading agents page');
            this.loadAgentsPage();
        });
        
        registerRoute('listings', () => {
            console.log('🔧 Router: Loading listings page');
            this.loadListingsPage();
        });
        
        registerRoute('admin', () => {
            console.log('🔧 Router: Loading admin page');
            this.loadAdminPage();
        });
        
        console.log('🔧 Router: Routes registered');
    }
    
    setupGlobalListeners() {
        // Global click handler for modals and buttons
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        console.log('🔧 App: Global listeners set up');
    }
    
    setupStateSubscriptions() {
        // Subscribe to state changes
        subscribe((property, value, oldState, newState) => {
            this.handleStateChange(property, value, oldState, newState);
        });
        
        console.log('🔧 App: State subscriptions set up');
    }
    
    initializeUI() {
        // Update navigation based on current role
        this.updateRoleBasedUI();
        
        // Show main app
        this.showMainApp();
        
        console.log('🔧 App: UI initialized');
    }
    
    handleGlobalClick(e) {
        const target = e.target;
        
        // Handle modal close buttons
        if (target.classList.contains('modal-close') || target.classList.contains('close-btn')) {
            const modal = target.closest('.modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }
        
        // Handle toast close
        if (target.classList.contains('toast-close')) {
            const toast = target.closest('.toast');
            if (toast) {
                toast.classList.add('hidden');
            }
        }
    }
    
    handleGlobalKeydown(e) {
        // ESC key closes modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                openModal.classList.add('hidden');
            }
        }
    }
    
    handleStateChange(property, value, oldState, newState) {
        // Handle specific state changes
        switch (property) {
            case 'role':
                this.updateRoleBasedUI();
                break;
            case 'currentPage':
                console.log('🔧 App: Page changed to', value);
                break;
        }
    }
    
    updateRoleBasedUI() {
        const role = get('role');
        const user = get('user');
        
        // Update navigation visibility
        const agentsNav = document.querySelector('[href="#/agents"]');
        const adminNav = document.querySelector('[href="#/admin"]');
        const bugsNav = document.querySelector('[href="#/bugs"]');
        
        if (agentsNav) {
            agentsNav.style.display = ['manager', 'super_user'].includes(role) ? 'block' : 'none';
        }
        
        if (adminNav) {
            adminNav.style.display = role === 'super_user' ? 'block' : 'none';
        }
        
        if (bugsNav) {
            bugsNav.style.display = 'block'; // All roles can see bugs
        }
        
        console.log('🔧 App: UI updated for role:', role);
    }
    
    showMainApp() {
        const loginPortal = document.getElementById('loginPortal');
        const mainApp = document.getElementById('mainApp');
        
        if (loginPortal) loginPortal.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        console.log('🔧 App: Main app displayed');
    }
    
    // Page loaders (these will be implemented by feature modules)
    loadLeadsPage() {
        // This will be handled by the leads feature module
        console.log('🔧 App: Leads page loader called');
    }
    
    loadAgentsPage() {
        // This will be handled by the agents feature module
        console.log('🔧 App: Agents page loader called');
    }
    
    loadListingsPage() {
        // This will be handled by the listings feature module
        console.log('🔧 App: Listings page loader called');
    }
    
    loadAdminPage() {
        // This will be handled by the admin feature module
        console.log('🔧 App: Admin page loader called');
    }
}

// Initialize the application
const app = new App();

// Export for debugging
window.TREApp = app;
