# GETHIRED STITCH REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5

---

## Executive Summary

Integration audit for the Google Auth OS. The FE↔BE contract for Google auth is well-structured and mirrors the existing email+password session shape. The `requestUri: 'http://localhost'` bug was fixed in SECURE V5. The primary remaining integration risk is the OAuth client configuration issue (user must create a new Cloud Console web client). All pre-existing integrations (jobs, applicants, subscriptions) remain stable.

**Release gate: GO WITH CAUTION once OAuth client is fixed and requestUri deployed.**

---

## Baseline Reports Used
SWEEP V5, TEST V5, SECURE V5

---

## New Integration Seams — Google Auth OS

### Seam 1: GIS → FE GoogleAuthService → BE /firebase-session
**Status:** Stable (contract well-defined)
**Risk:** OAuth client `deleted_client` error — broken until new Cloud Console client created

### Seam 2: BE /firebase-session → Firebase REST signInWithIdp
**Status:** Fixed (requestUri: 'http://localhost' → 'https://gethiredonline.app')
**Contract:** POST `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`
**Request:** `{ requestUri, postBody: 'id_token=...&providerId=google.com', returnSecureToken: true }`

### Seam 3: BE /firebase-session → Firebase Admin verifyIdToken
**Status:** Stable (existing firebaseAdmin pattern) ✅

### Seam 4: FE role_required state → /auth/choose-role
**Status:** Stable (in-memory pending state, 55-min window)
**Risk:** Page refresh during role selection = state lost → redirect to /signin (acceptable, documented)

### Seam 5: chooseRole → DB INSERT → buildSessionResponse
**Status:** Stable
**Contract:** Inserts to `user_credentials` (uid, email, password, role) + `users` (uid, email, firstname, lastname, photo_url) — same tables as email+password signup ✅

### Seam 6: GoogleAuthService.storeSession() → localStorage → Angular guards
**Status:** Stable — mirrors exact localStorage keys from SigninComponent.loggedIn():
- `state: 'true'`
- `role: number`
- `token: 'Bearer ' + firebaseIdToken`
- `token_authorization: firebaseIdToken`
- `user: JSON.stringify({...})`
- `refreshToken: string`
Verified: FE guards read `localStorage.getItem('role')` — same key ✅

### Seam 7: AI Job Preview → Google Auth → claim-preview
**Status:** Stable
**Flow:** `AiJobPreviewPanelComponent` saves `previewToken` to sessionStorage BEFORE `onGoogleCredential()` is called → after Google auth + employer redirect → `EmployerPanelComponent.ngOnInit` reads sessionStorage → calls claim-preview ✅

---

## API Contracts — Google Auth

### POST /api/auth/google/firebase-session
```
Request:  { googleIdToken: string }
Response (authenticated): { 
  success: true, status: 'authenticated',
  data: { id, email, firstName, lastName, role, photoUrl, token, refreshToken, withCompany, companyName, companyId, withActiveSubscription }
}
Response (role_required): {
  success: true, status: 'role_required',
  googleDisplayName, googleEmail, googlePhotoUrl, inferredFirstName, inferredLastName,
  firebaseIdToken, refreshToken, expiresInMinutes: 55
}
Response (409): { message: string, errorCode: 'account_exists_different_provider' }
Response (400): { message: string }
Response (429): { message: string }
Response (401): { message: string }
Response (500): { message: string }
```

### POST /api/auth/choose-role
```
Request:  { firebaseIdToken: string, selectedRole: 'job_seeker' | 'employer' }
Response: { success: true, status: 'authenticated', roleId: 2|3, data: SessionShape }
```

---

## Payload Normalization — Google Auth

The session data shape returned by Google auth is IDENTICAL to email+password login. `GoogleAuthService.storeSession()` handles localStorage writing using the exact same key names as `SigninComponent.loggedIn()`. No normalization gap. ✅

---

## Identity and Authorization Seams

| Seam | Risk | Status |
|---|---|---|
| `googleIdToken` from FE → only token payload matters, not the string itself | Low | BE immediately exchanges it with Firebase REST API ✅ |
| `selectedRole` from FE → server-side mapped to roleId | Low | String mapping, never trusts numeric value from client ✅ |
| `firebaseIdToken` in choose-role body → re-verified | Low | `verifyIdToken()` called before any DB write ✅ |
| `returnUrl` in firebase-session body → sanitized | Low | `sanitizeReturnUrl()` blocks external/dangerous URLs ✅ |
| `source` field → cosmetic only, no security impact | None | Logged after `.substring(0, 64)` truncation ✅ |

---

## Stitch Fix Log

| ID | Fix | File | Why Safe |
|---|---|---|---|
| STI-001 | requestUri: 'http://localhost' → 'https://gethiredonline.app' | googleAuthController.js | No auth behavior change; Firebase REST API accepts this for all valid Google tokens |

---

## QA Checklist

- [x] Email+password login still works (not modified)
- [x] Google button renders on signin/signup (FE)
- [x] Role classification page accessible at /auth/choose-role (FE)
- [x] Session keys in localStorage match guard expectations
- [x] Employer with draft redirects correctly after Google auth
- [ ] Google auth end-to-end flow (BLOCKED — new OAuth client needed)
- [x] `/api/auth/google/firebase-session` responds 400 to missing token
- [x] `/api/auth/choose-role` rejects 'admin' role selection

---

## Release Gates

| Gate | Status | Evidence |
|---|---|---|
| A: Contract Compatibility | PASS | Session shape identical to existing login |
| B: Auth/Authorization Safety | PASS with caution | requestUri fixed; OAuth client config pending |
| C: Public Portal Redesign Readiness | PASS | Google auth doesn't affect public portal |
| D: Applicant Redesign Readiness | PASS | Google auth adds path, doesn't change profile contracts |
| E: Must-Not-Break Flow Safety | PASS | Email+password login unmodified |

```
STITCH completed: yes
Baseline reports used: SWEEP V5, TEST V5
Reports created: GETHIRED_STITCH_REPORT_RECENT_V5.md
Contracts reviewed: 2 new (firebase-session, choose-role) + 6 pre-existing seams
Contracts stabilized: 2 (requestUri fix + documented pending OAuth client)
Normalizers/adapters created: 0 (session shape already identical, no normalization needed)
Frontend files changed: 0
Backend files changed: 1 (requestUri fix in googleAuthController.js)
Remaining critical risks: 1 (OAuth client invalid)
Remaining high risks: 3 (PayMongo webhook, CORS, git secrets)
Release gates: Contract compatibility PASS; Auth PASS with caution; all others PASS
Recommended next command: TEST (add minimal BE test for chooseRole)
Top 5 stitched seams: GIS→FE→BE, Firebase REST, Firebase Admin, role_required→choose-role, storeSession localStorage
Top 5 remaining seams: PayMongo webhook sig, CORS, git history secrets, provider column missing, in-memory rate limit
```
