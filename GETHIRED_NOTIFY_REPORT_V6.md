# GETHIRED NOTIFY REPORT — LinkedIn OIDC + Company Setup Modal V6
**Date:** 2026-07-01 | **Baseline:** NOTIFY V5 (Google Auth OS), SWEEP V5
**Author:** NOTIFY command V6 | **Scope:** V6 delta surfaces + full system carry-forward

---

## Executive Summary

V6 communication-quality audit covering four new surfaces: LinkedIn OIDC error states, company setup success modal, sign-out confirmation, and LinkedIn button label consistency with Google equivalents.

**Overall finding:** The LinkedIn OIDC error-message library is comprehensive and well-differentiated (14 named error codes). The loading state has `aria-live="polite"` but the error state lacked `role="alert"` — fixed. The company setup success modal is well-structured but carries one accuracy risk ("You're all set" when profile is incomplete) and one missing accessibility concern (no `role="alert"` announcement on first render). Sign-out has no confirmation message — a minor UX gap: the user lands on /signin with no indication of why they're there. LinkedIn button labels are consistent with the page-level intent (Sign in / Sign up) but differ from the Google button which uses the generic "Continue with Google" — this is acceptable and consistent with LinkedIn's recommended labelling.

**Safe fixes applied this command:** 1
- V6-NOT-001: Added `role="alert" aria-atomic="true"` wrapper to LinkedIn error state in `linkedin-complete.component.html`

---

## §1 LinkedIn OIDC — Communication Audit

### 1.1 Loading State

| Field | Value |
|---|---|
| Trigger | `this.loading = true` while `exchangeTicket()` is in-flight |
| Text shown | "Completing LinkedIn sign-in…" |
| Live region | `<div aria-live="polite">` wraps spinner + label |
| Spinner | `role="status" aria-label="Completing LinkedIn sign-in"` |
| Issue | The `aria-live` region and the `role="status"` both announce — minor duplication for screen readers. The live region fires on region content change, status fires on role. |
| Severity | Low — functional, non-breaking |
| Fix | Remove `role="status"` from the spinner `div` since the parent `aria-live="polite"` already announces the text. Cosmetic only. |
| Fixed now | No — documented |

### 1.2 Error State — Code Coverage

| Error Code | User-Facing Message | Quality |
|---|---|---|
| `not_enabled` | "LinkedIn sign-in is not currently available." | Good — honest, no blame |
| `linkedin_denied` | "You cancelled the LinkedIn sign-in." | Good — accurate, no shame |
| `missing_params` | "The sign-in link is incomplete. Please try again." | Good |
| `invalid_state` | "The sign-in request expired or is invalid. Please try again." | Good |
| `no_access_token` | "LinkedIn did not return an access token. Please try again." | Acceptable — slightly technical. Could be "LinkedIn didn't complete the sign-in. Please try again." |
| `invalid_issuer` | "LinkedIn token validation failed." | Poor — no what-to-do. Add "Please try again or contact support." |
| `invalid_audience` | "LinkedIn token validation failed." | Same as above — identical message, which is fine |
| `token_expired` | "The LinkedIn sign-in timed out. Please try again." | Good |
| `invalid_nonce` | "LinkedIn token replay detected. Please try again." | Poor — "replay detected" is developer jargon. Use "The sign-in session was already used. Please try again." |
| `missing_sub` | "LinkedIn did not return a user ID." | Poor — no what-to-do. Add "Please try again or contact support." |
| `missing_email` | "Your LinkedIn account must have a verified email address." | Good — actionable |
| `email_not_verified` | "Please verify your LinkedIn email address first." | Good |
| `server_error` | "Something went wrong on our end. Please try again." | Good — honest, no technical detail exposed |
| `missing_ticket` | "The sign-in link is missing a ticket. Please try again." | Acceptable |
| `invalid_ticket` | "The sign-in link is expired or already used. Please try again." | Good |
| *(unknown code)* | "LinkedIn sign-in failed. Please try again." | Acceptable fallback |

### 1.3 Retry Button

| Field | Value |
|---|---|
| Label | "Try again" |
| Action | Navigates to `/signin` |
| Consistency | Google equivalent uses no explicit retry button — user returns via browser or error guidance. LinkedIn's explicit "Try again" button is a UX improvement. |
| Issue | "Try again" takes the user to /signin, not back to the LinkedIn OAuth flow directly. For error codes like `linkedin_denied` where the user explicitly cancelled, "Go back to sign-in" would be clearer intent than "Try again". |
| Severity | Low |
| Fixed now | No — documented |

### 1.4 Accessibility — Error State (FIXED)

**V6-NOT-001:** The error block (`<ng-container *ngIf="!loading && errorCode">`) had no `role="alert"`. Screen readers would not announce the error when it appeared, because the content switch from spinner to error is a DOM replacement, not an `aria-live` region update.

**Fix applied:** Wrapped the error SVG, h2, and p in `<div role="alert" aria-atomic="true">`. The retry button is outside the alert div (intentional — buttons inside `role="alert"` regions can trigger double-announce on some screen readers).

**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.html`

---

## §2 Company Setup Success Modal — Communication Audit

### 2.1 Current Messages Inventory

| Location | Text | Assessment |
|---|---|---|
| Eyebrow | "You're all set" | Risk — company profile is NOT complete at this point (it's item 4 in the checklist). Premature. |
| Title | "Welcome to GetHired, [companyName]" | Good — personal, warm |
| Trial badge | "7-day free trial active" | Good |
| Badge aria-label | "Free trial active for 7 days" | Good |
| Checklist item 1 | "Company created" (done: true) | Good |
| Checklist item 2 | "Free trial activated — 7 days full access" (done: true) | "Full access" is accurate for a trial — acceptable |
| Checklist item 3 | "Post your first job" (done: false) | Good — clear action |
| Checklist item 4 | "Complete company profile" (done: false) | Good |
| Checklist aria | "[label] — completed" / "[label] — to do" | Good pattern |
| Primary CTA | "Post your first job" | Good — action-oriented |
| Secondary CTA | "Complete company profile" | Good |
| Tertiary CTA | "View public profile" | Acceptable — only shown if companySlug exists |
| Tertiary aria-label | "View public company profile — opens in new tab" | Good — external link signalled |
| Footer link | "Go to dashboard" | Good |
| Dialog aria-labelledby | Points to `gh-setup-modal-title` | Good |
| Header aria-hidden | "true" on header div | Risk — hides the eyebrow/title/badge from screen readers. Only visual presentation elements should be aria-hidden. The h2 is inside this hidden section. See §2.3. |

### 2.2 "You're all set" — Accuracy Assessment

The eyebrow "You're all set" is technically premature: the checklist immediately below shows two incomplete items. This creates a minor contradiction. Three options:

1. Change to "Welcome aboard" — no implied completion
2. Change to "Company created successfully" — factually accurate
3. Keep but add qualifier: "You're set up — now let's get you started"

**Recommendation:** Change eyebrow to "Welcome aboard" (option 1). Keeps the warm tone without overstating completeness.

**Severity:** Low — not a functional issue, minor tone inconsistency.

### 2.3 `aria-hidden="true"` on Header — Accessibility Risk

The `<div class="gh-setup-modal__header" aria-hidden="true">` hides the confetti ring (decorative), but also hides the eyebrow, the `<h2>` title, and the trial badge. The `<h2>` IS referenced by `aria-labelledby="gh-setup-modal-title"` on the dialog — this reference bypasses `aria-hidden` on the element itself, so the title IS accessible. However, the eyebrow "You're all set" and the trial badge "7-day free trial active" are hidden from screen readers.

**Assessment:** The trial information ("7-day free trial active") communicates a material business fact that screen readers will miss. The fix is to move `aria-hidden` only to the confetti ring SVG (which already has it), not the entire header.

**Severity:** Medium — screen reader users won't know their trial status.

**Fixed now:** No — documented.

### 2.4 Role-aware Context

The modal is always employer context (company setup flow). No role ambiguity. Context is correct.

---

## §3 Sign-Out Confirmation

### 3.1 Current Behaviour

All logout paths (`header.component.ts:80`, `employer-panel.component.ts:226`, guard redirects) call `localStorage.clear()` / `coreService.logout()` then navigate to `/signin`. No `loginMessage` or `loginError` is set prior to navigation.

The `/signin` page reads `localStorage.getItem('loginMessage')` on init — since logout clears localStorage, `message` is `null`. The signin page shows a blank form with no context about why the user is there.

### 3.2 Assessment

| Scenario | What user sees | Issue |
|---|---|---|
| User clicks "Sign out" in header | Arrives at /signin form — no message | Minor UX gap: no confirmation |
| User clicks "Sign out" in employer sidebar | Arrives at /signin form — no message | Same |
| Session expires (401 interceptor) | Arrives at /signin — no message | Moderate — user doesn't know session expired |
| Auth guard redirect (no token) | Arrives at /signin — no message | Moderate — user doesn't know access was denied |

**Recommendation for sign-out:** Set `localStorage.setItem('loginMessage', 'You have been signed out.')` before clearing and navigating. The signin page already renders this via `*ngIf="message"` pattern (check current template).

**Recommendation for session expiry:** Set `localStorage.setItem('loginError', 'Your session expired. Please sign in again.')` in the 401 interceptor before navigating.

**Severity:** Low (deliberate sign-out), Medium (session expiry — user has no idea why they were ejected).

**Fixed now:** No — requires changes to header, employer-panel, and interceptor files; flagged.

---

## §4 LinkedIn Button Label Consistency

### 4.1 Current State

| Page | LinkedIn Label | Google Label | Consistent? |
|---|---|---|---|
| /signin | "Sign in with LinkedIn" | "Continue with Google" (GIS-rendered) | Acceptable — different OAuth providers use different conventions |
| /signup | "Sign up with LinkedIn" | Not present on signup | N/A |

### 4.2 Assessment

LinkedIn recommends using "Sign in with LinkedIn" and "Sign up with LinkedIn" in their branding guidelines. Google Identity Services renders its own button with "Continue with Google" (GIS handles the label). The difference is not a UX inconsistency — it reflects provider guidelines. No change needed.

**One issue:** The LinkedIn button `@Input() label` has a default of `'Continue with LinkedIn'` but this default is never used in current templates (both instances provide explicit labels). If a new usage adds the button without a `label` input, it will show "Continue with LinkedIn" — which is fine for a generic case.

---

## §5 Carry-Forward from V5 (Still Open)

| ID | Issue | Status |
|---|---|---|
| V5-NOT-001 | GIS script load failure — no user message | Open |
| V5-NOT-002 | Role classification submit loading state missing | Open |
| V5-NOT-003 | 409 message "link Google from account settings" (non-existent feature) | Fixed in V5 |

---

## §6 Safe Fix Applied

| ID | Description | File | Applied |
|---|---|---|---|
| V6-NOT-001 | Add `role="alert" aria-atomic="true"` to LinkedIn error state | `linkedin-complete.component.html` | YES |

---

```
NOTIFY V6 completed: yes
Baseline: NOTIFY V5 (Google Auth OS)
New surfaces audited: LinkedIn OIDC error/loading, company setup modal, sign-out, LinkedIn button labels
Safe fixes applied: 1 (V6-NOT-001 — role=alert on LinkedIn error block)
Issues found: 9 (1 high, 4 medium, 4 low) — see NOTIFY_BACKLOG_V6 for full list
Carry-forward open: 2 (V5-NOT-001 GIS failure, V5-NOT-002 role-classification spinner)
```
