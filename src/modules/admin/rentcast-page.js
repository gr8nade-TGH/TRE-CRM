/**
 * RentCast API Reference Page Module
 * 
 * Handles initialization and interactivity for the RentCast API page.
 * 
 * @module admin/rentcast-page
 */

import { checkStatus, getListings } from '../../api/rentcast-api.js';
import { syncSanAntonio } from '../../api/rentcast-sync.js';
import { toast } from '../../utils/helpers.js';

/**
 * Initialize the RentCast API page
 * Checks API status and sets up event listeners
 */
export async function initializeRentCastPage() {
    console.log('📡 Initializing RentCast API page...');

    // Check API status
    await updateApiStatus();

    // Set up event listeners
    setupEventListeners();

    // Set up collapsible endpoint categories
    setupCollapsibles();

    console.log('✅ RentCast API page initialized');
}

/**
 * Update the API status display
 */
async function updateApiStatus() {
    const statusEl = document.getElementById('rentcastApiStatus');
    const keyEl = document.getElementById('rentcastApiKey');
    const quotaEl = document.getElementById('rentcastQuota');

    if (statusEl) {
        statusEl.innerHTML = '<span class="status-dot pending"></span> Checking...';
    }

    try {
        const status = await checkStatus();

        if (statusEl) {
            if (status.connected) {
                statusEl.innerHTML = '<span class="status-dot connected"></span> Connected';
            } else if (status.configured) {
                statusEl.innerHTML = '<span class="status-dot error"></span> Error';
            } else {
                statusEl.innerHTML = '<span class="status-dot pending"></span> Not Connected';
            }
        }

        if (keyEl) {
            keyEl.textContent = status.keyPreview || 'Not configured';
        }

        if (quotaEl && status.rateLimit) {
            const remaining = status.rateLimit.remaining ?? '--';
            const limit = status.rateLimit.limit ?? '50';
            quotaEl.textContent = `${remaining} / ${limit} requests`;
        }

    } catch (error) {
        console.error('Failed to check RentCast status:', error);
        if (statusEl) {
            statusEl.innerHTML = '<span class="status-dot error"></span> Error';
        }
    }
}

/**
 * Set up event listeners for the page
 */
function setupEventListeners() {
    // Configure API Key button
    const configureBtn = document.getElementById('configureRentcastBtn');
    if (configureBtn) {
        configureBtn.addEventListener('click', () => {
            toast('API key is configured via Vercel Environment Variables. Go to Vercel Dashboard → Settings → Environment Variables → Add RENTCAST_API_KEY', 'info');
        });
    }

    // Test Connection button
    const testBtn = document.getElementById('testRentcastBtn');
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            await testApiConnection();
        });
    }

    // Refresh Status button
    const refreshBtn = document.getElementById('refreshRentcastStatus');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await updateApiStatus();
            toast('Status refreshed', 'success');
        });
    }

    // Sync San Antonio button
    const syncBtn = document.getElementById('syncSanAntonioBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await runSanAntonioSync();
        });
    }
}

/**
 * Set up collapsible endpoint categories
 */
function setupCollapsibles() {
    const categoryHeaders = document.querySelectorAll('.endpoint-category-header');

    categoryHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const category = header.closest('.endpoint-category');
            if (category) {
                category.classList.toggle('collapsed');
            }
        });
    });
}

/**
 * Test API connection with a sample request
 */
async function testApiConnection() {
    toast('Testing API connection...', 'info');

    try {
        const result = await getListings({
            city: 'San Antonio',
            state: 'TX',
            limit: 5
        });

        if (result.success) {
            toast(`✅ API working! Found ${result.count} listings in San Antonio`, 'success');
            console.log('[RentCast] Test results:', result);
        } else {
            toast(`❌ API error: ${result.error || result.message}`, 'error');
        }
    } catch (error) {
        toast(`❌ Connection failed: ${error.message}`, 'error');
    }
}

/**
 * Run San Antonio sync with progress UI
 */
async function runSanAntonioSync() {
    const syncBtn = document.getElementById('syncSanAntonioBtn');
    const progressContainer = document.getElementById('syncProgressContainer');
    const progressBar = document.getElementById('syncProgressBar');
    const progressText = document.getElementById('syncProgressText');
    const resultsContainer = document.getElementById('syncResultsContainer');

    // Disable button and show progress
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '⏳ Syncing...';
    }
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }

    try {
        const results = await syncSanAntonio((message, current, total) => {
            // Update progress UI
            if (progressBar) {
                progressBar.style.width = `${(current / total) * 100}%`;
            }
            if (progressText) {
                progressText.textContent = message;
            }
        });

        // Show results
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="sync-results ${results.success ? 'success' : 'error'}">
                    <h4>${results.success ? '✅ Sync Complete!' : '❌ Sync Failed'}</h4>
                    <div class="sync-stats">
                        <div class="stat"><strong>${results.propertiesCreated}</strong> Properties</div>
                        <div class="stat"><strong>${results.floorPlansCreated}</strong> Floor Plans</div>
                        <div class="stat"><strong>${results.unitsCreated}</strong> Units</div>
                        ${results.deletedTestData > 0 ? `<div class="stat"><strong>${results.deletedTestData}</strong> Test Records Removed</div>` : ''}
                    </div>
                    ${results.errors.length > 0 ? `
                        <details class="sync-errors">
                            <summary>${results.errors.length} error(s)</summary>
                            <ul>
                                ${results.errors.slice(0, 10).map(e => `<li>${e}</li>`).join('')}
                                ${results.errors.length > 10 ? `<li>...and ${results.errors.length - 10} more</li>` : ''}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            `;
        }

        if (results.success) {
            toast(`✅ Synced ${results.propertiesCreated} properties with ${results.unitsCreated} units!`, 'success');
        } else {
            toast(`❌ Sync had errors. Check results below.`, 'error');
        }

    } catch (error) {
        console.error('Sync failed:', error);
        toast(`❌ Sync failed: ${error.message}`, 'error');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `<div class="sync-results error"><p>❌ ${error.message}</p></div>`;
        }
    } finally {
        // Re-enable button
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '🔄 Sync San Antonio Listings';
        }
    }
}

export default {
    initializeRentCastPage
};

