# Quick Reference - Properties & Specials Page

## 🎯 Key Features

### Phone Icon (📞) - Edit Contact Info
- **Location:** Properties & Specials page, Actions column
- **Function:** Opens "Update Property Contact Info" modal
- **Fields:**
  - Property (dropdown, auto-selected, disabled)
  - **Address** ← NEW! Syncs with Listings page
  - Contact Name
  - Contact Email
  - Contact Phone
  - Office Hours
  - Notes
- **Save:** Updates all properties with same community_name
- **Activity Log:** Logs contact_info_updated activity

### Fire Icon (🔥) - Add/Edit Special
- **Location:** Properties & Specials page, Actions column
- **States:**
  - "Add Special" - No active specials for property
  - "Edit Special" - Has active (non-expired) specials
- **Function:** Opens Add/Edit Special modal
- **RLS:** All authenticated users can add/edit/delete specials

---

## 🔄 Address Synchronization

### How It Works

**Properties Page (Contact Info Modal):**
- Single "Address" field
- Format: "123 Main St, San Antonio, TX 78201"
- On save → Parses into separate fields:
  - `street_address` = "123 Main St"
  - `city` = "San Antonio"
  - `state` = "TX"
  - `zip_code` = "78201"

**Listings Page (Edit Property Modal):**
- Separate fields: Street Address, City, State, Zip
- On save → Builds combined address:
  - `address` = "123 Main St, San Antonio, TX 78201"

**Result:** Both pages always show the same address!

---

## 🗄️ Database Schema

### Properties Table
```
- id (uuid, primary key)
- community_name (text)
- address (text) ← Combined address
- street_address (text) ← Separate field
- city (text)
- state (text)
- zip_code (text)
- contact_name (text)
- contact_email (text)
- contact_phone (text)
- office_hours (text)
- contact_notes (text)
- ... (other fields)
```

### Property Activities Table
```
- id (uuid, primary key)
- property_id (uuid, foreign key)
- activity_type (text)
- description (text)
- metadata (jsonb) ← community_name stored here, NOT as column
- performed_by (uuid)
- performed_by_name (text)
- created_at (timestamp)
```

### Specials Table
```
- id (uuid, primary key)
- property_id (uuid, foreign key)
- property_name (text)
- title (text)
- description (text)
- valid_from (date)
- valid_until (date)
- active (boolean)
- ... (other fields)
```

---

## 🔐 RLS Policies (Specials Table)

**Before:** Only MANAGER/SUPER_USER could insert/update/delete
**After:** All authenticated users can insert/update/delete

```sql
-- INSERT
CREATE POLICY "Authenticated users can insert specials" ON public.specials
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE
CREATE POLICY "Authenticated users can update specials" ON public.specials
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DELETE
CREATE POLICY "Authenticated users can delete specials" ON public.specials
FOR DELETE USING (auth.uid() IS NOT NULL);
```

---

## 🔧 Key Functions

### Properties Rendering
**File:** `src/modules/properties/properties-rendering.js`

```javascript
// Edit contact info
editPropertyContact(propertyId, communityName, options)

// Save contact info
savePropertyContact(options)

// Edit special
editSpecial(specialId, options)

// Save edited special
saveEditedSpecial(options)
```

### Supabase API
**File:** `src/api/supabase-api.js`

```javascript
// Update property contact (with address sync)
updatePropertyContact(contactData)

// Update property (from Listings page)
updateProperty(id, propertyData, performedBy, performedByName)

// Log property activity
logPropertyActivity(activityData)

// Create special
createSpecial(specialData)

// Update special
updateSpecial(id, specialData)
```

---

## 🐛 Common Issues & Solutions

### Issue: "renderPropertyContacts is not a function"
**Solution:** Use `renderProperties` instead (merged table)

### Issue: "community_name column not found in property_activities"
**Solution:** Store community_name in metadata JSONB, not as column

### Issue: "row violates row-level security policy for table specials"
**Solution:** Run migration 031_fix_specials_rls.sql

### Issue: Address not syncing between pages
**Solution:** Ensure both `address` and `street_address/city/state/zip_code` are updated

---

## 📝 Code Patterns

### Inline onclick Handlers
```javascript
// In properties-rendering.js
onclick="window.editPropertyContact('${property.id}', '${escapedName}')"

// In script.js
window.editPropertyContact = async function(propertyId, communityName) {
    await Properties.editPropertyContact(propertyId, communityName, { 
        SupabaseAPI, 
        showModal, 
        toast,
        populatePropertyDropdownForContact
    });
};
```

### Dependency Injection
```javascript
// Pass dependencies as options object
await Properties.savePropertyContact({ 
    SupabaseAPI, 
    hideModal, 
    renderProperties, 
    toast 
});
```

### Activity Logging
```javascript
await SupabaseAPI.logPropertyActivity({
    property_id: propertyId,
    activity_type: 'contact_info_updated',
    description: `Contact information updated for ${community_name}`,
    metadata: {
        community_name: community_name,
        address_updated: !!address,
        contact_name,
        contact_email,
        contact_phone
    }
});
```

---

## 🎨 UI Elements

### Modal IDs
- `addPropertyContactModal` - Edit Contact Info
- `addSpecialModal` - Add New Special
- `editSpecialModal` - Edit Existing Special
- `listingEditModal` - Edit Property (Listings page)

### Form IDs
- `addPropertyContactForm` - Contact Info form
- `addSpecialForm` - Add Special form
- `editSpecialForm` - Edit Special form
- `listingEditForm` - Edit Property form

### Key Input IDs (Contact Info)
- `contactPropertySelect` - Property dropdown
- `contactAddress` - Address field ← NEW!
- `contactName` - Contact name
- `contactEmail` - Contact email
- `contactPhone` - Contact phone
- `contactOfficeHours` - Office hours
- `contactNotes` - Notes

---

## 🚀 Testing Commands

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -10

# Check file status
git status

# View changes
git diff

# Create checkpoint
git bundle create checkpoint.bundle --all
```

---

## 📊 Metrics

- **script.js:** 787 lines (down from 6,663 - 88.2% reduction)
- **Modules:** 28 ES6 modules
- **Total extracted:** 4,500+ lines
- **Modularization:** 7 phases complete
- **Integration:** Ongoing

---

**Last Updated:** October 24, 2025, 8:52 PM  
**Status:** ✅ All features working  
**Branch:** feature/page-functions  
**Commit:** 6a4171a

