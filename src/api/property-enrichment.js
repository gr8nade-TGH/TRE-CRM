/**
 * Property Enrichment API Client
 * 
 * Client-side wrapper for the AI property enrichment service.
 * Handles communication with the serverless API and state management.
 * 
 * @module api/property-enrichment
 */

const BASE_URL = '/api/property';

/**
 * Check if AI enrichment is configured and available
 * @returns {Promise<Object>} Configuration status
 */
export async function checkEnrichmentStatus() {
    try {
        const response = await fetch(`${BASE_URL}/status`);
        return await response.json();
    } catch (error) {
        console.error('[Property Enrichment] Status check failed:', error);
        return {
            configured: false,
            error: error.message
        };
    }
}

/**
 * Request AI enrichment for a property
 * @param {Object} property - Property data to enrich (with all existing fields for analysis)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Enrichment results with suggestions and verifications
 */
export async function enrichProperty(property, onProgress = () => { }) {
    try {
        onProgress('📊 Analyzing existing property data...', 5);

        // Send full property data so AI knows what's missing vs existing
        const requestData = {
            property_id: property.id,
            // Address info
            address: property.address,
            street_address: property.street_address,
            city: property.city,
            state: property.state,
            zip_code: property.zip_code,
            lat: property.lat || property.map_lat,
            lng: property.lng || property.map_lng,
            // Existing data for verification
            community_name: property.community_name,
            name: property.name,
            contact_phone: property.contact_phone,
            contact_email: property.contact_email,
            contact_name: property.contact_name,
            amenities: property.amenities,
            neighborhood: property.neighborhood,
            description: property.description,
            leasing_link: property.leasing_link,
            management_company: property.management_company
        };

        // Simulate progress steps during the API call
        onProgress('🔍 Searching Google for property info...', 15);

        // Start the API request
        const fetchPromise = fetch(`${BASE_URL}/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // Show progress steps while waiting
        const progressSteps = [
            { message: '🌐 Connecting to property websites...', progress: 25, delay: 3000 },
            { message: '📄 Scraping listing details...', progress: 40, delay: 6000 },
            { message: '🏢 Extracting property name & amenities...', progress: 55, delay: 10000 },
            { message: '📍 Finding neighborhood info...', progress: 65, delay: 14000 },
            { message: '📞 Finding contact information...', progress: 75, delay: 18000 },
            { message: '📝 Generating property description...', progress: 85, delay: 22000 }
        ];

        // Set up progress timers
        const timers = progressSteps.map(step =>
            setTimeout(() => onProgress(step.message, step.progress), step.delay)
        );

        // Wait for response
        const response = await fetchPromise;

        // Clear timers
        timers.forEach(t => clearTimeout(t));

        onProgress('📦 Processing results...', 90);

        // Get response text first to handle non-JSON errors
        const responseText = await response.text();

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[Property Enrichment] Response not JSON:', responseText.slice(0, 200));
            throw new Error(`Server returned invalid response: ${responseText.slice(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Enrichment failed');
        }

        onProgress('✅ Complete!', 100);
        return result;

    } catch (error) {
        console.error('[Property Enrichment] Request failed:', error);
        throw error;
    }
}

/**
 * Apply enrichment suggestions to a property
 * @param {string} propertyId - Property ID to update
 * @param {Object} suggestions - Suggestions to apply (field -> value)
 * @returns {Promise<Object>} Updated property
 */
export async function applyEnrichmentSuggestions(propertyId, suggestions) {
    // Import Supabase API dynamically to avoid circular dependencies
    const { getSupabase } = await import('./supabase-api.js');
    const supabase = getSupabase();

    // Helper to check if value is valid (not null/empty/placeholder)
    const isValidValue = (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') {
            const trimmed = value.trim().toLowerCase();
            if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined' ||
                trimmed === 'n/a' || trimmed === 'none') {
                return false;
            }
        }
        return true;
    };

    // Build update object from accepted suggestions
    const updates = {};

    for (const [field, suggestion] of Object.entries(suggestions)) {
        if (suggestion.accepted && isValidValue(suggestion.value)) {
            // Map suggestion fields to database columns
            switch (field) {
                case 'name':
                    updates.name = suggestion.value;
                    updates.community_name = suggestion.value;
                    break;
                case 'amenities':
                    // Amenities description is stored in description field instead
                    // The database amenities column is TEXT[] (array), not text
                    // Skip - we use amenities_tags for the array instead
                    break;
                case 'amenities_tags':
                    // Amenity tags are stored as array in amenities column (TEXT[])
                    if (Array.isArray(suggestion.value)) {
                        // Filter out any null-like values from the array
                        const validTags = suggestion.value.filter(tag => isValidValue(tag));
                        if (validTags.length > 0) {
                            updates.amenities = validTags;
                        }
                    }
                    break;
                case 'neighborhood':
                    updates.neighborhood = suggestion.value;
                    break;
                case 'description':
                    updates.description = suggestion.value;
                    break;
                case 'contact_phone':
                    updates.contact_phone = suggestion.value;
                    break;
                case 'contact_email':
                    updates.contact_email = suggestion.value;
                    break;
                case 'contact_name':
                    updates.contact_name = suggestion.value;
                    break;
                case 'leasing_link':
                    updates.leasing_link = suggestion.value;
                    break;
                case 'management_company':
                    updates.management_company = suggestion.value;
                    break;
            }
        }
    }

    if (Object.keys(updates).length === 0) {
        return { success: true, message: 'No changes to apply' };
    }

    // Mark as enriched
    updates.enrichment_status = 'enriched';
    updates.enriched_at = new Date().toISOString();

    console.log('[Property Enrichment] Applying updates to property:', propertyId);
    console.log('[Property Enrichment] Updates:', JSON.stringify(updates, null, 2));

    const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId)
        .select()
        .single();

    if (error) {
        console.error('[Property Enrichment] Supabase error:', error);
        throw new Error(`Failed to apply suggestions: ${error.message}`);
    }

    return { success: true, property: data };
}

/**
 * Mark a property as reviewed (no enrichment needed)
 * @param {string} propertyId - Property ID
 * @returns {Promise<Object>} Result
 */
export async function markAsReviewed(propertyId) {
    const { getSupabase } = await import('./supabase-api.js');
    const supabase = getSupabase();

    const { error } = await supabase
        .from('properties')
        .update({
            enrichment_status: 'reviewed',
            enriched_at: new Date().toISOString()
        })
        .eq('id', propertyId);

    if (error) {
        throw new Error(`Failed to mark as reviewed: ${error.message}`);
    }

    return { success: true };
}

export default {
    checkEnrichmentStatus,
    enrichProperty,
    applyEnrichmentSuggestions,
    markAsReviewed
};

