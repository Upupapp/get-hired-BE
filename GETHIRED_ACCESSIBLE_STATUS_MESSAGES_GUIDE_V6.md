# GETHIRED ACCESSIBLE STATUS MESSAGES GUIDE V6
**Date:** 2026-07-01

Accessibility audit for all status messages, updated with V6 surfaces.

---

## Core ARIA Primitives

| Pattern | When to use |
|---|---|
| `role="alert"` | Errors and critical status changes — announces immediately (equivalent to aria-live="assertive") |
| `aria-live="polite"` | Non-critical status changes — waits for user pause to announce |
| `aria-live="assertive"` | Use sparingly — only for genuinely time-critical alerts that must interrupt |
| `role="status"` | Success / info messages — equivalent to aria-live="polite" |
| `aria-atomic="true"` | The entire region is read as one announcement, not piecemeal |
| `aria-labelledby` | Connects a modal/dialog/section to its heading |
| `aria-describedby` | Connects a form field to its error/help text |

---

## V6: LinkedIn Complete — Accessibility Audit

### Loading State

```html
<div class="li-complete-loading" aria-live="polite">
  <div class="li-complete-spinner" role="status" aria-label="Completing LinkedIn sign-in"></div>
  <p class="li-complete-label">Completing LinkedIn sign-in…</p>
</div>
```

| Criterion | Status | Note |
|---|---|---|
| Screen reader announces loading | Yes | aria-live="polite" fires when text appears |
| Loading text is present | Yes | "Completing LinkedIn sign-in…" |
| Spinner is decorative for SR | Partial | role="status" + aria-label cause duplicate announcement with parent live region |
| Recommendation | Cleanup | Remove role="status" from spinner; the text in the live region is sufficient |

### Error State (FIXED: V6-NOT-001)

```html
<!-- After fix -->
<div role="alert" aria-atomic="true" class="li-complete-error-region">
  <svg aria-hidden="true">...</svg>
  <h2 class="li-complete-error-title">Sign-in failed</h2>
  <p class="li-complete-error-msg">{{ errorMessage }}</p>
</div>
<button class="li-complete-retry-btn" (click)="retry()">Try again</button>
```

| Criterion | Status | Note |
|---|---|---|
| Error announced to screen readers | YES (fixed) | role="alert" fires immediately when error state renders |
| aria-atomic ensures full announcement | YES | Heading + message read together |
| Error icon hidden from SR | Yes | aria-hidden="true" on SVG |
| Retry button accessible | Yes | Button with text label |
| Retry button outside alert div | Yes (intentional) | Prevents double-announce of button within role="alert" |

---

## V6: Company Setup Modal — Accessibility Audit

| Element | Pattern | Status | Issue |
|---|---|---|---|
| Dialog | role="dialog" aria-modal="true" aria-labelledby | Yes | Good |
| Title | id="gh-setup-modal-title" — referenced by aria-labelledby | Yes | Accessible |
| Header div | aria-hidden="true" | Risk | Hides title/eyebrow/badge from SR — h2 still reached via labelledby reference, but badge "7-day free trial" is hidden |
| Confetti ring SVG | aria-hidden="true" | Yes | Correct — decorative |
| Check icon SVG (inside header hidden) | (hidden by parent) | Risk | But decorative, so acceptable |
| Trial badge | Inside aria-hidden header | Risk | "7-day free trial active" hidden from SR |
| Checklist | role="list" aria-label="Getting started checklist" | Yes | Good |
| Checklist items | aria-label="[label] — completed / to do" | Yes | Good |
| Primary/secondary buttons | No explicit aria-label (text label is clear) | Yes | Good |
| Tertiary "View public profile" button | aria-label="View public company profile — opens in new tab" | Yes | Good |
| Dashboard link button | No aria-label (text is clear) | Yes | Good |

**Key gap:** The `<div class="gh-setup-modal__header" aria-hidden="true">` hides the trial badge from screen readers. The h2 title IS still accessible via `aria-labelledby` (this reference bypasses `aria-hidden` on the referenced element's ancestors per ARIA spec — confirmed). However the trial badge text "7-day free trial active" is inside the hidden region and NOT referenced elsewhere, so screen readers miss it.

**Fix:** Remove `aria-hidden="true"` from the header div. Move it to the confetti ring only (which already has its own `aria-hidden="true"` — so this is already correct on the SVG). The confetti ring SVG itself has `aria-hidden="true"`, so removing the parent div's `aria-hidden` will not cause the confetti SVG to be read.

**Severity:** Medium — trial duration is material information.

---

## V6: Sign-Out — Accessibility

Sign-out navigates silently to /signin. No live region, no `aria-live` announcement of the sign-out action. The /signin page renders with no announcement. Screen reader users land on the form without context.

**Recommendation:** When implementing the sign-out message (low-severity, deferred), ensure the message is in a `role="status"` region on /signin so it is announced.

---

## Full System Accessibility Status

| Surface | role="alert"? | aria-live? | Status |
|---|---|---|---|
| Email/password signin error | Yes (role="alert" on alert div) | No separate live | Good |
| Google auth error | Yes (role="alert" on alert-danger div) | No | Good |
| LinkedIn auth error (V6) | YES (fixed V6-NOT-001) | No (role=alert covers it) | Good |
| LinkedIn auth loading (V6) | N/A | aria-live="polite" | Good |
| Company setup modal (V6) | N/A (success) | N/A | Partial (trial badge hidden) |
| Role classification error | No | No | V5 gap — open |
| Toast notifications | Library-dependent | Unknown | Partial |
| Sign-out | None | None | Low-severity gap |
| Session expiry (401) | None | None | Medium gap |

---

## Quick Reference: Accessible Error Pattern

```html
<!-- For L4 full-page error (OAuth callbacks, etc.) -->
<div role="alert" aria-atomic="true">
  <h2>Sign-in failed</h2>
  <p>{{ specificErrorMessage }}</p>
</div>
<button (click)="retry()">Try again</button>

<!-- For L3 alert banner (form pages) -->
<div class="alert alert-danger" role="alert" aria-live="assertive">
  {{ errorMessage }}
</div>

<!-- For L2 loading state -->
<div aria-live="polite" role="status">
  <span class="spinner" aria-hidden="true"></span>
  <span>Saving…</span>
</div>
```
