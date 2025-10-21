// Property Notes Modal Functions - EXACT COPY from script.js

export async function openPropertyNotesModal(propertyId, propertyName, options) {
	const { loadPropertyNotes, showModal } = options;
	
	window.currentPropertyForNotes = propertyId;

	const modal = document.getElementById('propertyNotesModal');
	const modalHeader = modal ? modal.querySelector('.modal-header h3') : null;
	if (modalHeader) {
		modalHeader.textContent = `📝 Notes: ${propertyName}`;
	}

	// Clear note input
	const noteInput = document.getElementById('newPropertyNote');
	if (noteInput) {
		noteInput.value = '';
	}

	// Load and display notes
	await loadPropertyNotes(propertyId);

	showModal('propertyNotesModal');
}

export function closePropertyNotesModal(options) {
	const { hideModal } = options;
	
	hideModal('propertyNotesModal');
	window.currentPropertyForNotes = null;
}

export async function loadPropertyNotes(propertyId, options) {
	const { SupabaseAPI, formatDate, toast } = options;
	
	try {
		const notes = await SupabaseAPI.getPropertyNotes(propertyId);
		const notesContent = document.getElementById('propertyNotesContent');

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
		console.error('Error loading property notes:', error);
		toast('Error loading notes', 'error');
	}
}

export async function addPropertyNote(options) {
	const { state, SupabaseAPI, loadPropertyNotes, renderListings, toast } = options;
	
	if (!window.currentPropertyForNotes) {
		toast('No property selected', 'error');
		return;
	}

	const noteContent = document.getElementById('newPropertyNote').value.trim();

	if (!noteContent) {
		toast('Please enter a note', 'error');
		return;
	}

	try {
		const noteData = {
			property_id: window.currentPropertyForNotes,
			content: noteContent,
			author_id: state.userId,
			author_name: state.userName || 'Unknown'
		};

		await SupabaseAPI.createPropertyNote(noteData);
		toast('Note added successfully!', 'success');

		// Clear input
		document.getElementById('newPropertyNote').value = '';

		// Reload notes
		await loadPropertyNotes(window.currentPropertyForNotes);

		// Refresh listings to update note icon
		await renderListings();
	} catch (error) {
		console.error('Error adding note:', error);
		toast(`Error adding note: ${error.message}`, 'error');
	}
}

