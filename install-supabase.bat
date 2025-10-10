@echo off
echo Installing Supabase CLI...
echo.

echo Step 1: Downloading Supabase CLI...
curl -L "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip" -o "supabase.zip"

echo Step 2: Extracting...
powershell -Command "Expand-Archive -Path 'supabase.zip' -DestinationPath '.' -Force"

echo Step 3: Moving to system path...
move supabase.exe C:\Windows\System32\

echo Step 4: Cleaning up...
del supabase.zip

echo.
echo Installation complete! Testing...
supabase --version

echo.
echo Next steps:
echo 1. Run: supabase login
echo 2. Run: supabase link --project-ref YOUR_PROJECT_REF
echo 3. Run: supabase db pull
echo.
pause
