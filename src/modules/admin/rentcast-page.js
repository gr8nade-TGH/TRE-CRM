/**
 * RentCast API Reference Page Module
 * 
 * Handles initialization and interactivity for the RentCast API page.
 * 
 * @module admin/rentcast-page
 */

import { checkStatus, getListings } from '../../api/rentcast-api.js';
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

export default {
    initializeRentCastPage
};

