// Authentication initialization (runs after DOM is loaded)
document.addEventListener('DOMContentLoaded', async function() {
	console.log('🔐 Initializing authentication...');
	
	// Wait a bit for Supabase to load
	setTimeout(async () => {
		try {
			// Check for existing session
			const session = await window.getCurrentSession();
			console.log('Session check result:', session);
			if (session && session.user) {
				console.log('✅ User already logged in:', session.user.email);
				console.log('Session expires at:', new Date(session.expires_at * 1000));
				// User is logged in - show main app
				showMainApp(session.user);
			} else {
				console.log('❌ No active session, showing branded portal');
				console.log('Session was:', session);
				showLoginPortal();
			}
			
			// Add event listeners for auth forms
			document.getElementById('loginForm').addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const email = document.getElementById('loginEmail').value;
				const password = document.getElementById('loginPassword').value;
				
				const button = e.target.querySelector('button[type="submit"]');
				
				// Prevent double submission
				if (button.disabled) {
					console.log('Login already in progress, ignoring duplicate submission');
					return;
				}
				
				try {
					button.disabled = true;
					button.textContent = 'Logging in...';
					
					console.log('Attempting login for:', email);
					
					// Add timeout to prevent hanging
					const loginPromise = window.signIn(email, password);
					const timeoutPromise = new Promise((_, reject) => 
						setTimeout(() => reject(new Error('Login timeout - please try again')), 10000)
					);
					
					await Promise.race([loginPromise, timeoutPromise]);
					
					// Get the user after successful login
					const session = await window.getCurrentSession();
					if (session && session.user) {
						console.log('Login successful, showing main app');
						
						// Reset button state before showing main app
						button.disabled = false;
						button.textContent = 'Login';
						
						document.body.classList.remove('modal-open');
						showMainApp(session.user);
						document.getElementById('loginModal').style.display = 'none';
					} else {
						throw new Error('No session found after login');
					}
					
				} catch (error) {
					console.error('Login error:', error);
					alert('Login failed: ' + error.message);
					
					// Reset button state
					button.disabled = false;
					button.textContent = 'Login';
				}
			});
			
			document.getElementById('registerForm').addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const name = document.getElementById('registerName').value;
				const email = document.getElementById('registerEmail').value;
				const password = document.getElementById('registerPassword').value;
				const role = document.getElementById('registerRole').value;
				
				try {
					const button = e.target.querySelector('button[type="submit"]');
					button.disabled = true;
					button.textContent = 'Registering...';
					
					await window.signUp(email, password, { name, role });
					alert('Registration successful! Please check your email to confirm your account.');
					document.body.classList.remove('modal-open');
					document.getElementById('registerModal').style.display = 'none';
					document.getElementById('loginModal').style.display = 'flex';
					
				} catch (error) {
					console.error('Registration error:', error);
					alert('Registration failed: ' + error.message);
					
					const button = e.target.querySelector('button[type="submit"]');
					button.disabled = false;
					button.textContent = 'Register';
				}
			});
			
			document.getElementById('logoutBtn').addEventListener('click', async () => {
				try {
					await window.signOut();
					showLoginPortal();
					document.getElementById('userInfoBar').style.display = 'none';
				} catch (error) {
					console.error('Logout error:', error);
					alert('Logout failed: ' + error.message);
				}
			});
			
		} catch (error) {
			console.error('Auth initialization error:', error);
		}
	}, 2000); // Wait 2 seconds for everything to load
});

// Update UI based on user role
function updateRoleBasedUI(role) {
	console.log('🔐 Updating UI for role:', role);
	
	// Show/hide admin features based on role
	const adminElements = document.querySelectorAll('[data-admin-only]');
	const managerElements = document.querySelectorAll('[data-manager-only]');
	
	adminElements.forEach(el => {
		el.style.display = role === 'super_user' ? 'block' : 'none';
	});
	
	managerElements.forEach(el => {
		el.style.display = ['manager', 'super_user'].includes(role) ? 'block' : 'none';
	});
	
	// Update navigation based on role
	const agentsNav = document.querySelector('a[href="#/agents"]');
	if (agentsNav) {
		agentsNav.style.display = ['manager', 'super_user'].includes(role) ? 'block' : 'none';
		console.log('Agents nav display:', agentsNav.style.display);
	}
	
	const adminNav = document.querySelector('a[href="#/admin"]');
	if (adminNav) {
		adminNav.style.display = role === 'super_user' ? 'block' : 'none';
		console.log('Admin nav display:', adminNav.style.display);
	}
	
	const bugsNav = document.querySelector('a[href="#/bugs"]');
	if (bugsNav) {
		bugsNav.style.display = role === 'super_user' ? 'block' : 'none';
		console.log('Bugs nav display:', bugsNav.style.display);
	}
	
	// Agent role: Only show Leads, Listings, Specials, Documents
	// Manager role: Show all except Admin (unless super_user)
	// Super User: Show all including Admin and Bugs
	
	console.log('✅ Role-based navigation updated for:', role);
}

// Global auth functions
window.showLoginModal = function() {
	document.body.classList.add('modal-open');
	document.getElementById('loginModal').style.display = 'flex';
	document.getElementById('registerModal').style.display = 'none';
	
	// Reset the login form
	const loginForm = document.getElementById('loginForm');
	const submitBtn = loginForm.querySelector('button[type="submit"]');
	submitBtn.disabled = false;
	submitBtn.textContent = 'Login';
	
	// Clear any error states
	loginForm.classList.remove('error');
};

window.showRegisterModal = function() {
	document.body.classList.add('modal-open');
	document.getElementById('registerModal').style.display = 'flex';
	document.getElementById('loginModal').style.display = 'none';
};

window.closeLoginModal = function() {
	document.body.classList.remove('modal-open');
	document.getElementById('loginModal').style.display = 'none';
};

window.closeRegisterModal = function() {
	document.body.classList.remove('modal-open');
	document.getElementById('registerModal').style.display = 'none';
};

// Show branded login portal
function showLoginPortal() {
	console.log('showLoginPortal called');
	document.body.classList.remove('logged-in');
	document.body.classList.add('not-logged-in');
	document.getElementById('loginPortal').style.display = 'flex';
	document.getElementById('mainAppContent').style.display = 'none';
	
	console.log('Login portal display set to:', document.getElementById('loginPortal').style.display);
	console.log('Main app display set to:', document.getElementById('mainAppContent').style.display);
}

// Show main app when logged in
function showMainApp(user) {
	console.log('showMainApp called with user:', user);
	
	document.body.classList.remove('not-logged-in');
	document.body.classList.add('logged-in');
	document.getElementById('loginPortal').style.display = 'none';
	document.getElementById('mainAppContent').style.display = 'block';
	
	console.log('Login portal display:', document.getElementById('loginPortal').style.display);
	console.log('Main app display:', document.getElementById('mainAppContent').style.display);
	
	// Show user info bar
	const userInfoBar = document.getElementById('userInfoBar');
	const userName = document.getElementById('userName');
	const userRole = document.getElementById('userRole');
	
	const userData = user.user_metadata || {};
	const role = userData.role || 'user';
	
	userName.textContent = `Welcome, ${userData.name || user.email}`;
	userRole.textContent = role.replace('_', ' ');
	userInfoBar.style.display = 'block';
	
	// Update role-based UI
	updateRoleBasedUI(role);
	
	// Initialize routing after showing main app
	setTimeout(() => {
		console.log('🔧 Initializing routing...');
		
		// Retry mechanism for route function
		let retries = 0;
		const maxRetries = 10;
		
		const tryInitRouting = () => {
			if (window.route) {
				console.log('✅ Route function found');
				
				// Set up hashchange listener if not already set up
				if (!window.hashChangeListenerAdded) {
					window.addEventListener('hashchange', window.route);
					window.hashChangeListenerAdded = true;
					console.log('✅ Hashchange listener added');
				}
				
				// Set initial route if no hash
				if (!location.hash) {
					location.hash = '/leads';
					console.log('✅ Set initial hash to /leads');
				}
				
				// Run the route function
				console.log('🔧 Running route function...');
				window.route();
				console.log('✅ Route function executed');
			} else if (retries < maxRetries) {
				retries++;
				console.log(`❌ Route function not found! Retrying... (${retries}/${maxRetries})`);
				setTimeout(tryInitRouting, 200);
			} else {
				console.error('❌ Route function not found after maximum retries!');
			}
		};
		
		tryInitRouting();
	}, 100);
}

// Add event listener for login portal button
document.addEventListener('DOMContentLoaded', function() {
	const openLoginBtn = document.getElementById('openLoginBtn');
	if (openLoginBtn) {
		openLoginBtn.addEventListener('click', function() {
			document.getElementById('loginModal').style.display = 'flex';
		});
	}
});
