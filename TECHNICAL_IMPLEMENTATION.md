# TRE CRM - Technical Implementation Details

## Code Organization

### script.js Structure (5,840 lines)
```
1. Utility Functions (formatDate, showModal, hideModal)
2. Lead Management Functions (saveNewLead, createLeadAPI, etc.)
3. Special Management Functions (saveNewSpecial, etc.)
4. Main IIFE (Immediately Invoked Function Expression)
   - State object definition
   - Mock data initialization
   - Event listeners setup
   - Render functions
   - API layer
   - Routing logic
5. Global API Functions (loadUsers, etc.)
6. Global function exports (window.editUser, etc.)
```

### auth.js Structure (295 lines)
```
1. DOMContentLoaded event listener
2. Session check and initial routing
3. Login form handler
4. Register form handler
5. Logout handler
6. Role-based UI update function
7. Modal management functions
8. Portal display functions
```

### supabase-client.js Structure (148 lines)
```
1. Supabase client initialization
2. Mock Supabase creation
3. Global auth functions (signIn, signUp, signOut)
4. Portal display functions
5. Session management
```

---

## Key Functions Reference

### Lead Management
- `saveNewLead()` - Create new lead with validation
- `checkDuplicateLead(email, phone)` - Prevent duplicates
- `createLeadAPI(lead)` - API call to create lead
- `renderLeads()` - Display leads in table
- `editLead(leadId)` - Open edit modal
- `deleteLead(leadId)` - Remove lead
- `calculateHealthStatus(lead)` - Compute health score
- `initializeHealthStatus()` - Initialize all leads

### Agent Management
- `renderAgents()` - Display agents table
- `editAgent(agentId)` - Edit agent details
- `deleteAgent(agentId)` - Remove agent

### Listing Management
- `initMap()` - Initialize Mapbox GL
- `renderListings()` - Display listings
- `addMarker(listing)` - Add property marker
- `filterListings()` - Apply filters
- `matchLeadsToListings()` - Find matching listings

### Special Management
- `saveNewSpecial()` - Create promotion
- `renderSpecials()` - Display specials
- `deleteSpecial(specialId)` - Remove special

### Routing
- `window.route()` - Main router function
- `handleInitialRoute()` - Set initial route
- Hash-based navigation with `hashchange` event

### UI Utilities
- `toast(message, type)` - Show notification
- `show(element)` - Display element
- `hide(element)` - Hide element
- `formatDate(iso)` - Format ISO date

---

## Data Persistence

### Current: Mock Data (In-Memory)
```javascript
const mockLeads = Array.from({ length: 37 }).map(...);
const mockAgents = [...];
const mockListings = [...];
```
- Data stored in JavaScript arrays
- Lost on page refresh
- No backend required
- Fast for development

### Future: API Integration
```javascript
const API_BASE = 'http://localhost:3001/api';
// Endpoints:
// GET/POST /leads
// GET/POST /agents
// GET/POST /listings
// GET/POST /specials
// GET/POST /documents
// GET/POST /users
```

### Database: Supabase
- PostgreSQL backend
- Real-time subscriptions
- Row-Level Security (RLS)
- Built-in authentication
- Automatic backups

---

## Styling System

### CSS Variables (styles.css)
```css
--bg: #f6f7f9;              /* Background */
--panel: #ffffff;           /* Panel background */
--ink: #0b1020;             /* Text color */
--brand: #153e7a;           /* TRE blue */
--brand-2: #c62828;         /* TRE red */
--green: #25d366;           /* Success */
--yellow: #ffd84d;          /* Warning */
--red: #ff3b30;             /* Error */
--accent: #2563eb;          /* Accent */
```

### Component Classes
- `.app-header` - Top navigation bar
- `.main-nav` - Navigation links
- `.route-view` - Page container
- `.data-table` - Data tables
- `.modal` - Modal dialogs
- `.btn` - Button styles
- `.filter-group` - Filter controls
- `.toast` - Notification messages

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## External Libraries & APIs

### Mapbox GL JS
- **Version:** 3.0.1
- **Purpose:** Interactive property map
- **Features:** Markers, clustering, filtering
- **API Key:** Required (set in environment)

### Leaflet
- **Version:** 1.9.4
- **Status:** Legacy (to be removed)
- **Reason:** Replaced by Mapbox GL

### Sentry
- **Purpose:** Error tracking and monitoring
- **DSN:** 3f73a6241615ff5791c9704729e18948
- **Features:** Exception reporting, performance monitoring

### Supabase
- **Purpose:** Backend database and auth
- **Features:** PostgreSQL, real-time, RLS
- **Status:** Configured but optional

---

## Development Workflow

### Local Development
1. Open `index.html` in browser
2. Mock data loads automatically
3. No backend required
4. Use browser DevTools for debugging

### Testing
- Manual testing in browser
- Console logging for debugging
- Mock data for reproducible tests
- No automated test suite currently

### Deployment
- **Platform:** Vercel
- **Config:** vercel.json with URL rewrites
- **Build:** Static files only
- **Environment:** No build step required

---

## Performance Considerations

### Current Optimizations
- Lazy loading of map (setTimeout 100ms)
- Pagination (10 items per page)
- Efficient DOM updates
- CSS variables for theming

### Potential Improvements
- Implement virtual scrolling for large lists
- Add service workers for offline support
- Optimize image sizes
- Implement code splitting
- Add caching strategies

---

## Security Considerations

### Current Implementation
- localStorage for session storage
- Mock authentication (development)
- No HTTPS enforcement (development)
- No CSRF protection (development)

### Production Recommendations
- Use Supabase authentication
- Implement HTTPS
- Add CSRF tokens
- Validate all inputs server-side
- Implement rate limiting
- Use secure session cookies
- Add API authentication tokens

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Required Features
- ES6 JavaScript
- CSS Grid & Flexbox
- LocalStorage API
- Fetch API
- Promise support

---

## File Size Analysis

| File | Size | Type |
|------|------|------|
| script.js | ~200KB | JavaScript |
| styles.css | ~150KB | CSS |
| index.html | ~50KB | HTML |
| auth.js | ~10KB | JavaScript |
| supabase-client.js | ~5KB | JavaScript |
| **Total** | **~415KB** | **Uncompressed** |

---

## Configuration Files

### vercel.json
- URL rewriting for agent pages
- Rewrites `/agent/:slug` to `/agent.html`

### supabase-schema-updates.sql
- Database schema migrations
- Lead table extensions
- Lead notes table creation
- RLS policies
- Trigger functions

---

## Error Handling

### Current Approach
- Try-catch blocks in async functions
- Console logging for debugging
- User-facing toast notifications
- Fallback to mock data on API failure

### Error Types Handled
- Network errors
- Validation errors
- Duplicate lead errors
- Missing data errors
- Authentication errors

---

## Future Enhancements

1. **Backend API** - Implement Express.js backend
2. **Real Database** - Full Supabase integration
3. **Real Authentication** - Supabase auth instead of mock
4. **Testing** - Unit and integration tests
5. **CI/CD** - Automated testing and deployment
6. **Analytics** - User behavior tracking
7. **Notifications** - Email/SMS alerts
8. **Mobile App** - React Native version
9. **Advanced Reporting** - Dashboard analytics
10. **Integrations** - CRM, email, calendar APIs

