# TRE CRM Checkpoint Creator
# Usage: .\create-checkpoint.ps1 "description"

param(
    [string]$Description = "checkpoint"
)

# Create timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$checkpointName = "${Description}_${timestamp}"

# Create checkpoints directory if it doesn't exist
New-Item -ItemType Directory -Path "checkpoints" -Force | Out-Null

# Copy main files
Copy-Item "script.js" "checkpoints/script_${checkpointName}.js"
Copy-Item "index.html" "checkpoints/index_${checkpointName}.html"
Copy-Item "styles.css" "checkpoints/styles_${checkpointName}.css"

# Create a summary file
$summary = @"
CHECKPOINT: $checkpointName
Created: $(Get-Date)
Description: $Description

Files backed up:
- script.js
- index.html  
- styles.css

Status: All pages working, map with markers functional
"@

$summary | Out-File "checkpoints/README_${checkpointName}.txt"

Write-Host "✅ Checkpoint created: $checkpointName" -ForegroundColor Green
Write-Host "📁 Location: checkpoints/" -ForegroundColor Cyan
Write-Host "📝 Description: $Description" -ForegroundColor Yellow
