/**
 * Application State Management
 * Centralized state management for the TRE CRM application
 */

import { CONFIG } from '../constants/config.js';
import { mockLeads, mockAgents, mockProperties } from '../constants/mockData.js';

class StateManager {
    constructor() {
        this.state = {
            // User & Auth
            user: null,
            role: 'manager',
            agentId: 'agent_1',
            
            // Navigation
            currentPage: 'leads',
            
            // Data
            leads: [...mockLeads],
            agents: [...mockAgents],
            properties: [...mockProperties],
            
            // UI State
            page: 1,
            pageSize: CONFIG.DEFAULT_PAGE_SIZE,
            sort: { key: 'submitted_at', dir: 'desc' },
            
            // Modals
            activeModal: null,
            
            // Search & Filters
            searchTerm: '',
            filters: {}
        };
        
        this.listeners = [];
    }
    
    // Get current state
    getState() {
        return { ...this.state };
    }
    
    // Get specific state property
    get(property) {
        return this.state[property];
    }
    
    // Set state property
    set(property, value) {
        const oldState = { ...this.state };
        this.state[property] = value;
        this.notifyListeners(property, value, oldState);
    }
    
    // Update multiple properties
    update(updates) {
        const oldState = { ...this.state };
        Object.assign(this.state, updates);
        this.notifyListeners('multiple', updates, oldState);
    }
    
    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    
    // Notify listeners of state changes
    notifyListeners(property, value, oldState) {
        this.listeners.forEach(listener => {
            try {
                listener(property, value, oldState, this.state);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });
    }
    
    // Reset state to initial values
    reset() {
        this.state = {
            user: null,
            role: 'manager',
            agentId: 'agent_1',
            currentPage: 'leads',
            leads: [...mockLeads],
            agents: [...mockAgents],
            properties: [...mockProperties],
            page: 1,
            pageSize: CONFIG.DEFAULT_PAGE_SIZE,
            sort: { key: 'submitted_at', dir: 'desc' },
            activeModal: null,
            searchTerm: '',
            filters: {}
        };
        this.notifyListeners('reset', this.state, {});
    }
}

// Create singleton instance
const stateManager = new StateManager();

// Export the state manager instance
export default stateManager;

// Export convenience methods
export const getState = () => stateManager.getState();
export const get = (property) => stateManager.get(property);
export const set = (property, value) => stateManager.set(property, value);
export const update = (updates) => stateManager.update(updates);
export const subscribe = (listener) => stateManager.subscribe(listener);
export const reset = () => stateManager.reset();
