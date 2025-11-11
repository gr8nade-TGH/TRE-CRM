-- Migration 057: Update agent emails to use Gmail+ trick for testing
-- This allows all agent notification emails to be delivered to a single inbox for easy testing

-- ============================================
-- UPDATE AGENT EMAILS FOR TESTING
-- ============================================

-- Update all active agents to use Gmail+ trick
-- Format: tucker.harris+agent1@gmail.com, tucker.harris+agent2@gmail.com, etc.
-- All emails will be delivered to tucker.harris@gmail.com

WITH numbered_agents AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) as agent_number
    FROM public.users
    WHERE role = 'AGENT' AND active = true
)
UPDATE public.users
SET email = 'tucker.harris+agent' || numbered_agents.agent_number || '@gmail.com'
FROM numbered_agents
WHERE public.users.id = numbered_agents.id;

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.users
    WHERE role = 'AGENT' AND active = true AND email LIKE 'tucker.harris+agent%@gmail.com';
    
    RAISE NOTICE 'Updated % agent email addresses for testing', updated_count;
END $$;

