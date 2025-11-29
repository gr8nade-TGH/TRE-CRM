# Vercel Environment Variables Setup

## 🔧 Required Environment Variables

You need to add the following environment variables to your Vercel project for the Documenso webhook to work properly.

---

## 📋 Steps to Add Environment Variables

### 1. Go to Vercel Dashboard
1. Navigate to https://vercel.com/dashboard
2. Select your project: **TRE-CRM**
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### 2. Add Documenso Variables

Add these two new environment variables:

#### Variable 1: DOCUMENSO_API_KEY
- **Name:** `DOCUMENSO_API_KEY`
- **Value:** `api_rwt8w5uvjer73laz`
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

#### Variable 2: DOCUMENSO_WEBHOOK_SECRET
- **Name:** `DOCUMENSO_WEBHOOK_SECRET`
- **Value:** `bayouW00DZ!2`
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

### 3. Verify Existing Variables

Make sure these existing variables are also set (they should already be there):

- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `RESEND_API_KEY`

---

## 🚀 Redeploy After Adding Variables

After adding the environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Confirm the redeployment

**OR** just push a new commit and Vercel will auto-deploy with the new environment variables.

---

## ✅ Verify Webhook is Working

After deployment, you can test the webhook:

1. Go to Documenso dashboard
2. Navigate to **Webhooks** section
3. Click on your webhook: `https://tre-crm.vercel.app/api/webhooks/documenso`
4. Click **Test Webhook** (if available)
5. Check Vercel logs to see if the webhook was received

### Check Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click on **Deployments** tab
3. Click on the latest deployment
4. Click on **Functions** tab
5. Find `/api/webhooks/documenso`
6. Click to view logs

You should see logs like:
```
Documenso webhook received
Event type: document.signed
Document signed: { documentId: '...', signerName: '...', signerEmail: '...' }
Found lease confirmation: ...
Lease confirmation updated to signed
Activity logged successfully
```

---

## 🔒 Security Notes

- ✅ Environment variables are encrypted by Vercel
- ✅ Never commit `.env` file to git (it's in `.gitignore`)
- ✅ Use `.env.example` for documentation only
- ✅ Webhook signature verification is enabled for security
- ✅ Only Documenso can trigger the webhook with valid signature

---

## 📚 Reference

- **Vercel Docs:** https://vercel.com/docs/projects/environment-variables
- **Documenso Webhook Docs:** https://docs.documenso.com/webhooks
- **Webhook URL:** `https://tre-crm.vercel.app/api/webhooks/documenso`
- **Webhook ID:** `cmjithd7o1mu4ad1wfc2aqhjn`

---

## ✅ Checklist

- [ ] Add `DOCUMENSO_API_KEY` to Vercel
- [ ] Add `DOCUMENSO_WEBHOOK_SECRET` to Vercel
- [ ] Redeploy or push new commit
- [ ] Test webhook from Documenso dashboard
- [ ] Verify logs in Vercel Functions
- [ ] Test full flow: Prepare Lease → Send for Signature → Sign → Webhook updates status

