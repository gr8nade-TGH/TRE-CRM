// Authentication initialization (runs after DOM is loaded)
document.addEventListener('DOMContentLoaded', async function() {
	console.log('🔐 Initializing authentication...');
	
	// Wait a bit for Supabase to load
	setTimeout(async () => {
		try {
			// Check for existing session
			const session = await window.getCurrentSession();
			if (session && session.user) {
				console.log('✅ User already logged in:', session.user.email);
				// Hide auth modals, show main app
				document.getElementById('loginModal').style.display = 'none';
				document.getElementById('registerModal').style.display = 'none';
				
				// Show user info bar
				const userInfoBar = document.getElementById('userInfoBar');
				const userName = document.getElementById('userName');
				const userRole = document.getElementById('userRole');
				
				const userData = session.user.user_metadata || {};
				const role = userData.role || 'user';
				
				userName.textContent = `Welcome, ${userData.name || session.user.email}`;
				userRole.textContent = role.replace('_', ' ');
				userInfoBar.style.display = 'block';
				
				// Update role-based UI
				updateRoleBasedUI(role);
			} else {
				console.log('❌ No active session, showing login');
				document.getElementById('loginModal').style.display = 'flex';
			}
			
			// Add event listeners for auth forms
			document.getElementById('loginForm').addEventListener('submit', async (e) => {
				e.preventDefault();
				
				const email = document.getElementById('loginEmail').value;
				const password = document.getElementById('loginPassword').value;
				
				try {
					const button = e.target.querySelector('button[type="submit"]');
					button.disabled = true;
					button.textContent = 'Logging in...';
					
					await window.signIn(email, password);
					location.reload(); // Simple refresh after login
					
				} catch (error) {
					console.error('Login error:', error);
					alert('Login failed: ' + error.message);
					
					const button = e.target.querySelector('button[type="submit"]');
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
					location.reload(); // Simple refresh after logout
				} catch (error) {
					console.error('Logout error:', error);
					alert('Logout failed: ' + error.message);
				}
			});
			
		} catch (error) {
			console.error('Auth initialization error:', error);
		}
	}, 1000); // Wait 1 second for everything to load
});

// Update UI based on user role
function updateRoleBasedUI(role) {
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
	const agentsNav = document.querySelector('a[href="#agents"]');
	if (agentsNav) {
		agentsNav.style.display = ['manager', 'super_user'].includes(role) ? 'block' : 'none';
	}
	
	const adminNav = document.querySelector('a[href="#admin"]');
	if (adminNav) {
		adminNav.style.display = role === 'super_user' ? 'block' : 'none';
	}
}

// Global auth functions
window.showLoginModal = function() {
	document.getElementById('loginModal').style.display = 'flex';
	document.getElementById('registerModal').style.display = 'none';
};

window.showRegisterModal = function() {
	document.getElementById('registerModal').style.display = 'flex';
	document.getElementById('loginModal').style.display = 'none';
};

window.closeLoginModal = function() {
	document.getElementById('loginModal').style.display = 'none';
};

window.closeRegisterModal = function() {
	document.getElementById('registerModal').style.display = 'none';
};
