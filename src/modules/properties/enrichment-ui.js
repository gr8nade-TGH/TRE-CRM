/**
 * Property Enrichment UI Module
 * 
 * Provides UI components for AI-powered property data enrichment.
 * Includes modal for reviewing and accepting suggestions.
 * 
 * @module properties/enrichment-ui
 */

import { enrichProperty, applyEnrichmentSuggestions, markAsReviewed, checkEnrichmentStatus } from '../../api/property-enrichment.js';
import { toast } from '../../utils/helpers.js';

// State
let currentProperty = null;
let currentSuggestions = null;
let enrichmentModal = null;

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

    currentProperty = property;
    currentSuggestions = null;

    // Show modal
    enrichmentModal.classList.remove('hidden');

    // Set property info
    document.getElementById('enrichmentPropertyName').textContent =
        property.name || property.community_name || 'Unknown Property';
    document.getElementById('enrichmentPropertyAddress').textContent =
        `${property.street_address || property.address}, ${property.city}, ${property.state} ${property.zip_code}`;

    // Reset UI state
    document.getElementById('enrichmentProgress').classList.remove('hidden');
    document.getElementById('enrichmentResults').classList.add('hidden');
    document.getElementById('enrichmentError').classList.add('hidden');
    document.getElementById('enrichmentApplyBtn').disabled = true;
    document.getElementById('enrichmentSuggestions').innerHTML = '';

    // Start enrichment
    try {
        const result = await enrichProperty(property, (message, progress) => {
            updateProgress(message, progress);
        });

        if (result.success && result.suggestion_count > 0) {
            displaySuggestions(result);
        } else if (result.errors && result.errors.length > 0) {
            showError(result.errors.join(', '));
        } else {
            showError('No property information found. Try searching manually.');
        }

    } catch (error) {
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
 * Display enrichment suggestions
 */
function displaySuggestions(result) {
    document.getElementById('enrichmentProgress').classList.add('hidden');
    document.getElementById('enrichmentResults').classList.remove('hidden');

    currentSuggestions = result.suggestions;

    const container = document.getElementById('enrichmentSuggestions');
    container.innerHTML = `
        <h4>📋 Suggested Updates</h4>
        <p class="enrichment-hint">Select which suggestions to apply:</p>
    `;

    for (const [field, suggestion] of Object.entries(result.suggestions)) {
        const fieldLabel = getFieldLabel(field);
        const displayValue = Array.isArray(suggestion.value)
            ? suggestion.value.join(', ')
            : suggestion.value;

        const confidenceClass = suggestion.confidence >= 0.8 ? 'high' :
            suggestion.confidence >= 0.6 ? 'medium' : 'low';

        container.innerHTML += `
            <div class="enrichment-suggestion-item">
                <label class="enrichment-checkbox-label">
                    <input type="checkbox" 
                           class="enrichment-checkbox" 
                           data-field="${field}" 
                           ${suggestion.confidence >= 0.7 ? 'checked' : ''}
                           onchange="window.updateEnrichmentApplyBtn()">
                    <span class="enrichment-field-name">${fieldLabel}</span>
                </label>
                <div class="enrichment-suggestion-value">${displayValue}</div>
                <div class="enrichment-confidence ${confidenceClass}">
                    ${Math.round(suggestion.confidence * 100)}% confidence
                    <span class="enrichment-source">via ${suggestion.source}</span>
                </div>
            </div>
        `;
    }

    // Show screenshot if available
    if (result.screenshot) {
        const screenshotContainer = document.getElementById('enrichmentScreenshot');
        const screenshotImg = document.getElementById('enrichmentScreenshotImg');
        screenshotContainer.classList.remove('hidden');
        screenshotImg.src = result.screenshot;
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
        contact_phone: '📞 Contact Phone',
        contact_email: '📧 Contact Email',
        leasing_link: '🔗 Leasing URL',
        management_company: '🏛️ Management Company'
    };
    return labels[field] || field;
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

// Export global functions for onclick handlers
window.closeEnrichmentModal = closeModal;
window.applyEnrichmentChanges = applyChanges;
window.updateEnrichmentApplyBtn = updateApplyButton;
window.openPropertyEnrichment = openEnrichmentModal;

export default {
    initEnrichmentUI,
    openEnrichmentModal,
    closeModal,
    isEnrichmentAvailable
};

