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
	function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; show(t); setTimeout(()=> hide(t), 2000); }
	function formatDate(iso){ try { return new Date(iso).toLocaleString(); } catch { return iso; } }

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
	const API_BASE = 'http://localhost:3001/api';

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
				<td>${renderHealthStatus(lead.health_status)}</td>
				<td class="mono">${formatDate(lead.submitted_at)}</td>
				<td class="mono">
					<span class="badge-dot"><span class="dot"></span>${prefsSummary(lead.prefs)}</span>
				</td>
				<td><button class="icon-btn" data-matches="${lead.id}" title="Top Options">📋</button></td>
				<td>
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

	// ---- Rendering: Documents Table ----
	async function renderDocuments(){
		const tbody = document.getElementById('documentsTbody');
		tbody.innerHTML = '';
		
		// Group leads by agent
		const agentLeads = {};
		mockLeads.forEach(lead => {
			if (lead.assigned_agent_id && mockDocumentStatuses[lead.id]) {
				if (!agentLeads[lead.assigned_agent_id]) {
					agentLeads[lead.assigned_agent_id] = [];
				}
				agentLeads[lead.assigned_agent_id].push(lead);
			}
		});

		// Render each agent with their leads
		Object.keys(agentLeads).forEach(agentId => {
			const agent = mockAgents.find(a => a.id === agentId);
			const leads = agentLeads[agentId];
			
			if (!agent) return;

			const tr = document.createElement('tr');
			tr.className = 'agent-row';
			tr.innerHTML = `
				<td>
					<div class="agent-info">
						<div class="agent-name">${agent.name}</div>
						<div class="agent-details">${agent.email} · ${agent.phone}</div>
					</div>
				</td>
				<td>
					<div class="leads-dropdown">
						<button class="dropdown-toggle" data-agent="${agentId}">
							${leads.length} Active Lead${leads.length !== 1 ? 's' : ''}
							<span class="dropdown-arrow">▼</span>
						</button>
						<div class="dropdown-content hidden" id="dropdown-${agentId}">
							${leads.map(lead => `
								<div class="lead-item" data-lead="${lead.id}">
									<div class="lead-name">${lead.name}</div>
									${renderLeadDocumentSummary(lead.id)}
									<button class="view-details-btn" data-lead="${lead.id}">View Details</button>
								</div>
							`).join('')}
						</div>
					</div>
				</td>
				<td>
					<div class="overall-status">
						${leads.length > 0 ? renderLeadDocumentSummary(leads[0].id) : 'No active leads'}
					</div>
				</td>
				<td>
					<button class="btn btn-secondary" data-agent="${agentId}">View All</button>
				</td>
			`;
			tbody.appendChild(tr);
		});
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
		map = L.map('listingsMap', { zoomControl: true }).setView([29.48, -98.50], 10);
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
			maxZoom: 19, 
			attribution: '&copy; OpenStreetMap' 
		}).addTo(map);
	}

	function clearMarkers() {
		markers.forEach(m => m.remove());
		markers = [];
	}

	function addMarker(prop) {
		const isSelected = selectedProperty && selectedProperty.id === prop.id;
		const icon = L.divIcon({ 
			html: `<div class="price-marker ${isSelected ? 'selected' : ''}">$${prop.rent_min.toLocaleString()}</div>`, 
			className: '', 
			iconSize: [0, 0] 
		});
		const marker = L.marker([prop.lat, prop.lng], { icon }).addTo(map);
		marker.property = prop; // Store property reference
		marker.bindPopup(`
			<strong>${prop.name}</strong><br>
			${prop.address}<br>
			<span class="subtle">$${prop.rent_min.toLocaleString()} - $${prop.rent_max.toLocaleString()} · ${prop.beds_min}-${prop.beds_max} bd / ${prop.baths_min}-${prop.baths_max} ba</span>
		`);
		
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
		filtered.forEach(async (prop) => {
			const tr = document.createElement('tr');
			tr.dataset.propertyId = prop.id;
			
			// Get interested leads count for this property
			const interestedCount = await getInterestedLeadsCount(prop.id);
			
			tr.innerHTML = `
				<td>
					<div class="lead-name">${prop.name}</div>
					<div class="subtle mono">${prop.address}</div>
				</td>
				<td class="mono">${prop.market}</td>
				<td class="mono">${prop.neighborhoods.join(', ')}</td>
				<td class="mono">$${prop.rent_min} - $${prop.rent_max}</td>
				<td class="mono">${prop.beds_min}-${prop.beds_max} / ${prop.baths_min}-${prop.baths_max}</td>
				<td class="mono">${Math.max(prop.escort_pct, prop.send_pct)}%</td>
				<td class="mono">
					<div class="interest-count" onclick="openInterestedLeads('${prop.id}', '${prop.name}')">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
						</svg>
						${interestedCount} interested
					</div>
				</td>
				<td class="mono">${formatDate(prop.pricing_last_updated)}</td>
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

	// ---- Interested Leads Modal ----
	async function openInterestedLeads(propertyId, propertyName) {
		document.getElementById('propertyName').textContent = propertyName;
		
		try {
			const interests = await api.getInterestedLeads(propertyId);
			renderInterestedLeads(interests);
			show(document.getElementById('interestedLeadsModal'));
		} catch (error) {
			console.error('Error loading interested leads:', error);
			toast('Error loading interested leads');
		}
	}

	function closeInterestedLeads() {
		hide(document.getElementById('interestedLeadsModal'));
	}

	function renderInterestedLeads(interests) {
		const content = document.getElementById('interestedLeadsContent');
		
		if (interests.length === 0) {
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

		content.innerHTML = interests.map(interest => `
			<div class="interested-lead-item">
				<div class="interest-icon">
					${interest.lead.name.charAt(0).toUpperCase()}
				</div>
				<div class="lead-info">
					<div class="lead-name">${interest.lead.name}</div>
					<div class="lead-contact">${interest.lead.email} • ${interest.lead.phone}</div>
					<div class="lead-agent">via ${interest.agent.name}</div>
				</div>
				<div class="interest-details">
					<div class="interest-date">${formatDate(interest.created_at)}</div>
					<div class="interest-status ${interest.status}">${interest.status.replace('_', ' ')}</div>
				</div>
			</div>
		`).join('');
	}

	// Global function for onclick
	window.openInterestedLeads = openInterestedLeads;

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
			renderDocuments();
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
		// role select
		document.getElementById('roleSelect').addEventListener('change', (e)=>{
			state.role = e.target.value;
			state.page = 1;
			setRoleLabel(state.currentPage);
			if (state.currentPage === 'leads') renderLeads();
			else if (state.currentPage === 'agents') renderAgents();
			else if (state.currentPage === 'listings') renderListings();
			else if (state.currentPage === 'documents') renderDocuments();
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
		const documentsTableEl = document.getElementById('documentsTable');
		if (documentsTableEl) {
			documentsTableEl.addEventListener('click', (e)=>{
				// Dropdown toggle
				const dropdownToggle = e.target.closest('.dropdown-toggle');
				if (dropdownToggle) {
					const agentId = dropdownToggle.dataset.agent;
					const dropdown = document.getElementById(`dropdown-${agentId}`);
					if (dropdown) {
						dropdown.classList.toggle('hidden');
						const arrow = dropdownToggle.querySelector('.dropdown-arrow');
						arrow.textContent = dropdown.classList.contains('hidden') ? '▼' : '▲';
					}
					return;
				}

				// View details button
				const viewDetailsBtn = e.target.closest('.view-details-btn');
				if (viewDetailsBtn) {
					const leadId = viewDetailsBtn.dataset.lead;
					openDocumentDetails(leadId);
					return;
				}

				// View all button
				const viewAllBtn = e.target.closest('button[data-agent]');
				if (viewAllBtn && !viewAllBtn.classList.contains('dropdown-toggle')) {
					const agentId = viewAllBtn.dataset.agent;
					toast(`Viewing all documents for agent ${agentId} (mock action)`);
					return;
				}
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

		// Interested leads modal events
		const closeInterestedLeadsEl = document.getElementById('closeInterestedLeads');
		if (closeInterestedLeadsEl) {
			closeInterestedLeadsEl.addEventListener('click', closeInterestedLeads);
		}

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
})();
