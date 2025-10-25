// Specials Rendering Functions - EXACT COPY from script.js lines 2490-2540

export async function renderSpecials(options) {
	const { state, api, formatDate, updateSortHeaders } = options;

	console.log('renderSpecials called');
	const tbody = document.getElementById('specialsTbody');
	if (!tbody) return;

	// Use default sort for specials (don't use global state.sort which is for leads)
	// Specials table columns: property_name, commission_rate, expiration_date, agent_name, created_at
	const validSpecialsSortKeys = ['property_name', 'commission_rate', 'expiration_date', 'agent_name', 'created_at'];
	const sortKey = validSpecialsSortKeys.includes(state.sort.key) ? state.sort.key : 'created_at';

	const { items, total } = await api.getSpecials({
		role: state.role,
		agentId: state.agentId,
		search: state.search,
		sortKey: sortKey,
		sortDir: state.sort.dir,
		page: state.page,
		pageSize: state.pageSize
	});

	console.log('Specials API returned:', { items, total });
	tbody.innerHTML = '';

	items.forEach(special => {
		const tr = document.createElement('tr');
		const isExpired = new Date(special.expiration_date) < new Date();
		const expiresSoon = new Date(special.expiration_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		tr.innerHTML = `
			<td data-sort="property_name">
				<div class="special-property-name">${special.property_name}</div>
				${isExpired ? '<div class="special-expired">EXPIRED</div>' : ''}
				${expiresSoon && !isExpired ? '<div class="special-expires-soon">Expires Soon</div>' : ''}
			</td>
			<td>
				<div class="special-description">${special.current_special}</div>
			</td>
			<td data-sort="commission_rate" class="mono">${special.commission_rate}</td>
			<td data-sort="expiration_date" class="mono ${isExpired ? 'expired' : ''}">${formatDate(special.expiration_date)}</td>
			<td data-sort="agent_name" class="mono">${special.agent_name}</td>
			<td data-sort="created_at" class="mono">${formatDate(special.created_at)}</td>
			<td>
				<div class="action-buttons">
					<button class="icon-btn edit-special" data-id="${special.id}" title="Edit">✏️</button>
					<button class="icon-btn delete-special" data-id="${special.id}" title="Delete">🗑️</button>
				</div>
			</td>
		`;

		tbody.appendChild(tr);
	});

	// Update sort headers
	updateSortHeaders('specialsTable');
}

