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
        checkAIEnrichmentStatus(),
        loadMissingContactCounts()
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

    // Contact Info Scan button
    const scanContactBtn = document.getElementById('scanContactInfoBtn');
    if (scanContactBtn) {
        scanContactBtn.addEventListener('click', runContactInfoScan);
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

/**
 * Load missing contact info counts
 */
async function loadMissingContactCounts() {
    try {
        const supabase = getSupabase();

        // Get all properties and count missing fields
        const { data: properties, error } = await supabase
            .from('properties')
            .select('contact_phone, contact_email, website, leasing_link');

        if (error) throw error;

        const counts = {
            phone: 0,
            email: 0,
            website: 0,
            leasing: 0
        };

        for (const p of properties) {
            if (!p.contact_phone || p.contact_phone === '') counts.phone++;
            if (!p.contact_email || p.contact_email === '') counts.email++;
            if (!p.website || p.website === '') counts.website++;
            if (!p.leasing_link || p.leasing_link === '') counts.leasing++;
        }

        // Update UI
        const phoneEl = document.getElementById('missingPhoneCount');
        const emailEl = document.getElementById('missingEmailCount');
        const websiteEl = document.getElementById('missingWebsiteCount');
        const leasingEl = document.getElementById('missingLeasingCount');

        if (phoneEl) phoneEl.textContent = counts.phone.toLocaleString();
        if (emailEl) emailEl.textContent = counts.email.toLocaleString();
        if (websiteEl) websiteEl.textContent = counts.website.toLocaleString();
        if (leasingEl) leasingEl.textContent = counts.leasing.toLocaleString();

    } catch (error) {
        console.error('Error loading missing contact counts:', error);
    }
}

/**
 * Run contact info scan for properties
 */
async function runContactInfoScan() {
    const btn = document.getElementById('scanContactInfoBtn');
    const progressDiv = document.getElementById('contactScanProgress');
    const progressBar = document.getElementById('contactScanProgressBar');
    const progressLabel = document.getElementById('contactScanProgressLabel');
    const progressPercent = document.getElementById('contactScanProgressPercent');
    const logDiv = document.getElementById('contactScanLog');
    const limitSelect = document.getElementById('contactScanLimit');

    const limit = parseInt(limitSelect?.value || '50');

    // Disable button and show progress
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Scanning...';
    }

    if (progressDiv) progressDiv.style.display = 'block';
    if (logDiv) {
        logDiv.style.display = 'block';
        logDiv.innerHTML = '';
    }

    const addLog = (type, message) => {
        if (logDiv) {
            const line = document.createElement('div');
            line.className = `log-${type}`;
            line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logDiv.appendChild(line);
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    };

    const updateProgress = (current, total, label) => {
        const pct = Math.round((current / total) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressLabel) progressLabel.textContent = label;
        if (progressPercent) progressPercent.textContent = pct + '%';
    };

    try {
        addLog('info', `Starting contact info scan for up to ${limit} properties...`);

        // Call the API endpoint
        const response = await fetch(`/api/property/scan-contacts?limit=${limit}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Process results
        const { scanned, updated, results: propertyResults } = result;

        updateProgress(100, 100, 'Complete!');

        // Log individual results
        for (const r of propertyResults || []) {
            if (r.updated) {
                const fields = [];
                if (r.phone) fields.push('📞 Phone');
                if (r.email) fields.push('📧 Email');
                if (r.website) fields.push('🌐 Website');
                addLog('success', `✓ ${r.name}: Found ${fields.join(', ')}`);
            } else if (r.error) {
                addLog('error', `✗ ${r.name}: ${r.error}`);
            } else {
                addLog('warning', `○ ${r.name}: No new data found`);
            }
        }

        addLog('info', `\n━━━ SCAN COMPLETE ━━━`);
        addLog('info', `Scanned: ${scanned} | Updated: ${updated}`);

        toast(`✅ Scan complete! Updated ${updated} of ${scanned} properties`, 'success');

        // Refresh counts
        await loadMissingContactCounts();

    } catch (error) {
        console.error('Contact scan failed:', error);
        addLog('error', `Scan failed: ${error.message}`);
        toast(`❌ Scan failed: ${error.message}`, 'error');
    } finally {
        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                </svg>
                Scan for Contact Info
            `;
        }
    }
}

// Expose to window for button onclick
window.runContactInfoScan = runContactInfoScan;

export default {
    initializeDataFeedsPage
};

