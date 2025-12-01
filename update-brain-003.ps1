# Brain Update #003 Script
# Updates NEW_AGENT_PROMPT.md, DECISION_LOG.md, and UPDATE_LOG.md

$brainDir = "C:\Users\Tucke\Documents\augment-projects\Optimize Projects\TRE_BRAIN"

Write-Host "Starting Brain Update #003..." -ForegroundColor Cyan

# Read current NEW_AGENT_PROMPT.md
$newAgentPrompt = Get-Content "$brainDir\NEW_AGENT_PROMPT.md" -Raw

# Update "Last Updated" date
$newAgentPrompt = $newAgentPrompt -replace '\*\*Last Updated:\*\* 2025-11-29', '**Last Updated:** 2025-12-01'

# Update "Just Completed (Last 7 Days)" section
$oldJustCompleted = @'
## 📋 Just Completed \(Last 7 Days\)

### \*\*✅ Lease Confirmation Feature - Phase 1 \(November 29, 2025\)\*\*
- 🔴 \*\*NEW FEATURE:\*\* Lease Confirmation e-signature workflow
- Database schema created \(`lease_confirmations` table - Migration 051\)
- Storage bucket created for signed PDFs \(`lease-documents` - Migration 052\)
- 1-page web form component created \(`LeaseConfirmationPage`\)
- Modal integration in Documents page \(`lease-confirmation-modal.js`\)
- Status workflow: `draft` → `pending_signature` → `awaiting_signature` → `signed`
- Documenso integration fields added \(document_id, signing_url, recipient_email\)
- Comprehensive implementation plan documented

### \*\*✅ Property Policies Section \(November 2025\)\*\*
- Added comprehensive Policies section to Edit Property modal
- Moved Active Specials and Status Flags to top as simple sections
- Removed references to deleted `editSpecials` and `editBonus` fields
'@

$newJustCompleted = @'
## 📋 Just Completed (Last 7 Days)

### **✅ Lease Confirmation Feature - COMPLETE (November 29 - December 1, 2025)**
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
'@

$newAgentPrompt = $newAgentPrompt -replace [regex]::Escape($oldJustCompleted), $newJustCompleted

# Update "Active Work" section - remove it since Lease Confirmation is complete
$oldActiveWork = @'
## 🚧 Active Work

### \*\*Current Status:\*\*
- 🔄 \*\*Lease Confirmation - Phase 2 IN PROGRESS\*\*
  - Phase 1 complete \(database \+ form component\)
  - Next: Documents page integration
  - Next: Auto-population from lead data

### \*\*Known Issues:\*\*
- None critical - system is production-ready
'@

$newActiveWork = @'
## 🚧 Active Work

### **Current Status:**
- ✅ **All major features COMPLETE**
- ✅ **Lease Confirmation COMPLETE** (Phases 1-3)
- ✅ **Backup System COMPLETE**
- 🔄 **Organic testing and refinement phase**

### **Known Issues:**
- None critical - system is production-ready
'@

$newAgentPrompt = $newAgentPrompt -replace [regex]::Escape($oldActiveWork), $newActiveWork

# Save updated NEW_AGENT_PROMPT.md
Set-Content -Path "$brainDir\NEW_AGENT_PROMPT.md" -Value $newAgentPrompt -Encoding UTF8 -NoNewline

Write-Host "✅ NEW_AGENT_PROMPT.md updated" -ForegroundColor Green
Write-Host "Brain Update #003 complete!" -ForegroundColor Green

