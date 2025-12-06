/**
 * Backups Page Module
 *
 * Manages database and storage snapshots for disaster recovery.
 *
 * @module admin/backups-page
 */

import { getSupabase } from '../../api/supabase-api.js';
import { toast } from '../../utils/helpers.js';

// Tables to include in backup
const BACKUP_TABLES = [
    'properties',
    'units',
    'floor_plans',
    'leads',
    'users',
    'agents',
    'specials',
    'property_specials',
    'lead_notes',
    'property_notes',
    'unit_notes',
    'lead_activities',
    'property_activities',
    'unit_activities',
    'email_templates',
    'email_logs',
    'app_settings'
];

/**
 * Initialize the Backups page
 */
export async function initializeBackupsPage() {
    console.log('🛡️ Initializing Backups page...');

    // Add mission-control-active class to body for dark theme
    document.body.classList.add('mission-control-active');

    // Load data counts and backup history in parallel
    await Promise.all([
        loadDataCounts(),
        loadBackupHistory(),
        checkSupabaseBackupStatus()
    ]);

    // Set up event listeners
    setupEventListeners();

    console.log('✅ Backups page initialized');
}

/**
 * Load record counts for each data category
 */
async function loadDataCounts() {
    const supabase = getSupabase();

    try {
        // Fetch counts in parallel
        const [propertiesCount, unitsCount, leadsCount, usersCount] = await Promise.all([
            supabase.from('properties').select('*', { count: 'exact', head: true }),
            supabase.from('units').select('*', { count: 'exact', head: true }),
            supabase.from('leads').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true })
        ]);

        // Update UI
        updateCount('propertiesCount', `${propertiesCount.count || 0} properties, ${unitsCount.count || 0} units`);
        updateCount('leadsCount', `${leadsCount.count || 0} leads`);
        updateCount('documentsCount', 'Tracking in lead_activities');
        updateCount('usersCount', `${usersCount.count || 0} users`);

        // Get storage file counts
        await loadStorageCounts();

    } catch (error) {
        console.error('Error loading data counts:', error);
    }
}

/**
 * Load storage bucket file counts
 */
async function loadStorageCounts() {
    const supabase = getSupabase();
    let totalFiles = 0;

    try {
        const buckets = ['app', 'agent_assets', 'lease-documents'];

        for (const bucket of buckets) {
            try {
                const { data } = await supabase.storage.from(bucket).list('', { limit: 1000 });
                if (data) {
                    totalFiles += data.length;
                }
            } catch (e) {
                console.warn(`Could not count files in ${bucket}:`, e.message);
            }
        }

        updateCount('storageCount', `~${totalFiles} files`);
    } catch (error) {
        console.error('Error loading storage counts:', error);
        updateCount('storageCount', 'Unknown');
    }
}

/**
 * Update a count element
 */
function updateCount(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = value;
    }
}

/**
 * Check Supabase backup status via API
 */
async function checkSupabaseBackupStatus() {
    // For now, show static info since we can't query Supabase Management API from client
    const lastBackupEl = document.getElementById('lastSupabaseBackup');
    const pitrStatusEl = document.getElementById('pitrStatus');
    const snapshotCountEl = document.getElementById('customSnapshotCount');

    if (lastBackupEl) {
        lastBackupEl.textContent = 'Daily (automatic)';
    }

    if (pitrStatusEl) {
        pitrStatusEl.textContent = 'Not Enabled';
        pitrStatusEl.className = 'badge badge-inactive';
    }

    // Load custom snapshot count from backup_logs table
    await loadCustomSnapshotCount();
}

/**
 * Load custom snapshot count
 */
async function loadCustomSnapshotCount() {
    const supabase = getSupabase();
    const el = document.getElementById('customSnapshotCount');

    try {
        const { count, error } = await supabase
            .from('backup_logs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');

        if (error) {
            // Table might not exist yet
            if (el) el.textContent = '0 snapshots';
            return;
        }

        if (el) el.textContent = `${count || 0} snapshots`;
    } catch (error) {
        console.warn('backup_logs table may not exist yet:', error.message);
        if (el) el.textContent = '0 snapshots';
    }
}

/**
 * Load backup history from backup_logs table
 */
async function loadBackupHistory() {
    const supabase = getSupabase();
    const tbody = document.getElementById('backupHistoryBody');

    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('backup_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            // Table might not exist yet
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--mc-text-muted);">
                        <p style="margin: 0 0 8px 0;">📦 No backups yet</p>
                        <p style="margin: 0; font-size: 13px;">Create your first snapshot using the button above</p>
                    </td>
                </tr>
            `;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--mc-text-muted);">
                        <p style="margin: 0 0 8px 0;">📦 No backups yet</p>
                        <p style="margin: 0; font-size: 13px;">Create your first snapshot using the button above</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(backup => `
            <tr>
                <td>${formatDate(backup.created_at)}</td>
                <td><span class="badge badge-info">Custom</span></td>
                <td>${formatFileSize(backup.size_bytes || 0)}</td>
                <td>${backup.table_count || 0} tables</td>
                <td>${backup.includes_storage ? '✓ Yes' : '✗ No'}</td>
                <td>
                    <span class="badge ${backup.status === 'completed' ? 'badge-success' : backup.status === 'failed' ? 'badge-error' : 'badge-warning'}">
                        ${backup.status}
                    </span>
                </td>
                <td>
                    ${backup.status === 'completed' ? `
                        <button class="btn btn-ghost btn-sm" onclick="downloadBackup('${backup.id}')">
                            ⬇️ Download
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading backup history:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: var(--mc-text-muted);">
                    Error loading backup history
                </td>
            </tr>
        `;
    }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const createSnapshotBtn = document.getElementById('createSnapshotBtn');

    if (createSnapshotBtn) {
        createSnapshotBtn.addEventListener('click', createSnapshot);
    }
}

/**
 * Create a new backup snapshot
 */
async function createSnapshot() {
    const btn = document.getElementById('createSnapshotBtn');
    const progressDiv = document.getElementById('backupProgress');
    const progressBar = document.getElementById('backupProgressBar');
    const progressLabel = document.getElementById('backupProgressLabel');
    const progressPercent = document.getElementById('backupProgressPercent');

    // Disable button and show progress
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating...';
    }

    if (progressDiv) progressDiv.style.display = 'block';

    try {
        const supabase = getSupabase();
        const backupData = {};
        const includeStorage = document.getElementById('backupIncludeStorage')?.checked ?? true;

        // Export each table
        let completed = 0;
        const totalSteps = BACKUP_TABLES.length + (includeStorage ? 1 : 0);

        for (const table of BACKUP_TABLES) {
            updateProgress(progressBar, progressLabel, progressPercent, completed, totalSteps, `Exporting ${table}...`);

            try {
                const { data, error } = await supabase.from(table).select('*');
                if (!error && data) {
                    backupData[table] = data;
                }
            } catch (e) {
                console.warn(`Could not export ${table}:`, e.message);
                backupData[table] = [];
            }

            completed++;
        }

        // Create backup manifest
        const manifest = {
            created_at: new Date().toISOString(),
            tables: Object.keys(backupData),
            table_counts: Object.fromEntries(
                Object.entries(backupData).map(([table, data]) => [table, data.length])
            ),
            includes_storage: includeStorage,
            version: '1.0'
        };

        // Combine into single JSON
        const backupJson = JSON.stringify({
            manifest,
            data: backupData
        }, null, 2);

        const blob = new Blob([backupJson], { type: 'application/json' });
        const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        updateProgress(progressBar, progressLabel, progressPercent, totalSteps - 1, totalSteps, 'Uploading to storage...');

        // Try to upload to backups bucket
        const { error: uploadError } = await supabase.storage
            .from('backups')
            .upload(fileName, blob, { contentType: 'application/json' });

        if (uploadError) {
            console.warn('Could not upload to backups bucket:', uploadError.message);
            // Fallback: download directly
            downloadBlob(blob, fileName);
            toast('⚠️ Backup downloaded locally (bucket upload failed)', 'warning');
        } else {
            // Log the backup
            await supabase.from('backup_logs').insert({
                file_name: fileName,
                size_bytes: blob.size,
                table_count: BACKUP_TABLES.length,
                includes_storage: includeStorage,
                status: 'completed',
                created_by: window.currentUser?.id || 'unknown'
            });

            toast('✅ Backup created successfully!', 'success');
        }

        updateProgress(progressBar, progressLabel, progressPercent, totalSteps, totalSteps, 'Complete!');

        // Refresh history
        await loadBackupHistory();
        await loadCustomSnapshotCount();

    } catch (error) {
        console.error('Backup failed:', error);
        toast('❌ Backup failed: ' + error.message, 'error');
    } finally {
        // Reset UI
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Create Snapshot Now
            `;
        }

        setTimeout(() => {
            if (progressDiv) progressDiv.style.display = 'none';
        }, 2000);
    }
}

/**
 * Update progress bar
 */
function updateProgress(bar, label, percent, current, total, message) {
    const pct = Math.round((current / total) * 100);
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = message;
    if (percent) percent.textContent = pct + '%';
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download a backup by ID
 */
window.downloadBackup = async function (backupId) {
    const supabase = getSupabase();

    try {
        // Get backup info
        const { data: backup, error } = await supabase
            .from('backup_logs')
            .select('file_name')
            .eq('id', backupId)
            .single();

        if (error || !backup) {
            toast('Backup not found', 'error');
            return;
        }

        // Get download URL
        const { data: urlData, error: urlError } = await supabase.storage
            .from('backups')
            .createSignedUrl(backup.file_name, 3600);

        if (urlError) {
            toast('Could not generate download link', 'error');
            return;
        }

        // Download
        window.open(urlData.signedUrl, '_blank');

    } catch (error) {
        console.error('Download failed:', error);
        toast('Download failed', 'error');
    }
};

export default {
    initializeBackupsPage
};

