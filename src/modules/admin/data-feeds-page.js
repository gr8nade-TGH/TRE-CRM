/**
 * Data Feeds Dashboard Page Module
 *
 * Manages external data sources and AI feature toggles.
 *
 * @module admin/data-feeds-page
 */

import { getAppSetting, updateAppSetting, getSupabase } from '../../api/supabase-api.js';
import { checkStatus } from '../../api/rentcast-api.js';
import { toast } from '../../utils/helpers.js';

/**
 * Initialize the Data Feeds page
 */
export async function initializeDataFeedsPage() {
    console.log('📡 Initializing Data Feeds Dashboard...');

    // Add mission-control-active class to body for dark theme
    document.body.classList.add('mission-control-active');

    // Load current settings
    await loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Check all service statuses and load missing data counts in parallel
    await Promise.all([
        checkRentcastStatus(),
        checkAIEnrichmentStatus()
    ]);

    console.log('✅ Data Feeds Dashboard initialized');
}

/**
 * Load current settings from database
 */
async function loadSettings() {
    try {
        const aiAuditEnabled = await getAppSetting('ai_audit_enabled');
        const toggle = document.getElementById('aiAuditToggle');
        if (toggle) {
            toggle.checked = aiAuditEnabled === true || aiAuditEnabled === 'true';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // AI Audit toggle
    const aiAuditToggle = document.getElementById('aiAuditToggle');
    if (aiAuditToggle) {
        aiAuditToggle.addEventListener('change', async (e) => {
            try {
                await updateAppSetting('ai_audit_enabled', e.target.checked);
                toast(e.target.checked
                    ? '✅ AI Audit enabled - badges will now appear on listings'
                    : '⏸️ AI Audit disabled - badges will show "Coming Soon"',
                    'success'
                );
            } catch (error) {
                console.error('Error updating setting:', error);
                toast('Failed to update setting', 'error');
                // Revert toggle
                e.target.checked = !e.target.checked;
            }
        });
    }

    // Open RentCast page button
    const openRentcastBtn = document.getElementById('openRentcastPageBtn');
    if (openRentcastBtn) {
        openRentcastBtn.addEventListener('click', () => {
            window.location.hash = '#/rentcast-api';
        });
    }

}

/**
 * Check RentCast API status
 */
async function checkRentcastStatus() {
    const statusBadge = document.getElementById('rentcastStatusBadge');
    if (!statusBadge) return;

    try {
        const status = await checkStatus();
        if (status.connected) {
            statusBadge.textContent = 'Connected';
            statusBadge.className = 'badge badge-success';
        } else if (status.configured) {
            statusBadge.textContent = 'Configured';
            statusBadge.className = 'badge badge-warning';
        } else {
            statusBadge.textContent = 'Not Configured';
            statusBadge.className = 'badge badge-inactive';
        }
    } catch (error) {
        console.error('Error checking RentCast status:', error);
        statusBadge.textContent = 'Error';
        statusBadge.className = 'badge badge-error';
    }
}

/**
 * Check AI Enrichment services status (OpenAI, Browserless, SerpApi)
 */
async function checkAIEnrichmentStatus() {
    const openaiStatusBadge = document.getElementById('openaiStatusBadge');
    const browserlessStatusBadge = document.getElementById('browserlessStatusBadge');
    const serpapiStatusBadge = document.getElementById('serpapiStatusBadge');

    if (!openaiStatusBadge || !browserlessStatusBadge || !serpapiStatusBadge) return;

    try {
        // Call the API to check configuration status
        const response = await fetch('/api/property/status');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const config = data.configuration || {};

        // Update OpenAI status
        if (config.openai) {
            openaiStatusBadge.textContent = 'Connected';
            openaiStatusBadge.className = 'badge badge-success';
        } else {
            openaiStatusBadge.textContent = 'Not Configured';
            openaiStatusBadge.className = 'badge badge-inactive';
        }

        // Update Browserless status
        if (config.browserless) {
            browserlessStatusBadge.textContent = 'Connected';
            browserlessStatusBadge.className = 'badge badge-success';
        } else {
            browserlessStatusBadge.textContent = 'Not Configured';
            browserlessStatusBadge.className = 'badge badge-inactive';
        }

        // Update SerpApi status
        if (config.serpapi) {
            serpapiStatusBadge.textContent = 'Connected';
            serpapiStatusBadge.className = 'badge badge-success';
        } else {
            serpapiStatusBadge.textContent = 'Not Configured';
            serpapiStatusBadge.className = 'badge badge-warning';
        }
    } catch (error) {
        console.error('Error checking AI enrichment status:', error);
        // Set all to error state
        [openaiStatusBadge, browserlessStatusBadge, serpapiStatusBadge].forEach(badge => {
            if (badge) {
                badge.textContent = 'Error';
                badge.className = 'badge badge-error';
            }
        });
    }
}

export default {
    initializeDataFeedsPage
};

