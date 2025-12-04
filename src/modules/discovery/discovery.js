/**
 * Apartment Discovery Module
 * Scans Google Maps for apartment complexes using SerpAPI
 */

import { API_BASE_URL } from '../../api/config.js';

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
    addLogEntry('info', '🤖 Auto-enrichment feature coming soon!');
    // TODO: Implement batch enrichment
}

// Export for global access
window.initDiscovery = initDiscovery;

