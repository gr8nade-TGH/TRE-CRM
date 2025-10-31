# Agent Profile Enhancement Setup Guide

This guide explains the new agent profile customization features and how to set them up.

---

## 🎯 Overview

The agent profile enhancement adds the following features to the TRE CRM:

1. **Headshot Upload** - Agents can upload a profile photo
2. **Custom Bio** - Agents can write a personalized bio for their landing page
3. **Social Media Links** - Agents can add Facebook, Instagram, and X (Twitter) links
4. **Enhanced Landing Pages** - Landing pages now display headshots, custom bios, and social media icons

---

## 📋 Setup Steps

### **Step 1: Run Database Migration** 🔴 REQUIRED

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `migrations/042_add_agent_profile_fields.sql`
3. Click **Run**
4. ✅ This adds the following columns to the `users` table:
   - `headshot_url` (TEXT) - URL to agent headshot stored in Supabase Storage
   - `bio` (TEXT) - Custom bio for landing pages
   - `facebook_url` (TEXT) - Facebook profile URL
   - `instagram_url` (TEXT) - Instagram profile URL
   - `x_url` (TEXT) - X/Twitter profile URL

---

### **Step 2: Create Supabase Storage Bucket** 🔴 REQUIRED

1. Open **Supabase Dashboard** → **Storage**
2. Click **New Bucket**
3. Configure the bucket:
   - **Name:** `agent-assets`
   - **Public:** ✅ Yes (checked)
   - **File size limit:** 2MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
4. Click **Create Bucket**

**Bucket Policies:**

After creating the bucket, set up the following policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload agent assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-assets');

-- Allow public read access to all files
CREATE POLICY "Public read access to agent assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-assets');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-assets' AND auth.uid()::text = owner);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-assets' AND auth.uid()::text = owner);
```

---

### **Step 3: Deploy Updated Code** 🔴 REQUIRED

The following files have been updated and need to be deployed:

**Frontend Files:**
- `index.html` - Updated Add Agent modal with new fields
- `src/events/dom-event-listeners.js` - Added event handlers for image upload and profile fields
- `landing.html` - Enhanced landing page to display headshot, bio, and social links

**Backend Files:**
- `api/create-user.js` - Updated to save agent profile fields to database

**Migration Files:**
- `migrations/042_add_agent_profile_fields.sql` - Database schema update

---

## 🎨 Features

### **1. Add Agent Modal Enhancements**

When adding or editing an agent, the modal now includes:

- **Headshot Upload:**
  - File input with image preview
  - Accepts JPG, PNG, WebP formats
  - Max file size: 2MB
  - Recommended size: 400x400px
  - Real-time preview before upload

- **Bio Field:**
  - Textarea with 500 character limit
  - Character counter
  - Optional field (falls back to default bio if not provided)

- **Social Media Links:**
  - Facebook URL (optional)
  - Instagram URL (optional)
  - X/Twitter URL (optional)
  - URL validation

**Note:** These fields only appear when the role is set to "Agent"

---

### **2. Landing Page Enhancements**

Agent landing pages now display:

- **Headshot Photo:**
  - Circular profile photo if uploaded
  - Falls back to initial letter if no photo
  - Responsive sizing (150px desktop, 120px mobile)

- **Custom Bio:**
  - Displays agent's custom bio if provided
  - Falls back to default bio if not provided
  - Default: "Hi! I'm here to help you find the perfect apartment in Texas..."

- **Social Media Icons:**
  - Displays icons for Facebook, Instagram, and X (Twitter)
  - Only shows icons for links that are provided
  - Hover effects with brand color
  - Opens in new tab with security attributes

---

## 📝 Usage Instructions

### **For Admins/Managers:**

1. Navigate to **Agents** page
2. Click **+ Add Agent** button
3. Fill in required fields (Name, Email, Password)
4. **Optional:** Upload a headshot photo
5. **Optional:** Write a custom bio (max 500 characters)
6. **Optional:** Add social media profile URLs
7. Click **Save User**

### **For Agents:**

Once your profile is set up, your landing page will automatically display:
- Your headshot (if uploaded)
- Your custom bio (if provided)
- Your social media links (if provided)

**Landing Page URL Format:**
```
https://tre-crm.vercel.app/landing/your-name
```

Example: `https://tre-crm.vercel.app/landing/john-smith`

---

## 🔧 Technical Details

### **Image Upload Flow:**

1. User selects image file in Add Agent modal
2. Client-side validation:
   - File size check (max 2MB)
   - File type check (JPG, PNG, WebP only)
3. Image preview displayed immediately
4. On save, image is uploaded to Supabase Storage bucket `agent-assets`
5. Public URL is generated and stored in `users.headshot_url`
6. Landing page fetches and displays the image

### **Database Schema:**

```sql
-- users table (updated)
ALTER TABLE public.users 
ADD COLUMN headshot_url TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN facebook_url TEXT,
ADD COLUMN instagram_url TEXT,
ADD COLUMN x_url TEXT;
```

### **Storage Structure:**

```
agent-assets/
└── agent-headshots/
    ├── 1698765432_abc123.jpg
    ├── 1698765433_def456.png
    └── 1698765434_ghi789.webp
```

Files are named with timestamp + random string to prevent collisions.

---

## 🎯 Best Practices

### **For Headshot Photos:**

- ✅ Use professional, high-quality photos
- ✅ Ensure good lighting and clear face visibility
- ✅ Use square aspect ratio (400x400px recommended)
- ✅ Keep file size under 500KB for faster loading
- ❌ Avoid blurry or low-resolution images
- ❌ Avoid group photos or photos with distracting backgrounds

### **For Bio Content:**

- ✅ Keep it concise and professional
- ✅ Highlight your experience and expertise
- ✅ Mention how you can help leads
- ✅ Use a friendly, approachable tone
- ❌ Avoid overly long paragraphs
- ❌ Avoid jargon or technical terms

### **For Social Media Links:**

- ✅ Use full URLs (e.g., `https://facebook.com/yourprofile`)
- ✅ Ensure profiles are professional and public
- ✅ Keep profiles active and up-to-date
- ❌ Don't use shortened URLs
- ❌ Don't link to private or inactive profiles

---

## 🐛 Troubleshooting

### **Image Upload Fails:**

1. Check file size (must be < 2MB)
2. Check file format (must be JPG, PNG, or WebP)
3. Verify `agent-assets` bucket exists in Supabase Storage
4. Check bucket policies allow authenticated uploads
5. Check browser console for error messages

### **Image Doesn't Display on Landing Page:**

1. Verify `headshot_url` is saved in database
2. Check if URL is publicly accessible
3. Verify bucket is set to public
4. Check browser console for CORS errors
5. Try opening the image URL directly in browser

### **Social Media Icons Don't Appear:**

1. Verify URLs are saved in database
2. Check that URLs are valid (start with `http://` or `https://`)
3. Inspect element to see if links are present but hidden
4. Check browser console for JavaScript errors

---

## 📊 Testing Checklist

- [ ] Database migration runs successfully
- [ ] `agent-assets` storage bucket created
- [ ] Bucket policies configured correctly
- [ ] Add Agent modal shows profile fields when role is "Agent"
- [ ] Image upload works and shows preview
- [ ] File size validation works (rejects files > 2MB)
- [ ] File type validation works (rejects non-image files)
- [ ] Bio character counter works
- [ ] Social media URL validation works
- [ ] Agent creation saves all profile fields to database
- [ ] Landing page displays headshot correctly
- [ ] Landing page displays custom bio (or default if not provided)
- [ ] Landing page displays social media icons (only for provided links)
- [ ] Social media links open in new tab
- [ ] Mobile responsive design works correctly

---

## 🚀 Next Steps

After setup is complete:

1. **Test with a sample agent:**
   - Create a test agent with all profile fields filled
   - Upload a test headshot
   - Verify landing page displays correctly

2. **Update existing agents:**
   - Existing agents can be edited to add profile information
   - Navigate to Agents page → Click agent → Edit → Add profile fields

3. **Share landing page URLs:**
   - Each agent's landing page URL can be found in the Agents table
   - Click "View Page" or "Copy Link" buttons

---

## 📞 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Check Supabase logs for backend errors
3. Verify all setup steps were completed
4. Review the troubleshooting section above

---

**Last Updated:** 2025-10-31
**Version:** 1.0.0

