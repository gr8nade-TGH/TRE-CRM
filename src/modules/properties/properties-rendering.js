// Properties Rendering Functions - EXACT COPY from script.js lines 2340-2488

export async function renderProperties(options) {
	const { renderPropertyContacts, renderSpecials } = options;
	
	console.log('renderProperties called');
	await renderPropertyContacts();
	await renderSpecials();
}

export async function renderPropertyContacts(options) {
	const { state, SupabaseAPI, populatePropertyDropdown, toast } = options;
	
	console.log('renderPropertyContacts called');
	const tbody = document.getElementById('contactsTbody');
	if (!tbody) return;

	try {
		// Fetch all properties with contact info
		const properties = await SupabaseAPI.getProperties({
			search: '',
			market: 'all'
		});

		console.log('Properties for contacts:', properties);
		tbody.innerHTML = '';

		// Check if properties is an array
		if (!Array.isArray(properties)) {
			console.error('Properties is not an array:', properties);
			toast('Error loading property contacts. Please try again.');
			return;
		}

		// Filter out invalid properties (must have address and valid name)
		// Only exclude obvious test entries like "act4", "activity event test", "test 1", etc.
		// Don't exclude legitimate property names that happen to contain "test" like "TestAfter Mod"
		const validProperties = properties.filter(prop => {
			const name = prop.community_name || prop.name;
			const hasAddress = prop.address && prop.address.trim() !== '';

			// Check if name is obviously a test entry
			// Pattern matches: act4, act123, activity event test, test 1, test123, etc.
			const isTestEntry = name && /^(act\d+|.*activity.*test.*|test\s*\d*)$/i.test(name.trim());

			const hasValidName = name && name.trim() !== '' && !isTestEntry;
			return hasAddress && hasValidName;
		});

		// Group by community_name (only show unique communities)
		const communities = new Map();
		validProperties.forEach(prop => {
			const communityName = prop.community_name || prop.name;
			if (!communities.has(communityName)) {
				communities.set(communityName, prop);
			}
		});

		// Render each community
		communities.forEach((property, communityName) => {
			const tr = document.createElement('tr');
			const hasContact = property.contact_email || property.contact_phone || property.contact_name;

			tr.innerHTML = `
				<td data-sort="community_name">
					<div class="property-name">${communityName}</div>
					${!hasContact ? '<div class="no-contact-badge">No contact info</div>' : ''}
				</td>
				<td>${property.address || '<span class="text-muted">—</span>'}</td>
				<td>${property.contact_name || '<span class="text-muted">—</span>'}</td>
				<td>${property.contact_email || '<span class="text-muted">—</span>'}</td>
				<td>${property.contact_phone || '<span class="text-muted">—</span>'}</td>
				<td>${property.office_hours || '<span class="text-muted">—</span>'}</td>
				<td>
					<div class="action-buttons">
						<button class="icon-btn edit-contact" data-property="${property.id}" data-community="${communityName}" title="Edit Contact Info">✏️</button>
					</div>
				</td>
			`;

			tbody.appendChild(tr);
		});

		// Populate property dropdown in modal
		populatePropertyDropdown(Array.from(communities.keys()));
	} catch (error) {
		console.error('Error loading property contacts:', error);
		toast('Error loading property contacts. Please try again.');
	}
}

/**
 * Populate the property dropdown in the Add Special modal
 */
export async function populateSpecialPropertyDropdown(SupabaseAPI) {
	const select = document.getElementById('specialPropertyName');
	if (!select) return;

	try {
		// Fetch all properties
		const properties = await SupabaseAPI.getProperties({
			search: '',
			market: 'all'
		});

		// Filter valid properties (same logic as property contacts)
		// Only exclude obvious test entries, not legitimate property names containing "test"
		const validProperties = properties.filter(prop => {
			const name = prop.community_name || prop.name;
			const hasAddress = prop.address && prop.address.trim() !== '';

			// Check if name is obviously a test entry
			// Pattern matches: act4, act123, activity event test, test 1, test123, etc.
			const isTestEntry = name && /^(act\d+|.*activity.*test.*|test\s*\d*)$/i.test(name.trim());

			const hasValidName = name && name.trim() !== '' && !isTestEntry;
			return hasAddress && hasValidName;
		});

		// Get unique community names
		const communities = new Map();
		validProperties.forEach(prop => {
			const communityName = prop.community_name || prop.name;
			if (!communities.has(communityName)) {
				communities.set(communityName, prop);
			}
		});

		// Clear existing options except the first one
		select.innerHTML = '<option value="">Select a property...</option>';

		// Add property options
		Array.from(communities.keys()).sort().forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			select.appendChild(option);
		});

		console.log(`Populated special property dropdown with ${communities.size} properties`);
	} catch (error) {
		console.error('Error populating special property dropdown:', error);
	}
}

export function populatePropertyDropdown(communityNames) {
	const select = document.getElementById('contactPropertySelect');
	if (!select) return;

	// Clear existing options except the first one
	select.innerHTML = '<option value="">Select a property...</option>';

	// Add community names
	communityNames.sort().forEach(name => {
		const option = document.createElement('option');
		option.value = name;
		option.textContent = name;
		select.appendChild(option);
	});
}

export async function savePropertyContact(options) {
	const { SupabaseAPI, hideModal, renderPropertyContacts, toast } = options;
	
	const form = document.getElementById('addPropertyContactForm');
	if (!form.checkValidity()) {
		form.reportValidity();
		return;
	}

	const communityName = document.getElementById('contactPropertySelect').value;
	const contactName = document.getElementById('contactName').value;
	const contactEmail = document.getElementById('contactEmail').value;
	const contactPhone = document.getElementById('contactPhone').value;
	const officeHours = document.getElementById('contactOfficeHours').value;
	const contactNotes = document.getElementById('contactNotes').value;

	try {
		// Update all properties with this community name
		await SupabaseAPI.updatePropertyContact({
			community_name: communityName,
			contact_name: contactName,
			contact_email: contactEmail,
			contact_phone: contactPhone,
			office_hours: officeHours,
			contact_notes: contactNotes
		});

		toast('✅ Contact info saved & activity logged!', 'success');
		hideModal('addPropertyContactModal');
		await renderPropertyContacts();
	} catch (error) {
		console.error('Error saving property contact:', error);
		toast('Error saving contact info. Please try again.', 'error');
	}
}

export async function editPropertyContact(propertyId, communityName, options) {
	const { SupabaseAPI, showModal, toast } = options;
	
	try {
		// Fetch the property details
		const property = await SupabaseAPI.getProperty(propertyId);

		// Populate the form
		document.getElementById('contactPropertySelect').value = communityName;
		document.getElementById('contactName').value = property.contact_name || '';
		document.getElementById('contactEmail').value = property.contact_email || '';
		document.getElementById('contactPhone').value = property.contact_phone || '';
		document.getElementById('contactOfficeHours').value = property.office_hours || '';
		document.getElementById('contactNotes').value = property.contact_notes || '';

		// Disable the property select (can't change which property)
		document.getElementById('contactPropertySelect').disabled = true;

		// Show the modal
		showModal('addPropertyContactModal');

		// Re-enable on close
		const modal = document.getElementById('addPropertyContactModal');
		const closeHandler = () => {
			document.getElementById('contactPropertySelect').disabled = false;
			modal.removeEventListener('click', closeHandler);
		};
		modal.addEventListener('click', closeHandler);
	} catch (error) {
		console.error('Error loading property contact:', error);
		toast('Error loading contact info. Please try again.', 'error');
	}
}

