# Extract tar.gz file using PowerShell
Write-Host "Extracting tar.gz file..." -ForegroundColor Yellow

# Method 1: Try using 7-Zip if available
if (Get-Command "7z" -ErrorAction SilentlyContinue) {
    Write-Host "Using 7-Zip..." -ForegroundColor Green
    7z x supabase.tar.gz
} else {
    Write-Host "7-Zip not found. Trying alternative method..." -ForegroundColor Yellow
    
    # Method 2: Try using tar command (Windows 10+)
    if (Get-Command "tar" -ErrorAction SilentlyContinue) {
        Write-Host "Using built-in tar command..." -ForegroundColor Green
        tar -xzf supabase.tar.gz
    } else {
        Write-Host "No extraction tool found. Please extract manually:" -ForegroundColor Red
        Write-Host "1. Right-click on 'supabase.tar.gz'" -ForegroundColor White
        Write-Host "2. Select 'Extract All...'" -ForegroundColor White
        Write-Host "3. Or use WinRAR/7-Zip" -ForegroundColor White
        exit 1
    }
}

Write-Host "Checking for supabase.exe..." -ForegroundColor Yellow
if (Test-Path "supabase.exe") {
    Write-Host "Success! supabase.exe found!" -ForegroundColor Green
    .\supabase.exe --version
} else {
    Write-Host "supabase.exe not found. Listing extracted files:" -ForegroundColor Red
    Get-ChildItem -Name "supabase*"
}
