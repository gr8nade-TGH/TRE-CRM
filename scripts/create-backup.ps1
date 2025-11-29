# TRE CRM Backup Script
# Creates a ZIP backup excluding build artifacts and dependencies

Write-Host "Starting TRE CRM Backup..." -ForegroundColor Cyan

# Get project info
$projectName = "TRE-CRM"
$projectRoot = $PSScriptRoot | Split-Path -Parent
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Get git info
Push-Location $projectRoot
try {
    $gitTag = git describe --tags --abbrev=0 2>$null
    if (-not $gitTag) { $gitTag = "no-tag" }
    $gitCommit = git rev-parse --short HEAD 2>$null
    if (-not $gitCommit) { $gitCommit = "no-commit" }
} catch {
    $gitTag = "no-tag"
    $gitCommit = "no-commit"
}
Pop-Location

# Create backup directory
$backupDir = "C:\Users\Tucke\Documents\${projectName}_Backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Created backup directory: $backupDir" -ForegroundColor Green
}

# Generate backup filename
$backupName = "${projectName}_${gitTag}_${gitCommit}_${timestamp}.zip"
$backupPath = Join-Path $backupDir $backupName

# Exclusion patterns
$excludeDirs = @(
    "node_modules",
    ".next",
    "dist",
    "build",
    ".turbo",
    ".vercel",
    ".git"
)

$excludeFiles = @(
    "*.log",
    ".DS_Store",
    "Thumbs.db"
)

Write-Host "Collecting files..." -ForegroundColor Yellow

# Get all files to backup
$filesToBackup = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
    $file = $_
    $shouldExclude = $false
    
    # Check if file is in excluded directory
    foreach ($dir in $excludeDirs) {
        if ($file.FullName -like "*\$dir\*") {
            $shouldExclude = $true
            break
        }
    }
    
    # Check if file matches excluded patterns
    if (-not $shouldExclude) {
        foreach ($pattern in $excludeFiles) {
            if ($file.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
    }
    
    -not $shouldExclude
}

$fileCount = $filesToBackup.Count
Write-Host "Found $fileCount files to backup" -ForegroundColor Cyan

# Create temporary directory for staging
$tempDir = Join-Path $env:TEMP "tre-crm-backup-$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files to temp directory maintaining structure
foreach ($file in $filesToBackup) {
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1)
    $destPath = Join-Path $tempDir $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $file.FullName -Destination $destPath -Force
}

Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

# Create ZIP archive
Compress-Archive -Path "$tempDir\*" -DestinationPath $backupPath -Force

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

# Get backup size
$backupSize = (Get-Item $backupPath).Length
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

# Create backup manifest
$manifest = @{
    projectName = $projectName
    timestamp = $timestamp
    gitTag = $gitTag
    gitCommit = $gitCommit
    fileCount = $fileCount
    backupSizeMB = $backupSizeMB
    backupPath = $backupPath
    excludedDirs = $excludeDirs
    excludedFiles = $excludeFiles
}

$manifestPath = Join-Path $backupDir "backup-manifest.json"
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath

# Display results
Write-Host ""
Write-Host "Backup Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Gray
Write-Host "Location: $backupPath" -ForegroundColor Cyan
Write-Host "Size: $backupSizeMB MB" -ForegroundColor Cyan
Write-Host "Files: $fileCount" -ForegroundColor Cyan
Write-Host "Tag: $gitTag" -ForegroundColor Cyan
Write-Host "Commit: $gitCommit" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Gray

Write-Host ""
Write-Host "Recent Backups:" -ForegroundColor Yellow
Get-ChildItem -Path $backupDir -Filter "*.zip" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  $($_.Name) - $sizeMB MB - $($_.LastWriteTime)" -ForegroundColor Gray
    }

Write-Host ""
Write-Host "Backup saved successfully!" -ForegroundColor Green

