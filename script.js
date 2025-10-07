// Utility functions - defined globally
function formatDate(iso) { 
	try { 
		return new Date(iso).toLocaleString(); 
	} catch { 
		return iso; 
	} 
}

function showModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) modal.classList.remove('hidden');
}

function hideModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) modal.classList.add('hidden');
}

// Mock data - defined globally
const mockUsers = [
	{
		id: 'user_1',
		name: 'John Smith',
		email: 'john@trecrm.com',
		role: 'manager',
		status: 'active',
		created_at: '2024-01-01T10:00:00Z',
		created_by: 'system',
		last_login: '2024-01-15T14:30:00Z'
	},
	{
		id: 'user_2',
		name: 'Alex Agent',
		email: 'alex@trecrm.com',
		role: 'agent',
		status: 'active',
		created_at: '2024-01-02T09:15:00Z',
		created_by: 'user_1',
		last_login: '2024-01-15T16:45:00Z'
	},
	{
		id: 'user_3',
		name: 'Bailey Broker',
		email: 'bailey@trecrm.com',
		role: 'agent',
		status: 'active',
		created_at: '2024-01-03T11:20:00Z',
		created_by: 'user_1',
		last_login: '2024-01-14T13:20:00Z'
	},
	{
		id: 'user_4',
		name: 'Sarah Johnson',
		email: 'sarah@trecrm.com',
		role: 'agent',
		status: 'invited',
		created_at: '2024-01-10T15:30:00Z',
		created_by: 'user_1',
		last_login: null
	},
	{
		id: 'user_5',
		name: 'Mike Chen',
		email: 'mike@trecrm.com',
		role: 'super_user',
		status: 'active',
		created_at: '2024-01-05T08:45:00Z',
		created_by: 'system',
		last_login: '2024-01-15T12:10:00Z'
	}
];

const mockAuditLog = [
	{
		id: 'audit_1',
		action: 'user_created',
		user_id: 'user_4',
		user_name: 'Sarah Johnson',
		user_email: 'sarah@trecrm.com',
		performed_by: 'user_1',
		performed_by_name: 'John Smith',
		timestamp: '2024-01-10T15:30:00Z',
		details: 'User created with Agent role'
	},
	{
		id: 'audit_2',
		action: 'role_changed',
		user_id: 'user_2',
		user_name: 'Alex Agent',
		user_email: 'alex@trecrm.com',
		performed_by: 'user_1',
		performed_by_name: 'John Smith',
		timestamp: '2024-01-08T14:20:00Z',
		details: 'Role changed from Agent to Manager'
	},
	{
		id: 'audit_3',
		action: 'password_changed',
		user_id: 'user_3',
		user_name: 'Bailey Broker',
		user_email: 'bailey@trecrm.com',
		performed_by: 'user_3',
		performed_by_name: 'Bailey Broker',
		timestamp: '2024-01-12T09:15:00Z',
		details: 'Password updated'
	},
	{
		id: 'audit_4',
		action: 'user_updated',
		user_id: 'user_2',
		user_name: 'Alex Agent',
		user_email: 'alex@trecrm.com',
		performed_by: 'user_1',
		performed_by_name: 'John Smith',
		timestamp: '2024-01-14T16:30:00Z',
		details: 'Email updated to alex@trecrm.com'
	}
];

(function() {
	// ---- State ----
	const state = {
		role: 'manager',
		agentId: 'agent_1',
		currentPage: 'leads',
		page: 1,
		pageSize: 10,
		sort: { key: 'submitted_at', dir: 'desc' },
		search: '',
		selectedLeadId: null,
		selectedAgentId: null,
		selectedMatches: new Set(),
		currentMatches: [],
		showcases: {}, // id -> showcase
		publicBanner: 'Earn a $200 gift card when you lease through us.',
		filters: {
			search: '',
			status: 'all',
			fromDate: '',
			toDate: ''
		},
		listingsFilters: {
			search: '',
			market: 'all',
			minPrice: '',
			maxPrice: '',
			beds: 'any',
			commission: '0',
			amenities: 'any'
		}
	};

	// ---- Mock Data ----
	const mockAgents = [
		{ 
			id: 'agent_1', 
			name: 'Alex Agent', 
			email: 'alex@example.com', 
			phone: '555-0101',
			active: true,
			hireDate: '2023-01-15',
			licenseNumber: 'TR123456',
			specialties: ['Residential', 'Luxury'],
			notes: 'Top performer, excellent with first-time buyers'
		},
		{ 
			id: 'agent_2', 
			name: 'Bailey Broker', 
			email: 'bailey@example.com', 
			phone: '555-0102',
			active: true,
			hireDate: '2022-08-22',
			licenseNumber: 'TR789012',
			specialties: ['Commercial', 'Investment'],
			notes: 'Strong commercial background, great with investors'
		},
		{ 
			id: 'agent_3', 
			name: 'Casey Consultant', 
			email: 'casey@example.com', 
			phone: '555-0103',
			active: true,
			hireDate: '2023-03-10',
			licenseNumber: 'TR345678',
			specialties: ['Rental', 'Student Housing'],
			notes: 'New but promising, great with rental properties'
		},
		{ 
			id: 'agent_4', 
			name: 'Dana Director', 
			email: 'dana@example.com', 
			phone: '555-0104',
			active: true,
			hireDate: '2021-11-05',
			licenseNumber: 'TR901234',
			specialties: ['Luxury', 'New Construction'],
			notes: 'Senior agent, handles high-end properties'
		},
		{ 
			id: 'agent_5', 
			name: 'Evan Expert', 
			email: 'evan@example.com', 
			phone: '555-0105',
			active: false,
			hireDate: '2022-05-18',
			licenseNumber: 'TR567890',
			specialties: ['Residential'],
			notes: 'On leave, returning next month'
		}
	];

	function prefsSummary(p) {
		if (!p) return '';
		const price = p.budget_max ? `<$${p.budget_max}/mo` : (p.budget ? `$${p.budget}/mo` : '');
		return `${p.beds || '?'}bed/${p.baths || '?'}bath ${price}`;
	}

	function randomDate(daysBack=30){
		const now = Date.now();
		const past = now - Math.floor(Math.random()*daysBack)*24*3600*1000;
		return new Date(past).toISOString();
	}

	const mockLeads = Array.from({ length: 37 }).map((_, i) => {
		const id = `lead_${i+1}`;
		const assigned = i % 2 === 0 ? 'agent_1' : (i % 3 === 0 ? 'agent_2' : null);
		const foundBy = i % 4 === 0 ? 'agent_2' : 'agent_3';
		const healthStatuses = ['green', 'yellow', 'red', 'closed', 'lost'];
		const healthStatus = healthStatuses[i % healthStatuses.length];
		return {
			id,
			name: `Lead ${i+1}`,
			email: `lead${i+1}@example.com`,
			phone: `555-000-${String(1000 + i)}`,
			submitted_at: randomDate(45),
			found_by_agent_id: foundBy,
			assigned_agent_id: assigned,
			health_status: healthStatus,
			prefs: {
				market: ['Austin','Dallas','Houston'][i%3],
				neighborhoods: ['Downtown','Uptown','Midtown'].slice(0, (i%3)+1),
				budget_min: 1000 + (i%5)*100,
				budget_max: 1800 + (i%5)*150,
				beds: (i%3)+1,
				baths: (i%2)+1,
				move_in: '30-60 days',
				pets: i%2===0 ? 'Yes' : 'No',
				parking: i%3===0 ? 'Required' : 'Optional',
				sqft_min: 650,
				sqft_max: 1100,
				amenities: ['Pool','Gym','In-Unit W/D'].slice(0, (i%3)+1),
				credit_tier: ['A','B','C'][i%3],
				background: ['None','Eviction'][i%2],
				notes: 'Initial intake notes here.'
			},
			status: 'new',
			source: 'web_form'
		};
	});

	// Mock document data
	const mockDocumentSteps = [
		{ id: 1, name: 'Lease Agreement Sent', status: 'pending', attachments: [] },
		{ id: 2, name: 'Signed By Lead', status: 'pending', attachments: [] },
		{ id: 3, name: 'Signed By Property Owner', status: 'pending', attachments: [] },
		{ id: 4, name: 'Finalized by Agent', status: 'pending', attachments: [] },
		{ id: 5, name: 'Payment Step', status: 'pending', attachments: [] }
	];

	// Mock document statuses for leads
	const mockDocumentStatuses = {
		'lead_1': { currentStep: 2, steps: [
			{ ...mockDocumentSteps[0], status: 'completed', attachments: ['lease_agreement_v1.pdf', 'property_details.pdf'] },
			{ ...mockDocumentSteps[1], status: 'in_progress', attachments: ['signed_lease_draft.pdf'] },
			{ ...mockDocumentSteps[2], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[3], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[4], status: 'pending', attachments: [] }
		]},
		'lead_2': { currentStep: 1, steps: [
			{ ...mockDocumentSteps[0], status: 'in_progress', attachments: ['lease_agreement_v2.pdf'] },
			{ ...mockDocumentSteps[1], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[2], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[3], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[4], status: 'pending', attachments: [] }
		]},
		'lead_3': { currentStep: 4, steps: [
			{ ...mockDocumentSteps[0], status: 'completed', attachments: ['lease_agreement_v3.pdf'] },
			{ ...mockDocumentSteps[1], status: 'completed', attachments: ['lead_signature.pdf', 'id_verification.pdf'] },
			{ ...mockDocumentSteps[2], status: 'completed', attachments: ['owner_signature.pdf', 'property_owner_id.pdf'] },
			{ ...mockDocumentSteps[3], status: 'in_progress', attachments: ['finalization_checklist.pdf'] },
			{ ...mockDocumentSteps[4], status: 'pending', attachments: [] }
		]},
		'lead_4': { currentStep: 5, steps: [
			{ ...mockDocumentSteps[0], status: 'completed', attachments: ['lease_agreement_v4.pdf'] },
			{ ...mockDocumentSteps[1], status: 'completed', attachments: ['lead_signature_v2.pdf'] },
			{ ...mockDocumentSteps[2], status: 'completed', attachments: ['owner_signature_v2.pdf'] },
			{ ...mockDocumentSteps[3], status: 'completed', attachments: ['finalized_lease.pdf', 'agent_approval.pdf'] },
			{ ...mockDocumentSteps[4], status: 'in_progress', attachments: ['payment_instructions.pdf'] }
		]},
		'lead_5': { currentStep: 3, steps: [
			{ ...mockDocumentSteps[0], status: 'completed', attachments: ['lease_agreement_v5.pdf'] },
			{ ...mockDocumentSteps[1], status: 'completed', attachments: ['lead_signature_v3.pdf'] },
			{ ...mockDocumentSteps[2], status: 'in_progress', attachments: ['owner_review_document.pdf'] },
			{ ...mockDocumentSteps[3], status: 'pending', attachments: [] },
			{ ...mockDocumentSteps[4], status: 'pending', attachments: [] }
		]}
	};

	// Mock closed leads for history
	const mockClosedLeads = [
		{
			id: 'closed_lead_1',
			name: 'Closed Lead 1',
			agent_id: 'agent_1',
			closed_date: '2024-01-15',
			steps: [
				{ ...mockDocumentSteps[0], status: 'completed', attachments: ['closed_lease_1.pdf'] },
				{ ...mockDocumentSteps[1], status: 'completed', attachments: ['closed_signature_1.pdf'] },
				{ ...mockDocumentSteps[2], status: 'completed', attachments: ['closed_owner_sig_1.pdf'] },
				{ ...mockDocumentSteps[3], status: 'completed', attachments: ['closed_final_1.pdf'] },
				{ ...mockDocumentSteps[4], status: 'completed', attachments: ['closed_payment_1.pdf', 'receipt_1.pdf'] }
			]
		},
		{
			id: 'closed_lead_2',
			name: 'Closed Lead 2',
			agent_id: 'agent_2',
			closed_date: '2024-01-10',
			steps: [
				{ ...mockDocumentSteps[0], status: 'completed', attachments: ['closed_lease_2.pdf'] },
				{ ...mockDocumentSteps[1], status: 'completed', attachments: ['closed_signature_2.pdf'] },
				{ ...mockDocumentSteps[2], status: 'completed', attachments: ['closed_owner_sig_2.pdf'] },
				{ ...mockDocumentSteps[3], status: 'completed', attachments: ['closed_final_2.pdf'] },
				{ ...mockDocumentSteps[4], status: 'completed', attachments: ['closed_payment_2.pdf'] }
			]
		}
	];

	// Mock data moved to global scope above

	// Mock data for interested leads
	const mockInterestedLeads = {
		'prop_1': [
			{ leadId: 'lead-1', leadName: 'Sarah Johnson', agentName: 'Alex Agent', date: '2024-01-15', status: 'interested' },
			{ leadId: 'lead-3', leadName: 'Mike Chen', agentName: 'Alex Agent', date: '2024-01-18', status: 'tour-scheduled' },
			{ leadId: 'lead-7', leadName: 'Emily Davis', agentName: 'Bailey Broker', date: '2024-01-20', status: 'interested' }
		],
		'prop_2': [
			{ leadId: 'lead-2', leadName: 'David Wilson', agentName: 'Unassigned', date: '2024-01-16', status: 'interested' },
			{ leadId: 'lead-5', leadName: 'Lisa Brown', agentName: 'Bailey Broker', date: '2024-01-19', status: 'converted' }
		],
		'prop_3': [
			{ leadId: 'lead-4', leadName: 'Tom Anderson', agentName: 'Alex Agent', date: '2024-01-17', status: 'tour-scheduled' },
			{ leadId: 'lead-6', leadName: 'Jessica Taylor', agentName: 'Unassigned', date: '2024-01-21', status: 'interested' },
			{ leadId: 'lead-8', leadName: 'Robert Garcia', agentName: 'Bailey Broker', date: '2024-01-22', status: 'interested' }
		],
		'prop_4': [
			{ leadId: 'lead-9', leadName: 'Amanda White', agentName: 'Alex Agent', date: '2024-01-23', status: 'interested' }
		],
		'prop_5': [
			{ leadId: 'lead-10', leadName: 'Kevin Martinez', agentName: 'Bailey Broker', date: '2024-01-24', status: 'tour-scheduled' },
			{ leadId: 'lead-11', leadName: 'Rachel Lee', agentName: 'Unassigned', date: '2024-01-25', status: 'interested' }
		],
		'prop_6': [
			{ leadId: 'lead-12', leadName: 'Maria Rodriguez', agentName: 'Alex Agent', date: '2024-01-26', status: 'interested' },
			{ leadId: 'lead-13', leadName: 'James Thompson', agentName: 'Bailey Broker', date: '2024-01-27', status: 'converted' }
		],
		'prop_7': [
			{ leadId: 'lead-14', leadName: 'Jennifer Kim', agentName: 'Unassigned', date: '2024-01-28', status: 'tour-scheduled' }
		],
		'prop_8': [
			{ leadId: 'lead-15', leadName: 'Michael Johnson', agentName: 'Alex Agent', date: '2024-01-29', status: 'interested' },
			{ leadId: 'lead-16', leadName: 'Ashley Williams', agentName: 'Bailey Broker', date: '2024-01-30', status: 'interested' }
		]
	};

	const mockProperties = Array.from({ length: 30 }).map((_, i) => {
		const id = `prop_${i+1}`;
		const market = ['Austin','Dallas','Houston'][i%3];
		const rentMin = 1000 + (i%6)*150;
		const rentMax = rentMin + 400 + (i%3)*100;
		const escort_pct = [0.0, 1.5, 2.0, 2.5, 3.0][i%5];
		const send_pct = [1.0, 2.0, 2.5, 3.5, 4.0][(i+2)%5];
		// Add coordinates for map
		const lat = 29.48 + (Math.random() - 0.5) * 0.2; // Austin area
		const lng = -98.50 + (Math.random() - 0.5) * 0.2;
		return {
			id,
			name: `Community ${i+1}`,
			market,
			neighborhoods: ['Downtown','Uptown','Midtown'].slice(0, (i%3)+1),
			beds_min: 1, beds_max: 3,
			baths_min: 1, baths_max: 2,
			rent_min: rentMin, rent_max: rentMax,
			sqft_min: 600, sqft_max: 1300,
			amenities: ['Pool','Gym','In-Unit W/D','Parking'].slice(0, (i%4)+1),
			escort_pct, send_pct,
			bonus_text: i%4===0 ? '$300 bonus' : '',
			specials_text: i%3===0 ? '1 month free' : '',
			website: 'https://example.com',
			address: `${100+i} Example St`,
			phone: '555-111-2222',
			pricing_last_updated: randomDate(15),
			lat, lng
		};
	});

	// ---- Utilities ----
	function byKey(key) { return (a,b)=> (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0); }
	function show(el){ el.classList.remove('hidden'); }
	function hide(el){ el.classList.add('hidden'); }
	function showModal(modalId){ 
		const modal = document.getElementById(modalId);
		if (modal) modal.classList.remove('hidden');
	}
	function hideModal(modalId){ 
		const modal = document.getElementById(modalId);
		if (modal) modal.classList.add('hidden');
	}
	function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; show(t); setTimeout(()=> hide(t), 2000); }
	// formatDate function moved to global scope

	// ---- Table Sorting ----
	function sortTable(column, tableId) {
		const table = document.getElementById(tableId);
		if (!table) return;
		
		const tbody = table.querySelector('tbody');
		if (!tbody) return;
		
		const rows = Array.from(tbody.querySelectorAll('tr'));
		const isAscending = state.sort.key === column ? !state.sort.dir : true;
		
		rows.sort((a, b) => {
			const aVal = a.querySelector(`[data-sort="${column}"]`)?.textContent.trim() || '';
			const bVal = b.querySelector(`[data-sort="${column}"]`)?.textContent.trim() || '';
			
			// Handle numeric sorting for specific columns
			if (['rent_min', 'rent_max', 'beds_min', 'baths_min', 'sqft_min', 'commission_pct'].includes(column)) {
				// Special handling for commission_pct column
				if (column === 'commission_pct') {
					const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
					const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}
				
				// For rent columns, extract the first number (min value)
				if (['rent_min', 'rent_max'].includes(column)) {
					const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
					const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}
				
				// For beds/baths columns, extract the first number
				if (['beds_min', 'baths_min'].includes(column)) {
					const aNum = parseFloat(aVal.split('-')[0]) || 0;
					const bNum = parseFloat(bVal.split('-')[0]) || 0;
					return isAscending ? aNum - bNum : bNum - aNum;
				}
				
				const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
				const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
				return isAscending ? aNum - bNum : bNum - aNum;
			}
			
			// Handle date sorting
			if (['submitted_at', 'last_updated', 'created_at'].includes(column)) {
				const aDate = new Date(aVal);
				const bDate = new Date(bVal);
				return isAscending ? aDate - bDate : bDate - aDate;
			}
			
			// Default text sorting
			if (isAscending) {
				return aVal.localeCompare(bVal, undefined, { numeric: true });
			} else {
				return bVal.localeCompare(aVal, undefined, { numeric: true });
			}
		});
		
		rows.forEach(row => tbody.appendChild(row));
		
		state.sort.key = column;
		state.sort.dir = isAscending ? 'asc' : 'desc';
		updateSortHeaders(tableId);
	}

	function updateSortHeaders(tableId) {
		const table = document.getElementById(tableId);
		if (!table) return;
		
		const headers = table.querySelectorAll('th[data-sort]');
		headers.forEach(header => {
			const column = header.dataset.sort;
			const icon = header.querySelector('.sort-icon');
			
			if (column === state.sort.key) {
				header.classList.add('sorted');
				if (icon) {
					icon.textContent = state.sort.dir === 'asc' ? '↑' : '↓';
				}
			} else {
				header.classList.remove('sorted');
				if (icon) {
					icon.textContent = '↕';
				}
			}
		});
	}

	// ---- Health Status ----
	const STATUS_LABEL = { 
		green: 'Healthy', 
		yellow: 'Warm', 
		red: 'At Risk', 
		closed: 'Closed', 
		lost: 'Lost' 
	};

	const healthMessages = {
		red: ['- Lead has not been provided listing options.', '- Lease Agreement has been pending e-signature for 2d 4h.'],
		yellow: ['- Lead has not responded in 3d 10h.', '- Lead is not scheduled to visit any properties yet.'],
		green: ['- Lead signed off, awaiting Lease Agreement signoff.'],
		closed: ['Lead Closed!'],
		lost: ['Lead Lost.']
	};

	function renderHealthStatus(status) {
		if (status === 'green') {
			return `<button class="health-btn" data-status="green" aria-label="Healthy"><span class="health-dot health-green"></span></button>`;
		}
		if (status === 'yellow') {
			return `<button class="health-btn" data-status="yellow" aria-label="Warm"><span class="health-dot health-yellow"></span></button>`;
		}
		if (status === 'red') {
			return `<button class="health-btn" data-status="red" aria-label="At Risk"><span class="health-dot health-red"></span></button>`;
		}
		if (status === 'closed') {
			return `<button class="health-btn" data-status="closed" aria-label="Closed"><span class="health-icon health-check"><svg viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg></span></button>`;
		}
		return `<button class="health-btn" data-status="lost" aria-label="Lost"><span class="health-icon health-lost"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></span></button>`;
	}

	// ---- Filter Functions ----
	function withinDateRange(date, from, to) {
		if (!from && !to) return true;
		const checkDate = new Date(date);
		if (from && checkDate < new Date(from)) return false;
		if (to && checkDate > new Date(to)) return false;
		return true;
	}

	function matchesListingsFilters(property, filters) {
		// Search filter
		if (filters.search) {
			const searchTerm = filters.search.toLowerCase();
			const matchesSearch = 
				property.name.toLowerCase().includes(searchTerm) ||
				property.address.toLowerCase().includes(searchTerm) ||
				property.amenities.some(amenity => amenity.toLowerCase().includes(searchTerm));
			if (!matchesSearch) return false;
		}

		// Market filter
		if (filters.market !== 'all' && property.market !== filters.market) {
			return false;
		}

		// Price range filter
		if (filters.minPrice && property.rent_min < parseInt(filters.minPrice)) {
			return false;
		}
		if (filters.maxPrice && property.rent_max > parseInt(filters.maxPrice)) {
			return false;
		}

		// Beds filter
		if (filters.beds !== 'any') {
			const minBeds = parseInt(filters.beds);
			if (property.beds_min < minBeds) {
				return false;
			}
		}

		// Commission filter
		if (filters.commission !== '0') {
			const minCommission = parseFloat(filters.commission);
			const totalCommission = property.escort_pct + property.send_pct;
			if (totalCommission < minCommission) {
				return false;
			}
		}

		// Amenities filter
		if (filters.amenities !== 'any') {
			const amenityMap = {
				'pool': 'Pool',
				'gym': 'Gym',
				'pet': 'Pet Friendly',
				'ev': 'EV Charging'
			};
			const requiredAmenity = amenityMap[filters.amenities];
			if (!property.amenities.includes(requiredAmenity)) {
				return false;
			}
		}

		return true;
	}

	// ---- Health Popover Functions ----
	let pop, popTitle, popList;

	function initPopover() {
		pop = document.getElementById('healthPopover');
		popTitle = document.getElementById('popTitle');
		popList = document.getElementById('popList');
	}

	function showPopover(anchor, status) {
		console.log('showPopover called with status:', status); // Debug
		if (!pop || !popTitle || !popList) {
			console.log('Initializing popover elements...'); // Debug
			initPopover();
		}
		if (!pop) {
			console.log('Popover element not found!'); // Debug
			return;
		}
		
		console.log('Showing popover for status:', status); // Debug
		popTitle.textContent = `Status — ${STATUS_LABEL[status] || status}`;
		popList.innerHTML = healthMessages[status].map(s => `<li>${s}</li>`).join('');
		const r = anchor.getBoundingClientRect();
		let top = r.bottom + 10; 
		let left = r.left - 12;
		if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
		if (left < 8) left = 8;
		pop.style.top = `${Math.round(top)}px`; 
		pop.style.left = `${Math.round(left)}px`; 
		pop.style.display = 'block';
		console.log('Popover should be visible now'); // Debug
	}

	function hidePopover() { 
		if (pop) pop.style.display = 'none'; 
	}

	// ---- Agent Statistics ----
	function getAgentStats(agentId) {
		const assignedLeads = mockLeads.filter(l => l.assigned_agent_id === agentId);
		const now = new Date();
		const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
		
		// Mock closed leads (in real app, this would come from a separate table)
		const closedLeads = assignedLeads.filter(l => {
			const submittedDate = new Date(l.submitted_at);
			return submittedDate >= ninetyDaysAgo && Math.random() > 0.7; // 30% chance of being "closed"
		});

		return {
			assigned: assignedLeads.length,
			closed: closedLeads.length
		};
	}

	// ---- Real API Layer ----
	// Use localhost for local development, or fallback to mock data for production
	const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
		? 'http://localhost:3001/api' 
		: null; // Will use mock data when API_BASE is null
	const USE_MOCK_DATA = true; // Set to false when backend is deployed

	// Helper function to handle API responses
	async function handleResponse(response) {
		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Network error' }));
			throw new Error(error.error || `HTTP ${response.status}`);
		}
		return response.json();
	}

	const api = {
		async getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters = {} }){
			if (USE_MOCK_DATA) {
				console.log('Using mock data for leads, count:', mockLeads.length);
				return {
					items: mockLeads,
					total: mockLeads.length
				};
			}
			
			const params = new URLSearchParams({
				role,
				agentId,
				search,
				sortKey,
				sortDir,
				page,
				pageSize,
				...filters
			});

			const response = await fetch(`${API_BASE}/leads?${params}`);
			return handleResponse(response);
		},

		async getLead(id) {
			if (USE_MOCK_DATA) {
				return mockLeads.find(lead => lead.id === id) || mockLeads[0];
			}
			
			const response = await fetch(`${API_BASE}/leads/${id}`);
			return handleResponse(response);
		},

		async assignLead(id, agent_id) {
			const response = await fetch(`${API_BASE}/leads/${id}/assign`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ agent_id })
			});
			return handleResponse(response);
		},

		async getMatches(lead_id, limit=10){
			// Return example listings for now
			return [
				{
					id: 'listing-1',
					name: 'The Residences at Domain',
					rent_min: 1800,
					rent_max: 2400,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 750,
					sqft_max: 1200,
					effective_commission_pct: 3.5,
					specials_text: 'First month free + $500 move-in credit',
					bonus_text: 'Pet-friendly community with dog park',
					image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-2',
					name: 'Skyline Apartments',
					rent_min: 2200,
					rent_max: 3200,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1100,
					sqft_max: 1600,
					effective_commission_pct: 4.0,
					specials_text: 'No deposit required for qualified applicants',
					bonus_text: 'Rooftop pool and fitness center',
					image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-3',
					name: 'Garden District Lofts',
					rent_min: 1600,
					rent_max: 2100,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 650,
					sqft_max: 950,
					effective_commission_pct: 3.0,
					specials_text: 'Utilities included in rent',
					bonus_text: 'Historic building with modern amenities',
					image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-4',
					name: 'Metro Tower Residences',
					rent_min: 2500,
					rent_max: 3800,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1200,
					sqft_max: 1800,
					effective_commission_pct: 4.5,
					specials_text: 'Concierge service included',
					bonus_text: 'Downtown location with city views',
					image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-5',
					name: 'Riverside Commons',
					rent_min: 1400,
					rent_max: 1900,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 600,
					sqft_max: 1000,
					effective_commission_pct: 2.5,
					specials_text: 'Free parking space included',
					bonus_text: 'Walking distance to riverfront park',
					image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-6',
					name: 'Elite Heights',
					rent_min: 3000,
					rent_max: 4500,
					beds_min: 3,
					beds_max: 4,
					baths_min: 3,
					baths_max: 4,
					sqft_min: 1800,
					sqft_max: 2500,
					effective_commission_pct: 5.0,
					specials_text: 'Premium finishes and appliances',
					bonus_text: 'Private balcony with city skyline views',
					image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop'
				}
			].slice(0, limit);
		},

		async getProperty(id) {
			const response = await fetch(`${API_BASE}/properties/${id}`);
			return handleResponse(response);
		},

		async createShowcase({ lead_id, agent_id, listing_ids, message, showcase_id, landing_url }){
			const response = await fetch(`${API_BASE}/showcases`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					lead_id, 
					agent_id, 
					listing_ids, 
					message, 
					showcase_id, 
					landing_url 
				})
			});
			return handleResponse(response);
		},

		async sendEmail({ to, subject, html, showcase_id }){
			// Mock for now
			console.log('Sending email:', { to, subject, showcase_id });
			return { ok: true };
		},

		async getInterestedLeadsCount(propertyId) {
			if (USE_MOCK_DATA) {
				const interestedLeads = mockInterestedLeads[propertyId] || [];
				return interestedLeads.length;
			}
			
			try {
				const response = await fetch(`${API_BASE}/properties/${propertyId}/interests`);
				const interests = await handleResponse(response);
				return interests.length;
			} catch (error) {
				console.error('Error fetching interested leads count:', error);
				return 0;
			}
		},

		async getInterestedLeads(propertyId) {
			console.log('getInterestedLeads called with propertyId:', propertyId);
			if (USE_MOCK_DATA) {
				const data = mockInterestedLeads[propertyId] || [];
				console.log('Mock data for', propertyId, ':', data);
				return data;
			}
			
			try {
				const response = await fetch(`${API_BASE}/properties/${propertyId}/interests`);
				return await handleResponse(response);
			} catch (error) {
				console.error('Error fetching interested leads:', error);
				return [];
			}
		},

		async createLeadInterest({ lead_id, property_id, agent_id, interest_type, status, notes }) {
			try {
				const response = await fetch(`${API_BASE}/lead-interests`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ lead_id, property_id, agent_id, interest_type, status, notes })
				});
				return await handleResponse(response);
			} catch (error) {
				console.error('Error creating lead interest:', error);
				throw error;
			}
		}
	};

	// ---- Rendering: Leads Table ----
	async function renderLeads(){
		console.log('renderLeads called'); // Debug
		const tbody = document.getElementById('leadsTbody');
		console.log('tbody element:', tbody); // Debug
		const { items, total } = await api.getLeads({
			role: state.role,
			agentId: state.agentId,
			search: state.search,
			sortKey: state.sort.key,
			sortDir: state.sort.dir,
			page: state.page,
			pageSize: state.pageSize,
			filters: state.filters
		});
		console.log('API returned:', { items, total }); // Debug
		tbody.innerHTML = '';
		items.forEach(lead => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>
					<a href="#" class="lead-name" data-id="${lead.id}">${lead.name}</a>
					<div class="subtle mono">${lead.email} · ${lead.phone}</div>
				</td>
				<td><button class="icon-btn" data-view="${lead.id}" title="View">👁️</button></td>
				<td data-sort="health_status">${renderHealthStatus(lead.health_status)}</td>
				<td class="mono" data-sort="submitted_at">${formatDate(lead.submitted_at)}</td>
				<td class="mono">
					<span class="badge-dot"><span class="dot"></span>${prefsSummary(lead.prefs)}</span>
				</td>
				<td><button class="icon-btn" data-matches="${lead.id}" title="Top Options">📋</button></td>
				<td data-sort="assigned_agent_id">
					${state.role === 'manager' ? renderAgentSelect(lead) : renderAgentReadOnly(lead)}
				</td>
			`;
			tbody.appendChild(tr);
		});
		
		// Debug: Check if health buttons exist
		const healthButtons = document.querySelectorAll('.health-btn');
		console.log('Health buttons found:', healthButtons.length);
		document.getElementById('pageInfo').textContent = `Page ${state.page} · ${total} total`;
	}

	function renderAgentSelect(lead){
		const opts = mockAgents.map(a => `<option value="${a.id}" ${a.id===lead.assigned_agent_id?'selected':''}>${a.name}</option>`).join('');
		return `<select class="select" data-assign="${lead.id}"><option value="">Unassigned</option>${opts}</select>`;
	}
	function renderAgentReadOnly(lead){
		const a = mockAgents.find(a => a.id === lead.assigned_agent_id);
		return `<span class="subtle">${a ? a.name : 'Unassigned'}</span>`;
	}

	// ---- Document Status Rendering ----
	function renderDocumentStepStatus(step, currentStep) {
		if (step.id < currentStep) {
			return `<span class="step-completed">✓ Completed</span>`;
		} else if (step.id === currentStep) {
			return `<span class="step-current">● In Progress</span>`;
		} else {
			return `<span class="step-pending">○ Pending</span>`;
		}
	}

	function renderDocumentSteps(leadId) {
		const docStatus = mockDocumentStatuses[leadId];
		if (!docStatus) return 'No document status available';
		
		return docStatus.steps.map(step => `
			<div class="document-step ${step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'current' : 'pending'}">
				<div class="step-header">
					<span class="step-number">${step.id}.</span>
					<span class="step-name">${step.name}</span>
					${renderDocumentStepStatus(step, docStatus.currentStep)}
				</div>
				${step.attachments.length > 0 ? `
					<div class="attachments">
						${step.attachments.map(attachment => `
							<div class="attachment">
								<span class="attachment-icon">📎</span>
								<span class="attachment-name">${attachment}</span>
								<button class="attachment-download" data-file="${attachment}">Download</button>
							</div>
						`).join('')}
					</div>
				` : ''}
			</div>
		`).join('');
	}

	function renderLeadDocumentSummary(leadId) {
		const docStatus = mockDocumentStatuses[leadId];
		if (!docStatus) return 'No documents';
		
		const completed = docStatus.steps.filter(s => s.status === 'completed').length;
		const total = docStatus.steps.length;
		const currentStep = docStatus.steps.find(s => s.status === 'in_progress');
		
		return `
			<div class="lead-document-summary">
				<div class="progress-bar">
					<div class="progress-fill" style="width: ${(completed / total) * 100}%"></div>
				</div>
				<div class="progress-text">${completed}/${total} steps completed</div>
				${currentStep ? `<div class="current-step">Currently: ${currentStep.name}</div>` : ''}
			</div>
		`;
	}

	// ---- Interactive Progress System ----
	
	// Mock data for progress tracking
	const mockProgressLeads = [
		{
			id: 'lead_1',
			leadName: 'Sarah Johnson',
			agentName: 'Alex Agent',
			agentEmail: 'alex@trecrm.com',
			currentStep: 3,
			lastUpdated: '2024-01-15T10:30:00Z',
			status: 'current',
			property: {
				name: 'The Howard',
				address: '123 Main St, Austin, TX',
				rent: '$1,200/month',
				bedrooms: 1,
				bathrooms: 1
			},
			showcase: {
				sent: true,
				landingPageUrl: 'https://tre-crm.vercel.app/showcase/lead_1',
				selections: ['The Howard', 'Community 2'],
				calendarDates: ['2024-01-20', '2024-01-22']
			},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_1'
			},
			lease: {
				sent: false,
				signed: false,
				finalized: false,
				property: 'The Howard',
				apartment: 'Unit 205'
			}
		},
		{
			id: 'lead_2',
			leadName: 'Mike Chen',
			agentName: 'Bailey Broker',
			agentEmail: 'bailey@trecrm.com',
			currentStep: 5,
			lastUpdated: '2024-01-14T15:45:00Z',
			status: 'current',
			property: {
				name: 'Waterford Park',
				address: '456 Oak Ave, Dallas, TX',
				rent: '$1,400/month',
				bedrooms: 2,
				bathrooms: 2
			},
			showcase: {
				sent: true,
				landingPageUrl: 'https://tre-crm.vercel.app/showcase/lead_2',
				selections: ['Waterford Park'],
				calendarDates: ['2024-01-18']
			},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_2'
			},
			lease: {
				sent: true,
				signed: false,
				finalized: false,
				property: 'Waterford Park',
				apartment: 'Unit 312'
			}
		},
		{
			id: 'lead_3',
			leadName: 'Emily Davis',
			agentName: 'Alex Agent',
			agentEmail: 'alex@trecrm.com',
			currentStep: 7,
			lastUpdated: '2024-01-13T09:20:00Z',
			status: 'completed',
			property: {
				name: 'Community 1',
				address: '789 Pine St, Houston, TX',
				rent: '$1,100/month',
				bedrooms: 1,
				bathrooms: 1
			},
			showcase: {
				sent: true,
				landingPageUrl: 'https://tre-crm.vercel.app/showcase/lead_3',
				selections: ['Community 1'],
				calendarDates: ['2024-01-15']
			},
			guestCard: {
				sent: true,
				url: 'https://tre-crm.vercel.app/guest-card/lead_3'
			},
			lease: {
				sent: true,
				signed: true,
				finalized: true,
				property: 'Community 1',
				apartment: 'Unit 101'
			}
		}
	];

	// Progress steps configuration
	const progressSteps = [
		{ id: 1, label: 'Showcase Sent', key: 'showcaseSent' },
		{ id: 2, label: 'Lead Responded', key: 'leadResponded' },
		{ id: 3, label: 'Guest Card Sent', key: 'guestCardSent' },
		{ id: 4, label: 'Property Selected', key: 'propertySelected' },
		{ id: 5, label: 'Lease Sent', key: 'leaseSent' },
		{ id: 6, label: 'Lease Signed', key: 'leaseSigned' },
		{ id: 7, label: 'Lease Finalized', key: 'leaseFinalized' }
	];

	function renderProgressTable(tbodyId, leads) {
		const tbody = document.getElementById(tbodyId);
		if (!tbody) return;

		tbody.innerHTML = leads.map(lead => createProgressTableRow(lead)).join('');
		
		// Add event listeners for progress steps
		leads.forEach(lead => {
			progressSteps.forEach(step => {
				const stepElement = document.querySelector(`[data-lead-id="${lead.id}"][data-step="${step.id}"]`);
				if (stepElement) {
					stepElement.addEventListener('click', (e) => {
						e.stopPropagation();
						showStepDetails(lead, step);
					});
				}
			});
		});
	}

	function createProgressTableRow(lead) {
		const progressPercentage = Math.round((lead.currentStep / progressSteps.length) * 100);
		const currentStepName = progressSteps[lead.currentStep - 1]?.label || 'Unknown';
		
		return `
			<!-- Lead Group Container -->
			<tbody class="lead-group">
				<!-- Data Row -->
				<tr class="lead-data-row">
					<td data-sort="${lead.agentName}">${lead.agentName}</td>
					<td data-sort="${lead.leadName}">${lead.leadName}</td>
					<td data-sort="${lead.currentStep}">${currentStepName}</td>
					<td class="progress-summary">
						<div class="progress-info">
							<span class="progress-percentage">${progressPercentage}% complete</span>
							<span class="progress-status ${lead.status}">${lead.status}</span>
						</div>
					</td>
					<td data-sort="${lead.lastUpdated}">${formatDate(lead.lastUpdated)}</td>
					<td>
						<button class="btn btn-secondary btn-small" onclick="viewLeadDetails('${lead.id}')">
							View Details
						</button>
					</td>
				</tr>
				<!-- Progress Bar Row -->
				<tr class="progress-bar-row">
					<td colspan="6" class="progress-bar-cell">
						<div class="progress-bar-container">
							<div class="progress-bar">
								<div class="progress-line-fill" style="width: ${progressPercentage}%"></div>
								<div class="progress-steps">
									${progressSteps.map(step => {
										const stepClass = step.id < lead.currentStep ? 'completed' : 
														 step.id === lead.currentStep ? 'current' : 'pending';
										return `
											<div class="progress-step ${stepClass}" 
												 data-lead-id="${lead.id}" 
												 data-step="${step.id}">
												<div class="progress-step-dot ${stepClass}">${step.id}</div>
												<div class="progress-step-label">${step.label}</div>
												<div class="progress-step-popup" id="popup-${lead.id}-${step.id}">
													<div class="popup-title">${step.label}</div>
													<div class="popup-content">
														${getStepPopupContent(lead, step)}
													</div>
												</div>
											</div>
										`;
									}).join('')}
								</div>
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		`;
	}

	function getStepPopupContent(lead, step) {
		switch(step.id) {
			case 1: // Showcase Sent
				return `
					<div class="popup-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="popup-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="popup-details"><strong>Date:</strong> ${formatDate(lead.lastUpdated)}</div>
					<a href="${lead.showcase.landingPageUrl}" target="_blank" class="popup-link">View Landing Page →</a>
				`;
				
			case 2: // Lead Responded
				return `
					<div class="popup-details"><strong>Lead:</strong> ${lead.leadName}</div>
					<div class="popup-details"><strong>Selected:</strong> ${lead.showcase.selections.join(', ')}</div>
					<div class="popup-details"><strong>Dates:</strong> ${lead.showcase.calendarDates.join(', ')}</div>
					<a href="${lead.showcase.landingPageUrl}?filled=true" target="_blank" class="popup-link">View Filled Page →</a>
				`;
				
			case 3: // Guest Card Sent
				return `
					<div class="popup-details"><strong>Lead:</strong> ${lead.leadName}</div>
					<div class="popup-details"><strong>Agent:</strong> ${lead.agentName}</div>
					<div class="popup-details"><strong>Properties:</strong> ${lead.showcase.selections.join(', ')}</div>
					<a href="${lead.guestCard.url}" target="_blank" class="popup-link">View Guest Card →</a>
				`;
				
			case 4: // Property Selected
				return `
					<div class="popup-details"><strong>Property:</strong> ${lead.property.name}</div>
					<div class="popup-details"><strong>Address:</strong> ${lead.property.address}</div>
					<div class="popup-details"><strong>Rent:</strong> ${lead.property.rent}</div>
					<div class="popup-details"><strong>Size:</strong> ${lead.property.bedrooms}bd/${lead.property.bathrooms}ba</div>
				`;
				
			case 5: // Lease Sent
				return `
					<div class="popup-details"><strong>Sent to:</strong> ${lead.leadName}</div>
					<div class="popup-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="popup-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<a href="https://tre-crm.vercel.app/lease/lead_${lead.id}" target="_blank" class="popup-link">View Lease →</a>
				`;
				
			case 6: // Lease Signed
				return `
					<div class="popup-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="popup-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<div class="popup-details"><strong>Signed by:</strong> Property Management</div>
					<a href="https://tre-crm.vercel.app/lease-signed/lead_${lead.id}" target="_blank" class="popup-link">View Signed Lease →</a>
				`;
				
			case 7: // Lease Finalized
				return `
					<div class="popup-details"><strong>Status:</strong> Complete</div>
					<div class="popup-details"><strong>Property:</strong> ${lead.lease.property}</div>
					<div class="popup-details"><strong>Unit:</strong> ${lead.lease.apartment}</div>
					<div class="popup-details"><strong>Commission:</strong> Ready for processing</div>
				`;
				
			default:
				return `<div class="popup-details">No details available</div>`;
		}
	}

	function showStepDetails(lead, step) {
		// Hide all other popups first
		document.querySelectorAll('.progress-step-popup').forEach(popup => {
			popup.classList.remove('show');
		});
		
		// Show the specific popup
		const popup = document.getElementById(`popup-${lead.id}-${step.id}`);
		if (popup) {
			popup.classList.add('show');
			
			// Hide popup when clicking outside
			setTimeout(() => {
				document.addEventListener('click', function hidePopup(e) {
					if (!popup.contains(e.target)) {
						popup.classList.remove('show');
						document.removeEventListener('click', hidePopup);
					}
				});
			}, 100);
		}
	}

	function viewLeadDetails(leadId) {
		const lead = mockProgressLeads.find(l => l.id === leadId);
		if (!lead) return;
		
		const currentStep = progressSteps[lead.currentStep - 1];
		showStepDetails(lead, currentStep);
	}

	// ---- Rendering: Documents Table ----
	async function renderDocuments(){
		if (state.role === 'agent') {
			renderAgentDocuments();
		} else {
			renderManagerDocuments();
		}
	}

	async function renderManagerDocuments(){
		// Show manager view, hide agent view
		document.getElementById('managerDocumentsView').classList.remove('hidden');
		document.getElementById('agentDocumentsView').classList.add('hidden');

		// Render progress table
		renderProgressTable('documentsTbody', mockProgressLeads);
	}

	async function renderAgentDocuments(){
		// Show agent view, hide manager view
		document.getElementById('managerDocumentsView').classList.add('hidden');
		document.getElementById('agentDocumentsView').classList.remove('hidden');

		// Filter leads for agent view
		const agentLeads = mockProgressLeads.filter(lead => lead.agentName === 'Alex Agent');
		renderProgressTable('agentDocumentsTbody', agentLeads);
	}


	function renderLeadsTable(searchTerm = '', searchType = 'both'){
		const tbody = document.getElementById('documentsTbody');
		tbody.innerHTML = '';

		// Get all active leads with their agent info
		let activeLeads = mockLeads.filter(l => l.health_status !== 'closed' && l.health_status !== 'lost');
		
		// Apply search filter
		if (searchTerm.trim()) {
			activeLeads = activeLeads.filter(lead => {
				const agent = mockAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
				const searchLower = searchTerm.toLowerCase();
				
				if (searchType === 'agent') {
					return agent.name.toLowerCase().includes(searchLower);
				} else if (searchType === 'lead') {
					return lead.name.toLowerCase().includes(searchLower) || lead.email.toLowerCase().includes(searchLower);
				} else { // both
					return agent.name.toLowerCase().includes(searchLower) || 
						   lead.name.toLowerCase().includes(searchLower) || 
						   lead.email.toLowerCase().includes(searchLower);
				}
			});
		}
		
		activeLeads.forEach(lead => {
			const agent = mockAgents.find(a => a.id === lead.assigned_agent_id) || { name: 'Unassigned' };
			const progress = getDocumentProgress(lead.id);
			const currentStep = getCurrentDocumentStep(lead.id);
			const lastUpdated = getLastDocumentUpdate(lead.id);

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td data-sort="agent_name">${agent.name}</td>
				<td data-sort="lead_name">
					<div class="lead-name">${lead.name}</div>
					<div class="subtle mono">${lead.email}</div>
				</td>
				<td data-sort="current_step">
					<div class="current-step">${currentStep}</div>
				</td>
				<td data-sort="progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progress}%"></div>
					</div>
					<div class="progress-text">${progress}% complete</div>
				</td>
				<td data-sort="last_updated" class="mono">${formatDate(lastUpdated)}</td>
				<td>
					<button class="btn-small btn-primary-small" onclick="openDocumentDetails('${lead.id}')">
						View Details
					</button>
				</td>
			`;
			tbody.appendChild(tr);
		});
	}

	function renderAgentLeadsList(){
		const agentLeadsList = document.getElementById('agentLeadsList');
		agentLeadsList.innerHTML = '';

		// Get current agent's leads
		const agentLeads = mockLeads.filter(l => l.assigned_agent_id === state.agentId);
		
		agentLeads.forEach(lead => {
			const progress = getDocumentProgress(lead.id);
			const currentStep = getCurrentDocumentStep(lead.id);
			const status = getDocumentStatus(lead.id);

			const card = document.createElement('div');
			card.className = 'lead-card';
			card.innerHTML = `
				<div class="lead-card-header">
					<div class="lead-name">${lead.name}</div>
					<div class="lead-status ${status}">${status}</div>
				</div>
				<div class="lead-progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${progress}%"></div>
					</div>
					<div class="progress-text">${progress}% complete - ${currentStep}</div>
				</div>
				<div class="document-steps">
					${renderDocumentSteps(lead.id)}
				</div>
				<div class="lead-actions">
					<button class="btn-small btn-primary-small" onclick="openDocumentDetails('${lead.id}')">
						View Details
					</button>
					<button class="btn-small btn-secondary-small" onclick="updateDocumentStatus('${lead.id}')">
						Update Status
					</button>
				</div>
			`;
			agentLeadsList.appendChild(card);
		});
	}

	// Helper functions for document status
	function getDocumentProgress(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return 0;
		
		const completedSteps = status.steps.filter(step => step.status === 'completed').length;
		return Math.round((completedSteps / status.steps.length) * 100);
	}

	function getCurrentDocumentStep(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return 'Not Started';
		
		const currentStep = status.steps.find(step => step.status === 'current');
		return currentStep ? currentStep.name : 'Completed';
	}

	function getDocumentStatus(leadId) {
		const progress = getDocumentProgress(leadId);
		if (progress === 0) return 'not-started';
		if (progress === 100) return 'completed';
		return 'active';
	}

	function getLastDocumentUpdate(leadId) {
		const status = mockDocumentStatuses[leadId];
		if (!status) return new Date();
		
		const lastStep = status.steps
			.filter(step => step.status === 'completed')
			.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
		
		return lastStep ? lastStep.updated_at : new Date();
	}

	// Helper functions for agent actions
	function viewAgentLeads(agentId) {
		// Filter the leads table to show only this agent's leads
		const tbody = document.getElementById('documentsTbody');
		const rows = tbody.querySelectorAll('tr');
		rows.forEach(row => {
			const agentName = row.querySelector('[data-sort="agent_name"]')?.textContent.trim();
			const agent = mockAgents.find(a => a.id === agentId);
			if (agent && agentName === agent.name) {
				row.style.display = '';
			} else {
				row.style.display = 'none';
			}
		});
		toast(`Showing leads for ${mockAgents.find(a => a.id === agentId)?.name || 'Unknown Agent'}`);
	}

	function viewAgentDetails(agentId) {
		const agent = mockAgents.find(a => a.id === agentId);
		if (agent) {
			openAgentDrawer(agentId);
		}
	}

	function updateDocumentStatus(leadId) {
		toast('Document status update feature coming soon!');
	}

	// ---- Rendering: Agents Table ----
	async function renderAgents(){
		const tbody = document.getElementById('agentsTbody');
		tbody.innerHTML = '';
		
		mockAgents.forEach(agent => {
			const stats = getAgentStats(agent.id);
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>
					<div class="lead-name">${agent.name}</div>
					<div class="subtle mono">${agent.email} · ${agent.phone}</div>
					${!agent.active ? '<span class="subtle" style="color: #dc2626;">Inactive</span>' : ''}
				</td>
				<td><button class="icon-btn" data-view-agent="${agent.id}" title="View">👁️</button></td>
				<td class="mono">${stats.assigned}</td>
				<td class="mono">${stats.closed}</td>
				<td>
					<button class="action-btn" data-remove="${agent.id}">Remove Agent</button>
					<button class="action-btn" data-edit="${agent.id}">Change Info</button>
					<button class="action-btn" data-assign-leads="${agent.id}">Assign Leads</button>
				</td>
			`;
			tbody.appendChild(tr);
		});
	}

	// ---- Map Management ----
	let map = null;
	let markers = [];
	let selectedProperty = null;

	function initMap() {
		if (map) return;
		map = L.map('listingsMap', { 
			zoomControl: true,
			preferCanvas: true, // Better performance
			renderer: L.canvas() // Use canvas for better performance
		}).setView([29.48, -98.50], 10);
		
		// Multiple tile layers for better coverage and fallback
		const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
			maxZoom: 19, 
			attribution: '&copy; OpenStreetMap',
			subdomains: ['a', 'b', 'c'], // Use multiple subdomains for better loading
			detectRetina: true
		});
		
		const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			maxZoom: 20,
			attribution: '&copy; OpenStreetMap &copy; CARTO',
			subdomains: 'abcd',
			detectRetina: true
		});
		
		const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			maxZoom: 19,
			attribution: '&copy; Esri',
			detectRetina: true
		});
		
		// Add base layers
		const baseLayers = {
			"Street Map": osmLayer,
			"CartoDB": cartoLayer,
			"Satellite": satelliteLayer
		};
		
		// Add default layer
		osmLayer.addTo(map);
		
		// Add layer control
		L.control.layers(baseLayers).addTo(map);
		
		// Handle tile loading errors
		map.on('tileerror', function(e) {
			console.log('Tile loading error:', e);
		});
	}

	function clearMarkers() {
		markers.forEach(m => m.remove());
		markers = [];
	}

	function addMarker(prop) {
		const isSelected = selectedProperty && selectedProperty.id === prop.id;
		
		// Use canvas marker for better performance with many markers
		const icon = L.divIcon({ 
			html: `<div class="price-marker ${isSelected ? 'selected' : ''}">$${prop.rent_min.toLocaleString()}</div>`, 
			className: '', 
			iconSize: [0, 0],
			useCanvas: true // Better performance
		});
		
		const marker = L.marker([prop.lat, prop.lng], { 
			icon,
			riseOnHover: true // Better UX
		}).addTo(map);
		
		marker.property = prop; // Store property reference
		
		// Lazy load popup content
		marker.bindPopup(`
			<strong>${prop.name}</strong><br>
			${prop.address}<br>
			<span class="subtle">$${prop.rent_min.toLocaleString()} - $${prop.rent_max.toLocaleString()} · ${prop.beds_min}-${prop.beds_max} bd / ${prop.baths_min}-${prop.baths_max} ba</span>
		`, {
			closeButton: true,
			autoClose: false,
			closeOnClick: false
		});
		
		// Add click handler to marker
		marker.on('click', () => {
			selectProperty(prop);
		});
		
		markers.push(marker);
	}

	function selectProperty(prop) {
		selectedProperty = prop;
		
		// Update table selection
		document.querySelectorAll('#listingsTbody tr').forEach(row => {
			row.classList.remove('selected');
		});
		
		// Find and highlight the table row
		const rows = document.querySelectorAll('#listingsTbody tr');
		rows.forEach(row => {
			const nameCell = row.querySelector('.lead-name');
			if (nameCell && nameCell.textContent.trim() === prop.name) {
				row.classList.add('selected');
				row.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
		
		// Update map markers
		markers.forEach(marker => {
			const isSelected = marker.property.id === prop.id;
			const newIcon = L.divIcon({ 
				html: `<div class="price-marker ${isSelected ? 'selected' : ''}">$${marker.property.rent_min.toLocaleString()}</div>`, 
				className: '', 
				iconSize: [0, 0] 
			});
			marker.setIcon(newIcon);
		});
		
		// Center map on selected property
		map.setView([prop.lat, prop.lng], Math.max(map.getZoom(), 14));
	}

	// ---- Rendering: Listings Table ----
	async function renderListings(){
		console.log('renderListings called');
		const tbody = document.getElementById('listingsTbody');
		const search = state.search.toLowerCase();
		
		// Apply both search and filters
		let filtered = mockProperties;
		
		// Apply search filter
		if (search) {
			filtered = filtered.filter(prop => 
				prop.name.toLowerCase().includes(search) ||
				prop.market.toLowerCase().includes(search) ||
				prop.neighborhoods.some(n => n.toLowerCase().includes(search)) ||
				prop.amenities.some(a => a.toLowerCase().includes(search))
			);
		}
		
		// Apply listings filters
		filtered = filtered.filter(prop => matchesListingsFilters(prop, state.listingsFilters));

		tbody.innerHTML = '';
		filtered.forEach(prop => {
			const tr = document.createElement('tr');
			tr.dataset.propertyId = prop.id;
			
			tr.innerHTML = `
				<td data-sort="name">
					<div class="lead-name">${prop.name}</div>
					<div class="subtle mono">${prop.address}</div>
				</td>
				<td class="mono" data-sort="market">${prop.market}</td>
				<td class="mono" data-sort="neighborhoods">${prop.neighborhoods.join(', ')}</td>
				<td class="mono" data-sort="rent_min">$${prop.rent_min} - $${prop.rent_max}</td>
				<td class="mono" data-sort="beds_min">${prop.beds_min}-${prop.beds_max} / ${prop.baths_min}-${prop.baths_max}</td>
				<td class="mono" data-sort="commission_pct">${Math.max(prop.escort_pct, prop.send_pct)}%</td>
			<td class="mono">
				<div class="interest-count" data-property-id="${prop.id}" data-property-name="${prop.name}">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
					</svg>
					${mockInterestedLeads[prop.id] ? mockInterestedLeads[prop.id].length : 0} interested
				</div>
			</td>
				<td class="mono" data-sort="last_updated">${formatDate(prop.pricing_last_updated)}</td>
			`;
			
			// Add click handler to table row
			tr.addEventListener('click', () => {
				selectProperty(prop);
			});
			
			tbody.appendChild(tr);
		});

		// Update map
		if (map) {
			clearMarkers();
			if (filtered.length > 0) {
				const bounds = [];
				filtered.forEach(prop => {
					addMarker(prop);
					bounds.push([prop.lat, prop.lng]);
				});
				if (bounds.length > 0) {
					// Only fit bounds if no property is selected, otherwise maintain current view
					if (!selectedProperty) {
						map.fitBounds(bounds, { padding: [30, 30] });
					}
				}
			}
		}
	}

	// ---- Drawer ----
	async function openDrawer(leadId){
		state.selectedLeadId = leadId;
		const lead = await api.getLead(leadId);
		const c = document.getElementById('drawerContent');
		const foundBy = mockAgents.find(a => a.id === lead.found_by_agent_id)?.name || '—';
		c.innerHTML = `
			<div class="field"><label>Lead</label><div class="value">${lead.name}</div></div>
			<div class="field"><label>Contact</label><div class="value">${lead.email} · ${lead.phone}</div></div>
			<div class="field"><label>Submitted at</label><div class="value mono">${formatDate(lead.submitted_at)}</div></div>
			<div class="field"><label>Agent who found lead</label><div class="value">${foundBy}</div></div>
			<hr />
			<div class="field"><label>Market</label><div class="value">${lead.prefs.market}</div></div>
			<div class="field"><label>Neighborhoods</label><div class="value">${lead.prefs.neighborhoods.join(', ')}</div></div>
			<div class="field"><label>Budget</label><div class="value">$${lead.prefs.budget_min} - $${lead.prefs.budget_max}</div></div>
			<div class="field"><label>Beds/Baths</label><div class="value">${lead.prefs.beds} / ${lead.prefs.baths}</div></div>
			<div class="field"><label>Move in</label><div class="value">${lead.prefs.move_in}</div></div>
			<div class="field"><label>Pets</label><div class="value">${lead.prefs.pets}</div></div>
			<div class="field"><label>Parking</label><div class="value">${lead.prefs.parking}</div></div>
			<div class="field"><label>Sqft</label><div class="value">${lead.prefs.sqft_min} - ${lead.prefs.sqft_max}</div></div>
			<div class="field"><label>Amenities</label><div class="value">${lead.prefs.amenities.join(', ')}</div></div>
			<div class="field"><label>Credit tier</label><div class="value">${lead.prefs.credit_tier}</div></div>
			<div class="field"><label>Background</label><div class="value">${lead.prefs.background}</div></div>
			<div class="field"><label>Notes</label><div class="value">${lead.prefs.notes}</div></div>
			${state.role==='manager' ? `<div class="field"><label>Assign to</label>${renderAgentSelect(await api.getLead(leadId))}</div>` : ''}
		`;
		show(document.getElementById('leadDrawer'));
	}

	function closeDrawer(){ 
		console.log('closeDrawer called'); // Debug
		hide(document.getElementById('leadDrawer')); 
	}

	// ---- Agent Drawer ----
	async function openAgentDrawer(agentId){
		state.selectedAgentId = agentId;
		const agent = mockAgents.find(a => a.id === agentId);
		const stats = getAgentStats(agentId);
		const c = document.getElementById('agentDrawerContent');
		
		c.innerHTML = `
			<div class="field"><label>Agent Name</label><div class="value">${agent.name}</div></div>
			<div class="field"><label>Contact</label><div class="value">${agent.email} · ${agent.phone}</div></div>
			<div class="field"><label>Status</label><div class="value">${agent.active ? 'Active' : 'Inactive'}</div></div>
			<div class="field"><label>Hire Date</label><div class="value mono">${formatDate(agent.hireDate)}</div></div>
			<div class="field"><label>License Number</label><div class="value mono">${agent.licenseNumber}</div></div>
			<div class="field"><label>Specialties</label><div class="value">${agent.specialties.join(', ')}</div></div>
			<div class="field"><label>Notes</label><div class="value">${agent.notes}</div></div>
			<hr />
			<div class="stats-grid">
				<div class="stat-card">
					<div class="label">Leads Assigned</div>
					<div class="value">${stats.assigned}</div>
				</div>
				<div class="stat-card">
					<div class="label">Leads Closed (90d)</div>
					<div class="value">${stats.closed}</div>
				</div>
			</div>
		`;
		show(document.getElementById('agentDrawer'));
	}

	function closeAgentDrawer(){ hide(document.getElementById('agentDrawer')); }

	// ---- Document Modals ----
	function openDocumentDetails(leadId) {
		const lead = mockLeads.find(l => l.id === leadId);
		const docStatus = mockDocumentStatuses[leadId];
		
		if (!lead || !docStatus) {
			toast('Document details not available for this lead');
			return;
		}

		document.getElementById('documentLeadName').textContent = lead.name;
		document.getElementById('documentSteps').innerHTML = renderDocumentSteps(leadId);
		show(document.getElementById('documentDetailsModal'));
	}

	function closeDocumentDetails() {
		hide(document.getElementById('documentDetailsModal'));
	}

	function openHistory() {
		const historyContent = document.getElementById('historyContent');
		historyContent.innerHTML = `
			<div class="history-list">
				${mockClosedLeads.map(closedLead => {
					const agent = mockAgents.find(a => a.id === closedLead.agent_id);
					return `
						<div class="history-item">
							<div class="history-header">
								<div class="lead-info">
									<h4>${closedLead.name}</h4>
									<div class="agent-info">Agent: ${agent ? agent.name : 'Unknown'}</div>
									<div class="closed-date">Closed: ${formatDate(closedLead.closed_date)}</div>
								</div>
								<button class="btn btn-secondary" data-history-lead="${closedLead.id}">View Documents</button>
							</div>
						</div>
					`;
				}).join('')}
			</div>
		`;
		show(document.getElementById('historyModal'));
	}

	function closeHistory() {
		hide(document.getElementById('historyModal'));
	}

	function openHistoryDocumentDetails(closedLeadId) {
		const closedLead = mockClosedLeads.find(l => l.id === closedLeadId);
		if (!closedLead) return;

		document.getElementById('documentLeadName').textContent = closedLead.name + ' (Closed)';
		document.getElementById('documentSteps').innerHTML = closedLead.steps.map(step => `
			<div class="document-step completed">
				<div class="step-header">
					<span class="step-number">${step.id}.</span>
					<span class="step-name">${step.name}</span>
					<span class="step-completed">✓ Completed</span>
				</div>
				${step.attachments.length > 0 ? `
					<div class="attachments">
						${step.attachments.map(attachment => `
							<div class="attachment">
								<span class="attachment-icon">📎</span>
								<span class="attachment-name">${attachment}</span>
								<button class="attachment-download" data-file="${attachment}">Download</button>
							</div>
						`).join('')}
					</div>
				` : ''}
			</div>
		`).join('');
		show(document.getElementById('documentDetailsModal'));
	}

	// ---- Matches Modal ----
	async function openMatches(leadId){
		state.selectedLeadId = leadId;
		state.selectedMatches = new Set();
		const lead = await api.getLead(leadId);
		const grid = document.getElementById('listingsGrid');
		const list = await api.getMatches(leadId, 10);
		state.currentMatches = list;
		
		// Update modal title and send button
		document.getElementById('leadNameTitle2').textContent = lead.name;
		document.getElementById('sendLeadName').textContent = lead.name;
		
		grid.innerHTML = '';
		list.forEach(item => {
			const card = document.createElement('article');
			card.className = 'listing-card';
			card.innerHTML = `
				<div class="listing-image">
					<img src="${item.image_url}" alt="${item.name}" loading="lazy">
					<div class="listing-badge">${item.effective_commission_pct}% Commission</div>
				</div>
				<div class="listing-content">
					<div class="listing-header">
						<h3 class="listing-name">${item.name}</h3>
						<div class="listing-rating">
							<span class="stars">★★★★☆</span>
							<span class="rating-text">4.2</span>
						</div>
					</div>
					<div class="listing-price">
						<div class="price-amount">$${item.rent_min.toLocaleString()} - $${item.rent_max.toLocaleString()}/mo</div>
						<div class="listing-specs">${item.beds_min}-${item.beds_max} bd • ${item.baths_min}-${item.baths_max} ba • ${item.sqft_min.toLocaleString()}-${item.sqft_max.toLocaleString()} sqft</div>
					</div>
					<div class="listing-features">
						<div class="feature-tag">${item.specials_text}</div>
						<div class="feature-tag secondary">${item.bonus_text}</div>
					</div>
					<div class="listing-footer">
						<label class="listing-checkbox">
							<input type="checkbox" class="listing-check" data-id="${item.id}">
							<span class="checkmark"></span>
							<span class="checkbox-text">Select Property</span>
						</label>
						<div class="listing-actions">
							<button class="listing-action-btn" title="View more details">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			`;
			grid.appendChild(card);
		});
		updateSelectionSummary();
		show(document.getElementById('matchesModal'));
	}
	function closeMatches(){ hide(document.getElementById('matchesModal')); }

	// ---- Email Preview Modal ----
	async function openEmailPreview(){
		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop => 
			state.selectedMatches.has(prop.id)
		);
		
		// Update email content
		document.getElementById('previewLeadName').textContent = lead.name;
		document.getElementById('previewAgentEmail').textContent = 'agent@trecrm.com';
		document.getElementById('agentEmail').textContent = 'agent@trecrm.com';
		document.getElementById('emailRecipient').textContent = `To: ${lead.email}`;
		document.getElementById('previewAgentName').textContent = 'Your Agent';
		
		// Render selected properties
		const propertiesGrid = document.getElementById('previewProperties');
		propertiesGrid.innerHTML = '';
		
		selectedProperties.forEach(property => {
			const card = document.createElement('div');
			card.className = 'preview-property-card';
			card.innerHTML = `
				<div class="preview-property-image">
					<img src="${property.image_url}" alt="${property.name}" loading="lazy">
				</div>
				<div class="preview-property-content">
					<div class="preview-property-name">${property.name}</div>
					<div class="preview-property-price">$${property.rent_min.toLocaleString()} - $${property.rent_max.toLocaleString()}/mo</div>
					<div class="preview-property-specs">${property.beds_min}-${property.beds_max} bd • ${property.baths_min}-${property.baths_max} ba</div>
				</div>
			`;
			propertiesGrid.appendChild(card);
		});
		
		// Close matches modal and open email preview
		closeMatches();
		show(document.getElementById('emailPreviewModal'));
	}

	function closeEmailPreview(){ 
		hide(document.getElementById('emailPreviewModal')); 
	}

	function previewLandingPage() {
		// Get the selected properties from the current showcase
		const selectedProperties = Array.from(state.selectedMatches);
		const propertyIds = selectedProperties.join(',');
		
		// Get current agent name (in real app, this would come from user data)
		const agentName = 'John Smith'; // This would be dynamic in production
		
		// Create a preview URL with sample data
		const previewUrl = `landing.html?showcase=preview_${Date.now()}&lead=sample_lead&agent=${encodeURIComponent(agentName)}&properties=${propertyIds}`;
		
		// Open in a new tab
		window.open(previewUrl, '_blank');
		
		toast('Opening landing page preview in new tab...');
	}

	// ---- Interested Leads Modal ----
	async function openInterestedLeads(propertyId, propertyName) {
		console.log('Opening interested leads for property:', propertyId, propertyName);
		document.getElementById('propertyName').textContent = propertyName;
		
		try {
			const interests = await api.getInterestedLeads(propertyId);
			console.log('Fetched interests:', interests);
			renderInterestedLeads(interests);
			show(document.getElementById('interestedLeadsModal'));
		} catch (error) {
			console.error('Error loading interested leads:', error);
			// Show empty state if no data
			renderInterestedLeads([]);
			show(document.getElementById('interestedLeadsModal'));
		}
	}

	function closeInterestedLeads() {
		hide(document.getElementById('interestedLeadsModal'));
	}

	function renderInterestedLeads(interests) {
		console.log('renderInterestedLeads called with:', interests);
		const content = document.getElementById('interestedLeadsContent');
		
		if (interests.length === 0) {
			console.log('No interests found, showing empty state');
			content.innerHTML = `
				<div style="text-align: center; padding: 40px; color: #6b7280;">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 16px; opacity: 0.5;">
						<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
					</svg>
					<p>No interested leads yet</p>
					<p style="font-size: 0.875rem; margin-top: 8px;">Send showcases to generate interest!</p>
				</div>
			`;
			return;
		}

		console.log('Rendering', interests.length, 'interests');
		content.innerHTML = interests.map(interest => `
			<div class="interested-lead-item">
				<div class="interest-icon">
					${interest.leadName.charAt(0).toUpperCase()}
				</div>
				<div class="lead-info">
					<div class="lead-name">${interest.leadName}</div>
					<div class="lead-contact">Lead ID: ${interest.leadId}</div>
					<div class="lead-agent">via ${interest.agentName}</div>
				</div>
				<div class="interest-details">
					<div class="interest-date">${formatDate(interest.date)}</div>
					<div class="interest-status ${interest.status}">${interest.status.replace('_', ' ')}</div>
				</div>
			</div>
		`).join('');
	}

	// Global functions will be assigned at the end of the file

	async function sendShowcaseEmail(){
		const lead = await api.getLead(state.selectedLeadId);
		const selectedProperties = state.currentMatches.filter(prop => 
			state.selectedMatches.has(prop.id)
		);
		
		// Generate unique showcase ID for tracking
		const showcaseId = `showcase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		// Create landing page URL with tracking parameters
		const baseUrl = window.location.origin + window.location.pathname.replace('index.html', 'landing.html');
		const landingUrl = `${baseUrl}?showcase=${showcaseId}&lead=${lead.id}&properties=${Array.from(state.selectedMatches).join(',')}`;
		
		// Create email content
		const emailContent = {
			to: lead.email,
			subject: 'Top options hand picked for you',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<div style="text-align: center; padding: 20px; background: #f8fafc;">
						<h1 style="color: #1e293b; margin-bottom: 10px;">🏠 Your Perfect Home Awaits</h1>
						<p style="color: #64748b; font-size: 18px;">Hand-picked properties just for you by our expert team</p>
					</div>
					
					<div style="padding: 30px;">
						<p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi ${lead.name},</p>
						
						<p style="font-size: 16px; color: #374151; margin-bottom: 20px;">We have some great fits for you! Go through me and you'll get these perks:</p>
						
						<ul style="margin: 20px 0; padding-left: 0; list-style: none;">
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🎯 <strong>Exclusive access</strong> to properties before they hit the market</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">💰 <strong>Better pricing</strong> through our direct relationships</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">⚡ <strong>Priority scheduling</strong> for property tours</li>
							<li style="margin-bottom: 10px; font-size: 14px; color: #4b5563;">🛡️ <strong>Expert guidance</strong> throughout your search</li>
						</ul>
						
						<p style="font-size: 16px; color: #374151; margin-bottom: 30px;">Here's a list of options based on what you're looking for. Click which ones you're interested in and hit submit, and then we'll schedule you to go take a look at them!</p>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="${landingUrl}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">View Your Personalized Property Matches</a>
						</div>
						
						<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 14px;">
							<p>Best regards,<br>Your Agent<br>TRE CRM Team</p>
						</div>
					</div>
				</div>
			`
		};
		
		try {
			// Send email via API
			await api.sendEmail(emailContent);
			
			// Create showcase record in database
			await api.createShowcase({
				lead_id: lead.id,
				agent_id: 'current-agent-id', // In real app, get from current user
				listing_ids: Array.from(state.selectedMatches),
				message: `Showcase sent to ${lead.name} with ${selectedProperties.length} properties`,
				showcase_id: showcaseId,
				landing_url: landingUrl
			});
			
			toast(`Showcase email sent to ${lead.name}! They can view their personalized matches at the provided link.`);
			closeEmailPreview();
			
		} catch (error) {
			console.error('Error sending showcase email:', error);
			toast('Error sending email. Please try again.');
		}
	}
	
	function updateSelectionSummary(){
		const checkboxes = document.querySelectorAll('.listing-check');
		const checked = Array.from(checkboxes).filter(cb => cb.checked);
		const selectedCount = document.getElementById('selectedCount');
		const sendBtn = document.getElementById('sendBtn');
		
		selectedCount.textContent = checked.length;
		sendBtn.disabled = checked.length === 0;
		
		// Update state
		state.selectedMatches.clear();
		checked.forEach(cb => state.selectedMatches.add(cb.dataset.id));
	}
	
	function updateCreateShowcaseBtn(){
		const btn = document.getElementById('createShowcase');
		btn.disabled = state.selectedMatches.size === 0;
	}

	// ---- Showcase ----
	async function openShowcasePreview(){
		const lead = await api.getLead(state.selectedLeadId);
		document.getElementById('showcaseTo').value = lead.email;
		const selected = Array.from(state.selectedMatches);
		const preview = document.getElementById('showcasePreview');
		preview.innerHTML = selected.map(id => {
			const item = state.currentMatches.find(x => x.id === id);
			return `<div class="public-card"><div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div><div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div><div class="subtle">${item.specials_text || ''}</div></div>`;
		}).join('');
		show(document.getElementById('showcaseModal'));
	}
	function closeShowcase(){ hide(document.getElementById('showcaseModal')); }

	async function sendShowcase(){
		const lead = await api.getLead(state.selectedLeadId);
		const listing_ids = Array.from(state.selectedMatches);
		const { showcase_id, public_url } = await api.createShowcase({
			lead_id: lead.id,
			agent_id: state.agentId,
			listing_ids,
			message: document.getElementById('showcaseMessage').value
		});
		const html = renderPublicShowcaseHTML({ showcaseId: showcase_id });
		await api.sendEmail({ to: lead.email, subject: document.getElementById('showcaseSubject').value, html, showcase_id });
		toast('ShowCase sent and recorded');
		closeShowcase();
		closeMatches();
		window.prompt('Copy public link:', public_url);
	}

	function renderPublicShowcaseHTML({ showcaseId }){
		const sc = state.showcases[showcaseId];
		const lead = mockLeads.find(l => l.id === sc.lead_id);
		const agent = mockAgents.find(a => a.id === sc.agent_id);
		const listings = sc.listing_ids.map(id => mockProperties.find(p => p.id === id));
		const items = listings.map(item => `
			<div class="public-card">
				<div><strong>${item.name}</strong> — ${item.neighborhoods[0] || ''}</div>
				<div class="subtle">$${item.rent_min} - $${item.rent_max} · ${item.beds_min}-${item.beds_max} bd / ${item.baths_min}-${item.baths_max} ba · ${item.sqft_min}-${item.sqft_max} sqft</div>
				<div class="subtle">${item.specials_text || ''} ${item.bonus_text ? `· ${item.bonus_text}` : ''}</div>
				<div><a href="${item.website}" target="_blank" rel="noopener">Website</a> · ${item.address}</div>
			</div>
		`).join('');
		return `
			<div class="public-wrap">
				<div class="public-header">
					<h2>${agent.name} — Top Listings for ${lead.name}</h2>
					<div class="public-banner">${state.publicBanner}</div>
				</div>
				<div class="public-body">
					${items}
				</div>
			</div>
		`;
	}

	// ---- Routing ----
	function setRoleLabel(page = 'leads'){
		const label = document.getElementById(`${page}RoleLabel`) || document.getElementById('roleLabel');
		if (label) {
			label.textContent = state.role === 'manager' ? 'Viewing as Manager' : 'Viewing as Agent';
		}
	}

	function updateNavigation(activePage) {
		document.querySelectorAll('.nav-link').forEach(link => {
			link.classList.remove('active');
		});
		document.querySelector(`[data-page="${activePage}"]`).classList.add('active');
	}

	function route(){
		const hash = location.hash.slice(1);
		// public showcase route: #/sc_xxxxxx
		if (hash.startsWith('/sc_')){
			// render public showcase view (read-only)
			document.body.innerHTML = `
				<link rel="stylesheet" href="styles.css" />
				<div id="publicMount"></div>
			`;
			const mount = document.getElementById('publicMount');
			// We don't persist by slug in mock; show a generic example
			mount.innerHTML = `
				<div class="public-wrap">
					<div class="public-header">
						<h2>Agent Name — Top Listings for Lead Name</h2>
						<div class="public-banner">${state.publicBanner}</div>
					</div>
					<div class="public-body">
						<div class="public-card">Example Listing — replace with real when backend ready.</div>
					</div>
				</div>
			`;
			return;
		}

		// Hide all views
		document.querySelectorAll('.route-view').forEach(view => hide(view));

		// Show appropriate view based on route
		if (hash === '/agents') {
			state.currentPage = 'agents';
			show(document.getElementById('agentsView'));
			setRoleLabel('agents');
			renderAgents();
		} else if (hash === '/listings') {
			state.currentPage = 'listings';
			show(document.getElementById('listingsView'));
			setRoleLabel('listings');
			// Initialize map if not already done
			setTimeout(() => {
				initMap();
				renderListings();
			}, 100);
		} else if (hash === '/documents') {
			state.currentPage = 'documents';
			show(document.getElementById('documentsView'));
			setRoleLabel('documents');
			// Initialize the documents view properly
			document.getElementById('managerDocumentsView').classList.remove('hidden');
			document.getElementById('agentDocumentsView').classList.add('hidden');
			renderDocuments();
		} else if (hash === '/admin') {
			state.currentPage = 'admin';
			show(document.getElementById('adminView'));
			setRoleLabel('admin');
			renderAdmin();
		} else {
			// default: leads
			state.currentPage = 'leads';
			show(document.getElementById('leadsView'));
			setRoleLabel('leads');
			renderLeads();
		}

		updateNavigation(state.currentPage);
	}

	// ---- Events ----
	document.addEventListener('DOMContentLoaded', () => {
		// Initialize nav visibility based on current role
		const agentsNavLink = document.getElementById('agentsNavLink');
		const adminNavLink = document.getElementById('adminNavLink');
		
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
		
		// role select
		document.getElementById('roleSelect').addEventListener('change', (e)=>{
			state.role = e.target.value;
			state.page = 1;
			setRoleLabel(state.currentPage);
			
			// Show/hide Agents and Admin nav based on role
			const agentsNavLink = document.getElementById('agentsNavLink');
			const adminNavLink = document.getElementById('adminNavLink');
			
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
			
			if (state.currentPage === 'leads') renderLeads();
			else if (state.currentPage === 'agents') renderAgents();
			else if (state.currentPage === 'listings') renderListings();
			else if (state.currentPage === 'documents') renderDocuments();
			else if (state.currentPage === 'admin') renderAdmin();
		});

		// search
		const leadSearchEl = document.getElementById('leadSearch');
		if (leadSearchEl) {
			leadSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				state.page = 1;
				renderLeads();
			});
		}

		// listing search
		const listingSearchEl = document.getElementById('listingSearch');
		if (listingSearchEl) {
			listingSearchEl.addEventListener('input', (e)=>{
				state.search = e.target.value;
				renderListings();
			});
		}

		// sort by submitted_at
		const sortTh = document.querySelector('th[data-sort="submitted_at"]');
		if (sortTh) {
			sortTh.addEventListener('click', ()=>{
				state.sort.dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
				renderLeads();
			});
		}

		// pagination
		const prevPageEl = document.getElementById('prevPage');
		if (prevPageEl) {
			prevPageEl.addEventListener('click', ()=>{ if (state.page>1){ state.page--; renderLeads(); }});
		}
		const nextPageEl = document.getElementById('nextPage');
		if (nextPageEl) {
			nextPageEl.addEventListener('click', ()=>{ state.page++; renderLeads(); });
		}

		// table delegation
		const leadsTableEl = document.getElementById('leadsTable');
		if (leadsTableEl) {
			leadsTableEl.addEventListener('click', (e)=>{
				const a = e.target.closest('a.lead-name');
				if (a){ e.preventDefault(); openDrawer(a.dataset.id); return; }
				const view = e.target.closest('button[data-view]');
				if (view){ openDrawer(view.dataset.view); return; }
				const matches = e.target.closest('button[data-matches]');
				if (matches){ openMatches(matches.dataset.matches); return; }
			});
		}

		// agents table delegation
		const agentsTableEl = document.getElementById('agentsTable');
		if (agentsTableEl) {
		agentsTableEl.addEventListener('click', (e)=>{
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'agentsTable');
				e.preventDefault();
				return;
			}
			
			const view = e.target.closest('button[data-view-agent]');
			if (view){ openAgentDrawer(view.dataset.viewAgent); return; }
			const remove = e.target.closest('button[data-remove]');
			if (remove){ 
				if (confirm('Are you sure you want to remove this agent?')) {
					toast('Agent removed (mock action)');
					renderAgents();
				}
				return; 
			}
			const edit = e.target.closest('button[data-edit]');
			if (edit){ toast('Edit agent info (mock action)'); return; }
			const assignLeads = e.target.closest('button[data-assign-leads]');
			if (assignLeads){ toast('Assign leads to agent (mock action)'); return; }
		});
		}
		
		// listings table delegation
		const listingsTableEl = document.getElementById('listingsTable');
		if (listingsTableEl) {
			listingsTableEl.addEventListener('click', (e)=>{
				console.log('Listings table clicked, target:', e.target);
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'listingsTable');
					e.preventDefault();
					return;
				}
				
				// Handle interested leads clicks
				const interestedBtn = e.target.closest('.interest-count');
				if (interestedBtn) {
					const propertyId = interestedBtn.dataset.propertyId;
					const propertyName = interestedBtn.dataset.propertyName;
					console.log('Interest button clicked - propertyId:', propertyId, 'propertyName:', propertyName);
					openInterestedLeads(propertyId, propertyName);
					return;
				}
			});
		}

		// documents table delegation
		const documentsTableEl = document.getElementById('documentsTable');
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'documentsTable');
					e.preventDefault();
					return;
				}
			});
		}
		
		// assignment change
		if (leadsTableEl) {
			leadsTableEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){
					const id = sel.dataset.assign;
					await api.assignLead(id, sel.value || null);
					toast('Lead assignment updated');
					renderLeads();
				}
			});
		}

		// drawer close
		const closeDrawerEl = document.getElementById('closeDrawer');
		if (closeDrawerEl) {
			closeDrawerEl.addEventListener('click', closeDrawer);
		}

		// Close drawer on escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				const leadDrawer = document.getElementById('leadDrawer');
				const agentDrawer = document.getElementById('agentDrawer');
				if (leadDrawer && !leadDrawer.classList.contains('hidden')) {
					closeDrawer();
				}
				if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
					closeAgentDrawer();
				}
			}
		});

		// Close drawer when clicking outside
		document.addEventListener('click', (e) => {
			const leadDrawer = document.getElementById('leadDrawer');
			const agentDrawer = document.getElementById('agentDrawer');
			
			// Close lead drawer if clicking outside
			if (leadDrawer && !leadDrawer.classList.contains('hidden')) {
				if (!leadDrawer.contains(e.target) && !e.target.closest('[data-view]')) {
					closeDrawer();
				}
			}
			
			// Close agent drawer if clicking outside
			if (agentDrawer && !agentDrawer.classList.contains('hidden')) {
				if (!agentDrawer.contains(e.target) && !e.target.closest('[data-view-agent]')) {
					closeAgentDrawer();
				}
			}
		});
		const closeAgentDrawerEl = document.getElementById('closeAgentDrawer');
		if (closeAgentDrawerEl) {
			closeAgentDrawerEl.addEventListener('click', closeAgentDrawer);
		}
		// drawer internal assignment
		const leadDrawerEl = document.getElementById('leadDrawer');
		if (leadDrawerEl) {
			leadDrawerEl.addEventListener('change', async (e)=>{
				const sel = e.target.closest('select[data-assign]');
				if (sel){ await api.assignLead(state.selectedLeadId, sel.value || null); toast('Lead assignment updated'); renderLeads(); }
			});
		}

		// matches modal events
		const closeMatchesEl = document.getElementById('closeMatches');
		if (closeMatchesEl) {
			closeMatchesEl.addEventListener('click', closeMatches);
		}
		const listingsGridEl = document.getElementById('listingsGrid');
		if (listingsGridEl) {
			listingsGridEl.addEventListener('change', (e)=>{
				const box = e.target.closest('input[type="checkbox"].listing-check');
				if (box){
					updateSelectionSummary();
				}
			});
		}
		const sendBtnEl = document.getElementById('sendBtn');
		if (sendBtnEl) {
			sendBtnEl.addEventListener('click', async ()=>{
				const selected = Array.from(state.selectedMatches);
				if (selected.length > 0) {
					await openEmailPreview();
				}
			});
		}
		const createShowcaseEl = document.getElementById('createShowcase');
		if (createShowcaseEl) {
			createShowcaseEl.addEventListener('click', openShowcasePreview);
		}

		// showcase modal
		const closeShowcaseEl = document.getElementById('closeShowcase');
		if (closeShowcaseEl) {
			closeShowcaseEl.addEventListener('click', closeShowcase);
		}
		const sendShowcaseEl = document.getElementById('sendShowcase');
		if (sendShowcaseEl) {
			sendShowcaseEl.addEventListener('click', sendShowcase);
		}
		const copyShowcaseLinkEl = document.getElementById('copyShowcaseLink');
		if (copyShowcaseLinkEl) {
			copyShowcaseLinkEl.addEventListener('click', ()=>{
				// just re-open prompt with last created showcase if exists
				const last = Object.values(state.showcases).slice(-1)[0];
				if (!last) return;
				const url = `${location.origin}${location.pathname}#/${last.public_slug}`;
				window.prompt('Copy public link:', url);
			});
		}

		// add agent button
		const addAgentBtnEl = document.getElementById('addAgentBtn');
		if (addAgentBtnEl) {
			addAgentBtnEl.addEventListener('click', ()=>{
				toast('Add new agent (mock action)');
			});
		}

		// Documents page event listeners
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
				// Handle sorting
				const sortableHeader = e.target.closest('th[data-sort]');
				if (sortableHeader) {
					const column = sortableHeader.dataset.sort;
					sortTable(column, 'documentsTable');
					e.preventDefault();
					return;
				}
			});
		}

	// Admin page functions will be moved outside IIFE

	// ---- Events ----

		// Documents search functionality
		const documentsSearch = document.getElementById('documentsSearch');
		const searchType = document.getElementById('searchType');
		const clearDocumentsSearch = document.getElementById('clearDocumentsSearch');

		if (documentsSearch && searchType && clearDocumentsSearch) {
			// Search input event
			documentsSearch.addEventListener('input', (e) => {
				const searchTerm = e.target.value;
				const type = searchType.value;
				renderLeadsTable(searchTerm, type);
			});

			// Search type change event
			searchType.addEventListener('change', (e) => {
				const searchTerm = documentsSearch.value;
				const type = e.target.value;
				renderLeadsTable(searchTerm, type);
			});

			// Clear search event
			clearDocumentsSearch.addEventListener('click', () => {
				documentsSearch.value = '';
				searchType.value = 'both';
				renderLeadsTable('', 'both');
			});
		}

		// Admin page functionality
		const addUserBtn = document.getElementById('addUserBtn');
		const userModal = document.getElementById('userModal');
		const closeUserModal = document.getElementById('closeUserModal');
		const saveUserBtn = document.getElementById('saveUserBtn');
		const cancelUserBtn = document.getElementById('cancelUserBtn');
		const passwordModal = document.getElementById('passwordModal');
		const closePasswordModal = document.getElementById('closePasswordModal');
		const savePasswordBtn = document.getElementById('savePasswordBtn');
		const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
		const auditFilter = document.getElementById('auditFilter');

		// Add User button
		if (addUserBtn) {
			addUserBtn.addEventListener('click', () => {
				document.getElementById('userModalTitle').textContent = 'Add User';
				document.getElementById('userForm').reset();
				document.getElementById('userPassword').required = true;
				document.getElementById('userConfirmPassword').required = true;
				showModal('userModal');
			});
		}

		// User modal close buttons
		if (closeUserModal) {
			closeUserModal.addEventListener('click', () => hideModal('userModal'));
		}
		if (cancelUserBtn) {
			cancelUserBtn.addEventListener('click', () => hideModal('userModal'));
		}

		// Save User button
		if (saveUserBtn) {
			saveUserBtn.addEventListener('click', async () => {
				const form = document.getElementById('userForm');
				const formData = new FormData(form);
				
				const userData = {
					name: document.getElementById('userName').value,
					email: document.getElementById('userEmail').value,
					role: document.getElementById('userRole').value,
					password: document.getElementById('userPassword').value,
					confirmPassword: document.getElementById('userConfirmPassword').value,
					sendInvitation: document.getElementById('sendInvitation').checked
				};

				// Basic validation
				if (!userData.name || !userData.email || !userData.role) {
					toast('Please fill in all required fields', 'error');
					return;
				}

				if (userData.password && userData.password !== userData.confirmPassword) {
					toast('Passwords do not match', 'error');
					return;
				}

				try {
					const userId = document.getElementById('userModal').getAttribute('data-user-id');
					
					// Check if we have real API available
					const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
						? 'http://localhost:3001/api' 
						: null;
					
					if (apiBase) {
						// Use real API
						if (userId) {
							await updateUser(userId, {
								name: userData.name,
								email: userData.email,
								role: userData.role,
								status: userData.sendInvitation ? 'invited' : 'active'
							});
							toast('User updated successfully');
						} else {
							await createUser({
								name: userData.name,
								email: userData.email,
								role: userData.role,
								password: userData.password,
								sendInvitation: userData.sendInvitation
							});
							toast('User created successfully');
						}
						await loadAuditLog();
					} else {
						// Use mock data
						if (userId) {
							// Update mock user
							const userIndex = mockUsers.findIndex(u => u.id === userId);
							if (userIndex !== -1) {
								mockUsers[userIndex] = {
									...mockUsers[userIndex],
									name: userData.name,
									email: userData.email,
									role: userData.role,
									status: userData.sendInvitation ? 'invited' : 'active'
								};
							}
							toast('User updated successfully (mock data)');
						} else {
							// Add new mock user
							const newUser = {
								id: 'user_' + Date.now(),
								name: userData.name,
								email: userData.email,
								role: userData.role,
								status: userData.sendInvitation ? 'invited' : 'active',
								created_at: new Date().toISOString(),
								created_by: 'system'
							};
							mockUsers.unshift(newUser);
							toast('User created successfully (mock data)');
						}
						renderUsersTable();
						renderAuditLog();
					}
					
					hideModal('userModal');
					document.getElementById('userModal').removeAttribute('data-user-id');
					
				} catch (error) {
					console.error('Error saving user:', error);
					toast('Error saving user: ' + error.message, 'error');
				}
			});
		}

		// Password modal close buttons
		if (closePasswordModal) {
			closePasswordModal.addEventListener('click', () => hideModal('passwordModal'));
		}
		if (cancelPasswordBtn) {
			cancelPasswordBtn.addEventListener('click', () => hideModal('passwordModal'));
		}

		// Save Password button
		if (savePasswordBtn) {
			savePasswordBtn.addEventListener('click', async () => {
				const userId = document.getElementById('passwordModal').getAttribute('data-user-id');
				const newPassword = document.getElementById('newPassword').value;
				const confirmPassword = document.getElementById('confirmNewPassword').value;

				if (!newPassword || !confirmPassword) {
					toast('Please fill in both password fields', 'error');
					return;
				}

				if (newPassword !== confirmPassword) {
					toast('Passwords do not match', 'error');
					return;
				}

				try {
					if (realUsers.length > 0) {
						// Use real API
						await changeUserPassword(userId, newPassword);
						toast('Password updated successfully');
					} else {
						// Fallback to mock data
						const user = mockUsers.find(u => u.id === userId);
						if (user) {
							// Add to audit log
							mockAuditLog.unshift({
								id: `audit_${Date.now()}`,
								action: 'password_changed',
								user_id: userId,
								user_name: user.name,
								user_email: user.email,
								performed_by: 'user_1',
								performed_by_name: 'John Smith',
								timestamp: new Date().toISOString(),
								details: 'Password updated'
							});

							renderAuditLog();
							toast('Password updated successfully');
						}
					}
					
					hideModal('passwordModal');
					document.getElementById('newPassword').value = '';
					document.getElementById('confirmNewPassword').value = '';
					
				} catch (error) {
					console.error('Error changing password:', error);
					toast('Error changing password: ' + error.message, 'error');
				}
			});
		}

		// Audit filter
		if (auditFilter) {
			auditFilter.addEventListener('change', (e) => {
				const filter = e.target.value;
				// In a real app, this would filter the audit log
				renderAuditLog(); // For now, just re-render
			});
		}

		// History button
		const historyBtnEl = document.getElementById('historyBtn');
		if (historyBtnEl) {
			historyBtnEl.addEventListener('click', openHistory);
		}

		// History modal close
		const closeHistoryEl = document.getElementById('closeHistory');
		if (closeHistoryEl) {
			closeHistoryEl.addEventListener('click', closeHistory);
		}

		// Document details modal close
		const closeDocumentDetailsEl = document.getElementById('closeDocumentDetails');
		if (closeDocumentDetailsEl) {
			closeDocumentDetailsEl.addEventListener('click', closeDocumentDetails);
		}

		// Email preview modal events
		const closeEmailPreviewEl = document.getElementById('closeEmailPreview');
		if (closeEmailPreviewEl) {
			closeEmailPreviewEl.addEventListener('click', closeEmailPreview);
		}
		const sendEmailBtnEl = document.getElementById('sendEmailBtn');
		if (sendEmailBtnEl) {
			sendEmailBtnEl.addEventListener('click', async ()=>{
				const selected = Array.from(state.selectedMatches);
				if (selected.length > 0) {
					await sendShowcaseEmail();
				}
			});
		}
		
		const previewLandingBtnEl = document.getElementById('previewLandingBtn');
		if (previewLandingBtnEl) {
			previewLandingBtnEl.addEventListener('click', previewLandingPage);
		}

		// Interested leads modal events
		const closeInterestedLeadsEl = document.getElementById('closeInterestedLeads');
		if (closeInterestedLeadsEl) {
			closeInterestedLeadsEl.addEventListener('click', closeInterestedLeads);
		}

		// Close interested leads modal when clicking outside
		document.addEventListener('click', (e) => {
			const modal = document.getElementById('interestedLeadsModal');
			if (modal && !modal.classList.contains('hidden') && e.target === modal) {
				closeInterestedLeads();
			}
		});

		// History content delegation
		const historyContentEl = document.getElementById('historyContent');
		if (historyContentEl) {
			historyContentEl.addEventListener('click', (e)=>{
				const historyLeadBtn = e.target.closest('button[data-history-lead]');
				if (historyLeadBtn) {
					const closedLeadId = historyLeadBtn.dataset.historyLead;
					openHistoryDocumentDetails(closedLeadId);
					closeHistory();
				}
			});
		}

		// Document details modal delegation
		const documentStepsEl = document.getElementById('documentSteps');
		if (documentStepsEl) {
			documentStepsEl.addEventListener('click', (e)=>{
				const downloadBtn = e.target.closest('.attachment-download');
				if (downloadBtn) {
					const fileName = downloadBtn.dataset.file;
					toast(`Downloading ${fileName} (mock action)`);
				}
			});
		}

		// Filter event listeners
		const searchInputEl = document.getElementById('searchInput');
		if (searchInputEl) {
			searchInputEl.addEventListener('input', (e) => {
				state.filters.search = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const statusFilterEl = document.getElementById('statusFilter');
		if (statusFilterEl) {
			statusFilterEl.addEventListener('change', (e) => {
				state.filters.status = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const fromDateEl = document.getElementById('fromDate');
		if (fromDateEl) {
			fromDateEl.addEventListener('change', (e) => {
				state.filters.fromDate = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const toDateEl = document.getElementById('toDate');
		if (toDateEl) {
			toDateEl.addEventListener('change', (e) => {
				state.filters.toDate = e.target.value;
				state.page = 1; // Reset to first page
				renderLeads();
			});
		}

		const clearFiltersEl = document.getElementById('clearFilters');
		if (clearFiltersEl) {
			clearFiltersEl.addEventListener('click', () => {
				state.filters = { search: '', status: 'all', fromDate: '', toDate: '' };
				state.page = 1;
				if (searchInputEl) searchInputEl.value = '';
				if (statusFilterEl) statusFilterEl.value = 'all';
				if (fromDateEl) fromDateEl.value = '';
				if (toDateEl) toDateEl.value = '';
				renderLeads();
			});
		}

		// Listings Filter event listeners
		const listingsSearchInputEl = document.getElementById('listingsSearchInput');
		if (listingsSearchInputEl) {
			listingsSearchInputEl.addEventListener('input', (e) => {
				state.listingsFilters.search = e.target.value;
				renderListings();
			});
		}

		const marketFilterEl = document.getElementById('marketFilter');
		if (marketFilterEl) {
			marketFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.market = e.target.value;
				renderListings();
			});
		}

		const minPriceEl = document.getElementById('minPrice');
		if (minPriceEl) {
			minPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.minPrice = e.target.value;
				renderListings();
			});
		}

		const maxPriceEl = document.getElementById('maxPrice');
		if (maxPriceEl) {
			maxPriceEl.addEventListener('input', (e) => {
				state.listingsFilters.maxPrice = e.target.value;
				renderListings();
			});
		}

		const bedsFilterEl = document.getElementById('bedsFilter');
		if (bedsFilterEl) {
			bedsFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.beds = e.target.value;
				renderListings();
			});
		}

		const commissionFilterEl = document.getElementById('commissionFilter');
		if (commissionFilterEl) {
			commissionFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.commission = e.target.value;
				renderListings();
			});
		}

		const amenitiesFilterEl = document.getElementById('amenitiesFilter');
		if (amenitiesFilterEl) {
			amenitiesFilterEl.addEventListener('change', (e) => {
				state.listingsFilters.amenities = e.target.value;
				renderListings();
			});
		}

		const clearListingsFiltersEl = document.getElementById('clearListingsFilters');
		if (clearListingsFiltersEl) {
			clearListingsFiltersEl.addEventListener('click', () => {
				state.listingsFilters = { 
					search: '', 
					market: 'all', 
					minPrice: '', 
					maxPrice: '', 
					beds: 'any', 
					commission: '0', 
					amenities: 'any' 
				};
				if (listingsSearchInputEl) listingsSearchInputEl.value = '';
				if (marketFilterEl) marketFilterEl.value = 'all';
				if (minPriceEl) minPriceEl.value = '';
				if (maxPriceEl) maxPriceEl.value = '';
				if (bedsFilterEl) bedsFilterEl.value = 'any';
				if (commissionFilterEl) commissionFilterEl.value = '0';
				if (amenitiesFilterEl) amenitiesFilterEl.value = 'any';
				renderListings();
			});
		}

		// Initialize popover elements
		initPopover();

		// Health status hover events - using event delegation on the table
		const leadsTable = document.getElementById('leadsTable');
		console.log('Leads table found:', !!leadsTable); // Debug
		
		leadsTable.addEventListener('mouseenter', (e)=>{
			console.log('Mouse enter event:', e.target); // Debug
			const btn = e.target.closest('.health-btn');
			console.log('Health button found:', !!btn, btn?.dataset.status); // Debug
			if (!btn) return;
			showPopover(btn, btn.dataset.status);
		}, true);

		leadsTable.addEventListener('mouseleave', (e)=>{
			if (e.target.closest && e.target.closest('.health-btn')) {
				setTimeout(() => {
					if (pop && !pop.matches(':hover')) hidePopover();
				}, 150);
			}
		}, true);

		leadsTable.addEventListener('click', (e)=>{
			console.log('Click event:', e.target); // Debug
			
			// Handle sorting
			const sortableHeader = e.target.closest('th[data-sort]');
			if (sortableHeader) {
				const column = sortableHeader.dataset.sort;
				sortTable(column, 'leadsTable');
				e.preventDefault();
				return;
			}
			
			const btn = e.target.closest('.health-btn');
			console.log('Health button clicked:', !!btn, btn?.dataset.status); // Debug
			if (btn) {
				const open = pop && pop.style.display === 'block';
				if (open) hidePopover();
				else showPopover(btn, btn.dataset.status);
				e.stopPropagation();
			}
		});

		// Hide popover on click outside or escape
		document.addEventListener('click', (e)=>{
			if (!e.target.closest('#healthPopover') && !e.target.closest('.health-btn')) {
				hidePopover();
			}
		});

		document.addEventListener('keydown', (e)=>{
			if (e.key === 'Escape') {
				hidePopover();
			}
		});

		window.addEventListener('resize', hidePopover);
		window.addEventListener('scroll', ()=>{
			if (pop.style.display === 'block') hidePopover();
		}, true);

	// Test function for debugging
	window.testPopover = function() {
		console.log('Testing popover...');
		const testBtn = document.createElement('button');
		testBtn.className = 'health-btn';
		testBtn.dataset.status = 'green';
		testBtn.style.position = 'fixed';
		testBtn.style.top = '100px';
		testBtn.style.left = '100px';
		testBtn.style.zIndex = '9999';
		testBtn.innerHTML = '<span class="health-dot health-green"></span>';
		document.body.appendChild(testBtn);
		
		setTimeout(() => {
			showPopover(testBtn, 'green');
		}, 100);
	};

		// initial route
		if (!location.hash) location.hash = '/leads';
		route();
		window.addEventListener('hashchange', route);
	});

	// Global functions for admin page onclick handlers
	window.editUser = editUser;
	window.changePassword = changePassword;
	window.deleteUser = deleteUser;
})();

// Admin page functions - defined in global scope
let realUsers = [];
let realAuditLog = [];

// API functions for real data
async function loadUsers() {
	// Check if we're running locally or on production
	const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
		? 'http://localhost:3001/api' 
		: null;
		
	if (!apiBase) {
		console.log('API_BASE not available, using mock data');
		realUsers = [];
		renderUsersTable();
		return;
	}
	
	try {
		const response = await fetch(`${apiBase}/users`);
		if (!response.ok) throw new Error('Failed to fetch users');
		realUsers = await response.json();
		console.log('Loaded users from API:', realUsers.length);
		renderUsersTable();
	} catch (error) {
		console.error('Error loading users:', error);
		throw error;
	}
}

async function loadAuditLog() {
	// Check if we're running locally or on production
	const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
		? 'http://localhost:3001/api' 
		: null;
		
	if (!apiBase) {
		console.log('API_BASE not available, using mock data');
		realAuditLog = [];
		renderAuditLog();
		return;
	}
	
	try {
		const response = await fetch(`${apiBase}/audit-log`);
		if (!response.ok) throw new Error('Failed to fetch audit log');
		realAuditLog = await response.json();
		console.log('Loaded audit log from API:', realAuditLog.length);
		renderAuditLog();
	} catch (error) {
		console.error('Error loading audit log:', error);
		throw error;
	}
}

async function createUser(userData) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
			? 'http://localhost:3001/api' 
			: null;
		if (!apiBase) throw new Error('API not available in production');
		
		const response = await fetch(`${apiBase}/users`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...userData,
				createdBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to create user');
		const newUser = await response.json();
		realUsers.unshift(newUser);
		renderUsersTable();
		return newUser;
	} catch (error) {
		console.error('Error creating user:', error);
		throw error;
	}
}

async function updateUser(userId, userData) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
			? 'http://localhost:3001/api' 
			: null;
		if (!apiBase) throw new Error('API not available in production');
		
		const response = await fetch(`${apiBase}/users/${userId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...userData,
				updatedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to update user');
		const updatedUser = await response.json();
		const index = realUsers.findIndex(u => u.id === userId);
		if (index !== -1) realUsers[index] = updatedUser;
		renderUsersTable();
		return updatedUser;
	} catch (error) {
		console.error('Error updating user:', error);
		throw error;
	}
}

async function deleteUserFromAPI(userId) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
			? 'http://localhost:3001/api' 
			: null;
		if (!apiBase) throw new Error('API not available in production');
		
		const response = await fetch(`${apiBase}/users/${userId}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				deletedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to delete user');
		realUsers = realUsers.filter(u => u.id !== userId);
		renderUsersTable();
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error deleting user:', error);
		throw error;
	}
}

async function changeUserPassword(userId, newPassword) {
	try {
		const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
			? 'http://localhost:3001/api' 
			: null;
		if (!apiBase) throw new Error('API not available in production');
		
		const response = await fetch(`${apiBase}/users/${userId}/password`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				newPassword,
				updatedBy: 'system' // In production, get from auth token
			})
		});
		if (!response.ok) throw new Error('Failed to change password');
		await loadAuditLog(); // Refresh audit log
	} catch (error) {
		console.error('Error changing password:', error);
		throw error;
	}
}

async function renderAdmin() {
	const currentRole = window.state?.role || 'manager';
	const adminRoleLabel = document.getElementById('adminRoleLabel');
	
	if (adminRoleLabel) {
		adminRoleLabel.textContent = `Role: ${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}`;
	}
	
	// Load real data from API
	try {
		await loadUsers();
		await loadAuditLog();
	} catch (error) {
		console.error('Error loading admin data:', error);
		// Fallback to mock data for demo
		renderUsersTable();
		renderAuditLog();
	}
}

function renderUsersTable() {
	console.log('renderUsersTable called, realUsers:', realUsers?.length || 0);
	const tbody = document.getElementById('usersTbody');
	if (!tbody) {
		console.log('usersTbody not found');
		return;
	}
	
	const users = realUsers.length > 0 ? realUsers : mockUsers || [];
	tbody.innerHTML = users.map(user => {
		const createdBy = user.created_by === 'system' ? 'System' : 
			users.find(u => u.id === user.created_by)?.name || 'Unknown';
		
		return `
			<tr>
				<td data-sort="${user.name}">${user.name}</td>
				<td data-sort="${user.email}">${user.email}</td>
				<td data-sort="${user.role}">
					<span class="role-badge role-${user.role}">${user.role.replace('_', ' ')}</span>
				</td>
				<td data-sort="${user.status}">
					<span class="user-status ${user.status}">${user.status}</span>
				</td>
				<td data-sort="${user.created_at}">${formatDate(user.created_at)}</td>
				<td>
					<div class="user-actions">
						<button class="btn btn-secondary btn-small" onclick="editUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
							</svg>
							Edit
						</button>
						<button class="btn btn-secondary btn-small" onclick="changePassword('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
							</svg>
							Password
						</button>
						<button class="btn btn-danger btn-small" onclick="deleteUser('${user.id}')">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
								<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
							</svg>
							Delete
						</button>
					</div>
				</td>
			</tr>
		`;
	}).join('');
}

function renderAuditLog() {
	const auditLog = document.getElementById('auditLog');
	if (!auditLog) return;
	
	const logs = realAuditLog.length > 0 ? realAuditLog : mockAuditLog || [];
	auditLog.innerHTML = logs.map(entry => {
		const actionIcons = {
			user_created: '👤',
			user_updated: '✏️',
			user_deleted: '🗑️',
			role_changed: '🔄',
			password_changed: '🔐'
		};
		
		return `
			<div class="audit-entry">
				<div class="audit-icon ${entry.action}">
					${actionIcons[entry.action] || '📝'}
				</div>
				<div class="audit-content">
					<div class="audit-action">${entry.details}</div>
					<div class="audit-details">
						User: ${entry.user_name} (${entry.user_email}) | 
						By: ${entry.performed_by_name}
					</div>
				</div>
				<div class="audit-timestamp">${formatDate(entry.timestamp)}</div>
			</div>
		`;
	}).join('');
}

function editUser(userId) {
	console.log('editUser called with:', userId);
	const users = realUsers.length > 0 ? realUsers : mockUsers || [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found:', userId);
		return;
	}
	
	document.getElementById('userModalTitle').textContent = 'Edit User';
	document.getElementById('userName').value = user.name;
	document.getElementById('userEmail').value = user.email;
	document.getElementById('userRole').value = user.role.toLowerCase();
	document.getElementById('userPassword').value = '';
	document.getElementById('userConfirmPassword').value = '';
	document.getElementById('userPassword').required = false;
	document.getElementById('userConfirmPassword').required = false;
	
	// Store user ID for update
	document.getElementById('userModal').setAttribute('data-user-id', userId);
	
	showModal('userModal');
}

function changePassword(userId) {
	console.log('changePassword called with:', userId);
	const users = realUsers.length > 0 ? realUsers : mockUsers || [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for password change:', userId);
		return;
	}
	
	document.getElementById('passwordModal').setAttribute('data-user-id', userId);
	showModal('passwordModal');
}

async function deleteUser(userId) {
	console.log('deleteUser called with:', userId);
	const users = realUsers.length > 0 ? realUsers : mockUsers || [];
	const user = users.find(u => u.id === userId);
	if (!user) {
		console.log('User not found for deletion:', userId);
		return;
	}
	
	if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
		try {
			if (realUsers.length > 0) {
				// Use real API
				await deleteUserFromAPI(userId);
				toast('User deleted successfully');
			} else {
				// Fallback to mock data
				const userIndex = users.findIndex(u => u.id === userId);
				if (userIndex > -1) {
					users.splice(userIndex, 1);
					
					// Add to audit log
					const auditLogs = mockAuditLog || [];
					auditLogs.unshift({
						id: `audit_${Date.now()}`,
						action: 'user_deleted',
						user_id: userId,
						user_name: user.name,
						user_email: user.email,
						performed_by: 'user_1', // Current user
						performed_by_name: 'John Smith', // Current user name
						timestamp: new Date().toISOString(),
						details: `User ${user.name} deleted`
					});
					
					renderUsersTable();
					renderAuditLog();
					toast('User deleted successfully');
				}
			}
		} catch (error) {
			console.error('Error deleting user:', error);
			toast('Error deleting user', 'error');
		}
	}
}

// Make functions globally accessible
window.renderAdmin = renderAdmin;
window.renderUsersTable = renderUsersTable;
window.renderAuditLog = renderAuditLog;

// formatDate is already globally accessible
