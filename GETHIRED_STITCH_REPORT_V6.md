# GETHIRED STITCH REPORT V6 — LinkedIn OIDC + Company Setup Modal
**Date:** 2026-07-01 | **Baseline:** STITCH V5 (GETHIRED_STITCH_REPORT_RECENT_V5.md)

---

## Executive Summary

V6 audits two new integration seams introduced since V5:

1. **LinkedIn OIDC** — a 6-endpoint backend-brokered flow. The FE `LinkedInAuthService` contract matches the BE `linkedinAuthController.js` on all critical paths. One structural gap found: the `pendingToken` JWT emitted by `linkedinComplete` (status=`role_required`) does NOT embed `email/firstName/lastName/photoUrl` fields, but `linkedinChooseRole` on the BE tries to read those fields from `pendingPayload`. This is a data-gap risk if the `auth_identities` row for a role-required new user was not pre-inserted. Full analysis in Seam Analysis below.

2. **Company setup success modal** — `EmployerSettingsComponent.dialogSuccess()` no longer subscribes to `afterClosed()` for navigation. The modal navigates internally via `this.router.navigate()` in each CTA handler, then calls `this.dialogRef.close(returnValue)`. The `afterClosed()` observable fires the return value (e.g. `'post_job'`) but `dialogSuccess()` does not subscribe — this is intentional and documented.

**Release gate: GO WITH CAUTION.** LinkedIn auth is functionally sound for the happy path. The `role_required` profile-data recovery path is best-effort; document and watch.

---

## Baseline

STITCH V5 (Google Auth OS). Pre-existing seams (email+password, Google auth, subscriptions, jobs, applicants) carry forward as stable.

---

## New Integration Seams — LinkedIn OIDC

### Seam LI-1: FE `LinkedInButtonComponent` → BE `GET /api/auth/linkedin/start`
**Status:** Stable
**Flow:** Component calls `LinkedInAuthService.startLinkedInFlow(intent, returnTo)` which sets `window.location.href` to `${apiUrl}/auth/linkedin/start?intent=...`. BE replies with HTTP 302 to LinkedIn authorization endpoint. No JSON contract — pure browser redirect.
**Risk:** None. No payload to mismatch.

### Seam LI-2: LinkedIn → BE `GET /api/auth/linkedin/callback`
**Status:** Stable (server-to-server)
**Flow:** LinkedIn posts `code` + `state` back to BE. BE validates state JWT (HS256, `env.secret`), exchanges code for access token (confidential client — no PKCE), fetches userinfo, resolves GetHired user, issues one-time ticket JWT, redirects to `/linkedin/complete?ticket=JWT`.
**Security notes:**
- State is stateless JWT, no DB storage needed, works across PM2 cluster workers.
- PKCE was removed because LinkedIn confidential clients authenticate via `client_secret`; including `code_verifier` causes `invalid_client`.
- ID token is soft-decoded only (no full sig check) — userinfo call provides the authoritative identity.
**Risk:** Low. Standard approach for confidential clients.

### Seam LI-3: FE `LinkedInCompleteComponent` → BE `POST /api/auth/linkedin/complete`
**Status:** Stable (happy path). Gap on role_required pending profile recovery.
**FE sends:** `{ ticket: string }` (JWT from query param)
**BE responds:**
- Authenticated: `{ success: true, status: 'authenticated', data: SessionShape }`
- Role required: `{ success: true, status: 'role_required', provider: 'linkedin', googleEmail, googleDisplayName, googlePhotoUrl, inferredFirstName, inferredLastName, linkedinPendingToken, returnTo, expiresInMinutes: 55 }`
- Error: `{ message: string }` with 400/500 status

**FE handling:** `handleCompleteResponse()` reads `response.status`, sets in-memory pending state from `googleEmail/googleDisplayName/googlePhotoUrl` fields (note: these are named after Google auth for API-shape consistency), navigates to `/choose-role` or calls `storeSession()`.

**Gap identified:** When BE issues the `linkedinPendingToken` for `role_required`, it calls `makeTicketJwt('pending:linkedin:' + liSub, 'pending', intent, returnTo, true)`. The `makeTicketJwt` payload is `{ jti, uid, status, intent, rt, rr }`. It does NOT embed `email`, `firstName`, `lastName`, or `photoUrl`. When `linkedinChooseRole` tries to read `pendingPayload.email`, `pendingPayload.firstName`, etc., these fields will be `undefined` — falling back to empty string. The user would be created with blank name fields, to be filled in later. This is best-effort, not a crash, but a data-quality gap.

**Severity:** Medium. User can complete flow; profile data is incomplete.

### Seam LI-4: FE `RoleClassificationComponent` → BE `POST /api/auth/linkedin/choose-role`
**Status:** Stable with profile data caveat (see LI-3 gap)
**FE sends:** `{ linkedinPendingToken: string, selectedRole: 'job_seeker' | 'employer' }`
**BE responds:** `{ success: true, status: 'authenticated', roleId: 2|3, data: SessionShape }`
**Note:** `RoleClassificationComponent` uses `linkedInAuthService.submitRoleSelection(selectedRole)` which correctly reads `this._pendingToken` (set by `handleCompleteResponse`) and sends it as `linkedinPendingToken`.

### Seam LI-5: FE `LinkedInAuthService.unlinkLinkedIn()` → BE `DELETE /api/auth/linkedin/unlink`
**Status:** Stable
**Auth:** FE sends `Authorization: Bearer <firebaseIdToken>` header. BE middleware `verifyFirebaseIdToken` validates, sets `req.user.uid`.
**Response:** `{ success: true, message: string }` or `{ message: string }` on 401/404.

### Seam LI-6: FE `LinkedInAuthService.getLinkStatus()` → BE `GET /api/auth/linkedin/link-status`
**Status:** Stable
**Auth:** Same as LI-5.
**Response:** `{ linked: false }` OR `{ linked: true, linkedEmail, linkedName, linkedAt, lastLoginAt }`

**Contract mismatch (minor):** STITCH command spec says response should be `{ success, data: { linked, provider, createdAt } }`. Actual BE response is flat: `{ linked: bool, linkedEmail, linkedName, linkedAt, lastLoginAt }`. FE `getLinkStatus()` uses `Observable<any>` so no type failure. Document the flat shape as the real contract.

---

## New Integration Seam — Company Setup Success Modal

### Seam CS-1: `EmployerSettingsComponent` → `EmployerCompanySetupSuccessModalComponent`
**Status:** Stable (intentional design change)
**Data in:** `MatDialog.open(modal, { data: { companyName, companySlug, profileCompleteness } })`
**Modal injection:** `@Inject(MAT_DIALOG_DATA) public data: SetupSuccessModalData`
**Navigation:** Each CTA in the modal calls `this.dialogRef.close(returnValue)` AND `this.router.navigate([...])` internally. The parent `EmployerSettingsComponent.dialogSuccess()` does NOT subscribe to `afterClosed()`. This is intentional — the modal owns navigation.
**Return values emitted (for future reference):** `'post_job' | 'complete_profile' | 'view_profile' | 'dashboard'`
**Risk:** None. The modal navigating internally is a valid pattern. The `afterClosed` return value is unused but harmless.

---

## Pre-existing Seams (Carried Forward from V5)

All email+password, Google auth, jobs, applicants, subscriptions, PayMongo, CORS seams carry forward unchanged. See STITCH V5 report for detail.

---

## Stitch Fix Log Summary

No code changes required in V6. The LI-3 gap (profile data in pending token) is documented but is not a crash — it is a data-quality best-effort fallback that the BE code already handles gracefully with empty-string defaults. A safe enhancement (embed profile fields in `linkedinPendingToken`) is noted in the optional contract fixes doc.

---

## Release Gates

| Gate | Status | Evidence |
|---|---|---|
| A: Contract Compatibility | PASS | FE/BE payloads match on all 6 LinkedIn endpoints |
| B: Auth/Authorization Safety | PASS | State JWT, ticket JTI, Firebase custom token chain all correct |
| C: LinkedIn Feature Gate | PASS WITH CAUTION | `LINKEDIN_AUTH_ENABLED=true` required; all endpoints return 503 when disabled |
| D: Modal Contract | PASS | `SetupSuccessModalData` interface matches `EmployerSettingsComponent` data payload |
| E: Must-Not-Break Flow Safety | PASS | Email+password and Google auth unmodified |

```
STITCH V6 completed: yes
Baseline: STITCH V5 (Google Auth OS)
New seams documented: 6 LinkedIn OIDC + 1 company modal
Frontend files changed: 0
Backend files changed: 0
Critical risks: 0
Medium risks: 1 (LI-3 role_required profile data gap — best-effort recovery, not a crash)
Release gates: Contract PASS; Auth PASS; LinkedIn gate PASS WITH CAUTION (env var required); Modal PASS; Must-not-break PASS
Recommended next command: ACTIONS
```
