-- Migration: Make performed_by nullable for anonymous activity logging
-- This allows activity logging from the landing page where users aren't authenticated

-- Drop the foreign key constraint temporarily
ALTER TABLE public.lead_activities 
DROP CONSTRAINT IF EXISTS lead_activities_performed_by_fkey;

-- Make performed_by nullable (it might already be, but this ensures it)
ALTER TABLE public.lead_activities 
ALTER COLUMN performed_by DROP NOT NULL;

-- Re-add the foreign key constraint (it will now allow NULL values)
ALTER TABLE public.lead_activities 
ADD CONSTRAINT lead_activities_performed_by_fkey 
FOREIGN KEY (performed_by) 
REFERENCES public.users(id);

-- Update the RLS policy to allow anonymous inserts without performed_by
DROP POLICY IF EXISTS "Allow insert for authenticated users and anon for landing page" ON public.lead_activities;

CREATE POLICY "Allow insert for authenticated users and anon for landing page"
ON public.lead_activities
FOR INSERT
TO authenticated, anon
WITH CHECK (
    -- Authenticated users can insert any activity
    (auth.role() = 'authenticated')
    OR
    -- Anonymous users can only insert lead_created activities without performed_by
    (auth.role() = 'anon' AND activity_type = 'lead_created' AND performed_by IS NULL)
);

