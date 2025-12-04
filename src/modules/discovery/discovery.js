/**
 * Apartment Discovery Module
 * Scans Google Maps for apartment complexes using SerpAPI
 *
 * Strategy: Grid-based GPS search with pagination
 * - 36 GPS grid points covering San Antonio metro
 * - 3 search queries per point (apartments, apartment complex, apartment homes)
 * - 3 pages per query (0, 20, 40)
 * - Total: ~324 API calls for comprehensive coverage
 */

// API Base URL - use relative path for Vercel deployment
const API_BASE_URL = '';

// State
let gridPoints = [];
let searchQueries = [];
let isScanning = false;
let shouldStop = false;
let totalFound = 0;
let totalInserted = 0;
let totalSpecialsFound = 0;
let gridPointsScanned = 0;
let currentSearch = { gridIndex: 0, queryIndex: 0, page: 0 };

/**
 * Initialize the discovery page
 */
export async function initDiscovery() {
    console.log('[Discovery] Initializing...');

    // Load grid configuration from API
    try {
        const response = await fetch(`${API_BASE_URL}/api/property/discover`);
        const data = await response.json();

        if (data.success) {
            gridPoints = data.grid;
            searchQueries = data.searchQueries || ['apartments'];
            renderGridPointsDisplay();
            updateStats();
            addLogEntry('info', `Ready to scan ${gridPoints.length} grid points with ${searchQueries.length} queries each`);
        }
    } catch (error) {
        console.error('[Discovery] Failed to load grid:', error);
        addLogEntry('error', 'Failed to load grid configuration: ' + error.message);
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
 * Render the grid points display
 */
function renderGridPointsDisplay() {
    const grid = document.getElementById('discoveryAreasGrid');
    if (!grid) return;

    grid.innerHTML = gridPoints.map(point => `
        <div class="area-card" id="grid-${point.index}" data-status="pending">
            <span class="area-icon">📍</span>
            <span class="area-name">${point.name}</span>
            <span class="area-status">Pending</span>
        </div>
    `).join('');
}

/**
 * Update grid point card status
 */
function updateGridPointStatus(index, status, count = null) {
    const card = document.getElementById(`grid-${index}`);
    if (!card) return;

    card.dataset.status = status;
    const statusEl = card.querySelector('.area-status');
    const iconEl = card.querySelector('.area-icon');

    switch (status) {
        case 'scanning':
            iconEl.textContent = '🔄';
            statusEl.textContent = 'Scanning...';
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            break;
        case 'complete':
            iconEl.textContent = '✅';
            statusEl.textContent = count !== null ? `+${count} new` : 'Done';
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
 * Update stats display
 */
function updateStats() {
    const areasEl = document.getElementById('discoveryAreasScanned');
    const foundEl = document.getElementById('discoveryTotalFound');
    const specialsEl = document.getElementById('discoverySpecialsFound');

    if (areasEl) areasEl.textContent = `${gridPointsScanned} / ${gridPoints.length}`;
    if (foundEl) foundEl.textContent = `${totalInserted} new (${totalFound} total)`;
    if (specialsEl) specialsEl.textContent = totalSpecialsFound;
}

/**
 * Start full scan of all grid points
 */
async function startFullScan() {
    if (isScanning) return;

    isScanning = true;
    shouldStop = false;
    totalFound = 0;
    totalInserted = 0;
    gridPointsScanned = 0;
    currentSearch = { gridIndex: 0, queryIndex: 0, page: 0 };

    // Update UI
    document.getElementById('startFullScanBtn').disabled = true;
    document.getElementById('stopScanBtn').disabled = false;
    document.getElementById('runEnrichmentBtn').disabled = true;
    document.getElementById('discoveryProgressSection').style.display = 'block';
    document.getElementById('discoveryStatus').textContent = 'Scanning...';

    addLogEntry('info', '🚀 Starting comprehensive grid scan of San Antonio metro...');
    addLogEntry('info', `📍 ${gridPoints.length} grid points × ${searchQueries.length} queries × 3 pages = ${gridPoints.length * searchQueries.length * 3} searches`);

    // Reset all grid point cards
    gridPoints.forEach(p => updateGridPointStatus(p.index, 'pending'));

    let lastGridIndex = -1;
    let gridPointInserted = 0;

    // Continue scanning until complete or stopped
    while (!shouldStop) {
        const { gridIndex, queryIndex, page } = currentSearch;

        // Update UI when moving to new grid point
        if (gridIndex !== lastGridIndex) {
            if (lastGridIndex >= 0) {
                updateGridPointStatus(lastGridIndex, 'complete', gridPointInserted);
                gridPointsScanned++;
            }
            lastGridIndex = gridIndex;
            gridPointInserted = 0;
            updateGridPointStatus(gridIndex, 'scanning');
        }

        const gridPoint = gridPoints[gridIndex];
        const query = searchQueries[queryIndex];

        updateProgress(
            gridIndex * searchQueries.length * 3 + queryIndex * 3 + Math.floor(page / 20),
            gridPoints.length * searchQueries.length * 3,
            `${gridPoint?.name}: "${query}" (page ${page / 20 + 1})`
        );

        try {
            const result = await executeSearch(gridIndex, queryIndex, page);

            totalFound += result.found;
            totalInserted += result.inserted;
            gridPointInserted += result.inserted;

            if (result.inserted > 0) {
                addLogEntry('success', `✅ ${gridPoint.name}: +${result.inserted} new (${result.found} found, ${result.duplicates} dupes)`);
            }

            updateStats();

            // Check if scan is complete
            if (result.isComplete) {
                updateGridPointStatus(gridIndex, 'complete', gridPointInserted);
                gridPointsScanned++;
                break;
            }

            // Move to next search
            if (result.next) {
                currentSearch = result.next;
            } else {
                break;
            }

        } catch (error) {
            addLogEntry('error', `❌ ${gridPoint?.name}: ${error.message}`);
            // Move to next grid point on error
            if (gridIndex < gridPoints.length - 1) {
                currentSearch = { gridIndex: gridIndex + 1, queryIndex: 0, page: 0 };
            } else {
                break;
            }
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
    }

    // Complete
    isScanning = false;
    document.getElementById('startFullScanBtn').disabled = false;
    document.getElementById('stopScanBtn').disabled = true;
    document.getElementById('runEnrichmentBtn').disabled = totalInserted === 0;
    document.getElementById('discoveryStatus').textContent = shouldStop ? 'Stopped' : 'Complete';

    updateProgress(gridPoints.length * searchQueries.length * 3, gridPoints.length * searchQueries.length * 3, 'Scan complete!');
    addLogEntry('info', `🎉 Scan complete! Found ${totalFound} apartments, ${totalInserted} new unique properties added.`);
}

/**
 * Execute a single search at a grid point
 */
async function executeSearch(gridIndex, queryIndex, page) {
    const response = await fetch(`${API_BASE_URL}/api/property/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridIndex, queryIndex, page })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
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
 * Uses v2 API with two phases: property data → unit data
 */
async function runAutoEnrichment() {
    const enrichBtn = document.getElementById('runEnrichmentBtn');
    const scanBtn = document.getElementById('startFullScanBtn');

    addLogEntry('info', '🤖 Starting 2-phase enrichment...');
    addLogEntry('info', '  Phase 1: Property data (rent, amenities, contact)');
    addLogEntry('info', '  Phase 2: Unit data (floor plans, videos, reviews)');

    enrichBtn.disabled = true;
    scanBtn.disabled = true;
    document.getElementById('discoveryStatus').textContent = 'Enriching...';

    try {
        // Check status with v2 API
        const checkResponse = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const checkData = await checkResponse.json();

        if (!checkData.configured) {
            addLogEntry('error', '❌ Enrichment not configured - missing API keys on server');
            return;
        }

        // ========== PHASE 1: Property Data ==========
        if (checkData.pending > 0) {
            addLogEntry('info', `\n📋 PHASE 1: Enriching ${checkData.pending} properties...`);
            await runEnrichmentPhase('property', checkData.pending);
        } else {
            addLogEntry('info', '✅ Phase 1: All properties already enriched');
        }

        // ========== PHASE 2: Unit Data ==========
        // Re-check to get updated enriched count
        const recheck = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const recheckData = await recheck.json();

        if (recheckData.enriched > 0) {
            addLogEntry('info', `\n🏠 PHASE 2: Searching units for ${recheckData.enriched} properties...`);
            addLogEntry('info', '  → Using YouTube, Google Images, Reviews, then Browserless');
            await runEnrichmentPhase('units', recheckData.enriched);
        }

        addLogEntry('info', '\n🎉 Enrichment complete!');

    } catch (error) {
        addLogEntry('error', `❌ Enrichment error: ${error.message}`);
    } finally {
        enrichBtn.disabled = false;
        scanBtn.disabled = false;
        document.getElementById('discoveryStatus').textContent = 'Ready';
    }
}

/**
 * Run a single enrichment phase
 */
async function runEnrichmentPhase(phase, total) {
    let processed = 0;
    let remaining = total;

    while (remaining > 0) {
        addLogEntry('info', `🔄 ${phase === 'property' ? 'Enriching' : 'Searching units'}... (${remaining} remaining)`);

        const response = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phase, limit: 3 })  // Smaller batches for unit search (it's slower)
        });

        if (!response.ok) {
            const error = await response.json();
            addLogEntry('error', `❌ Batch error: ${error.message || error.error}`);
            break;
        }

        const result = await response.json();
        remaining = result.remaining;
        processed += result.processed;

        // Log individual results
        for (const r of result.results || []) {
            const propPhase = r.phases?.property;
            const unitPhase = r.phases?.units;

            if (phase === 'property') {
                if (propPhase?.status === 'enriched') {
                    addLogEntry('success', `✅ ${r.name} - updated: ${propPhase.fieldsUpdated?.join(', ') || 'basic data'}`);
                } else {
                    addLogEntry('info', `ℹ️ ${r.name}: ${propPhase?.status || 'processed'}`);
                }
                // Show YouTube bonus
                if (r.phases?.youtube?.found) {
                    addLogEntry('info', `  🎬 Found ${r.phases.youtube.found} YouTube videos`);
                }
            } else if (phase === 'units') {
                if (unitPhase?.status === 'found') {
                    addLogEntry('success', `✅ ${r.name} - ${unitPhase.floorPlans} floor plans (via ${unitPhase.sources?.join(', ')})`);
                    if (unitPhase.videos) addLogEntry('info', `  🎬 ${unitPhase.videos} videos found`);
                    if (unitPhase.reviews) addLogEntry('info', `  💬 ${unitPhase.reviews} reviews analyzed`);
                } else {
                    addLogEntry('info', `ℹ️ ${r.name}: no floor plans found`);
                    if (unitPhase?.videosFound) addLogEntry('info', `  (but found ${unitPhase.videosFound} videos, ${unitPhase.imagesFound} images)`);
                }
                // Show specials found
                if (r.phases?.specials?.found > 0) {
                    addLogEntry('success', `  🔥 ${r.phases.specials.found} specials found!`);
                    totalSpecialsFound += r.phases.specials.found;
                    updateStats();
                }
            }
        }

        // Update progress
        const percent = Math.round((processed / total) * 100);
        document.getElementById('discoveryProgressBar').style.width = `${percent}%`;
        document.getElementById('discoveryProgressText').textContent = `${phase === 'property' ? 'Enriching' : 'Unit search'}... ${processed}/${total}`;
        document.getElementById('discoveryProgressPercent').textContent = `${percent}%`;

        // Delay between batches
        if (remaining > 0) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    addLogEntry('info', `✅ Phase complete: processed ${processed} properties`);
}

// Export for global access
window.initDiscovery = initDiscovery;

