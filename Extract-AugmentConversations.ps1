# Augment Conversation Data Extractor
# This script attempts to extract readable conversation data from Augment's LevelDB files

param(
    [string]$OutputPath = ".\AugmentConversationsRecovered.txt"
)

Write-Host "=== Augment Conversation Recovery Tool ===" -ForegroundColor Cyan
Write-Host ""

# Find all LevelDB files in workspace storage
$workspaceStoragePath = "$env:APPDATA\Code\User\workspaceStorage"
$ldbFiles = Get-ChildItem -Path $workspaceStoragePath -Recurse -Filter "*.ldb" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -like "*augment-kv-store*" }

if ($ldbFiles.Count -eq 0) {
    Write-Host "No LevelDB files found in Augment storage." -ForegroundColor Yellow
    exit
}

Write-Host "Found $($ldbFiles.Count) LevelDB files to analyze..." -ForegroundColor Green
Write-Host ""

$allConversations = @()
$conversationPattern = '"request_message":"([^"]+)"|"response_text":"([^"]+)"|"conversationId":"([^"]+)"'

foreach ($file in $ldbFiles) {
    Write-Host "Processing: $($file.Name) ($([math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor Gray
    
    try {
        # Read file as bytes and convert to string (handling binary data)
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $content = [System.Text.Encoding]::UTF8.GetString($bytes)
        
        # Extract conversation-related JSON fragments
        $matches = [regex]::Matches($content, $conversationPattern)
        
        if ($matches.Count -gt 0) {
            Write-Host "  Found $($matches.Count) conversation fragments" -ForegroundColor Green
            
            # Try to extract more structured data
            $jsonPattern = '\{[^{}]*"conversationId"[^{}]*\}'
            $jsonMatches = [regex]::Matches($content, $jsonPattern)
            
            foreach ($match in $jsonMatches) {
                try {
                    $jsonText = $match.Value
                    # Clean up the JSON (remove null bytes and control characters)
                    $jsonText = $jsonText -replace '[\x00-\x1F\x7F]', ''
                    $allConversations += $jsonText
                } catch {
                    # Skip malformed JSON
                }
            }
            
            # Also extract readable text fragments
            $textPattern = '(?<="request_message":")[^"]{20,}(?=")|(?<="response_text":")[^"]{20,}(?=")'
            $textMatches = [regex]::Matches($content, $textPattern)
            
            foreach ($textMatch in $textMatches) {
                $text = $textMatch.Value -replace '\\n', "`n" -replace '\\t', "`t"
                if ($text.Length -gt 20) {
                    $allConversations += "--- Message Fragment ---`n$text`n"
                }
            }
        }
    } catch {
        Write-Host "  Error processing file: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Extraction Complete ===" -ForegroundColor Cyan

if ($allConversations.Count -gt 0) {
    # Save to output file
    $header = @"
=================================================================
AUGMENT CONVERSATION RECOVERY
Extracted: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Total Fragments Found: $($allConversations.Count)
=================================================================

"@
    
    $output = $header + ($allConversations -join "`n`n---`n`n")
    $output | Out-File -FilePath $OutputPath -Encoding UTF8
    
    Write-Host "Successfully extracted $($allConversations.Count) conversation fragments!" -ForegroundColor Green
    Write-Host "Output saved to: $OutputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Preview of first fragment:" -ForegroundColor Yellow
    Write-Host ($allConversations[0].Substring(0, [Math]::Min(200, $allConversations[0].Length))) -ForegroundColor Gray
    Write-Host "..." -ForegroundColor Gray
} else {
    Write-Host "No conversation data could be extracted." -ForegroundColor Yellow
    Write-Host "The conversations may have been permanently deleted." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Additional Recovery Options:" -ForegroundColor Cyan
Write-Host "1. Check Recycle Bin for deleted workspace folders" -ForegroundColor White
Write-Host "2. Use file recovery software (Recuva, PhotoRec, EaseUS)" -ForegroundColor White
Write-Host "3. Check if Windows File History is enabled for AppData" -ForegroundColor White

