// Agent Drawer Utilities
// Functions for managing agent edit drawer/modal

/**
 * Open agent drawer/modal for editing
 * @param {Object} deps - Dependencies object
 */
export async function openAgentDrawer(deps) {
	const { agentId, state, realAgents, getAgentStats, showModal } = deps;

	state.selectedAgentId = agentId;
	const agent = realAgents.find(a => a.id === agentId);
	const stats = getAgentStats(agentId);
	const c = document.getElementById('agentEditContent');

	c.innerHTML = `
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
			<div>
				<h4 style="margin-top: 0; color: #3b82f6;">📋 Contact Information</h4>
				<div class="field">
					<label>Agent Name</label>
					<input type="text" id="editAgentName" value="${agent.name}" />
				</div>
				<div class="field">
					<label>Email</label>
					<input type="email" id="editAgentEmail" value="${agent.email}" />
				</div>
				<div class="field">
					<label>Phone</label>
					<input type="tel" id="editAgentPhone" value="${agent.phone}" />
				</div>
				<div class="field">
					<label>Status</label>
					<select id="editAgentStatus">
						<option value="true" ${agent.active ? 'selected' : ''}>Active</option>
						<option value="false" ${!agent.active ? 'selected' : ''}>Inactive</option>
					</select>
				</div>
			</div>
			<div>
				<h4 style="margin-top: 0; color: #3b82f6;">👥 Professional Information</h4>
				<div class="field">
					<label>Hire Date</label>
					<input type="date" id="editAgentHireDate" value="${agent.hireDate || ''}" />
				</div>
				<div class="field">
					<label>License Number</label>
					<input type="text" id="editAgentLicense" value="${agent.licenseNumber || ''}" />
				</div>
				<div class="field">
					<label>Specialties (comma-separated)</label>
					<input type="text" id="editAgentSpecialties" value="${agent.specialties ? agent.specialties.join(', ') : ''}" />
				</div>
				<div class="field">
					<label>Notes</label>
					<textarea id="editAgentNotes" rows="3">${agent.notes || ''}</textarea>
				</div>
			</div>
		</div>
		<hr style="margin: 20px 0;">
		<h4 style="margin-top: 0; color: #3b82f6;">📊 Statistics</h4>
		<div class="stats-grid">
			<div class="stat-card">
				<div class="label">Leads Generated</div>
				<div class="value">${stats.generated}</div>
			</div>
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
	showModal('agentEditModal');
}

/**
 * Save agent changes from edit form
 * @param {Object} deps - Dependencies object
 */
export async function saveAgentChanges(deps) {
	const { state, realAgents, toast, closeAgentEditModal, renderAgents } = deps;

	if (!state.selectedAgentId) return;

	const agent = realAgents.find(a => a.id === state.selectedAgentId);
	if (!agent) return;

	// Get values from form
	agent.name = document.getElementById('editAgentName').value;
	agent.email = document.getElementById('editAgentEmail').value;
	agent.phone = document.getElementById('editAgentPhone').value;
	agent.active = document.getElementById('editAgentStatus').value === 'true';
	agent.hireDate = document.getElementById('editAgentHireDate').value;
	agent.licenseNumber = document.getElementById('editAgentLicense').value;
	agent.specialties = document.getElementById('editAgentSpecialties').value.split(',').map(s => s.trim()).filter(s => s);
	agent.notes = document.getElementById('editAgentNotes').value;

	// In a real app, this would save to the database
	toast('Agent information updated successfully!', 'success');
	closeAgentEditModal();
	renderAgents();
}

