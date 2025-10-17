// Supabase Client Configuration
const SUPABASE_URL = 'https://mevirooooypfjbsrmzrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldmlyb29vb3lwZmpic3JtenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MTU1MDgsImV4cCI6MjA3NTI5MTUwOH0.FGez_nPoWZA5NKbJP54e5JsgJILrWB7rBUD4vx6iZZA';

// Wait for Supabase to load, then initialize
let supabase;
if (typeof window !== 'undefined' && window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Supabase library not loaded');
}

// Fetch leads from Supabase
async function fetchLeads() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    
    console.log('✅ Fetched', data.length, 'leads from Supabase');
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Fetch properties from Supabase
async function fetchProperties() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
    
    console.log('✅ Fetched', data.length, 'properties from Supabase');
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Fetch agents/users from Supabase
async function fetchAgents() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['agent', 'manager', 'super_user'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
    
    console.log('✅ Fetched', data.length, 'agents from Supabase');
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Fetch specials from Supabase
async function fetchSpecials() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('specials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching specials:', error);
      return [];
    }
    
    console.log('✅ Fetched', data.length, 'specials from Supabase');
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Fetch bugs from Supabase
async function fetchBugs() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    const { data, error } = await supabase
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bugs:', error);
      return [];
    }
    
    console.log('✅ Fetched', data.length, 'bugs from Supabase');
    return data;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }
    
    // Test with a simple query to the leads table
    const { data, error } = await supabase
      .from('leads')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Data:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
}

// Authentication Functions
async function signUp(email, password, userData) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // name, role, etc.
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

async function signIn(email, password) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

async function signOut() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

async function getCurrentUser() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

async function getCurrentSession() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

// Listen for auth state changes
function onAuthStateChange(callback) {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  
  return supabase.auth.onAuthStateChange(callback);
}

// Export for use in your main script
window.supabaseClient = supabase;
window.fetchLeads = fetchLeads;
window.fetchProperties = fetchProperties;
window.fetchAgents = fetchAgents;
window.fetchSpecials = fetchSpecials;
window.fetchBugs = fetchBugs;
window.testSupabaseConnection = testSupabaseConnection;

// Export auth functions
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getCurrentSession = getCurrentSession;
window.onAuthStateChange = onAuthStateChange;