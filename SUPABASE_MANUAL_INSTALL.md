# Supabase CLI Manual Installation Guide

## 🚀 **Manual Installation Steps:**

### **Step 1: Download Supabase CLI**
1. Go to: https://github.com/supabase/cli/releases
2. Download the latest `supabase_windows_amd64.zip` file
3. Extract it to your project folder

### **Step 2: Test Installation**
```bash
# Navigate to your project folder
cd "C:\Users\Tucke\OneDrive\Desktop\TRE App"

# Run the executable
.\supabase.exe --version
```

### **Step 3: Configure Supabase**
```bash
# Login to Supabase
.\supabase.exe login

# Link to your project (get project ref from dashboard)
.\supabase.exe link --project-ref YOUR_PROJECT_REF

# Pull current schema
.\supabase.exe db pull
```

## 🔧 **Alternative: Use Supabase Dashboard**

Since CLI installation is challenging, we can use the Supabase Dashboard web interface:

1. **Go to:** https://supabase.com/dashboard
2. **Select your project**
3. **Use the SQL Editor** to run commands
4. **Use the Table Editor** to manage data

## 🚨 **Immediate Security Fixes (via Dashboard):**

### **Enable Row Level Security:**
```sql
-- Enable RLS on all tables
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

### **Create Security Policies:**
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
```

## 📋 **Next Steps:**

1. **Download Supabase CLI manually** from GitHub
2. **Or use the Dashboard** for immediate security fixes
3. **Test the CLI** with basic commands
4. **Configure your project** with proper security

**Which approach would you prefer?**
- Manual CLI download and setup
- Use Dashboard for immediate security fixes
- Both approaches
