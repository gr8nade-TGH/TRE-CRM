/**
 * Authentication Module
 * Handles login, logout, session management, and route protection
 */

// Global auth state
window.currentUser = null;

// Authentication initialization (runs after DOM is loaded)
document.addEventListener('DOMContentLoaded', async function() {
	console.log('🔐 Initializing authentication...');
	
	// Wait for Supabase to load
	await waitForSupabase();
	
	try {
		// Verify Supabase client is properly initialized
		if (!window.supabase || !window.supabase.auth) {
			console.error('❌ Supabase client or auth not available');
			console.log('window.supabase:', window.supabase);
			showLoginPortal();
			return;
		}

		// Check for existing session
		const { data: { session }, error } = await window.supabase.auth.getSession();

		if (error) {
			console.error('Session check error:', error);
			showLoginPortal();
			return;
		}
		
		if (session && session.user) {
			console.log('✅ User already logged in:', session.user.email);
			console.log('Session expires at:', new Date(session.expires_at * 1000));
			
			// Store user globally
			window.currentUser = session.user;
			
			// Show main app
			showMainApp(session.user);
			
			// Initialize routing (will be called from script.js)
			if (window.initializeApp) {
				window.initializeApp();
			}
		} else {
			console.log('❌ No active session, showing login portal');
			showLoginPortal();
		}
		
		// Setup login form handler
		setupLoginForm();
		
		// Setup logout button handler
		setupLogoutButton();
		
		// Listen for auth state changes
		window.supabase.auth.onAuthStateChange((event, session) => {
			console.log('Auth state changed:', event, session?.user?.email);
			
			if (event === 'SIGNED_IN' && session) {
				window.currentUser = session.user;
			} else if (event === 'SIGNED_OUT') {
				window.currentUser = null;
			}
		});
		
	} catch (error) {
		console.error('❌ Auth initialization error:', error);
		showLoginPortal();
	}
});

/**
 * Wait for Supabase client to be available
 */
async function waitForSupabase() {
	let attempts = 0;
	const maxAttempts = 100; // Increased from 50 to 100 (10 seconds total)

	while (!window.supabase && attempts < maxAttempts) {
		console.log(`⏳ Waiting for Supabase... (attempt ${attempts + 1}/${maxAttempts})`);
		await new Promise(resolve => setTimeout(resolve, 100));
		attempts++;
	}

	if (!window.supabase) {
		console.error('❌ Supabase client failed to load after', maxAttempts * 100, 'ms');
		throw new Error('Supabase client failed to load. Please refresh the page.');
	}

	console.log('✅ Supabase client ready');
}

/**
 * Setup login form submission handler
 */
function setupLoginForm() {
	const loginForm = document.getElementById('loginForm');
	if (!loginForm) {
		console.error('Login form not found');
		return;
	}
	
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		
		const email = document.getElementById('loginEmail').value.trim();
		const password = document.getElementById('loginPassword').value;
		const button = e.target.querySelector('button[type="submit"]');
		const errorDiv = document.getElementById('loginError');
		
		// Prevent double submission
		if (button.disabled) {
			return;
		}
		
		try {
			button.disabled = true;
			button.textContent = 'Signing in...';
			errorDiv.style.display = 'none';
			
			console.log('Attempting login for:', email);
			
			// Sign in with Supabase
			const { data, error } = await window.supabase.auth.signInWithPassword({
				email: email,
				password: password
			});
			
			if (error) {
				throw error;
			}
			
			if (!data.session || !data.user) {
				throw new Error('No session returned from login');
			}
			
			console.log('✅ Login successful:', data.user.email);
			
			// Store user globally
			window.currentUser = data.user;
			
			// Show main app
			showMainApp(data.user);
			
			// Initialize routing
			if (window.initializeApp) {
				window.initializeApp();
			}
			
		} catch (error) {
			console.error('Login error:', error);
			errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
			errorDiv.style.display = 'block';
			
			// Reset button
			button.disabled = false;
			button.textContent = 'Sign In';
		}
	});
}

/**
 * Setup logout button handler
 */
function setupLogoutButton() {
	const logoutBtn = document.getElementById('logoutBtn');
	if (!logoutBtn) {
		console.error('Logout button not found');
		return;
	}
	
	logoutBtn.addEventListener('click', async () => {
		try {
			console.log('Logging out...');
			
			// Sign out from Supabase
			const { error } = await window.supabase.auth.signOut();
			
			if (error) {
				throw error;
			}
			
			console.log('✅ Logged out successfully');
			
			// Clear global user
			window.currentUser = null;
			
			// Show login portal
			showLoginPortal();
			
		} catch (error) {
			console.error('Logout error:', error);
			alert('Logout failed: ' + error.message);
		}
	});
}

/**
 * Show login portal and hide main app
 */
function showLoginPortal() {
	console.log('Showing login portal');
	document.getElementById('loginPortal').style.display = 'flex';
	document.getElementById('mainAppContent').style.display = 'none';
	
	// Clear form
	const loginForm = document.getElementById('loginForm');
	if (loginForm) {
		loginForm.reset();
	}
	const errorDiv = document.getElementById('loginError');
	if (errorDiv) {
		errorDiv.style.display = 'none';
	}
}

/**
 * Show main app and hide login portal
 */
function showMainApp(user) {
	console.log('Showing main app for user:', user.email);
	document.getElementById('loginPortal').style.display = 'none';
	document.getElementById('mainAppContent').style.display = 'block';
	
	// Update user info in header
	const userEmail = document.getElementById('headerUserEmail');
	const userRole = document.getElementById('headerUserRole');

	if (userEmail) {
		userEmail.textContent = user.email;
	}

	if (userRole) {
		const role = user.user_metadata?.role || 'agent';
		userRole.textContent = role.replace('_', ' ');
		userRole.className = 'role-badge role-' + role;
	}
	
	// Store role in global state for the app to use
	if (window.state) {
		const role = user.user_metadata?.role || 'agent';
		window.state.role = role;
		window.state.agentId = user.id;
		console.log('✅ Set global state role:', role, 'agentId:', user.id);
	}
}

/**
 * Check if user is authenticated (for route protection)
 */
window.isAuthenticated = function() {
	return window.currentUser !== null;
};

/**
 * Get current user role
 */
window.getUserRole = function() {
	if (!window.currentUser) {
		return null;
	}
	return window.currentUser.user_metadata?.role || 'agent';
};

/**
 * Get current user ID
 */
window.getUserId = function() {
	if (!window.currentUser) {
		return null;
	}
	return window.currentUser.id;
};

