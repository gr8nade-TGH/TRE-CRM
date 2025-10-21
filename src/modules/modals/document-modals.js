// Document Modals Functions - EXACT COPY from script.js

export function openDocumentDetails(leadId, options) {
	const { mockLeads, mockDocumentStatuses, renderDocumentSteps, toast, show } = options;
	
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

export function closeDocumentDetails(options) {
	const { hide } = options;
	
	hide(document.getElementById('documentDetailsModal'));
}

export function openHistory(options) {
	const { mockClosedLeads, mockAgents, formatDate, show } = options;
	
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

export function closeHistory(options) {
	const { hide } = options;
	
	hide(document.getElementById('historyModal'));
}

export function openHistoryDocumentDetails(closedLeadId, options) {
	const { mockClosedLeads, show } = options;
	
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

