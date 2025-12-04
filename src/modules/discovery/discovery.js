/**
 * Apartment Discovery Module
 * Scans Google Maps for apartment complexes using SerpAPI
 */

// API Base URL - use relative path for Vercel deployment
const API_BASE_URL = '';

// State
let areas = [];
let isScanning = false;
let shouldStop = false;
let totalFound = 0;
let areasScanned = 0;

/**
 * Initialize the discovery page
 */
export async function initDiscovery() {
    console.log('[Discovery] Initializing...');

    // Load areas from API
    try {
        const response = await fetch(`${API_BASE_URL}/api/property/discover`);
        const data = await response.json();

        if (data.success) {
            areas = data.areas;
            renderAreasGrid();
            updateAreasCount();
        }
    } catch (error) {
        console.error('[Discovery] Failed to load areas:', error);
        addLogEntry('error', 'Failed to load areas: ' + error.message);
    }

    // Setup event listeners
    setupEventListeners();
}

/**
 * Setup event listeners for controls
 */
function setupEventListeners() {
    const startBtn = document.getElementById('startFullScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const enrichBtn = document.getElementById('runEnrichmentBtn');

    if (startBtn) {
        startBtn.addEventListener('click', startFullScan);
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', stopScan);
    }

    if (enrichBtn) {
        enrichBtn.addEventListener('click', runAutoEnrichment);
    }
}

/**
 * Render the areas grid
 */
function renderAreasGrid() {
    const grid = document.getElementById('discoveryAreasGrid');
    if (!grid) return;

    grid.innerHTML = areas.map(area => `
        <div class="area-card" id="area-${area.index}" data-status="pending">
            <span class="area-icon">📍</span>
            <span class="area-name">${area.name}</span>
            <span class="area-status">Pending</span>
        </div>
    `).join('');
}

/**
 * Update area card status
 */
function updateAreaStatus(index, status, count = null) {
    const card = document.getElementById(`area-${index}`);
    if (!card) return;

    card.dataset.status = status;
    const statusEl = card.querySelector('.area-status');
    const iconEl = card.querySelector('.area-icon');

    switch (status) {
        case 'scanning':
            iconEl.textContent = '🔄';
            statusEl.textContent = 'Scanning...';
            break;
        case 'complete':
            iconEl.textContent = '✅';
            statusEl.textContent = count !== null ? `${count} found` : 'Done';
            break;
        case 'error':
            iconEl.textContent = '❌';
            statusEl.textContent = 'Error';
            break;
    }
}

/**
 * Add entry to log
 */
function addLogEntry(type, message) {
    const container = document.getElementById('discoveryLogContainer');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    container.insertBefore(entry, container.firstChild);

    // Keep only last 100 entries
    while (container.children.length > 100) {
        container.removeChild(container.lastChild);
    }
}

/**
 * Update progress UI
 */
function updateProgress(current, total, message) {
    const percent = Math.round((current / total) * 100);

    document.getElementById('discoveryProgressBar').style.width = `${percent}%`;
    document.getElementById('discoveryProgressText').textContent = message;
    document.getElementById('discoveryProgressPercent').textContent = `${percent}%`;
}

/**
 * Update counts
 */
function updateAreasCount() {
    document.getElementById('discoveryAreasScanned').textContent = `${areasScanned} / ${areas.length}`;
    document.getElementById('discoveryTotalFound').textContent = totalFound;
}

/**
 * Start full scan of all areas
 */
async function startFullScan() {
    if (isScanning) return;

    isScanning = true;
    shouldStop = false;
    totalFound = 0;
    areasScanned = 0;

    // Update UI
    document.getElementById('startFullScanBtn').disabled = true;
    document.getElementById('stopScanBtn').disabled = false;
    document.getElementById('runEnrichmentBtn').disabled = true;
    document.getElementById('discoveryProgressSection').style.display = 'block';
    document.getElementById('discoveryStatus').textContent = 'Scanning...';

    addLogEntry('info', '🚀 Starting full scan of San Antonio...');

    // Reset all area cards
    areas.forEach(a => updateAreaStatus(a.index, 'pending'));

    // Scan each area
    for (let i = 0; i < areas.length; i++) {
        if (shouldStop) {
            addLogEntry('warning', '⏹️ Scan stopped by user');
            break;
        }

        const area = areas[i];
        updateAreaStatus(area.index, 'scanning');
        updateProgress(i, areas.length, `Scanning ${area.name}...`);

        try {
            const result = await scanArea(area.index);
            totalFound += result.inserted;
            areasScanned++;

            updateAreaStatus(area.index, 'complete', result.apartments);
            addLogEntry('success', `✅ ${area.name}: Found ${result.apartments} apartments, ${result.inserted} new`);

        } catch (error) {
            updateAreaStatus(area.index, 'error');
            addLogEntry('error', `❌ ${area.name}: ${error.message}`);
        }

        updateAreasCount();

        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
    }

    // Complete
    isScanning = false;
    document.getElementById('startFullScanBtn').disabled = false;
    document.getElementById('stopScanBtn').disabled = true;
    document.getElementById('runEnrichmentBtn').disabled = totalFound === 0;
    document.getElementById('discoveryStatus').textContent = shouldStop ? 'Stopped' : 'Complete';

    updateProgress(areas.length, areas.length, 'Scan complete!');
    addLogEntry('info', `🎉 Scan complete! Found ${totalFound} new apartments.`);
}

/**
 * Scan a single area
 */
async function scanArea(areaIndex) {
    const response = await fetch(`${API_BASE_URL}/api/property/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaIndex })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
}

/**
 * Stop the current scan
 */
function stopScan() {
    shouldStop = true;
    document.getElementById('stopScanBtn').disabled = true;
    addLogEntry('warning', '⏸️ Stopping scan...');
}

/**
 * Run auto-enrichment on all discovered properties
 */
async function runAutoEnrichment() {
    addLogEntry('info', '🤖 Starting auto-enrichment of discovered properties...');

    document.getElementById('runEnrichmentBtn').disabled = true;
    document.getElementById('startFullScanBtn').disabled = true;
    document.getElementById('discoveryStatus').textContent = 'Enriching...';

    try {
        // First check how many pending properties
        const checkResponse = await fetch(`${API_BASE_URL}/api/property/batch-enrich`);
        const checkData = await checkResponse.json();

        if (!checkData.configured) {
            addLogEntry('error', '❌ Enrichment not configured - missing API keys on server');
            return;
        }

        if (checkData.pending === 0) {
            addLogEntry('info', '✅ No pending properties to enrich');
            return;
        }

        addLogEntry('info', `Found ${checkData.pending} properties to enrich`);

        let totalEnriched = 0;
        let totalFailed = 0;
        let remaining = checkData.pending;

        // Process in batches of 5
        while (remaining > 0) {
            addLogEntry('info', `🔄 Processing batch... (${remaining} remaining)`);

            const response = await fetch(`${API_BASE_URL}/api/property/batch-enrich`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: 5 })
            });

            if (!response.ok) {
                const error = await response.json();
                addLogEntry('error', `❌ Batch error: ${error.message || error.error}`);
                break;
            }

            const result = await response.json();

            totalEnriched += result.enriched;
            totalFailed += result.failed;
            remaining = result.remaining;

            // Log individual results
            for (const r of result.results || []) {
                if (r.status === 'enriched') {
                    addLogEntry('success', `✅ ${r.name}`);
                } else if (r.status === 'error') {
                    addLogEntry('error', `❌ ${r.name}: ${r.error}`);
                } else {
                    addLogEntry('info', `ℹ️ ${r.name}: no data found`);
                }
            }

            // Update progress
            const processed = checkData.pending - remaining;
            const percent = Math.round((processed / checkData.pending) * 100);
            document.getElementById('discoveryProgressBar').style.width = `${percent}%`;
            document.getElementById('discoveryProgressText').textContent = `Enriching... ${processed}/${checkData.pending}`;
            document.getElementById('discoveryProgressPercent').textContent = `${percent}%`;

            // Small delay between batches
            if (remaining > 0) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        addLogEntry('info', `🎉 Enrichment complete! ${totalEnriched} enriched, ${totalFailed} failed`);

    } catch (error) {
        addLogEntry('error', `❌ Enrichment error: ${error.message}`);
    } finally {
        document.getElementById('runEnrichmentBtn').disabled = false;
        document.getElementById('startFullScanBtn').disabled = false;
        document.getElementById('discoveryStatus').textContent = 'Ready';
    }
}

// Export for global access
window.initDiscovery = initDiscovery;

