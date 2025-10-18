-- Supabase Schema Updates for Lead Details System
-- Run these commands in Supabase SQL Editor

-- 1. Add missing columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS best_time_to_call VARCHAR,
ADD COLUMN IF NOT EXISTS bedrooms VARCHAR,
ADD COLUMN IF NOT EXISTS bathrooms VARCHAR,
ADD COLUMN IF NOT EXISTS price_range VARCHAR,
ADD COLUMN IF NOT EXISTS area_of_town VARCHAR,
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS credit_history VARCHAR,
ADD COLUMN IF NOT EXISTS lease_term TEXT,
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS desired_neighborhoods TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create lead_notes table for internal notes
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id VARCHAR NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR NOT NULL REFERENCES public.users(id),
    author_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON public.leads(updated_at);

-- 4. Enable Row Level Security on lead_notes
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for lead_notes
CREATE POLICY "Users can view notes for their assigned leads" ON public.lead_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = lead_notes.lead_id 
            AND (leads.assigned_agent_id = auth.uid()::text OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE users.id = auth.uid()::text 
                     AND users.role IN ('manager', 'super_user')
                 ))
        )
    );

-- Allow all authenticated users to insert notes (we'll handle permissions in the app)
CREATE POLICY "Users can insert notes for their assigned leads" ON public.lead_notes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their own notes" ON public.lead_notes
    FOR UPDATE USING (author_id = auth.uid()::text);

CREATE POLICY "Managers can update any notes" ON public.lead_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid()::text 
            AND users.role IN ('manager', 'super_user')
        )
    );

-- 6. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON public.leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_notes_updated_at 
    BEFORE UPDATE ON public.lead_notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.lead_notes TO authenticated;
GRANT SELECT, UPDATE ON public.leads TO authenticated;

-- 9. Enable realtime for lead_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes;
