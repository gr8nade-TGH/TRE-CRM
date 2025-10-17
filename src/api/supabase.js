/**
 * Supabase API Service
 * Handles all Supabase database operations
 */

import { CONFIG } from '../constants/config.js';

class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }
    
    async init() {
        try {
            // Check if Supabase is available
            if (typeof window !== 'undefined' && window.supabase) {
                this.supabase = window.supabase;
                this.initialized = true;
                console.log('🔧 Supabase: Initialized successfully');
            } else {
                console.warn('🔧 Supabase: Not available, using mock data');
            }
        } catch (error) {
            console.error('🔧 Supabase: Initialization failed', error);
        }
    }
    
    // Check if Supabase is available
    isAvailable() {
        return this.initialized && this.supabase !== null;
    }
    
    // Generic error handler
    handleError(error, operation = 'operation') {
        console.error(`🔧 Supabase: Error during ${operation}:`, error);
        throw new Error(`Database ${operation} failed: ${error.message}`);
    }
    
    // LEADS API
    async getLeads({ role, agentId, search, sortKey, sortDir, page, pageSize, filters = {} }) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            let query = this.supabase
                .from('leads')
                .select('*');
            
            // Apply role-based filtering
            if (role === 'agent' && agentId) {
                query = query.eq('agent_id', agentId);
            }
            
            // Apply search
            if (search) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
            }
            
            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            
            if (filters.dateFrom) {
                query = query.gte('submitted_at', filters.dateFrom);
            }
            
            if (filters.dateTo) {
                query = query.lte('submitted_at', filters.dateTo);
            }
            
            // Apply sorting
            if (sortKey && sortDir) {
                query = query.order(sortKey, { ascending: sortDir === 'asc' });
            }
            
            // Apply pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            return {
                data: data || [],
                total: count || 0,
                page,
                pageSize
            };
        } catch (error) {
            this.handleError(error, 'getLeads');
        }
    }
    
    async getLead(id) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('leads')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            this.handleError(error, 'getLead');
        }
    }
    
    async createLead(leadData) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('leads')
                .insert([leadData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            this.handleError(error, 'createLead');
        }
    }
    
    async updateLead(id, updates) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('leads')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            this.handleError(error, 'updateLead');
        }
    }
    
    // AGENTS API
    async getAgents() {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('agents')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getAgents');
        }
    }
    
    async createAgent(agentData) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('agents')
                .insert([agentData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            this.handleError(error, 'createAgent');
        }
    }
    
    // USERS API
    async createUser(userData) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            // Create auth user
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        role: userData.role
                    }
                }
            });
            
            if (authError) throw authError;
            
            // Create user record
            const { data: userRecord, error: userError } = await this.supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                    agent_id: userData.agent_id,
                    phone: userData.phone,
                    license_number: userData.license_number,
                    specialties: userData.specialties,
                    hire_date: userData.hire_date,
                    notes: userData.notes
                }])
                .select()
                .single();
            
            if (userError) throw userError;
            
            return {
                auth: authData,
                user: userRecord
            };
        } catch (error) {
            this.handleError(error, 'createUser');
        }
    }
    
    // PROPERTIES API
    async getProperties() {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('properties')
                .select('*')
                .order('address');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            this.handleError(error, 'getProperties');
        }
    }
    
    async createProperty(propertyData) {
        if (!this.isAvailable()) {
            throw new Error('Supabase not available');
        }
        
        try {
            const { data, error } = await this.supabase
                .from('properties')
                .insert([propertyData])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            this.handleError(error, 'createProperty');
        }
    }
}

// Create singleton instance
const supabaseService = new SupabaseService();

export default supabaseService;
