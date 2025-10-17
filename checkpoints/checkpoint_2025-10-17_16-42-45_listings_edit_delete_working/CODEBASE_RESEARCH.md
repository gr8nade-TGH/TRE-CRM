# TRE CRM Application - Comprehensive Codebase Research

## Project Overview
**TRE CRM** (Texas Relocation Experts Customer Relationship Management) is a web-based CRM application designed for real estate agents and managers to manage leads, listings, agents, documents, and special promotions.

**Technology Stack:**
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Mapping:** Mapbox GL JS v3.0.1 (primary), Leaflet (legacy, to be removed)
- **Backend:** Node.js/Express (localhost:3001) - optional, currently using mock data
- **Database:** Supabase (PostgreSQL) with authentication
- **Deployment:** Vercel
- **Error Tracking:** Sentry
- **Styling:** Custom CSS with CSS variables

---

## Directory Structure

```
TRE App/
├── index.html                 # Main CRM application
├── landing.html              # Agent landing page for lead capture
├── agent.html                # Agent-specific landing page
├── guest-card.html           # Guest card display component
├── script.js                 # Main application logic (5840 lines)
├── auth.js                   # Authentication & authorization
├── styles.css                # Global styles (3743 lines)
├── auth-styles.css           # Authentication UI styles
├── supabase-client.js        # Supabase client initialization & mock functions
├── supabase-schema-updates.sql # Database schema migrations
├── vercel.json               # Vercel deployment config
├── assets/                   # Static assets
├── images/                   # Logo and icons
├── checkpoints/              # Backup versions of key files
├── docs/                     # Documentation
├── prisma/                   # (Empty - for future ORM setup)
├── scripts/                  # (Empty - for future utility scripts)
├── supabase/                 # Supabase migrations
│   └── migrations/
│       └── 20251010203657_remote_schema.sql
└── tre-crm-backend/          # (Empty - backend placeholder)
```

---

## Core Features & Modules

### 1. **Authentication System** (auth.js)
- **Login/Register Portal:** Branded modal-based authentication
- **Session Management:** localStorage-based session persistence
- **Role-Based Access Control (RBAC):**
  - `agent` - Limited access (Leads, Listings, Specials, Documents)
  - `manager` - Full access except Admin
  - `super_user` - Complete access including Admin & Bugs pages
- **Mock Authentication:** Fallback mock functions for development
- **Supabase Integration:** Real authentication via Supabase when available

### 2. **Leads Management** (script.js - primary module)
- **CRUD Operations:** Create, read, update, delete leads
- **Lead Properties:**
  - Basic: name, email, phone, status, health_status
  - Preferences: bedrooms, bathrooms, price_range, area_of_town
  - Details: best_time_to_call, move_in_date, credit_history, lease_term
  - Notes: comments, desired_neighborhoods
- **Health Status Calculation:** Automatic scoring based on lead activity
- **Filtering & Search:** By name, email, phone, status, date range
- **Duplicate Detection:** Prevents duplicate leads by email/phone
- **Lead Matching:** Matches leads to listings

### 3. **Listings Management**
- **Map Integration:** Mapbox GL JS for property visualization
- **Listing Properties:**
  - Location, price, bedrooms, bathrooms
  - Commission rates, amenities
  - Market categorization
- **Filtering:** By market, price range, beds, commission, amenities
- **Marker Management:** Dynamic markers on map for properties

### 4. **Agents Management**
- **Agent Profiles:** Name, email, phone, license number
- **Specialties:** Residential, Luxury, Commercial, Investment, Rental
- **Status Tracking:** Active/inactive agents
- **Hire Date & Notes:** Employment history and performance notes
- **Mock Data:** 5 sample agents (Alex, Bailey, Casey, Dana, Evan)

### 5. **Specials/Promotions**
- **Property Specials:** Current promotions with commission rates
- **Expiration Tracking:** Date-based special validity
- **Agent Assignment:** Specials linked to specific agents

### 6. **Documents Management**
- **Role-Based Views:**
  - Manager view: All documents
  - Agent view: Agent-specific documents
- **Document Organization:** By type and date

### 7. **Admin Panel** (super_user only)
- **User Management:** Create, edit, delete users
- **Password Management:** Change user passwords
- **Role Assignment:** Assign user roles
- **System Configuration:** Global settings

### 8. **Bug Tracking** (super_user only)
- **Issue Reporting:** Log and track bugs
- **Status Management:** Track bug resolution

---

## State Management

**Global State Object (script.js):**
```javascript
const state = {
  role: 'manager',              // Current user role
  agentId: 'agent_1',           // Current agent ID
  currentPage: 'leads',         // Active page
  page: 1, pageSize: 10,        // Pagination
  sort: { key: 'submitted_at', dir: 'desc' },
  search: '',                   // Search query
  selectedLeadId: null,         // Selected lead
  selectedAgentId: null,        // Selected agent
  selectedMatches: new Set(),   // Selected lead-listing matches
  currentMatches: [],           // Current matches
  showcases: {},                // Showcase data
  publicBanner: '...',          // Public messaging
  filters: { search, status, fromDate, toDate },
  listingsFilters: { search, market, minPrice, maxPrice, beds, commission, amenities }
}
```

---

## Data Flow

### Mock Data Mode (Current)
- **USE_MOCK_DATA = true** (script.js:1275)
- All data stored in memory (mockLeads, mockAgents, etc.)
- Data persists only during session
- No backend API calls

### API Mode (Future)
- **API_BASE:** `http://localhost:3001/api` (development)
- Endpoints: `/leads`, `/agents`, `/listings`, `/specials`, `/documents`, `/users`
- Requires backend server running

---

## Key Files & Line Counts

| File | Lines | Purpose |
|------|-------|---------|
| script.js | 5,840 | Main application logic |
| styles.css | 3,743 | Global styling |
| index.html | 1,089 | Main CRM interface |
| auth.js | 295 | Authentication |
| supabase-client.js | 148 | Supabase setup |
| landing.html | 410 | Lead capture form |
| agent.html | 399 | Agent landing page |
| guest-card.html | 410 | Guest card component |

---

## Database Schema (Supabase)

**Tables:**
- `leads` - Lead records with extended fields
- `lead_notes` - Internal notes on leads
- `users` - User accounts with roles
- `agents` - Agent profiles
- `listings` - Property listings
- `specials` - Promotional specials

**Security:** Row-Level Security (RLS) policies for data access control

---

## Routing System

**Hash-Based Routing:**
- `#/leads` - Leads management
- `#/agents` - Agents management
- `#/listings` - Listings with map
- `#/specials` - Promotions
- `#/documents` - Document management
- `#/admin` - Admin panel (super_user only)
- `#/bugs` - Bug tracking (super_user only)

---

## UI Components

- **Modals:** Add Lead, Add Special, Edit forms
- **Tables:** Data tables with sorting, filtering, pagination
- **Forms:** Lead capture, agent management, document upload
- **Map:** Mapbox GL for property visualization
- **Toast Notifications:** Success/error messages
- **Role Selector:** Manager/Agent role switching

---

## Development Notes

- **Mock Mode:** Currently in development with mock data
- **Backend:** Optional - can run with or without backend
- **Supabase:** Configured but not required for basic functionality
- **Checkpoints:** Backup versions saved for recovery
- **Vercel Deployment:** Configured with URL rewriting for agent pages

