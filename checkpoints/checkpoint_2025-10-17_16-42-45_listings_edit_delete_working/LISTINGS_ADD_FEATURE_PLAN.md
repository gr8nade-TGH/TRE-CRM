# Add Listing Feature - Implementation Plan

## 📋 Overview
Adding comprehensive "Add Listing" functionality with notes support to the TRE CRM Listings page.

---

## ✅ Completed So Far

### 1. **Database Migration Created** ✅
- **File:** `migrations/002_properties_and_notes.sql`
- **File:** `run-properties-migration.html` (migration runner)
- **Changes:**
  - Add columns to `properties` table: `community_name`, `street_address`, `city`, `zip_code`, `bed_range`, `bath_range`, `rent_range_min`, `rent_range_max`, `commission_pct`, `amenities`, `is_pumi`, `last_updated`, `contact_email`, `leasing_link`, `photos`, `map_lat`, `map_lng`, `created_by`, `updated_at`
  - Create `property_notes` table with columns: `id`, `property_id`, `content`, `author_id`, `author_name`, `created_at`, `updated_at`
  - Set up RLS policies for both tables
  - Create indexes for performance
  - Enable realtime for property_notes

### 2. **UI Components Added** ✅
- **Add Listing Button:** Added to listings filters section
- **Add Listing Modal:** Comprehensive form with all required fields:
  - 🏘 Basic Info: Community Name, Street Address, City/Market, Zip Code
  - 🛏 Unit Details: Bed Range, Bath Range, Rent Min/Max, Commission %, Amenities
  - 💰 Additional Info: PUMI Status, Last Updated, Contact Email, Leasing Link
  - 🗺 Map Location: Latitude, Longitude (with auto-geocode tip)
  - 📝 Notes: Optional note field
- **Property Notes Modal:** For viewing and adding notes to existing listings
- **Notes Column:** Added to listings table

### 3. **Supabase API Functions Added** ✅
- **File:** `src/api/supabase-api.js`
- **Functions:**
  - `createProperty(propertyData)` - Create new listing
  - `updateProperty(id, propertyData)` - Update existing listing
  - `deleteProperty(id)` - Delete listing
  - `getPropertyNotes(propertyId)` - Get all notes for a property
  - `createPropertyNote(noteData)` - Add note to property
  - `deletePropertyNote(noteId)` - Delete a note

---

## 🚧 Next Steps (To Be Implemented)

### Step 1: Run Database Migration
**Action:** Open `run-properties-migration.html` in browser and click "Run Migration"
**Alternative:** Copy SQL from `migrations/002_properties_and_notes.sql` and run in Supabase SQL Editor
**Status:** ⏳ PENDING

### Step 2: Add Event Listeners in script.js
**Location:** In the DOMContentLoaded event listener section
**Code to add:**
```javascript
// Add Listing button
const addListingBtn = document.getElementById('addListingBtn');
if (addListingBtn) {
    addListingBtn.addEventListener('click', openAddListingModal);
}

// Add Listing modal controls
const closeAddListing = document.getElementById('closeAddListing');
const cancelAddListing = document.getElementById('cancelAddListing');
const saveListingBtn = document.getElementById('saveListingBtn');

if (closeAddListing) {
    closeAddListing.addEventListener('click', closeAddListingModal);
}
if (cancelAddListing) {
    cancelAddListing.addEventListener('click', closeAddListingModal);
}
if (saveListingBtn) {
    saveListingBtn.addEventListener('click', createListing);
}

// Property Notes modal controls
const closePropertyNotes = document.getElementById('closePropertyNotes');
const cancelPropertyNotes = document.getElementById('cancelPropertyNotes');
const savePropertyNoteBtn = document.getElementById('savePropertyNoteBtn');

if (closePropertyNotes) {
    closePropertyNotes.addEventListener('click', closePropertyNotesModal);
}
if (cancelPropertyNotes) {
    cancelPropertyNotes.addEventListener('click', closePropertyNotesModal);
}
if (savePropertyNoteBtn) {
    savePropertyNoteBtn.addEventListener('click', addPropertyNote);
}
```

### Step 3: Implement Modal Functions
**Functions to add:**

```javascript
// Open Add Listing Modal
function openAddListingModal() {
    const modal = document.getElementById('addListingModal');
    const form = document.getElementById('addListingForm');
    
    // Reset form
    form.reset();
    
    // Set default date to today
    document.getElementById('listingLastUpdated').valueAsDate = new Date();
    
    showModal(modal);
}

// Close Add Listing Modal
function closeAddListingModal() {
    const modal = document.getElementById('addListingModal');
    hideModal(modal);
}

// Create Listing
async function createListing() {
    try {
        // Get form values
        const communityName = document.getElementById('listingCommunityName').value.trim();
        const streetAddress = document.getElementById('listingStreetAddress').value.trim();
        const market = document.getElementById('listingMarket').value;
        const zipCode = document.getElementById('listingZipCode').value.trim();
        const bedRange = document.getElementById('listingBedRange').value.trim();
        const bathRange = document.getElementById('listingBathRange').value.trim();
        const rentMin = parseInt(document.getElementById('listingRentMin').value);
        const rentMax = parseInt(document.getElementById('listingRentMax').value);
        const commission = parseFloat(document.getElementById('listingCommission').value);
        const amenitiesInput = document.getElementById('listingAmenities').value.trim();
        const isPUMI = document.getElementById('listingIsPUMI').checked;
        const lastUpdated = document.getElementById('listingLastUpdated').value;
        const contactEmail = document.getElementById('listingContactEmail').value.trim();
        const leasingLink = document.getElementById('listingLeasingLink').value.trim();
        const mapLat = document.getElementById('listingMapLat').value;
        const mapLng = document.getElementById('listingMapLng').value;
        const noteContent = document.getElementById('listingNotes').value.trim();

        // Validation
        if (!communityName || !streetAddress || !market || !zipCode || !bedRange || !bathRange || !rentMin || !rentMax || !commission) {
            toast('Please fill in all required fields', 'error');
            return;
        }

        if (rentMin >= rentMax) {
            toast('Rent Max must be greater than Rent Min', 'error');
            return;
        }

        // Parse amenities
        const amenities = amenitiesInput ? amenitiesInput.split(',').map(a => a.trim()).filter(a => a) : [];

        // Create property data
        const propertyData = {
            id: `prop_${Date.now()}`,
            community_name: communityName,
            name: communityName, // For backward compatibility
            street_address: streetAddress,
            address: streetAddress, // For backward compatibility
            city: market, // Using market as city for now
            market: market,
            zip_code: zipCode,
            bed_range: bedRange,
            bath_range: bathRange,
            rent_range_min: rentMin,
            rent_range_max: rentMax,
            rent_min: rentMin, // For backward compatibility
            rent_max: rentMax, // For backward compatibility
            commission_pct: commission,
            amenities: amenities,
            is_pumi: isPUMI,
            isPUMI: isPUMI, // For backward compatibility
            last_updated: lastUpdated || new Date().toISOString(),
            contact_email: contactEmail || null,
            leasing_link: leasingLink || null,
            map_lat: mapLat ? parseFloat(mapLat) : null,
            map_lng: mapLng ? parseFloat(mapLng) : null,
            lat: mapLat ? parseFloat(mapLat) : null, // For backward compatibility
            lng: mapLng ? parseFloat(mapLng) : null, // For backward compatibility
            created_by: state.userId,
            created_at: new Date().toISOString()
        };

        console.log('Creating property:', propertyData);

        // Create property in Supabase
        const newProperty = await SupabaseAPI.createProperty(propertyData);
        console.log('✅ Property created:', newProperty);

        // If there's a note, create it
        if (noteContent) {
            const noteData = {
                property_id: newProperty.id,
                content: noteContent,
                author_id: state.userId,
                author_name: state.userName || 'Unknown'
            };
            await SupabaseAPI.createPropertyNote(noteData);
            console.log('✅ Property note created');
        }

        toast('Listing created successfully!', 'success');
        closeAddListingModal();
        
        // Refresh listings
        await renderListings();
    } catch (error) {
        console.error('❌ Error creating listing:', error);
        toast(`Error creating listing: ${error.message}`, 'error');
    }
}
```

### Step 4: Implement Property Notes Functions

```javascript
// Global variable to track current property for notes
let currentPropertyForNotes = null;

// Open Property Notes Modal
async function openPropertyNotesModal(propertyId, propertyName) {
    currentPropertyForNotes = propertyId;
    
    const modal = document.getElementById('propertyNotesModal');
    const modalHeader = modal.querySelector('.modal-header h3');
    modalHeader.textContent = `📝 Notes: ${propertyName}`;
    
    // Clear note input
    document.getElementById('newPropertyNote').value = '';
    
    // Load and display notes
    await loadPropertyNotes(propertyId);
    
    showModal(modal);
}

// Close Property Notes Modal
function closePropertyNotesModal() {
    const modal = document.getElementById('propertyNotesModal');
    hideModal(modal);
    currentPropertyForNotes = null;
}

// Load Property Notes
async function loadPropertyNotes(propertyId) {
    try {
        const notes = await SupabaseAPI.getPropertyNotes(propertyId);
        const notesContent = document.getElementById('propertyNotesContent');
        
        if (notes.length === 0) {
            notesContent.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No notes yet. Add one below!</p>';
            return;
        }
        
        notesContent.innerHTML = notes.map(note => `
            <div class="note-item" style="border-bottom: 1px solid #e2e8f0; padding: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <strong style="color: #1e293b;">${note.author_name}</strong>
                        <span style="color: #64748b; font-size: 13px; margin-left: 10px;">
                            ${formatDate(note.created_at)}
                        </span>
                    </div>
                </div>
                <div style="color: #475569; line-height: 1.6;">
                    ${note.content}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading property notes:', error);
        toast('Error loading notes', 'error');
    }
}

// Add Property Note
async function addPropertyNote() {
    if (!currentPropertyForNotes) {
        toast('No property selected', 'error');
        return;
    }
    
    const noteContent = document.getElementById('newPropertyNote').value.trim();
    
    if (!noteContent) {
        toast('Please enter a note', 'error');
        return;
    }
    
    try {
        const noteData = {
            property_id: currentPropertyForNotes,
            content: noteContent,
            author_id: state.userId,
            author_name: state.userName || 'Unknown'
        };
        
        await SupabaseAPI.createPropertyNote(noteData);
        toast('Note added successfully!', 'success');
        
        // Clear input
        document.getElementById('newPropertyNote').value = '';
        
        // Reload notes
        await loadPropertyNotes(currentPropertyForNotes);
        
        // Refresh listings to update note icon
        await renderListings();
    } catch (error) {
        console.error('Error adding note:', error);
        toast(`Error adding note: ${error.message}`, 'error');
    }
}
```

### Step 5: Update renderListings Function
**Changes needed:**
1. Fetch properties from Supabase instead of mockProperties
2. Fetch property notes count for each property
3. Add notes icon column with yellow icon when notes exist
4. Make notes icon clickable to open notes modal

```javascript
// Update renderListings to use real data
async function renderListings() {
    const tbody = document.getElementById('listingsTbody');
    if (!tbody) {
        console.error('listingsTbody not found!');
        return;
    }
    
    try {
        // Fetch properties from Supabase
        const properties = await SupabaseAPI.getProperties({
            search: state.search,
            market: state.listingsFilters.market,
            minPrice: state.listingsFilters.minPrice,
            maxPrice: state.listingsFilters.maxPrice,
            beds: state.listingsFilters.beds
        });
        
        // Fetch notes count for each property
        const propertiesWithNotes = await Promise.all(
            properties.map(async (prop) => {
                const notes = await SupabaseAPI.getPropertyNotes(prop.id);
                return { ...prop, notesCount: notes.length };
            })
        );
        
        // Apply filters and sorting (existing code)
        let filtered = propertiesWithNotes;
        
        // ... existing filter and sort logic ...
        
        // Render rows with notes column
        tbody.innerHTML = '';
        filtered.forEach((prop) => {
            const tr = document.createElement('tr');
            tr.dataset.propertyId = prop.id;
            
            if (prop.is_pumi || prop.isPUMI) {
                tr.classList.add('pumi-listing');
            }
            
            tr.innerHTML = `
                <td><input type="checkbox" class="listing-checkbox" data-listing-id="${prop.id}"></td>
                <td>
                    <div class="lead-name">
                        ${prop.community_name || prop.name}
                        ${(prop.is_pumi || prop.isPUMI) ? '<span class="pumi-label">PUMI</span>' : ''}
                    </div>
                    <div class="subtle mono">${prop.street_address || prop.address}</div>
                    <div class="community-details">
                        <span class="market-info">${prop.market}</span>
                        <span class="beds-baths">${prop.bed_range || `${prop.beds_min}-${prop.beds_max} bed`}</span>
                    </div>
                </td>
                <td>$${prop.rent_range_min || prop.rent_min} - $${prop.rent_range_max || prop.rent_max}</td>
                <td>${prop.commission_pct || 0}%</td>
                <td style="text-align: center;">
                    ${prop.notesCount > 0 ? `
                        <span class="notes-icon" data-property-id="${prop.id}" data-property-name="${prop.community_name || prop.name}" style="cursor: pointer; font-size: 20px;" title="${prop.notesCount} note(s)">
                            📝
                        </span>
                    ` : ''}
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Add click listeners for notes icons
        document.querySelectorAll('.notes-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const propertyId = e.target.dataset.propertyId;
                const propertyName = e.target.dataset.propertyName;
                openPropertyNotesModal(propertyId, propertyName);
            });
        });
        
    } catch (error) {
        console.error('Error rendering listings:', error);
        toast('Error loading listings', 'error');
    }
}
```

---

## 🎨 CSS Styling (Optional)

Add to `styles.css`:

```css
/* Notes icon styling */
.notes-icon {
    display: inline-block;
    transition: transform 0.2s;
}

.notes-icon:hover {
    transform: scale(1.2);
}

/* Note item styling */
.note-item {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Form row styling for modal */
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}
```

---

## 🧪 Testing Checklist

- [ ] Run database migration successfully
- [ ] Click "Add Listing" button opens modal
- [ ] Fill out form and save creates listing in Supabase
- [ ] New listing appears in table immediately
- [ ] Adding note during creation saves note
- [ ] Notes icon (📝) appears for listings with notes
- [ ] Clicking notes icon opens notes modal
- [ ] Notes modal shows all notes with timestamps and authors
- [ ] Adding new note from modal works
- [ ] New note appears in list immediately
- [ ] All users can see the new listing
- [ ] PUMI checkbox works correctly
- [ ] Map coordinates save correctly
- [ ] Amenities save as array
- [ ] Form validation works (required fields)

---

## 📝 Notes

- **Backward Compatibility:** The code includes both old field names (name, address, rent_min, rent_max, isPUMI) and new field names (community_name, street_address, rent_range_min, rent_range_max, is_pumi) to ensure compatibility with existing mock data
- **Auto-Geocoding:** The form has a tip about auto-geocoding, but actual implementation would require a geocoding service (Google Maps API, Mapbox, etc.)
- **Photo Upload:** The migration includes a `photos` column (TEXT[]) but the UI doesn't implement photo upload yet - this can be added later
- **Real-time Updates:** Property notes table has realtime enabled, so notes could update live across users (requires additional implementation)

---

## 🚀 Deployment Steps

1. Run database migration
2. Add all JavaScript functions to script.js
3. Test locally
4. Commit and push to GitHub
5. Vercel will auto-deploy
6. Test on production

---

**Status:** Ready for implementation! 🎯

