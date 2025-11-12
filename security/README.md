# TRE CRM Security Documentation

This directory contains security reports, audits, and hardening documentation for the TRE CRM application.

---

## 📋 Security Reports

### **Active Security Measures**

1. **[API Authentication & Authorization](./API_AUTHENTICATION_REPORT.md)** - *Implemented 2025-11-12*
   - JWT-based authentication for all API endpoints
   - Role-based access control (RBAC) for user management
   - Partial protection for email sending (public welcome emails, protected others)
   - **Status:** ✅ Active in Production

---

## 🔒 Security Principles

### **1. Defense in Depth**
- Multiple layers of security controls
- Server-side validation (never trust client)
- JWT signature validation on every request
- Role-based access control

### **2. Least Privilege**
- Users only have access to what they need
- Agents: Read-only user list, can send emails
- Managers: Full user management, all operations
- Super Users: Full system access

### **3. Secure by Default**
- All endpoints protected unless explicitly made public
- Authentication required by default
- Public access only for specific use cases (landing pages)

### **4. Fail Securely**
- Authentication failures return 401 Unauthorized
- Authorization failures return 403 Forbidden
- Errors don't leak sensitive information

---

## 🎯 Security Checklist

Use this checklist when adding new features or endpoints:

### **New API Endpoint:**
- [ ] Determine if endpoint should be public or protected
- [ ] Add authentication using `requireAuth()` or `requireRole()`
- [ ] Update client-side code to include auth headers
- [ ] Add endpoint to security matrix
- [ ] Test authentication (401 when not logged in)
- [ ] Test authorization (403 when wrong role)
- [ ] Document in security report

### **New User Role:**
- [ ] Update `hasRole()` function in `_auth-helper.js`
- [ ] Update access control matrix
- [ ] Test all role-based access scenarios
- [ ] Document role permissions

### **New Email Template:**
- [ ] Determine if template should be public or protected
- [ ] Add to `publicTemplates` array if public
- [ ] Test sending with and without authentication
- [ ] Document in security report

### **Database Changes:**
- [ ] Review Row Level Security (RLS) policies
- [ ] Ensure sensitive data is protected
- [ ] Test access from different user roles
- [ ] Document any security implications

---

## 🚨 Security Incident Response

### **If You Discover a Security Vulnerability:**

1. **DO NOT** commit the vulnerability to version control
2. **DO NOT** discuss publicly (GitHub issues, Slack, etc.)
3. **DO** notify the security team immediately
4. **DO** document the vulnerability privately
5. **DO** follow responsible disclosure practices

### **Incident Response Steps:**

1. **Identify** - Confirm the vulnerability exists
2. **Contain** - Prevent further exploitation
3. **Remediate** - Fix the vulnerability
4. **Test** - Verify the fix works
5. **Document** - Update security reports
6. **Deploy** - Push fix to production ASAP
7. **Review** - Post-mortem to prevent recurrence

---

## 📊 Security Metrics

Track these metrics to monitor security posture:

- **Authentication Failures** - Monitor for brute force attempts
- **Authorization Failures** - Monitor for privilege escalation attempts
- **API Error Rates** - Spike may indicate attack
- **Email Sending Volume** - Monitor for abuse
- **User Creation Rate** - Monitor for unauthorized account creation

---

## 🔍 Security Audits

### **Regular Audits:**

- **Monthly:** Review access logs for suspicious activity
- **Quarterly:** Review and update security documentation
- **Annually:** Full security audit of all endpoints and permissions

### **Audit History:**

| Date | Type | Findings | Status |
|------|------|----------|--------|
| 2025-11-12 | API Security Audit | Critical vulnerabilities in user management and email endpoints | ✅ Remediated |

---

## 📚 Additional Resources

### **Internal Documentation:**
- [API Authentication Report](./API_AUTHENTICATION_REPORT.md)
- [Security Plan](../docs/SECURITY_PLAN.md)

### **External Resources:**
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/server-side)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 🔐 Security Contacts

**Security Team:**
- Primary: [Your Name/Email]
- Secondary: [Backup Contact]

**Emergency Contact:**
- After Hours: [Emergency Contact]

---

**Last Updated:** 2025-11-12  
**Next Review:** After production deployment

