# Supabase Production Setup Gameplan

## 🚨 IMMEDIATE PRIORITY - Security Fixes

### 1. Enable Row Level Security (RLS) on ALL Tables
```sql
-- Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_properties ENABLE ROW LEVEL SECURITY;
```

### 2. Create RLS Policies for Each Table
```sql
-- Users table policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Managers can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role IN ('manager', 'super_user')
    )
  );

-- Leads table policies
CREATE POLICY "Agents can view their assigned leads" ON public.leads
  FOR SELECT USING (
    assigned_agent_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role IN ('manager', 'super_user')
    )
  );

-- Properties table policies
CREATE POLICY "All authenticated users can view properties" ON public.properties
  FOR SELECT USING (auth.role() = 'authenticated');

-- Similar policies for other tables...
```

## 🔧 Database Optimization

### 3. Add Missing Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON public.leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_health_status ON public.leads(health_status);
CREATE INDEX IF NOT EXISTS idx_properties_is_pumi ON public.properties(is_pumi);
CREATE INDEX IF NOT EXISTS idx_showcases_agent_id ON public.showcases(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
```

### 4. Enable Realtime for Live Updates
```sql
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.showcases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bugs;
```

## 🛡️ Authentication & User Management

### 5. Set Up Supabase Auth
- Configure email templates
- Set up password policies
- Configure OAuth providers (if needed)
- Set up user roles and permissions

### 6. Create User Management Functions
```sql
-- Function to create new users
CREATE OR REPLACE FUNCTION create_user(
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'agent'
) RETURNS TEXT AS $$
DECLARE
  user_id TEXT;
BEGIN
  -- Create auth user
  user_id := gen_random_uuid()::text;
  
  -- Insert into users table
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (user_id, email, name, role, NOW());
  
  -- Log the action
  INSERT INTO public.audit_logs (action, user_id, user_name, user_email, performed_by, performed_by_name, details, created_at)
  VALUES ('user_created', user_id, name, email, auth.uid()::text, 
          (SELECT name FROM public.users WHERE id = auth.uid()::text), 
          'User created with role: ' || role, NOW());
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📊 Data Management

### 7. Create Data Seeding Scripts
- Production-ready seed data
- Test data for development
- Data migration scripts

### 8. Set Up Backup Strategy
- Automated daily backups
- Point-in-time recovery
- Data export procedures

## 🔌 API Integration

### 9. Update Frontend API Calls
- Replace mock API calls with Supabase client
- Implement proper error handling
- Add loading states

### 10. Environment Configuration
```javascript
// Supabase client setup
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## 🚀 Production Deployment

### 11. Vercel Configuration
- Environment variables setup
- Build configuration
- Domain configuration

### 12. Monitoring & Analytics
- Set up Supabase Analytics
- Configure Sentry for error tracking
- Set up performance monitoring

## 📋 Implementation Priority:

1. **CRITICAL**: Enable RLS and create policies (Security)
2. **HIGH**: Add performance indexes
3. **HIGH**: Update frontend API integration
4. **MEDIUM**: Enable realtime features
5. **MEDIUM**: Set up authentication
6. **LOW**: Advanced monitoring and analytics

## ⚠️ Security Checklist:
- [ ] RLS enabled on all tables
- [ ] Proper policies created
- [ ] API keys secured
- [ ] User roles properly configured
- [ ] Audit logging working
- [ ] Data validation in place
