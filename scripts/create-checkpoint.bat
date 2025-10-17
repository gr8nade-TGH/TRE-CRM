@echo off
REM TRE CRM Checkpoint Creator
REM Usage: create-checkpoint.bat "description"

set "description=%1"
if "%description%"=="" set "description=checkpoint"

REM Create timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"
set "checkpointName=%description%_%timestamp%"

REM Create checkpoints directory
if not exist "checkpoints" mkdir checkpoints

REM Copy main files
copy "script.js" "checkpoints\script_%checkpointName%.js"
copy "index.html" "checkpoints\index_%checkpointName%.html"
copy "styles.css" "checkpoints\styles_%checkpointName%.css"

REM Create summary file
echo CHECKPOINT: %checkpointName% > "checkpoints\README_%checkpointName%.txt"
echo Created: %date% %time% >> "checkpoints\README_%checkpointName%.txt"
echo Description: %description% >> "checkpoints\README_%checkpointName%.txt"
echo. >> "checkpoints\README_%checkpointName%.txt"
echo Files backed up: >> "checkpoints\README_%checkpointName%.txt"
echo - script.js >> "checkpoints\README_%checkpointName%.txt"
echo - index.html >> "checkpoints\README_%checkpointName%.txt"
echo - styles.css >> "checkpoints\README_%checkpointName%.txt"

echo ✅ Checkpoint created: %checkpointName%
echo 📁 Location: checkpoints\
echo 📝 Description: %description%
pause
