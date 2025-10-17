@echo off
REM TRE CRM Checkpoint Restorer
REM Usage: restore-checkpoint.bat "checkpoint-name"

set "checkpointName=%1"
if "%checkpointName%"=="" (
    echo ❌ Please provide checkpoint name
    echo Usage: restore-checkpoint.bat "checkpoint-name"
    echo.
    echo Available checkpoints:
    for %%f in (checkpoints\script_*.js) do (
        set "filename=%%~nf"
        set "name=!filename:script_=!"
        echo   - !name!
    )
    pause
    exit /b 1
)

REM Check if checkpoint exists
if not exist "checkpoints\script_%checkpointName%.js" (
    echo ❌ Checkpoint not found: %checkpointName%
    echo Available checkpoints:
    for %%f in (checkpoints\script_*.js) do (
        set "filename=%%~nf"
        set "name=!filename:script_=!"
        echo   - !name!
    )
    pause
    exit /b 1
)

REM Create backup of current files
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "backupTimestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"

echo 📦 Creating backup of current files...
copy "script.js" "script_backup_%backupTimestamp%.js"
copy "index.html" "index_backup_%backupTimestamp%.html"
copy "styles.css" "styles_backup_%backupTimestamp%.css"

REM Restore checkpoint files
echo 🔄 Restoring checkpoint: %checkpointName%
copy "checkpoints\script_%checkpointName%.js" "script.js"
copy "checkpoints\index_%checkpointName%.html" "index.html"
copy "checkpoints\styles_%checkpointName%.css" "styles.css"

echo ✅ Checkpoint restored successfully!
echo 📁 Current files backed up as: *_backup_%backupTimestamp%.*
echo 🌐 Refresh your browser to see the restored state
pause
