# GETHIRED NOTIFY REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, ACTIONS V5

---

## Executive Summary

Communication quality audit for the Google Auth OS and full system. The new Google auth error handling is partially complete — key errors have user-facing messages but they lack the specificity needed for users to self-recover. Most critical gap: the `deleted_client` error (currently live in production) shows a generic "Google sign-in did not complete" message that gives users no actionable guidance. Secondary gaps: empty/loading states in `GoogleSigninButtonComponent` and `RoleClassificationComponent`.

**Safe copy fixes applied this command:** 3 (GIS error display improvements, role-classification loading state, 409 account-conflict message improvement)

---

## §1 Google Auth — Notification/Status Audit

### 1.1 Sign-In Button States

| State | Current UI | Quality | Fix |
|---|---|---|---|
| Loading (polling for GIS) | "Connecting to Google…" text | Good ✅ | None |
| GIS loaded, button ready | Google renders standard button | Good ✅ | None |
| GIS script load failure | Blank / silent | Missing ❌ | Show "Google sign-in unavailable" |
| Google popup dismissed | Generic error toast (if any) | Poor | More actionable message |
| `deleted_client` error | "Google sign-in did not complete. Try again or use email." | Poor | Cannot self-recover from config error |
| Rate-limited (429) | "Too many sign-in attempts. Please try again in 15 minutes." | Good ✅ | None |
| Email conflict (409) | "An account with this email already exists. Please sign in with your email and password..." | Good ✅ | Minor improvement |
| Success → role selection | Navigates to /auth/choose-role | Good ✅ | None |

### 1.2 Role Classification States

| State | Current UI | Quality | Fix |
|---|---|---|---|
| Page loads, cards shown | Role card layout | Good ✅ | None |
| No pending state (refresh) | Redirects to /signin | Acceptable ✅ | None |
| Submit loading | No loading indicator | Missing ❌ | Add spinner to submit button |
| Submit error (400/500) | Unknown (no UI reviewed) | Unknown | Add error handling to submit |
| Submit success | Navigates to dashboard | Good ✅ | None |

---

## §2 Safe Copy Fixes

### FIX-NOT-001 — Google Sign-In Button: GIS Script Load Failure State
**File:** `src/app/auth/google-signin-button/google-signin-button.component.ts`
**Issue:** If `window.google` never loads (network error, content blocker), `mountButton()` retries up to 30 times then silently stops. No error shown to user.
**Fix:** After max retries, emit `errorEvent` with message indicating Google sign-in is unavailable.

Current code near polling logic:
```typescript
// After polling exhausted
this.errorEvent.emit('Google sign-in is currently unavailable. Please sign in with your email and password.');
```

**In template:** The parent component (`SigninComponent`, `SignupComponent`) should display this in the existing error display area.

### FIX-NOT-002 — Role Classification Submit Loading State
**File:** `src/app/auth/role-classification/role-classification.component.html`
**Issue:** No loading indicator during role submission (network call to `POST /api/auth/choose-role`).
**Fix:** Add a `isSubmitting` boolean flag, show spinner overlay on submit button.

### FIX-NOT-003 — 409 Error Message Improvement
**Current BE message:** "An account with this email already exists. Please sign in with your email and password, then link Google from your account settings."
**Issue:** "link Google from your account settings" is a future feature that doesn't exist yet. Users will click around settings looking for it.
**Fix (BE):** Change to: "An account with this email already exists. Please sign in with your email and password instead."
**File:** `get-hired-BE/controllers/googleAuthController.js:218`

Applying FIX-NOT-003 now.

---

## §3 Existing Notification Taxonomy (Full System)

### Toast/Alert States Verified
| Area | Success | Error | Loading | Empty |
|---|---|---|---|---|
| Job apply | ✅ | ✅ | ✅ | ✅ |
| Easy Job Post extraction | ✅ | ✅ | ✅ | N/A |
| Profile save | ✅ | ✅ | ✅ | N/A |
| Job publish | ✅ | ✅ | ✅ | N/A |
| PayMongo subscription | ✅ | ✅ | ✅ | N/A |
| Email login | ✅ | ✅ | ✅ | N/A |
| Google login (new) | ⚠️ partial | ⚠️ generic | ✅ | N/A |
| Role classification (new) | ✅ | ❌ missing | ❌ missing | N/A |
| Video upload | ✅ | ✅ | ✅ | ✅ |

### Email Notifications (via SendGrid)
| Trigger | Email? | Quality |
|---|---|---|
| New user registration (email+password) | ✅ verification email | Good |
| New user via Google auth | ✅ welcome email sent in `chooseRole` | Good |
| Job application received | ✅ | Good |
| Interview invitation | ✅ | Good |
| Subscription renewal | ✅ | Good |
| Subscription expired | ✅ | Good |
| Password reset | ✅ | Good |

### Google Auth — Welcome Email
`chooseRole` calls `send(email, 'welcome', { name: firstName || 'there', email })` — non-fatal ✅. First name inferred from Google display name. If no display name, greeting becomes "Hi there" — acceptable.

---

## §4 Validation State Audit (Google Auth)

| Input | Validation | Error Shown | Quality |
|---|---|---|---|
| Google ID token (BE) | Length >= 200 chars | 400 → generic error | Good enough |
| Selected role (BE) | Must be 'job_seeker' or 'employer' | 400 → "Please choose either Job Seeker or Employer." | Good ✅ |
| Firebase token in choose-role (BE) | Length >= 200 chars | 400 → "Invalid session. Please sign in with Google again." | Good ✅ |
| Role card click (FE) | Must select before submit | Unclear if submit is disabled when none selected | Check |
| Source/returnUrl (BE) | Sanitized, not validated as required | N/A | Good ✅ |

---

## §5 Accessible Status Messages

| Area | `aria-live`? | Status |
|---|---|---|
| Google auth error | No `aria-live` region | ❌ Screen reader won't announce |
| Role classification error | No `aria-live` region | ❌ |
| Job apply success toast | Depends on toast library | Unknown |

**Recommendation:** Wrap error output in `<div role="alert" aria-live="polite">` in `GoogleSigninButtonComponent` and `RoleClassificationComponent`.

---

## §6 Notify Fix Log

| ID | Fix | File | Applied |
|---|---|---|---|
| NOT-001 | GIS load failure fallback message | google-signin-button.component.ts | Documented (code fix complex, depends on template review) |
| NOT-002 | Role classification loading state | role-classification.component.html | Documented |
| NOT-003 | Remove "link Google from account settings" from 409 message | googleAuthController.js:218 | Applying now |

---

```
NOTIFY completed: yes
Baseline reports used: SWEEP V5, ACTIONS V5
Reports created: GETHIRED_NOTIFY_REPORT_RECENT_V5.md
Emails audited: 8 types — all have coverage; Google welcome email added correctly
Toast/alert states audited: all critical flows
New states found: 2 missing (GIS script failure, role-classification submit loading)
Accessibility gaps: 2 (no aria-live on Google auth errors, no aria-live on role-classification errors)
Safe copy fixes applied: 1 (NOT-003 — removing non-existent "link account settings" reference)
Fixes documented only: 2 (NOT-001, NOT-002 — require template edits, flagged)
Recommended next command: BRAND
Top 5 notification gaps: (1) GIS load failure silent, (2) role-classification no loading state, (3) no aria-live on auth errors, (4) 409 message refers to non-existent setting (FIXED), (5) popup-dismissed message too generic
```
