-- Migration 013: Fix RLS policies to use correct enum values for role
-- The role enum uses uppercase values (AGENT, MANAGER, SUPER_USER) not lowercase

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Managers can view all leads" ON public.leads;

-- Managers and super users can view all leads (use uppercase enum values)
CREATE POLICY "Managers can view all leads" ON public.leads
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('MANAGER', 'SUPER_USER')
    )
);

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Managers can update all leads" ON public.leads;

-- Managers and super users can update all leads (use uppercase enum values)
CREATE POLICY "Managers can update all leads" ON public.leads
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('MANAGER', 'SUPER_USER')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('MANAGER', 'SUPER_USER')
    )
);

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Managers can delete leads" ON public.leads;

-- Only managers and super users can delete leads (use uppercase enum values)
CREATE POLICY "Managers can delete leads" ON public.leads
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('MANAGER', 'SUPER_USER')
    )
);

