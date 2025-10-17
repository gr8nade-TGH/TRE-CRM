/**
 * Listings Feature Module
 * Handles all listings-related functionality
 */

import { get, set, update } from '../../core/state.js';
import { registerRoute } from '../../core/router.js';
import { formatDate, toast } from '../../utils/helpers.js';
import supabaseService from '../../api/supabase.js';
import { mockProperties } from '../../constants/mockData.js';

class ListingsManager {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // Register route handler
        registerRoute('listings', () => this.renderListings());
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('🔧 Listings: Module initialized');
    }
    
    setupEventListeners() {
        // Add listing button
        const addListingBtn = document.getElementById('addListingBtn');
        if (addListingBtn) {
            addListingBtn.addEventListener('click', () => this.showAddListingModal());
        }
        
        // Search functionality
        const searchInput = document.getElementById('listingsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }
    
    async renderListings() {
        try {
            console.log('🔧 Listings: Rendering listings page');
            
            // Load listings data
            await this.loadListings();
            
            // Render listings table
            this.renderListingsTable();
            
        } catch (error) {
            console.error('🔧 Listings: Error rendering listings', error);
            toast('Failed to load listings', 'error');
        }
    }
    
    async loadListings() {
        try {
            // Try to load from Supabase first
            try {
                const properties = await supabaseService.getProperties();
                set('properties', properties);
                console.log('🔧 Listings: Loaded from Supabase', properties.length);
                
            } catch (error) {
                console.warn('🔧 Listings: Supabase failed, using mock data', error);
                // Fallback to mock data
                set('properties', [...mockProperties]);
            }
            
        } catch (error) {
            console.error('🔧 Listings: Error loading listings', error);
            // Fallback to mock data
            set('properties', [...mockProperties]);
        }
    }
    
    renderListingsTable() {
        const tbody = document.getElementById('listingsTbody');
        if (!tbody) return;
        
        const properties = get('properties');
        
        tbody.innerHTML = properties.map(property => `
            <tr>
                <td>${property.address}</td>
                <td>${property.city}, ${property.state} ${property.zip}</td>
                <td>${property.bedrooms}</td>
                <td>${property.bathrooms}</td>
                <td>$${property.rent.toLocaleString()}</td>
                <td>
                    <span class="status-badge status-${property.status}">
                        ${property.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewPropertyDetails('${property.id}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('🔧 Listings: Table rendered with', properties.length, 'properties');
    }
    
    handleSearch(searchTerm) {
        set('searchTerm', searchTerm);
        this.renderListings();
    }
    
    showAddListingModal() {
        const modal = document.getElementById('addListingModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    async saveNewListing(listingData) {
        try {
            // Try to save to Supabase first
            try {
                const newListing = await supabaseService.createProperty(listingData);
                console.log('🔧 Listings: Listing saved to Supabase', newListing);
                
                // Add to local state
                const properties = get('properties');
                set('properties', [newListing, ...properties]);
                
                toast('Listing created successfully', 'success');
                return newListing;
                
            } catch (error) {
                console.warn('🔧 Listings: Supabase save failed, using mock', error);
            }
            
            // Fallback to mock data
            const mockListing = {
                id: `prop_${Date.now()}`,
                ...listingData,
                status: 'available'
            };
            
            const properties = get('properties');
            set('properties', [mockListing, ...properties]);
            
            toast('Listing created successfully (mock)', 'success');
            return mockListing;
            
        } catch (error) {
            console.error('🔧 Listings: Error saving listing', error);
            toast('Failed to create listing', 'error');
            throw error;
        }
    }
}

// Initialize listings manager
const listingsManager = new ListingsManager();

// Export for global access
window.listingsManager = listingsManager;
window.viewPropertyDetails = (propertyId) => {
    console.log('🔧 Listings: View property details', propertyId);
    // This will be implemented with the property details modal
};

export default listingsManager;
