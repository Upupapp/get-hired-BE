# GetHired Anti-Corruption Layer Guide — QA Cycle 11 (STITCH)

Generated: 2026-06-25

---

## What Is the ACL in GetHired's Context

GetHired has three external trust boundaries where data comes in that must not be trusted as-is:
1. Firebase JWT — user identity from Google/Firebase Auth
2. Client request body/query — user-supplied IDs, filters, content
3. Firebase Storage — URLs stored in the DB that reference external file hosting

The anti-corruption layer is the set of guards that prevent boundary leakage. This guide documents the current state and any gaps.

---

## ACL-01 — Firebase JWT Trust Boundary (SOUND)

**Pattern established:** `verifyAuth` middleware validates the Firebase JWT via `firebaseAdmin.auth().verifyIdToken()`. After validation, `req.user.uid` is the only trusted identity signal. No role claim is ever read from the token (`req.user.role` is never used in any controller — confirmed by grep). Role derivation always goes through `getUserCompany(uid)` → DB lookup.

**Status:** SECURE. All new B01/B03/SEC-01 endpoints follow this pattern correctly.

---

## ACL-02 — Client-Supplied Company IDs (SOUND for new endpoints, gap on old)

**New endpoints (B01, B03):** Company ID is never accepted from the client. Both `listRecruiterThreads` and `getInterviewHub` derive `companyId` exclusively from `getUserCompany(req.user.uid)`. A caller who spoofs a company ID in the body/query will be ignored.

**Old interview endpoints (getall, getalltemplates, getallrecipients):** Accept `companyId` as a query param, but `callerBelongsToCompany(req.user.uid, companyId)` validates that the caller's JWT-derived company matches the param before returning data. This is an acceptable pattern (verify, don't derive) — it allows multi-company memberships in future, but is not a vulnerability as written.

**verifyRoles middleware (legacy, not on new routes):** Reads `uid` from `req.body.uid` or `req.query.uid` rather than from the Firebase JWT. This is a residual anti-pattern — the uid should always come from `req.user.uid`. Not on any new endpoints; tracked as a cleanup item.

**Status:** New endpoints SECURE. Legacy verifyRoles is a deferred cleanup.

---

## ACL-03 — Firebase Storage URL Boundary (RISK)

**Problem:** `photo_url` stored in `gethired.users` is a Firebase Storage download URL obtained via `uploadTask.snapshot.ref.getDownloadURL()`. Firebase Storage URLs contain an access token (`?token=...`) that can expire. The expiry behavior depends on bucket security rules:
- Public bucket: URLs never expire (static path)
- Private bucket (default): Token-based URLs typically have a 7-day default TTL, but some configurations make them indefinitely valid

**Current code:** The URL is stored at upload time and never refreshed. When a URL expires, `<img [src]="...">` silently 404s.

**FIX F-02 (Applied):** FE avatar image now has `(error)="t['_photoError'] = true"` with conditional rendering — broken URL falls back to initials. Applied to `recruiter-messages.component.html`. The interview hub template does not render `applicantPhotoUrl` as an img (it's in the data model but not displayed in the card template yet) — no fix needed there for now.

**Remaining gap:** The `applicantPhotoUrl` field is in `InterviewHubItem` and the interface has it typed, but the hub template (`recruiter-interview-hub.component.html`) doesn't currently render it. If/when avatar rendering is added to the hub template, the same `(error)` pattern must be applied.

---

## ACL-04 — Message Body Input (SOUND)

**Input boundary:** Message body from `req.body.body`.  
**Guards:**
- Empty check: `if (!body || !body.trim())` → 400 MESSAGE_BODY_REQUIRED
- Length cap: `body.trim().length > 4000` → 400 MESSAGE_BODY_TOO_LONG
- FE: `maxlength="4000"` on textarea (UI-level, not security-critical)

**Status:** SECURE.

---

## ACL-05 — File Upload Boundary (SOUND)

**Magic-byte verification:** `helpers/fileSignature.js` verifies the actual file bytes match the declared MIME type before upload to Firebase Storage. Applied at `helpers/uploader.js` line 23.

**Gap:** Video uploads (`withCodecs != 0`) bypass the magic-byte check (documented in uploader.js). Not applicable to the QA11 deployment scope but remains an open risk.

**Status:** SOUND for images/documents. Video path unverified — pre-existing.

---

## ACL-06 — 429 Rate Limit Response (GAP — no client ACL)

**Problem:** The FE has no ACL for 429 responses. `UnAuthorizedInterceptor` only handles 401/403. A 429 from any tier falls through to component-level error handlers, which show generic "operation not successful" errors with no backoff guidance to the user.

**Impact:** Low in practice (recruiter doing many writes in 15min is a legitimate edge case; 100 POSTs/15min is generous). But if a recruiter bulk-opens many threads rapidly, they could hit Tier 3 with no useful feedback.

**Recommendation:** Add 429 handling to `UnAuthorizedInterceptor` — show a snackbar with a "slow down" message and the retry-after time from the `RateLimit-Reset` header.

**Status:** Gap documented; not applied (would require modifying UnAuthorizedInterceptor and reading response headers — deferred to NOTIFY/OPTIMIZE pass).
