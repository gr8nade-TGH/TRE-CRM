# Browserless.io Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Sign Up for Browserless.io
1. Go to https://www.browserless.io/
2. Click "Sign Up" or "Start Free Trial"
3. Create an account (free tier: 6 hours/month)

### Step 2: Get Your API Token
1. After signing in, go to your Dashboard
2. Copy your API token (looks like: `abc123def456...`)

### Step 3: Add Token to Vercel
1. Go to https://vercel.com/dashboard
2. Select your TRE-CRM project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `BROWSERLESS_TOKEN`
   - **Value:** `[paste your token here]`
   - **Environment:** Production, Preview, Development (check all)
5. Click **Save**

### Step 4: Deploy
The code is already updated! Just push to deploy:
```bash
git add -A
git commit -m "feat: Integrate Browserless.io for PDF generation"
git push origin main
```

### Step 5: Test
1. Wait 2-3 minutes for deployment
2. Go to your app: https://tre-crm.vercel.app
3. Navigate to Interactive PDF form
4. Click "Save Draft"
5. Click "Preview PDF"
6. **IT SHOULD WORK!** 🎉

---

## 📊 Browserless Free Tier

- **6 hours/month** of browser time
- **Unlimited** API calls (within time limit)
- Each PDF generation takes ~2-5 seconds
- **Estimate:** ~4,000-7,000 PDFs per month on free tier

---

## 💰 Pricing (if you need more)

- **Free:** 6 hours/month
- **Starter:** $29/month - 40 hours (~48,000 PDFs)
- **Professional:** $79/month - 120 hours (~144,000 PDFs)

---

## ✅ Benefits

1. ✅ **No more Chromium errors** - Browserless handles it
2. ✅ **Fast & reliable** - Professional infrastructure
3. ✅ **Scalable** - Handles traffic spikes
4. ✅ **Your HTML template works perfectly** - No code changes needed
5. ✅ **Works with Documenso** - Same Puppeteer API

---

## 🔧 How It Works

Instead of running Chrome on Vercel (which fails), we:
1. Connect to Browserless's hosted Chrome instance
2. Send our HTML to their browser
3. Generate PDF on their servers
4. Return PDF to user

**Result:** Reliable, fast, professional PDF generation! 🚀

