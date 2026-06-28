# GETHIRED THREAT MODEL — QA Cycle 11 (SECURE v3)
Generated: 2026-06-25 | Scope: Full BE + FE | Framework: STRIDE

---

## System Overview

GetHired is a multi-role job platform: Applicants, Recruiters/Employers, and Admins.
The BE is a Node.js/Express API backed by PostgreSQL (Supabase) with Firebase for auth and Google Cloud Storage for file uploads.
The FE is an Angular SPA.
Deployment: Single Linode server. In-memory rate limiting (no Redis yet).

---

## Trust Boundaries

1. **Public Internet → BE API** (unauthenticated surface)
2. **Firebase-authenticated User → BE API** (authenticated surface)
3. **BE → PostgreSQL** (internal DB boundary)
4. **BE → Firebase Admin SDK** (token verification)
5. **BE → Google Cloud Storage** (file storage)
6. **BE → SendGrid** (email dispatch)
7. **BE → PayMongo** (payment provider — inbound webhooks cross this boundary outbound-to-inbound)

---

## STRIDE Analysis

### S — Spoofing

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Impersonate another user's Firebase token | Firebase Admin SDK `verifyIdToken()` validates JWTs cryptographically | LOW — tokens expire, Firebase rotates keys |
| Spoofed company/applicant ID in request body | All sensitive write endpoints now derive IDs server-side from `req.user.uid` via `getUserCompany()` | LOW — confirmed in all 15 route files |
| Cookie session token theft | `verifyAuth` accepts Bearer header OR `__session` cookie; no Secure/HttpOnly attributes enforced at app layer | MEDIUM — depends on nginx/CDN config |
| Email enumeration at login | `loginUser` returns "User does not exist" on missing account vs different error for wrong password | MEDIUM — P3, known open item |
| PayMongo webhook spoofing | No HMAC signature verification on `/api/payment/paymongowebhook` | HIGH — P2, known open item |

---

### T — Tampering

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Tamper with uploaded file MIME type | `fileSignature.js` magic-byte check on PDF/DOCX/images | LOW for covered types |
| Tamper with video CV upload MIME | Video uploads NOT covered by magic-byte check | MEDIUM — P3, known open item |
| SQL injection via query parameters | All DB queries use parameterized `$N` placeholders | LOW — no string concatenation found |
| Tamper with message body length | `MAX_MESSAGE_BODY_LENGTH = 4000` enforced in `sendMessage()` | LOW |
| Modify company_id in PUT /company/update | Body companyId verified against JWT-derived companyId | LOW |

---

### R — Repudiation

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Deny creating a job or application | `insertLogs()` called in some controllers | MEDIUM — inconsistent logging; no structured audit trail |
| Deny modifying a company profile | No audit log on updateCompany | MEDIUM |
| Deny sending a message | messages table records sender_uid + sender_role | LOW for messages |

---

### I — Information Disclosure

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Applicant PII exposed via /job/applicants | verifyAuth + company ownership check added | LOW |
| Applicant email exposed to recruiter via message threads | `applicantEmail` IS returned in listRecruiterThreads response | MEDIUM — see Q5 in key questions; intentional but should be documented |
| Firebase photo URLs (public) exposed to recruiters | `applicantPhotoUrl` returned in hub + message threads | LOW — Firebase Storage URLs are typically public (by object ACL); acceptable for profile photos |
| Secrets in error responses | Controllers return generic messages, not raw errors | LOW |
| Secrets in git history | Previously flagged (gethired-serviceAccountKey.json, jobhunt-serviceAccountKey.json in repo root) | HIGH — P1 external action required |
| Company subscription data exposed cross-company | JWT-derived companyId enforced in getSubscriptionRestrictions | LOW |

---

### D — Denial of Service

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Brute-force login | Tier 2 authLimiter: 20 req/15min on /api/auth | LOW |
| Credential stuffing | Same Tier 2 limit | LOW |
| Message flood (large body) | 4000-char body cap + Tier 3 write limiter 100 req/15min | LOW |
| Unrestricted GET scraping | Tier 1 global: 500 req/15min | MEDIUM — GETs bypass Tier 3; a scraper can enumerate 500 public jobs/15min |
| In-memory rate limit bypass (multi-node) | Single Linode server now; Redis deferred | LOW (current), MEDIUM if scaled |
| npm dependency DoS via node-tar/axios | 273 vulnerabilities from npm audit; node-tar ReDoS and path traversal | MEDIUM — these are transitive via bcrypt, not directly exploitable from public surface |

---

### E — Elevation of Privilege

| Threat | Mitigations in place | Residual risk |
|--------|---------------------|---------------|
| Applicant accesses employer endpoints | `getUserCompany()` check gates all employer endpoints; returns [] for non-employers | LOW |
| Recruiter from Company A accesses Company B data | All interview/message/job endpoints verify `callerCompany.companyId` matches resource's `company_id` | LOW |
| Unauthenticated access to protected routes | verifyAuth on all sensitive routes | LOW — 3 intentionally public routes remain (job/published, job/details, company/details etc.) |
| Admin impersonation | `/api/admin/userprofile` only returns caller's own profile; no admin-only gate | MEDIUM — admin route is thin but has no role enforcement |
| saveGroupInterview: no company ownership check | `saveGroupInterview` accepts body and calls `createGroupInterview(req.body, uid)` — no `getUserCompany()` guard | MEDIUM — new finding QA11 |

---

## Top Threats Requiring Action (QA11)

| Priority | Threat | Finding ID |
|----------|--------|-----------|
| P1 | Service account keys in git repo root | SEC-KEY-01 |
| P2 | PayMongo webhook: no signature verification | SEC-PAY-01 |
| P2 | `saveGroupInterview` missing company ownership guard | SEC-AUTH-01 |
| P2 | `getJobApplicantDetails` missing BOLA check (company ownership) | SEC-BOLA-01 |
| P2 | nosniff / security headers missing | SEC-HDR-01 |
| P3 | Email enumeration on login | SEC-ENUM-01 |
| P3 | Video upload MIME not magic-byte checked | SEC-MIME-01 |
| P3 | Admin route: no role enforcement | SEC-ROLE-01 |
| P3 | applicantEmail returned to recruiter via messages (document intent) | SEC-PRIV-01 |
