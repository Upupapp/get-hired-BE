# GETHIRED NOTIFY FIX LOG V6
**Date:** 2026-07-01

Log of all fixes applied during NOTIFY V6. Small safe copy/markup fixes only.

---

## Fixes Applied (V6)

### V6-NOT-001 — LinkedIn Error State: Add role="alert" for Screen Readers
**Severity:** High (accessibility)
**File:** `src/app/auth/linkedin-complete/linkedin-complete.component.html`
**Status:** APPLIED

**Problem:** The LinkedIn complete page swaps from a loading spinner to an error card when sign-in fails. This swap is a DOM replacement, not an `aria-live` region content update — so screen readers do not announce the error. Users relying on screen readers would hear nothing when sign-in fails.

**Fix:** Wrapped the error icon, heading, and paragraph in:
```html
<div role="alert" aria-atomic="true" class="li-complete-error-region">
```

The retry button is intentionally kept outside the `role="alert"` div to avoid double-announcement of interactive elements within alert regions (a common screen reader quirk).

**Before:**
```html
<ng-container *ngIf="!loading && errorCode">
  <svg class="li-complete-error-icon" ...>...</svg>
  <h2 class="li-complete-error-title">Sign-in failed</h2>
  <p class="li-complete-error-msg">{{ errorMessage }}</p>
  <button class="li-complete-retry-btn" (click)="retry()">Try again</button>
</ng-container>
```

**After:**
```html
<ng-container *ngIf="!loading && errorCode">
  <!-- V6-NOT-001: role="alert" ensures screen readers announce the error immediately -->
  <div role="alert" aria-atomic="true" class="li-complete-error-region">
    <svg class="li-complete-error-icon" ...>...</svg>
    <h2 class="li-complete-error-title">Sign-in failed</h2>
    <p class="li-complete-error-msg">{{ errorMessage }}</p>
  </div>
  <button class="li-complete-retry-btn" (click)="retry()">Try again</button>
</ng-container>
```

**Test:** Navigate to `/linkedin/complete?error=server_error`. Activate screen reader (VoiceOver / NVDA). Confirm "Sign-in failed. Something went wrong on our end. Please try again." is announced immediately without requiring focus.

---

## Fixes Documented Only (Deferred — Not Applied This Run)

| ID | Description | File | Reason Deferred |
|---|---|---|---|
| V6-NOT-002 | Remove role="status" from spinner (duplicate with aria-live parent) | linkedin-complete.component.html | Low severity cosmetic cleanup |
| V6-NOT-003 | Change "You're all set" eyebrow to "Welcome aboard" | employer-company-setup-success-modal.component.html | Low severity; PM decision needed |
| V6-NOT-004 | Remove aria-hidden from company modal header div (exposes trial badge) | employer-company-setup-success-modal.component.html | Medium severity; needs review of visual impact |
| V6-NOT-005 | Add sign-out confirmation message | header.component.ts + employer-panel.component.ts | Requires sessionStorage or query-param mechanism |
| V6-NOT-006 | Add session expiry message in 401 interceptor | core/interceptor/unauthorize.interceptor.ts | Requires sessionStorage mechanism (localStorage already cleared) |
| V6-NOT-007 | Improve invalid_nonce copy: "replay detected" → human readable | linkedin-complete.component.ts | Low severity; no user impact on this rare path |
| V6-NOT-008 | Add what-next to invalid_issuer / invalid_audience / missing_sub errors | linkedin-complete.component.ts | Low/medium severity; rare paths |

---

## Carry-Forward Open from V5

| V5 ID | Description | Status |
|---|---|---|
| V5-NOT-001 | GIS script load failure — no user message | Still open |
| V5-NOT-002 | Role classification submit — no loading indicator | Still open |
| V5-NOT-003 | 409 message referring to non-existent "link account settings" | Fixed V5 |

---

## Total Fix Summary

| Version | Applied | Documented only |
|---|---|---|
| V5 | 1 (NOT-003 — 409 message) | 2 (NOT-001, NOT-002) |
| V6 | 1 (V6-NOT-001 — LinkedIn role=alert) | 7 (V6-NOT-002 through V6-NOT-008) |
| **Cumulative** | 2 | 9 |
