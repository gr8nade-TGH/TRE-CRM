# Enter verification code for Supabase CLI login
Write-Host "Entering verification code: c4080c0f" -ForegroundColor Green

# Use echo to pipe the code to the supabase login command
echo "c4080c0f" | npx supabase login --no-browser
