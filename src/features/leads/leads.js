/**
 * Leads Feature Module
 * Handles all leads-related functionality
 */

import { get, set, update } from '../../core/state.js';
import { registerRoute } from '../../core/router.js';
import { formatDate, toast } from '../../utils/helpers.js';
import supabaseService from '../../api/supabase.js';
import { mockLeads } from '../../constants/mockData.js';

class LeadsManager {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Register route handler
        registerRoute('leads', this.renderLeads.bind(this));
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('🔧 Leads: Module initialized');
    }
    
    setupEventListeners() {
        // Add lead button
        const addLeadBtn = document.getElementById('addLeadBtn');
        if (addLeadBtn) {
            addLeadBtn.addEventListener('click', () => this.showAddLeadModal());
        }
        
        // Search functionality
        const searchInput = document.getElementById('leadsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // Sort functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sort-header')) {
                const column = e.target.dataset.column;
                const direction = e.target.dataset.direction === 'asc' ? 'desc' : 'asc';
                this.handleSort(column, direction);
            }
        });
    }
    
    async renderLeads() {
        try {
            console.log('🔧 Leads: Rendering leads page');
            
            // Load leads data
            await this.loadLeads();
            
            // Render leads table
            this.renderLeadsTable();
            
            // Update pagination
            this.updatePagination();
            
        } catch (error) {
            console.error('🔧 Leads: Error rendering leads', error);
            toast('Failed to load leads', 'error');
        }
    }
    
    async loadLeads() {
        try {
            const state = get();
            const { role, agentId, searchTerm, sort, page, pageSize, filters } = state;
            
            // Try to load from Supabase first
            try {
                const result = await supabaseService.getLeads({
                    role,
                    agentId,
                    search: searchTerm,
                    sortKey: sort.key,
                    sortDir: sort.dir,
                    page,
                    pageSize,
                    filters
                });
                
                set('leads', result.data);
                console.log('🔧 Leads: Loaded from Supabase', result.data.length);
                
            } catch (error) {
                console.warn('🔧 Leads: Supabase failed, using mock data', error);
                // Fallback to mock data
                set('leads', [...mockLeads]);
            }
            
        } catch (error) {
            console.error('🔧 Leads: Error loading leads', error);
            // Fallback to mock data
            set('leads', [...mockLeads]);
        }
    }
    
    renderLeadsTable() {
        const tbody = document.getElementById('leadsTbody');
        if (!tbody) return;
        
        const leads = get('leads');
        
        tbody.innerHTML = leads.map(lead => `
            <tr>
                <td>${lead.name}</td>
                <td>${lead.email}</td>
                <td>${lead.phone}</td>
                <td>${formatDate(lead.submitted_at)}</td>
                <td>
                    <span class="status-badge status-${lead.status}">
                        ${lead.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewLeadDetails('${lead.id}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('🔧 Leads: Table rendered with', leads.length, 'leads');
    }
    
    updatePagination() {
        const leads = get('leads');
        const page = get('page');
        const pageSize = get('pageSize');
        
        const totalPages = Math.ceil(leads.length / pageSize);
        const startItem = (page - 1) * pageSize + 1;
        const endItem = Math.min(page * pageSize, leads.length);
        
        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${leads.length} leads`;
        }
        
        // Update pagination buttons
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) {
            prevBtn.disabled = page <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = page >= totalPages;
        }
    }
    
    handleSearch(searchTerm) {
        set('searchTerm', searchTerm);
        set('page', 1); // Reset to first page
        this.renderLeads();
    }
    
    handleSort(column, direction) {
        update({
            sort: { key: column, dir: direction },
            page: 1 // Reset to first page
        });
        this.renderLeads();
    }
    
    showAddLeadModal() {
        const modal = document.getElementById('addLeadModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    async saveNewLead(leadData) {
        try {
            // Try to save to Supabase first
            try {
                const newLead = await supabaseService.createLead(leadData);
                console.log('🔧 Leads: Lead saved to Supabase', newLead);
                toast('Lead created successfully', 'success');
                return newLead;
            } catch (error) {
                console.warn('🔧 Leads: Supabase save failed, using mock', error);
            }
            
            // Fallback to mock data
            const mockLead = {
                id: `lead_${Date.now()}`,
                ...leadData,
                submitted_at: new Date().toISOString(),
                status: 'new'
            };
            
            const leads = get('leads');
            set('leads', [mockLead, ...leads]);
            
            toast('Lead created successfully (mock)', 'success');
            return mockLead;
            
        } catch (error) {
            console.error('🔧 Leads: Error saving lead', error);
            toast('Failed to create lead', 'error');
            throw error;
        }
    }
}

// Initialize leads manager
const leadsManager = new LeadsManager();

// Export for global access
window.leadsManager = leadsManager;
window.viewLeadDetails = (leadId) => {
    console.log('🔧 Leads: View lead details', leadId);
    // This will be implemented with the lead details modal
};

export default leadsManager;
