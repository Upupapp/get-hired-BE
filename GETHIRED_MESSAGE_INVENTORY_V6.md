# GETHIRED MESSAGE INVENTORY V6
**Date:** 2026-07-01 | **Scope:** V6 new surfaces + full system carry-forward

All messages catalogued by surface. Format: Current message | Type | Issue | Recommended improvement | Severity | Fixed-now

---

## SURFACE 1: LinkedIn OIDC — linkedin-complete.component

### Loading State

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "Completing LinkedIn sign-in…" | Loading text | None — clear and specific | No change | — | N/A |
| aria-label: "Completing LinkedIn sign-in" (spinner) | Accessibility | Duplication with parent aria-live region | Remove role="status" from spinner div | Low | No |

### Error States

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "LinkedIn sign-in is not currently available." (not_enabled) | Error | Good | No change | — | N/A |
| "You cancelled the LinkedIn sign-in." (linkedin_denied) | Error | Good | No change | — | N/A |
| "The sign-in link is incomplete. Please try again." (missing_params) | Error | Good | No change | — | N/A |
| "The sign-in request expired or is invalid. Please try again." (invalid_state) | Error | Good | No change | — | N/A |
| "LinkedIn did not return an access token. Please try again." (no_access_token) | Error | Slightly technical | "LinkedIn didn't complete the sign-in. Please try again." | Low | No |
| "LinkedIn token validation failed." (invalid_issuer) | Error | No what-to-do | "LinkedIn token validation failed. Please try again or contact support." | Medium | No |
| "LinkedIn token validation failed." (invalid_audience) | Error | No what-to-do | "LinkedIn token validation failed. Please try again or contact support." | Medium | No |
| "The LinkedIn sign-in timed out. Please try again." (token_expired) | Error | Good | No change | — | N/A |
| "LinkedIn token replay detected. Please try again." (invalid_nonce) | Error | Jargon ("replay detected") | "The sign-in session was already used. Please try again from the beginning." | Medium | No |
| "LinkedIn did not return a user ID." (missing_sub) | Error | No what-to-do | "LinkedIn didn't return a user ID. Please try again or contact support." | Medium | No |
| "Your LinkedIn account must have a verified email address." (missing_email) | Error | Good | No change | — | N/A |
| "Please verify your LinkedIn email address first." (email_not_verified) | Error | Good | No change | — | N/A |
| "Something went wrong on our end. Please try again." (server_error) | Error | Good | No change | — | N/A |
| "The sign-in link is missing a ticket. Please try again." (missing_ticket) | Error | Good | No change | — | N/A |
| "The sign-in link is expired or already used. Please try again." (invalid_ticket) | Error | Good | No change | — | N/A |
| "LinkedIn sign-in failed. Please try again." (unknown fallback) | Error | Acceptable fallback | No change | — | N/A |

### Error Region Accessibility

| Current | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| No role="alert" on error container | Accessibility | Screen readers won't announce on DOM swap | Add role="alert" aria-atomic="true" | High | YES (V6-NOT-001) |

### Retry Button

| Current | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "Try again" | CTA | For linkedin_denied, implies re-attempt but navigates to /signin | For linkedin_denied code: consider label "Back to sign-in" | Low | No |

---

## SURFACE 2: Company Setup Success Modal

### Header / Eyebrow

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "You're all set" (eyebrow) | Success eyebrow | Premature — profile incomplete | "Welcome aboard" | Low | No |
| "Welcome to GetHired, [companyName]" (h2) | Success title | Good — personal and warm | No change | — | N/A |
| "7-day free trial active" (badge) | Status | Good | No change | — | N/A |
| Header div aria-hidden="true" hides trial badge and eyebrow | Accessibility | Screen readers miss trial status | Move aria-hidden only to confetti SVG (already has its own aria-hidden) | Medium | No |

### Checklist

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "Company created" (done: true) | Checklist item | Good | No change | — | N/A |
| "Free trial activated — 7 days full access" (done: true) | Checklist item | "full access" accurate for trial | No change | — | N/A |
| "Post your first job" (done: false) | Checklist item | Good — clear action | No change | — | N/A |
| "Complete company profile" (done: false) | Checklist item | Good | No change | — | N/A |
| "[label] — completed" / "[label] — to do" (aria patterns) | Accessibility | Good pattern | No change | — | N/A |

### CTAs

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "Post your first job" (primary btn) | CTA | Good — action-oriented | No change | — | N/A |
| "Complete company profile" (secondary btn) | CTA | Good | No change | — | N/A |
| "View public profile" (tertiary, conditional) | CTA | Slightly ambiguous — whose profile? | "View your public page" | Low | No |
| "View public company profile — opens in new tab" (aria-label) | Accessibility | Good | No change | — | N/A |
| "Go to dashboard" (footer link) | CTA | Good | No change | — | N/A |

---

## SURFACE 3: Sign-Out Confirmation

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| (none — silent redirect to /signin) | Confirmation | No sign-out confirmation message | Set loginMessage="You have been signed out." before localStorage.clear() | Low | No |
| (none — 401 interceptor silently redirects) | Session expiry | User doesn't know why they were sent to /signin | Set loginError="Your session expired. Please sign in again." in interceptor | Medium | No |

---

## SURFACE 4: LinkedIn Button Labels

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| "Sign in with LinkedIn" (signin page) | Button label | Good — follows LinkedIn guidelines | No change | — | N/A |
| "Sign up with LinkedIn" (signup page) | Button label | Good | No change | — | N/A |
| "Continue with LinkedIn" (default input) | Default fallback | Acceptable — never exposed in current templates | No change | — | N/A |

---

## CARRY-FORWARD FROM V5 (Still Open)

| Current Message | Type | Issue | Recommended | Severity | Fixed |
|---|---|---|---|---|---|
| (none — GIS script load failure is silent) | Loading/Error | No user feedback when Google sign-in library fails to load | After max retries, emit error: "Google sign-in is unavailable. Try email." | High | No |
| (none — role-classification submit has no spinner) | Loading | No feedback during role submission network call | Add isSubmitting flag + spinner overlay | Medium | No |

---

## TOTALS

| Severity | Count |
|---|---|
| High | 2 (1 fixed: V6-NOT-001; 1 open: V5-NOT-001 GIS failure) |
| Medium | 6 (all open) |
| Low | 9 (all open) |
| N/A (no issue) | 28 |
