/**
 * Supabase Client Configuration
 * This file sets up the Supabase client and provides global functions
 */

// Supabase configuration
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize Supabase client
let supabase = null;

// Initialize Supabase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is available
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase;
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
    
    supabase = window.supabase;
    console.log('🔧 Supabase: Mock client created');
}

// Export for use in modules
window.getCurrentSession = window.getCurrentSession || createMockSupabase;
