# Enter verification code for Supabase CLI login
Write-Host "Entering verification code: ea403924" -ForegroundColor Green

# Use echo to pipe the code to the supabase login command
echo "ea403924" | npx supabase login --no-browser
