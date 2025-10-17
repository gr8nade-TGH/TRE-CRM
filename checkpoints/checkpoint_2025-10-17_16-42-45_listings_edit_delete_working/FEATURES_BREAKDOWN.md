# TRE CRM - Detailed Features Breakdown

## 1. LEADS MANAGEMENT

### Lead Data Model
```javascript
{
  id: 'lead_' + timestamp,
  name: string,
  email: string,
  phone: string,
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation',
  health_status: 'green' | 'yellow' | 'red' | 'closed' | 'lost',
  source: string,
  notes: string,
  preferences: {
    beds: number,
    baths: number,
    budget: number,
    budget_max: number,
    area_of_town: string,
    move_in_date: date,
    credit_history: string,
    lease_term: string,
    desired_neighborhoods: string
  },
  created_at: ISO timestamp,
  updated_at: ISO timestamp,
  agent_id: string
}
```

### Lead Operations
- **Create:** `saveNewLead()` - Validates, checks duplicates, adds to mock data
- **Read:** `renderLeads()` - Displays filtered/sorted leads in table
- **Update:** `editLead()` - Modifies lead details
- **Delete:** `deleteLead()` - Removes lead from system
- **Search:** By name, email, phone
- **Filter:** By status, health, date range
- **Sort:** By name, health_status, submitted_at

### Health Status Calculation
- **Green:** Recent activity, engaged lead
- **Yellow:** Some activity, needs follow-up
- **Red:** Inactive, at risk of loss
- **Closed:** Successfully converted
- **Lost:** No longer interested

### Lead Matching
- Matches leads to listings based on preferences
- Displays "Top Listing Options" in leads table
- Bidirectional matching system

---

## 2. AGENTS MANAGEMENT

### Agent Data Model
```javascript
{
  id: 'agent_' + number,
  name: string,
  email: string,
  phone: string,
  active: boolean,
  hireDate: date,
  licenseNumber: string,
  specialties: string[],
  notes: string
}
```

### Mock Agents (5 samples)
1. **Alex Agent** - Residential, Luxury specialist
2. **Bailey Broker** - Commercial, Investment specialist
3. **Casey Consultant** - Rental, Student Housing specialist
4. **Dana Director** - Luxury, New Construction specialist
5. **Evan Expert** - Residential (currently on leave)

### Agent Operations
- **View Profiles:** Full agent details with specialties
- **Edit:** Update agent information
- **Assign Leads:** Link leads to agents
- **Track Performance:** View agent's leads and listings
- **Status Management:** Active/inactive toggle

---

## 3. LISTINGS MANAGEMENT

### Listing Data Model
```javascript
{
  id: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  price: number,
  bedrooms: number,
  bathrooms: number,
  sqft: number,
  amenities: string[],
  commission_rate: number,
  market: string,
  coordinates: { lat, lng },
  agent_id: string,
  status: 'available' | 'pending' | 'sold'
}
```

### Mapbox Integration
- **Map Initialization:** `initMap()` - Creates Mapbox GL instance
- **Markers:** Dynamic property markers on map
- **Clustering:** Groups nearby properties
- **Filtering:** By market, price, beds, commission, amenities
- **Selection:** Click marker to view property details
- **Zoom/Pan:** Interactive map navigation

### Listing Operations
- **Display:** Table and map views
- **Filter:** Multiple filter criteria
- **Search:** By address, city, amenities
- **Sort:** By price, beds, commission
- **Match to Leads:** Show relevant listings for lead preferences

---

## 4. SPECIALS/PROMOTIONS

### Special Data Model
```javascript
{
  property_name: string,
  current_special: string,
  commission_rate: number,
  expiration_date: date,
  agent_id: string,
  agent_name: string
}
```

### Special Operations
- **Create:** `saveNewSpecial()` - Add new promotion
- **Validation:** Expiration date must be future date
- **Display:** Table view with all active specials
- **Filter:** By agent, property, expiration date
- **Expire:** Automatic removal of expired specials

---

## 5. DOCUMENTS MANAGEMENT

### Document Types
- Contracts
- Lease agreements
- Property disclosures
- Lead forms
- Agent certifications

### Role-Based Views
- **Manager:** All documents across all agents
- **Agent:** Only their assigned documents

### Document Operations
- **Upload:** Add new documents
- **Organize:** By type, date, agent
- **Download:** Retrieve documents
- **Share:** With team members
- **Archive:** Old documents

---

## 6. AUTHENTICATION & AUTHORIZATION

### Authentication Flow
1. User visits app
2. Check for existing session in localStorage
3. If session exists → Show main app
4. If no session → Show login portal
5. User logs in/registers
6. Session stored in localStorage
7. User metadata includes role

### Roles & Permissions

| Feature | Agent | Manager | Super User |
|---------|-------|---------|-----------|
| View Leads | Own only | All | All |
| Create Lead | Yes | Yes | Yes |
| View Agents | No | Yes | Yes |
| View Listings | Yes | Yes | Yes |
| View Documents | Own only | All | All |
| Admin Panel | No | No | Yes |
| Bug Tracking | No | No | Yes |
| User Management | No | No | Yes |

### Session Management
- **Storage:** localStorage key `tre_session`
- **Data:** User object, access token, expiration
- **Persistence:** Survives page refresh
- **Logout:** Clears session from localStorage

---

## 7. ADMIN PANEL (Super User Only)

### User Management
- **Create Users:** Add new team members
- **Edit Users:** Update user information
- **Delete Users:** Remove users from system
- **Change Password:** Reset user passwords
- **Assign Roles:** Set user role (agent, manager, super_user)

### System Configuration
- **Settings:** Global app settings
- **Banners:** Public messaging
- **Integrations:** Third-party service setup

---

## 8. BUG TRACKING (Super User Only)

### Bug Operations
- **Report:** Log new bugs with details
- **Track:** Monitor bug status
- **Assign:** Assign bugs to team members
- **Resolve:** Mark bugs as fixed
- **Archive:** Store resolved bugs

---

## 9. ROUTING SYSTEM

### Hash-Based Routes
```
#/leads      → Leads management view
#/agents     → Agents management view
#/listings   → Listings with map view
#/specials   → Promotions view
#/documents  → Documents management view
#/admin      → Admin panel (super_user only)
#/bugs       → Bug tracking (super_user only)
```

### Route Handler
- `window.route()` - Main routing function
- `hashchange` event listener - Detects route changes
- Dynamic view switching based on hash
- Role-based view visibility

---

## 10. UI/UX FEATURES

### Modals
- Add Lead Modal
- Add Special Modal
- Edit forms
- Confirmation dialogs

### Tables
- Sortable columns
- Pagination (10 items/page)
- Search/filter integration
- Row selection
- Inline actions

### Forms
- Validation
- Required field indicators
- Error messages
- Success notifications

### Notifications
- Toast messages (success, error, info)
- Auto-dismiss after 3 seconds
- Position: top-right corner

### Responsive Design
- Mobile-friendly layout
- Adaptive navigation
- Touch-friendly controls
- Flexible grid system

