/**
 * Supabase Helper Functions
 * Common database operations you can call from Node.js
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('./supabase-config.js');

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// AGENTS
// ============================================

async function getAllAgents() {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('role', 'agent')
		.order('name');
	
	if (error) throw error;
	return data;
}

async function getAgentByEmail(email) {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('email', email)
		.eq('role', 'agent')
		.single();
	
	if (error) throw error;
	return data;
}

async function getAgentById(id) {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', id)
		.single();
	
	if (error) throw error;
	return data;
}

async function createAgent(agentData) {
	const { data, error } = await supabase
		.from('users')
		.insert([{
			...agentData,
			role: 'agent',
			active: true
		}])
		.select()
		.single();
	
	if (error) throw error;
	return data;
}

// ============================================
// LEADS
// ============================================

async function getAllLeads(limit = 100) {
	const { data, error } = await supabase
		.from('leads')
		.select('*, assigned_agent:users!assigned_agent_id(name, email)')
		.order('created_at', { ascending: false })
		.limit(limit);
	
	if (error) throw error;
	return data;
}

async function getLeadsByAgent(agentId) {
	const { data, error } = await supabase
		.from('leads')
		.select('*')
		.eq('assigned_agent_id', agentId)
		.order('created_at', { ascending: false });
	
	if (error) throw error;
	return data;
}

async function createLead(leadData) {
	const { data, error } = await supabase
		.from('leads')
		.insert([leadData])
		.select()
		.single();
	
	if (error) throw error;
	return data;
}

async function updateLead(leadId, updates) {
	const { data, error } = await supabase
		.from('leads')
		.update(updates)
		.eq('id', leadId)
		.select()
		.single();
	
	if (error) throw error;
	return data;
}

async function deleteLead(leadId) {
	const { data, error } = await supabase
		.from('leads')
		.delete()
		.eq('id', leadId);
	
	if (error) throw error;
	return data;
}

// ============================================
// PROPERTIES
// ============================================

async function getAllProperties(limit = 100) {
	const { data, error } = await supabase
		.from('properties')
		.select('*')
		.order('name')
		.limit(limit);
	
	if (error) throw error;
	return data;
}

async function getPropertyById(id) {
	const { data, error } = await supabase
		.from('properties')
		.select('*')
		.eq('id', id)
		.single();
	
	if (error) throw error;
	return data;
}

async function createProperty(propertyData) {
	const { data, error } = await supabase
		.from('properties')
		.insert([propertyData])
		.select()
		.single();
	
	if (error) throw error;
	return data;
}

async function updateProperty(propertyId, updates) {
	const { data, error } = await supabase
		.from('properties')
		.update(updates)
		.eq('id', propertyId)
		.select()
		.single();
	
	if (error) throw error;
	return data;
}

async function deleteProperty(propertyId) {
	const { data, error } = await supabase
		.from('properties')
		.delete()
		.eq('id', propertyId);
	
	if (error) throw error;
	return data;
}

// ============================================
// USERS
// ============================================

async function getAllUsers() {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.order('name');
	
	if (error) throw error;
	return data;
}

async function getUserByEmail(email) {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('email', email)
		.single();
	
	if (error) throw error;
	return data;
}

// ============================================
// RAW SQL
// ============================================

async function executeSQL(query) {
	const { data, error } = await supabase.rpc('exec_sql', { query_text: query });
	
	if (error) throw error;
	return data;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
	supabase,
	
	// Agents
	getAllAgents,
	getAgentByEmail,
	getAgentById,
	createAgent,
	
	// Leads
	getAllLeads,
	getLeadsByAgent,
	createLead,
	updateLead,
	deleteLead,
	
	// Properties
	getAllProperties,
	getPropertyById,
	createProperty,
	updateProperty,
	deleteProperty,
	
	// Users
	getAllUsers,
	getUserByEmail,
	
	// Raw SQL
	executeSQL
};

