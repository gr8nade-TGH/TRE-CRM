/**
 * Supabase Client Configuration
 * This file sets up the Supabase client and provides global functions
 */

// Supabase configuration - loaded from config.js

// Initialize Supabase client
let supabaseClient = null;

// Initialize Supabase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is available
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase;
        console.log('🔧 Supabase: Client initialized');
    } else {
        console.warn('🔧 Supabase: Client not available, using mock mode');
        // Create mock functions for development
        createMockSupabase();
    }
});

// Create mock Supabase functions for development
function createMockSupabase() {
    window.getCurrentSession = async function() {
        // Check localStorage for mock session
        const session = localStorage.getItem('tre_session');
        if (session) {
            return JSON.parse(session);
        }
        return null;
    };
    
    window.supabase = {
        auth: {
            signUp: async function(data) {
                console.log('🔧 Mock: Sign up', data);
                return { data: { user: { id: 'mock_user_' + Date.now(), email: data.email } }, error: null };
            },
            signInWithPassword: async function(data) {
                console.log('🔧 Mock: Sign in', data);
                const user = { id: 'mock_user_' + Date.now(), email: data.email, role: 'manager' };
                const session = { user, access_token: 'mock_token', expires_at: Date.now() + 3600 };
                localStorage.setItem('tre_session', JSON.stringify(session));
                return { data: { user, session }, error: null };
            },
            signOut: async function() {
                console.log('🔧 Mock: Sign out');
                localStorage.removeItem('tre_session');
                return { error: null };
            }
        }
    };
    
    // Add the global functions that auth.js expects
    window.signIn = async function(email, password) {
        console.log('🔧 Mock: Global signIn called', email);
        const result = await window.supabase.auth.signInWithPassword({ email, password });
        if (result.data && result.data.user) {
            // Store session
            localStorage.setItem('tre_session', JSON.stringify(result.data.session));
            return result.data.user;
        }
        throw new Error(result.error?.message || 'Login failed');
    };
    
    window.signUp = async function(email, password, userData) {
        console.log('🔧 Mock: Global signUp called', email);
        const result = await window.supabase.auth.signUp({ email, password, options: { data: userData } });
        if (result.data && result.data.user) {
            return result.data.user;
        }
        throw new Error(result.error?.message || 'Registration failed');
    };
    
    window.signOut = async function() {
        console.log('🔧 Mock: Global signOut called');
        await window.supabase.auth.signOut();
        localStorage.removeItem('tre_session');
    };
    
    // Add other global functions that might be needed
    window.showMainApp = function(user) {
        console.log('🔧 Mock: showMainApp called', user);
        
        // Hide login portal and show main app
        const loginPortal = document.getElementById('loginPortal');
        const mainApp = document.getElementById('mainAppContent');
        
        if (loginPortal) {
            loginPortal.style.display = 'none';
            console.log('🔧 Mock: Login portal hidden');
        }
        
        if (mainApp) {
            mainApp.style.display = 'block';
            console.log('🔧 Mock: Main app shown');
        }
        
        // Update role-based UI
        if (user && user.role) {
            const role = user.role;
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
            
            console.log('🔧 Mock: UI updated for role:', role);
        }
    };
    
    window.showLoginPortal = function() {
        console.log('🔧 Mock: showLoginPortal called');
        
        // Show login portal and hide main app
        const loginPortal = document.getElementById('loginPortal');
        const mainApp = document.getElementById('mainAppContent');
        
        if (loginPortal) {
            loginPortal.style.display = 'flex';
            console.log('🔧 Mock: Login portal shown');
        }
        
        if (mainApp) {
            mainApp.style.display = 'none';
            console.log('🔧 Mock: Main app hidden');
        }
    };
    
    supabaseClient = window.supabase;
    console.log('🔧 Supabase: Mock client created');
}

// Export for use in modules
window.getCurrentSession = window.getCurrentSession || createMockSupabase;
