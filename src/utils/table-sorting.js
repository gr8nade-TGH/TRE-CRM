// Table Sorting Utilities
// Extracted from script.js to reduce file size

/**
 * Sort a table by column
 * @param {string} column - Column name to sort by
 * @param {string} tableId - ID of the table element
 * @param {Object} state - Application state object
 * @param {Object} renderFunctions - Object containing render functions for each table
 * @param {Function} updateSortHeaders - Function to update sort header indicators
 */
export function sortTable(column, tableId, state, renderFunctions, updateSortHeaders) {
	console.log('sortTable called with column:', column, 'tableId:', tableId);
	const table = document.getElementById(tableId);
	if (!table) {
		console.log('Table not found:', tableId);
		return;
	}

	const tbody = table.querySelector('tbody');
	if (!tbody) {
		console.log('Tbody not found in table:', tableId);
		return;
	}

	// Three-state cycle: ascending → descending → no sort (original order)
	let newSortState;
	if (state.sort.key === column) {
		if (state.sort.dir === 'asc') {
			newSortState = 'desc';
		} else if (state.sort.dir === 'desc') {
			newSortState = 'none';
		} else {
			newSortState = 'asc';
		}
	} else {
		newSortState = 'asc';
	}

	// Update sort state
	state.sort.key = column;
	state.sort.dir = newSortState;

	// For tables with proper render functions, use those instead of DOM manipulation
	if (tableId === 'leadsTable' && renderFunctions.renderLeads) {
		renderFunctions.renderLeads();
		return;
	} else if (tableId === 'agentsTable' && renderFunctions.renderAgents) {
		renderFunctions.renderAgents();
		return;
	} else if (tableId === 'listingsTable' && renderFunctions.renderListings) {
		renderFunctions.renderListings();
		return;
	} else if (tableId === 'specialsTable' && renderFunctions.renderSpecials) {
		renderFunctions.renderSpecials();
		return;
	} else if (tableId === 'documentsTable' && renderFunctions.renderDocuments) {
		renderFunctions.renderDocuments();
		return;
	} else if (tableId === 'bugsTable' && renderFunctions.renderBugs) {
		renderFunctions.renderBugs();
		return;
	} else if (tableId === 'usersTable' && renderFunctions.renderUsersTable) {
		console.log('Calling renderUsersTable for sorting');
		renderFunctions.renderUsersTable();
		return;
	}

	// For tables without render functions, use DOM manipulation
	const rows = Array.from(tbody.querySelectorAll('tr'));
	const isAscending = newSortState === 'asc';

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
	updateSortHeaders(tableId);
}

