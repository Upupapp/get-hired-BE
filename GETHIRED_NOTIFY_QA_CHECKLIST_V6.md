# GETHIRED NOTIFY QA CHECKLIST V6
**Date:** 2026-07-01

Manual QA checklist for verifying all V6 notification surfaces.

---

## Pre-Test Setup

- [ ] FE running locally on port 4200
- [ ] BE running locally on port 3000
- [ ] LinkedIn OIDC enabled in .env (LINKEDIN_AUTH_ENABLED=true) OR use error simulation
- [ ] Screen reader available (VoiceOver on Mac, NVDA on Windows, or browser TalkBack)
- [ ] Browser devtools open for console monitoring
- [ ] No real emails will be triggered (test accounts only or disable SendGrid in .env)

---

## TEST-01: LinkedIn Loading State

**Route:** Trigger a fresh LinkedIn sign-in flow (POST /api/auth/linkedin/complete in flight)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Spinner visible during ticket exchange | | | |
| "Completing LinkedIn sign-in…" text visible | | | |
| Screen reader announces "Completing LinkedIn sign-in…" (aria-live polite fires) | | | |
| Loading state clears on success (navigates away) | | | |
| Loading state clears on error (error card renders) | | | |

---

## TEST-02: LinkedIn Error States — Screen Reader (V6-NOT-001)

**Method:** Navigate directly to `/linkedin/complete?error=server_error`

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Error card renders (not spinner) | | | |
| "Sign-in failed" heading visible | | | |
| Error message "Something went wrong on our end. Please try again." visible | | | |
| Screen reader announces "Sign-in failed. Something went wrong on our end. Please try again." immediately without requiring focus | | | |
| "Try again" button is focusable and activatable | | | |
| "Try again" navigates to /signin | | | |

**Repeat for each error code:**

| Error code | URL param | Expected message | SR announces? |
|---|---|---|---|
| not_enabled | ?error=not_enabled | "LinkedIn sign-in is not currently available." | |
| linkedin_denied | ?error=linkedin_denied | "You cancelled the LinkedIn sign-in." | |
| invalid_state | ?error=invalid_state | "The sign-in request expired or is invalid. Please try again." | |
| token_expired | ?error=token_expired | "The LinkedIn sign-in timed out. Please try again." | |
| missing_email | ?error=missing_email | "Your LinkedIn account must have a verified email address." | |
| invalid_ticket | ?error=invalid_ticket | "The sign-in link is expired or already used. Please try again." | |
| unknown_code | ?error=foo_unknown | "LinkedIn sign-in failed. Please try again." | |

---

## TEST-03: Company Setup Success Modal

**Trigger:** Complete company creation flow as a new employer

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Modal opens after company creation | | | |
| Confetti/check animation visible | | | |
| Eyebrow "You're all set" visible | | | |
| Title "Welcome to GetHired, [companyName]" shows actual company name | | | |
| "7-day free trial active" badge visible | | | |
| Checklist shows "Company created" as done (green checkmark) | | | |
| Checklist shows "Free trial activated — 7 days full access" as done | | | |
| Checklist shows "Post your first job" as to-do | | | |
| Checklist shows "Complete company profile" as to-do | | | |
| "Post your first job" button navigates to /recruiter/jobs/create | | | |
| "Complete company profile" button navigates to /recruiter/company/settings | | | |
| "View public profile" button opens /company/[slug] in new tab (if slug exists) | | | |
| "View public profile" button absent when no slug | | | |
| "Go to dashboard" navigates to /recruiter/dashboard | | | |
| Screen reader: dialog is announced as dialog | | | |
| Screen reader: title is announced on open | | | |
| Screen reader: trial badge accessible (CURRENTLY a gap — badge is in aria-hidden region) | | | (Gap: V6-NOT-004) |
| Checklist items announced with "completed" / "to do" suffix | | | |

---

## TEST-04: Sign-Out

**Action:** Click "Sign out" in employer header

| Check | Pass | Fail | Notes |
|---|---|---|---|
| User navigated to /signin | | | |
| localStorage cleared (check devtools Application tab) | | | |
| No lingering auth token in localStorage | | | |
| Sign-in form shows (no residual logged-in state) | | | |
| No confirmation message currently shown (gap V6-NOT-005) | | | (Documented gap) |

---

## TEST-05: Session Expiry

**Simulate:** Set token in localStorage to an expired value, then navigate to a protected route

| Check | Pass | Fail | Notes |
|---|---|---|---|
| 401 interceptor triggers | | | |
| User redirected to /signin | | | |
| No error message about session expiry shown (gap V6-NOT-006) | | | (Documented gap) |
| localStorage cleared on 401 | | | |

---

## TEST-06: LinkedIn Button Label Consistency

| Check | Pass | Fail | Notes |
|---|---|---|---|
| /signin page shows "Sign in with LinkedIn" on LinkedIn button | | | |
| /signup page shows "Sign up with LinkedIn" on LinkedIn button | | | |
| /signin page shows GIS-rendered Google button (label is provider-managed) | | | |
| Labels are consistent with surrounding context (signin vs signup) | | | |

---

## SIGN-OFF

| Area | Result | Notes |
|---|---|---|
| LinkedIn loading state | | |
| LinkedIn error states — visual | | |
| LinkedIn error states — screen reader | | |
| Company setup modal — visual | | |
| Company setup modal — screen reader | | |
| Sign-out flow | | |
| LinkedIn button labels | | |

**Tester:** ___________________
**Date:** ___________________
**Pass / Fail / Partial:** ___________________
