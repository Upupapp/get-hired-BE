# GETHIRED MOBILEVIEW — QA CHECKLIST V6
**Date:** 2026-07-01 | Manual verification checklist for V6 new surfaces

---

## How to Use
Each item should be verified in Chrome DevTools mobile emulation or on a real device. Breakpoints to test: 320px, 375px, 390px, 768px.

---

## Auth — LinkedIn Button

- [ ] `/signin` at 320px: LinkedIn button fills full width (same width as Google button)
- [ ] `/signin` at 375px: LinkedIn button is full-width, 44px tall, visible LinkedIn logo
- [ ] `/signin` at 375px: Tapping LinkedIn button fires the OAuth flow (does not navigate to blank)
- [ ] `/signup` at 320px: LinkedIn button fills full width
- [ ] `/signup` at 375px: LinkedIn button is full-width, label reads "Sign up with LinkedIn"
- [ ] Both pages: "or" divider renders centered between submit and Google buttons ✓ (CSS only)
- [ ] Both pages: Button hover state (`:hover { background: #004182; }`) visible on desktop
- [ ] Both pages: Focus ring visible on keyboard navigation (`outline: 2px solid #fff` + shadow)
- [ ] `prefers-reduced-motion` enabled: LinkedIn button active state has no transform

---

## Auth — LinkedIn Complete Page (/auth/linkedin-complete)

- [ ] Page loads with spinner centered vertically and horizontally (full-vh flex)
- [ ] Spinner animates (border-top LinkedIn coral color)
- [ ] Spinner `aria-label` readable by screen reader
- [ ] At 320px: card is within viewport bounds, no horizontal scroll
- [ ] Error state (`?error=linkedin_denied`): error icon + title + message + retry button all visible
- [ ] Error state: retry button is at least 44px tall
- [ ] Error state: retry button navigates to `/signin`
- [ ] Error state at 320px: long error message wraps gracefully (no overflow)
- [ ] `prefers-reduced-motion` enabled: spinner is static tri-color (not animated)
- [ ] Reduced motion: retry button has no transition

---

## Company Setup Success Modal

- [ ] At 390px: modal appears as bottom-sheet (pinned to bottom, not centered)
- [ ] At 375px: modal has `border-radius: 18px 18px 0 0` visible (rounded top corners only)
- [ ] At 320px: company name with 30+ chars wraps to next line (no horizontal overflow)
- [ ] At 375px: all 3 CTA buttons (Post job / Complete profile / View public profile) stack vertically
- [ ] All 3 CTA buttons are at least 44px tall — verify with DevTools computed height
- [ ] "Go to dashboard" text link: min-height 44px — verify with DevTools computed height
- [ ] Tap "Post your first job" — closes modal, navigates to `/recruiter/jobs/create`
- [ ] Tap "Complete company profile" — closes modal, navigates to `/recruiter/company/settings`
- [ ] Tap "View public profile" — opens `/company/:slug` in new tab (only if slug is set)
- [ ] Tap "Go to dashboard" — closes modal, navigates to `/recruiter/dashboard`
- [ ] On 768px (iPad): modal is centered (not bottom-sheet), full 18px border-radius
- [ ] Check icon animation: scale pop-in (respects `prefers-reduced-motion`)
- [ ] "7-day free trial active" badge visible, pill shape, fits on one line at 375px
- [ ] Checklist items: "Company created" and trial badge show green check-bubble; job + profile items show grey circle
- [ ] Long checklist label "Free trial activated — 7 days full access" wraps correctly at 320px

---

## :has() Fallback Verification

- [ ] Open Chrome DevTools, disable `:has()` support via `Computed Styles` override or test in Chrome 104 emulation
- [ ] At 375px: modal still appears as bottom-sheet (positioned by `gh-bottom-sheet-pane` class, not `:has()`)
- [ ] `gh-bottom-sheet-pane` class is present on `.cdk-overlay-pane` in DOM inspector

---

## Regression Checks (V5 surfaces)

- [ ] `/signin` Google button still renders full-width and 44px
- [ ] `/signup` form scrollable at 320px without horizontal overflow
- [ ] `/jobs` job card grid stacks to single column at 375px
- [ ] Employer dashboard action center readable at 375px
- [ ] Navigation drawer opens/closes on mobile
