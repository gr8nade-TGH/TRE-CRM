/**
 * Application Router
 * Handles client-side routing and navigation
 */

import { ROUTES } from '../constants/config.js';
import { get, set, update } from './state.js';

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }
    
    init() {
        // Set up hash change listener
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial route
        this.handleRoute();
    }
    
    // Register a route handler
    register(route, handler) {
        this.routes.set(route, handler);
    }
    
    // Navigate to a route
    navigate(route, params = {}) {
        const hash = params && Object.keys(params).length > 0 
            ? `#/${route}/${Object.values(params).join('/')}`
            : `#/${route}`;
        
        window.location.hash = hash;
    }
    
    // Handle route changes
    handleRoute() {
        const hash = window.location.hash.slice(1);
        const [page, ...params] = hash.split('/');
        
        console.log('🔧 Router: Handling route', page, params);
        
        // Update state
        update({
            currentPage: page || ROUTES.LEADS,
            routeParams: params
        });
        
        // Hide all pages
        this.hideAllPages();
        
        // Show current page
        this.showPage(page || ROUTES.LEADS);
        
        // Update navigation
        this.updateNavigation(page || ROUTES.LEADS);
        
        // Execute route handler
        this.executeRouteHandler(page || ROUTES.LEADS, params);
    }
    
    // Hide all page elements
    hideAllPages() {
        document.querySelectorAll('.route-view').forEach(page => {
            page.classList.add('hidden');
        });
    }
    
    // Show specific page
    showPage(page) {
        const pageElement = document.getElementById(page + 'View');
        if (pageElement) {
            pageElement.classList.remove('hidden');
            console.log('🔧 Router: Showing page', page);
        } else {
            console.warn('🔧 Router: Page element not found', page + 'View');
        }
    }
    
    // Update navigation active state
    updateNavigation(activePage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[href="#/${activePage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    // Execute route handler
    executeRouteHandler(page, params) {
        const handler = this.routes.get(page);
        if (handler) {
            try {
                handler(params);
            } catch (error) {
                console.error('🔧 Router: Error executing route handler', error);
            }
        } else {
            console.warn('🔧 Router: No handler found for route', page);
        }
    }
    
    // Get current route info
    getCurrentRoute() {
        const hash = window.location.hash.slice(1);
        const [page, ...params] = hash.split('/');
        return {
            page: page || ROUTES.LEADS,
            params
        };
    }
}

// Create router instance
const router = new Router();

// Export router instance
export default router;

// Export convenience methods
export const navigate = (route, params) => router.navigate(route, params);
export const registerRoute = (route, handler) => router.register(route, handler);
export const getCurrentRoute = () => router.getCurrentRoute();
