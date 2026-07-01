# GETHIRED NOTIFY BACKLOG V6
**Date:** 2026-07-01

All deferred notification/communication improvements, prioritised. Items from V5 and V6 combined.

---

## Priority: High

### BACKLOG-NOT-H1: GIS Script Load Failure — No User Feedback
**From:** V5-NOT-001
**Description:** If Google Identity Services script fails to load (network error, content blocker, CDN issue), `GoogleSigninButtonComponent` silently retries up to 30 times then stops. No error is shown to the user.
**Impact:** Users with content blockers or poor connectivity see a blank auth area with no explanation.
**Fix:** After max retries, show: "Google sign-in is unavailable. Please sign in with your email and password."
**File:** `src/app/auth/google-signin-button/google-signin-button.component.ts`
**Effort:** Small (1 emit call after polling loop)

---

## Priority: Medium

### BACKLOG-NOT-M1: Role Classification Submit — No Loading State
**From:** V5-NOT-002
**Description:** No loading indicator during `POST /api/auth/choose-role` network call in role classification flow.
**Impact:** User clicks submit, sees nothing, may click again — potential double submission.
**Fix:** Add `isSubmitting` boolean, disable submit button and show spinner during in-flight request.
**File:** `src/app/auth/role-classification/role-classification.component.html` + `.ts`
**Effort:** Small (2-file change)

### BACKLOG-NOT-M2: Company Modal Header aria-hidden Hides Trial Badge
**From:** V6-NOT-004
**Description:** `<div class="gh-setup-modal__header" aria-hidden="true">` hides the "7-day free trial active" badge from screen readers. Trial duration is material business information.
**Fix:** Remove `aria-hidden="true"` from the header div. The confetti SVG already has its own `aria-hidden="true"` so it will remain hidden from SR.
**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.html`
**Effort:** 1-line change (remove aria-hidden from div)

### BACKLOG-NOT-M3: Session Expiry — No User Message
**From:** V6-NOT-006
**Description:** When the 401 interceptor fires and clears the session, the user is redirected to /signin with no message about why. Users who were mid-task are disoriented.
**Fix:** Use sessionStorage (survives localStorage.clear()): `sessionStorage.setItem('gh_session_message', 'Your session expired. Please sign in again.')` before navigating. The /signin page should read and display this.
**File:** `src/app/core/interceptor/unauthorize.interceptor.ts` + `signin.component.ts`
**Effort:** Small (2-file change, sessionStorage pattern)

### BACKLOG-NOT-M4: LinkedIn Error — invalid_issuer / invalid_audience Copy
**From:** V6-NOT-008 (partial)
**Description:** "LinkedIn token validation failed." gives users no path forward.
**Fix:** Change to: "LinkedIn token validation failed. Please try again or contact support."
**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.ts` (ERROR_MESSAGES record)
**Effort:** 1-line change per code (2 lines total)

### BACKLOG-NOT-M5: LinkedIn Error — missing_sub Copy
**From:** V6-NOT-008 (partial)
**Description:** "LinkedIn did not return a user ID." gives users no path forward.
**Fix:** Change to: "LinkedIn didn't return a user ID. Please try again or contact support."
**File:** Same as M4
**Effort:** 1-line change

---

## Priority: Low

### BACKLOG-NOT-L1: Sign-Out Confirmation Message
**From:** V6-NOT-005
**Description:** Users receive no confirmation that sign-out succeeded. They silently land on /signin.
**Fix:** Before sign-out navigation, set `sessionStorage.setItem('gh_session_message', 'You have been signed out.')`. /signin reads and displays it.
**Files:** `header.component.ts`, `employer-panel.component.ts`, `signin.component.ts`
**Effort:** Small (3-file change)

### BACKLOG-NOT-L2: LinkedIn Error — invalid_nonce Jargon
**From:** V6-NOT-007
**Description:** "LinkedIn token replay detected. Please try again." — "replay detected" is developer jargon.
**Fix:** Change to: "The sign-in session was already used. Please try again from the beginning."
**File:** `linkedin-complete.component.ts`
**Effort:** 1-line change

### BACKLOG-NOT-L3: LinkedIn Error — no_access_token Jargon
**From:** V6 audit
**Description:** "LinkedIn did not return an access token. Please try again." — "access token" is slightly technical.
**Fix:** Change to: "LinkedIn didn't complete the sign-in. Please try again."
**File:** `linkedin-complete.component.ts`
**Effort:** 1-line change

### BACKLOG-NOT-L4: LinkedIn Loading — Spinner Duplicate Announcement
**From:** V6-NOT-002
**Description:** Loading spinner has `role="status"` + `aria-label` AND the parent has `aria-live="polite"`. Both will announce the loading text to screen readers.
**Fix:** Remove `role="status"` from the spinner div; the parent live region is sufficient.
**File:** `linkedin-complete.component.html`
**Effort:** 1-line removal

### BACKLOG-NOT-L5: Company Modal Eyebrow "You're all set"
**From:** V6-NOT-003
**Description:** "You're all set" is premature — the checklist immediately below shows two incomplete tasks.
**Fix:** Change to "Welcome aboard" — warm but makes no false completeness claim.
**File:** `employer-company-setup-success-modal.component.html`
**Effort:** 1-word change (PM approval suggested)

### BACKLOG-NOT-L6: Company Modal Tertiary CTA Label
**From:** V6 audit
**Description:** "View public profile" is slightly ambiguous — profile of what?
**Fix:** "View your public page" — clearer ownership and scope.
**File:** `employer-company-setup-success-modal.component.html`
**Effort:** 3-word copy change

### BACKLOG-NOT-L7: loginMessage Set but Never Displayed Post-Auth
**From:** V6 audit
**Description:** All three auth paths (email, Google, LinkedIn) set `loginMessage = 'Sign in was successful.'` / `'Login was successful.'` in localStorage, but the destination pages (dashboard etc.) never read this value. The /signin page reads it but only shows before navigating away.
**Impact:** No user-visible gap (dashboard is implicit success confirmation), but wasted localStorage write on every login.
**Fix:** Either display the message on the destination (e.g. via a welcome toast on first dashboard load) or remove the localStorage write.
**Effort:** Design decision — deferred

---

## Backlog Summary

| Priority | Count | Items |
|---|---|---|
| High | 1 | BACKLOG-NOT-H1 |
| Medium | 5 | M1–M5 |
| Low | 7 | L1–L7 |
| **Total** | **13** | |
