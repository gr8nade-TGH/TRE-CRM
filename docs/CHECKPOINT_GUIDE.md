# TRE CRM Checkpoint System
# ========================

## ✅ CURRENT WORKING STATE
**Checkpoint:** working-map-and-listings_2025-10-10_11-16-05
**Status:** All pages working, map with markers functional, navigation working

## 📋 CHECKPOINT COMMANDS

### Create Checkpoint
```powershell
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"; $checkpointName = "YOUR-DESCRIPTION_$timestamp"; Copy-Item "script.js" "checkpoints/script_$checkpointName.js"; Copy-Item "index.html" "checkpoints/index_$checkpointName.html"; Copy-Item "styles.css" "checkpoints/styles_$checkpointName.css"; Write-Host "✅ Checkpoint created: $checkpointName" -ForegroundColor Green
```

### Restore Checkpoint
```powershell
$checkpointName = "working-map-and-listings_2025-10-10_11-16-05"; Copy-Item "checkpoints/script_$checkpointName.js" "script.js"; Copy-Item "checkpoints/index_$checkpointName.html" "index.html"; Copy-Item "checkpoints/styles_$checkpointName.css" "styles.css"; Write-Host "✅ Checkpoint restored: $checkpointName" -ForegroundColor Green
```

### List Available Checkpoints
```powershell
Get-ChildItem checkpoints -Filter "script_*.js" | ForEach-Object { $name = $_.Name -replace "script_", "" -replace "\.js", ""; Write-Host "📁 $name" -ForegroundColor Cyan }
```

## 🎯 BEST PRACTICES

1. **Create checkpoints BEFORE major changes**
2. **Use descriptive names** (e.g., "before-map-drawing", "working-navigation")
3. **Test functionality** after creating checkpoint
4. **Keep last 5-10 checkpoints** (delete old ones)
5. **Document what works** in checkpoint name

## 🚨 EMERGENCY RESTORE
If everything breaks, run:
```powershell
$checkpointName = "working-map-and-listings_2025-10-10_11-16-05"; Copy-Item "checkpoints/script_$checkpointName.js" "script.js"; Copy-Item "checkpoints/index_$checkpointName.html" "index.html"; Copy-Item "checkpoints/styles_$checkpointName.css" "styles.css"
```

## 📁 CHECKPOINT LOCATION
All checkpoints are stored in: `C:\Users\Tucke\OneDrive\Desktop\TRE App\checkpoints\`
