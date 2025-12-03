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
        onProgress('Analyzing property data...', 5);

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
            leasing_link: property.leasing_link,
            management_company: property.management_company
        };

        onProgress('Searching property listings...', 15);

        const response = await fetch(`${BASE_URL}/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        onProgress('AI analyzing results...', 80);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Enrichment failed');
        }

        onProgress('Complete!', 100);
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

    // Build update object from accepted suggestions
    const updates = {};

    for (const [field, suggestion] of Object.entries(suggestions)) {
        if (suggestion.accepted) {
            // Map suggestion fields to database columns
            switch (field) {
                case 'name':
                    updates.name = suggestion.value;
                    updates.community_name = suggestion.value;
                    break;
                case 'amenities':
                    updates.amenities = suggestion.value;
                    break;
                case 'contact_phone':
                    updates.contact_phone = suggestion.value;
                    break;
                case 'contact_email':
                    updates.contact_email = suggestion.value;
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

    const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId)
        .select()
        .single();

    if (error) {
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

