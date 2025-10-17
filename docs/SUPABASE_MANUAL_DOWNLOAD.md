# Supabase CLI Manual Download Guide

## 🚀 **Step-by-Step Instructions:**

### **Step 1: Download the ZIP file**
1. **Go to:** https://github.com/supabase/cli/releases
2. **Find the latest release** (should be v1.149.0 or newer)
3. **Download:** `supabase_windows_amd64.zip` (17.6 MB)
4. **Save it to:** `C:\Users\Tucke\OneDrive\Desktop\TRE App\`

### **Step 2: Extract the ZIP file**
1. **Right-click** on `supabase_windows_amd64.zip`
2. **Select:** "Extract All..."
3. **Choose:** "Extract to the same folder"
4. **Click:** "Extract"

### **Step 3: Test the installation**
```powershell
# Navigate to your project folder
cd "C:\Users\Tucke\OneDrive\Desktop\TRE App"

# Test the CLI
.\supabase.exe --version
```

### **Step 4: Configure Supabase**
```powershell
# Login to Supabase
.\supabase.exe login

# Link to your project (get project ref from dashboard)
.\supabase.exe link --project-ref YOUR_PROJECT_REF

# Pull current schema
.\supabase.exe db pull
```

## 🔧 **Alternative: Use Supabase Dashboard**

If the CLI setup is taking too long, we can use the web dashboard for immediate security fixes:

1. **Go to:** https://supabase.com/dashboard
2. **Select your project**
3. **Use the SQL Editor** to run security commands
4. **Fix the 13 security vulnerabilities** immediately

## 🚨 **Critical Security Fixes Needed:**

Your database has 13 security vulnerabilities that need immediate attention:

```sql
-- Enable Row Level Security on all tables
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

## 📋 **Next Steps:**

1. **Download and extract** the ZIP file manually
2. **Test the CLI** with `.\supabase.exe --version`
3. **Fix security issues** immediately (via CLI or Dashboard)
4. **Configure your project** for production use

**Which would you prefer to do first?**
- Download the ZIP file manually
- Use the Dashboard to fix security issues immediately
- Both approaches
