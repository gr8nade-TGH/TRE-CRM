// Lead Notes Functions - EXACT COPY from script.js lines 3026-3122

export async function loadLeadNotes(leadId, options) {
	const { USE_MOCK_DATA, SupabaseAPI, formatDate } = options;
	
	if (USE_MOCK_DATA) {
		document.getElementById('leadNotesContent').innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
		return;
	}

	try {
		const notes = await SupabaseAPI.getLeadNotes(leadId);
		const notesContainer = document.getElementById('leadNotesContent');

		if (!notes || notes.length === 0) {
			notesContainer.innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
			return;
		}

		notesContainer.innerHTML = notes.map(note => `
			<div class="note-item" style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
				<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
					<strong style="color: #1f2937;">${note.author_name}</strong>
					<span class="subtle mono" style="font-size: 12px;">${formatDate(note.created_at)}</span>
				</div>
				<div style="color: #4b5563;">${note.content}</div>
			</div>
		`).join('');
	} catch (error) {
		console.error('Error loading lead notes:', error);
		document.getElementById('leadNotesContent').innerHTML = '<p class="subtle" style="color: #ef4444;">Error loading comments</p>';
	}
}

export async function saveLeadNote(isStandalone = false, options) {
	const { USE_MOCK_DATA, SupabaseAPI, loadLeadNotesInModal, renderLeads, toast } = options;

	console.log('🔵 saveLeadNote called, isStandalone:', isStandalone);
	console.log('currentLeadForNotes:', window.currentLeadForNotes);

	const inputId = isStandalone ? 'standaloneNewLeadNote' : 'newLeadNote';
	const noteInput = document.getElementById(inputId);
	const content = noteInput.value.trim();
	console.log('Note content:', content);

	if (!content) {
		toast('Please enter a comment', 'error');
		return;
	}

	if (!window.currentLeadForNotes) {
		toast('No lead selected', 'error');
		return;
	}

	if (USE_MOCK_DATA) {
		toast('Notes feature requires Supabase connection', 'error');
		return;
	}

	try {
		// Use window.currentUser.email as author_id (matches users table)
		const authorId = window.currentUser?.email;
		const authorName = window.currentUser?.user_metadata?.name ||
		                   window.currentUser?.email ||
		                   'Unknown User';

		console.log('👤 Current user:', window.currentUser);
		console.log('📧 Author ID:', authorId);
		console.log('👨 Author Name:', authorName);

		if (!authorId) {
			toast('User not authenticated', 'error');
			return;
		}

		const noteData = {
			lead_id: window.currentLeadForNotes,
			content: content,
			author_id: authorId,  // Use email, not UUID
			author_name: authorName
		};

		console.log('💾 Saving note data:', noteData);
		const result = await SupabaseAPI.createLeadNote(noteData);
		console.log('✅ Note saved successfully:', result);

		noteInput.value = '';

		// Reload notes in the modal
		console.log('🔄 Reloading notes in modal...');
		await loadLeadNotesInModal(window.currentLeadForNotes, isStandalone);

		// Refresh leads table to update note icon
		console.log('🔄 Refreshing leads table...');
		await renderLeads();

		toast('Comment added successfully!', 'success');
	} catch (error) {
		console.error('❌ Error saving lead note:', error);
		toast('Error saving comment', 'error');
	}
}

export async function loadLeadNotesInModal(leadId, isStandalone = false, options) {
	const { USE_MOCK_DATA, SupabaseAPI, formatDate } = options;
	
	console.log('🔵 loadLeadNotesInModal called with leadId:', leadId, 'isStandalone:', isStandalone);

	// Use different element IDs based on which modal is open
	const contentId = isStandalone ? 'standaloneLeadNotesContent' : 'leadNotesContent';

	if (USE_MOCK_DATA) {
		document.getElementById(contentId).innerHTML = '<p class="subtle">Notes feature requires Supabase connection</p>';
		return;
	}

	try {
		console.log('📡 Fetching notes from Supabase...');
		const notes = await SupabaseAPI.getLeadNotes(leadId);
		console.log('📥 Received notes:', notes);

		const notesContainer = document.getElementById(contentId);

		if (!notes || notes.length === 0) {
			console.log('ℹ️ No notes found for this lead');
			notesContainer.innerHTML = '<p class="subtle">No comments yet. Add one below!</p>';
			return;
		}

		console.log(`✅ Displaying ${notes.length} notes`);
		notesContainer.innerHTML = notes.map(note => `
			<div class="note-item" style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
				<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
					<strong style="color: #1f2937;">${note.author_name}</strong>
					<span class="subtle mono" style="font-size: 12px;">${formatDate(note.created_at)}</span>
				</div>
				<div style="color: #4b5563;">${note.content}</div>
			</div>
		`).join('');
	} catch (error) {
		console.error('❌ Error loading lead notes:', error);
		document.getElementById(contentId).innerHTML = '<p class="subtle" style="color: #ef4444;">Error loading comments</p>';
	}
}

// Legacy functions for backward compatibility
export async function openDrawer(leadId, options) {
	const { openLeadDetailsModal } = options;
	await openLeadDetailsModal(leadId);
}

export function closeDrawer(options) {
	const { closeLeadDetailsModal } = options;
	closeLeadDetailsModal();
}

