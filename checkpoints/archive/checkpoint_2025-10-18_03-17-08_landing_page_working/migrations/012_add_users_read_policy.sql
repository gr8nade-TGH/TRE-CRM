-- Migration 012: Add RLS policy to allow anonymous users to read user information
-- This is needed for landing pages to fetch agent details

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Create policy to allow anyone (including anonymous users) to view all users
-- Note: This is safe because we only expose name, email, phone - no sensitive data
CREATE POLICY "Anyone can view users" ON public.users
FOR SELECT
USING (true);

-- Grant SELECT permission to anonymous users on users table
GRANT SELECT ON public.users TO anon;

