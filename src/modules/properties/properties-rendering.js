// Properties Rendering Functions - EXACT COPY from script.js lines 2340-2488

/**
 * Render the unified properties table with contacts and specials merged
 */
export async function renderProperties(options) {
	const { SupabaseAPI, toast, state } = options;

	console.log('renderProperties called - rendering merged table');
	const tbody = document.getElementById('propertiesTbody');
	if (!tbody) {
		console.error('propertiesTbody not found');
		return;
	}

	try {
		// Fetch properties and specials in parallel
		const [properties, specialsData] = await Promise.all([
			SupabaseAPI.getProperties({ search: '', market: 'all' }),
			// Database uses valid_until, not expiration_date
			SupabaseAPI.getSpecials({ search: '', sortKey: 'valid_until', sortOrder: 'asc' })
		]);

		const specials = specialsData.items || [];
		console.log('Fetched properties:', properties.length, 'specials:', specials.length);

		// Filter valid properties (exclude test entries)
		const validProperties = properties.filter(prop => {
			const name = prop.community_name || prop.name;
			const isTestEntry = name && /^(act\d+|.*activity.*test.*|test\s*\d*)$/i.test(name.trim());
			const hasValidName = name && name.trim() !== '' && !isTestEntry;
			return hasValidName;
		});

		// Merge specials into properties
		const propertiesWithSpecials = validProperties.map(prop => {
			const propName = prop.community_name || prop.name;

			// Find all specials for this property
			const propSpecials = specials.filter(s => s.property_name === propName);

			// Filter active specials (not expired)
			const activeSpecials = propSpecials.filter(s => {
				// Database uses valid_until, not expiration_date
				const expDate = new Date(s.valid_until || s.expiration_date);
				return expDate > new Date();
			});

			return {
				...prop,
				allSpecials: propSpecials,
				activeSpecials: activeSpecials
			};
		});

		console.log('Properties with specials merged:', propertiesWithSpecials.length);

		// Clear table
		tbody.innerHTML = '';

		// Render each property
		propertiesWithSpecials.forEach(prop => {
			const tr = document.createElement('tr');

			// Property name
			const name = prop.community_name || prop.name;

			// Address
			const address = prop.address || '<span class="muted">—</span>';

			// Contact info
			const contactName = prop.contact_name || '';
			const contactEmail = prop.contact_email || '';
			let contactInfo = '';
			if (contactName || contactEmail) {
				contactInfo = `
					<div>${contactName || '<span class="muted">—</span>'}</div>
					${contactEmail ? `<div class="muted" style="font-size: 11px;">${contactEmail}</div>` : ''}
				`;
			} else {
				contactInfo = '<span class="muted">—</span>';
			}

			// Phone
			const phone = prop.contact_phone || '<span class="muted">—</span>';

			// Specials column
			let specialsHtml = '';
			if (prop.activeSpecials.length === 0) {
				specialsHtml = '<span class="muted">No active special</span>';
			} else if (prop.activeSpecials.length === 1) {
				const special = prop.activeSpecials[0];
				// Database uses valid_until, not expiration_date
				const expDate = new Date(special.valid_until || special.expiration_date).toLocaleDateString();
				// Database uses title, not current_special
				const specialTitle = special.title || special.current_special;
				specialsHtml = `
					<div style="line-height: 1.4;">
						<div>🔥 ${specialTitle}</div>
						<div class="muted" style="font-size: 11px;">Expires: ${expDate}</div>
					</div>
				`;
			} else {
				specialsHtml = `
					<div style="line-height: 1.4;">
						<div>🔥 ${prop.activeSpecials.length} active specials</div>
						<button class="btn-link" onclick="window.viewPropertySpecials('${prop.id}', '${name.replace(/'/g, "\\'")}')">
							View Details
						</button>
					</div>
				`;
			}

			// Actions
			const actionsHtml = `
				<button class="icon-btn" onclick="window.editPropertyContact('${prop.id}', '${name.replace(/'/g, "\\'")}')}" title="Edit Contact Info">
					📞
				</button>
				${hasActiveSpecials ? `
					<button class="icon-btn" onclick="window.editPropertySpecial('${prop.activeSpecials[0].id}', '${name.replace(/'/g, "\\'")}')}" title="Edit Special">
						🔥
					</button>
				` : `
					<button class="icon-btn" onclick="window.addSpecialForProperty('${name.replace(/'/g, "\\'")}')}" title="Add Special">
						🔥
					</button>
				`}
			`;

			tr.innerHTML = `
				<td><strong>${name}</strong></td>
				<td>${address}</td>
				<td>${contactInfo}</td>
				<td>${phone}</td>
				<td>${specialsHtml}</td>
				<td>${actionsHtml}</td>
			`;

			tbody.appendChild(tr);
		});

		console.log(`Rendered ${propertiesWithSpecials.length} properties in merged table`);
	} catch (error) {
		console.error('Error rendering properties:', error);
		toast('Error loading properties. Please try again.', 'error');
	}
}

/**
 * Open modal to add a special for a specific property
 */
export function addSpecialForProperty(propertyName, options) {
	const { showModal, populateSpecialPropertyDropdown } = options;

	// Open the Add Special modal
	showModal('addSpecialModal');

	// Reset form
	document.getElementById('addSpecialForm').reset();

	// Set default expiration date to 30 days from now
	const defaultDate = new Date();
	defaultDate.setDate(defaultDate.getDate() + 30);
	document.getElementById('specialExpirationDate').value = defaultDate.toISOString().split('T')[0];

	// Populate dropdown and pre-select the property
	populateSpecialPropertyDropdown().then(() => {
		const select = document.getElementById('specialPropertyName');
		if (select && propertyName) {
			select.value = propertyName;
		}
	});
}

/**
 * View all specials for a specific property
 */
export async function viewPropertySpecials(propertyId, propertyName, options) {
	const { SupabaseAPI, showModal } = options;

	try {
		// Fetch all specials for this property
		const specialsData = await SupabaseAPI.getSpecials({ search: propertyName });
		const specials = specialsData.items || [];

		// Filter specials for this property
		const propertySpecials = specials.filter(s => s.property_name === propertyName);

		// Populate modal
		const modalTitle = document.getElementById('viewSpecialsPropertyName');
		const tbody = document.getElementById('viewSpecialsTbody');

		if (modalTitle) modalTitle.textContent = propertyName;
		if (tbody) {
			tbody.innerHTML = '';

			propertySpecials.forEach(special => {
				const tr = document.createElement('tr');
				// Database uses valid_until, not expiration_date
				const expDate = new Date(special.valid_until || special.expiration_date).toLocaleDateString();
				const isExpired = new Date(special.valid_until || special.expiration_date) < new Date();
				// Database uses title and description, not current_special and commission_rate
				const specialTitle = special.title || special.current_special;
				const specialDesc = special.description || special.commission_rate || '—';

				tr.innerHTML = `
					<td>${specialTitle}</td>
					<td>${specialDesc}</td>
					<td ${isExpired ? 'style="color: var(--danger);"' : ''}>${expDate} ${isExpired ? '(Expired)' : ''}</td>
					<td>
						<button class="icon-btn" onclick="window.deleteSpecial('${special.id}')" title="Delete">🗑️</button>
					</td>
				`;

				tbody.appendChild(tr);
			});
		}

		// Show modal
		showModal('viewSpecialsModal');
	} catch (error) {
		console.error('Error loading property specials:', error);
	}
}

/**
 * Edit an existing special
 */
export async function editPropertySpecial(specialId, propertyName, options) {
	const { SupabaseAPI, showModal, toast } = options;

	try {
		// Fetch the special details
		const specialsData = await SupabaseAPI.getSpecials({ search: '' });
		const specials = specialsData.items || [];
		const special = specials.find(s => s.id === specialId);

		if (!special) {
			toast('Special not found', 'error');
			return;
		}

		// Populate the form
		document.getElementById('editSpecialId').value = special.id;
		document.getElementById('editSpecialPropertyName').textContent = propertyName;
		document.getElementById('editSpecialTitle').value = special.title || '';
		document.getElementById('editSpecialDescription').value = special.description || '';
		document.getElementById('editSpecialValidFrom').value = special.valid_from ? new Date(special.valid_from).toISOString().split('T')[0] : '';
		document.getElementById('editSpecialValidUntil').value = special.valid_until ? new Date(special.valid_until).toISOString().split('T')[0] : '';

		// Show modal
		showModal('editSpecialModal');
	} catch (error) {
		console.error('Error loading special for editing:', error);
		toast('Error loading special. Please try again.', 'error');
	}
}

/**
 * Save edited special
 */
export async function saveEditedSpecial(options) {
	const { SupabaseAPI, toast, hideModal, renderProperties } = options;

	const specialId = document.getElementById('editSpecialId').value;
	const title = document.getElementById('editSpecialTitle').value.trim();
	const description = document.getElementById('editSpecialDescription').value.trim();
	const validFrom = document.getElementById('editSpecialValidFrom').value;
	const validUntil = document.getElementById('editSpecialValidUntil').value;

	// Validation
	if (!title || !description || !validFrom || !validUntil) {
		toast('Please fill in all required fields', 'error');
		return;
	}

	try {
		await SupabaseAPI.updateSpecial(specialId, {
			title,
			description,
			valid_from: validFrom,
			valid_until: validUntil
		});

		toast('Special updated successfully!', 'success');
		hideModal('editSpecialModal');
		await renderProperties();
	} catch (error) {
		console.error('Error updating special:', error);
		toast('Error updating special. Please try again.', 'error');
	}
}

/**
 * Delete a special from edit modal
 */
export async function deleteEditedSpecial(options) {
	const { SupabaseAPI, toast, hideModal, renderProperties } = options;

	const specialId = document.getElementById('editSpecialId').value;
	const propertyName = document.getElementById('editSpecialPropertyName').textContent;

	const confirmed = confirm(`Are you sure you want to delete this special for ${propertyName}?`);
	if (!confirmed) return;

	try {
		await SupabaseAPI.deleteSpecial(specialId);
		toast('Special deleted successfully!', 'success');
		hideModal('editSpecialModal');
		await renderProperties();
	} catch (error) {
		console.error('Error deleting special:', error);
		toast('Error deleting special. Please try again.', 'error');
	}
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

		// Filter out invalid properties
		// Only exclude obvious test entries like "act4", "activity event test", "test 1", etc.
		// Don't exclude legitimate property names that happen to contain "test" like "TestAfter Mod"
		// Note: Address is NOT required for property contacts (we're showing contact info, not property details)
		const validProperties = properties.filter(prop => {
			const name = prop.community_name || prop.name;

			// Check if name is obviously a test entry
			// Pattern matches: act4, act123, activity event test, test 1, test123, etc.
			const isTestEntry = name && /^(act\d+|.*activity.*test.*|test\s*\d*)$/i.test(name.trim());

			const hasValidName = name && name.trim() !== '' && !isTestEntry;
			return hasValidName;
		});

		console.log('Valid properties after filtering:', validProperties.map(p => ({
			name: p.community_name || p.name,
			address: p.address,
			hasAddress: !!(p.address && p.address.trim())
		})));

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
		// Note: Address is NOT required (we're just populating a dropdown with property names)
		const validProperties = properties.filter(prop => {
			const name = prop.community_name || prop.name;

			// Check if name is obviously a test entry
			// Pattern matches: act4, act123, activity event test, test 1, test123, etc.
			const isTestEntry = name && /^(act\d+|.*activity.*test.*|test\s*\d*)$/i.test(name.trim());

			const hasValidName = name && name.trim() !== '' && !isTestEntry;
			return hasValidName;
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

