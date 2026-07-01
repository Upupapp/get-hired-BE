# GETHIRED SUCCESS MESSAGES GUIDE V6
**Date:** 2026-07-01

All success states audited, with V6 additions for company setup modal and LinkedIn auth success.

---

## Success Message Standard

A success message must:
1. Confirm the specific action that completed
2. If there are next steps, show them
3. Not overstate completeness ("You're all set" when tasks remain)
4. Be accessible (either a live region announcement or modal with proper focus management)

---

## V6: LinkedIn Auth Success

LinkedIn auth success navigates away immediately — there is no lingering success message on the `/linkedin/complete` page. The `handleCompleteResponse` method in `linkedin-auth.service.ts` calls `storeSession()` which navigates to the appropriate dashboard.

The `storeSession()` method sets `loginMessage = 'Sign in was successful.'` in localStorage. This message is read by the destination page (signin component reads it on init, but that's not the destination). The destination pages (dashboard, company setup, etc.) do NOT read `loginMessage` — so this localStorage value is set but never displayed.

**Issue:** The "Sign in was successful." message is set by `linkedin-auth.service.ts:121` but never shown to the user after LinkedIn auth success.

**Context:** This is the same pattern as Google auth (google-auth.service.ts:257 also sets loginMessage but navigates to dashboard, not /signin). The message only shows on /signin, which is only the destination for error/fallback flows.

**Assessment:** Low severity — the user arrives at the dashboard which is implicit confirmation of success. No change required.

---

## V6: Company Setup Success Modal

**File:** `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.html`

| Element | Content | Assessment |
|---|---|---|
| Eyebrow | "You're all set" | Issue — two tasks remain incomplete |
| Title | "Welcome to GetHired, [companyName]" | Good |
| Trial badge | "7-day free trial active" | Good |
| Checklist done items | "Company created", "Free trial activated — 7 days full access" | Good — accurate |
| Checklist to-do items | "Post your first job", "Complete company profile" | Good — clear next steps |
| Primary CTA | "Post your first job" | Good |
| Secondary CTA | "Complete company profile" | Good |

**Recommended eyebrow change:** "Welcome aboard" → removes the premature completion implication while maintaining warmth.

---

## V6: Sign-Out "Success"

Sign-out is confirmed only implicitly by arriving at /signin. No confirmation message is set. The `loginMessage` localStorage mechanism exists but is not used for sign-out.

**Recommendation:** Before `localStorage.clear()`, set a sign-out message that survives the clear. This requires a session-storage or query-param mechanism since localStorage is cleared. Options:
1. Use `sessionStorage` for the sign-out message (survives localStorage.clear())
2. Navigate with query param: `/signin?message=signed_out`
3. Set message before clearing: `localStorage.setItem('loginMessage', 'You have been signed out.')` and ensure signin component reads it before `localStorage.clear()` in `ngOnInit`.

Option 3 is the simplest but fragile — the signin `ngOnInit` calls `this.onAlertClose()` which immediately clears the message. Option 2 (query param) is the cleanest.

**Severity:** Low. Deferred.

---

## Full System Success Messages

| Flow | Message | Type | Quality |
|---|---|---|---|
| Email/password login | "Login was successful." (localStorage — never shown to user) | localStorage only | Functional gap — set but never displayed post-login |
| Google auth success | "Sign in was successful." (localStorage — never shown) | localStorage only | Same gap |
| LinkedIn auth success (V6) | "Sign in was successful." (localStorage — never shown) | localStorage only | Same gap |
| Role classification → success | Navigates to dashboard (silent) | Navigation | Acceptable — dashboard is implicit success |
| Company setup success (V6) | Full L5 modal with checklist | Modal | Good (minor eyebrow issue) |
| Job published | Toast | L2 | Good |
| Job application submitted | Toast | L2 | Good |
| Profile saved | Toast | L2 | Good |
| Password reset | Toast / redirect | L3 | Good |
| Subscription activated | Toast / modal | L2/L5 | Good |

---

## Success Copy Standards

| Do | Don't |
|---|---|
| Name the specific action ("Company created") | "Success!" with no context |
| Confirm milestone with personalization ("Welcome to GetHired, [name]") | Generic celebration copy |
| Show next steps when available | Leave user on a dead-end confirmation |
| "You're all set" only when all steps are complete | "You're all set" when checklist still has open items |
| "Free trial activated — 7 days full access" (specific duration) | "Trial is active" (no duration) |
