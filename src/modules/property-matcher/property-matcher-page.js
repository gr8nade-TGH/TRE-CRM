/**
 * Property Matcher Page - Public-facing "My Matches" page
 * Allows leads to view matched properties, select favorites, and schedule tours
 */

// State
let sessionData = null;
let selectedProperties = new Map(); // propertyId -> { selected: boolean, tourDate: string, unitId: string }

/**
 * Initialize the Property Matcher page
 */
async function init() {
    console.log('🏡 Initializing Property Matcher page...');

    // Get token from URL
    const token = getTokenFromURL();

    if (!token) {
        showError('Invalid Link', 'This link appears to be invalid. Please check the URL and try again.');
        return;
    }

    console.log('Token:', token);

    // Load session data
    try {
        await loadSession(token);
        await renderPage();
    } catch (error) {
        console.error('Error loading session:', error);
        showError('Unable to Load Matches', error.message || 'Please contact your agent for assistance.');
    }
}

/**
 * Get token from URL path
 * Expected format: /matches.html?token=PM-JD123 or /matches/PM-JD123
 */
function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
        return tokenParam;
    }

    // Try to get from hash (if using hash routing)
    const hash = window.location.hash;
    if (hash && hash.includes('PM-')) {
        const match = hash.match(/PM-[A-Z0-9]+/);
        return match ? match[0] : null;
    }

    // Try to get from pathname
    const pathname = window.location.pathname;
    const match = pathname.match(/PM-[A-Z0-9]+/);
    return match ? match[0] : null;
}

/**
 * Load session data from Supabase
 */
async function loadSession(token) {
    console.log('📡 Loading session for token:', token);

    const { data, error } = await window.supabase
        .from('smart_match_sessions')
        .select(`
            *,
            lead:leads(id, name, email, preferences)
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error) {
        console.error('Session load error:', error);
        if (error.code === 'PGRST116') {
            throw new Error('This link has expired or is invalid. Please contact your agent for a new link.');
        }
        throw new Error('Unable to load your matches. Please try again later.');
    }

    if (!data) {
        throw new Error('Session not found or has expired.');
    }

    sessionData = data;
    console.log('✅ Session loaded:', sessionData);

    // Mark session as viewed
    await markViewed(sessionData.id);

    // Load property details
    await loadProperties();
}

/**
 * Mark session as viewed and create activity log
 */
async function markViewed(sessionId) {
    const { error } = await window.supabase
        .from('smart_match_sessions')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', sessionId);

    if (error) {
        console.warn('Error marking session as viewed:', error);
    } else {
        console.log('✅ Session marked as viewed');
    }

    // Create activity log entry
    try {
        await window.supabase
            .from('lead_activities')
            .insert({
                lead_id: sessionData.lead_id,
                activity_type: 'property_matcher_viewed',
                description: `${sessionData.lead?.name || 'Lead'} opened their "My Matches" page`,
                metadata: {
                    session_id: sessionId,
                    token: sessionData.token,
                    property_count: sessionData.property_ids?.length || 0
                },
                performed_by: null,
                performed_by_name: sessionData.lead?.name || 'Lead'
            });
        console.log('✅ Activity log created for session view');
    } catch (activityError) {
        console.warn('⚠️ Error creating activity log:', activityError);
    }
}

/**
 * Load property details for all properties in session
 */
async function loadProperties() {
    // The column is 'properties_sent' (JSONB array), not 'property_ids'
    const propertyIds = sessionData.properties_sent || [];

    if (propertyIds.length === 0) {
        throw new Error('No properties found in this match.');
    }

    console.log('📡 Loading properties:', propertyIds);

    // Load properties with their units and floor plans
    const { data: properties, error } = await window.supabase
        .from('properties')
        .select(`
            *,
            units(
                id,
                unit_number,
                floor_plan_id,
                rent,
                available_date,
                status,
                floor_plans(
                    id,
                    name,
                    bedrooms,
                    bathrooms,
                    square_feet,
                    starting_at
                )
            )
        `)
        .in('id', propertyIds);

    if (error) {
        console.error('Error loading properties:', error);
        throw new Error('Unable to load property details.');
    }

    sessionData.properties = properties || [];
    console.log('✅ Loaded properties:', sessionData.properties);

    // Log activity for each property being viewed (only once per session)
    try {
        for (const property of properties) {
            await window.supabase
                .from('property_activities')
                .insert({
                    property_id: property.id,
                    activity_type: 'viewed_by_lead',
                    description: `${sessionData.lead?.name || 'Lead'} viewed property on Property Matcher page`,
                    metadata: {
                        lead_id: sessionData.lead_id,
                        lead_name: sessionData.lead?.name,
                        session_id: sessionData.id,
                        token: sessionData.token,
                        view_type: 'property_matcher'
                    },
                    performed_by: null,
                    performed_by_name: sessionData.lead?.name || 'Lead'
                });
        }
        console.log('✅ Activity logged for property views');
    } catch (activityError) {
        console.warn('⚠️ Error logging property view activity:', activityError);
    }
}

/**
 * Render the page with session data
 */
async function renderPage() {
    const content = document.getElementById('content');

    const leadName = sessionData.lead?.name || 'there';
    const propertyCount = sessionData.properties?.length || 0;

    content.innerHTML = `
        <div class="greeting">Hi ${leadName}! 👋</div>
        
        <div class="intro">
            <p><strong>Great news!</strong> We've found ${propertyCount} properties that match your preferences.</p>
            <p>Select the ones you're interested in and let us know when you'd like to tour them!</p>
        </div>

        <div id="propertiesList"></div>

        <div class="actions">
            <button class="btn btn-primary" id="submitBtn" disabled>
                📅 Schedule My Tours
            </button>
            <button class="btn btn-secondary" id="moreOptionsBtn">
                🔄 Send Me More Options
            </button>
        </div>
    `;

    // Render properties
    renderProperties();

    // Setup event listeners
    setupEventListeners();
}

/**
 * Render property cards
 */
function renderProperties() {
    const propertiesList = document.getElementById('propertiesList');

    if (!sessionData.properties || sessionData.properties.length === 0) {
        propertiesList.innerHTML = '<p>No properties available.</p>';
        return;
    }

    propertiesList.innerHTML = sessionData.properties.map(property => {
        // Get best available unit
        const availableUnits = property.units?.filter(u => u.status === 'available') || [];
        const unit = availableUnits[0];
        const floorPlan = unit?.floor_plans;

        const rent = unit?.rent || floorPlan?.starting_at || 0;
        const marketRent = unit?.market_rent || floorPlan?.market_rent || rent;
        const bedrooms = floorPlan?.bedrooms || 0;
        const bathrooms = floorPlan?.bathrooms || 0;
        const sqft = floorPlan?.square_feet || 0;

        // Calculate savings
        const savings = marketRent > rent ? marketRent - rent : 0;

        // Format location
        const location = `${property.city || 'San Antonio'}, ${property.state || 'TX'}`;

        // Format available date
        const availableDate = unit?.available_date ? new Date(unit.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Now';

        // Get property image
        const imageUrl = property.image_url || property.primary_image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop';

        // Check for special features
        const isPUMI = property.is_pumi || false;
        const hasConcession = property.has_concession || false;
        const concessionDesc = property.concession_description || '';

        return `
            <div class="property-card" data-property-id="${property.id}">
                <img src="${imageUrl}" alt="${property.name}" class="property-image" onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop'">

                <div class="property-body">
                    <div class="property-header">
                        <input type="checkbox" class="property-checkbox" data-property-id="${property.id}">
                        <div class="property-info">
                            <div class="property-name">${property.name}</div>
                            <div class="property-location">📍 ${location}</div>
                            <div class="property-rent">
                                $${rent.toLocaleString()}
                                <span class="property-rent-label">/month</span>
                            </div>
                            <div class="property-specs">
                                <div class="spec-item">
                                    <span>🛏️</span>
                                    <span>${bedrooms}</span>
                                    <span class="spec-label">bed</span>
                                </div>
                                <div class="spec-item">
                                    <span>🛁</span>
                                    <span>${bathrooms}</span>
                                    <span class="spec-label">bath</span>
                                </div>
                                <div class="spec-item">
                                    <span>📐</span>
                                    <span>${sqft.toLocaleString()}</span>
                                    <span class="spec-label">sqft</span>
                                </div>
                            </div>

                            <div class="property-details">
                                <div><strong>Unit:</strong> ${unit?.unit_number || 'TBD'}</div>
                                <div class="divider-dot"></div>
                                <div><strong>Available:</strong> ${availableDate}</div>
                            </div>

                            ${savings > 0 ? `
                                <div class="special-badge">
                                    <strong>💰 Save $${savings.toLocaleString()}/mo vs. market rate</strong>
                                    <p>Market rent: $${marketRent.toLocaleString()}/mo</p>
                                </div>
                            ` : ''}

                            ${hasConcession && concessionDesc ? `
                                <div class="special-badge">
                                    <strong>🎁 Special Offer</strong>
                                    <p>${concessionDesc}</p>
                                </div>
                            ` : ''}

                            ${isPUMI ? `
                                <div class="special-badge">
                                    <strong>⭐ PUMI Property</strong>
                                    <p>Priority Unit - Move In Ready!</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="tour-section" data-property-id="${property.id}">
                        <label for="tour-date-${property.id}">Preferred Tour Date & Time:</label>
                        <input
                            type="datetime-local"
                            id="tour-date-${property.id}"
                            data-property-id="${property.id}"
                            min="${new Date().toISOString().slice(0, 16)}"
                        >
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Property checkbox listeners
    document.querySelectorAll('.property-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handlePropertySelection);
    });

    // Tour date listeners
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        input.addEventListener('change', handleTourDateChange);
    });

    // Submit button
    document.getElementById('submitBtn')?.addEventListener('click', handleSubmit);

    // More options button
    document.getElementById('moreOptionsBtn')?.addEventListener('click', handleMoreOptions);
}

/**
 * Handle property selection
 */
async function handlePropertySelection(event) {
    const propertyId = event.target.dataset.propertyId;
    const isChecked = event.target.checked;

    // Update state
    if (isChecked) {
        selectedProperties.set(propertyId, { selected: true, tourDate: null, unitId: null });
    } else {
        selectedProperties.delete(propertyId);
    }

    // Show/hide tour section
    const tourSection = document.querySelector(`.tour-section[data-property-id="${propertyId}"]`);
    const propertyCard = document.querySelector(`.property-card[data-property-id="${propertyId}"]`);

    if (isChecked) {
        tourSection?.classList.add('visible');
        propertyCard?.classList.add('selected');

        // Log activity for property selection
        try {
            const property = sessionData.properties.find(p => p.id === propertyId);

            // Log for lead
            await window.supabase
                .from('lead_activities')
                .insert({
                    lead_id: sessionData.lead_id,
                    activity_type: 'property_selected',
                    description: `${sessionData.lead?.name || 'Lead'} selected ${property?.name || 'property'} as interested`,
                    metadata: {
                        session_id: sessionData.id,
                        token: sessionData.token,
                        property_id: propertyId,
                        property_name: property?.name
                    },
                    performed_by: null,
                    performed_by_name: sessionData.lead?.name || 'Lead'
                });

            // Log for property
            await window.supabase
                .from('property_activities')
                .insert({
                    property_id: propertyId,
                    activity_type: 'selected_by_lead',
                    description: `${sessionData.lead?.name || 'Lead'} marked as interested`,
                    metadata: {
                        lead_id: sessionData.lead_id,
                        lead_name: sessionData.lead?.name,
                        session_id: sessionData.id,
                        token: sessionData.token
                    },
                    performed_by: null,
                    performed_by_name: sessionData.lead?.name || 'Lead'
                });

            console.log('✅ Activity logged for property selection');
        } catch (activityError) {
            console.warn('⚠️ Error logging property selection activity:', activityError);
        }
    } else {
        tourSection?.classList.remove('visible');
        propertyCard?.classList.remove('selected');
    }

    // Update submit button state
    updateSubmitButton();
}

/**
 * Handle tour date change
 */
async function handleTourDateChange(event) {
    const propertyId = event.target.dataset.propertyId;
    const tourDate = event.target.value;

    const selection = selectedProperties.get(propertyId);
    if (selection) {
        selection.tourDate = tourDate;

        // Log activity for tour request
        if (tourDate) {
            try {
                const property = sessionData.properties.find(p => p.id === propertyId);
                const formattedDate = new Date(tourDate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });

                // Log for lead
                await window.supabase
                    .from('lead_activities')
                    .insert({
                        lead_id: sessionData.lead_id,
                        activity_type: 'tour_requested',
                        description: `${sessionData.lead?.name || 'Lead'} requested tour at ${property?.name || 'property'} on ${formattedDate}`,
                        metadata: {
                            session_id: sessionData.id,
                            token: sessionData.token,
                            property_id: propertyId,
                            property_name: property?.name,
                            tour_date: tourDate,
                            tour_date_formatted: formattedDate
                        },
                        performed_by: null,
                        performed_by_name: sessionData.lead?.name || 'Lead'
                    });

                console.log('✅ Activity logged for tour request');
            } catch (activityError) {
                console.warn('⚠️ Error logging tour request activity:', activityError);
            }
        }
    }
}

/**
 * Update submit button enabled state
 */
function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const hasSelections = selectedProperties.size > 0;

    if (submitBtn) {
        submitBtn.disabled = !hasSelections;
    }
}

/**
 * Handle form submission
 */
async function handleSubmit() {
    console.log('📤 Submitting selections:', selectedProperties);

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0 auto;"></div>';

    try {
        // Prepare responses
        const responses = Array.from(selectedProperties.entries()).map(([propertyId, data]) => ({
            session_id: sessionData.id,
            lead_id: sessionData.lead_id,
            property_id: propertyId,
            unit_id: data.unitId,
            tour_date_requested: data.tourDate || null,
            response_type: 'tour_request',
            notes: null
        }));

        // Save responses
        const { error } = await window.supabase
            .from('smart_match_responses')
            .insert(responses);

        if (error) {
            throw error;
        }

        // Mark session as submitted
        await window.supabase
            .from('smart_match_sessions')
            .update({ submitted_at: new Date().toISOString() })
            .eq('id', sessionData.id);

        // Create activity log entries
        try {
            // Get property names for metadata
            const selectedPropertiesData = Array.from(selectedProperties.entries()).map(([propertyId, data]) => {
                const property = sessionData.properties.find(p => p.id === propertyId);
                return {
                    property_id: propertyId,
                    property_name: property?.name || 'Unknown Property',
                    tour_date: data.tourDate
                };
            });

            const tourRequestsCount = selectedPropertiesData.filter(p => p.tour_date).length;

            // Log for lead
            await window.supabase
                .from('lead_activities')
                .insert({
                    lead_id: sessionData.lead_id,
                    activity_type: 'property_matcher_submitted',
                    description: `${sessionData.lead?.name || 'Lead'} selected ${selectedProperties.size} properties and requested ${tourRequestsCount} tours`,
                    metadata: {
                        session_id: sessionData.id,
                        token: sessionData.token,
                        properties_selected: selectedProperties.size,
                        tour_requests: tourRequestsCount,
                        selected_properties: selectedPropertiesData
                    },
                    performed_by: null,
                    performed_by_name: sessionData.lead?.name || 'Lead'
                });

            // Send agent response notification email
            try {
                const { sendAgentResponseEmailSafe } = await import('/src/utils/agent-notification-emails.js');
                await sendAgentResponseEmailSafe({
                    leadId: sessionData.lead_id,
                    sessionId: sessionData.id,
                    propertiesSelected: selectedProperties.size,
                    tourRequestsCount: tourRequestsCount,
                    selectedProperties: selectedPropertiesData,
                    supabase: window.supabase
                });
            } catch (emailError) {
                console.error('⚠️ Error sending agent response email:', emailError);
                // Don't fail the submission if email fails
            }

            // Log for each property with tour request
            for (const [propertyId, data] of selectedProperties.entries()) {
                if (data.tourDate) {
                    const property = sessionData.properties.find(p => p.id === propertyId);
                    const formattedDate = new Date(data.tourDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });

                    await window.supabase
                        .from('property_activities')
                        .insert({
                            property_id: propertyId,
                            activity_type: 'tour_requested',
                            description: `${sessionData.lead?.name || 'Lead'} requested tour on ${formattedDate}`,
                            metadata: {
                                lead_id: sessionData.lead_id,
                                lead_name: sessionData.lead?.name,
                                session_id: sessionData.id,
                                token: sessionData.token,
                                tour_date: data.tourDate,
                                tour_date_formatted: formattedDate
                            },
                            performed_by: null,
                            performed_by_name: sessionData.lead?.name || 'Lead'
                        });
                }
            }

            console.log('✅ Activity logs created for submission');
        } catch (activityError) {
            console.warn('⚠️ Error creating activity log:', activityError);
        }

        // Show success message
        showSuccess();

    } catch (error) {
        console.error('Error submitting:', error);
        showError('Submission Failed', 'There was an error submitting your selections. Please try again or contact your agent directly.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handle "Send More Options" button
 */
async function handleMoreOptions() {
    console.log('🔄 Requesting more options');

    const btn = document.getElementById('moreOptionsBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0 auto;"></div>';

    try {
        // Update lead record to indicate they want more options (also resets cooldown)
        const { error } = await window.supabase
            .from('leads')
            .update({
                wants_more_options: true,
                last_smart_match_sent_at: null // Reset cooldown
            })
            .eq('id', sessionData.lead_id);

        if (error) {
            throw error;
        }

        // Create activity log entry
        try {
            await window.supabase
                .from('lead_activities')
                .insert({
                    lead_id: sessionData.lead_id,
                    activity_type: 'wants_more_options',
                    description: `${sessionData.lead?.name || 'Lead'} requested more property options`,
                    metadata: {
                        session_id: sessionData.id,
                        token: sessionData.token,
                        cooldown_reset: true
                    },
                    performed_by: null,
                    performed_by_name: sessionData.lead?.name || 'Lead'
                });
            console.log('✅ Activity log created for "wants more options"');
        } catch (activityError) {
            console.warn('⚠️ Error creating activity log:', activityError);
        }

        // Send more options request notification email
        try {
            const { sendMoreOptionsRequestEmailSafe } = await import('/src/utils/agent-notification-emails-part2.js');
            await sendMoreOptionsRequestEmailSafe({
                leadId: sessionData.lead_id,
                propertiesViewed: sessionData.properties?.length || 0,
                supabase: window.supabase
            });
        } catch (emailError) {
            console.error('⚠️ Error sending more options request email:', emailError);
            // Don't fail the request if email fails
        }

        // Show success message in content area
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="success-message">
                <h2>✅ Request Sent!</h2>
                <p>Your agent will send you more property options soon.</p>
                <p style="margin-top: 20px;">You can close this page now.</p>
            </div>
        `;

    } catch (error) {
        console.error('Error requesting more options:', error);
        showError('Request Failed', 'There was an error sending your request. Please contact your agent directly.');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Show success message
 */
function showSuccess() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="success-message">
            <h2>🎉 Thank You!</h2>
            <p>Your tour requests have been submitted successfully.</p>
            <p>Your agent will contact you shortly to confirm your tour schedule.</p>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(title, message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="error">
            <h2>${title}</h2>
            <p>${message}</p>
        </div>
    `;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

