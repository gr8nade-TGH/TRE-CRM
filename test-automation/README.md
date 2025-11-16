# 🧪 TRE CRM Backend Test Suite

Automated testing suite for TRE CRM backend functionality. Tests the complete lead lifecycle from creation to email delivery without requiring manual UI interaction.

## 🎯 What Gets Tested

### ✅ **Automated Tests (No UI Required)**

1. **Lead Creation**
   - Creates test lead in database
   - Verifies lead data is stored correctly
   - Checks foreign key relationships

2. **Activity Logging**
   - Verifies lead creation activity is logged
   - Checks activity metadata
   - Validates timestamps

3. **Welcome Email**
   - Sends welcome email via API
   - Verifies email is sent to Resend
   - Checks email logging in database
   - Validates email activity logging

4. **Smart Match Email**
   - Fetches smart match properties
   - Sends smart match email
   - Verifies email logging
   - Checks Property Matcher session creation

5. **Progress Tracking**
   - Calculates progress step based on activities
   - Verifies progress bar data
   - Validates activity-based progression

6. **Database Integrity**
   - Checks email templates exist
   - Verifies active properties
   - Validates configuration

## 🚀 Quick Start

### **Option 1: Run via HTML Interface (Easiest)**

1. **Deploy the test files** to your Vercel project:
   ```bash
   git add test-automation/
   git commit -m "Add automated test suite"
   git push origin feature/page-functions
   ```

2. **Open the test page** in your browser:
   ```
   https://tre-crm.vercel.app/test-automation/run-tests.html
   ```

3. **Log in to TRE CRM** in another tab first

4. **Configure your test email** (defaults to tucker.harris@gmail.com)

5. **Click "Run Tests"** and watch the magic happen! ✨

6. **Check the console** (F12) for detailed results

7. **Check your email** for the test emails

---

### **Option 2: Run via Browser Console**

1. **Open TRE CRM** in your browser:
   ```
   https://tre-crm.vercel.app
   ```

2. **Log in** as an agent or manager

3. **Open the browser console** (F12 or right-click > Inspect)

4. **Load the test suite**:
   ```javascript
   const module = await import('/test-automation/backend-test-suite.js');
   window.runBackendTests = module.runBackendTests;
   ```

5. **Run the tests**:
   ```javascript
   await runBackendTests();
   ```

6. **Watch the results** in the console

7. **Check your email** for test emails

---

## 📊 Test Results

The test suite will output detailed results in the console:

```
============================================================
  🚀 TRE CRM AUTOMATED BACKEND TEST SUITE
============================================================

📋 Test Configuration:
   Test Email: tucker.harris@gmail.com
   Test Lead Name: AutoTest Lead
   Cleanup After: false

✅ Logged in as: tucker.harris@gmail.com

============================================================
  TEST 1: Create Test Lead
============================================================

✅ Create Lead: Lead ID: abc-123-def-456

============================================================
  TEST 2: Verify Lead Creation Activity
============================================================

✅ Lead Creation Activity: Activity ID: xyz-789

... (more tests)

============================================================
  📊 TEST SUMMARY
============================================================

✅ Passed: 15
   ✓ Create Lead
   ✓ Lead Creation Activity
   ✓ Get Agent Info
   ✓ Send Welcome Email
   ✓ Welcome Email Logged
   ... (more)

⚠️  Warnings: 1
   ⚠ No Property Matcher session found (this is expected if no properties matched)

📈 Pass Rate: 93.8% (15/16)

📝 Test Lead ID: abc-123-def-456
   View in CRM: https://tre-crm.vercel.app/#/leads
   Check your email (tucker.harris@gmail.com) for test emails!

============================================================
  Tests Complete!
============================================================
```

---

## ⚙️ Configuration

Edit the `TEST_CONFIG` object in `backend-test-suite.js`:

```javascript
const TEST_CONFIG = {
    testEmail: 'your.email@example.com',  // Where to send test emails
    testLeadName: 'AutoTest Lead',         // Name for test lead
    cleanupAfterTests: false,              // Delete test data after tests
};
```

Or configure via the HTML interface.

---

## 🧹 Cleanup

### **Automatic Cleanup**
Set `cleanupAfterTests: true` to automatically delete test data after tests complete.

### **Manual Cleanup**
If you want to keep the test lead for inspection, set `cleanupAfterTests: false`. You can manually delete it later:

```sql
-- In Supabase SQL Editor
DELETE FROM leads WHERE name = 'AutoTest Lead';
```

Or delete from the CRM UI:
1. Go to Leads page
2. Find "AutoTest Lead"
3. Click delete

---

## 📧 Email Testing

The test suite will send **real emails** to your configured test email address:

1. **Welcome Email** - Sent immediately after lead creation
2. **Smart Match Email** - Sent with top 5 matched properties

**Tips:**
- Use the Gmail+ trick: `your.email+test1@gmail.com`
- Check spam folder if emails don't arrive
- Verify sender email is configured in Resend
- Check email logs in Supabase if emails fail

---

## 🐛 Troubleshooting

### **"You must be logged in to run tests!"**
- Make sure you're logged in to TRE CRM first
- Refresh the page and try again

### **"Email API error: 401"**
- Check that RESEND_API_KEY is set in Vercel environment variables
- Verify the API key is valid in Resend dashboard

### **"No active properties found"**
- Add some properties to the CRM first
- Smart Match will fail without properties to match

### **"Email sent activity not logged"**
- This is expected if the email activity trigger is not set up
- Check Supabase for the trigger function

### **Tests fail with "Module not found"**
- Make sure test files are deployed to Vercel
- Check that file paths are correct
- Try hard refresh (Ctrl+Shift+R)

---

## 📝 What's NOT Tested

These require manual UI interaction:

- ❌ Agent landing page form submission
- ❌ Clicking links in emails
- ❌ Property Matcher response submission
- ❌ UI responsiveness and design
- ❌ User interactions (clicks, hovers, etc.)

For these, you'll need to test manually or use a tool like Playwright/Cypress.

---

## 🎯 Success Criteria

A successful test run should have:

- ✅ **Pass rate > 90%**
- ✅ **All critical tests passing** (lead creation, email sending)
- ✅ **Test emails received** in your inbox
- ✅ **Test lead visible** in CRM (if cleanup disabled)
- ✅ **Activities logged** in database

---

## 🚀 Next Steps

After running the automated tests:

1. **Check your email** - Verify emails look good and render correctly
2. **View the test lead** - Go to Leads page and inspect the test lead
3. **Check Documents page** - Verify progress bar shows correct step
4. **Manual testing** - Test the UI interactions that can't be automated
5. **Delete test data** - Clean up when done (if not auto-cleaned)

---

## 💡 Tips

- Run tests after every major backend change
- Use different test emails to avoid confusion
- Keep cleanup disabled during development for inspection
- Enable cleanup in CI/CD pipelines
- Check console for detailed error messages
- Verify emails in multiple email clients (Gmail, Outlook, etc.)

---

**Happy Testing! 🎉**

