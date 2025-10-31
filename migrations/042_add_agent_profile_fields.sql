-- Migration 042: Add agent profile customization fields to users table
-- These fields enable custom landing pages with headshots, social media links, and bios

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS headshot_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS x_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN public.users.headshot_url IS 'URL to agent headshot/profile photo stored in Supabase Storage';
COMMENT ON COLUMN public.users.facebook_url IS 'Agent Facebook profile URL (optional)';
COMMENT ON COLUMN public.users.instagram_url IS 'Agent Instagram profile URL (optional)';
COMMENT ON COLUMN public.users.x_url IS 'Agent X/Twitter profile URL (optional)';
COMMENT ON COLUMN public.users.bio IS 'Agent bio/about section for landing pages (optional, falls back to default if not provided)';

-- Note: No RLS changes needed - users table already has policies allowing anonymous reads
-- which is required for landing pages to fetch agent details

