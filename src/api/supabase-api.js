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

export async function updateLead(id, leadData, performedBy = null, performedByName = null) {
    const supabase = getSupabase();

    // Get current lead data to compare changes
    const { data: currentLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

    // Update the lead
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

    // Log activities for changes
    try {
        const activities = [];

        // Check for agent assignment change
        if (leadData.assigned_agent_id !== undefined &&
            currentLead.assigned_agent_id !== leadData.assigned_agent_id) {

            const isAssignment = leadData.assigned_agent_id !== null;
            const activityType = isAssignment ? 'agent_assigned' : 'agent_unassigned';
            const description = isAssignment
                ? `Agent assigned: ${performedByName || 'Unknown'}`
                : `Agent unassigned`;

            activities.push(createLeadActivity({
                lead_id: id,
                activity_type: activityType,
                description: description,
                metadata: {
                    previous_agent_id: currentLead.assigned_agent_id,
                    new_agent_id: leadData.assigned_agent_id,
                    changed_by: performedBy,
                    changed_by_name: performedByName
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            }));
        }

        // Check for health status change
        if (leadData.health_status !== undefined &&
            currentLead.health_status !== leadData.health_status) {

            activities.push(createLeadActivity({
                lead_id: id,
                activity_type: 'health_status_changed',
                description: `Health status changed from ${currentLead.health_status} to ${leadData.health_status}`,
                metadata: {
                    previous_status: currentLead.health_status,
                    new_status: leadData.health_status,
                    previous_score: currentLead.health_score,
                    new_score: leadData.health_score,
                    auto_calculated: leadData.auto_calculated || false
                },
                performed_by: performedBy || 'system',
                performed_by_name: performedByName || 'Automated System'
            }));
        }

        // Check for preferences update
        if (leadData.preferences !== undefined &&
            currentLead.preferences !== leadData.preferences) {

            // Parse old and new preferences to detect changes
            let oldPrefs = {};
            let newPrefs = {};

            try {
                oldPrefs = typeof currentLead.preferences === 'string'
                    ? JSON.parse(currentLead.preferences)
                    : (currentLead.preferences || {});
                newPrefs = typeof leadData.preferences === 'string'
                    ? JSON.parse(leadData.preferences)
                    : (leadData.preferences || {});
            } catch (e) {
                console.warn('Could not parse preferences for comparison');
            }

            // Detect specific changes
            const changes = {};
            const allKeys = new Set([...Object.keys(oldPrefs), ...Object.keys(newPrefs)]);

            allKeys.forEach(key => {
                if (JSON.stringify(oldPrefs[key]) !== JSON.stringify(newPrefs[key])) {
                    changes[key] = {
                        old: oldPrefs[key],
                        new: newPrefs[key]
                    };
                }
            });

            if (Object.keys(changes).length > 0) {
                activities.push(createLeadActivity({
                    lead_id: id,
                    activity_type: 'preferences_updated',
                    description: 'Lead preferences updated',
                    metadata: {
                        changes: changes,
                        updated_by: performedBy,
                        updated_by_name: performedByName
                    },
                    performed_by: performedBy,
                    performed_by_name: performedByName
                }));
            }
        }

        // Wait for all activities to be created
        await Promise.all(activities);

    } catch (activityError) {
        console.error('⚠️ Failed to log update activity:', activityError);
        // Don't throw - update was successful
    }

    return data;
}

/**
 * Users API
 */
export async function getUsers() {
    try {
        console.log('📋 Fetching users from Supabase auth...');

        // Call our serverless function to list users
        const response = await fetch('/api/list-users');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch users');
        }

        const result = await response.json();
        console.log('✅ Loaded users from Supabase:', result.users?.length || 0);
        return result.users || [];
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
    }
}

export async function getUser(userId) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
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

    // Transform map_lat/map_lng to lat/lng for backward compatibility with map markers
    const properties = (data || []).map(prop => ({
        ...prop,
        lat: prop.map_lat,
        lng: prop.map_lng
    }));

    return properties;
}

/**
 * Floor Plans API
 */
export async function getFloorPlans(propertyId = null) {
    const supabase = getSupabase();

    let query = supabase
        .from('floor_plans')
        .select('*');

    if (propertyId) {
        query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query.order('beds').order('baths');

    if (error) {
        console.error('Error fetching floor plans:', error);
        throw error;
    }

    return data || [];
}

export async function getFloorPlanById(id) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching floor plan:', error);
        throw error;
    }

    return data;
}

/**
 * Units API
 */
export async function getUnits({
    propertyId = null,
    propertyIds = null, // NEW: Batch query support
    floorPlanId = null,
    availableOnly = false,
    isActive = true // NEW: Soft delete support (null = all, true = active only, false = inactive only)
} = {}) {
    const supabase = getSupabase();

    let query = supabase
        .from('units')
        .select(`
            *,
            floor_plan:floor_plans(*)
        `);

    // Single property query
    if (propertyId) {
        query = query.eq('property_id', propertyId);
    }

    // Batch property query (for performance)
    if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
        query = query.in('property_id', propertyIds);
    }

    if (floorPlanId) {
        query = query.eq('floor_plan_id', floorPlanId);
    }

    if (availableOnly) {
        query = query.eq('is_available', true).eq('status', 'available');
    }

    // Soft delete filter
    if (isActive !== null) {
        query = query.eq('is_active', isActive);
    }

    const { data, error } = await query.order('unit_number');

    if (error) {
        console.error('Error fetching units:', error);
        throw error;
    }

    return data || [];
}

export async function getUnitById(id) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('units')
        .select(`
            *,
            floor_plan:floor_plans(*),
            property:properties(*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching unit:', error);
        throw error;
    }

    return data;
}

export async function updateUnit(unitId, updates) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', unitId)
        .select()
        .single();

    if (error) {
        console.error('Error updating unit:', error);
        throw error;
    }

    return data;
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

    // Log the property creation activity
    try {
        await createPropertyActivity({
            property_id: data.id,
            activity_type: 'property_created',
            description: 'Property added to inventory',
            metadata: {
                method: 'manual',
                initial_data: {
                    name: data.name,
                    address: data.address,
                    rent_range: `${data.rent_range_min || 'N/A'} - ${data.rent_range_max || 'N/A'}`,
                    is_pumi: data.is_pumi || false
                }
            },
            performed_by: propertyData.created_by,
            performed_by_name: null // Will be populated from user data if needed
        });
    } catch (activityError) {
        console.error('⚠️ Failed to log property creation activity:', activityError);
        // Don't throw - property was created successfully
    }

    return data;
}

export async function updateProperty(id, propertyData, performedBy = null, performedByName = null) {
    const supabase = getSupabase();

    // Get current property data to compare changes
    const { data: currentProperty } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

    // Update the property
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

    // Log activities for changes
    try {
        const activities = [];
        const changes = {};

        // Track all field changes
        const fieldsToTrack = [
            'name', 'address', 'rent_range_min', 'rent_range_max',
            'bedrooms', 'bathrooms', 'square_feet', 'amenities',
            'description', 'contact_email', 'contact_phone'
        ];

        fieldsToTrack.forEach(field => {
            if (propertyData[field] !== undefined &&
                currentProperty[field] !== propertyData[field]) {
                changes[field] = {
                    old: currentProperty[field],
                    new: propertyData[field]
                };
            }
        });

        // If there are general property changes, log them
        if (Object.keys(changes).length > 0) {
            activities.push(createPropertyActivity({
                property_id: id,
                activity_type: 'property_updated',
                description: 'Property information updated',
                metadata: {
                    changes: changes,
                    updated_by: performedBy,
                    updated_by_name: performedByName,
                    timestamp: new Date().toISOString()
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            }));
        }

        // Check for availability change (special tracking)
        if (propertyData.is_available !== undefined &&
            currentProperty.is_available !== propertyData.is_available) {

            activities.push(createPropertyActivity({
                property_id: id,
                activity_type: 'availability_changed',
                description: `Property marked as ${propertyData.is_available ? 'available' : 'unavailable'}`,
                metadata: {
                    previous_status: currentProperty.is_available,
                    new_status: propertyData.is_available,
                    changed_by: performedBy,
                    changed_by_name: performedByName
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            }));
        }

        // Check for PUMI status change (special tracking)
        if (propertyData.is_pumi !== undefined &&
            currentProperty.is_pumi !== propertyData.is_pumi) {

            activities.push(createPropertyActivity({
                property_id: id,
                activity_type: 'pumi_status_changed',
                description: `PUMI status changed to ${propertyData.is_pumi ? 'Yes' : 'No'}`,
                metadata: {
                    previous_status: currentProperty.is_pumi,
                    new_status: propertyData.is_pumi,
                    changed_by: performedBy,
                    changed_by_name: performedByName
                },
                performed_by: performedBy,
                performed_by_name: performedByName
            }));
        }

        // Wait for all activities to be created
        await Promise.all(activities);

    } catch (activityError) {
        console.error('⚠️ Failed to log property update activity:', activityError);
        // Don't throw - update was successful
    }

    return data;
}

export async function updatePropertyContact(contactData) {
    const supabase = getSupabase();

    const { community_name, address, contact_name, contact_email, contact_phone, office_hours, contact_notes } = contactData;

    // Build update object - only include fields that are provided
    const updateData = {
        updated_at: new Date().toISOString()
    };

    // If address is provided, update both the combined address field and parse into separate fields
    if (address !== undefined && address) {
        updateData.address = address;

        // Try to parse the address into separate fields for consistency
        // Expected format: "Street, City, State Zip"
        const addressParts = address.split(',').map(p => p.trim());
        if (addressParts.length >= 2) {
            updateData.street_address = addressParts[0]; // First part is street
            updateData.city = addressParts[1]; // Second part is city

            // Third part might be "State Zip"
            if (addressParts.length >= 3) {
                const stateZip = addressParts[2].trim().split(/\s+/);
                if (stateZip.length >= 1) updateData.state = stateZip[0];
                if (stateZip.length >= 2) updateData.zip_code = stateZip[1];
            }
        }
    }

    if (contact_name !== undefined) updateData.contact_name = contact_name;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (office_hours !== undefined) updateData.office_hours = office_hours;
    if (contact_notes !== undefined) updateData.contact_notes = contact_notes;

    // Update all properties with this community name
    const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('community_name', community_name)
        .select();

    if (error) {
        console.error('Error updating property contact:', error);
        throw error;
    }

    // Log property activity
    if (data && data.length > 0) {
        try {
            await logPropertyActivity({
                property_id: data[0].id,
                activity_type: 'contact_info_updated',
                description: `Contact information updated for ${community_name}`,
                metadata: {
                    community_name: community_name,
                    address_updated: !!address,
                    contact_name,
                    contact_email,
                    contact_phone,
                    office_hours,
                    has_notes: !!contact_notes
                }
            });
        } catch (activityError) {
            console.error('Error logging property activity:', activityError);
            // Don't throw - contact update was successful
        }
    }

    return data;
}

export async function logPropertyActivity(activityData) {
    const supabase = getSupabase();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
        .from('property_activities')
        .insert({
            property_id: activityData.property_id,
            activity_type: activityData.activity_type,
            description: activityData.description,
            metadata: activityData.metadata || {},
            performed_by: userId
        })
        .select();

    if (error) {
        console.error('Error logging property activity:', error);
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
 * OPTIMIZED: Batch fetch notes counts for multiple leads
 * @param {Array<string>} leadIds - Array of lead IDs
 * @returns {Promise<Object>} Map of leadId -> count
 */
export async function getBatchLeadNotesCounts(leadIds) {
    if (!leadIds || leadIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_notes')
        .select('lead_id')
        .in('lead_id', leadIds);

    if (error) {
        console.error('Error fetching batch lead notes counts:', error);
        return {};
    }

    // Count notes per lead
    const countsMap = {};
    leadIds.forEach(id => countsMap[id] = 0); // Initialize all to 0

    if (data) {
        data.forEach(note => {
            countsMap[note.lead_id] = (countsMap[note.lead_id] || 0) + 1;
        });
    }

    return countsMap;
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

/**
 * OPTIMIZED: Batch fetch activities for multiple leads
 * @param {Array<string>} leadIds - Array of lead IDs
 * @returns {Promise<Object>} Map of leadId -> activities array
 */
export async function getBatchLeadActivities(leadIds) {
    if (!leadIds || leadIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching batch lead activities:', error);
        return {};
    }

    // Group activities by lead_id
    const activitiesMap = {};
    leadIds.forEach(id => activitiesMap[id] = []); // Initialize all to empty array

    if (data) {
        data.forEach(activity => {
            if (!activitiesMap[activity.lead_id]) {
                activitiesMap[activity.lead_id] = [];
            }
            activitiesMap[activity.lead_id].push(activity);
        });
    }

    return activitiesMap;
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
 * Inactivity Detection System
 * Checks for inactive leads and updates health status
 * Rules:
 * - 36 hours no activity → Yellow (if currently Green)
 * - 72 hours no activity → Red (if currently Yellow or Green)
 */
export async function detectInactiveLeads() {
    console.log('🔍 Starting inactivity detection...');
    const supabase = getSupabase();

    const now = new Date();
    const thirtyNineSixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    try {
        // Get all active leads (not closed or lost)
        const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, health_status, health_score, name, email')
            .not('health_status', 'in', '("closed","lost")');

        if (leadsError) {
            console.error('❌ Error fetching leads:', leadsError);
            throw leadsError;
        }

        console.log(`📊 Checking ${leads.length} active leads for inactivity...`);

        const updates = [];

        for (const lead of leads) {
            // Note: last_activity_at column does not exist in leads table
            // Calculate last activity from lead_activities table instead

            // Get the last NON-inactivity activity
            const { data: lastRealActivityRecord } = await supabase
                .from('lead_activities')
                .select('created_at')
                .eq('lead_id', lead.id)
                .neq('activity_type', 'inactivity_detected')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // If no real activity found, use lead creation date as fallback
            const lastRealActivity = lastRealActivityRecord
                ? new Date(lastRealActivityRecord.created_at)
                : new Date(0); // Very old date if no activities

            const hoursSinceRealActivity = (now - lastRealActivity) / (1000 * 60 * 60);

            // Rule 1: 72+ hours → Red
            if (hoursSinceRealActivity >= 72 && lead.health_status !== 'red') {
                console.log(`🚨 Lead ${lead.id} (${lead.name}) - ${hoursSinceRealActivity.toFixed(1)}h inactive → RED`);

                updates.push(
                    // Create inactivity activity
                    createLeadActivity({
                        lead_id: lead.id,
                        activity_type: 'inactivity_detected',
                        description: 'No activity detected in past 72 hours - Critical',
                        metadata: {
                            hours_since_last_activity: Math.floor(hoursSinceRealActivity),
                            last_activity_date: lastRealActivity.toISOString(),
                            previous_health_status: lead.health_status,
                            new_health_status: 'red',
                            severity: 'critical'
                        },
                        performed_by: 'system',
                        performed_by_name: 'Automated Inactivity Detection'
                    }),
                    // Update lead health status
                    updateLead(lead.id, {
                        health_status: 'red',
                        health_score: Math.max(0, (lead.health_score || 100) - 30),
                        health_updated_at: now.toISOString(),
                        auto_calculated: true
                    }, 'system', 'Automated System')
                );
            }
            // Rule 2: 36+ hours → Yellow (only if currently green)
            else if (hoursSinceRealActivity >= 36 && lead.health_status === 'green') {
                console.log(`⚠️ Lead ${lead.id} (${lead.name}) - ${hoursSinceRealActivity.toFixed(1)}h inactive → YELLOW`);

                updates.push(
                    // Create inactivity activity
                    createLeadActivity({
                        lead_id: lead.id,
                        activity_type: 'inactivity_detected',
                        description: 'No activity detected in past 36 hours - Needs attention',
                        metadata: {
                            hours_since_last_activity: Math.floor(hoursSinceRealActivity),
                            last_activity_date: lastRealActivity.toISOString(),
                            previous_health_status: lead.health_status,
                            new_health_status: 'yellow',
                            severity: 'warning'
                        },
                        performed_by: 'system',
                        performed_by_name: 'Automated Inactivity Detection'
                    }),
                    // Update lead health status
                    updateLead(lead.id, {
                        health_status: 'yellow',
                        health_score: Math.max(0, (lead.health_score || 100) - 15),
                        health_updated_at: now.toISOString(),
                        auto_calculated: true
                    }, 'system', 'Automated System')
                );
            }
        }

        // Execute all updates
        await Promise.all(updates);

        console.log(`✅ Inactivity detection complete. Processed ${updates.length / 2} leads.`);

        return {
            success: true,
            total_leads_checked: leads.length,
            leads_updated: updates.length / 2,
            timestamp: now.toISOString()
        };

    } catch (error) {
        console.error('❌ Error in inactivity detection:', error);
        throw error;
    }
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
 * Floor Plans API
 */
export async function createFloorPlan(floorPlanData) {
    console.log('🔵 createFloorPlan called with:', floorPlanData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('floor_plans')
        .insert([floorPlanData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating floor plan:', error);
        throw error;
    }

    console.log('✅ createFloorPlan returning:', data);
    return data;
}

export async function updateFloorPlan(id, floorPlanData) {
    console.log('🔵 updateFloorPlan called with:', id, floorPlanData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('floor_plans')
        .update(floorPlanData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Error updating floor plan:', error);
        throw error;
    }

    console.log('✅ updateFloorPlan returning:', data);
    return data;
}

export async function deleteFloorPlan(id) {
    console.log('🔵 deleteFloorPlan called with:', id);
    const supabase = getSupabase();

    const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('❌ Error deleting floor plan:', error);
        throw error;
    }

    console.log('✅ deleteFloorPlan completed');
}

/**
 * Units API
 */
export async function createUnit(unitData) {
    console.log('🔵 createUnit called with:', unitData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('units')
        .insert([unitData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating unit:', error);
        throw error;
    }

    console.log('✅ createUnit returning:', data);
    return data;
}

// Note: updateUnit already exists at line 472, so we don't redefine it here

export async function deleteUnit(id) {
    console.log('🔵 deleteUnit called with:', id);
    const supabase = getSupabase();

    const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('❌ Error deleting unit:', error);
        throw error;
    }

    console.log('✅ deleteUnit completed');
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
 * Unit Notes API
 */
export async function getUnitNotes(unitId, { limit = 50, offset = 0 } = {}) {
    console.log('🔵 getUnitNotes called with unitId:', unitId);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('unit_notes')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ Error fetching unit notes:', error);
        throw error;
    }

    console.log('✅ getUnitNotes returning:', data);
    return data || [];
}

/**
 * PERFORMANCE OPTIMIZATION: Batch query for property notes counts
 * Reduces N queries to 1 query for N properties
 *
 * @param {Array<string>} propertyIds - Array of property IDs
 * @returns {Promise<Object>} Map of propertyId -> count
 */
export async function getBatchPropertyNotesCounts(propertyIds) {
    if (!propertyIds || propertyIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('property_notes')
        .select('property_id')
        .in('property_id', propertyIds);

    if (error) {
        console.error('Error fetching batch property notes counts:', error);
        return {};
    }

    // Count notes per property
    const countsMap = {};
    propertyIds.forEach(id => countsMap[id] = 0);

    if (data) {
        data.forEach(note => {
            countsMap[note.property_id] = (countsMap[note.property_id] || 0) + 1;
        });
    }

    return countsMap;
}

/**
 * PERFORMANCE OPTIMIZATION: Batch query for floor plans
 * Reduces N queries to 1 query for N properties
 *
 * @param {Array<string>} propertyIds - Array of property IDs
 * @returns {Promise<Object>} Map of propertyId -> floor plans array
 */
export async function getBatchFloorPlans(propertyIds) {
    if (!propertyIds || propertyIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .in('property_id', propertyIds)
        .order('beds')
        .order('baths');

    if (error) {
        console.error('Error fetching batch floor plans:', error);
        return {};
    }

    // Group floor plans by property_id
    const floorPlansMap = {};
    propertyIds.forEach(id => floorPlansMap[id] = []);

    if (data) {
        data.forEach(floorPlan => {
            if (!floorPlansMap[floorPlan.property_id]) {
                floorPlansMap[floorPlan.property_id] = [];
            }
            floorPlansMap[floorPlan.property_id].push(floorPlan);
        });
    }

    return floorPlansMap;
}

/**
 * PERFORMANCE OPTIMIZATION: Batch query for units with floor plan data
 * Reduces N queries to 1 query for N properties
 *
 * @param {Array<string>} propertyIds - Array of property IDs
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Map of propertyId -> units array
 */
export async function getBatchUnits(propertyIds, { isActive = null } = {}) {
    if (!propertyIds || propertyIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    let query = supabase
        .from('units')
        .select(`
            *,
            floor_plan:floor_plans(*)
        `)
        .in('property_id', propertyIds);

    // Soft delete filter
    if (isActive !== null) {
        query = query.eq('is_active', isActive);
    }

    query = query.order('unit_number');

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching batch units:', error);
        return {};
    }

    // Group units by property_id
    const unitsMap = {};
    propertyIds.forEach(id => unitsMap[id] = []);

    if (data) {
        data.forEach(unit => {
            if (!unitsMap[unit.property_id]) {
                unitsMap[unit.property_id] = [];
            }
            unitsMap[unit.property_id].push(unit);
        });
    }

    return unitsMap;
}

/**
 * PERFORMANCE OPTIMIZATION: Batch query for unit notes counts
 * Reduces N queries to 1 query for N units
 *
 * @param {Array<string>} unitIds - Array of unit IDs
 * @returns {Promise<Object>} Map of unitId -> count
 */
export async function getBatchUnitNotesCounts(unitIds) {
    if (!unitIds || unitIds.length === 0) {
        return {};
    }

    const supabase = getSupabase();

    const { data, error} = await supabase
        .from('unit_notes')
        .select('unit_id')
        .in('unit_id', unitIds);

    if (error) {
        console.error('Error fetching batch unit notes counts:', error);
        return {};
    }

    // Count notes per unit
    const countsMap = {};
    unitIds.forEach(id => countsMap[id] = 0);

    if (data) {
        data.forEach(note => {
            countsMap[note.unit_id] = (countsMap[note.unit_id] || 0) + 1;
        });
    }

    return countsMap;
}

export async function createUnitNote(noteData) {
    console.log('🔵 createUnitNote called with:', noteData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('unit_notes')
        .insert([noteData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating unit note:', error);
        throw error;
    }

    // Log activity
    try {
        await createUnitActivity({
            unit_id: noteData.unit_id,
            property_id: noteData.property_id,
            activity_type: 'note_added',
            description: 'Added unit note',
            metadata: {
                note_id: data.id,
                note_preview: noteData.content.substring(0, 100),
                note_length: noteData.content.length
            },
            performed_by: noteData.author_id,
            performed_by_name: noteData.author_name
        });
    } catch (activityError) {
        console.error('⚠️ Failed to log unit note activity:', activityError);
        // Don't throw - note was created successfully
    }

    console.log('✅ createUnitNote returning:', data);
    return data;
}

export async function deleteUnitNote(noteId) {
    const supabase = getSupabase();

    const { error } = await supabase
        .from('unit_notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error('Error deleting unit note:', error);
        throw error;
    }

    return { success: true };
}

/**
 * Unit Activities API
 */
export async function getUnitActivities(unitId, { limit = 50, offset = 0 } = {}) {
    console.log('🔵 getUnitActivities called with unitId:', unitId);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('unit_activities')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('❌ Error fetching unit activities:', error);
        throw error;
    }

    console.log('✅ getUnitActivities returning:', data);
    return data || [];
}

export async function createUnitActivity(activityData) {
    console.log('🔵 createUnitActivity called with:', activityData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('unit_activities')
        .insert([activityData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating unit activity:', error);
        throw error;
    }

    console.log('✅ createUnitActivity returning:', data);
    return data;
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

/**
 * Bugs API
 */
export async function getBugs({ status, priority, page = 1, pageSize = 50 } = {}) {
    const supabase = getSupabase();

    console.log('🐛 getBugs called with:', { status, priority, page, pageSize });

    let query = supabase
        .from('bugs')
        .select('*', { count: 'exact' });

    // Filter by status
    if (status && status !== '') {
        query = query.eq('status', status);
    }

    // Filter by priority
    if (priority && priority !== '') {
        query = query.eq('priority', priority);
    }

    // Sort by created date (newest first)
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Error fetching bugs:', error);
        throw error;
    }

    console.log('✅ getBugs returning:', { items: data?.length, total: count });

    return {
        items: data || [],
        total: count || 0
    };
}

export async function createBug(bugData) {
    const supabase = getSupabase();

    console.log('🐛 createBug called with:', bugData);

    const { data, error } = await supabase
        .from('bugs')
        .insert([bugData])
        .select()
        .single();

    if (error) {
        console.error('❌ Error creating bug:', error);
        throw error;
    }

    console.log('✅ createBug returning:', data);
    return data;
}

export async function updateBug(bugId, updates) {
    const supabase = getSupabase();

    console.log('🐛 updateBug called with:', { bugId, updates });

    const { data, error } = await supabase
        .from('bugs')
        .update(updates)
        .eq('id', bugId)
        .select()
        .single();

    if (error) {
        console.error('❌ Error updating bug:', error);
        throw error;
    }

    console.log('✅ updateBug returning:', data);
    return data;
}

export async function deleteBug(bugId) {
    const supabase = getSupabase();

    console.log('🐛 deleteBug called with:', bugId);

    const { error } = await supabase
        .from('bugs')
        .delete()
        .eq('id', bugId);

    if (error) {
        console.error('❌ Error deleting bug:', error);
        throw error;
    }

    console.log('✅ deleteBug successful');
    return { success: true };
}

export async function getBug(bugId) {
    const supabase = getSupabase();

    console.log('🐛 getBug called with:', bugId);

    const { data, error } = await supabase
        .from('bugs')
        .select('*')
        .eq('id', bugId)
        .single();

    if (error) {
        console.error('❌ Error fetching bug:', error);
        throw error;
    }

    console.log('✅ getBug returning:', data);
    return data;
}

// ============================================================================
// EMAIL API FUNCTIONS
// ============================================================================

/**
 * Get email templates
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category (optional)
 * @param {boolean} options.activeOnly - Only return active templates (default: true)
 * @returns {Promise<Array>} Array of email templates
 */
export async function getEmailTemplates({ category, activeOnly = true } = {}) {
    const supabase = getSupabase();

    console.log('📧 getEmailTemplates called with:', { category, activeOnly });

    let query = supabase
        .from('email_templates')
        .select('*');

    if (activeOnly) {
        query = query.eq('active', true);
    }

    if (category) {
        query = query.eq('category', category);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error('❌ Error fetching email templates:', error);
        throw error;
    }

    console.log('✅ getEmailTemplates returning:', data?.length, 'templates');
    return data || [];
}

/**
 * Get single email template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Email template
 */
export async function getEmailTemplate(templateId) {
    const supabase = getSupabase();

    console.log('📧 getEmailTemplate called with:', templateId);

    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

    if (error) {
        console.error('❌ Error fetching email template:', error);
        throw error;
    }

    console.log('✅ getEmailTemplate returning:', data);
    return data;
}

/**
 * Get email logs
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.recipientEmail - Filter by recipient email (optional)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 50)
 * @returns {Promise<Object>} { items: Array, total: number }
 */
export async function getEmailLogs({ status, recipientEmail, page = 1, pageSize = 50 } = {}) {
    const supabase = getSupabase();

    console.log('📧 getEmailLogs called with:', { status, recipientEmail, page, pageSize });

    let query = supabase
        .from('email_logs')
        .select('*, sent_by_user:users!email_logs_sent_by_fkey(name)', { count: 'exact' });

    if (status) {
        query = query.eq('status', status);
    }

    if (recipientEmail) {
        query = query.eq('recipient_email', recipientEmail);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Error fetching email logs:', error);
        throw error;
    }

    // Add sent_by_name to each email log
    const items = (data || []).map(log => ({
        ...log,
        sent_by_name: log.sent_by_user?.name || null
    }));

    console.log('✅ getEmailLogs returning:', { items: items.length, total: count });

    return {
        items: items,
        total: count || 0
    };
}

/**
 * Send email via serverless function
 * @param {Object} emailData - Email data
 * @param {string} emailData.templateId - Email template ID
 * @param {string} emailData.recipientEmail - Recipient email
 * @param {string} emailData.recipientName - Recipient name
 * @param {Object} emailData.variables - Template variables
 * @param {Object} emailData.metadata - Additional metadata
 * @param {string} emailData.sentBy - User ID who triggered the email
 * @returns {Promise<Object>} { success: boolean, emailLogId: string, resendId: string }
 */
export async function sendEmail(emailData) {
    console.log('📧 sendEmail called with:', emailData);

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('❌ Error sending email:', result);
            throw new Error(result.error || 'Failed to send email');
        }

        console.log('✅ sendEmail successful:', result);
        return result;

    } catch (error) {
        console.error('❌ Error calling send-email API:', error);
        throw error;
    }
}

// ============================================================================
// SMART MATCH API FUNCTIONS
// ============================================================================

/**
 * Get smart matches for a lead
 * Uses intelligent scoring algorithm to match leads with property units based on:
 * - Lead preferences (bedrooms, bathrooms, price, location, move-in date)
 * - Business priorities (commission percentage, PUMI status)
 *
 * Returns only one unit per property (highest-scoring unit)
 *
 * @param {string} leadId - Lead ID
 * @param {number} limit - Maximum number of properties to return (default: 10)
 * @returns {Promise<Array>} Array of matched units with scores
 */
export async function getSmartMatches(leadId, limit = 10) {
    const supabase = getSupabase();

    console.log('🎯 getSmartMatches called with:', { leadId, limit });

    // Import smart match utility (dynamic import to avoid circular dependencies)
    const { getSmartMatches: calculateSmartMatches } = await import('../utils/smart-match.js');

    // Step 1: Fetch lead with all preferences
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (leadError) {
        console.error('❌ Error fetching lead:', leadError);
        throw leadError;
    }

    if (!lead) {
        console.error('❌ Lead not found:', leadId);
        throw new Error('Lead not found');
    }

    console.log('✅ Lead fetched:', lead.name);

    // Step 2: Fetch all available units with floor_plan and property data
    // Join: units → floor_plans → properties
    const { data: units, error: unitsError } = await supabase
        .from('units')
        .select(`
            *,
            floor_plan:floor_plans(*),
            property:properties(*)
        `)
        .eq('is_available', true)
        .eq('is_active', true)
        .eq('status', 'available');

    if (unitsError) {
        console.error('❌ Error fetching units:', unitsError);
        throw unitsError;
    }

    console.log('✅ Fetched', units?.length || 0, 'available units');

    if (!units || units.length === 0) {
        console.log('⚠️ No available units found');
        return [];
    }

    // Step 3: Transform data structure for smart match algorithm
    const unitsWithDetails = units.map(unit => ({
        unit: {
            id: unit.id,
            unit_number: unit.unit_number,
            floor: unit.floor,
            rent: unit.rent,
            market_rent: unit.market_rent,
            available_from: unit.available_from,
            is_available: unit.is_available,
            status: unit.status,
            notes: unit.notes
        },
        floorPlan: unit.floor_plan,
        property: unit.property
    }));

    // Step 4: Calculate smart matches using scoring algorithm
    const matches = calculateSmartMatches(lead, unitsWithDetails, limit);

    console.log('✅ getSmartMatches returning', matches.length, 'properties');

    // Step 5: Transform results to include all necessary data for display
    // Remove commission_pct and is_pumi from property data (privacy)
    const sanitizedMatches = matches.map(match => {
        const { commission_pct, is_pumi, ...sanitizedProperty } = match.property;

        return {
            unit: match.unit,
            floorPlan: match.floorPlan,
            property: sanitizedProperty,
            matchScore: {
                // Include score breakdown but NOT commission/pumi details
                bedrooms: match.matchScore.bedrooms,
                bathrooms: match.matchScore.bathrooms,
                price: match.matchScore.price,
                location: match.matchScore.location,
                moveInDate: match.matchScore.moveInDate,
                baseScore: match.matchScore.baseScore,
                totalScore: match.matchScore.totalScore
                // Intentionally exclude: commission, pumi, bonusScore
            }
        };
    });

    return sanitizedMatches;
}

/**
 * Get the last Smart Match email send time for a lead
 * Checks email_logs table for the most recent Smart Match email sent to this lead
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object|null>} { sent_at: string, hours_ago: number } or null if never sent
 */
export async function getLastSmartMatchEmailTime(leadId) {
    const supabase = getSupabase();

    console.log('🕐 getLastSmartMatchEmailTime called for lead:', leadId);

    try {
        // Query email_logs for Smart Match emails sent to this lead
        // Filter by template_id = 'smart_match_email' and metadata->>'lead_id' = leadId
        const { data, error } = await supabase
            .from('email_logs')
            .select('sent_at, created_at, status')
            .eq('template_id', 'smart_match_email')
            .eq('metadata->>lead_id', leadId)
            .in('status', ['sent', 'delivered']) // Only count successfully sent emails
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error fetching last Smart Match email time:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('✅ No previous Smart Match email found for lead:', leadId);
            return null;
        }

        const lastEmail = data[0];
        const sentAt = new Date(lastEmail.sent_at || lastEmail.created_at);
        const now = new Date();
        const hoursAgo = (now - sentAt) / (1000 * 60 * 60); // Convert milliseconds to hours

        console.log('✅ Last Smart Match email found:', {
            leadId,
            sent_at: sentAt.toISOString(),
            hours_ago: hoursAgo.toFixed(2),
            status: lastEmail.status
        });

        return {
            sent_at: sentAt.toISOString(),
            hours_ago: hoursAgo,
            status: lastEmail.status
        };

    } catch (error) {
        console.error('❌ Error in getLastSmartMatchEmailTime:', error);
        throw error;
    }
}

/**
 * Check if a lead is within the Smart Match email cooldown period
 * @param {string} leadId - Lead ID
 * @param {number} cooldownHours - Cooldown period in hours (default: 12)
 * @returns {Promise<Object>} { canSend: boolean, lastSent: Object|null, hoursRemaining: number }
 */
export async function checkSmartMatchCooldown(leadId, cooldownHours = 12) {
    console.log('🕐 checkSmartMatchCooldown called for lead:', leadId, 'cooldown:', cooldownHours);

    try {
        const lastEmail = await getLastSmartMatchEmailTime(leadId);

        if (!lastEmail) {
            // Never sent before - can send
            return {
                canSend: true,
                lastSent: null,
                hoursRemaining: 0
            };
        }

        const hoursRemaining = Math.max(0, cooldownHours - lastEmail.hours_ago);
        const canSend = lastEmail.hours_ago >= cooldownHours;

        console.log('✅ Cooldown check result:', {
            leadId,
            canSend,
            hours_ago: lastEmail.hours_ago.toFixed(2),
            hours_remaining: hoursRemaining.toFixed(2)
        });

        return {
            canSend,
            lastSent: lastEmail,
            hoursRemaining
        };

    } catch (error) {
        console.error('❌ Error in checkSmartMatchCooldown:', error);
        // On error, allow sending (fail open)
        return {
            canSend: true,
            lastSent: null,
            hoursRemaining: 0,
            error: error.message
        };
    }
}

/**
 * Send Smart Match email to a lead
 * Fetches top Smart Match properties and sends personalized email
 *
 * @param {string} leadId - Lead ID
 * @param {Object} options - Email options
 * @param {number} options.propertyCount - Number of properties to include (default: 5, max: 6)
 * @param {string} options.sentBy - User ID who triggered the email
 * @param {boolean} options.skipCooldownCheck - Skip cooldown check (default: false)
 * @returns {Promise<Object>} { success: boolean, emailLogId: string, resendId: string }
 */
export async function sendSmartMatchEmail(leadId, options = {}) {
    const supabase = getSupabase();
    const { propertyCount = 5, sentBy, skipCooldownCheck = false } = options;

    console.log('📧 sendSmartMatchEmail called with:', { leadId, propertyCount, sentBy, skipCooldownCheck });

    // Validate property count (max 6)
    const validPropertyCount = Math.min(Math.max(propertyCount, 1), 6);

    try {
        // Step 0: Check cooldown (unless explicitly skipped)
        if (!skipCooldownCheck) {
            const cooldownCheck = await checkSmartMatchCooldown(leadId);
            if (!cooldownCheck.canSend) {
                const hoursRemaining = cooldownCheck.hoursRemaining.toFixed(1);
                console.warn(`⏳ Lead ${leadId} is in cooldown period. ${hoursRemaining} hours remaining.`);
                return {
                    success: false,
                    skipped: true,
                    reason: 'cooldown',
                    hoursRemaining: cooldownCheck.hoursRemaining,
                    message: `Lead is in cooldown period. Please wait ${hoursRemaining} more hours.`
                };
            }
        }

        // Step 1: Fetch lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) {
            console.error('❌ Error fetching lead:', leadError);
            throw new Error('Lead not found');
        }

        // Step 2: Fetch assigned agent
        let agent = null;
        if (lead.assigned_agent_id) {
            const { data: agentData, error: agentError } = await supabase
                .from('users')
                .select('*')
                .eq('id', lead.assigned_agent_id)
                .single();

            if (!agentError && agentData) {
                agent = agentData;
            }
        }

        // Fallback to current user if no agent assigned
        if (!agent && sentBy) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', sentBy)
                .single();

            if (!userError && userData) {
                agent = userData;
            }
        }

        // Step 3: Get Smart Match properties (unsanitized - we need commission/PUMI for email generation)
        const { getSmartMatches: calculateSmartMatches } = await import('../utils/smart-match.js');

        const { data: units, error: unitsError } = await supabase
            .from('units')
            .select(`
                *,
                floor_plan:floor_plans(*),
                property:properties(*)
            `)
            .eq('is_available', true)
            .eq('is_active', true)
            .eq('status', 'available');

        if (unitsError) {
            console.error('❌ Error fetching units:', unitsError);
            throw unitsError;
        }

        if (!units || units.length === 0) {
            throw new Error('No available properties found');
        }

        const unitsWithDetails = units.map(unit => ({
            unit: {
                id: unit.id,
                unit_number: unit.unit_number,
                floor: unit.floor,
                rent: unit.rent,
                market_rent: unit.market_rent,
                available_from: unit.available_from,
                is_available: unit.is_available,
                status: unit.status,
                notes: unit.notes
            },
            floorPlan: unit.floor_plan,
            property: unit.property
        }));

        const matches = calculateSmartMatches(lead, unitsWithDetails, validPropertyCount);

        if (matches.length === 0) {
            throw new Error('No matching properties found for this lead');
        }

        console.log('✅ Found', matches.length, 'Smart Match properties');

        // Step 4: Generate email content using smart-match-email utility
        const { generateSmartMatchEmail, validateSmartMatchEmailData } = await import('../utils/smart-match-email.js');

        // Validate data before generating email
        const validation = validateSmartMatchEmailData(lead, matches, agent);
        if (!validation.valid) {
            console.error('❌ Email data validation failed:', validation.errors);
            throw new Error(`Email data validation failed: ${validation.errors.join(', ')}`);
        }

        const emailContent = generateSmartMatchEmail(lead, matches, agent);

        // Step 5: Send email via sendEmail function
        const emailData = {
            templateId: emailContent.templateId,
            recipientEmail: lead.email,
            recipientName: lead.name,
            variables: emailContent.variables,
            metadata: {
                lead_id: leadId,
                agent_id: agent?.id || null,
                email_type: 'smart_match',
                property_count: matches.length,
                property_ids: matches.map(m => m.property.id)
            },
            sentBy: sentBy || null
        };

        const result = await sendEmail(emailData);

        console.log('✅ Smart Match email sent successfully:', result);

        // Step 6: Log activity to lead_activities
        if (result.success) {
            await createLeadActivity({
                lead_id: leadId,
                activity_type: 'email_sent',
                activity_description: `Smart Match email sent with ${matches.length} properties`,
                performed_by: sentBy || null,
                metadata: {
                    email_log_id: result.emailLogId,
                    property_count: matches.length
                }
            });
        }

        return result;

    } catch (error) {
        console.error('❌ Error sending Smart Match email:', error);
        throw error;
    }
}

