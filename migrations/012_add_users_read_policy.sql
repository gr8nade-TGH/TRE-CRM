-- Migration 012: Add RLS policy to allow anonymous users to read agent information
-- This is needed for landing pages to fetch agent details

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view agents" ON public.users;

-- Create policy to allow anyone (including anonymous users) to view agents
CREATE POLICY "Anyone can view agents" ON public.users
FOR SELECT
USING (role = 'agent');

-- Grant SELECT permission to anonymous users on users table
GRANT SELECT ON public.users TO anon;

