-- ============================================================================
-- Migration 032: Add Performance Indexes
-- ============================================================================
-- Purpose: Add database indexes to improve query performance
-- Impact: Significantly faster queries on leads, notes, and activities
-- Date: 2025-10-25
-- ============================================================================

-- Lead Notes Indexes
-- Speeds up: getLeadNotesCount, getBatchLeadNotesCounts
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id 
ON public.lead_notes(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at 
ON public.lead_notes(created_at DESC);

-- Lead Activities Indexes
-- Speeds up: getLeadActivities, getBatchLeadActivities, getCurrentStepFromActivities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id 
ON public.lead_activities(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at 
ON public.lead_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_activity_type 
ON public.lead_activities(activity_type);

-- Composite index for common query pattern (lead_id + created_at)
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created 
ON public.lead_activities(lead_id, created_at DESC);

-- Property Activities Indexes
-- Speeds up: getPropertyActivities
CREATE INDEX IF NOT EXISTS idx_property_activities_property_id 
ON public.property_activities(property_id);

CREATE INDEX IF NOT EXISTS idx_property_activities_created_at 
ON public.property_activities(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_property_activities_property_created 
ON public.property_activities(property_id, created_at DESC);

-- Unit Activities Indexes
-- Speeds up: getUnitActivities
CREATE INDEX IF NOT EXISTS idx_unit_activities_unit_id 
ON public.unit_activities(unit_id);

CREATE INDEX IF NOT EXISTS idx_unit_activities_created_at 
ON public.unit_activities(created_at DESC);

-- Unit Notes Indexes
-- Speeds up: getUnitNotes
CREATE INDEX IF NOT EXISTS idx_unit_notes_unit_id 
ON public.unit_notes(unit_id);

CREATE INDEX IF NOT EXISTS idx_unit_notes_created_at 
ON public.unit_notes(created_at DESC);

-- Leads Indexes
-- Speeds up: getLeads with filters and sorting
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id 
ON public.leads(assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_leads_found_by_agent_id 
ON public.leads(found_by_agent_id);

CREATE INDEX IF NOT EXISTS idx_leads_health_status 
ON public.leads(health_status);

CREATE INDEX IF NOT EXISTS idx_leads_submitted_at 
ON public.leads(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_created_at 
ON public.leads(created_at DESC);

-- Properties Indexes
-- Speeds up: getProperties with filters
CREATE INDEX IF NOT EXISTS idx_properties_market 
ON public.properties(market);

CREATE INDEX IF NOT EXISTS idx_properties_is_available 
ON public.properties(is_available);

CREATE INDEX IF NOT EXISTS idx_properties_community_name 
ON public.properties(community_name);

-- Specials Indexes
-- Speeds up: getSpecials
CREATE INDEX IF NOT EXISTS idx_specials_property_id 
ON public.specials(property_id);

CREATE INDEX IF NOT EXISTS idx_specials_active 
ON public.specials(active);

CREATE INDEX IF NOT EXISTS idx_specials_valid_until 
ON public.specials(valid_until DESC);

-- Units Indexes
-- Speeds up: getUnits
CREATE INDEX IF NOT EXISTS idx_units_property_id 
ON public.units(property_id);

CREATE INDEX IF NOT EXISTS idx_units_is_available 
ON public.units(is_available);

CREATE INDEX IF NOT EXISTS idx_units_deleted_at 
ON public.units(deleted_at);

-- Composite index for common query pattern (property_id + available + not deleted)
CREATE INDEX IF NOT EXISTS idx_units_property_available 
ON public.units(property_id, is_available) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- Verification Queries (Run these to verify indexes were created)
-- ============================================================================

-- Check all indexes on lead_notes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'lead_notes';

-- Check all indexes on lead_activities
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'lead_activities';

-- Check all indexes on property_activities
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'property_activities';

-- Check all indexes on leads
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'leads';

-- ============================================================================
-- Performance Impact
-- ============================================================================
-- Before: Full table scans on every query (slow for large datasets)
-- After: Index lookups (10-100x faster depending on data size)
--
-- Example improvements:
-- - getLeadNotesCount: O(n) -> O(log n)
-- - getBatchLeadActivities: O(n*m) -> O(log n)
-- - getLeads with filters: O(n) -> O(log n)
-- ============================================================================

