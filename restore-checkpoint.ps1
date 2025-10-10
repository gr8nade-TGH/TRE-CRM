# TRE CRM Checkpoint Restorer
# Usage: .\restore-checkpoint.ps1 "checkpoint-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$CheckpointName
)

# Check if checkpoint exists
$scriptFile = "checkpoints/script_${CheckpointName}.js"
$htmlFile = "checkpoints/index_${CheckpointName}.html"
$cssFile = "checkpoints/styles_${CheckpointName}.css"

if (-not (Test-Path $scriptFile)) {
    Write-Host "❌ Checkpoint not found: $CheckpointName" -ForegroundColor Red
    Write-Host "Available checkpoints:" -ForegroundColor Yellow
    Get-ChildItem checkpoints -Filter "script_*.js" | ForEach-Object { 
        $name = $_.Name -replace "script_", "" -replace "\.js", ""
        Write-Host "  - $name" -ForegroundColor Cyan
    }
    exit 1
}

# Create backup of current files before restoring
$backupTimestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Write-Host "📦 Creating backup of current files..." -ForegroundColor Yellow
Copy-Item "script.js" "script_backup_${backupTimestamp}.js"
Copy-Item "index.html" "index_backup_${backupTimestamp}.html"
Copy-Item "styles.css" "styles_backup_${backupTimestamp}.css"

# Restore checkpoint files
Write-Host "🔄 Restoring checkpoint: $CheckpointName" -ForegroundColor Green
Copy-Item $scriptFile "script.js"
Copy-Item $htmlFile "index.html"
Copy-Item $cssFile "styles.css"

Write-Host "✅ Checkpoint restored successfully!" -ForegroundColor Green
Write-Host "📁 Current files backed up as: *_backup_${backupTimestamp}.*" -ForegroundColor Cyan
Write-Host "🌐 Refresh your browser to see the restored state" -ForegroundColor Yellow
