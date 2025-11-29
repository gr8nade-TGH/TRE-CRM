# Documenso E-Signature Integration Setup

## ✅ Account Created
- **API Token Name:** TRE_DOCUMENSO
- **API Key:** `api_rwt8w5uvjer73laz`

## ✅ Webhook Created
- **Webhook URL:** `https://tre-crm.vercel.app/api/webhooks/documenso`
- **Webhook ID:** `cmjithd7o1mu4ad1wfc2aqhjn`
- **Status:** Enabled
- **Listening to:** 2 Events
- **Secret Key:** `bayouW00DZ!2`

---

## 🔧 Webhook Configuration

### Webhook URL
You need to create a webhook endpoint that Documenso will call when documents are signed.

**Recommended URL:** `https://tre-crm.vercel.app/api/webhooks/documenso`

### Webhook Setup in Documenso Dashboard

1. **Webhook URL:** `https://tre-crm.vercel.app/api/webhooks/documenso`
2. **Enabled:** ✅ Yes
3. **Triggers:** Select these events:
   - `document.signed` - When a document is fully signed
   - `document.completed` - When all recipients have signed
   - `document.declined` - If a recipient declines to sign (optional)
4. **Secret:** Generate a secret key (Documenso will provide this)
   - This secret is used to verify that webhook requests are actually from Documenso
   - Store this secret securely - you'll need it to validate webhook signatures

---

## 📋 Next Steps

### 1. Create Vercel Serverless Function for Webhook

Create file: `api/webhooks/documenso.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const signature = req.headers['x-documenso-signature'];
    const webhookSecret = process.env.DOCUMENSO_WEBHOOK_SECRET;
    
    // TODO: Implement signature verification
    // const isValid = verifySignature(req.body, signature, webhookSecret);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const event = req.body;
    console.log('Documenso webhook received:', event);

    // Handle different event types
    if (event.type === 'document.signed' || event.type === 'document.completed') {
      const documentId = event.data.documentId;
      
      // Find lease confirmation by documenso_document_id
      const { data: leaseConfirmation, error: findError } = await supabase
        .from('lease_confirmations')
        .select('*')
        .eq('documenso_document_id', documentId)
        .single();

      if (findError || !leaseConfirmation) {
        console.error('Lease confirmation not found for document:', documentId);
        return res.status(404).json({ error: 'Lease confirmation not found' });
      }

      // Update status to signed
      const { error: updateError } = await supabase
        .from('lease_confirmations')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signed_by_name: event.data.signerName || null,
          signed_by_email: event.data.signerEmail || null,
          documenso_pdf_url: event.data.documentUrl || null
        })
        .eq('id', leaseConfirmation.id);

      if (updateError) {
        console.error('Error updating lease confirmation:', updateError);
        return res.status(500).json({ error: 'Failed to update lease confirmation' });
      }

      // Log activity
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leaseConfirmation.lead_id,
          activity_type: 'lease_signed',
          description: 'Lease confirmation signed by property contact',
          metadata: {
            document_id: documentId,
            signed_by: event.data.signerName,
            signed_at: new Date().toISOString()
          }
        });

      console.log('Lease confirmation updated to signed:', leaseConfirmation.id);
      return res.status(200).json({ success: true });
    }

    // Unknown event type
    return res.status(200).json({ success: true, message: 'Event type not handled' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 2. Add Environment Variables

Add to Vercel environment variables:

```
DOCUMENSO_API_KEY=api_rwt8w5uvjer73laz
DOCUMENSO_WEBHOOK_SECRET=<secret from Documenso dashboard>
```

### 3. Test Webhook

After deploying the webhook endpoint:
1. Go to Documenso dashboard
2. Test the webhook with a sample event
3. Check Vercel logs to verify it's working

---

## 🚀 Integration Flow

### When Agent Clicks "Send for Signature"

1. **Generate PDF** from lease confirmation form data
2. **Upload to Documenso** via API
3. **Create signing request** with property contact email
4. **Receive signing URL** from Documenso
5. **Update database:**
   - `status = 'awaiting_signature'`
   - `documenso_document_id = {id}`
   - `documenso_signing_url = {url}`
   - `sent_for_signature_at = NOW()`
6. **Send email** to property contact with signing link

### When Property Contact Signs

1. **Documenso calls webhook** with `document.signed` event
2. **Webhook verifies signature** (security)
3. **Webhook updates database:**
   - `status = 'signed'`
   - `signed_at = NOW()`
   - `signed_by_name = {name}`
   - `signed_by_email = {email}`
4. **Webhook logs activity** (`lease_signed`)
5. **Download signed PDF** from Documenso
6. **Upload to Supabase Storage** (`lease-documents` bucket)
7. **Update `signed_pdf_url`** in database

---

## 📚 Documenso API Documentation

- **API Docs:** https://docs.documenso.com/api
- **Webhook Docs:** https://docs.documenso.com/webhooks
- **Dashboard:** https://app.documenso.com

---

## ⚠️ Security Notes

1. **Always verify webhook signatures** - Don't trust requests without verification
2. **Store API keys in environment variables** - Never commit to git
3. **Use HTTPS only** - Webhook URL must be HTTPS
4. **Validate all input** - Don't trust webhook data blindly
5. **Log all webhook events** - For debugging and audit trail

---

## 🎯 Current Status

- ✅ Documenso account created
- ✅ API token generated
- ⏳ Webhook endpoint needs to be created
- ⏳ Webhook needs to be configured in Documenso dashboard
- ⏳ Environment variables need to be added to Vercel
- ⏳ "Send for Signature" functionality needs to be implemented

