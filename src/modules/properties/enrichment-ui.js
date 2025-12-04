/**
 * Property Enrichment UI Module
 * 
 * Provides UI components for AI-powered property data enrichment.
 * Includes modal for reviewing and accepting suggestions.
 * 
 * @module properties/enrichment-ui
 */

import { enrichProperty, applyEnrichmentSuggestions, markAsReviewed, checkEnrichmentStatus, deepSearchProperty, searchPropertyUnits } from '../../api/property-enrichment.js';
import { toast } from '../../utils/helpers.js';
import { getAppSetting, getFloorPlans, createFloorPlan, updateFloorPlan, createUnit } from '../../api/supabase-api.js';

// State
let currentProperty = null;
let currentSuggestions = null;
let currentMissingFields = null;
let currentLeasingUrl = null;
let enrichmentModal = null;
let isProcessing = false;
let currentUnitResults = null;

/**
 * Initialize the enrichment UI
 * Creates modal element if not exists
 */
export function initEnrichmentUI() {
    if (!document.getElementById('enrichmentModal')) {
        createEnrichmentModal();
    }
}

/**
 * Create the enrichment modal HTML
 */
function createEnrichmentModal() {
    const modal = document.createElement('div');
    modal.id = 'enrichmentModal';
    modal.className = 'enrichment-modal-overlay hidden';
    modal.innerHTML = `
        <div class="enrichment-modal">
            <div class="enrichment-modal-header">
                <h2>🔍 AI Property Enrichment</h2>
                <button class="enrichment-close-btn" onclick="window.closeEnrichmentModal()">✕</button>
            </div>
            <div class="enrichment-modal-body">
                <div class="enrichment-property-info">
                    <h3 id="enrichmentPropertyName">Loading...</h3>
                    <p id="enrichmentPropertyAddress" class="enrichment-address"></p>
                </div>

                <!-- Unit Search Section - shown after property enrichment (at TOP) -->
                <div id="unitSearchSection" class="unit-search-section hidden">
                    <div class="unit-search-header">
                        <h4>🏢 Unit Availability Search</h4>
                        <p class="unit-search-description">Search for available units and floor plans from the property website.</p>
                    </div>
                    <div id="unitSearchPrompt" class="unit-search-prompt">
                        <button class="btn btn-unit-search" id="unitSearchBtn" onclick="window.startUnitSearch()">
                            🔍 Search for Units
                        </button>
                    </div>
                    <div id="unitSearchProgress" class="unit-search-progress hidden">
                        <div class="enrichment-progress-bar">
                            <div class="enrichment-progress-fill" id="unitSearchProgressFill"></div>
                        </div>
                        <p id="unitSearchProgressText" class="enrichment-progress-text">Searching...</p>
                    </div>
                    <div id="unitSearchResults" class="unit-search-results hidden"></div>
                </div>

                <div id="enrichmentProgress" class="enrichment-progress">
                    <div class="enrichment-progress-bar">
                        <div class="enrichment-progress-fill" id="enrichmentProgressFill"></div>
                    </div>
                    <p id="enrichmentProgressText" class="enrichment-progress-text">Initializing...</p>
                </div>

                <div id="enrichmentResults" class="enrichment-results hidden">
                    <div id="enrichmentSuggestions" class="enrichment-suggestions"></div>
                    <div id="enrichmentScreenshot" class="enrichment-screenshot hidden">
                        <details>
                            <summary>📸 Source Screenshot</summary>
                            <img id="enrichmentScreenshotImg" alt="Source page screenshot" />
                        </details>
                    </div>
                </div>

                <div id="enrichmentError" class="enrichment-error hidden">
                    <p id="enrichmentErrorText"></p>
                </div>
            </div>
            <div class="enrichment-modal-footer" id="enrichmentFooter">
                <button class="btn btn-secondary" onclick="window.closeEnrichmentModal()">Cancel</button>
                <button class="btn btn-primary" id="enrichmentApplyBtn" disabled onclick="window.applyEnrichmentChanges()">
                    Apply Selected
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    enrichmentModal = modal;
}

/**
 * Open the enrichment modal for a property
 * @param {Object} property - Property to enrich
 */
export async function openEnrichmentModal(property) {
    initEnrichmentUI();

    // Check if AI Audit is enabled
    try {
        const aiAuditEnabled = await getAppSetting('ai_audit_enabled');
        if (aiAuditEnabled !== true && aiAuditEnabled !== 'true') {
            toast('🚧 AI Audit - Coming Soon!', 'info');
            return;
        }
    } catch (e) {
        // If setting doesn't exist, treat as disabled
        toast('🚧 AI Audit - Coming Soon!', 'info');
        return;
    }

    currentProperty = property;
    currentSuggestions = null;
    isProcessing = true;

    // Show modal
    enrichmentModal.classList.remove('hidden');

    // Set property info
    document.getElementById('enrichmentPropertyName').textContent =
        property.name || property.community_name || 'Unknown Property';
    document.getElementById('enrichmentPropertyAddress').textContent =
        `${property.street_address || property.address}, ${property.city}, ${property.state} ${property.zip_code}`;

    // Reset footer to original state (in case delete buttons were shown previously)
    const footer = document.getElementById('enrichmentFooter');
    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="window.closeEnrichmentModal()">Cancel</button>
        <button class="btn btn-primary" id="enrichmentApplyBtn" disabled onclick="window.applyEnrichmentChanges()">
            Apply Selected
        </button>
    `;

    // Reset UI state
    document.getElementById('enrichmentProgress').classList.remove('hidden');
    document.getElementById('enrichmentResults').classList.add('hidden');
    document.getElementById('enrichmentError').classList.add('hidden');
    document.getElementById('enrichmentApplyBtn').disabled = true;
    document.getElementById('enrichmentSuggestions').innerHTML = '';

    // Reset unit search section
    const unitSection = document.getElementById('unitSearchSection');
    if (unitSection) {
        unitSection.classList.add('hidden');
        document.getElementById('unitSearchPrompt').classList.remove('hidden');
        document.getElementById('unitSearchProgress').classList.add('hidden');
        document.getElementById('unitSearchResults').classList.add('hidden');
        document.getElementById('unitSearchResults').innerHTML = '';
        const unitSearchBtn = document.getElementById('unitSearchBtn');
        if (unitSearchBtn) {
            unitSearchBtn.disabled = false;
            unitSearchBtn.innerHTML = '🔍 Search for Units';
        }
    }
    currentLeasingUrl = null;
    currentUnitResults = null;

    // Start enrichment
    try {
        const result = await enrichProperty(property, (message, progress) => {
            updateProgress(message, progress);
        });

        isProcessing = false;

        if (result.success && result.suggestion_count > 0) {
            displaySuggestions(result);
        } else if (result.errors && result.errors.length > 0) {
            showError(result.errors.join(', '));
        } else {
            showError('No property information found. Try searching manually.');
        }

    } catch (error) {
        isProcessing = false;
        showError(error.message);
    }
}

/**
 * Update progress display
 */
function updateProgress(message, progress) {
    const fill = document.getElementById('enrichmentProgressFill');
    const text = document.getElementById('enrichmentProgressText');
    if (fill) fill.style.width = `${progress}%`;
    if (text) text.textContent = message;
}

/**
 * Display enrichment suggestions and verifications
 */
function displaySuggestions(result) {
    document.getElementById('enrichmentProgress').classList.add('hidden');
    document.getElementById('enrichmentResults').classList.remove('hidden');

    currentSuggestions = result.suggestions;

    const container = document.getElementById('enrichmentSuggestions');
    const footer = document.getElementById('enrichmentFooter');

    // ============================================================
    // NON-APARTMENT DETECTION: Show delete suggestion
    // ============================================================
    if (result.suggest_delete && result.non_apartment_detection) {
        const detection = result.non_apartment_detection;
        const foundName = detection.property_name || 'Unknown';
        const reasons = detection.reasons.join('<br>• ');
        const typeLabel = detection.type_label || 'non-apartment property';
        const typeIcon = detection.property_type === 'for_sale' ? '🏠💰' : '🏠';
        const typeDescription = detection.property_type === 'for_sale'
            ? 'This is a for-sale listing, not a rental apartment'
            : 'This is a small property (duplex, single-family, townhome), not an apartment complex';

        container.innerHTML = `
            <div class="enrichment-delete-warning">
                <div class="delete-warning-header">
                    <span class="warning-icon">${typeIcon}</span>
                    <h4>This doesn't appear to be an apartment complex</h4>
                </div>
                <div class="delete-warning-body">
                    <p><strong>Detected as:</strong> ${foundName}</p>
                    <p><strong>Type:</strong> ${typeLabel}</p>
                    <p class="delete-reasons">
                        <strong>Why:</strong><br>
                        • ${reasons}
                    </p>
                    <p class="delete-confidence">
                        ${Math.round(detection.confidence * 100)}% confidence
                    </p>
                    <p class="type-description">${typeDescription}</p>
                </div>
                <div class="delete-warning-actions">
                    <p>This listing may have been imported incorrectly. Would you like to delete it?</p>
                </div>
            </div>
        `;

        // Update footer with delete button
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="window.closeEnrichmentModal()">Keep Listing</button>
            <button class="btn btn-danger" onclick="window.deleteEnrichmentProperty()">
                🗑️ Delete Listing
            </button>
        `;
        return;
    }

    // Show data analysis summary
    const analysis = result.data_analysis || {};
    const missingCount = analysis.missing?.length || 0;
    const foundCount = Object.keys(result.suggestions || {}).length;

    // Track missing fields and leasing URL for potential deep search
    const foundFields = Object.keys(result.suggestions || {});
    currentMissingFields = (analysis.missing || []).filter(f => !foundFields.includes(f));
    currentLeasingUrl = result.suggestions?.leasing_link?.value || currentProperty?.leasing_link;

    // Check if deep search might help (contact fields are usually on subpages)
    const contactFieldsMissing = currentMissingFields.filter(f =>
        ['contact_email', 'contact_name', 'contact_phone'].includes(f)
    );
    const canDeepSearch = contactFieldsMissing.length > 0 && currentLeasingUrl;

    container.innerHTML = `
        <div class="enrichment-analysis-summary">
            <span class="analysis-stat">📊 Missing: ${missingCount} fields</span>
            <span class="analysis-stat found">✅ Found: ${foundCount} matches</span>
        </div>
        <h4>📋 New Data Found</h4>
        <p class="enrichment-hint">Select which suggestions to apply:</p>
    `;

    // Show deep search option if contact fields are still missing
    if (canDeepSearch) {
        container.innerHTML += `
            <div class="deep-search-section">
                <div class="deep-search-prompt">
                    <span class="deep-search-icon">🔍</span>
                    <div class="deep-search-text">
                        <strong>Still missing:</strong> ${contactFieldsMissing.map(f => getFieldLabel(f)).join(', ')}
                        <p class="deep-search-hint">Try scanning the property website's contact page</p>
                    </div>
                    <button class="btn btn-secondary deep-search-btn" id="deepSearchBtn" onclick="window.startDeepSearch()">
                        🌐 Deeper Search
                    </button>
                </div>
            </div>
        `;
    }

    // Display suggestions for missing fields
    if (Object.keys(result.suggestions || {}).length > 0) {
        for (const [field, suggestion] of Object.entries(result.suggestions)) {
            const fieldLabel = getFieldLabel(field);

            // Special rendering for different field types
            let displayValue = '';
            let valueClass = 'enrichment-suggestion-value';

            if (field === 'amenities_tags' && Array.isArray(suggestion.value)) {
                // Render amenity tags as badges
                displayValue = suggestion.value.map(tag =>
                    `<span class="enrichment-tag">${tag}</span>`
                ).join(' ');
                valueClass = 'enrichment-tags-container';
            } else if (field === 'description') {
                // Render description with styling for longer text
                displayValue = `<em>${suggestion.value}</em>`;
                valueClass = 'enrichment-suggestion-value enrichment-description';
            } else if (Array.isArray(suggestion.value)) {
                displayValue = suggestion.value.join(', ');
            } else {
                displayValue = suggestion.value;
            }

            const confidenceClass = suggestion.confidence >= 0.8 ? 'high' :
                suggestion.confidence >= 0.6 ? 'medium' : 'low';

            container.innerHTML += `
                <div class="enrichment-suggestion-item ${field === 'description' ? 'description-item' : ''}">
                    <label class="enrichment-checkbox-label">
                        <input type="checkbox"
                               class="enrichment-checkbox"
                               data-field="${field}"
                               data-type="suggestion"
                               ${suggestion.confidence >= 0.7 ? 'checked' : ''}
                               onchange="window.updateEnrichmentApplyBtn()">
                        <span class="enrichment-field-name">${fieldLabel}</span>
                    </label>
                    <div class="${valueClass}">${displayValue}</div>
                    <div class="enrichment-confidence ${confidenceClass}">
                        ${Math.round(suggestion.confidence * 100)}% confidence
                        <span class="enrichment-source">via ${suggestion.source}</span>
                    </div>
                    ${suggestion.reason ? `<div class="enrichment-reason">${suggestion.reason}</div>` : ''}
                </div>
            `;
        }
    } else {
        container.innerHTML += `<p class="no-suggestions">No new data found for missing fields.</p>`;
    }

    // Display verifications for existing data that may be outdated
    if (result.verifications && Object.keys(result.verifications).length > 0) {
        container.innerHTML += `
            <h4 style="margin-top: 20px;">⚠️ Data Verification</h4>
            <p class="enrichment-hint">Existing data that may need updating:</p>
        `;

        for (const [field, verification] of Object.entries(result.verifications)) {
            const fieldLabel = getFieldLabel(field);
            container.innerHTML += `
                <div class="enrichment-suggestion-item verification-item">
                    <label class="enrichment-checkbox-label">
                        <input type="checkbox"
                               class="enrichment-checkbox"
                               data-field="${field}"
                               data-type="verification"
                               onchange="window.updateEnrichmentApplyBtn()">
                        <span class="enrichment-field-name">${fieldLabel}</span>
                    </label>
                    <div class="enrichment-verification-compare">
                        <div class="current-value">
                            <span class="label">Current:</span> ${verification.current}
                        </div>
                        <div class="suggested-value">
                            <span class="label">Found:</span> ${verification.suggested}
                        </div>
                    </div>
                    <div class="enrichment-reason">${verification.reason}</div>
                </div>
            `;

            // Add to suggestions so it can be applied
            currentSuggestions[field] = {
                value: verification.suggested,
                confidence: 0.7,
                source: verification.source,
                isVerification: true
            };
        }
    }

    // Show screenshot if available
    if (result.screenshot) {
        const screenshotContainer = document.getElementById('enrichmentScreenshot');
        const screenshotImg = document.getElementById('enrichmentScreenshotImg');
        screenshotContainer.classList.remove('hidden');
        screenshotImg.src = result.screenshot;
    }

    // Show unit search section if we have a leasing URL
    if (currentLeasingUrl) {
        const unitSection = document.getElementById('unitSearchSection');
        if (unitSection) {
            unitSection.classList.remove('hidden');
            // Reset unit search UI
            document.getElementById('unitSearchPrompt').classList.remove('hidden');
            document.getElementById('unitSearchProgress').classList.add('hidden');
            document.getElementById('unitSearchResults').classList.add('hidden');
            document.getElementById('unitSearchResults').innerHTML = '';
        }
    }

    // Enable apply button
    updateApplyButton();
}

/**
 * Get human-readable field label
 */
function getFieldLabel(field) {
    const labels = {
        name: '🏢 Property Name',
        amenities: '✨ Amenities',
        amenities_tags: '🏷️ Amenity Tags',
        neighborhood: '📍 Neighborhood',
        description: '📝 Property Description',
        contact_phone: '📞 Contact Phone',
        contact_email: '📧 Contact Email',
        contact_name: '👤 Contact Name',
        leasing_link: '🔗 Leasing URL',
        management_company: '🏛️ Management Company',
        office_hours: '🕐 Office Hours',

        // Pricing
        rent_min: '💰 Min Rent',
        rent_max: '💰 Max Rent',
        specials_text: '🎉 Current Specials',

        // Unit Info
        beds_min: '🛏️ Min Beds',
        beds_max: '🛏️ Max Beds',
        sqft_min: '📐 Min Sqft',
        sqft_max: '📐 Max Sqft',

        // Pet Policy
        accepts_up_to_3_pets: '🐾 Multiple Pets',
        pet_policy: '🐶 Pet Policy',

        // Qualifications
        income_requirement: '💵 Income Requirement',
        accepts_bad_credit: '💳 Bad Credit OK',
        accepts_section_8: '🏠 Section 8',
        accepts_broken_lease_1_year: '📋 Broken Lease OK',
        accepts_broken_lease_under_1: '📋 Recent Broken Lease',
        accepts_eviction_1_year: '⚠️ Eviction OK',
        accepts_eviction_under_1: '⚠️ Recent Eviction',
        accepts_felony: '⚖️ Felony OK',
        accepts_misdemeanor: '⚖️ Misdemeanor OK',
        same_day_move_in: '🚀 Same-Day Move-In'
    };
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('enrichmentProgress').classList.add('hidden');
    document.getElementById('enrichmentError').classList.remove('hidden');
    document.getElementById('enrichmentErrorText').textContent = message;
}

/**
 * Update the apply button state based on selections
 */
export function updateApplyButton() {
    const checkboxes = document.querySelectorAll('.enrichment-checkbox:checked');
    document.getElementById('enrichmentApplyBtn').disabled = checkboxes.length === 0;
}

/**
 * Apply selected enrichment changes
 */
export async function applyChanges() {
    if (!currentProperty || !currentSuggestions) return;

    const checkboxes = document.querySelectorAll('.enrichment-checkbox:checked');
    const selectedFields = Array.from(checkboxes).map(cb => cb.dataset.field);

    // Mark accepted suggestions
    const suggestionsToApply = {};
    for (const field of selectedFields) {
        if (currentSuggestions[field]) {
            suggestionsToApply[field] = {
                ...currentSuggestions[field],
                accepted: true
            };
        }
    }

    try {
        const result = await applyEnrichmentSuggestions(currentProperty.id, suggestionsToApply);

        if (result.success) {
            toast('✅ Property updated with AI suggestions!', 'success');
            closeModal();

            // Trigger a refresh of the listings page
            if (window.refreshListingsPage) {
                window.refreshListingsPage();
            }
        }
    } catch (error) {
        toast(`❌ Failed to apply: ${error.message}`, 'error');
    }
}

/**
 * Close the enrichment modal
 */
export function closeModal() {
    if (enrichmentModal) {
        enrichmentModal.classList.add('hidden');
    }
    currentProperty = null;
    currentSuggestions = null;
}

/**
 * Check if enrichment is available
 * @returns {Promise<boolean>}
 */
export async function isEnrichmentAvailable() {
    const status = await checkEnrichmentStatus();
    return status.configured === true;
}

/**
 * Delete the current property (for non-apartment listings)
 */
export async function deleteProperty() {
    if (!currentProperty) return;

    const propertyName = currentProperty.name || currentProperty.street_address || 'this property';

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${propertyName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const { getSupabase } = await import('../../api/supabase-api.js');
        const supabase = getSupabase();

        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', currentProperty.id);

        if (error) {
            throw new Error(error.message);
        }

        toast('🗑️ Property deleted successfully', 'success');
        closeModal();

        // Trigger a refresh of the listings page
        if (window.refreshListingsPage) {
            window.refreshListingsPage();
        }
    } catch (error) {
        toast(`❌ Failed to delete: ${error.message}`, 'error');
    }
}

/**
 * Start deep search for missing contact fields
 */
async function startDeepSearch() {
    if (isProcessing) return;
    if (!currentProperty || !currentLeasingUrl) {
        toast('No leasing URL available for deep search', 'error');
        return;
    }

    const deepSearchBtn = document.getElementById('deepSearchBtn');
    const container = document.getElementById('enrichmentSuggestions');

    try {
        isProcessing = true;
        deepSearchBtn.disabled = true;
        deepSearchBtn.innerHTML = '⏳ Searching...';

        // Add progress indicator
        const progressHtml = `
            <div id="deepSearchProgress" class="deep-search-progress">
                <div class="progress-bar-container">
                    <div class="progress-bar" id="deepSearchProgressBar" style="width: 0%"></div>
                </div>
                <div class="progress-status" id="deepSearchStatus">Initializing...</div>
            </div>
        `;
        deepSearchBtn.parentElement.querySelector('.deep-search-prompt').insertAdjacentHTML('afterend', progressHtml);

        const result = await deepSearchProperty(
            { ...currentProperty, leasing_link: currentLeasingUrl },
            currentMissingFields,
            (message, percent) => {
                const bar = document.getElementById('deepSearchProgressBar');
                const status = document.getElementById('deepSearchStatus');
                if (bar) bar.style.width = `${percent}%`;
                if (status) status.textContent = message;
            }
        );

        // Remove progress bar
        const progressEl = document.getElementById('deepSearchProgress');
        if (progressEl) progressEl.remove();

        // Process results
        if (result.suggestions && Object.keys(result.suggestions).length > 0) {
            toast(`🎉 Found ${Object.keys(result.suggestions).length} additional fields!`, 'success');

            // Merge new suggestions into current suggestions
            for (const [field, suggestion] of Object.entries(result.suggestions)) {
                currentSuggestions[field] = suggestion;
            }

            // Add new suggestions to the UI
            for (const [field, suggestion] of Object.entries(result.suggestions)) {
                const fieldLabel = getFieldLabel(field);
                const suggestionHtml = `
                    <div class="enrichment-suggestion-item deep-search-result">
                        <label class="enrichment-checkbox-label">
                            <input type="checkbox"
                                   class="enrichment-checkbox"
                                   data-field="${field}"
                                   data-type="suggestion"
                                   checked
                                   onchange="window.updateEnrichmentApplyBtn()">
                            <span class="enrichment-field-name">${fieldLabel}</span>
                            <span class="deep-search-badge">🌐 Deep Search</span>
                        </label>
                        <div class="enrichment-suggestion-value">${suggestion.value}</div>
                        <div class="enrichment-confidence high">
                            ${Math.round(suggestion.confidence * 100)}% confidence
                            <span class="enrichment-source">via ${suggestion.source}</span>
                        </div>
                        ${suggestion.reason ? `<div class="enrichment-reason">${suggestion.reason}</div>` : ''}
                    </div>
                `;

                // Insert after the deep search section
                const deepSearchSection = container.querySelector('.deep-search-section');
                if (deepSearchSection) {
                    deepSearchSection.insertAdjacentHTML('afterend', suggestionHtml);
                }
            }

            // Hide the deep search button
            const deepSearchSection = container.querySelector('.deep-search-section');
            if (deepSearchSection) {
                deepSearchSection.innerHTML = `
                    <div class="deep-search-complete">
                        ✅ Deep search found ${Object.keys(result.suggestions).length} additional fields
                    </div>
                `;
            }

            updateApplyButton();
        } else {
            toast('No additional data found on property website', 'info');
            deepSearchBtn.innerHTML = '❌ No Results';
            deepSearchBtn.disabled = true;
        }

    } catch (error) {
        console.error('[Deep Search] Error:', error);
        toast(`Deep search failed: ${error.message}`, 'error');
        deepSearchBtn.innerHTML = '🌐 Retry Search';
        deepSearchBtn.disabled = false;
    } finally {
        isProcessing = false;
    }
}

/**
 * Start unit search for available units and floor plans
 */
async function startUnitSearch() {
    console.log('[Unit Search] Button clicked, isProcessing:', isProcessing, 'currentProperty:', !!currentProperty, 'currentLeasingUrl:', currentLeasingUrl);

    if (isProcessing) {
        console.log('[Unit Search] Blocked - still processing');
        return;
    }
    if (!currentProperty || !currentLeasingUrl) {
        console.log('[Unit Search] Blocked - no property or leasing URL');
        toast('No leasing URL available for unit search', 'error');
        return;
    }

    const unitSearchBtn = document.getElementById('unitSearchBtn');
    const promptDiv = document.getElementById('unitSearchPrompt');
    const progressDiv = document.getElementById('unitSearchProgress');
    const resultsDiv = document.getElementById('unitSearchResults');
    const progressFill = document.getElementById('unitSearchProgressFill');
    const progressText = document.getElementById('unitSearchProgressText');

    try {
        isProcessing = true;
        unitSearchBtn.disabled = true;
        promptDiv.classList.add('hidden');
        progressDiv.classList.remove('hidden');

        const propertyName = currentSuggestions?.name?.value || currentProperty.name || currentProperty.community_name;
        const address = currentProperty.street_address || currentProperty.address;

        const result = await searchPropertyUnits({
            propertyId: currentProperty.id,
            propertyName: propertyName,
            leasingUrl: currentLeasingUrl,
            address: address
        }, (message, percent) => {
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (progressText) progressText.textContent = message;
        });

        progressDiv.classList.add('hidden');
        currentUnitResults = result;

        // Display results
        displayUnitResults(result, resultsDiv);

    } catch (error) {
        console.error('[Unit Search] Error:', error);
        toast(`Unit search failed: ${error.message}`, 'error');
        progressDiv.classList.add('hidden');
        promptDiv.classList.remove('hidden');
        unitSearchBtn.disabled = false;
        unitSearchBtn.innerHTML = '🔄 Retry Search';
    } finally {
        isProcessing = false;
    }
}

/**
 * Display unit search results
 */
function displayUnitResults(result, container) {
    container.classList.remove('hidden');

    const floorPlans = result.floorPlans || [];
    const units = result.units || [];

    if (floorPlans.length === 0 && units.length === 0) {
        container.innerHTML = `
            <div class="unit-search-empty">
                <p>❌ No unit data found on the property website.</p>
                <p class="hint">The website may not have a public floor plans or availability page.</p>
            </div>
        `;
        return;
    }

    let html = `<div class="unit-search-found">`;

    // Floor Plans Summary
    if (floorPlans.length > 0) {
        html += `
            <h5>📐 Floor Plans Found (${floorPlans.length})</h5>
            <div class="unit-floor-plans-table">
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllFloorPlans" onchange="window.toggleAllFloorPlans(this.checked)"></th>
                            <th>Name</th>
                            <th>Beds/Baths</th>
                            <th>Sqft</th>
                            <th>Rent Range</th>
                            <th>Avail</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        floorPlans.forEach((fp, idx) => {
            const rentRange = fp.rent_min === fp.rent_max
                ? `$${fp.rent_min?.toLocaleString() || '?'}`
                : `$${fp.rent_min?.toLocaleString() || '?'} - $${fp.rent_max?.toLocaleString() || '?'}`;
            html += `
                <tr>
                    <td><input type="checkbox" class="fp-checkbox" data-fp-idx="${idx}" checked></td>
                    <td><strong>${fp.name}</strong></td>
                    <td>${fp.beds}bd/${fp.baths}ba</td>
                    <td>${fp.sqft?.toLocaleString() || '?'} sqft</td>
                    <td>${rentRange}</td>
                    <td>${fp.units_available || '?'}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    }

    // Individual Units
    if (units.length > 0) {
        html += `
            <h5 style="margin-top: 16px;">🏠 Individual Units Found (${units.length})</h5>
            <div class="unit-units-table">
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllUnits" onchange="window.toggleAllUnits(this.checked)"></th>
                            <th>Unit #</th>
                            <th>Floor Plan</th>
                            <th>Beds/Baths</th>
                            <th>Sqft</th>
                            <th>Rent</th>
                            <th>Available</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        units.forEach((unit, idx) => {
            const availDate = unit.available_from
                ? new Date(unit.available_from).toLocaleDateString()
                : 'Now';
            const statusBadge = unit.status === 'available'
                ? '<span class="badge-available">Available</span>'
                : unit.status === 'pending'
                    ? '<span class="badge-pending">Pending</span>'
                    : '<span class="badge-leased">Leased</span>';
            html += `
                <tr>
                    <td><input type="checkbox" class="unit-checkbox" data-unit-idx="${idx}" checked></td>
                    <td><strong>${unit.unit_number}</strong></td>
                    <td>${unit.floor_plan_name || '-'}</td>
                    <td>${unit.beds}bd/${unit.baths}ba</td>
                    <td>${unit.sqft?.toLocaleString() || '?'}</td>
                    <td>$${unit.rent?.toLocaleString() || '?'}</td>
                    <td>${availDate}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    }

    html += `
        <div class="unit-search-actions">
            <button class="btn btn-primary" onclick="window.importSelectedUnits()">
                📥 Import Selected Units
            </button>
            <p class="import-hint">This will create/update floor plans and units for this property</p>
        </div>
    </div>`;

    container.innerHTML = html;
}

/**
 * Toggle all floor plan checkboxes
 */
function toggleAllFloorPlans(checked) {
    document.querySelectorAll('.fp-checkbox').forEach(cb => cb.checked = checked);
}

/**
 * Toggle all unit checkboxes
 */
function toggleAllUnits(checked) {
    document.querySelectorAll('.unit-checkbox').forEach(cb => cb.checked = checked);
}

/**
 * Import selected units and floor plans to the database
 */
async function importSelectedUnits() {
    if (!currentUnitResults || !currentProperty) {
        toast('No unit data to import', 'error');
        return;
    }

    const floorPlans = currentUnitResults.floorPlans || [];
    const units = currentUnitResults.units || [];
    const propertyId = currentProperty.id;

    // Get selected floor plans
    const selectedFpIndexes = [];
    document.querySelectorAll('.fp-checkbox:checked').forEach(cb => {
        selectedFpIndexes.push(parseInt(cb.dataset.fpIdx));
    });

    // Get selected units
    const selectedUnitIndexes = [];
    document.querySelectorAll('.unit-checkbox:checked').forEach(cb => {
        selectedUnitIndexes.push(parseInt(cb.dataset.unitIdx));
    });

    if (selectedFpIndexes.length === 0 && selectedUnitIndexes.length === 0) {
        toast('No items selected to import', 'error');
        return;
    }

    try {
        const importBtn = document.querySelector('.unit-search-actions button');
        importBtn.disabled = true;
        importBtn.innerHTML = '⏳ Importing...';

        let fpCreated = 0, fpUpdated = 0, unitsCreated = 0;

        // Create a map of floor plan name -> DB id for linking units
        const floorPlanMap = new Map();

        // Import floor plans first
        for (const idx of selectedFpIndexes) {
            const fp = floorPlans[idx];
            if (!fp) continue;

            // Check if floor plan already exists for this property
            const existingFps = await getFloorPlans(propertyId);
            const existing = existingFps?.find(e =>
                e.beds === fp.beds && e.baths === fp.baths
            );

            if (existing) {
                // Update existing floor plan
                await updateFloorPlan(existing.id, {
                    name: fp.name,
                    sqft: fp.sqft || existing.sqft,
                    market_rent: fp.rent_max || existing.market_rent,
                    starting_at: fp.rent_min || existing.starting_at,
                    units_available: fp.units_available || existing.units_available
                });
                floorPlanMap.set(fp.name, existing.id);
                fpUpdated++;
            } else {
                // Create new floor plan
                const newFp = await createFloorPlan({
                    property_id: propertyId,
                    name: fp.name,
                    beds: fp.beds,
                    baths: fp.baths,
                    sqft: fp.sqft || null,
                    market_rent: fp.rent_max || fp.rent_min || 0,
                    starting_at: fp.rent_min || fp.rent_max || 0,
                    units_available: fp.units_available || 0,
                    has_concession: false
                });
                floorPlanMap.set(fp.name, newFp.id);
                fpCreated++;
            }
        }

        // Import units
        for (const idx of selectedUnitIndexes) {
            const unit = units[idx];
            if (!unit) continue;

            // Find or create the floor plan for this unit
            let floorPlanId = floorPlanMap.get(unit.floor_plan_name);

            if (!floorPlanId) {
                // Create a floor plan for this unit if needed
                const existingFps = await getFloorPlans(propertyId);
                const existing = existingFps?.find(e =>
                    e.beds === unit.beds && e.baths === unit.baths
                );

                if (existing) {
                    floorPlanId = existing.id;
                } else {
                    const newFp = await createFloorPlan({
                        property_id: propertyId,
                        name: unit.floor_plan_name || `${unit.beds}x${unit.baths}`,
                        beds: unit.beds,
                        baths: unit.baths,
                        sqft: unit.sqft || null,
                        market_rent: unit.rent || 0,
                        starting_at: unit.rent || 0,
                        units_available: 1,
                        has_concession: false
                    });
                    floorPlanId = newFp.id;
                    fpCreated++;
                }
            }

            // Create the unit
            await createUnit({
                floor_plan_id: floorPlanId,
                property_id: propertyId,
                unit_number: unit.unit_number,
                floor: unit.floor || null,
                rent: unit.rent || null,
                market_rent: unit.rent || null,
                available_from: unit.available_from || new Date().toISOString().split('T')[0],
                is_available: unit.status === 'available',
                status: unit.status || 'available',
                is_active: true
            });
            unitsCreated++;
        }

        toast(`✅ Imported: ${fpCreated} floor plans created, ${fpUpdated} updated, ${unitsCreated} units added`, 'success');

        // Update the UI
        const resultsDiv = document.getElementById('unitSearchResults');
        resultsDiv.innerHTML = `
            <div class="unit-import-success">
                <h5>✅ Import Complete!</h5>
                <p>${fpCreated} floor plan(s) created</p>
                <p>${fpUpdated} floor plan(s) updated</p>
                <p>${unitsCreated} unit(s) added</p>
            </div>
        `;

        // Refresh listings
        if (window.refreshListingsPage) {
            window.refreshListingsPage();
        }

    } catch (error) {
        console.error('[Unit Import] Error:', error);
        toast(`Import failed: ${error.message}`, 'error');
        const importBtn = document.querySelector('.unit-search-actions button');
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.innerHTML = '📥 Retry Import';
        }
    }
}

// Export global functions for onclick handlers
window.closeEnrichmentModal = closeModal;
window.applyEnrichmentChanges = applyChanges;
window.updateEnrichmentApplyBtn = updateApplyButton;
window.openPropertyEnrichment = openEnrichmentModal;
window.deleteEnrichmentProperty = deleteProperty;
window.startDeepSearch = startDeepSearch;
window.startUnitSearch = startUnitSearch;
window.toggleAllFloorPlans = toggleAllFloorPlans;
window.toggleAllUnits = toggleAllUnits;
window.importSelectedUnits = importSelectedUnits;

export default {
    initEnrichmentUI,
    openEnrichmentModal,
    closeModal,
    isEnrichmentAvailable
};

