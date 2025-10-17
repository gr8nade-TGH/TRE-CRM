# TRE CRM - Quick Reference Guide

## Project At A Glance

**Name:** TRE CRM (Texas Relocation Experts)  
**Type:** Web-based Customer Relationship Management System  
**Tech:** Vanilla JS, HTML5, CSS3, Mapbox GL, Supabase  
**Status:** Development (Mock data mode)  
**Deployment:** Vercel  

---

## File Quick Links

| File | Purpose | Key Content |
|------|---------|-------------|
| `index.html` | Main CRM app | 7 routes, navigation, modals |
| `script.js` | Core logic | 5,840 lines, all features |
| `auth.js` | Authentication | Login, register, session mgmt |
| `styles.css` | Styling | 3,743 lines, CSS variables |
| `supabase-client.js` | Backend setup | Mock & real auth functions |
| `landing.html` | Lead capture | Public-facing form |
| `agent.html` | Agent page | Agent-specific landing |
| `guest-card.html` | Guest display | Card component |

---

## Routes & Navigation

```
#/leads      → Leads table with filters, search, add/edit
#/agents     → Agents management (manager+ only)
#/listings   → Map view with property markers
#/specials   → Promotions with commission tracking
#/documents  → Document management (role-based)
#/admin      → User management (super_user only)
#/bugs       → Bug tracking (super_user only)
```

---

## User Roles

| Role | Access | Features |
|------|--------|----------|
| **Agent** | Limited | Leads, Listings, Specials, Documents (own) |
| **Manager** | Full | All except Admin & Bugs |
| **Super User** | Complete | Everything including Admin & Bugs |

---

## Key Data Models

### Lead
```javascript
{ id, name, email, phone, status, health_status, 
  preferences: {beds, baths, budget, area, move_in_date},
  notes, source, agent_id, created_at, updated_at }
```

### Agent
```javascript
{ id, name, email, phone, active, hireDate, 
  licenseNumber, specialties[], notes }
```

### Listing
```javascript
{ id, address, city, state, zip, price, beds, baths,
  sqft, amenities[], commission_rate, market, 
  coordinates: {lat, lng}, agent_id, status }
```

### Special
```javascript
{ property_name, current_special, commission_rate,
  expiration_date, agent_id, agent_name }
```

---

## Common Functions

### Lead Operations
```javascript
saveNewLead()              // Create lead
renderLeads()              // Display leads
editLead(leadId)           // Edit lead
deleteLead(leadId)         // Delete lead
calculateHealthStatus()    // Compute health
checkDuplicateLead()       // Prevent duplicates
```

### UI Utilities
```javascript
toast(message, type)       // Show notification
showModal(modalId)         // Open modal
hideModal(modalId)         // Close modal
show(element)              // Display element
hide(element)              // Hide element
formatDate(iso)            // Format date
```

### Routing
```javascript
window.route()             // Main router
window.router.handleInitialRoute()  // Initial route
```

### Authentication
```javascript
window.signIn(email, password)      // Login
window.signUp(email, password, data) // Register
window.signOut()                     // Logout
window.getCurrentSession()           // Get session
```

---

## State Object Structure

```javascript
state = {
  role: 'manager',                    // Current role
  agentId: 'agent_1',                 // Current agent
  currentPage: 'leads',               // Active page
  page: 1, pageSize: 10,              // Pagination
  sort: { key: 'submitted_at', dir: 'desc' },
  search: '',                         // Search query
  selectedLeadId: null,               // Selected lead
  filters: {                          // Lead filters
    search: '', status: 'all',
    fromDate: '', toDate: ''
  },
  listingsFilters: {                  // Listing filters
    search: '', market: 'all',
    minPrice: '', maxPrice: '',
    beds: 'any', commission: '0',
    amenities: 'any'
  }
}
```

---

## CSS Variables

```css
--bg: #f6f7f9;              /* Background */
--panel: #ffffff;           /* Panel bg */
--ink: #0b1020;             /* Text */
--brand: #153e7a;           /* TRE blue */
--brand-2: #c62828;         /* TRE red */
--green: #25d366;           /* Success */
--yellow: #ffd84d;          /* Warning */
--red: #ff3b30;             /* Error */
--accent: #2563eb;          /* Accent */
--success: #10b981;         /* Success alt */
--warning: #f59e0b;         /* Warning alt */
--danger: #ef4444;          /* Danger */
```

---

## Configuration

### Mock Data Mode (Current)
```javascript
USE_MOCK_DATA = true;       // In script.js:1275
API_BASE = null;            // No backend calls
```

### API Mode (Future)
```javascript
USE_MOCK_DATA = false;
API_BASE = 'http://localhost:3001/api';
```

### Endpoints (When API enabled)
```
GET/POST /leads
GET/POST /agents
GET/POST /listings
GET/POST /specials
GET/POST /documents
GET/POST /users
```

---

## Development Tips

### Enable Console Logging
- Open DevTools (F12)
- Check Console tab for debug messages
- Look for 🔧, ✅, ❌ emoji prefixes

### Test Authentication
- Mock login works with any email/password
- Session stored in localStorage
- Check `tre_session` in Application tab

### Debug Routing
- Check URL hash (#/leads, #/agents, etc.)
- Verify route function is called
- Check console for routing logs

### Test Mapbox
- Requires valid Mapbox API key
- Check browser console for map errors
- Verify coordinates in listing data

### Mock Data
- 37 sample leads
- 5 sample agents
- Multiple sample listings
- All in script.js starting ~line 330

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Login not working | Mock mode | Any email/password works |
| Map not showing | API key missing | Add Mapbox key to env |
| Data not persisting | Mock mode | Data lost on refresh |
| Routes not working | script.js not loaded | Check console for errors |
| Styles not applying | CSS not loaded | Check styles.css link |
| Auth failing | Session expired | Clear localStorage |

---

## Performance Metrics

- **Page Load:** ~1-2 seconds
- **Lead Render:** ~500ms for 37 leads
- **Map Init:** ~1 second
- **Search:** Real-time (instant)
- **Filter:** Real-time (instant)

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Mapbox GL | Map rendering | Active |
| Supabase | Database & auth | Configured |
| Sentry | Error tracking | Active |
| Vercel | Deployment | Active |

---

## Next Steps for Development

1. **Backend:** Implement Express.js API
2. **Database:** Connect real Supabase
3. **Auth:** Use Supabase authentication
4. **Testing:** Add unit & integration tests
5. **CI/CD:** Set up automated deployment
6. **Monitoring:** Configure Sentry alerts
7. **Analytics:** Add user tracking
8. **Mobile:** Optimize for mobile devices

---

## Resources

- **Mapbox Docs:** https://docs.mapbox.com/mapbox-gl-js/
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **MDN Web Docs:** https://developer.mozilla.org/
- **CSS Tricks:** https://css-tricks.com/

---

## Contact & Support

For questions about the codebase:
1. Check console logs (F12)
2. Review CODEBASE_RESEARCH.md
3. Check FEATURES_BREAKDOWN.md
4. Review TECHNICAL_IMPLEMENTATION.md

