# GetHired — Application Completeness CTA Log V2

**Date:** 2026-06-24  
**Phase:** 11 (CTA subsystem)

---

## CTAs Implemented

### 1. Badge Toggle Button (applicant-applications list)
- **Type:** `<button>` (not `<a>`) — triggers JS action, not navigation
- **Action:** `toggleSnapshot(app.jobApplicationId)` — expands/collapses card
- **Accessibility:** `aria-expanded`, `aria-controls`, `:focus-visible` ring
- **Chevron indicator:** rotates 90°→270° (CSS transition, motion-safe)

### 2. Profile Update CTA (Required Tips block)
- **Type:** `<a routerLink="/user/profile/edit">`
- **Text:** "Update your profile →" with `aria-hidden="true"` on arrow
- **SCSS:** `.acdc-cta` — `color: $color-global-red-buttons`, `:hover` underline, `:focus-visible` ring
- **Context:** Amber required tips block only

### 3. Profile Add CTA (Recommended Tips block)
- **Type:** `<a routerLink="/user/profile/edit">`
- **Text:** "Add to your profile →" with `aria-hidden="true"` on arrow
- **Context:** Blue recommended tips block only

### 4. Retry Button (Error state)
- **Type:** `<button>` — emits `retryClick` output
- **Text:** "Try again"
- **Wiring:** Parent (`applicant-applications`) calls `onSnapshotRetry()` which re-runs `loadSnapshots()`
- **Accessibility:** `:focus-visible` ring

### Analytics Events
- `trackApplicationCompletenessViewed(applicationId)` — fired on card expand
- `trackApplicationCompletenessCtaClicked(applicationId, ctaLabel)` — available but not wired to CTA link clicks (links use routerLink, not click handlers; would require a click handler wrapper)

### WCAG Compliance
- All CTAs have visible focus rings via `:focus-visible`
- No `outline: none` or `outline: 0` on any interactive element
- Color is not the only indicator of interactive affordance (underline on hover)
