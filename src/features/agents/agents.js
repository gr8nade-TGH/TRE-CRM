/**
 * Agents Feature Module
 * Handles all agents-related functionality
 */

import { get, set, update } from '../../core/state.js';
import { registerRoute } from '../../core/router.js';
import { formatDate, toast, generateSlug } from '../../utils/helpers.js';
import supabaseService from '../../api/supabase.js';
import { mockAgents } from '../../constants/mockData.js';

class AgentsManager {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Register route handler
        registerRoute('agents', this.renderAgents.bind(this));
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('🔧 Agents: Module initialized');
    }
    
    setupEventListeners() {
        // Add agent button
        const addAgentBtn = document.getElementById('addAgentBtn');
        if (addAgentBtn) {
            addAgentBtn.addEventListener('click', () => this.showAddAgentModal());
        }
        
        // Search functionality
        const searchInput = document.getElementById('agentsSearch');
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
    
    async renderAgents() {
        try {
            console.log('🔧 Agents: Rendering agents page');
            
            // Load agents data
            await this.loadAgents();
            
            // Render agents table
            this.renderAgentsTable();
            
            // Update pagination
            this.updatePagination();
            
        } catch (error) {
            console.error('🔧 Agents: Error rendering agents', error);
            toast('Failed to load agents', 'error');
        }
    }
    
    async loadAgents() {
        try {
            // Try to load from Supabase first
            try {
                const agents = await supabaseService.getAgents();
                set('agents', agents);
                console.log('🔧 Agents: Loaded from Supabase', agents.length);
                
            } catch (error) {
                console.warn('🔧 Agents: Supabase failed, using mock data', error);
                // Fallback to mock data
                set('agents', [...mockAgents]);
            }
            
        } catch (error) {
            console.error('🔧 Agents: Error loading agents', error);
            // Fallback to mock data
            set('agents', [...mockAgents]);
        }
    }
    
    renderAgentsTable() {
        const tbody = document.getElementById('agentsTbody');
        if (!tbody) return;
        
        const agents = get('agents');
        
        tbody.innerHTML = agents.map(agent => `
            <tr>
                <td>${agent.name}</td>
                <td>${agent.email}</td>
                <td>${agent.phone}</td>
                <td>${formatDate(agent.hire_date)}</td>
                <td>
                    <span class="status-badge status-${agent.role}">
                        ${agent.role}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="viewAgentDetails('${agent.id}')">
                            View
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewAgentLandingPage('${agent.id}')">
                            Landing Page
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="shareAgentLandingPage('${agent.id}')">
                            Share
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        console.log('🔧 Agents: Table rendered with', agents.length, 'agents');
    }
    
    updatePagination() {
        const agents = get('agents');
        const page = get('page');
        const pageSize = get('pageSize');
        
        const totalPages = Math.ceil(agents.length / pageSize);
        const startItem = (page - 1) * pageSize + 1;
        const endItem = Math.min(page * pageSize, agents.length);
        
        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${agents.length} agents`;
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
        this.renderAgents();
    }
    
    handleSort(column, direction) {
        update({
            sort: { key: column, dir: direction },
            page: 1 // Reset to first page
        });
        this.renderAgents();
    }
    
    showAddAgentModal() {
        const modal = document.getElementById('addAgentModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Pre-fill hire date
            const hireDateInput = modal.querySelector('#agentHireDate');
            if (hireDateInput) {
                hireDateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }
    
    async saveNewAgent(agentData) {
        try {
            // Generate slug for landing page
            const slug = generateSlug(agentData.name);
            const agentWithSlug = { ...agentData, slug };
            
            // Try to save to Supabase first
            try {
                const result = await supabaseService.createUser(agentWithSlug);
                console.log('🔧 Agents: Agent saved to Supabase', result);
                
                // Add to local state
                const newAgent = {
                    id: result.user.id,
                    ...agentWithSlug
                };
                
                const agents = get('agents');
                set('agents', [newAgent, ...agents]);
                
                toast('Agent created successfully', 'success');
                return newAgent;
                
            } catch (error) {
                console.warn('🔧 Agents: Supabase save failed, using mock', error);
            }
            
            // Fallback to mock data
            const mockAgent = {
                id: `agent_${Date.now()}`,
                ...agentWithSlug,
                hire_date: new Date().toISOString().split('T')[0]
            };
            
            const agents = get('agents');
            set('agents', [mockAgent, ...agents]);
            
            toast('Agent created successfully (mock)', 'success');
            return mockAgent;
            
        } catch (error) {
            console.error('🔧 Agents: Error saving agent', error);
            toast('Failed to create agent', 'error');
            throw error;
        }
    }
}

// Initialize agents manager
const agentsManager = new AgentsManager();

// Export for global access
window.agentsManager = agentsManager;
window.viewAgentDetails = (agentId) => {
    console.log('🔧 Agents: View agent details', agentId);
    // This will be implemented with the agent details modal
};

window.viewAgentLandingPage = (agentId) => {
    console.log('🔧 Agents: View agent landing page', agentId);
    const agents = get('agents');
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        const url = `agent.html?agent=${agent.slug || agentId}`;
        window.open(url, '_blank');
    }
};

window.shareAgentLandingPage = (agentId) => {
    console.log('🔧 Agents: Share agent landing page', agentId);
    const agents = get('agents');
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
        const url = `${window.location.origin}/agent.html?agent=${agent.slug || agentId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast('Landing page URL copied to clipboard', 'success');
        }).catch(() => {
            toast('Failed to copy URL', 'error');
        });
    }
};

export default agentsManager;
