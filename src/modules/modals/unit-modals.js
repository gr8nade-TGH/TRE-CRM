// Unit Modals - Notes, Activity Log, and Configuration
import * as SupabaseAPI from '../../api/supabase-api.js';
import { formatDate, showModal, hideModal, toast } from '../../utils/helpers.js';
import { state } from '../../state/state.js';

/**
 * Unit Notes Modal Functions
 */
export async function openUnitNotesModal(unitId, unitNumber, propertyName, propertyId) {
	
	window.currentUnitForNotes = unitId;
	window.currentPropertyForUnitNotes = propertyId;

	const modal = document.getElementById('unitNotesModal');
	const modalHeader = modal ? modal.querySelector('.modal-header h3') : null;
	if (modalHeader) {
		modalHeader.textContent = `📝 Notes: Unit ${unitNumber} - ${propertyName}`;
	}

	// Clear note input
	const noteInput = document.getElementById('newUnitNote');
	if (noteInput) {
		noteInput.value = '';
	}

	// Load and display notes
	await loadUnitNotes(unitId);

	showModal('unitNotesModal');
}

export function closeUnitNotesModal() {
	hideModal('unitNotesModal');
	window.currentUnitForNotes = null;
	window.currentPropertyForUnitNotes = null;
}

export async function loadUnitNotes(unitId) {
	try {
		const notes = await SupabaseAPI.getUnitNotes(unitId);
		const notesContent = document.getElementById('unitNotesContent');

		if (notes.length === 0) {
			notesContent.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No notes yet. Add one below!</p>';
			return;
		}

		notesContent.innerHTML = notes.map(note => `
			<div class="note-item" style="border-bottom: 1px solid #e2e8f0; padding: 15px 0;">
				<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
					<div>
						<strong style="color: #1e293b;">${note.author_name}</strong>
						<span style="color: #64748b; font-size: 13px; margin-left: 10px;">
							${formatDate(note.created_at)}
						</span>
					</div>
				</div>
				<div style="color: #475569; line-height: 1.6;">
					${note.content}
				</div>
			</div>
		`).join('');
	} catch (error) {
		console.error('Error loading unit notes:', error);
		toast('Error loading notes', 'error');
	}
}

export async function addUnitNote() {
	if (!window.currentUnitForNotes) {
		toast('No unit selected', 'error');
		return;
	}

	const noteContent = document.getElementById('newUnitNote').value.trim();

	if (!noteContent) {
		toast('Please enter a note', 'error');
		return;
	}

	try {
		// Debug: Log the entire currentUser object
		console.log('🔍 DEBUG: window.currentUser:', window.currentUser);
		console.log('🔍 DEBUG: window.currentUser.id:', window.currentUser?.id);
		console.log('🔍 DEBUG: window.currentUser.email:', window.currentUser?.email);

		// Use window.currentUser.id as author_id (matches users.id which is UUID)
		const authorId = window.currentUser?.id;
		const authorName = window.currentUser?.user_metadata?.name ||
		                   window.currentUser?.email ||
		                   'Unknown User';

		console.log('🔍 DEBUG: authorId being used:', authorId);
		console.log('🔍 DEBUG: authorName being used:', authorName);

		if (!authorId) {
			console.error('❌ No authorId - window.currentUser:', window.currentUser);
			toast('User not authenticated', 'error');
			return;
		}

		const noteData = {
			unit_id: window.currentUnitForNotes,
			property_id: window.currentPropertyForUnitNotes,
			content: noteContent,
			author_id: authorId,  // Use user UUID, not email
			author_name: authorName
		};

		console.log('💾 DEBUG: Final noteData being sent:', noteData);
		await SupabaseAPI.createUnitNote(noteData);
		toast('Note added successfully!', 'success');

		// Clear input
		document.getElementById('newUnitNote').value = '';

		// Reload notes
		await loadUnitNotes(window.currentUnitForNotes);

		// Refresh listings (trigger custom event)
		window.dispatchEvent(new CustomEvent('refreshListings'));
	} catch (error) {
		console.error('Error adding note:', error);
		toast(`Error adding note: ${error.message}`, 'error');
	}
}

/**
 * Unit Configuration Modal Functions
 */
export async function openUnitConfigModal(unitId) {
	
	window.currentUnitForConfig = unitId;

	try {
		// Fetch unit details
		const unit = await SupabaseAPI.getUnitById(unitId);
		
		if (!unit) {
			toast('Unit not found', 'error');
			return;
		}

		// Populate form fields
		document.getElementById('configUnitNumber').value = unit.unit_number || '';
		document.getElementById('configUnitFloor').value = unit.floor || '';
		document.getElementById('configUnitRent').value = unit.rent || '';
		document.getElementById('configUnitMarketRent').value = unit.market_rent || '';
		document.getElementById('configUnitAvailableFrom').value = unit.available_from || '';
		document.getElementById('configUnitStatus').value = unit.status || 'available';
		document.getElementById('configUnitIsAvailable').checked = unit.is_available !== false;
		document.getElementById('configUnitIsActive').checked = unit.is_active !== false;
		document.getElementById('configUnitNotes').value = unit.notes || '';

		// Set modal title
		const modal = document.getElementById('unitConfigModal');
		const modalHeader = modal ? modal.querySelector('.modal-header h3') : null;
		if (modalHeader) {
			const propertyName = unit.property?.community_name || 'Property';
			modalHeader.textContent = `⚙️ Configure Unit ${unit.unit_number} - ${propertyName}`;
		}

		showModal('unitConfigModal');
	} catch (error) {
		console.error('Error loading unit config:', error);
		toast('Error loading unit details', 'error');
	}
}

export function closeUnitConfigModal() {
	hideModal('unitConfigModal');
	window.currentUnitForConfig = null;
}

export async function saveUnitConfig() {
	if (!window.currentUnitForConfig) {
		toast('No unit selected', 'error');
		return;
	}

	try {
		const updates = {
			unit_number: document.getElementById('configUnitNumber').value.trim(),
			floor: parseInt(document.getElementById('configUnitFloor').value) || null,
			rent: parseInt(document.getElementById('configUnitRent').value) || null,
			market_rent: parseInt(document.getElementById('configUnitMarketRent').value) || null,
			available_from: document.getElementById('configUnitAvailableFrom').value || null,
			status: document.getElementById('configUnitStatus').value,
			is_available: document.getElementById('configUnitIsAvailable').checked,
			is_active: document.getElementById('configUnitIsActive').checked,
			notes: document.getElementById('configUnitNotes').value.trim()
		};

		await SupabaseAPI.updateUnit(window.currentUnitForConfig, updates);
		toast('Unit updated successfully!', 'success');

		hideModal('unitConfigModal');
		window.currentUnitForConfig = null;

		// Refresh listings (trigger custom event)
		window.dispatchEvent(new CustomEvent('refreshListings'));
	} catch (error) {
		console.error('Error saving unit config:', error);
		toast(`Error saving unit: ${error.message}`, 'error');
	}
}

// Initialize event listeners for unit modal buttons
export function initializeUnitModalListeners() {
	// Unit Notes modal buttons
	const closeUnitNotes = document.getElementById('closeUnitNotes');
	const cancelUnitNotes = document.getElementById('cancelUnitNotes');
	const saveUnitNoteBtn = document.getElementById('saveUnitNoteBtn');

	if (closeUnitNotes) {
		closeUnitNotes.addEventListener('click', closeUnitNotesModal);
	}
	if (cancelUnitNotes) {
		cancelUnitNotes.addEventListener('click', closeUnitNotesModal);
	}
	if (saveUnitNoteBtn) {
		saveUnitNoteBtn.addEventListener('click', addUnitNote);
	}

	// Unit Configuration modal buttons
	const closeUnitConfig = document.getElementById('closeUnitConfig');
	const cancelUnitConfig = document.getElementById('cancelUnitConfig');
	const saveUnitConfigBtn = document.getElementById('saveUnitConfigBtn');

	if (closeUnitConfig) {
		closeUnitConfig.addEventListener('click', closeUnitConfigModal);
	}
	if (cancelUnitConfig) {
		cancelUnitConfig.addEventListener('click', closeUnitConfigModal);
	}
	if (saveUnitConfigBtn) {
		saveUnitConfigBtn.addEventListener('click', saveUnitConfig);
	}
}
