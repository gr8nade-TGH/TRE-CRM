# Supabase Integration with Cursor - Complete Guide

## 🚀 **Best Integration Options:**

### **1. Supabase CLI (Most Powerful)**
**What it gives you:**
- Direct database access from terminal
- Schema management
- Data seeding
- Migration management
- Local development environment

**Installation Options:**
```bash
# Option A: Via npm (if PowerShell allows)
npm install -g supabase

# Option B: Via winget (Windows Package Manager)
winget install Supabase.CLI

# Option C: Direct download from GitHub
# Download from: https://github.com/supabase/cli/releases
```

**Setup Commands:**
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Pull current schema
supabase db pull

# Generate types
supabase gen types typescript --local > types/supabase.ts
```

### **2. Supabase VS Code Extension (Works in Cursor)**
**What it gives you:**
- Database browser in sidebar
- Query editor
- Table management
- Real-time data viewing

**Installation:**
1. Open Cursor
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Supabase"
4. Install "Supabase" by Supabase

**Features:**
- Browse tables and data
- Run SQL queries
- View real-time logs
- Manage database functions

### **3. Supabase Dashboard (Web Interface)**
**What it gives you:**
- Full database management
- User management
- API documentation
- Real-time monitoring

**Access:**
- Go to https://supabase.com/dashboard
- Select your project
- Use the SQL Editor for queries
- Use the Table Editor for data management

## 🔧 **Recommended Setup Process:**

### **Step 1: Install Supabase CLI**
```bash
# Try this in Command Prompt (not PowerShell)
npm install -g supabase

# Or download manually from GitHub
```

### **Step 2: Configure Project**
```bash
# Login to Supabase
supabase login

# Link your project (get project ref from dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# Pull current schema
supabase db pull
```

### **Step 3: Install VS Code Extension**
1. Open Cursor
2. Extensions → Search "Supabase"
3. Install the official Supabase extension

### **Step 4: Configure Extension**
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Supabase: Add Project"
3. Enter your project URL and API key

## 🛠️ **What This Enables:**

### **Database Management:**
- Run SQL queries directly in Cursor
- Browse table data
- Manage schema changes
- View real-time logs

### **Development Workflow:**
- Generate TypeScript types
- Run migrations
- Seed test data
- Debug queries

### **Production Management:**
- Deploy schema changes
- Monitor performance
- Manage users
- Configure security

## 🚨 **Immediate Security Fixes:**

Once you have Supabase CLI installed, I can help you run these commands:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
-- ... (all 13 tables)

-- Create security policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);
```

## 📋 **Next Steps:**

1. **Install Supabase CLI** (try the manual download if npm fails)
2. **Install VS Code Extension** in Cursor
3. **Configure both** with your project credentials
4. **Run security fixes** immediately
5. **Update frontend** to use Supabase client

## 🔍 **Alternative: Manual Approach**

If CLI installation fails, we can:
1. Use the Supabase Dashboard web interface
2. Copy/paste SQL commands
3. Update frontend manually
4. Test everything through the web interface

**Which approach would you prefer to try first?**
