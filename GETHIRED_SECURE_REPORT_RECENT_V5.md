# GETHIRED SECURE REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, TEST V5

---

## Executive Summary

Security audit of the Google Auth OS addition to GetHired. Strong foundation — existing P0 BOLA/SQLi/hardcoded-password fixes from prior SECURE runs verified as still holding. New Google Auth code is architecturally sound with correct server-side role enforcement. Two new P1 findings: `requestUri: 'http://localhost'` and in-memory IP rate limit. The live P0 is the `deleted_client` OAuth error (config issue, not a code vulnerability).

**Release Gate: NO-GO UNTIL OAuth client issue resolved. GO WITH CAUTION on all other gates.**

---

## P0 Checks

| Check | Status | Evidence |
|---|---|---|
| Admin via Google Auth blocked | ✅ PASS | `chooseRole` only maps `job_seeker`→3, `employer`→2; anything else → 400 |
| Client-supplied role not trusted | ✅ PASS | `roleId` derived server-side from enum mapping |
| Firebase token re-verified in choose-role | ✅ PASS | `firebaseAdmin.auth().verifyIdToken(firebaseIdToken)` called again |
| No Google token in URLs/logs | ✅ PASS | Tokens never logged; UID truncated to 8 chars in logs |
| No Gmail/Drive/Calendar scopes | ✅ PASS | GIS `initialize()` requests no scopes beyond email/openid (GIS default) |
| BOLA fixes still hold | ✅ PASS | `getUserCompanyForRequest(req, uid)` pattern verified in employer routes |
| SQL injection fixes still hold | ✅ PASS | All 8 previously-fixed controllers still parameterized |
| Hardcoded invite password gone | ✅ PASS | Random password + Firebase reset link in place |
| CV/contacts routes protected | ✅ PASS | `verifyAuth` middleware on all three route files |

---

## New P1 Findings (Google Auth OS)

### GA-SEC-001 — requestUri: 'http://localhost' (P1)
**File:** `controllers/googleAuthController.js:56`
**Issue:** Firebase REST `signInWithIdp` requires `requestUri` to match an authorized domain in the Firebase project. `http://localhost` works in dev but may fail in strict Firebase project configurations. Should be `https://gethiredonline.app`.
**Fix:**
```javascript
requestUri: 'https://gethiredonline.app',
```
**Status:** Open — fix required before Google Auth can be fully verified.

### GA-SEC-002 — In-memory IP rate limit (P1-Low)
**File:** `controllers/googleAuthController.js:14-24`
**Issue:** `ipRateCounts` object resets on PM2 restart or server crash. An attacker who triggers a restart (or knows the restart schedule) can bypass the 10-request/15-min limit.
**Mitigation (low effort):** Use `express-rate-limit` (already installed) on the route instead of manual in-memory tracking. This persists across requests within the same process and is more standard.
**Status:** Documented — acceptable for now given auth also requires valid Google ID token.

### GA-SEC-003 — No provider column in user_credentials (P2)
**File:** `controllers/googleAuthController.js:302`
**Issue:** Google-created accounts stored with `hashPassword(uid + '_google_provider')` as password. Cannot distinguish Google vs. email+password accounts at DB level. If user later tries email+password signup with same email, they will get EMAIL_EXISTS from Firebase (correct) but the 409 response tells them to use email+password — which would fail as they never set a password.
**Impact:** Poor UX for account-linking edge case. No security risk.
**Recommendation:** Add `provider` column (`'email'` | `'google'`) to `user_credentials` in a future migration.

---

## Previously Fixed — Verified Holding

| Fix | Status |
|---|---|
| PayMongo webhook: still no signature verification | ❌ STILL OPEN P1 |
| CORS: `app.use(cors())` still wide-open | ❌ STILL OPEN P1 |
| Git history secrets: not yet purged | ❌ STILL OPEN P0 |
| Easy Job Post extraction rate limit | ❌ STILL OPEN P1 |
| BOLA employer routes | ✅ Fixed, verified |
| SQLi parameterization | ✅ Fixed, verified |
| Hardcoded password | ✅ Fixed, verified |
| Upload MIME magic-byte validation | ✅ Fixed, verified |
| Message body length cap | ✅ Fixed, verified |

---

## Google Auth Security Design Review

**GIS → BE → Firebase Admin chain:**
```
FE (GIS callback) 
→ BE /api/auth/google/firebase-session 
→ Firebase REST signInWithIdp (verifies Google JWT) 
→ Firebase Admin verifyIdToken (double verification) 
→ DB lookup / user creation
```
This double-verification chain is architecturally sound. The intermediate Firebase ID token returned to FE for `role_required` state is acceptable (1hr expiry, re-verified before account creation).

**Account linking gap:** The 409 EMAIL_EXISTS path correctly tells users to use email+password. However, it should also suggest the user might have signed up with email+password and should not use Google for that account (until account linking is built). Current message is adequate but could be clearer.

**Dummy password for Google accounts:** `hashPassword(uid + '_google_provider')` is bcrypt-hashed and never returned to client. A Google-created user cannot log in with email+password because Firebase would reject their password attempt. Safe ✅.

---

## External Actions Required

1. **Create new OAuth 2.0 Web Client in Google Cloud Console** (Web application type, Origin: `https://gethiredonline.app`) — paste new Client ID to developer to update environment files
2. **Rotate Firebase service account JSON** (in git history)
3. **Rotate SSH keys** (in git history)
4. **Purge git history** — BFG Repo Cleaner or `git filter-repo` for both repos
5. **Add PayMongo webhook signing secret** from PayMongo dashboard, implement signature verification
6. **Configure CORS allowlist** with real production domains

---

## Secure Fix Log

| ID | Fix | File | Risk |
|---|---|---|---|
| GA-SF-001 | Add `requestUri: 'https://gethiredonline.app'` | `googleAuthController.js:56` | Low — no behavior change for valid tokens |

Applying now:
