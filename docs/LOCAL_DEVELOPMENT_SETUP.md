# 🛠️ Local Development Setup for Email Testing

**Issue:** The `/api/send-email` serverless function doesn't work when running the app locally with a simple HTTP server because serverless functions require a serverless runtime environment.

**Solution:** Use Vercel CLI to run the app locally with serverless function support.

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**

```bash
vercel login
```

Follow the prompts to authenticate.

### **Step 3: Link Your Project**

```bash
vercel link
```

This will link your local project to your Vercel deployment.

### **Step 4: Pull Environment Variables**

```bash
vercel env pull .env.local
```

This downloads all environment variables from your Vercel project to `.env.local`.

### **Step 5: Run Local Development Server**

```bash
vercel dev
```

This starts a local server at `http://localhost:3000` with full serverless function support!

---

## 🧪 Testing Email Sending Locally

Once `vercel dev` is running:

1. Open `http://localhost:3000` in your browser
2. Login to the CRM
3. Go to Emails page (`#/emails`)
4. Click "📤 Test Send" on any template
5. Fill in the form and send!

The email will be sent via the local serverless function, which has access to all environment variables.

---

## 🔧 Alternative: Manual Environment Variables Setup

If you don't want to use Vercel CLI, you can manually add your Supabase credentials to `.env`:

### **Step 1: Get Your Supabase Credentials**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** (e.g., `https://mevirooooypfjbsrmzrk.supabase.co`)
   - **anon/public key**
   - **service_role key** (⚠️ Keep this secret!)

### **Step 2: Update `.env` File**

```env
# Supabase Configuration
SUPABASE_URL=https://mevirooooypfjbsrmzrk.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Resend Email API
RESEND_API_KEY=re_FRXB3GYa_3KTfhD6XLf8WPD1KD8zZuQzC

# Email Configuration
EMAIL_FROM=noreply@tre-crm.com
EMAIL_FROM_NAME=TRE CRM
```

### **Step 3: Run with Vercel CLI**

Even with manual `.env` setup, you still need Vercel CLI to run serverless functions locally:

```bash
vercel dev
```

---

## ⚠️ Important Notes

### **Why Can't I Use a Simple HTTP Server?**

Serverless functions (files in `/api` folder) are **not regular JavaScript files**. They are:
- Executed in a Node.js runtime on the server
- Have access to environment variables
- Can make server-side API calls
- Cannot be run in the browser

When you use a simple HTTP server (like `python -m http.server` or VS Code Live Server), the browser tries to load `/api/send-email` as a static file, which fails.

### **Vercel CLI vs Production**

- **Vercel CLI (`vercel dev`)**: Runs serverless functions locally for testing
- **Vercel Production**: Runs serverless functions on Vercel's edge network

Both use the same code, but Vercel CLI simulates the production environment locally.

---

## 📊 Comparison: Development Options

| Method | Serverless Functions | Email Sending | Setup Time |
|--------|---------------------|---------------|------------|
| **Simple HTTP Server** | ❌ No | ❌ No | 1 min |
| **Vercel CLI** | ✅ Yes | ✅ Yes | 5 min |
| **Vercel Production** | ✅ Yes | ✅ Yes | Already deployed |

---

## 🎯 Recommended Workflow

### **For Testing Email Features:**
```bash
vercel dev
```
Open `http://localhost:3000`

### **For Testing Other Features (No Email):**
Use any HTTP server:
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# VS Code Live Server
Right-click index.html → Open with Live Server
```

---

## 🐛 Troubleshooting

### **Error: "Server configuration error"**

**Cause:** Environment variables not loaded.

**Fix:**
1. Run `vercel env pull .env.local`
2. Restart `vercel dev`

### **Error: "Failed to load resource: 500"**

**Cause:** Serverless function error.

**Fix:**
1. Check Vercel CLI terminal for error logs
2. Verify environment variables are correct
3. Check Supabase credentials

### **Error: "Module not found"**

**Cause:** Missing dependencies.

**Fix:**
```bash
npm install
```

### **Port Already in Use**

**Fix:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
vercel dev --listen 3001
```

---

## 📝 Summary

✅ **To test email sending locally:**
1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Pull env vars: `vercel env pull .env.local`
5. Run dev server: `vercel dev`
6. Test at `http://localhost:3000`

✅ **For production:**
- Email sending already works on your deployed Vercel app
- No additional setup needed

✅ **For quick testing without email:**
- Use any HTTP server
- Email features will show errors (expected)

