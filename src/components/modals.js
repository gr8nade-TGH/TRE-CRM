/**
 * Modal Components
 * Handles all modal-related functionality
 */

import { toast } from '../utils/helpers.js';

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('🔧 Modals: Component initialized');
    }
    
    setupEventListeners() {
        // Global click handler for modals
        document.addEventListener('click', (e) => {
            this.handleModalClick(e);
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }
        });
    }
    
    handleModalClick(e) {
        const target = e.target;
        
        // Close button
        if (target.classList.contains('modal-close') || target.classList.contains('close-btn')) {
            const modal = target.closest('.modal');
            if (modal) {
                this.closeModal(modal);
            }
        }
        
        // Backdrop click
        if (target.classList.contains('modal')) {
            this.closeModal(target);
        }
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.activeModal = modal;
            
            // Focus first input
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log('🔧 Modals: Showing modal', modalId);
        }
    }
    
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (modal) {
            modal.classList.add('hidden');
            this.activeModal = null;
            console.log('🔧 Modals: Closed modal');
        }
    }
    
    // Add Lead Modal
    showAddLeadModal() {
        this.showModal('addLeadModal');
    }
    
    closeAddLeadModal() {
        this.closeModal('addLeadModal');
    }
    
    // Add Agent Modal
    showAddAgentModal() {
        this.showModal('addAgentModal');
    }
    
    closeAddAgentModal() {
        this.closeModal('addAgentModal');
    }
    
    // Add Listing Modal
    showAddListingModal() {
        this.showModal('addListingModal');
    }
    
    closeAddListingModal() {
        this.closeModal('addListingModal');
    }
    
    // Add User Modal
    showAddUserModal() {
        this.showModal('addUserModal');
    }
    
    closeAddUserModal() {
        this.closeModal('addUserModal');
    }
}

// Initialize modal manager
const modalManager = new ModalManager();

// Export for global access
window.modalManager = modalManager;
window.showModal = (modalId) => modalManager.showModal(modalId);
window.hideModal = (modalId) => modalManager.closeModal(modalId);

export default modalManager;
