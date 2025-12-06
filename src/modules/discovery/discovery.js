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

    // Check if there are pending properties to enrich
    await checkEnrichmentStatus();

    // Setup event listeners
    setupEventListeners();

    // Initialize auto-scanner
    await initAutoScanner();

    // Initialize image scanner
    await initImageScanner();
}

/**
 * Check enrichment status and enable/disable buttons accordingly
 */
async function checkEnrichmentStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const data = await response.json();

        const enrichBtn = document.getElementById('runEnrichmentBtn');
        const unitScanBtn = document.getElementById('runUnitScanBtn');

        // Count total properties that could potentially be enriched/re-enriched
        const totalProperties = (data.pending || 0) + (data.enriched || 0) + (data.withFloorPlans || 0);

        if (enrichBtn) {
            // Enable if there are ANY properties (allow re-enrichment)
            // Original: enrichBtn.disabled = data.pending === 0;
            enrichBtn.disabled = false; // Always enable - user can re-enrich

            if (data.pending > 0) {
                addLogEntry('info', `📋 ${data.pending} properties ready for enrichment`);
            } else {
                addLogEntry('info', `📋 All properties enriched. Re-enrich available if needed.`);
            }
        }

        if (unitScanBtn) {
            // Enable if there are enriched properties (ready for unit scanning)
            unitScanBtn.disabled = data.enriched === 0;

            if (data.enriched > 0) {
                addLogEntry('info', `🏠 ${data.enriched} enriched properties ready for unit scanning`);
            }
        }
    } catch (error) {
        console.log('[Discovery] Could not check enrichment status:', error.message);
    }
}

/**
 * Setup event listeners for controls
 */
function setupEventListeners() {
    const startBtn = document.getElementById('startFullScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const enrichBtn = document.getElementById('runEnrichmentBtn');
    const unitScanBtn = document.getElementById('runUnitScanBtn');
    const contactScanBtn = document.getElementById('runContactScanBtn');

    if (startBtn) {
        startBtn.addEventListener('click', startFullScan);
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', stopScan);
    }

    if (enrichBtn) {
        enrichBtn.addEventListener('click', runAutoEnrichment);
    }

    if (unitScanBtn) {
        unitScanBtn.addEventListener('click', runUnitScan);
    }

    if (contactScanBtn) {
        contactScanBtn.addEventListener('click', runContactScan);
    }

    // Load contact scan stats
    loadContactScanStats();
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
        case 'enriching':
            iconEl.textContent = '⚡';
            statusEl.textContent = 'Enriching...';
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            break;
        case 'complete':
            iconEl.textContent = '✅';
            statusEl.textContent = count !== null ? `+${count} new` : 'Done';
            break;
        case 'enriched':
            iconEl.textContent = '✅';
            statusEl.textContent = count !== null ? `${count} enriched` : 'Enriched';
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
        const recheck = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const recheckData = await recheck.json();

        if (recheckData.enriched > 0) {
            addLogEntry('info', `\n🏠 PHASE 2: Searching units for ${recheckData.enriched} properties...`);
            addLogEntry('info', '  → Using YouTube, Google Images, Reviews, then Browserless');
            await runEnrichmentPhase('units', recheckData.enriched);
        }

        addLogEntry('success', '\n🎉 Enrichment complete!');

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

/**
 * Run unit scanning only (Phase 2) on enriched properties
 */
async function runUnitScan() {
    const unitScanBtn = document.getElementById('runUnitScanBtn');
    const scanBtn = document.getElementById('startFullScanBtn');

    addLogEntry('info', '🏠 Starting Unit Scan (Phase 2 only)...');
    addLogEntry('info', '  → Scraping floor plans, pricing, availability from property websites');

    unitScanBtn.disabled = true;
    scanBtn.disabled = true;
    document.getElementById('discoveryStatus').textContent = 'Scanning Units...';
    document.getElementById('discoveryProgressSection').style.display = 'block';

    try {
        // Check how many enriched properties we have
        const checkResponse = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const checkData = await checkResponse.json();

        if (checkData.enriched === 0) {
            addLogEntry('warning', '⚠️ No enriched properties ready for unit scanning');
            addLogEntry('info', 'Run "Auto-Enrich All" first to enrich properties');
            return;
        }

        addLogEntry('info', `📋 Scanning units for ${checkData.enriched} enriched properties...`);
        await runEnrichmentPhase('units', checkData.enriched);

        // Check results
        const finalCheck = await fetch(`${API_BASE_URL}/api/property/batch-enrich-v2`);
        const finalData = await finalCheck.json();

        addLogEntry('success', `\n🎉 Unit scan complete!`);
        addLogEntry('info', `📊 Floor plans in database: ${finalData.withFloorPlans || 0}`);

    } catch (error) {
        addLogEntry('error', `❌ Unit scan error: ${error.message}`);
    } finally {
        unitScanBtn.disabled = false;
        scanBtn.disabled = false;
        document.getElementById('discoveryStatus').textContent = 'Ready';
    }
}

// ============ CONTACT INFO SCANNER ============

/**
 * Load contact scan stats (missing phone, email, website)
 */
async function loadContactScanStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/property/scan-contacts`);
        const data = await response.json();

        if (data.success && data.stats) {
            const s = data.stats;
            const phoneEl = document.getElementById('missingPhoneCount');
            const emailEl = document.getElementById('missingEmailCount');
            const websiteEl = document.getElementById('missingWebsiteCount');

            // Show "has X" / "need scan Y" format
            if (phoneEl) phoneEl.textContent = `${s.hasPhone} ✓ / ${s.needsScanPhone} to scan`;
            if (emailEl) emailEl.textContent = `${s.hasEmail} ✓ / ${s.needsScanEmail} to scan`;
            if (websiteEl) websiteEl.textContent = `${s.hasWebsite} ✓ / ${s.needsScanWebsite} to scan`;
        }
    } catch (e) {
        console.error('[ContactScan] Stats error:', e);
    }
}

// Contact scan state
let contactScanRunning = false;
let contactScanShouldStop = false;

/**
 * Run contact info scan - scans one property at a time via POST
 */
async function runContactScan() {
    const contactScanBtn = document.getElementById('runContactScanBtn');
    const scanBtn = document.getElementById('startFullScanBtn');

    // Toggle behavior - if running, stop it
    if (contactScanRunning) {
        contactScanShouldStop = true;
        addLogEntry('warning', '⏸️ Stopping contact scan...');
        return;
    }

    contactScanRunning = true;
    contactScanShouldStop = false;

    addLogEntry('info', '📞 Starting Contact Info Scan...');
    addLogEntry('info', '  → Searching Google Local for phone, email, website');

    contactScanBtn.innerHTML = '⏹️ Stop Scan';
    contactScanBtn.style.background = '#ef4444';
    scanBtn.disabled = true;
    document.getElementById('discoveryStatus').textContent = 'Scanning Contacts...';

    let scanned = 0;
    let updated = 0;

    try {
        // Get initial stats
        const statsResp = await fetch(`${API_BASE_URL}/api/property/scan-contacts`);
        const statsData = await statsResp.json();
        const needsScan = statsData.stats?.needsScan || 0;

        addLogEntry('info', `📋 Found ${needsScan} properties to scan for contact info`);

        // Scan loop - one property at a time
        while (!contactScanShouldStop) {
            const response = await fetch(`${API_BASE_URL}/api/property/scan-contacts`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.error) {
                addLogEntry('error', `❌ Error: ${data.error}`);
                break;
            }

            // Check if we're done
            if (data.done) {
                addLogEntry('success', '✅ All properties have contact info!');
                break;
            }

            scanned++;

            if (data.updated) {
                updated++;
                addLogEntry('success', `✅ ${data.property}: ${data.found?.join(', ') || 'Updated'}`);
            } else {
                addLogEntry('warning', `⚠️ ${data.property}: ${data.message || 'No new info found'}`);
            }

            // Update stats display periodically
            if (scanned % 5 === 0) {
                await loadContactScanStats();
            }

            // Small delay between requests
            await new Promise(r => setTimeout(r, 500));
        }

        addLogEntry('success', `\n🎉 Contact scan complete! Scanned ${scanned}, Updated ${updated}`);

        // Final stats refresh
        await loadContactScanStats();

    } catch (error) {
        addLogEntry('error', `❌ Contact scan error: ${error.message}`);
    } finally {
        contactScanRunning = false;
        contactScanShouldStop = false;
        contactScanBtn.disabled = false;
        contactScanBtn.innerHTML = '📞 Scan Contacts';
        contactScanBtn.style.background = '#f59e0b';
        scanBtn.disabled = false;
        document.getElementById('discoveryStatus').textContent = 'Ready';
    }
}

// ============ AUTO UNIT SCANNER ============
let autoScanRunning = false;
let autoScanTimeout = null;
let autoScanCountdown = 15;
const SCAN_INTERVAL_SECONDS = 15;
let autoScanDebugLog = []; // Store debug info for troubleshooting

async function initAutoScanner() {
    const toggleBtn = document.getElementById('autoScanToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', toggleAutoScan);

    // Load initial stats and method performance
    await updateAutoScanStats();
}

// Store latest stats for debug export
let latestAutoScanStats = null;

async function updateAutoScanStats() {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/property/auto-scan`);
        const data = await resp.json();

        // Store for debug export
        latestAutoScanStats = data;

        // Update summary stats
        document.getElementById('autoScanStats').textContent =
            `${data.stats.scannedProperties}/${data.stats.totalProperties}`;
        document.getElementById('autoScanUnits').textContent =
            `${data.stats.totalUnitsFound || 0} units`;
        document.getElementById('autoScanSuccess').textContent =
            `${data.stats.successRate}%`;

        // Render method performance table
        renderMethodStatsTable(data.methodStats || []);

        return data;
    } catch (e) {
        console.error('[AutoScan] Stats error:', e);
        return null;
    }
}

function renderMethodStatsTable(methodStats) {
    const tbody = document.getElementById('methodStatsBody');
    if (!tbody) return;

    if (!methodStats || methodStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #6b7280;">No scan data yet. Start auto-scan to begin learning.</td></tr>';
        return;
    }

    // Method display names
    const methodNames = {
        'property-floorplans': '🏠 Property /floorplans',
        'property-floor-plans': '🏠 Property /floor-plans',
        'property-availability': '🏠 Property /availability',
        'apartments.com': '🌐 Apartments.com',
        'zillow.com': '🌐 Zillow.com',
        'rent.com': '🌐 Rent.com'
    };

    tbody.innerHTML = methodStats.map(m => {
        // Status styling - NEVER show as fully disabled
        let statusBadge, statusColor, rowOpacity;
        if (m.status === 'low-priority') {
            statusBadge = '⚠️ Low Priority';
            statusColor = '#f59e0b';
            rowOpacity = '0.7';
        } else if (m.status === 'learning') {
            statusBadge = '📊 Learning';
            statusColor = '#3b82f6';
            rowOpacity = '1';
        } else {
            statusBadge = '✅ Active';
            statusColor = '#10b981';
            rowOpacity = '1';
        }

        // Success rate bar color
        let rateColor = '#ef4444'; // red
        if (m.successRate >= 50) rateColor = '#10b981'; // green
        else if (m.successRate >= 20) rateColor = '#f59e0b'; // yellow

        // Success rate visual bar
        const rateBar = m.attempts > 0 ? `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${m.successRate}%; background: ${rateColor}; transition: width 0.3s;"></div>
                </div>
                <span style="color: ${rateColor}; font-weight: 600; min-width: 40px;">${m.successRate}%</span>
            </div>
        ` : '<span style="color: #6b7280;">--</span>';

        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); opacity: ${rowOpacity};">
                <td style="padding: 10px; color: #e5e7eb;">
                    ${methodNames[m.method] || m.method}
                    ${m.type === 'property' ? '<span style="font-size: 10px; color: #6b7280; margin-left: 4px;">(direct)</span>' : ''}
                </td>
                <td style="text-align: center; padding: 10px; color: #9ca3af;">${m.attempts}</td>
                <td style="text-align: center; padding: 10px; color: ${m.successes > 0 ? '#10b981' : '#6b7280'};">${m.successes}</td>
                <td style="padding: 10px;">${rateBar}</td>
                <td style="text-align: center; padding: 10px; color: ${m.totalUnitsFound > 0 ? '#34d399' : '#6b7280'}; font-weight: ${m.totalUnitsFound > 0 ? '600' : '400'};">
                    ${m.totalUnitsFound || 0}
                    ${m.avgUnitsPerSuccess > 0 ? `<span style="font-size: 10px; color: #6b7280;"> (avg ${m.avgUnitsPerSuccess})</span>` : ''}
                </td>
                <td style="text-align: center; padding: 10px;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                        ${statusBadge}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function debugLog(message, data = null) {
    const entry = {
        time: new Date().toISOString(),
        message,
        data: data ? JSON.parse(JSON.stringify(data)) : null
    };
    autoScanDebugLog.push(entry);
    // Keep last 100 entries
    if (autoScanDebugLog.length > 100) autoScanDebugLog.shift();
    console.log(`[AutoScan Debug] ${message}`, data || '');
}

function copyDebugInfo() {
    // Build comprehensive debug info
    const debugInfo = {
        timestamp: new Date().toISOString(),
        autoScanRunning,
        autoScanCountdown,
        SCAN_INTERVAL_SECONDS,

        // Stats summary
        stats: latestAutoScanStats?.stats || {},

        // Failure analysis from API
        failureAnalysis: latestAutoScanStats?.failureAnalysis || {},

        // Method performance
        methodStats: (latestAutoScanStats?.methodStats || []).map(m => ({
            method: m.id,
            attempts: m.attempts,
            successes: m.successes,
            successRate: m.successRate,
            status: m.status
        })),

        // Recent scans with failure reasons
        recentScans: (latestAutoScanStats?.recentScans || []).slice(0, 15).map(s => ({
            property: s.propertyId?.slice(0, 30),
            method: s.method,
            success: s.success,
            units: s.unitsFound,
            reason: s.failureReason,
            htmlLen: s.htmlLength
        })),

        // Recent client-side logs
        clientLogs: autoScanDebugLog.slice(-15).map(l => ({
            time: l.time,
            msg: l.message?.slice(0, 50),
            data: l.data?.unitsFound !== undefined ? { units: l.data.unitsFound, ms: l.data.durationMs } : null
        })),

        userAgent: navigator.userAgent,
        url: window.location.href
    };

    const text = '```json\n' + JSON.stringify(debugInfo, null, 2) + '\n```';
    navigator.clipboard.writeText(text).then(() => {
        alert('Debug info copied to clipboard! Paste it to share.');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback: show in prompt
        prompt('Copy this debug info:', JSON.stringify(debugInfo));
    });
}

// Make copyDebugInfo globally accessible
window.copyDebugInfo = copyDebugInfo;

async function toggleAutoScan() {
    const toggleBtn = document.getElementById('autoScanToggle');
    const statusDiv = document.getElementById('autoScanStatus');

    if (autoScanRunning) {
        // Stop
        autoScanRunning = false;
        if (autoScanTimeout) clearTimeout(autoScanTimeout);
        toggleBtn.innerHTML = '▶️ Start Auto-Scan';
        toggleBtn.style.background = '#10b981';
        statusDiv.style.display = 'none';
        document.getElementById('autoScanTimer').textContent = '--:--';
        addLogEntry('info', '⏹️ Auto-scan stopped');
        debugLog('Auto-scan stopped by user');
    } else {
        // Start
        autoScanRunning = true;
        autoScanDebugLog = []; // Clear debug log on fresh start
        toggleBtn.innerHTML = '⏸️ Stop Auto-Scan';
        toggleBtn.style.background = '#ef4444';
        statusDiv.style.display = 'block';
        addLogEntry('info', '🔄 Auto-scan started - continuous mode (15s delay)');
        debugLog('Auto-scan started');

        // Run first scan immediately, then chain
        runAutoScanLoop();
    }
}

async function runAutoScanLoop() {
    if (!autoScanRunning) {
        debugLog('Loop stopped - autoScanRunning is false');
        return;
    }

    // Run the scan
    await runAutoScan();

    // Only start countdown AFTER scan completes
    if (autoScanRunning) {
        debugLog('Scan complete, starting countdown', { seconds: SCAN_INTERVAL_SECONDS });
        autoScanCountdown = SCAN_INTERVAL_SECONDS;
        startCountdown();
    }
}

function startCountdown() {
    if (!autoScanRunning) return;

    updateTimerDisplay();

    if (autoScanCountdown <= 0) {
        debugLog('Countdown complete, starting next scan');
        runAutoScanLoop();
    } else {
        autoScanCountdown--;
        autoScanTimeout = setTimeout(startCountdown, 1000);
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(autoScanCountdown / 60);
    const secs = autoScanCountdown % 60;
    document.getElementById('autoScanTimer').textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function runAutoScan() {
    if (!autoScanRunning) return;

    const scanStartTime = Date.now();
    debugLog('Starting scan...');

    try {
        // Get next property to scan
        document.getElementById('autoScanCurrentProperty').textContent = '⏳ Finding next property...';
        debugLog('Fetching next property from API');

        const statusResp = await fetch(`${API_BASE_URL}/api/property/auto-scan`);
        const status = await statusResp.json();

        debugLog('API response received', {
            hasNext: !!status.next,
            nextProperty: status.next?.propertyName,
            nextMethod: status.next?.method,
            leasingUrl: status.next?.leasingUrl,
            stats: status.stats,
            methodStats: status.methodStats?.map(m => `${m.method}: ${m.attempts}/${m.successes}`),
            error: status.error
        });

        if (status.error) {
            throw new Error(status.error);
        }

        if (!status.next) {
            document.getElementById('autoScanCurrentProperty').textContent = 'No properties to scan';
            document.getElementById('autoScanLastResult').textContent = 'All methods exhausted or no leasing URLs';
            addLogEntry('warning', '⚠️ No properties with leasing URLs found');
            debugLog('No next property available');
            return;
        }

        const { propertyId, propertyName, leasingUrl, method } = status.next;
        debugLog('Got next property', { propertyId, propertyName, leasingUrl, method });

        // Update UI
        document.getElementById('autoScanCurrentProperty').textContent = `🔍 ${propertyName}`;
        document.getElementById('autoScanMethod').textContent = `Method: ${method}`;
        addLogEntry('info', `🔍 Scanning: ${propertyName} (${method})`);

        // Run the scan
        debugLog('Sending POST to execute scan');
        const scanResp = await fetch(`${API_BASE_URL}/api/property/auto-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId, method })
        });

        const result = await scanResp.json();
        const scanDuration = Date.now() - scanStartTime;

        debugLog('Scan complete', {
            unitsFound: result.unitsFound,
            sources: result.sources,
            debug: result.debug,
            error: result.error,
            durationMs: scanDuration,
            httpStatus: scanResp.status
        });

        // Update last result
        if (result.error) {
            document.getElementById('autoScanLastResult').textContent = `❌ ${result.error}`;
            addLogEntry('error', `❌ ${propertyName}: ${result.error}`);
        } else if (result.unitsFound > 0) {
            document.getElementById('autoScanLastResult').textContent =
                `✅ Found ${result.unitsFound} units (${(scanDuration / 1000).toFixed(1)}s)`;
            addLogEntry('success', `✅ ${propertyName}: Found ${result.unitsFound} units!`);
        } else {
            document.getElementById('autoScanLastResult').textContent =
                `⚪ No units found (${(scanDuration / 1000).toFixed(1)}s) - will try different method`;
            addLogEntry('info', `⚪ ${propertyName}: No units (will retry with different method)`);
        }

        // Refresh stats
        await updateAutoScanStats();

    } catch (e) {
        const scanDuration = Date.now() - scanStartTime;
        console.error('[AutoScan] Error:', e);
        debugLog('Scan error', { error: e.message, stack: e.stack, durationMs: scanDuration });
        document.getElementById('autoScanLastResult').textContent = `❌ Error: ${e.message}`;
        addLogEntry('error', `❌ Auto-scan error: ${e.message}`);
    }
}

// ============================================================
// IMAGE SCANNER
// ============================================================

let imageScanRunning = false;
let imageScanCountdown = 0;
let imageScanTimer = null;
let imageScanStats = { scanned: 0, imagesFound: 0 };
let imageScanStartTime = null;

/**
 * Initialize the image scanner panel
 */
async function initImageScanner() {
    console.log('[ImageScan] Initializing...');

    // Load initial stats
    await updateImageScanStats();

    // Setup toggle button
    const toggleBtn = document.getElementById('imageScanToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleImageScan);
    }
}

/**
 * Update image scan stats from API
 */
async function updateImageScanStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/property/image-scan`);
        const data = await response.json();

        if (data.success && data.stats) {
            const s = data.stats;
            document.getElementById('imageScanMissing').textContent = s.missingPhotos;
            document.getElementById('imageScanComplete').textContent = s.hasPhotos;
            document.getElementById('imageScanPercent').textContent = `${s.percentComplete}%`;
            document.getElementById('imageScanToday').textContent = s.scannedLast24h;
        }
    } catch (e) {
        console.error('[ImageScan] Stats error:', e);
    }
}

/**
 * Toggle image scanner on/off
 */
function toggleImageScan() {
    if (imageScanRunning) {
        stopImageScan();
    } else {
        startImageScan();
    }
}

/**
 * Start the image scanner
 */
function startImageScan() {
    imageScanRunning = true;
    imageScanStartTime = Date.now();
    imageScanStats = { scanned: 0, imagesFound: 0 };

    const toggleBtn = document.getElementById('imageScanToggle');
    toggleBtn.textContent = '⏹️ Stop Scanning';
    toggleBtn.style.background = '#ef4444';

    document.getElementById('imageScanStatus').style.display = 'block';

    addLogEntry('info', '📷 Image scanner started');
    runImageScan();
}

/**
 * Stop the image scanner
 */
function stopImageScan() {
    imageScanRunning = false;
    if (imageScanTimer) {
        clearTimeout(imageScanTimer);
        imageScanTimer = null;
    }

    const toggleBtn = document.getElementById('imageScanToggle');
    toggleBtn.textContent = '📷 Start Image Scan';
    toggleBtn.style.background = '#8b5cf6';

    document.getElementById('imageScanStatus').style.display = 'none';
    document.getElementById('imageScanTimer').textContent = '--:--';

    addLogEntry('info', `📷 Image scanner stopped. Found ${imageScanStats.imagesFound} images for ${imageScanStats.scanned} properties.`);
}

/**
 * Run a single image scan iteration
 */
async function runImageScan() {
    if (!imageScanRunning) return;

    try {
        // Update timer
        const elapsed = Date.now() - imageScanStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('imageScanTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Call API
        document.getElementById('imageScanCurrentProperty').textContent = '🔍 Searching...';

        const response = await fetch(`${API_BASE_URL}/api/property/image-scan`, { method: 'POST' });
        const result = await response.json();

        if (result.done) {
            addLogEntry('success', '🎉 All properties have images!');
            stopImageScan();
            return;
        }

        imageScanStats.scanned++;
        if (result.imagesFound > 0) {
            imageScanStats.imagesFound += result.imagesFound;
            document.getElementById('imageScanCurrentProperty').textContent = `✅ ${result.property}`;
            document.getElementById('imageScanResult').textContent = `Found ${result.imagesFound} images`;
            addLogEntry('success', `📷 ${result.property}: ${result.imagesFound} images`);
        } else {
            document.getElementById('imageScanCurrentProperty').textContent = `⚪ ${result.property}`;
            document.getElementById('imageScanResult').textContent = 'No images found';
        }

        // Update stats display
        document.getElementById('imageScanFound').textContent = imageScanStats.imagesFound;
        await updateImageScanStats();

        // Schedule next scan (2 second delay to not hammer API)
        imageScanTimer = setTimeout(runImageScan, 2000);

    } catch (e) {
        console.error('[ImageScan] Error:', e);
        document.getElementById('imageScanResult').textContent = `Error: ${e.message}`;
        addLogEntry('error', `📷 Error: ${e.message}`);
        // Continue despite errors
        imageScanTimer = setTimeout(runImageScan, 3000);
    }
}

// Export for global access
window.initDiscovery = initDiscovery;
window.initAutoScanner = initAutoScanner;
window.initImageScanner = initImageScanner;

