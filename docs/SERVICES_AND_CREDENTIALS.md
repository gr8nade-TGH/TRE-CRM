# 🔐 TRE CRM - Services & Credentials Reference

## Service Overview Table

| Service | Purpose | Cost | Login | Password | Status |
|---------|---------|------|-------|----------|--------|
| **Vercel** | Hosting & Deployment | Free (Hobby) | tucker.harris@gmail.com | VERCEL_PASS | ✅ Active |
| **Supabase** | Database & Auth | Free (Starter) | tucker.harris@gmail.com | SUPA_PASS | ✅ Active |
| **Resend** | Email Delivery | Free (100/day) | tucker.harris@gmail.com | RESEND_PASS | ✅ Active |
| **Browserless.io** | PDF Generation | $29/mo (Starter) | tucker.harris@gmail.com | BROWSER_PASS | ✅ Active |
| **RentCast API** | Property Data | $49/mo (Starter) | tucker.harris@gmail.com | RENTCAST_PASS | 🔄 Pending |
| **SERP API** | Web Scraping | $150/mo (Legal Shield) | tucker.harris@gmail.com | SERP_PASS | 🔄 Pending |
| **Mapbox** | Maps & Geocoding | Free (50k loads/mo) | tucker.harris@gmail.com | MAPBOX_PASS | ✅ Active |
| **Sentry** | Error Tracking | Free (5k events/mo) | tucker.harris@gmail.com | SENTRY_PASS | ✅ Active |
| **GitHub** | Version Control | Free | gr8nade-TGH | GITHUB_PASS | ✅ Active |

---

## 💰 Monthly Cost Breakdown

### **Current Costs (Active Services)**
| Service | Plan | Monthly Cost | Annual Cost |
|---------|------|--------------|-------------|
| Vercel | Hobby | $0 | $0 |
| Supabase | Starter | $0 | $0 |
| Resend | Free | $0 | $0 |
| Browserless.io | Starter | $29 | $348 |
| Mapbox | Free | $0 | $0 |
| Sentry | Free | $0 | $0 |
| GitHub | Free | $0 | $0 |
| **SUBTOTAL** | | **$29/mo** | **$348/yr** |

### **Pending Services (To Be Activated)**
| Service | Plan | Monthly Cost | Annual Cost |
|---------|------|--------------|-------------|
| RentCast API | Starter | $49 | $588 |
| SERP API | Legal Shield | $150 | $1,800 |
| **SUBTOTAL** | | **$199/mo** | **$2,388/yr** |

### **Total Projected Costs**
| Category | Monthly | Annual |
|----------|---------|--------|
| Current Active | $29 | $348 |
| Pending Activation | $199 | $2,388 |
| **TOTAL** | **$228/mo** | **$2,736/yr** |

---

## 📋 Service Details & Notes

### **1. Vercel**
- **Purpose:** Frontend hosting, serverless functions, deployment
- **Plan:** Hobby (Free)
- **Limits:** 100 GB bandwidth/mo, 100 deployments/day
- **Upgrade Path:** Pro ($20/mo) for team features, analytics
- **Dashboard:** https://vercel.com/dashboard
- **Notes:** 
  - Automatic deployments from GitHub
  - Preview deployments for PRs
  - Edge functions for API routes
  - Consider Pro plan when team grows

---

### **2. Supabase**
- **Purpose:** PostgreSQL database, authentication, real-time subscriptions
- **Plan:** Starter (Free)
- **Limits:** 500 MB database, 2 GB bandwidth/mo, 50k monthly active users
- **Upgrade Path:** Pro ($25/mo) for 8 GB database, 250 GB bandwidth
- **Dashboard:** https://supabase.com/dashboard
- **Projects:**
  - Deep Pick (xckbsyeaywrfzvcahhtk)
  - TRE CRM (mevirooooypfjbsrmzrk)
- **Notes:**
  - 66+ SQL migrations deployed
  - 20+ tables with RLS policies
  - Real-time subscriptions for live updates
  - Monitor database size—may need Pro plan soon

---

### **3. Resend**
- **Purpose:** Transactional email delivery (Smart Match, notifications)
- **Plan:** Free
- **Limits:** 100 emails/day, 3,000 emails/month
- **Upgrade Path:** Pro ($20/mo) for 50k emails/month
- **Dashboard:** https://resend.com/dashboard
- **Notes:**
  - Email templates: Smart Match, agent notifications, lead responses
  - Open/click tracking enabled
  - Bounce and complaint handling
  - Upgrade when sending >100 emails/day

---

### **4. Browserless.io**
- **Purpose:** Headless Chrome for PDF generation (Guest Cards, Lease Confirmations)
- **Plan:** Starter ($29/mo)
- **Limits:** 1,000 sessions/month
- **Dashboard:** https://browserless.io/dashboard
- **Notes:**
  - Used for Guest Card PDF generation
  - Lease confirmation e-signature PDFs
  - Replaces local Puppeteer (no server needed)
  - Monitor session usage

---

### **5. RentCast API** 🔄 PENDING
- **Purpose:** San Antonio apartment complex & unit availability data
- **Plan:** Starter ($49/mo)
- **Limits:** 500 API calls/month
- **Upgrade Path:** Professional ($199/mo) for 5,000 calls/month
- **Dashboard:** https://app.rentcast.io/app/api
- **API Docs:** https://developers.rentcast.io/reference/introduction
- **Notes:**
  - Initial load: ~50 API calls (one-time)
  - Nightly sync: ~20-40 calls/night = ~600-1,200 calls/month
  - Starter plan sufficient for San Antonio market
  - Upgrade to Professional if expanding to multiple cities
  - Data sources: Property records, rental listings, market stats

---

### **6. SERP API** 🔄 PENDING
- **Purpose:** Web scraping with legal protection (US Legal Shield)
- **Plan:** Legal Shield ($150/mo)
- **Limits:** TBD (check plan details)
- **Dashboard:** https://serpapi.com/dashboard
- **API Docs:** https://serpapi.com/search-api
- **Notes:**
  - **US Legal Shield:** Protects against scraping-related legal issues
  - Use cases: Property data enrichment, competitive intelligence, market research
  - Scrapes Google, Bing, Yelp, Zillow, Apartments.com, etc.
  - Complements RentCast for data not available via API
  - Monitor usage to avoid overages

---

### **7. Mapbox**
- **Purpose:** Interactive maps, geocoding, drawing tools
- **Plan:** Free
- **Limits:** 50,000 map loads/month, 100,000 geocoding requests/month
- **Upgrade Path:** Pay-as-you-go ($5 per 1,000 loads over limit)
- **Dashboard:** https://account.mapbox.com/
- **Notes:**
  - Mapbox GL JS v3.0.1
  - Mapbox Draw for preferred area polygons
  - Geocoding for address → lat/lng
  - Monitor usage—may need paid plan at scale

---

### **8. Sentry**
- **Purpose:** Error tracking and performance monitoring
- **Plan:** Free (Developer)
- **Limits:** 5,000 events/month
- **Upgrade Path:** Team ($26/mo) for 50k events/month
- **Dashboard:** https://sentry.io/
- **Notes:**
  - Tracks JavaScript errors in production
  - Performance monitoring for slow queries
  - Source maps for debugging minified code
  - Upgrade when hitting event limits

---

### **9. GitHub**
- **Purpose:** Version control, code hosting, CI/CD
- **Plan:** Free
- **Limits:** Unlimited public/private repos
- **Dashboard:** https://github.com/gr8nade-TGH/TRE-CRM
- **Notes:**
  - 679 commits (Oct 6 - Dec 2, 2025)
  - Automatic Vercel deployments on push
  - Branch: main
  - Consider GitHub Actions for automated testing

---

## 🔑 API Keys & Environment Variables

### **Production (.env.production)**
```bash
# Supabase
VITE_SUPABASE_URL=https://mevirooooypfjbsrmzrk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_...

# Browserless.io
BROWSERLESS_API_KEY=...

# RentCast (PENDING)
RENTCAST_API_KEY=...

# SERP API (PENDING)
SERPAPI_KEY=...

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ...

# Sentry
VITE_SENTRY_DSN=https://...
```

---

## 📊 Usage Monitoring Checklist

### **Weekly Checks:**
- [ ] Supabase database size (500 MB limit)
- [ ] Resend email count (100/day limit)
- [ ] Browserless.io sessions (1,000/month limit)

### **Monthly Checks:**
- [ ] Vercel bandwidth (100 GB limit)
- [ ] Mapbox map loads (50k limit)
- [ ] Sentry events (5k limit)
- [ ] RentCast API calls (500/month limit)
- [ ] SERP API usage (check plan limits)

### **Upgrade Triggers:**
- **Supabase:** Database >400 MB or >40k MAU → Upgrade to Pro ($25/mo)
- **Resend:** >80 emails/day → Upgrade to Pro ($20/mo)
- **Vercel:** Need team features or analytics → Upgrade to Pro ($20/mo)
- **RentCast:** Expanding to multiple cities → Upgrade to Professional ($199/mo)

---

## 🚨 Critical Notes

### **Security:**
- ✅ All API keys stored in Vercel environment variables (not in code)
- ✅ Supabase RLS policies protect all tables
- ✅ Service role key only used server-side
- ⚠️ Never commit `.env` files to GitHub

### **Backup Strategy:**
- ✅ PowerShell backup script (`npm run backup`)
- ✅ Git version control (679 commits)
- ✅ Supabase automatic backups (7-day retention on free plan)
- ⚠️ Consider upgrading Supabase for point-in-time recovery

### **Cost Optimization:**
- Most services have generous free tiers
- Current spend: $29/mo (Browserless only)
- Projected spend: $228/mo (with RentCast + SERP API)
- Monitor usage to avoid surprise overages

---

**Last Updated:** December 5, 2025  
**Maintained By:** Tucker Harris (tucker.harris@gmail.com)

