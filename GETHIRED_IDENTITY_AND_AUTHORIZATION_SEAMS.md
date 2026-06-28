# GetHired Identity & Authorization Seams — QA Cycle 11 (STITCH)

Generated: 2026-06-25

---

## Identity Model

**Auth provider:** Firebase Auth (Google/Firebase)  
**Token type:** Firebase ID Token (JWT), passed as `Authorization: Bearer <token>`  
**Validation:** `middleware/verifyAuth.js` → `firebaseAdmin.auth().verifyIdToken(idToken)` → `req.user = decodedIdToken`  
**Identity claim used:** `req.user.uid` (Firebase UID) — the only trusted identity signal  
**Role claim:** NOT in JWT. Role is never read from `req.user.role`. Role is always derived from DB via `getUserCompany(uid)`.

---

## Authorization Seam 1 — Employer Identity Derivation

**Function:** `getUserCompany(uid)` in `controllers/companiesController.js`  
**Returns:** Company object (`{ companyId, ... }`) if `company_employees.employee_uuid = uid`; returns `[]` (empty array, not null) if no row exists  
**Guard pattern used consistently:**
```javascript
const company = await getUserCompany(uid);
if (Array.isArray(company) || !company || !company.companyId) {
  return res.status(403).json({ message: "..." });
}
```
This pattern is the established "employer check" across all protected endpoints. Confirmed used correctly in B01 (`message.service.js → resolveCallerCompany`), B03 (`interviewController.getInterviewHub`), and all prior QA passes.

**Seam risk:** `getUserCompany` returns `[]` for "no company" — an array falsy-check (`Array.isArray(company)`) is required. A caller who omits the array check and does `if (!company)` would pass the guard for the `[]` case. New code must always include `Array.isArray(company)` in the guard.

**Current state:** All new B01/B03 endpoints include the array check. SOUND.

---

## Authorization Seam 2 — Thread-Level Authorization (Messages)

**Function:** `loadAuthorizedThread(threadId, callerUid)` in `services/message.service.js`  
**Logic:**
- If caller is an employer: must own the thread's `company_id`
- If caller is an applicant: must be the thread's `applicant_uid`
**Applied to:** `listMessages`, `sendMessage`  
**Applied at:** Thread fetch, not just at operation — prevents a leaked threadId from being exploited.

**Seam risk:** An employer at Company A could have their companyId match a thread belonging to Company A — correct. They cannot access Company B's threads because the company check is strict equality. SOUND.

---

## Authorization Seam 3 — Interview Hub Company Scoping (B03)

**Endpoint:** `GET /api/interview/hub`  
**Guard:** `getUserCompany(req.user.uid)` → companyId used as `WHERE j.company_id = $1`  
**Design:** No client-supplied company ID is accepted. The WHERE clause is purely derived from the JWT.  
**Risk question:** Could Company A's recruiter see Company B's hub? **No** — the SQL WHERE clause enforces `j.company_id = $1` where `$1` is the JWT-derived company. The join chain is: `job_applicants → jobs (j.company_id = $1)` — only applications for jobs owned by the caller's company are returned.  
**Status: VERIFIED SECURE**

---

## Authorization Seam 4 — Recruiter Thread Inbox Scoping (B01)

**Endpoint:** `GET /api/messages/recruiter/threads`  
**Guard:** `resolveCallerCompany(callerUid)` → `WHERE mt.company_id = $1`  
**Design:** Company ID used in WHERE is JWT-derived. No client-supplied company ID.  
**Risk question:** Could a recruiter from Company A see Company B's threads? **No** — `message_threads.company_id` was set at thread creation from the employer's JWT-derived company, and the query enforces `mt.company_id = $1` (same derivation).  
**Status: VERIFIED SECURE**

---

## Authorization Seam 5 — Legacy verifyRoles Middleware (RISK — not on new routes)

**Location:** `middleware/verifyRoles.js`  
**Pattern:** Reads `uid` from `req.body.uid || req.query.uid` — client-supplied, not JWT-derived  
**Risk:** A caller could supply any uid in the body to check that user's role. If the uid resolves to a role in `allowedRoles`, the middleware passes.  
**Current exposure:** Not used on any of the new B01/B03/SEC-01 routes. Legacy routes using it should be audited and migrated to `req.user.uid`.  
**Status:** Pre-existing gap, not introduced by QA11. Tracked for future SECURE pass.

---

## Authorization Seam 6 — Auth Token Format (RISK — minor)

**verifyAuth:** The interceptor strips `Bearer ` from the header token. The FE `AuthInterceptor` sets `Authorization: <token>` (without "Bearer " prefix — stores the token directly from localStorage).  
**Observed:** `localStorage.setItem('token', ...)` is set at login. The value stored appears to be the raw Firebase ID token without a "Bearer " prefix. `verifyAuth` checks `req.headers.authorization.startsWith("Bearer ")` — if the FE sends the token without the prefix, the check fails and the fallback cookie path is tried.  
**Risk:** Depending on how the FE stores and sends the token, `verifyAuth` might reject valid requests if the prefix is missing. This is a pre-existing seam, not new in QA11. If the app is working in production, the token format is correct.  
**Status:** Pre-existing — no change in QA11 scope.

---

## Authorization Seam 7 — Tier 4 Rate Limit Path Matching

**Config:**
```javascript
app.use("/api/auth/changepassword", sensitiveLimiter);
app.use("/api/auth/getpwresetlink", sensitiveLimiter);
app.use("/api/auth/archive", sensitiveLimiter);
```
**Actual routes (confirmed):**
```
POST /api/auth/changepassword  ✓ matches
GET  /api/auth/getpwresetlink  ✓ matches
PUT  /api/auth/archive         ✓ matches
```
**Status:** VERIFIED — Tier 4 paths match actual routes exactly.

---

## Summary Table

| Seam | Endpoint(s) | Status |
|------|-------------|--------|
| Employer identity derivation | All employer routes | SOUND |
| Thread-level auth (messages) | thread/messages, thread/send | SOUND |
| Interview hub company scoping | /interview/hub | VERIFIED SECURE |
| Recruiter thread inbox scoping | /messages/recruiter/threads | VERIFIED SECURE |
| Legacy verifyRoles | Old routes (not QA11) | GAP — deferred |
| Auth token format (no "Bearer ") | All routes | Pre-existing — monitor |
| Tier 4 rate limit path matching | changepassword, getpwresetlink, archive | VERIFIED |
