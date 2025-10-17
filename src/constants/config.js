/**
 * Application Configuration Constants
 * Centralized configuration for the TRE CRM application
 */

export const CONFIG = {
    // Application Info
    APP_NAME: 'TRE CRM',
    VERSION: '2.0.0',
    
    // API Configuration
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    
    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    
    // UI Configuration
    TOAST_DURATION: 2000,
    MODAL_ANIMATION_DURATION: 300,
    
    // Health Status Configuration
    HEALTH_STATUS: {
        EXCELLENT: { threshold: 24, color: '#10B981', label: 'Excellent' },
        GOOD: { threshold: 48, color: '#3B82F6', label: 'Good' },
        FAIR: { threshold: 72, color: '#F59E0B', label: 'Fair' },
        POOR: { threshold: 96, color: '#EF4444', label: 'Poor' },
        CRITICAL: { threshold: Infinity, color: '#DC2626', label: 'Critical' }
    },
    
    // Document Steps
    DOCUMENT_STEPS: [
        'Application',
        'Income Verification',
        'Background Check',
        'References',
        'Lease Agreement',
        'Move-in'
    ],
    
    // User Roles
    ROLES: {
        SUPER_USER: 'super_user',
        MANAGER: 'manager',
        AGENT: 'agent'
    },
    
    // Lead Status
    LEAD_STATUS: {
        NEW: 'new',
        CONTACTED: 'contacted',
        INTERESTED: 'interested',
        QUALIFIED: 'qualified',
        CLOSED: 'closed'
    }
};

export const ROUTES = {
    LEADS: 'leads',
    AGENTS: 'agents',
    LISTINGS: 'listings',
    ADMIN: 'admin',
    BUGS: 'bugs',
    SPECIALS: 'specials'
};

export const API_ENDPOINTS = {
    LEADS: '/leads',
    AGENTS: '/agents',
    PROPERTIES: '/properties',
    USERS: '/users',
    SPECIALS: '/specials',
    BUGS: '/bugs',
    AUDIT_LOG: '/audit-log'
};
