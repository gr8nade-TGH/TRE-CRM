/**
 * Navigation Components
 * Handles navigation and routing functionality
 */

import { get, set } from '../core/state.js';
import { navigate } from '../core/router.js';

class NavigationManager {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initialized = true;
        console.log('🔧 Navigation: Component initialized');
    }
    
    setupEventListeners() {
        // Navigation link clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                e.preventDefault();
                const href = e.target.getAttribute('href');
                if (href && href.startsWith('#/')) {
                    const route = href.slice(2); // Remove '#/'
                    this.navigateToRoute(route);
                }
            }
        });
        
        // Pagination buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prevPageBtn') {
                this.goToPreviousPage();
            } else if (e.target.id === 'nextPageBtn') {
                this.goToNextPage();
            }
        });
    }
    
    navigateToRoute(route) {
        console.log('🔧 Navigation: Navigating to', route);
        navigate(route);
    }
    
    goToPreviousPage() {
        const currentPage = get('page');
        if (currentPage > 1) {
            set('page', currentPage - 1);
            this.refreshCurrentPage();
        }
    }
    
    goToNextPage() {
        const currentPage = get('page');
        const pageSize = get('pageSize');
        const currentData = get(get('currentPage')); // Get current data array
        
        if (currentData && currentPage * pageSize < currentData.length) {
            set('page', currentPage + 1);
            this.refreshCurrentPage();
        }
    }
    
    refreshCurrentPage() {
        const currentPage = get('currentPage');
        console.log('🔧 Navigation: Refreshing page', currentPage);
        
        // Trigger page refresh by navigating to current route
        navigate(currentPage);
    }
    
    updateActiveNav(activePage) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page link
        const activeLink = document.querySelector(`[href="#/${activePage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        console.log('🔧 Navigation: Updated active nav for', activePage);
    }
}

// Initialize navigation manager
const navigationManager = new NavigationManager();

// Export for global access
window.navigationManager = navigationManager;

export default navigationManager;
