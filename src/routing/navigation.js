/**
 * Navigation Module
 * Handles navigation UI updates and role-based visibility
 * 
 * @module routing/navigation
 */

/**
 * Set role label text based on current role
 * @param {string} page - The current page name (default: 'leads')
 * @param {Object} state - Application state
 */
export function setRoleLabel(page = 'leads', state) {
	const label = document.getElementById(`${page}RoleLabel`) || document.getElementById('roleLabel');
	if (label) {
		label.textContent = state.role === 'manager' ? 'Viewing as Manager' : 'Viewing as Agent';
	}
}

/**
 * Update navigation active state
 * @param {string} activePage - The page to mark as active
 */
export function updateNavigation(activePage) {
	document.querySelectorAll('.nav-link').forEach(link => {
		link.classList.remove('active');
	});
	const activeLink = document.querySelector(`[data-page="${activePage}"]`);
	if (activeLink) {
		activeLink.classList.add('active');
	}
}

/**
 * Update navigation visibility based on user role
 * Hides/shows navigation items based on role permissions
 * @param {Object} state - Application state
 */
export function updateNavVisibility(state) {
	const agentsNavLink = document.getElementById('agentsNavLink');
	const adminNavLink = document.getElementById('adminNavLink');
	const manageBtn = document.getElementById('manageBtn');

	if (agentsNavLink) {
		if (state.role === 'agent') {
			agentsNavLink.style.display = 'none';
		} else {
			agentsNavLink.style.display = 'block';
		}
	}

	if (adminNavLink) {
		if (state.role === 'agent') {
			adminNavLink.style.display = 'none';
		} else {
			adminNavLink.style.display = 'block';
		}
	}

	// Show manage button for managers and super_users
	if (manageBtn) {
		if (state.role === 'manager' || state.role === 'super_user') {
			manageBtn.style.display = 'flex';
		} else {
			manageBtn.style.display = 'none';
		}
	}
}

