-- Migration 061: Assign Agent to Test Leads
-- Date: 2025-01-10
-- Purpose: Assign Alex Agent to all test leads so Smart Match emails can be sent
-- 
-- ISSUE: Test leads created in migration 060 had no assigned_agent_id or found_by_agent_id
-- This caused Smart Match emails to fail with "Agent email is required, Agent name is required"
-- 
-- FIX: Assign all test leads to Alex Agent (cmgfw1khk0003jdigkas8ymq9)

-- Update all test leads to have assigned_agent_id and found_by_agent_id
UPDATE leads 
SET 
    assigned_agent_id = 'cmgfw1khk0003jdigkas8ymq9',  -- Alex Agent
    found_by_agent_id = 'cmgfw1khk0003jdigkas8ymq9'   -- Alex Agent
WHERE email LIKE '%+test@gmail.com';

-- Verification: Check that all test leads now have an assigned agent
SELECT 
    id, 
    name, 
    email, 
    assigned_agent_id,
    found_by_agent_id
FROM leads 
WHERE email LIKE '%+test@gmail.com'
ORDER BY name;

-- Expected Result: 20 test leads all with assigned_agent_id = 'cmgfw1khk0003jdigkas8ymq9'

