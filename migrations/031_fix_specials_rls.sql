-- Migration 031: Fix specials RLS policies
-- Allow authenticated users to insert/update/delete specials

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Managers can insert specials" ON public.specials;

-- Create new INSERT policy that allows all authenticated users
CREATE POLICY "Authenticated users can insert specials" ON public.specials
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Managers can update specials" ON public.specials;

-- Create new UPDATE policy that allows all authenticated users
CREATE POLICY "Authenticated users can update specials" ON public.specials
FOR UPDATE USING (
    auth.uid() IS NOT NULL
);

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Managers can delete specials" ON public.specials;

-- Create new DELETE policy that allows all authenticated users
CREATE POLICY "Authenticated users can delete specials" ON public.specials
FOR DELETE USING (
    auth.uid() IS NOT NULL
);

