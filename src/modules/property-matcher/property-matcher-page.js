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
 * Mark session as viewed
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
}

/**
 * Load property details for all properties in session
 */
async function loadProperties() {
    const propertyIds = sessionData.property_ids || [];
    
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
        const bedrooms = floorPlan?.bedrooms || 0;
        const bathrooms = floorPlan?.bathrooms || 0;
        const sqft = floorPlan?.square_feet || 0;

        return `
            <div class="property-card" data-property-id="${property.id}">
                <div class="property-header">
                    <input type="checkbox" class="property-checkbox" data-property-id="${property.id}">
                    <div class="property-info">
                        <div class="property-name">${property.name}</div>
                        <div class="property-rent">$${rent.toLocaleString()}/mo</div>
                        <div class="property-specs">
                            <div class="spec-item">🛏️ ${bedrooms} bed</div>
                            <div class="spec-item">🛁 ${bathrooms} bath</div>
                            <div class="spec-item">📐 ${sqft.toLocaleString()} sqft</div>
                        </div>
                        ${property.address ? `<div class="spec-item">📍 ${property.address}</div>` : ''}
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
function handlePropertySelection(event) {
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
function handleTourDateChange(event) {
    const propertyId = event.target.dataset.propertyId;
    const tourDate = event.target.value;

    const selection = selectedProperties.get(propertyId);
    if (selection) {
        selection.tourDate = tourDate;
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
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

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

        // Show success message
        showSuccess();

    } catch (error) {
        console.error('Error submitting:', error);
        alert('There was an error submitting your selections. Please try again or contact your agent.');
        submitBtn.disabled = false;
        submitBtn.textContent = '📅 Schedule My Tours';
    }
}

/**
 * Handle "Send More Options" button
 */
async function handleMoreOptions() {
    console.log('🔄 Requesting more options');

    const btn = document.getElementById('moreOptionsBtn');
    btn.disabled = true;
    btn.textContent = 'Sending request...';

    try {
        // Update lead record to indicate they want more options
        const { error } = await window.supabase
            .from('leads')
            .update({ wants_more_options: true })
            .eq('id', sessionData.lead_id);

        if (error) {
            throw error;
        }

        // Show success message
        alert('✅ Request sent! Your agent will send you more property options soon.');
        btn.textContent = '✅ Request Sent';

    } catch (error) {
        console.error('Error requesting more options:', error);
        alert('There was an error sending your request. Please contact your agent directly.');
        btn.disabled = false;
        btn.textContent = '🔄 Send Me More Options';
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

