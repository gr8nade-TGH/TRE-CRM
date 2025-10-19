/**
 * Supabase API Layer
 * Provides API functions for interacting with Supabase database
 * Replaces mock data with real database queries
 */

/**
 * Get Supabase client from window (initialized in index.html)
 */
function getSupabase() {
    if (!window.supabase) {
        throw new Error('Supabase client not initialized');
    }
    return window.supabase;
}

/**
 * Leads API
 */
export async function getLeads({ role, agentId, search, sortKey, sortDir, page = 1, pageSize = 10, filters = {} }) {
    const supabase = getSupabase();

    console.log('🔍 getLeads called with:', { role, agentId, search, sortKey, sortDir, page, pageSize, filters });

    // Start query
    let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

    // Filter by agent if role is agent
    if (role === 'agent' && agentId) {
        console.log('🔍 Filtering for agent:', agentId);
        query = query.or(`assigned_agent_id.eq.${agentId},found_by_agent_id.eq.${agentId}`);
    } else {
        console.log('🔍 Not filtering by agent (role is manager or no agentId)');
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
        query = query.eq('health_status', filters.status);
    }

    // Apply date filters
    if (filters.fromDate) {
        query = query.gte('submitted_at', filters.fromDate);
    }

    if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('submitted_at', toDate.toISOString());
    }

    // Apply search filter
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply sorting
    if (sortKey && sortDir && sortDir !== 'none') {
        query = query.order(sortKey, { ascending: sortDir === 'asc' });
    } else {
        // Default sort by submitted_at desc
        query = query.order('submitted_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    console.log('🔍 Executing query...');
    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Error fetching leads:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
    }

    console.log('✅ Query successful! Found', count, 'total leads, returning', data?.length, 'items');
    console.log('📋 Lead data:', data);

    return {
        items: data || [],
        total: count || 0
    };
}

export async function getLead(id) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching lead:', error);
        throw error;
    }
    
    return data;
}

export async function createLead(leadData) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

    if (error) {
        console.error('Error creating lead:', error);
        throw error;
    }

    // Log the lead creation activity
    try {
        await createLeadActivity({
            lead_id: data.id,
            activity_type: 'lead_created',
            description: `Lead submitted via ${leadData.source || 'unknown source'}`,
            metadata: {
                source: leadData.source,
                initial_status: data.health_status || 'new',
                assigned_to: leadData.assigned_agent_id
            },
            performed_by: leadData.assigned_agent_id || leadData.found_by_agent_id,
            performed_by_name: null // Will be populated by trigger if needed
        });
    } catch (activityError) {
        console.error('⚠️ Failed to log lead creation activity:', activityError);
        // Don't throw - lead was created successfully
    }

    return data;
}

export async function updateLead(id, leadData) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating lead:', error);
        throw error;
    }
    
    return data;
}

/**
 * Agents API (uses users table with role filter)
 */
export async function getAgents() {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'AGENT')
        .eq('active', true)
        .order('name');
    
    if (error) {
        console.error('Error fetching agents:', error);
        throw error;
    }
    
    // Map to expected format (id, name, email, etc.)
    return data || [];
}

export async function getAgent(id) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'AGENT')
        .single();
    
    if (error) {
        console.error('Error fetching agent:', error);
        throw error;
    }
    
    return data;
}

/**
 * Properties API
 */
export async function getProperties({ search, market, minPrice, maxPrice, beds, amenities } = {}) {
    const supabase = getSupabase();
    
    let query = supabase
        .from('properties')
        .select('*');
    
    // Apply filters
    if (market && market !== 'all') {
        query = query.eq('market', market);
    }
    
    if (search) {
        query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }
    
    if (minPrice) {
        query = query.gte('rent_min', parseInt(minPrice));
    }
    
    if (maxPrice) {
        query = query.lte('rent_max', parseInt(maxPrice));
    }
    
    if (beds && beds !== 'any') {
        const bedsNum = parseInt(beds);
        query = query.lte('beds_min', bedsNum).gte('beds_max', bedsNum);
    }
    
    query = query.order('name');
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching properties:', error);
        throw error;
    }
    
    return data || [];
}

export async function getProperty(id) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching property:', error);
        throw error;
    }

    return data;
}

export async function createProperty(propertyData) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

    if (error) {
        console.error('Error creating property:', error);
        throw error;
    }

    return data;
}

export async function updateProperty(id, propertyData) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating property:', error);
        throw error;
    }

    return data;
}

export async function deleteProperty(id) {
    const supabase = getSupabase();

    console.log('🗑️ deleteProperty called with id:', id);

    const { data, error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .select();

    if (error) {
        console.error('❌ Error deleting property:', error);
        throw error;
    }

    console.log('✅ Property deleted successfully:', data);
    return { success: true, data };
}

/**
 * Lead Notes API
 */
export async function getLeadNotes(leadId) {
    console.log('🔵 getLeadNotes called with leadId:', leadId);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching lead notes:', error);
        throw error;
    }

    console.log('✅ getLeadNotes returning:', data);
    return data || [];
}

export async function createLeadNote(noteData) {
    console.log('🔵 createLeadNote called with:', noteData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_notes')
        .insert([noteData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating lead note:', error);
        console.error('Error details:', error);
        throw error;
    }

    console.log('✅ createLeadNote returning:', data);

    // Log activity
    try {
        await createLeadActivity({
            lead_id: noteData.lead_id,
            activity_type: 'note_added',
            description: 'Added internal note',
            metadata: {
                note_id: data.id,
                note_preview: noteData.content.substring(0, 100),
                note_length: noteData.content.length
            },
            performed_by: noteData.author_id,
            performed_by_name: noteData.author_name
        });
    } catch (activityError) {
        console.error('⚠️ Failed to log note activity:', activityError);
        // Don't throw - note was created successfully
    }

    return data;
}

export async function getLeadNotesCount(leadId) {
    const supabase = getSupabase();

    const { count, error } = await supabase
        .from('lead_notes')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', leadId);

    if (error) {
        console.error('Error fetching lead notes count:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Lead Activities API
 */
export async function getLeadActivities(leadId) {
    console.log('🔵 getLeadActivities called with leadId:', leadId);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching lead activities:', error);
        throw error;
    }

    console.log('✅ getLeadActivities returning:', data);
    return data || [];
}

export async function createLeadActivity(activityData) {
    console.log('🔵 createLeadActivity called with:', activityData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_activities')
        .insert([activityData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating lead activity:', error);
        throw error;
    }

    console.log('✅ createLeadActivity returning:', data);
    return data;
}

/**
 * Property Activities API
 */
export async function getPropertyActivities(propertyId) {
    console.log('🔵 getPropertyActivities called with propertyId:', propertyId);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('property_activities')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching property activities:', error);
        throw error;
    }

    console.log('✅ getPropertyActivities returning:', data);
    return data || [];
}

export async function createPropertyActivity(activityData) {
    console.log('🔵 createPropertyActivity called with:', activityData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('property_activities')
        .insert([activityData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating property activity:', error);
        throw error;
    }

    console.log('✅ createPropertyActivity returning:', data);
    return data;
}

/**
 * Property Notes API
 */
export async function getPropertyNotes(propertyId) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('property_notes')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching property notes:', error);
        throw error;
    }

    return data || [];
}

export async function createPropertyNote(noteData) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('property_notes')
        .insert([noteData])
        .select()
        .single();

    if (error) {
        console.error('Error creating property note:', error);
        throw error;
    }

    // Log activity
    try {
        await createPropertyActivity({
            property_id: noteData.property_id,
            activity_type: 'note_added',
            description: 'Added property note',
            metadata: {
                note_id: data.id,
                note_preview: noteData.content.substring(0, 100),
                note_length: noteData.content.length
            },
            performed_by: noteData.author_id,
            performed_by_name: noteData.author_name
        });
    } catch (activityError) {
        console.error('⚠️ Failed to log property note activity:', activityError);
        // Don't throw - note was created successfully
    }

    return data;
}

export async function deletePropertyNote(noteId) {
    const supabase = getSupabase();

    const { error } = await supabase
        .from('property_notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error('Error deleting property note:', error);
        throw error;
    }

    return { success: true };
}

/**
 * Specials API
 */
export async function getSpecials({ role, agentId, search, sortKey, sortDir, page = 1, pageSize = 10 } = {}) {
    const supabase = getSupabase();
    
    let query = supabase
        .from('specials')
        .select('*', { count: 'exact' });
    
    // Filter by active
    query = query.eq('active', true);
    
    // Apply search
    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,property_name.ilike.%${search}%`);
    }
    
    // Apply sorting
    if (sortKey && sortDir && sortDir !== 'none') {
        query = query.order(sortKey, { ascending: sortDir === 'asc' });
    } else {
        query = query.order('valid_until', { ascending: false });
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
        console.error('Error fetching specials:', error);
        throw error;
    }
    
    return {
        items: data || [],
        total: count || 0
    };
}

export async function createSpecial(specialData) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('specials')
        .insert([specialData])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating special:', error);
        throw error;
    }
    
    return data;
}

export async function updateSpecial(id, specialData) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
        .from('specials')
        .update(specialData)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating special:', error);
        throw error;
    }
    
    return data;
}

export async function deleteSpecial(id) {
    const supabase = getSupabase();
    
    const { error } = await supabase
        .from('specials')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting special:', error);
        throw error;
    }
    
    return { success: true };
}

