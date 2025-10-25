/**
 * Agent Statistics Module
 * Calculates statistics for agents (leads generated, assigned, closed)
 */

/**
 * Get statistics for a specific agent
 * @param {string} agentId - The agent ID
 * @param {Object} options - Dependencies
 * @param {Array} options.leads - Array of leads from state
 * @returns {Object} Statistics object with generated, assigned, and closed counts
 */
export function getAgentStats(agentId, options) {
	const { leads = [] } = options;
	
	const assignedLeads = leads.filter(l => l.assigned_agent_id === agentId);
	const generatedLeads = leads.filter(l => l.found_by_agent_id === agentId);
	const now = new Date();
	const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

	// Mock closed leads (in real app, this would come from a separate table)
	const closedLeads = assignedLeads.filter(l => {
		const submittedDate = new Date(l.submitted_at);
		return submittedDate >= ninetyDaysAgo && Math.random() > 0.7; // 30% chance of being "closed"
	});

	return {
		generated: generatedLeads.length,
		assigned: assignedLeads.length,
		closed: closedLeads.length
	};
}

