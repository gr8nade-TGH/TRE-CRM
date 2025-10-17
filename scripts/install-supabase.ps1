# Supabase CLI Installation Script
Write-Host "Installing Supabase CLI..." -ForegroundColor Green
Write-Host ""

# Step 1: Download Supabase CLI
Write-Host "Step 1: Downloading Supabase CLI..." -ForegroundColor Yellow
try {
    $url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
    $output = "supabase.zip"
    
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please download manually from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
    exit 1
}

# Step 2: Extract
Write-Host "Step 2: Extracting..." -ForegroundColor Yellow
try {
    Expand-Archive -Path "supabase.zip" -DestinationPath "." -Force
    Write-Host "Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Move to system path
Write-Host "Step 3: Moving to system path..." -ForegroundColor Yellow
try {
    Move-Item -Path "supabase.exe" -Destination "C:\Windows\System32\supabase.exe" -Force
    Write-Host "Move completed!" -ForegroundColor Green
} catch {
    Write-Host "Move failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You may need to run as Administrator" -ForegroundColor Yellow
    exit 1
}

# Step 4: Cleanup
Write-Host "Step 4: Cleaning up..." -ForegroundColor Yellow
Remove-Item "supabase.zip" -Force
Remove-Item "supabase.exe" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Installation complete! Testing..." -ForegroundColor Green
try {
    supabase --version
} catch {
    Write-Host "Supabase CLI not found in PATH. Please restart your terminal." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: supabase login" -ForegroundColor White
Write-Host "2. Run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
Write-Host "3. Run: supabase db pull" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
