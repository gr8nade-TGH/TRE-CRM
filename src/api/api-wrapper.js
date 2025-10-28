// API Wrapper Layer - Extracted from script.js
// This layer wraps Supabase API calls and provides backward compatibility

import * as SupabaseAPI from './supabase-api.js';

/**
 * Create API wrapper object
 * @param {Object} options - Dependencies
 * @param {Object} options.mockInterestedLeads - Mock interested leads data (temporary)
 * @returns {Object} API object with all methods
 */
export function createAPI({ mockInterestedLeads }) {
	// Helper function to handle API responses
	async function handleResponse(response) {
		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Network error' }));
			throw new Error(error.error || `HTTP ${response.status}`);
		}
		return response.json();
	}

	return {
		async getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters = {} }) {
			// Use real Supabase data
			console.log('✅ Using Supabase for leads');
			return await SupabaseAPI.getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters });
		},

		async getLead(id) {
			// Use real Supabase data
			console.log('✅ Using Supabase for getLead');
			return await SupabaseAPI.getLead(id);
		},

		async assignLead(id, agent_id) {
			// Use real Supabase data
			console.log('✅ Using Supabase to assign lead');

			// Get current user info for activity logging
			const userEmail = window.currentUser?.email || 'unknown';
			const userName = window.currentUser?.user_metadata?.name ||
							 window.currentUser?.email ||
							 'Unknown User';

			return await SupabaseAPI.updateLead(id, {
				assigned_agent_id: agent_id,
				updated_at: new Date().toISOString()
			}, userEmail, userName);
		},

		async getMatches(lead_id, limit = 10) {
			// Return example listings for now
			return [
				{
					id: 'listing-1',
					name: 'The Residences at Domain',
					rent_min: 1800,
					rent_max: 2400,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 750,
					sqft_max: 1200,
					effective_commission_pct: 3.5,
					specials_text: 'First month free + $500 move-in credit',
					bonus_text: 'Pet-friendly community with dog park',
					image_url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-2',
					name: 'Skyline Apartments',
					rent_min: 2200,
					rent_max: 3200,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1100,
					sqft_max: 1600,
					effective_commission_pct: 4.0,
					specials_text: 'No deposit required for qualified applicants',
					bonus_text: 'Rooftop pool and fitness center',
					image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-3',
					name: 'Garden District Lofts',
					rent_min: 1600,
					rent_max: 2100,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 650,
					sqft_max: 950,
					effective_commission_pct: 3.0,
					specials_text: 'Utilities included in rent',
					bonus_text: 'Historic building with modern amenities',
					image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-4',
					name: 'Metro Tower Residences',
					rent_min: 2500,
					rent_max: 3800,
					beds_min: 2,
					beds_max: 3,
					baths_min: 2,
					baths_max: 3,
					sqft_min: 1200,
					sqft_max: 1800,
					effective_commission_pct: 4.5,
					specials_text: 'Concierge service included',
					bonus_text: 'Downtown location with city views',
					image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-5',
					name: 'Riverside Commons',
					rent_min: 1400,
					rent_max: 1900,
					beds_min: 1,
					beds_max: 2,
					baths_min: 1,
					baths_max: 2,
					sqft_min: 600,
					sqft_max: 1000,
					effective_commission_pct: 2.5,
					specials_text: 'Free parking space included',
					bonus_text: 'Walking distance to riverfront park',
					image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'
				},
				{
					id: 'listing-6',
					name: 'Elite Heights',
					rent_min: 3000,
					rent_max: 4500,
					beds_min: 3,
					beds_max: 4,
					baths_min: 3,
					baths_max: 4,
					sqft_min: 1800,
					sqft_max: 2500,
					effective_commission_pct: 5.0,
					specials_text: 'Premium finishes and appliances',
					bonus_text: 'Private balcony with city skyline views',
					image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop'
				}
			].slice(0, limit);
		},

		async getProperty(id) {
			// Note: API_BASE is no longer used - this is dead code
			// Keeping for backward compatibility
			console.warn('getProperty called - this should use SupabaseAPI.getProperty instead');
			return await SupabaseAPI.getProperty(id);
		},

		async createShowcase({ lead_id, agent_id, listing_ids, message, showcase_id, landing_url }) {
			// Note: This is mock implementation - needs backend
			console.log('createShowcase called (mock):', { lead_id, agent_id, listing_ids, message, showcase_id, landing_url });
			return { ok: true, showcase_id };
		},

		async sendEmail({ to, subject, html, showcase_id }) {
			// Mock for now
			console.log('Sending email:', { to, subject, showcase_id });
			return { ok: true };
		},

		async getInterestedLeadsCount(propertyId) {
			// Note: Using mock data for now - will be replaced with Supabase later
			const interestedLeads = mockInterestedLeads[propertyId] || [];
			return interestedLeads.length;
		},

		async getInterestedLeads(propertyId) {
			// Note: Using mock data for now - will be replaced with Supabase later
			console.log('getInterestedLeads called with propertyId:', propertyId);
			const data = mockInterestedLeads[propertyId] || [];
			console.log('Mock data for', propertyId, ':', data);
			return data;
		},

		async createLeadInterest({ lead_id, property_id, agent_id, interest_type, status, notes }) {
			// Note: This is mock implementation - needs backend
			console.log('createLeadInterest called (mock):', { lead_id, property_id, agent_id, interest_type, status, notes });
			return { ok: true };
		},

		// Specials API functions
		async getSpecials({ role, agentId, search, sortKey, sortDir, page, pageSize }) {
			// Use real Supabase data
			console.log('✅ Using Supabase for specials');
			return await SupabaseAPI.getSpecials({ role, agentId, search, sortKey, sortDir, page, pageSize });
		},

		async createSpecial(specialData) {
			// Use real Supabase data
			return await SupabaseAPI.createSpecial(specialData);
		},

		async updateSpecial(id, specialData) {
			// Use real Supabase data
			return await SupabaseAPI.updateSpecial(id, specialData);
		},

		async deleteSpecial(id) {
			// Use real Supabase data
			return await SupabaseAPI.deleteSpecial(id);
		},

		// Bugs API functions
		async getBugs({ status, priority, page, pageSize } = {}) {
			return await SupabaseAPI.getBugs({ status, priority, page, pageSize });
		},

		async createBug(bugData) {
			return await SupabaseAPI.createBug(bugData);
		},

		async updateBug(bugId, updates) {
			return await SupabaseAPI.updateBug(bugId, updates);
		},

		async deleteBug(bugId) {
			return await SupabaseAPI.deleteBug(bugId);
		},

		async getBug(bugId) {
			return await SupabaseAPI.getBug(bugId);
		},

		// Email API functions
		async getEmailTemplates(options) {
			return await SupabaseAPI.getEmailTemplates(options);
		},

		async getEmailTemplate(templateId) {
			return await SupabaseAPI.getEmailTemplate(templateId);
		},

		async getEmailLogs(options) {
			return await SupabaseAPI.getEmailLogs(options);
		},

		async sendEmail(emailData) {
			return await SupabaseAPI.sendEmail(emailData);
		}
	};
}

