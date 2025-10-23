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

    const { community_name, contact_name, contact_email, contact_phone, office_hours, contact_notes } = contactData;

    // Update all properties with this community name
    const { data, error } = await supabase
        .from('properties')
        .update({
            contact_name,
            contact_email,
            contact_phone,
            office_hours,
            contact_notes,
            updated_at: new Date().toISOString()
        })
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
                community_name: community_name,
                activity_type: 'contact_info_updated',
                description: `Contact information updated for ${community_name}`,
                metadata: {
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
            community_name: activityData.community_name,
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
            .select('id, health_status, health_score, last_activity_at, name, email')
            .not('health_status', 'in', '("closed","lost")');

        if (leadsError) {
            console.error('❌ Error fetching leads:', leadsError);
            throw leadsError;
        }

        console.log(`📊 Checking ${leads.length} active leads for inactivity...`);

        const updates = [];

        for (const lead of leads) {
            const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(0);
            const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

            // Get the last activity to check if it was an inactivity_detected event
            const { data: lastActivityRecord } = await supabase
                .from('lead_activities')
                .select('activity_type, created_at')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Skip if last activity was an inactivity_detected event (don't count those)
            const lastRealActivity = lastActivityRecord?.activity_type === 'inactivity_detected'
                ? new Date(lastActivityRecord.created_at)
                : lastActivity;

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

export async function updateUnit(id, unitData) {
    console.log('🔵 updateUnit called with:', id, unitData);
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from('units')
        .update(unitData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Error updating unit:', error);
        throw error;
    }

    console.log('✅ updateUnit returning:', data);
    return data;
}

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

