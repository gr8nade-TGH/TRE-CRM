# Supabase CLI Download Script - Corrected
Write-Host "Downloading Supabase CLI for Windows..." -ForegroundColor Green
Write-Host ""

# The actual Windows release files are named differently
# Let's try the correct naming pattern
$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz"
$output = "supabase.tar.gz"

Write-Host "Step 1: Downloading from: $url" -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Trying alternative download method..." -ForegroundColor Yellow
    
    # Try alternative naming
    $altUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
    try {
        Invoke-WebRequest -Uri $altUrl -OutFile "supabase.zip" -UseBasicParsing
        Write-Host "Alternative download successful!" -ForegroundColor Green
        $output = "supabase.zip"
    } catch {
        Write-Host "Both download methods failed." -ForegroundColor Red
        Write-Host "Please manually download from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
        Write-Host "Look for the Windows executable file" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Step 2: Extracting..." -ForegroundColor Yellow
try {
    if ($output -eq "supabase.tar.gz") {
        # Extract tar.gz
        tar -xzf $output
    } else {
        # Extract zip
        Expand-Archive -Path $output -DestinationPath "." -Force
    }
    Write-Host "Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please extract manually" -ForegroundColor Yellow
}

Write-Host "Step 3: Testing..." -ForegroundColor Yellow
if (Test-Path "supabase.exe") {
    Write-Host "Supabase CLI found! Testing..." -ForegroundColor Green
    .\supabase.exe --version
} else {
    Write-Host "supabase.exe not found. Please check the extracted files." -ForegroundColor Red
    Get-ChildItem -Name "supabase*"
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\supabase.exe login" -ForegroundColor White
Write-Host "2. Run: .\supabase.exe link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
Write-Host "3. Run: .\supabase.exe db pull" -ForegroundColor White
