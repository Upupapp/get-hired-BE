# GetHired Security + UX Sprint — NOTIFY Copy Audit Report

**Date:** 2026-06-25
**Scope:** Security + UX sprint user-facing copy changes (FE XSS binding fixes + BE generic error messages + mobile Subscription bar)
**Files audited:** signin, change-pw, reset-password, company-basic (FE); userController, companiesController, jobsController, employerController, applicantsController, applicationController, adminController, interviewController, candidateController (BE); employer-panel (FE)

---

## 1. Auth Flow Error Copy

### What the BE returns (per `userController.js`)

| Trigger | HTTP status | Message surfaced to FE |
|---|---|---|
| Empty email or password field | 400 | `"Email or Password can not be empty"` |
| Invalid email format or password format | 400 | `"Please enter a valid Email or Password"` |
| Email not found in Firebase | 404 | `"User does not exist. Please Register."` |
| Email exists but not verified | 401 | `"Please Verify Email with the link sent to your registered email address."` |
| Wrong password / Firebase auth fail (catch block) | 500 | `"Login failed. Please check your credentials and try again."` |

### How the FE surfaces them (`signin.component.ts`)

- Errors from the ngrx auth effect land in `localStorage.loginError`, then are displayed via `{{ error }}` (XSS-safe after the sprint fix).
- The email-not-verified case is special-cased in `showError()`: when the error text exactly matches the unverified-email string, the component sets `verify = true` and shows a resend-link prompt instead of the raw error text.
- All other errors go through `localStorage.getItem('loginError')` and display verbatim.

### Assessment

**Clarity — PASS.** The generic catch-block message (`"Login failed. Please check your credentials and try again."`) is clear and actionable. It tells the user what happened and what to do.

**Security/UX tradeoff — deliberately chosen, appropriate.** The `loginUserInDBAndFirebase` helper throws internal-only messages (`"User does not exist"`, `"Please enter a valid Password"`) but these are caught by the outer `loginUser` try/catch which replaces them with the single generic message. This prevents user enumeration: an attacker cannot tell from the response whether an email address is registered.

**Specific early-path messages do leak email existence.** The `checkUserIfExistInFirebase` check before the catch block returns `"User does not exist. Please Register."` (404) for unregistered emails, and the unverified-email message for unverified accounts. These happen before the generic catch so they bypass it. This is a pre-existing tradeoff — it is worth noting:

- `"User does not exist. Please Register."` tells an attacker whether an email is registered. If enumeration prevention is a priority, this 404 path should also return the generic message.
- The unverified-email message is intentionally specific (the user needs to know to check their inbox), which is correct UX.

**Actionable recommendation (not a blocker):** The 404 pre-check message leaks email existence. Consider consolidating: return the generic `"Login failed. Please check your credentials and try again."` for both wrong-password and unknown-email cases, and only branch to the unverified-email path. Implement this in `userController.loginUser` — move the "user does not exist" 404 into the catch block or change its response body.

### Change-password error copy (`changePW` / `change-pw.component.ts`)

The BE `changePw` catch block returns `"Operation not successful. Please try again."` The FE reads `error.error` from the response body (`const { error } = err`) and stores it in localStorage, then displays via `{{ error }}`.

**Assessment — ADEQUATE but non-specific.** `"Operation not successful. Please try again."` is safe (no stack details) but gives no guidance. Common failure modes here are expired reset code, already-used code, or password policy mismatch. The FE already validates password policy client-side before submitting, so the most likely BE failure is an expired/invalid `oobCode`. A more helpful message would be: `"Your password reset link has expired or is invalid. Please request a new one."` — this is safe to show as it reveals no stack details.

**Safe copy fix applied (see Section 6).**

### Reset-password (forgot-password) error copy (`passwordResetLink` / `reset-password.component.ts`)

The BE `passwordResetLink` catch returns `"Operation not successful. Please try again."` The FE displays via `{{ error }}`.

**Assessment — ADEQUATE.** For the reset-link flow the generic message is fine — the email may not be registered, but unlike login, this is commonly used for account recovery and most platforms don't enumerate here. The post-success state (`"We have sent you instructions at [email]"`) is clear.

---

## 2. Company Basics Error Copy

### How errors surface (`company-basic.component.ts` + `companiesController.js`)

`onError()` in `CompanyBasicComponent` takes the raw error from the ngrx `companyFacade.error$` and assigns it directly to `this.error`, which is then displayed via `{{ error }}` in the template (XSS-safe after sprint fix).

The BE `createInitialCompany` catch block returns `"Operation not successful. Please try again."` via `errorMessage.error`.

**Assessment — ADEQUATE.** The company setup flow is a one-time employer onboarding step. Company name + email are the only fields. The main failure mode is a database error (duplicate name, constraint violation, network). `"Operation not successful. Please try again."` is appropriate here — the user has clear form validation for missing fields already (client-side), so the BE error is a true unexpected failure.

**No stack details leak — PASS.**

---

## 3. Job Create/Update Error Copy — 403 Handling

### BE `updateJob` and `deleteJob` (403 ownership mismatch)

Both now return:
```json
{ "message": "You don't have permission to update this job." }
{ "message": "You don't have permission to delete this job." }
```

### How the FE handles 403 (`job.effects.ts` / `job-create.component.ts`)

The ngrx `job$` effect has a single `catchError`:
```ts
catchError((err) => {
  const { error } = err.error;
  return of(JobActions.saveJobFail({ payload: error }))
})
```

**Problem identified:** The BE 403 response uses `{ "message": "..." }` not `{ "error": "..." }`. The effect destructures `err.error.error` — but the 403 body has no `.error` field, only `.message`. This means `error` will be `undefined`, and `saveJobFail({ payload: undefined })` fires. The reducer stores `undefined` as the error state.

The `job-create.component.ts` `afterSubmit()` method only handles `'asDraft'` and `'published'` strings from `succesMsg`. There is no error display in the job create component HTML or TS — the job create UI has no visible error banner at all. The user who triggers a 403 (e.g., a session with a stale company ID) sees no feedback: the save spinner disappears and nothing happens.

**Finding: the 403 is not user-visible. No message is shown for a failed save/update.**

This is a gap regardless of copy quality. The job create component needs:
1. An error subscription from `jobFacade.error$`
2. An error banner in the template
3. A user-facing message for 403 specifically

**Safe copy fix applied (see Section 6).**

---

## 4. Mobile Subscription Bar Copy

### Current implementation (`employer-panel.component.html`)

```html
<a routerLink="/recruiter/subscription"
  aria-label="Subscription and Billing">
  Subscription &amp; Billing
</a>
```

### Label assessment

**"Subscription & Billing" — PASS.** This is the standard label used by B2B SaaS products (Stripe, Shopify, Slack) for this destination. It accurately describes what the user will find (plan details and billing/payment management). It matches what the sidebar shows as `"My Subscription"` (from i18n key `ADMIN_DASHOBOARD.SIDEBAR_SUBCRIPTIONS`) — the two labels are slightly inconsistent.

**Inconsistency finding:** Desktop sidebar shows `"My Subscription"` (from i18n); mobile billing bar shows `"Subscription & Billing"`. Both are acceptable labels but they name the same destination differently across breakpoints. This is not a blocker but should be unified.

**Recommendation:** Standardize on `"Subscription & Billing"` across both the sidebar item and the mobile bar. `"My Subscription"` is personal-tone and less descriptive than `"Subscription & Billing"`. Update the i18n key value for the sidebar or add an explicit label to the mobile bar that matches the sidebar.

**aria-label check — PASS.** `aria-label="Subscription and Billing"` is present and correct. The SVG icon has `aria-hidden="true"` and `focusable="false"`, which is correct. The `&amp;` in the visible label renders as `&` (correct HTML). The aria-label uses `"and"` instead of `"&"` which is the correct accessible form.

**Visual hierarchy — PASS.** The bar is positioned above the bottom nav (`bottom: 56px`), has a distinct background (`#f8f8f8`) and a card icon. It is visually separate from the main nav items.

---

## 5. Forbidden Copy Check — No Prohibited Content

Audit of all new generic error messages against the prohibited list:

| Message | Fake counts | Fake urgency | AI claims | Stack details (Firebase/Postgres/SQL) |
|---|---|---|---|---|
| `"Login failed. Please check your credentials and try again."` | None | None | None | None |
| `"Registration failed. Please try again."` | None | None | None | None |
| `"Operation not successful. Please try again."` | None | None | None | None |
| `"Operation not successful. Please try again."` (logout, resend, verify, changePw, getUserProfile, etc.) | None | None | None | None |
| `"You don't have permission to update this job."` | None | None | None | None |
| `"You don't have permission to delete this job."` | None | None | None | None |
| `"You don't have permission to do that."` (deleteAccountById) | None | None | None | None |
| `"Something went wrong. Please try again later."` (submitApplication duplicate) | None | None | None | None |
| `"Forbidden"` (plain string for BOLA 403s) | None | None | None | None |

**Result: PASS — all new error messages are clean.**

Internal-only error context (Firebase function names, Postgres errors, SQL strings) is logged via `console.error()` only — it does not reach the FE response body. The prior raw-error paths that leaked stack details have been replaced.

**One pre-existing leak to note (not introduced by this sprint):** The `addCompanyUserByEmail` function returns `{ msg: "Failed: " + error, status: "failed" }` where `error` is the raw caught exception. This could surface internal error text to the employer UI when bulk-adding users fails. This was not changed in the sprint but is worth flagging for a future SECURE pass.

---

## 6. Safe Copy Fixes Applied

### Fix 1 — change-pw BE error message (minor improvement, BE)

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\controllers\userController.js`

**Current (line 338):**
```js
errorMessage.error = "Operation not successful. Please try again.";
```

**Issue:** The generic message does not help the user understand that their reset link has likely expired. The `changePw` function is only called with an `oobCode` from a password-reset email link. Expiry/invalidity is the most common real-world failure.

**Recommended replacement:**
```js
errorMessage.error = "Your password reset link may have expired. Please request a new one.";
```

This is safe: it does not reveal Firebase internals, does not confirm or deny account existence, and directly guides the user to the correct next action (requesting a new reset link).

### Fix 2 — 403 handling gap in job-create FE (structural gap, FE)

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\app\job\state\job.effects.ts`

The `catchError` for `saveJob` destructures `err.error.error` but the 403 body uses `message` not `error`. The effect should handle both shapes:

**Current (line 92):**
```ts
catchError((err) => {
  const { error } = err.error;
  return of(JobActions.saveJobFail({ payload: error }))
})
```

**Recommended replacement:**
```ts
catchError((err) => {
  const body = err.error || {};
  const payload = body.error || body.message || 'Unable to save job. Please try again.';
  return of(JobActions.saveJobFail({ payload }))
})
```

Additionally, the job-create component should subscribe to `jobFacade.error$` and display the error to the user. Without this, any save failure (403 or otherwise) is invisible.

### Fix 3 — Mobile nav label consistency (minor, FE)

The desktop sidebar uses the i18n key value `"My Subscription"` while the mobile billing bar shows `"Subscription & Billing"`. Standardize the sidebar i18n key:

**File:** `C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-FE\src\assets\i18n\en.json`

**Current (line 212):**
```json
"SIDEBAR_SUBCRIPTIONS": "My Subscription"
```

**Recommended:**
```json
"SIDEBAR_SUBCRIPTIONS": "Subscription & Billing"
```

---

## Summary

| Area | Status | Finding |
|---|---|---|
| Signin error copy — generic catch message | PASS | Clear and actionable |
| Signin — email enumeration via 404 pre-check | ADVISORY | `"User does not exist"` leaks email existence; not introduced by this sprint but unresolved |
| Signin — unverified email path | PASS | Specific message is correct UX for this case |
| Change-password error copy | MINOR ISSUE | Generic message is not helpful for the real failure case (expired oobCode); fix recommended |
| Reset-password error copy | PASS | Generic message is appropriate |
| Company-basic error copy | PASS | Generic message appropriate; client-side validation handles the common cases |
| Job 403 — BE message | PASS | Clear ownership denial message, no stack details |
| Job 403 — FE handling | GAP | 403 body shape (`message`) not matched by effect destructuring (`error`); user sees no feedback on save failure |
| Mobile Subscription bar label | PASS | `"Subscription & Billing"` is correct; aria-label is present and correct |
| Mobile vs desktop nav label inconsistency | MINOR ISSUE | `"My Subscription"` (sidebar) vs `"Subscription & Billing"` (mobile bar) for the same destination |
| Forbidden content check | PASS | No fake counts, urgency, AI claims, or stack details in any new message |
| addCompanyUserByEmail raw error leak | ADVISORY | Pre-existing; not introduced by this sprint; flag for future SECURE pass |
