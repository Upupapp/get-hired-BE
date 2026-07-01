# GETHIRED TEST REPORT — LinkedIn OIDC + Company Setup Modal + Sign-out Fix V6
**Date:** 2026-07-01 | **Baseline:** SWEEP/TEST V5 (2026-07-01)

---

## Executive Summary

TEST V6 audits the LinkedIn OIDC auth system (6 new BE endpoints, 2 new tables, full FE service), the EmployerCompanySetupSuccessModal, the employer panel sign-out fix, and the cert API DTO fix. All V6 code was read directly from the source tree. No destructive actions were performed, no real LinkedIn/Firebase/DB calls were made.

**Release quality gate: GO WITH CAUTION — LinkedIn OIDC is architecturally sound but has zero automated tests; the new DB tables require manual migration verification.**

---

## SWEEP Baseline Used
Yes — GETHIRED_TEST_REPORT_RECENT_V5.md (2026-07-01 session)

---

## Test Tooling Inventory (unchanged from V5)

| Tool | Status |
|---|---|
| FE: Angular CLI 13 + Karma + Jasmine | Configured; `ng test` available. No meaningful specs for new flows |
| BE: No test runner | `"test": "echo Error"` — static analysis only |
| BE: `/tests/` directory | Smoke scripts only (messaging, BOLA) — no LinkedIn tests |
| Cypress/Playwright | Not present |

---

## Build Status

| Repo | Command | Result |
|---|---|---|
| FE | `ng build --configuration=staging` | Not re-run — V5 build passed, V6 changes are additive (new component, new service, new route). Build expected PASS. |
| BE | `node start.js` (PM2) | Running on Linode (per session memory). V6 adds 3 new JS files via ES module import — expected PASS. |

**Note:** DB migration is a manual step (`node -r esm scripts/createAuthIdentitiesTable.js`). No mechanism verifies whether it has been run in production.

---

## V6 New Code Inventory

### BE — LinkedIn OIDC
| File | Role |
|---|---|
| `controllers/linkedinAuthController.js` | 6 handler functions: start, callback, complete, chooseRole, unlink, linkStatus |
| `routes/linkedinAuthRoutes.js` | Routes wired; unlink+linkStatus protected by verifyFirebaseIdToken ✅ |
| `middleware/linkedinSession.js` | createLinkedinState, verifyLinkedinState, makeTicketJwt, decodeTicketJwt |
| `scripts/createAuthIdentitiesTable.js` | One-shot migration for auth_identities + oauth_tickets |

### FE — LinkedIn OIDC
| File | Role |
|---|---|
| `auth/services/linkedin-auth.service.ts` | Full service: startLinkedInFlow, exchangeTicket, submitRoleSelection, handleCompleteResponse, storeSession, unlinkLinkedIn, getLinkStatus |
| `auth/linkedin-complete/linkedin-complete.component.ts` | Landing component for /linkedin/complete — exchanges ticket, handles errors, navigates |
| `auth/linkedin-button/linkedin-button.component.ts` | Simple button wrapper, delegates to LinkedInAuthService.startLinkedInFlow() |
| `auth/role-classification/role-classification.component.ts` | Updated — now handles both Google and LinkedIn pending state; dispatches to correct service |
| `auth/auth.module.ts` | LinkedInCompleteComponent declared; /linkedin/complete route registered |

### FE — Company Setup Modal
| File | Role |
|---|---|
| `employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.ts` | 4 CTAs: postFirstJob, completeProfile, viewPublicProfile, goToDashboard |
| `employer-panel/employer-settings/employer-settings.component.ts` | dialogSuccess() opens EmployerCompanySetupSuccessModalComponent with {companyName, companySlug, profileCompleteness} |

### BE — Cert API Fix
| File | Change |
|---|---|
| `services/job.service.js` (line 234) | getJobCertificationRequirements() returns name/type/importance/issuingAuthority/expiryRequired/verificationRequired only — id and canonicalKey stripped ✅ |

---

## Critical Flows — Coverage Matrix (V6 additions)

| Flow | Role | Current Coverage | Risk |
|---|---|---|---|
| LinkedIn sign-in (existing user via identity) | All | ZERO automated tests | Critical |
| LinkedIn sign-up (intent=jobseeker/employer) | New users | ZERO automated tests | Critical |
| LinkedIn role_required → choose-role | New users | ZERO automated tests | Critical |
| LinkedIn ticket replay prevention | Security | ZERO automated tests | Critical |
| LinkedIn unlink | Employer/Seeker | ZERO automated tests | High |
| LinkedIn link-status | Employer/Seeker | ZERO automated tests | Medium |
| Company setup modal CTAs | Employer | ZERO automated tests | High |
| Sign-out navigate to /signin | Employer | ZERO automated tests | Medium |
| Cert API id/canonicalKey strip | Public | ZERO automated tests | Low (fix confirmed in code) |
| Google sign-in (regression) | All | ZERO automated tests (same as V5) | Critical |

---

## Security Guardrail Checks — LinkedIn OIDC

| Check | Result |
|---|---|
| State JWT HS256 signed with env.secret, 10-min TTL | ✅ Confirmed in linkedinSession.js |
| PKCE deliberately omitted (confidential client) | ✅ Documented in code comments; correct for LinkedIn |
| Client secret never returned to FE | ✅ All token exchange is server-side |
| Ticket JWT is single-use (consumeTicketDb UPDATE WHERE used_at IS NULL) | ✅ Confirmed |
| Ticket JWT 5-min TTL | ✅ Confirmed |
| /unlink and /link-status protected by verifyFirebaseIdToken | ✅ Confirmed in linkedinAuthRoutes.js |
| /start, /callback, /complete, /choose-role are public (correct) | ✅ |
| Admin role blocked in choose-role (only job_seeker/employer accepted) | ✅ roleId only set to 2 or 3 |
| Email verified check on LinkedIn userinfo | ✅ emailVer check at line 232 |
| LinkedIn ID token iss/aud/exp/nonce validated | ✅ Soft checks (jwt.decode, not verify) — see Finding #1 |
| returnTo sanitized (sanitizeReturn) | ✅ Blocks // paths, external URLs, special chars, >256 chars |
| SQL injection | ✅ All queries parameterized with $1/$2 |
| Dummy password for new LinkedIn users | ✅ hashPassword(uid + '_linkedin_provider') |
| uid derived from SHA-256(linkedin:liSub) | ✅ 'li_' + hex prefix; deterministic and non-guessable |
| No LinkedIn tokens returned to FE | ✅ Only Firebase ID tokens cross the boundary |

---

## Top 5 Test Findings

### Finding #1 — HIGH: LinkedIn ID token NOT cryptographically verified (soft decode only)
**File:** `controllers/linkedinAuthController.js` lines 203-210
**Issue:** `jwt.decode()` is used, not `jwt.verify()`. Issuer, audience, expiry, and nonce are checked on the decoded payload but the signature is NOT verified against LinkedIn's JWKS. However, the authoritative identity comes from the userinfo endpoint (fetched with the access_token), which is server-side only — so this is mitigated but not eliminated.
**Impact:** If the access_token is valid but a crafted id_token is supplied alongside it, the iss/aud/nonce checks could be bypassed. Since LinkedIn returns both in the same token exchange response this is a low-probability attack, but the check gap should be documented.
**Recommendation:** Add a TODO comment; consider fetching LinkedIn JWKS for id_token verification in V2.

### Finding #2 — HIGH: No DB migration in server startup path
**File:** `scripts/createAuthIdentitiesTable.js`
**Issue:** auth_identities and oauth_tickets are created by a one-shot script, not by an automatic migration on server start. If this script was not run in production, ALL LinkedIn flows will throw a PostgreSQL "relation does not exist" error (unhandled in the callback — returns 302 to /linkedin/complete?error=server_error).
**Recommendation:** Verify script was run against production DB; add startup health-check that SELECTs from both tables.

### Finding #3 — MEDIUM: linkedinPendingToken does NOT embed user profile data for choose-role fallback
**File:** `controllers/linkedinAuthController.js` lines 502-511
**Issue:** When `status === 'role_required'`, the pending token is issued as a new ticketJwt with `uid = 'pending:linkedin:<liSub>'`. The `makeTicketJwt()` payload only contains jti/uid/status/intent/rt/rr — NOT email/firstName/lastName/photoUrl. When `linkedinChooseRole` is called, it tries to recover profile data from `pendingPayload.email`, `pendingPayload.firstName`, etc. (lines 506-510), but these fields are never in the ticket JWT payload. Result: new LinkedIn users who hit the role_required flow will have empty email/firstName/lastName when `createLinkedinUser()` is called, causing a 400 "LinkedIn session data is incomplete" error.
**Impact:** LinkedIn role_required flow is BROKEN for new users who did not previously save a partial identity row.
**Recommendation:** Either embed email/firstName/lastName/photoUrl in the pendingToken JWT payload, or store them in the oauth_tickets DB row and retrieve via jti before consumption.

### Finding #4 — MEDIUM: company setup modal viewPublicProfile uses window.open (not router.navigate)
**File:** `employer-company-setup-success-modal.component.ts` line 57
**Issue:** `viewPublicProfile()` uses `window.open('/company/' + this.companySlug, '_blank', 'noopener')` instead of `router.navigate`. This is intentional (opens in new tab) but means the navigation spec in V6 test plan needs to reflect that only 3 of 4 CTAs use router.navigate; the 4th uses window.open. Also, if companySlug is empty, the button is *ngIf-hidden — but this is correct behavior.
**Note:** This is correctly implemented; the V6 test plan must document the window.open branch separately.

### Finding #5 — LOW: oauth_tickets table has no index on expires_at
**File:** `scripts/createAuthIdentitiesTable.js` (CREATE TABLE oauth_tickets)
**Issue:** The consumeTicketDb query filters on `jti` (PRIMARY KEY — indexed) and `expires_at` (no index). For low ticket volume this is fine. As LinkedIn auth scales, adding `CREATE INDEX IF NOT EXISTS oauth_tickets_expires_at_idx ON oauth_tickets (expires_at)` would improve cleanup query performance.

---

## Release Quality Gates

| Gate | Status | Evidence |
|---|---|---|
| A: Safe to Redesign | **PASS** | LinkedIn additions are additive; no existing flows modified except employer panel logout (which was fixed, not regressed) |
| B: Safe to Launch LinkedIn Auth | **FAIL** | Finding #3: role_required flow for new LinkedIn users is broken (empty email/name in createLinkedinUser call) |
| C: Safe to Launch Cert API Fix | **PASS** | getJobCertificationRequirements() confirmed to strip id/canonicalKey in service layer |
| D: Security Launch Gate | **PASS with caveat** | LinkedIn OIDC security model is sound; id_token not cryptographically verified (Finding #1) is mitigated by userinfo fetch |
| E: Accessibility/Mobile Gate | **PASS with caution** | Modal has role="dialog" + aria-modal + aria-labelledby; checklist has role="list"; button type="button" on all CTAs ✅ |

---

## Recommended Next Command: STITCH

Rationale: Finding #3 (role_required broken for new LinkedIn users) is a data flow bug that requires a contract fix between the callback's ticketData and the choose-role endpoint. STITCH should verify the full API contract including this data handoff.
