// Bug Tracker Functions - EXACT COPY from script.js lines 2542-2753

export async function renderBugs(options) {
	const { api, formatDate } = options;
	
	console.log('renderBugs called');
	const tbody = document.getElementById('bugsTbody');
	if (!tbody) return;

	const statusFilter = document.getElementById('bugStatusFilter')?.value || '';
	const priorityFilter = document.getElementById('bugPriorityFilter')?.value || '';

	const { items, total } = await api.getBugs({
		status: statusFilter,
		priority: priorityFilter
	});

	console.log('Bugs API returned:', { items, total });
	tbody.innerHTML = '';

	items.forEach(bug => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td data-sort="id" class="mono">${bug.id}</td>
			<td data-sort="title">
				<div style="font-weight: 600; margin-bottom: 4px;">${bug.title}</div>
				<div style="font-size: 12px; color: var(--muted);">${bug.category}</div>
			</td>
			<td data-sort="status">
				<select class="bug-status-select" data-bug-id="${bug.id}" data-field="status">
					<option value="pending" ${bug.status === 'pending' ? 'selected' : ''}>Pending</option>
					<option value="in_progress" ${bug.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
					<option value="resolved" ${bug.status === 'resolved' ? 'selected' : ''}>Resolved</option>
					<option value="closed" ${bug.status === 'closed' ? 'selected' : ''}>Closed</option>
				</select>
			</td>
			<td data-sort="priority">
				<select class="bug-priority-select" data-bug-id="${bug.id}" data-field="priority">
					<option value="low" ${bug.priority === 'low' ? 'selected' : ''}>Low</option>
					<option value="medium" ${bug.priority === 'medium' ? 'selected' : ''}>Medium</option>
					<option value="high" ${bug.priority === 'high' ? 'selected' : ''}>High</option>
					<option value="critical" ${bug.priority === 'critical' ? 'selected' : ''}>Critical</option>
				</select>
			</td>
			<td data-sort="page" class="mono">${bug.page}</td>
			<td data-sort="reported_by" class="mono">${bug.reported_by_name || bug.reported_by || 'Unknown User'}</td>
			<td data-sort="created_at" class="mono">${formatDate(bug.created_at)}</td>
			<td>
				<div class="action-buttons">
					<button class="icon-btn view-bug" data-id="${bug.id}" title="View Details">👁️</button>
					<button class="icon-btn save-bug" data-id="${bug.id}" title="Save Changes" style="display: none;">💾</button>
					<button class="icon-btn delete-bug" data-id="${bug.id}" title="Delete">🗑️</button>
				</div>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

export function showBugReportModal(context = {}, options) {
	const { state, showModal } = options;
	
	// Pre-fill context data
	document.getElementById('bugTitle').value = context.title || '';
	document.getElementById('bugDescription').value = context.description || '';
	document.getElementById('bugSteps').value = context.steps || '';

	// Store context for submission
	window.currentBugContext = {
		page: context.page || state.currentPage,
		page_url: context.page_url || location.hash,
		reported_by: state.role === 'agent' ? 'Current Agent' : 'Manager',
		reported_by_id: state.agentId || 'unknown',
		technical_context: {
			browser: navigator.userAgent,
			screen_resolution: `${screen.width}x${screen.height}`,
			viewport: `${window.innerWidth}x${window.innerHeight}`,
			role: state.role,
			agent_id: state.agentId
		}
	};

	showModal('bugReportModal');
}

export async function submitBugReport(options) {
	const { api, state, toast, hideModal, renderBugs, getBrowserInfo, getOSInfo } = options;
	
	const title = document.getElementById('bugTitle').value.trim();
	const description = document.getElementById('bugDescription').value.trim();
	const expected = document.getElementById('bugExpected').value.trim();
	const steps = document.getElementById('bugSteps').value.trim();
	const priority = document.getElementById('bugPriority').value;
	const category = document.getElementById('bugCategory').value;
	const screenshotFile = document.getElementById('bugScreenshot').files[0];

	if (!title || !description) {
		toast('Please fill in the required fields', 'error');
		return;
	}

	// Get current user context
	const currentUser = window.currentUser;
	const currentPage = getCurrentPageName();

	const bugData = {
		title,
		description,
		expected: expected || null,
		steps: steps || null,
		priority,
		category,
		status: 'pending',
		page: currentPage,
		page_url: window.location.href,
		reported_by: currentUser?.id || 'unknown',
		reported_by_name: currentUser?.name || 'Unknown User',
		technical_context: {
			userAgent: navigator.userAgent,
			screenResolution: `${screen.width}x${screen.height}`,
			viewport: `${window.innerWidth}x${window.innerHeight}`,
			url: window.location.href,
			timestamp: new Date().toISOString(),
			browser: getBrowserInfo(),
			os: getOSInfo()
		},
		screenshot: screenshotFile // Pass file directly for real API
	};

	try {
		await api.createBug(bugData);
		toast('Bug report submitted successfully!', 'success');
		hideModal('bugReportModal');
		document.getElementById('bugReportForm').reset();

		// Refresh bugs table if we're on the bugs page
		if (state.currentPage === 'bugs') {
			renderBugs();
		}
	} catch (error) {
		toast('Error submitting bug report: ' + error.message, 'error');
	}
}

// Helper function to get current page name
function getCurrentPageName() {
	const hash = window.location.hash;
	if (hash.includes('#/leads')) return 'Leads';
	if (hash.includes('#/listings')) return 'Listings';
	if (hash.includes('#/documents')) return 'Documents';
	if (hash.includes('#/admin')) return 'Admin';
	if (hash.includes('#/specials')) return 'Specials';
	if (hash.includes('#/bugs')) return 'Bugs';
	return 'Home';
}

// Helper function to get browser info
export function getBrowserInfo() {
	const ua = navigator.userAgent;
	if (ua.includes('Chrome')) return 'Chrome';
	if (ua.includes('Firefox')) return 'Firefox';
	if (ua.includes('Safari')) return 'Safari';
	if (ua.includes('Edge')) return 'Edge';
	return 'Unknown';
}

// Helper function to get OS info
export function getOSInfo() {
	const ua = navigator.userAgent;
	if (ua.includes('Windows')) return 'Windows';
	if (ua.includes('Mac')) return 'macOS';
	if (ua.includes('Linux')) return 'Linux';
	if (ua.includes('Android')) return 'Android';
	if (ua.includes('iOS')) return 'iOS';
	return 'Unknown';
}

export function addBugFlags(options) {
	const { state, showBugReportModal, updateBugFlagVisibility } = options;
	
	// Remove existing flags
	document.querySelectorAll('.bug-flag').forEach(flag => flag.remove());

	// Add single flag that adapts to current page
	const flag = document.createElement('button');
	flag.className = 'bug-flag';
	flag.innerHTML = '🐛';
	flag.title = 'Report Bug';
	flag.style.display = 'none'; // Hidden by default

	flag.addEventListener('click', () => {
		const currentPage = state.currentPage || 'leads';
		const pageName = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

		console.log('Bug flag clicked on page:', currentPage); // Debug log

		showBugReportModal({
			page: currentPage,
			page_url: `#/${currentPage}`,
			title: `Issue on ${pageName} page`
		});
	});

	document.body.appendChild(flag);

	// Show flag for current page
	updateBugFlagVisibility();
}

export function updateBugFlagVisibility(options) {
	const { state } = options;

	const flag = document.querySelector('.bug-flag');
	if (!flag) return;

	// Hide flag on bugs page, show on all other pages
	const currentPage = state.currentPage;
	if (currentPage === 'bugs') {
		flag.style.display = 'none';
	} else {
		flag.style.display = 'flex';
	}
}

export async function showBugDetails(bugId, options) {
	const { api, formatDate, showModal, toast } = options;

	try {
		// Fetch bug from database
		const bug = await api.getBug(bugId);
		if (!bug) {
			toast('Bug not found', 'error');
			return;
		}

		const content = document.getElementById('bugDetailsContent');
		content.innerHTML = `
			<div class="bug-details-section">
				<h4>🐛 ${bug.title}</h4>
				<p><strong>Status:</strong> <span class="bug-status ${bug.status}">${bug.status.replace('_', ' ')}</span></p>
				<p><strong>Priority:</strong> <span class="bug-priority ${bug.priority}">${bug.priority}</span></p>
				<p><strong>Category:</strong> ${bug.category}</p>
				<p><strong>Page:</strong> ${bug.page}</p>
				<p><strong>Reported by:</strong> ${bug.reported_by_name || bug.reported_by || 'Unknown User'}</p>
				<p><strong>Created:</strong> ${formatDate(bug.created_at)}</p>
				<p><strong>Last updated:</strong> ${formatDate(bug.updated_at)}</p>
			</div>

			<div class="bug-details-section">
				<h4>Description</h4>
				<p>${bug.description}</p>
			</div>

			${bug.expected ? `
			<div class="bug-details-section">
				<h4>Expected Behavior</h4>
				<p>${bug.expected}</p>
			</div>
			` : ''}

			${bug.steps ? `
			<div class="bug-details-section">
				<h4>Steps to Reproduce</h4>
				<pre class="bug-context">${bug.steps}</pre>
			</div>
			` : ''}

			${bug.screenshot ? `
			<div class="bug-details-section">
				<h4>Screenshot</h4>
				<img src="${bug.screenshot}" alt="Bug screenshot" style="max-width: 100%; border: 1px solid var(--rule); border-radius: 6px;">
			</div>
			` : ''}

			<div class="bug-details-section">
				<h4>Technical Context</h4>
				<pre class="bug-context">Browser: ${bug.technical_context.browser}
Screen: ${bug.technical_context.screen_resolution}
Viewport: ${bug.technical_context.viewport}
Role: ${bug.technical_context.role}
Agent ID: ${bug.technical_context.agent_id}</pre>
			</div>

			${bug.resolution_notes ? `
			<div class="bug-details-section">
				<h4>Resolution Notes</h4>
				<p>${bug.resolution_notes}</p>
			</div>
			` : ''}
		`;

		showModal('bugDetailsModal');
	} catch (error) {
		console.error('Error showing bug details:', error);
		toast('Error loading bug details', 'error');
	}
}

