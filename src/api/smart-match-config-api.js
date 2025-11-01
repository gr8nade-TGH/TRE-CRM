/**
 * Smart Match Configuration API
 * 
 * Provides CRUD operations for Smart Match configuration settings.
 * Includes caching to minimize database calls.
 */

import { getSupabase } from './supabase-api.js';
import { DEFAULT_SMART_MATCH_CONFIG, validateConfig } from '../utils/smart-match-config-defaults.js';

// ============================================
// CACHE MANAGEMENT
// ============================================

const CACHE_DURATION_MS = 60000; // 1 minute cache
let configCache = null;
let cacheTimestamp = null;

/**
 * Clear the configuration cache
 */
export function clearConfigCache() {
    configCache = null;
    cacheTimestamp = null;
    console.log('Smart Match config cache cleared');
}

/**
 * Check if cache is valid
 * @returns {boolean}
 */
function isCacheValid() {
    if (!configCache || !cacheTimestamp) {
        return false;
    }

    const cacheAge = Date.now() - cacheTimestamp;
    return cacheAge < CACHE_DURATION_MS;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get the active Smart Match configuration
 * Uses cache to minimize database calls
 * @returns {Promise<Object>} Active configuration object
 */
export async function getActiveConfig() {
    try {
        // Check cache first
        if (isCacheValid()) {
            console.log('Returning cached Smart Match config');
            return configCache;
        }

        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('smart_match_config')
            .select('*')
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error fetching Smart Match config:', error);

            // If no config found, return default
            if (error.code === 'PGRST116') {
                console.warn('No active config found, using defaults');
                return DEFAULT_SMART_MATCH_CONFIG;
            }

            throw error;
        }

        // Update cache
        configCache = data;
        cacheTimestamp = Date.now();

        console.log('Smart Match config loaded from database');
        return data;

    } catch (error) {
        console.error('Error in getActiveConfig:', error);
        // Fallback to defaults on error
        return DEFAULT_SMART_MATCH_CONFIG;
    }
}

/**
 * Get all configurations (active and inactive)
 * @returns {Promise<Array>} Array of configuration objects
 */
export async function getAllConfigs() {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('smart_match_config')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all configs:', error);
            throw error;
        }

        return data || [];

    } catch (error) {
        console.error('Error in getAllConfigs:', error);
        throw error;
    }
}

/**
 * Get a specific configuration by ID
 * @param {string} configId - Configuration ID
 * @returns {Promise<Object>} Configuration object
 */
export async function getConfigById(configId) {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('smart_match_config')
            .select('*')
            .eq('id', configId)
            .single();

        if (error) {
            console.error('Error fetching config by ID:', error);
            throw error;
        }

        return data;

    } catch (error) {
        console.error('Error in getConfigById:', error);
        throw error;
    }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new configuration
 * @param {Object} configData - Configuration data
 * @param {string} userId - ID of user creating the config
 * @returns {Promise<Object>} Created configuration object
 */
export async function createConfig(configData, userId) {
    try {
        // Validate configuration
        const validation = validateConfig(configData);
        if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        const supabase = getSupabase();

        // Add metadata
        const configWithMetadata = {
            ...configData,
            created_by: userId,
            last_modified_by: userId
        };

        const { data, error } = await supabase
            .from('smart_match_config')
            .insert([configWithMetadata])
            .select()
            .single();

        if (error) {
            console.error('Error creating config:', error);
            throw error;
        }

        console.log('Smart Match config created:', data.id);

        // Clear cache if this is the active config
        if (data.is_active) {
            clearConfigCache();
        }

        return data;

    } catch (error) {
        console.error('Error in createConfig:', error);
        throw error;
    }
}

/**
 * Update an existing configuration
 * @param {string} configId - Configuration ID
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of user making the update
 * @returns {Promise<Object>} Updated configuration object
 */
export async function updateConfig(configId, updates, userId) {
    try {
        console.log('🔍 updateConfig called with ID:', configId);
        console.log('🔍 updateConfig updates:', updates);

        // Validate updates
        const validation = validateConfig(updates);
        if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        const supabase = getSupabase();

        // Add metadata
        const updatesWithMetadata = {
            ...updates,
            last_modified_by: userId
        };

        console.log('🔍 Updates with metadata:', updatesWithMetadata);

        const { data, error } = await supabase
            .from('smart_match_config')
            .update(updatesWithMetadata)
            .eq('id', configId)
            .select();

        console.log('🔍 Update response - data:', data);
        console.log('🔍 Update response - error:', error);

        if (error) {
            console.error('Error updating config:', error);
            console.error('Error code:', error.code);
            console.error('Error details:', error.details);
            throw error;
        }

        // Check if any rows were updated
        if (!data || data.length === 0) {
            throw new Error(`No configuration found with ID: ${configId}. The row may not exist or RLS policy may be blocking the update.`);
        }

        const updatedConfig = data[0];
        console.log('✅ Smart Match config updated:', configId);

        // Clear cache if this is the active config
        if (updatedConfig.is_active) {
            clearConfigCache();
        }

        return updatedConfig;

    } catch (error) {
        console.error('Error in updateConfig:', error);
        throw error;
    }
}

/**
 * Update the active configuration
 * Convenience method that finds and updates the active config
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of user making the update
 * @returns {Promise<Object>} Updated configuration object
 */
export async function updateActiveConfig(updates, userId) {
    try {
        const activeConfig = await getActiveConfig();

        console.log('🔍 Active config retrieved:', activeConfig);
        console.log('🔍 Active config ID:', activeConfig?.id);

        // If no active config exists in database (returned defaults), create one
        if (!activeConfig || !activeConfig.id) {
            console.log('No active config in database, creating new one...');
            return await createConfig({
                ...DEFAULT_SMART_MATCH_CONFIG,
                ...updates,
                is_active: true
            }, userId);
        }

        console.log('🔍 Calling updateConfig with ID:', activeConfig.id);
        return await updateConfig(activeConfig.id, updates, userId);

    } catch (error) {
        console.error('Error in updateActiveConfig:', error);
        throw error;
    }
}

/**
 * Set a configuration as active (deactivates all others)
 * @param {string} configId - Configuration ID to activate
 * @param {string} userId - ID of user making the change
 * @returns {Promise<Object>} Activated configuration object
 */
export async function setActiveConfig(configId, userId) {
    try {
        const supabase = getSupabase();

        // Deactivate all configs
        await supabase
            .from('smart_match_config')
            .update({ is_active: false })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

        // Activate the specified config
        const { data, error } = await supabase
            .from('smart_match_config')
            .update({
                is_active: true,
                last_modified_by: userId
            })
            .eq('id', configId)
            .select()
            .single();

        if (error) {
            console.error('Error setting active config:', error);
            throw error;
        }

        console.log('Active config changed to:', configId);

        // Clear cache
        clearConfigCache();

        return data;

    } catch (error) {
        console.error('Error in setActiveConfig:', error);
        throw error;
    }
}

/**
 * Reset configuration to defaults
 * Updates the active config with default values
 * @param {string} userId - ID of user making the reset
 * @returns {Promise<Object>} Reset configuration object
 */
export async function resetToDefaults(userId) {
    try {
        const activeConfig = await getActiveConfig();

        if (!activeConfig || !activeConfig.id) {
            // No active config, create one with defaults
            return await createConfig({
                ...DEFAULT_SMART_MATCH_CONFIG,
                is_active: true
            }, userId);
        }

        // Update existing config with defaults
        return await updateConfig(activeConfig.id, DEFAULT_SMART_MATCH_CONFIG, userId);

    } catch (error) {
        console.error('Error in resetToDefaults:', error);
        throw error;
    }
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a configuration
 * Cannot delete the active configuration
 * @param {string} configId - Configuration ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteConfig(configId) {
    try {
        const supabase = getSupabase();

        // Check if this is the active config
        const config = await getConfigById(configId);
        if (config.is_active) {
            throw new Error('Cannot delete the active configuration');
        }

        const { error } = await supabase
            .from('smart_match_config')
            .delete()
            .eq('id', configId);

        if (error) {
            console.error('Error deleting config:', error);
            throw error;
        }

        console.log('Smart Match config deleted:', configId);
        return true;

    } catch (error) {
        console.error('Error in deleteConfig:', error);
        throw error;
    }
}

// ============================================
// MATCH COUNTER FUNCTIONS
// ============================================

/**
 * Cache for available units to avoid repeated database queries
 */
let unitsCache = null;
let unitsCacheTimestamp = null;
const UNITS_CACHE_DURATION_MS = 60000; // 1 minute cache

/**
 * Clear the units cache
 */
export function clearUnitsCache() {
    unitsCache = null;
    unitsCacheTimestamp = null;
    console.log('Units cache cleared');
}

/**
 * Get available units with caching
 * @returns {Promise<Array>} Array of units with floor plan and property details
 */
async function getAvailableUnits() {
    // Check cache validity
    const now = Date.now();
    if (unitsCache && unitsCacheTimestamp && (now - unitsCacheTimestamp) < UNITS_CACHE_DURATION_MS) {
        console.log('📦 Using cached units data');
        return unitsCache;
    }

    console.log('🔄 Fetching fresh units data...');

    try {
        const supabase = getSupabase();

        const { data: units, error } = await supabase
            .from('units')
            .select(`
                *,
                floor_plan:floor_plans(*),
                property:properties(*)
            `)
            .eq('is_available', true)
            .eq('is_active', true)
            .eq('status', 'available');

        if (error) throw error;

        // Transform to expected format
        const unitsWithDetails = units.map(u => ({
            unit: u,
            floorPlan: u.floor_plan,
            property: u.property
        }));

        // Update cache
        unitsCache = unitsWithDetails;
        unitsCacheTimestamp = now;

        console.log(`✅ Fetched ${unitsWithDetails.length} available units`);
        return unitsWithDetails;

    } catch (error) {
        console.error('❌ Error fetching units:', error);
        throw error;
    }
}

/**
 * Get default test lead for filter preview
 * Represents a typical lead with common preferences
 * @returns {Object} Test lead object
 */
export function getDefaultTestLead() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return {
        bedrooms: '2',              // 2 bedrooms
        bathrooms: '2',             // 2 bathrooms
        price_range: '$1500-$2000', // Mid-range budget
        move_in_date: thirtyDaysFromNow.toISOString().split('T')[0], // 30 days from now
        location_preference: 'San Antonio',
        has_pets: false,
        needs_parking: false
    };
}

/**
 * Count properties that match filter criteria
 * Uses same filtering logic as Smart Match but returns only count
 *
 * @param {Object} config - Smart Match configuration
 * @param {Object} testLead - Test lead with preferences (optional)
 * @returns {Promise<number>} Count of matching properties
 */
export async function countMatchingProperties(config, testLead = null) {
    try {
        // Use default test lead if none provided
        const lead = testLead || getDefaultTestLead();

        console.log('🔢 Counting matching properties with config:', {
            bedroomMode: config.bedroom_match_mode,
            bathroomMode: config.bathroom_match_mode,
            rentTolerance: config.rent_tolerance_percent,
            availabilityWindow: config.availability_window_days
        });

        // Fetch all available units (with caching)
        const unitsWithDetails = await getAvailableUnits();

        // Apply configurable filters (reuse existing logic from smart-match-v2.js)
        const { applyConfigurableFilters } = await import('../utils/smart-match-v2.js');
        const filteredUnits = applyConfigurableFilters(unitsWithDetails, lead, config);

        // Count unique properties
        const propertyIds = new Set(filteredUnits.map(item => item.property.id));
        const count = propertyIds.size;

        console.log(`✅ Found ${count} matching properties (${filteredUnits.length} total units)`);

        return count;

    } catch (error) {
        console.error('❌ Error counting matching properties:', error);
        return 0; // Return 0 on error to avoid breaking UI
    }
}

