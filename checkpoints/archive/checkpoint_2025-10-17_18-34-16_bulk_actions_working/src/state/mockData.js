/**
 * Mock Data for Development
 * TEMPORARY: This file will be removed in Phase 2B when switching to Supabase
 * 
 * Contains all mock data arrays used for development/testing
 */

/**
 * Helper function to generate random date
 * @param {number} daysBack - Number of days back from today
 * @returns {string} ISO date string
 */
function randomDate(daysBack = 30) {
	const now = Date.now();
	const past = now - Math.floor(Math.random() * daysBack) * 24 * 3600 * 1000;
	return new Date(past).toISOString();
}

/**
 * Helper function to create preferences summary
 * @param {Object} p - Preferences object
 * @returns {string} Summary string
 */
export function prefsSummary(p) {
	if (!p) return '';
	const price = p.budget_max ? `<$${p.budget_max}/mo` : (p.budget ? `$${p.budget}/mo` : '');
	return `${p.beds || '?'}bed/${p.baths || '?'}bath ${price}`;
}

// ============================================================================
// AGENTS
// ============================================================================

export const mockAgents = [
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

// ============================================================================
// LEADS
// ============================================================================

export const mockLeads = Array.from({ length: 37 }).map((_, i) => {
	const id = `lead_${i+1}`;
	const assigned = i % 2 === 0 ? 'agent_1' : (i % 3 === 0 ? 'agent_2' : null);
	const foundBy = i % 4 === 0 ? 'agent_2' : 'agent_3';
	const submittedAt = randomDate(45);
	const submittedDate = new Date(submittedAt);
	
	// Generate realistic health tracking data
	const showcaseSent = i % 3 !== 0; // 2/3 of leads have showcase sent
	const showcaseResponse = i % 4 !== 0; // 3/4 of those respond
	const leaseSent = i % 5 === 0; // 1/5 have lease sent
	const leaseSigned = i % 10 === 0; // 1/10 have lease signed
	
	return {
		id,
		name: `Lead ${i+1}`,
		email: `lead${i+1}@example.com`,
		phone: `555-000-${String(1000 + i)}`,
		submitted_at: submittedAt,
		found_by_agent_id: foundBy,
		assigned_agent_id: assigned,
		health_status: 'green', // Will be calculated dynamically
		health_score: 100,
		health_updated_at: new Date().toISOString(),
		
		// Health tracking timestamps
		showcase_sent_at: showcaseSent ? new Date(submittedDate.getTime() + (i % 3) * 24 * 60 * 60 * 1000).toISOString() : null,
		showcase_response_at: showcaseResponse && showcaseSent ? new Date(submittedDate.getTime() + (i % 2 + 1) * 24 * 60 * 60 * 1000).toISOString() : null,
		last_activity_at: new Date(submittedDate.getTime() + (i % 7) * 24 * 60 * 60 * 1000).toISOString(),
		last_contact_at: new Date(submittedDate.getTime() + (i % 5) * 24 * 60 * 60 * 1000).toISOString(),
		lease_sent_at: leaseSent ? new Date(submittedDate.getTime() + (i % 10 + 5) * 24 * 60 * 60 * 1000).toISOString() : null,
		lease_signed_at: leaseSigned ? new Date(submittedDate.getTime() + (i % 15 + 10) * 24 * 60 * 60 * 1000).toISOString() : null,
		tour_scheduled_at: i % 6 === 0 ? new Date(submittedDate.getTime() + (i % 4 + 2) * 24 * 60 * 60 * 1000).toISOString() : null,
		tour_completed_at: i % 8 === 0 ? new Date(submittedDate.getTime() + (i % 6 + 3) * 24 * 60 * 60 * 1000).toISOString() : null,
		
		// Events array for tracking interactions
		events: [],
		
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

// ============================================================================
// DOCUMENTS
// ============================================================================

export const mockDocumentSteps = [
	{ id: 1, name: 'Lease Agreement Sent', status: 'pending', attachments: [] },
	{ id: 2, name: 'Signed By Lead', status: 'pending', attachments: [] },
	{ id: 3, name: 'Signed By Property Owner', status: 'pending', attachments: [] },
	{ id: 4, name: 'Finalized by Agent', status: 'pending', attachments: [] },
	{ id: 5, name: 'Payment Step', status: 'pending', attachments: [] }
];

export const mockDocumentStatuses = {
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

export const mockClosedLeads = [
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

// ============================================================================
// PROPERTIES & INTERESTED LEADS
// ============================================================================

export const mockInterestedLeads = {
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

export const mockProperties = Array.from({ length: 50 }).map((_, i) => {
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
		lat, lng,
		isPUMI: i % 7 === 0, // Mark every 7th property as PUMI for demo
		markForReview: i % 11 === 0 // Mark every 11th property for review for demo
	};
});

// ============================================================================
// SPECIALS
// ============================================================================

export const mockSpecials = [
	{
		id: 'special_1',
		property_name: 'The Howard',
		current_special: 'First month free + $500 off security deposit',
		commission_rate: '8%',
		expiration_date: '2024-02-15',
		agent_id: 'agent_1',
		agent_name: 'Alex Agent',
		created_at: '2024-01-10T09:00:00Z'
	},
	{
		id: 'special_2',
		property_name: 'Waterford Park',
		current_special: 'Move-in special: $200 off first month rent',
		commission_rate: '6%',
		expiration_date: '2024-02-28',
		agent_id: 'agent_2',
		agent_name: 'Bailey Broker',
		created_at: '2024-01-12T14:30:00Z'
	},
	{
		id: 'special_3',
		property_name: 'Community 1',
		current_special: 'Limited time: Waived application fee + $300 credit',
		commission_rate: '7%',
		expiration_date: '2024-01-31',
		agent_id: 'agent_1',
		agent_name: 'Alex Agent',
		created_at: '2024-01-08T11:15:00Z'
	},
	{
		id: 'special_4',
		property_name: 'The Heights',
		current_special: 'New Year special: 2 months free parking + gym membership',
		commission_rate: '5%',
		expiration_date: '2024-03-01',
		agent_id: 'agent_3',
		agent_name: 'Chris Consultant',
		created_at: '2024-01-05T16:45:00Z'
	}
];

// ============================================================================
// BUGS
// ============================================================================

export const mockBugs = [
	{
		id: 'bug_1',
		title: 'Table sorting not working on Listings page',
		description: 'When I click on column headers in the Listings table, the rows don\'t reorder properly.',
		expected: 'Rows should sort by the selected column (ascending/descending)',
		steps: '1. Go to Listings page\n2. Click on "Rent Range" column header\n3. Notice rows don\'t sort',
		status: 'pending',
		priority: 'high',
		category: 'functionality',
		page: 'listings',
		page_url: '#/listings',
		reported_by: 'Sarah Johnson',
		reported_by_id: 'agent_1',
		created_at: '2024-01-25T10:30:00Z',
		updated_at: '2024-01-25T10:30:00Z',
		assigned_to: null,
		resolution_notes: null,
		technical_context: {
			browser: 'Chrome 120.0.6099.109',
			user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			screen_resolution: '1920x1080',
			viewport: '1920x937',
			role: 'manager',
			agent_id: 'agent_1'
		}
	},
	{
		id: 'bug_2',
		title: 'Mobile navigation cuts off on small screens',
		description: 'On mobile devices, the right side of the navigation bar gets cut off and I can\'t see "Admin" or the role dropdown.',
		expected: 'All navigation items should be visible and accessible on mobile',
		steps: '1. Open app on mobile device\n2. Look at navigation bar\n3. Notice "Admin" and role dropdown are cut off',
		status: 'resolved',
		priority: 'medium',
		category: 'ui',
		page: 'global',
		page_url: 'all pages',
		reported_by: 'Mike Chen',
		reported_by_id: 'agent_2',
		created_at: '2024-01-24T15:45:00Z',
		updated_at: '2024-01-25T09:15:00Z',
		assigned_to: 'Developer',
		resolution_notes: 'Added horizontal scroll to navigation on mobile devices',
		technical_context: {
			browser: 'Safari Mobile 17.2',
			user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
			screen_resolution: '375x812',
			viewport: '375x667',
			role: 'agent',
			agent_id: 'agent_2'
		}
	},
	{
		id: 'bug_3',
		title: 'Test bug with screenshot attachment',
		description: 'This is a test bug report to demonstrate the screenshot functionality.',
		expected: 'Screenshot should display properly in the bug details view',
		steps: '1. Submit a bug report with screenshot\n2. View bug details\n3. Screenshot should be visible',
		status: 'pending',
		priority: 'low',
		category: 'ui',
		page: 'bugs',
		page_url: '#/bugs',
		reported_by: 'Test User',
		reported_by_id: 'agent_3',
		created_at: '2024-01-23T12:00:00Z',
		updated_at: '2024-01-23T12:00:00Z',
		assigned_to: null,
		resolution_notes: null,
		technical_context: {
			browser: 'Chrome 120.0',
			user_agent: 'Mozilla/5.0',
			screen_resolution: '1920x1080',
			viewport: '1920x937',
			role: 'agent',
			agent_id: 'agent_3'
		}
	}
];

