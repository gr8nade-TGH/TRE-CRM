# TRE Brain Update #003 - Full Update Script
# Updates all brain files with Lease Confirmation completion and Backup System

$brainDir = "C:\Users\Tucke\Documents\augment-projects\Optimize Projects\TRE_BRAIN"

Write-Host "`n🧠 Starting Brain Update #003..." -ForegroundColor Cyan
Write-Host "Date: 2025-12-01" -ForegroundColor Cyan
Write-Host "Changes: Lease Confirmation COMPLETE + Backup System`n" -ForegroundColor Cyan

# ============================================================================
# UPDATE NEW_AGENT_PROMPT.md
# ============================================================================

Write-Host "📝 Updating NEW_AGENT_PROMPT.md..." -ForegroundColor Yellow

$newAgentContent = Get-Content "$brainDir\NEW_AGENT_PROMPT.md" -Raw

# 1. Update Last Updated date
$newAgentContent = $newAgentContent -replace '\*\*Last Updated:\*\* 2025-11-29', '**Last Updated:** 2025-12-01'

# 2. Replace "Just Completed (Last 7 Days)" section
$pattern1 = '(?s)(## 📋 Just Completed \(Last 7 Days\).*?)(### \*\*✅ Property Policies Section)'
$replacement1 = @'
## 📋 Just Completed (Last 7 Days)

### **✅ Lease Confirmation Feature - COMPLETE (Nov 29 - Dec 1, 2025)**
- 🔴 **FEATURE COMPLETE:** Lease Confirmation e-signature workflow (Phases 1-3)
- ✅ **Phase 1:** Database schema + form component (Migration 051-052)
- ✅ **Phase 2:** Documenso integration + email workflow (Migration 059)
- ✅ **Phase 3:** PDF generation with Browserless.io
- Email confirmation modal with auto-population
- CC email support for additional recipients
- Professional email template in database
- Reliable PDF generation via Browserless.io cloud service
- Tagged as **v1.0.0-lease-signature-complete**

### **✅ Backup System (December 1, 2025)**
- Created PowerShell backup script (`scripts/create-backup.ps1`)
- Added `npm run backup` command
- Automated ZIP creation with git metadata
- Backups stored in `C:\Users\Tucke\Documents\TRE-CRM_Backups`

$2
'@
$newAgentContent = $newAgentContent -replace $pattern1, $replacement1

# 3. Replace "Active Work" section
$pattern2 = '(?s)(## 🚧 Active Work.*?)(## 📮 Next Up)'
$replacement2 = @'
## 🚧 Active Work

### **Current Status:**
- ✅ **All major features COMPLETE**
- ✅ **Lease Confirmation COMPLETE** (Phases 1-3)
- ✅ **Backup System COMPLETE**
- 🔄 **Organic testing and refinement phase**

### **Known Issues:**
- None critical - system is production-ready

---

$2
'@
$newAgentContent = $newAgentContent -replace $pattern2, $replacement2

# 4. Update "Next Up" section - remove Lease Confirmation phases
$pattern3 = '(?s)(### \*\*Immediate Priorities:\*\*.*?)(### \*\*Potential Enhancements:\*\*)'
$replacement3 = @'
### **Immediate Priorities:**

1. **Organic Testing & User Feedback**
   - Test Lease Confirmation workflow end-to-end
   - Gather user feedback on new features
   - Monitor email delivery and signature completion

2. **Optional Enhancements**
   - Lease Confirmation: Auto-population from lead data (form pre-fill)
   - Lease Confirmation: Webhook for signature completion tracking
   - Lease Confirmation: Save draft improvements

$2
'@
$newAgentContent = $newAgentContent -replace $pattern3, $replacement3

# 5. Add new gotchas for Browserless.io and Backup System
$pattern4 = '(### \*\*6\. Lease Confirmation Workflow\*\*.*?---)'
$replacement4 = @'
$1

### **7. Browserless.io for PDF Generation**
- **Service:** Browserless.io cloud service (paid)
- **Environment Variable:** `BROWSERLESS_TOKEN` required
- **Purpose:** Reliable PDF generation in serverless environment
- **Documentation:** See `BROWSERLESS_SETUP.md`
- **Why:** Local Chromium unreliable in Vercel serverless functions

### **8. Backup System**
- **Command:** `npm run backup` or just say "backup"
- **Script:** `scripts/create-backup.ps1` (PowerShell)
- **Location:** `C:\Users\Tucke\Documents\TRE-CRM_Backups`
- **Format:** `[ProjectName]_[gitTag]_[gitCommit]_[timestamp].zip`
- **Excludes:** node_modules, .next, dist, build, .turbo, .vercel, .git
- **Manifest:** Creates `backup-manifest.json` with metadata

---
'@
$newAgentContent = $newAgentContent -replace $pattern4, $replacement4

# 6. Update database schema section to include Migration 059
$pattern5 = '(- `lease_confirmations` - \*\*NEW:\*\* Lease confirmation forms and e-signature tracking)'
$replacement5 = @'
$1
- `email_templates` - Email templates (includes lease confirmation template - Migration 059)
'@
$newAgentContent = $newAgentContent -replace $pattern5, $replacement5

# Save updated NEW_AGENT_PROMPT.md
Set-Content "$brainDir\NEW_AGENT_PROMPT.md" -Value $newAgentContent -NoNewline -Encoding UTF8
Write-Host "✅ NEW_AGENT_PROMPT.md updated" -ForegroundColor Green

Write-Host "`n🎯 Brain Update #003 Complete!" -ForegroundColor Green
Write-Host "Files updated: NEW_AGENT_PROMPT.md" -ForegroundColor Gray
Write-Host "Next: Update DECISION_LOG.md and UPDATE_LOG.md manually" -ForegroundColor Gray

