# GETHIRED SECURE BACKLOG — QA Cycle 11
Generated: 2026-06-25

All open security items from QA11, in priority order.

---

## Sprint 1 (Blocking for public launch)

### SEC-P1-01: Rotate Service Account Keys
**Priority:** P1 | **Effort:** 30 min | **Owner:** Paul
Files: `gethired-serviceAccountKey.json`, `jobhunt-serviceAccountKey.json` — tracked in git.
Steps: rotate in GCP Console → update production env → git rm → purge history.
Details: `GETHIRED_SECRET_INCIDENT_REPORT.md`, EA-01/EA-02.

### SEC-P2-01: PayMongo Webhook Signature Verification
**Priority:** P2 | **Effort:** 3 hours | **Owner:** Developer + Paul (EA-05)
Files: `server.js` (add express.raw() before webhook route), `controllers/paymentController.js`
Change: read x-paymongo-signature header; compute HMAC-SHA256 of raw body; reject on mismatch.
Requires: `PAYMONGO_WEBHOOK_SECRET` env var from PayMongo Dashboard.
Details: `GETHIRED_PAYMENT_WEBHOOK_SECURITY_AUDIT.md`.

### SEC-P2-02: CORS Restriction to Production Domain
**Priority:** P2 | **Effort:** 30 min | **Owner:** Paul
File: `server.js` — uncomment `corsOption` block; add production FE domain to whitelist.
Requires: production FE domain confirmed (EA-06).

### SEC-P2-03: Replace bcrypt with bcryptjs
**Priority:** P2 | **Effort:** 1 hour | **Owner:** Developer
File: `package.json`, any file importing `bcrypt`.
Change: remove `bcrypt` dependency; `bcryptjs` already in package.json; update any `import bcrypt from 'bcrypt'` to `import bcrypt from 'bcryptjs'` — same API.
Eliminates: entire bcrypt>@mapbox/node-pre-gyp>tar vulnerability chain (17 critical + 138 high).

### SEC-P2-04: Upgrade axios to ^1.9.0
**Priority:** P2 | **Effort:** 2 hours (include regression test) | **Owner:** Developer
File: `package.json`, `controllers/paymentController.js`
Check: v1.x API compat for `axios.request(options)` usage in paymentController — largely compatible.
Eliminates: SSRF, prototype pollution, CSRF, credential leak CVEs.

### SEC-P2-05: Add HTTP Access Logging
**Priority:** P2 | **Effort:** 30 min | **Owner:** Developer
File: `server.js` — add `app.use(morgan('combined'))` after compression middleware.
Install: `npm install morgan` (or `npm install morgan @types/morgan`).
Provides: IP, method, path, status, response-time per request — essential for post-incident investigation.

### SEC-P2-06: Verify jsonwebtoken Direct Usage + Upgrade
**Priority:** P2 | **Effort:** 1 hour | **Owner:** Developer
Run: `grep -r "require('jsonwebtoken')\|from 'jsonwebtoken'" .` to confirm if directly called.
If found: upgrade to jsonwebtoken@^9.0.0 (API-compatible for sign/verify).
CVE: GHSA-27h2-hvpr-p74q — signature bypass in v8.x.

### SEC-P2-07: Plan Node 18/20 LTS Migration
**Priority:** P2 | **Effort:** 1-2 sprints | **Owner:** Paul + DevOps
Node 14 is EOL since April 2023. No security patches for new V8/Node CVEs.
Node 18 (LTS until April 2025) or Node 20 (LTS until April 2026) are the targets.
Note: express-rate-limit v8+ (with optional chaining) would be available after Node 18 upgrade.

---

## Sprint 2

### SEC-P3-01: Email Enumeration on Login
**Priority:** P3 | **Effort:** 30 min
File: `controllers/userController.js` — `loginUser()`
Change: return identical "Invalid email or password" for both account-not-found and wrong-password cases.

### SEC-P3-02: Admin Route Role Enforcement
**Priority:** P3 | **Effort:** 2 hours
File: `routes/adminRoute.js`, `controllers/adminController.js`
Change: add role check — query `user_credentials` for `role = 'admin'` or set Firebase custom claim.

### SEC-P3-03: getDashboard — Add Array.isArray Guard
**Priority:** P3 | **Effort:** 30 min
File: `controllers/companiesController.js` — `getDashboard()`
Change: add `if (!userCompany || Array.isArray(userCompany)) return 403` before `.companyId` access.

### SEC-P3-04: deleteCV — Remove Orphaned Firebase Storage Files
**Priority:** P3 | **Effort:** 1 hour
File: `controllers/cvController.js` — `deleteCV()`
Change: after deleting DB row, call Firebase Admin Storage to delete the associated file.
Also needed in: `deleteAccountById()` — purge all user files on account deletion.

### SEC-P3-05: Video Upload MIME Magic-Byte Check
**Priority:** P3 | **Effort:** 2 hours
File: `helpers/fileSignature.js`
Change: add video/mp4 and video/webm to SIGNATURES map.
Note: video signatures are complex (MP4 has multiple valid signatures); test thoroughly.

### SEC-P3-06: Remove request Package
**Priority:** P3 | **Effort:** 2 hours
File: any file importing `request` — check with `grep -r "require('request')" .`
Change: migrate callers to axios (already in package.json).
Eliminates: qs DoS and uuid buffer bounds check vulnerabilities.

### SEC-P3-07: X-Forwarded-For Nginx Validation
**Priority:** P3 | **Effort:** 15 min (nginx config) | **Owner:** Paul/DevOps
Verify nginx config has: `proxy_set_header X-Forwarded-For $remote_addr;`
This ensures express-rate-limit uses the real client IP, not a spoofed header.

### SEC-P3-08: Excel Verification Endpoint Authentication
**Priority:** P3 | **Effort:** 1 hour
File: `routes/userRoute.js`, `controllers/userController.js`
Change: add verifyAuth + admin role check to `POST /api/auth/manualexcelverification`.

### SEC-P3-09: CORS — Add Production FE Domain to Whitelist
**Priority:** P3 (after P2-02) | **Effort:** 15 min
This depends on EA-06 (confirming production domain). Uncomment the restrictive corsOption block.

### SEC-P3-10: Data Retention Policy
**Priority:** P3 | **Effort:** Design + implementation (1 sprint)
Define retention periods for: applications, messages, transaction records.
Implement: scheduled cleanup job or soft-delete with TTL.

---

## Informational / Document Only

### SEC-INFO-01: applicantEmail in interview hub — Document as Intentional
`applicantEmail` returned as standalone field in GET /api/interview/hub. This is intentional for the recruiting context. Add a code comment confirming this is a deliberate product decision.

### SEC-INFO-02: Firebase Photo URLs — Confirm Public ACL
Verify at Firebase Console that Storage bucket rules allow public read for profile photos. Document confirmation date.

### SEC-INFO-03: Enable Dependabot
Add `.github/dependabot.yml` to get automated dependency update PRs. This costs nothing and surfaces new CVEs automatically.
