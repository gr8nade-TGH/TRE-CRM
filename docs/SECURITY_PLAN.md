# API Security Implementation Plan
**Date:** 2025-11-12  
**Status:** AWAITING APPROVAL

---

## 🚨 Executive Summary

**CRITICAL SECURITY VULNERABILITIES IDENTIFIED:**

Our Vercel serverless API endpoints are currently **completely unprotected**, allowing anyone on the internet to:
- Create admin users with full system access
- Delete any user account
- Modify user roles and permissions
- List all user data including emails
- Send unlimited emails through our system

**IMMEDIATE ACTION REQUIRED** to secure user management endpoints.

---

## 📊 Current Architecture Analysis

### API Endpoints Inventory

| Endpoint | Current Auth | Risk Level | Public Access Needed? |
|----------|-------------|------------|----------------------|
| `/api/send-email` | ❌ None | 🟡 Medium | ✅ Yes (landing pages) |
| `/api/create-user` | ❌ None | 🔴 **CRITICAL** | ❌ No |
| `/api/update-user` | ❌ None | 🔴 **CRITICAL** | ❌ No |
| `/api/delete-user` | ❌ None | 🔴 **CRITICAL** | ❌ No |
| `/api/list-users` | ❌ None | 🔴 **CRITICAL** | ❌ No |
| `/api/track-email-open` | ❌ None | 🟢 Low | ✅ Yes (tracking pixels) |
| `/api/track-email-click` | ❌ None | 🟢 Low | ✅ Yes (click tracking) |

### Current Client-Side Auth Flow

```javascript
// Client-side (auth.js, index.html)
const { data: { session }, error } = await supabase.auth.getSession();
// ✅ SAFE for client-side - just reads from localStorage

// Client calls API endpoints
fetch('/api/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // ❌ NO AUTHORIZATION HEADER!
    body: JSON.stringify(userData)
});
```

**Problem:** Client never sends auth token to server, so server has no way to verify who is making the request!

---

## 🔍 Research Findings: Supabase JWT Validation

### Official Supabase Recommendations

Based on Supabase documentation and community discussions:

1. **NEVER trust `getSession()` in server-side code**
   - Returns data directly from storage (cookies/localStorage)
   - Can be spoofed by malicious users
   - No server-side validation

2. **ALWAYS use `getUser(jwt)` in server-side code**
   - Sends request to Supabase Auth server
   - Validates JWT signature against public keys
   - Returns fresh, verified user data
   - **This is the recommended approach for Vercel serverless functions**

3. **Alternative: Manual JWT verification**
   - Use `jose` library to verify JWT locally
   - Fetch Supabase public keys from `/.well-known/jwks.json`
   - More complex but faster (no network request)

### Recommended Approach for Our Stack

**Use `supabase.auth.getUser(token)` because:**
- ✅ Simple and reliable
- ✅ Official Supabase recommendation
- ✅ Works perfectly with Vercel serverless functions
- ✅ Validates JWT signature every time
- ✅ Returns user metadata (including role)
- ⚠️ Slight latency (network request to Supabase)

---

## 🎯 Proposed Security Implementation

### Strategy Overview

**Three-Tier Protection Model:**

1. **Public Endpoints** - No auth required (landing pages, tracking)
2. **Authenticated Endpoints** - Require valid JWT (any logged-in user)
3. **Role-Protected Endpoints** - Require specific roles (managers/super_users only)

### Implementation Details

#### 1. Create Auth Helper Module

**File:** `api/_auth-helper.js`

```javascript
import { createClient } from '@supabase/supabase-js';

/**
 * Validate JWT and get user
 * Uses supabase.auth.getUser(token) - the SAFE method
 */
export async function validateAuth(req, supabase) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, user: null, error: 'Missing Authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');

    // ✅ SAFE: Validates JWT signature with Supabase server
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return { valid: false, user: null, error: 'Invalid token' };
    }

    return { valid: true, user: data.user, error: null };
}

/**
 * Check if user has required role
 */
export function hasRole(user, allowedRoles) {
    const userRole = user.user_metadata?.role;
    return allowedRoles.includes(userRole);
}

/**
 * Require authentication (any logged-in user)
 */
export async function requireAuth(req, res, supabase) {
    const { valid, user, error } = await validateAuth(req, supabase);
    
    if (!valid) {
        res.status(401).json({ error: 'Unauthorized', message: error });
        return null;
    }
    
    return user;
}

/**
 * Require specific role (manager, super_user, etc.)
 */
export async function requireRole(req, res, supabase, allowedRoles) {
    const user = await requireAuth(req, res, supabase);
    if (!user) return null;
    
    if (!hasRole(user, allowedRoles)) {
        res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
        return null;
    }
    
    return user;
}
```

#### 2. Update Client-Side API Calls

**File:** `src/api/supabase-api.js` and `src/modules/admin/admin-api.js`

```javascript
// Helper to get auth headers
async function getAuthHeaders() {
    const { data: { session } } = await window.supabase.auth.getSession();
    
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    };
}

// Example: Update createUser
export async function createUser(userData) {
    const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: await getAuthHeaders(), // ✅ Now includes JWT!
        body: JSON.stringify(userData)
    });
    // ... rest of code
}
```

#### 3. Protect User Management Endpoints

**Example:** `/api/create-user.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import { requireRole } from './_auth-helper.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ✅ PROTECTED: Only managers and super_users can create users
    const user = await requireRole(req, res, supabase, ['manager', 'super_user']);
    if (!user) return; // Response already sent by requireRole

    // ... rest of existing code
}
```

#### 4. Partial Protection for Send Email

**File:** `/api/send-email.js`

```javascript
// Allow public access for welcome emails, require auth for others
const { templateId } = req.body;

// Check if this is a welcome email (public) or other template (protected)
const publicTemplates = ['welcome_lead'];

if (!publicTemplates.includes(templateId)) {
    // ✅ Require authentication for non-welcome emails
    const user = await requireAuth(req, res, supabase);
    if (!user) return;
}

// Continue with email sending...
```

---

## 📋 Implementation Checklist

### Phase 1: Critical Security (IMMEDIATE)
- [ ] Create `api/_auth-helper.js` with JWT validation
- [ ] Protect `/api/create-user` - require `manager` or `super_user` role
- [ ] Protect `/api/update-user` - require `manager` or `super_user` role
- [ ] Protect `/api/delete-user` - require `manager` or `super_user` role
- [ ] Protect `/api/list-users` - require any authenticated user
- [ ] Update client-side API calls to include `Authorization` header
- [ ] Test user management flows still work

### Phase 2: Email Security (HIGH PRIORITY)
- [ ] Add template validation to `/api/send-email`
- [ ] Allow `welcome_lead` template without auth (landing pages)
- [ ] Require auth for all other email templates
- [ ] Add rate limiting (future enhancement)

### Phase 3: Testing & Validation
- [ ] Test authenticated user can manage users
- [ ] Test unauthenticated request returns 401
- [ ] Test agent role cannot create users (403)
- [ ] Test landing page welcome emails still work
- [ ] Test Smart Match emails require auth

---

## ⚠️ Trade-offs & Considerations

### Pros
✅ Prevents unauthorized access to critical endpoints  
✅ Uses official Supabase recommended approach  
✅ Minimal code changes required  
✅ Maintains backward compatibility for public endpoints  
✅ Role-based access control for fine-grained permissions  

### Cons
⚠️ Slight latency increase (JWT validation network request)  
⚠️ Requires updating all client-side API calls  
⚠️ Need to handle token expiration/refresh  

### Risks
🔴 **Breaking Change:** Existing API calls without auth headers will fail  
🟡 **Testing Required:** Must verify all user flows still work  
🟢 **Mitigation:** Implement in phases, test thoroughly before deployment  

---

## 🧪 Testing Plan

### Manual Testing
1. **Unauthenticated Access**
   - Try to create user without login → Should return 401
   - Try to delete user without login → Should return 401

2. **Agent Role Access**
   - Login as agent
   - Try to create user → Should return 403 (Forbidden)
   - Try to list users → Should work (200)

3. **Manager Role Access**
   - Login as manager
   - Create user → Should work (200)
   - Update user → Should work (200)
   - Delete user → Should work (200)

4. **Landing Page**
   - Submit form on `/landing/sarah-johnson` → Should send welcome email (200)
   - Verify email received

5. **Smart Match Email**
   - Login as manager
   - Send Smart Match email → Should work (200)
   - Logout
   - Try to send Smart Match → Should return 401

---

## 📊 Priority Ranking

| Priority | Task | Risk if Not Done | Effort |
|----------|------|------------------|--------|
| 🔴 P0 | Protect user management endpoints | Anyone can create admin accounts | Medium |
| 🟡 P1 | Update client API calls | Existing features break | Low |
| 🟡 P1 | Protect send-email (non-welcome) | Email spam/abuse | Low |
| 🟢 P2 | Add rate limiting | DoS attacks | High |
| 🟢 P3 | Add audit logging | No visibility into security events | Medium |

---

## 🚀 Deployment Strategy

### Recommended Approach: Phased Rollout

**Phase 1:** Implement auth helper + protect endpoints (no client changes)
- Deploy to feature branch
- Test with Postman/curl to verify auth works
- **Expected:** All API calls from frontend will fail (401)

**Phase 2:** Update client-side code to send auth headers
- Update all `fetch()` calls to include `Authorization` header
- Test in development
- Deploy to feature branch

**Phase 3:** Merge to main
- Create PR with all changes
- Review and test
- Merge and deploy to production

---

## ❓ Questions for Approval

1. **Do you approve this security implementation plan?**
2. **Should we implement all phases at once, or phase by phase?**
3. **Are there any other endpoints we should protect?**
4. **Should agents be able to list users, or only managers?**
5. **Do you want rate limiting implemented now or later?**

---

## 📝 Next Steps (After Approval)

1. Implement `api/_auth-helper.js`
2. Update one endpoint as proof-of-concept
3. Test thoroughly
4. Update remaining endpoints
5. Update client-side code
6. Create PR for review
7. Deploy to production

---

**Awaiting your approval to proceed with implementation.**

