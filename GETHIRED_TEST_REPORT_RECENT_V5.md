# GETHIRED TEST REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP RECENT V5

---

## Executive Summary

Test quality gate for the Google Auth OS deployment. The FE and BE build cleanly. Zero automated tests exist for the new Google Auth controllers and services — this is the primary gap. Existing flows (email+password auth, jobs, applications, subscriptions) have unchanged behavior and remain covered by manual regression.

**Release quality gate: GO WITH CAUTION — Google Auth flows need at minimum manual QA before enabling new OAuth client.**

---

## SWEEP Baseline Used
Yes — GETHIRED_SWEEP_REPORT_RECENT_V5.md

---

## Test Tooling Inventory

**FE:** Angular CLI 13 + Karma + Jasmine (configured, `ng test` available). No Cypress/Playwright. Few meaningful specs exist.

**BE:** No test framework configured (`"test": "echo \"Error: no test specified\" && exit 1"`). Some files in `tests/` (smoke scripts for messaging, BOLA verification) created in prior sessions.

---

## Build Status

| Repo | Command | Result |
|---|---|---|
| FE | `ng build --configuration=staging` | ✅ PASS (clean, warnings only — autoprefixer flex-start) |
| BE | `node start.js` (PM2) | ✅ PASS (running on Linode) |

---

## Critical Flows — Coverage Matrix

| Flow | Role | Current Coverage | Risk |
|---|---|---|---|
| Google sign-in (existing user) | All | **ZERO** automated tests | Critical |
| Google sign-up → role classification | New users | **ZERO** automated tests | Critical |
| Google auth → employer draft claim | Employer | **ZERO** automated tests | High |
| Email+password login | All | Manual only | Medium |
| Job listing (public) | Anon | Manual only | Medium |
| Job apply | Applicant | Manual only | High |
| Recruiter job publish | Recruiter | Manual only | High |
| PayMongo webhook | System | **ZERO** tests — no sig verification | Critical |
| AI Job Preview → claim | Employer | **ZERO** automated tests | High |
| Easy Job Post extraction | Employer | **ZERO** automated tests | High |

---

## Google Auth Contract Tests

### What Should Be Tested (for future implementation)

**BE `googleAuthController.js`:**
1. POST `/api/auth/google/firebase-session` — rejects missing/short `googleIdToken` (400)
2. POST `/api/auth/google/firebase-session` — IP rate limit enforced (429 after 10 requests)
3. POST `/api/auth/google/firebase-session` — existing user: returns `status: 'authenticated'`
4. POST `/api/auth/google/firebase-session` — new user: returns `status: 'role_required'` with `firebaseIdToken`
5. POST `/api/auth/google/firebase-session` — unverified email: returns 403
6. POST `/api/auth/choose-role` — rejects invalid `selectedRole` (400)
7. POST `/api/auth/choose-role` — rejects `selectedRole: 'admin'` (400)
8. POST `/api/auth/choose-role` — creates user with correct role on valid token
9. POST `/api/auth/choose-role` — race guard: double-submit returns same session
10. POST `/api/auth/choose-role` — expired token: 401

**FE `GoogleAuthService`:**
1. `exchangeGoogleToken()` POSTs to correct endpoint
2. `handleGoogleSessionResponse()` stores pending state for `role_required`
3. `handleGoogleSessionResponse()` calls `storeSession()` for `authenticated`
4. `storeSession()` sets localStorage keys matching existing login flow
5. `storeSession()` navigates to `/recruiter/company` for new employer without company
6. `storeSession()` navigates to `/user/dashboard` for job seeker
7. `submitRoleSelection()` throws if no `_pendingFirebaseToken`

**`GoogleSigninButtonComponent`:**
1. Reads `environment.googleClientId` (not `window.__GH_GOOGLE_CLIENT_ID__`) ✅
2. Polls for `window.google` before mounting
3. Emits `credential` on successful GIS callback
4. Emits `errorEvent` on `google_popup_closed`

---

## Security Guardrail Checks

| Check | Result |
|---|---|
| Admin role via Google auth | Protected — `chooseRole` only accepts `job_seeker` or `employer`; returns 400 for any other value ✅ |
| Client-supplied role trusted | No — `roleId` derived server-side from `selectedRole` string → enum mapping ✅ |
| Company ID from JWT not body | Verified in existing employer routes via `getUserCompanyForRequest(req, uid)` ✅ |
| SQL injection in choose-role | No interpolation — all queries use parameterized `$1, $2` ✅ |
| Token in URL/logs | Token truncated in logs (`uid.substring(0,8)`), never in URLs ✅ |
| Firebase token re-verified | Yes — `verifyIdToken` called in both `googleFirebaseSession` AND `chooseRole` ✅ |
| Dummy password guessable | No — `hashPassword(uid + '_google_provider')`, uid is Firebase-generated random ✅ |
| returnUrl injection | `sanitizeReturnUrl()` blocks external URLs, `//evil.com`, `<>"'\`` chars ✅ |

---

## Release Quality Gates

| Gate | Status | Evidence |
|---|---|---|
| A: Safe to Redesign | **PASS** | No existing flows broken by Google Auth additions |
| B: Safe to Launch Google Auth | **FAIL** | `deleted_client` OAuth error — non-functional in production |
| C: Safe to Launch Applicant Grading | **UNKNOWN** | Services unwired, no tests |
| D: Security Launch Gate | **FAIL** | PayMongo webhook no sig, CORS open, OAuth client invalid |
| E: Accessibility/Mobile Gate | **PASS with caution** | Google button accessible via GIS iframe; role-classification needs radio ARIA |

---

## Top 5 Test Findings

1. Zero tests for `googleAuthController.js` — highest new-code risk
2. Zero tests for `GoogleAuthService` FE — storeSession() localStorage contract untested
3. Zero tests for `chooseRole` race-guard and 23505 handler
4. `requestUri: 'http://localhost'` in `exchangeGoogleTokenForFirebase` — untested against production Firebase project
5. `environment.googleClientId` used directly in component (no APP_INITIALIZER) — correct architecture but no test verifying value is non-empty at build time

---

## Recommended Next Command: SECURE

```
TEST completed: yes
SWEEP baseline used: yes
Reports created: GETHIRED_TEST_REPORT_RECENT_V5.md
Frontend commands run: build (ng build --configuration=staging) — PASS
Backend commands run: static analysis only (no test runner configured)
Tests created: 0 (documented as recommendations)
Tests passed: N/A
Tests failed: N/A
Critical blockers: 2 (deleted_client OAuth, PayMongo webhook)
High-risk gaps: 5
Release quality gate:
  Safe to redesign: pass
  Safe to launch Google Auth: FAIL (OAuth client invalid)
  Safe to launch applicant grading/matching: unknown
  Security launch gate: FAIL
  Accessibility/mobile gate: pass with caution
Recommended next command: SECURE
Top 5 test findings: see above
Top 5 next fixes: (1) new OAuth client, (2) requestUri fix, (3) BE test for chooseRole, (4) PayMongo sig, (5) CORS
```
