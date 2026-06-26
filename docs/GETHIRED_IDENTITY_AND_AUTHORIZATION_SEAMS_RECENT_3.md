# GETHIRED Identity and Authorization Seams — STITCH 3 (Recent Deployment)
_Generated: 2026-06-26_

---

## Seam 1 — Firebase Auth (verifyAuth) — Core Identity

**File:** `middleware/verifyAuth.js`

**Token source:** `Authorization: Bearer <Firebase ID Token>` header, or `__session` cookie.

**On success:** `req.user = decodedIdToken` (Firebase decoded token, includes `uid`, `email`, etc.)

**On failure:**
- No auth header/cookie → `403 "Unauthorized"` (plain string)
- Expired token → `403 "Token Expired. Login again."` (plain string)
- Invalid token → `403 "Authentication failed."` (plain string)

**Changed in this deployment:** Error body changed from raw Error object to plain string. FE interceptor (`UnAuthorizedInterceptor`) branches on `err.status` only — body is ignored. **No integration risk.**

**Routes using verifyAuth (all employer/applicant protected routes):**
- POST/DELETE/PUT/GET `/contacts/*` and `/groups/*`
- POST/DELETE/PUT/GET `/candidates/*`
- POST/PUT/DELETE/GET `/job/*` (protected routes)
- GET `/applicant/profile`
- GET `/admin/userprofile`
- (all other protected employer/applicant endpoints)

---

## Seam 2 — Optional Firebase Auth (optionalVerifyAuth)

**File:** `middleware/optionalVerifyAuth.js`

**Behavior:**
- No auth header/cookie → `req.user = null`, proceed (anonymous)
- Valid token → `req.user = decodedToken`, proceed (authenticated)
- Invalid/expired token → `401 JSON` (not silent passthrough — active tokens must be valid)

**Routes using optionalVerifyAuth:**
- `GET /job/details`
- `GET /job/sharelink`

**No changes in this deployment.**

---

## Seam 3 — Company Ownership (JWT-Derived, Not Caller-Supplied)

**Pattern (all employer controllers):**
```javascript
const callerCompany = await getUserCompany(req.user.uid);
if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
  return res.status(403).json({ message: "You don't have permission to do that." });
}
const companyId = callerCompany.companyId;
```

**What this enforces:** Company ID for all data operations is derived from the authenticated Firebase UID, never from request body/query. This prevents horizontal privilege escalation (one employer accessing another's data).

**Controllers verified in STITCH 3:**
- `contactsController.js`: createContact, multipleContact, deleteContact, updateContact, list, grouplist, createGroup, updateGroup, contactslist, deleteGroup, list2 — all derive companyId from JWT.
- `candidateController.js`: createCandidate, multipleCandidate, deleteCandidate, updateCandidate, list — all derive companyId from JWT.

**No changes to ownership pattern in this deployment — verified stable.**

---

## Seam 4 — RESPONSE Token (SSR Identity for Status Codes)

**File:** `server.ts:38-47`

**Provider:**
```typescript
{ provide: RESPONSE, useValue: res }
```
The Express `res` object is provided as the RESPONSE token value on every SSR request. This gives Angular components the ability to set HTTP status codes on the server-rendered response.

**Consumer:** `job-posts-details.component.ts`
```typescript
@Optional() @Inject(RESPONSE) private response: any
// ...
if (isPlatformServer(this.platformId) && this.response) {
  this.response.status(404);
}
```

**Security implication:** Components can only set status codes (not hijack the response, inject headers, etc.) because the `response` object is Express's `res` and the only method called is `.status()`. No SSRF or response-splitting risk.

**Status: PASS. Correctly wired.**

---

## Seam 5 — verifyRoles (Currently Dead Code)

**File:** `middleware/verifyRoles.js`

**Current status:** Not imported or used by any route file. Dead code.

**Fixed in this deployment:** `req.user?.uid` → `req.user && req.user.uid` (esm v3.2.25 compatibility).

**Future risk:** If ever wired to a route, must be placed AFTER `verifyAuth`. The middleware comment at line 20 documents this requirement.

**Authorization model if activated:**
1. `verifyAuth` runs first — sets `req.user.uid` from Firebase JWT
2. `verifyRoles(allowedRoles)` runs second — looks up role from DB, compares to `allowedRoles`
3. If role matches: `next()`
4. If role does not match: `401 { message: "User not allowed to access this API" }`

**No routes currently use verifyRoles. No change in behavior from this deployment.**

---

## Authorization Matrix

| Resource | Endpoint | Auth Required | Ownership Check | Role Check |
|----------|----------|---------------|-----------------|------------|
| Contacts | POST /contacts/addcontact | verifyAuth | companyId from JWT | None |
| Contacts | POST /contacts/multiplecontact | verifyAuth | companyId from JWT | None |
| Contacts | DELETE /contacts/deletecontact | verifyAuth | company_id in WHERE | None |
| Contacts | PUT /contacts/updatecontact | verifyAuth | company_id in WHERE | None |
| Contacts | GET /contacts/list | verifyAuth | companyId from JWT | None |
| Groups | POST /groups/creategroup | verifyAuth | companyId from JWT | None |
| Groups | PUT /groups/updategroup | verifyAuth | company_id in WHERE | None |
| Groups | DELETE /groups/deletegroup | verifyAuth | company_id in WHERE | None |
| Candidates | POST /candidates/addcandidate | verifyAuth | companyId from JWT | None |
| Candidates | POST /candidates/multiplecandidate | verifyAuth | companyId from JWT | None |
| Candidates | DELETE /candidates/deletecandidate | verifyAuth | company_id in WHERE | None |
| Candidates | PUT /candidates/updatecandidate | verifyAuth | company_id in WHERE | None |
| Jobs (public) | GET /job/published | None | None | None |
| Jobs (detail) | GET /job/details | optionalVerifyAuth | None (public) | None |
| Jobs (create) | POST /job/create | verifyAuth | companyId from JWT | None |
| Jobs (manage) | PUT/DELETE /job/* | verifyAuth | companyId from JWT | None |
| Applicants | GET /job/applicants | verifyAuth | company ownership | None |
| SSR 404 signal | RESPONSE token | N/A (SSR only) | N/A | N/A |
