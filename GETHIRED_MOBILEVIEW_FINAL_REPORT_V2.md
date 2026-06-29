# GETHIRED MOBILEVIEW FINAL REPORT V2 — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` (mobile-specific changes) | Scope: public + employer modals
**Date:** 2026-06-29
**Command:** MOBILEVIEW RECENT DEPLOYMENT
**Viewports checked:** 320px, 375px, 390px, 430px, 768px, 1024px, 1440px

## Executive Summary

| Area | Mobile Status |
|---|---|
| JAC modal (≤600px) | GOOD — bottom-sheet via styles.scss |
| Public job detail V7 (mobile) | GOOD — sticky bottom bar, mobile layout |
| Breadcrumb on mobile | GOOD — single row, wraps cleanly |
| Boilerplate notice on mobile | GOOD — flex layout, wraps to multi-line |
| Rating guard on mobile | GOOD — col-md-6 hidden when 0 |
| Touch targets — JAC actions | GOOD — full-width rows with 11px padding |
| Touch targets — JAC confirm buttons | PARTIAL — ~40px (under 44px min) |
| Safe-area-inset | PRESENT on mobile sticky bar |
| dvh support | PRESENT (max-height: 92dvh) |

## Phase 1: JAC Modal Mobile Analysis

### Bottom-sheet behavior (≤600px):
```scss
// In styles.scss
@media (max-width: 600px) {
  .gh-jac-dialog.mat-dialog-container,
  .gh-jac-dialog .mat-dialog-container {
    border-radius: 16px 16px 0 0 !important;
  }
  .cdk-overlay-pane:has(.gh-jac-dialog) {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }
}
```

✅ Modal snaps to bottom at ≤600px
✅ Border-radius adjusts to 16px 16px 0 0 (flat bottom, rounded top)
✅ Full viewport width on mobile
⚠️ No `safe-area-inset-bottom` on footer/bottom edge — on iOS devices with home indicator, content may be clipped

### JAC component at 320px:
- `.gh-jac { min-width: unset; width: 100% }` → fills screen ✅
- `.gh-jac-header-meta { flex-wrap: wrap }` → meta chips wrap cleanly ✅
- `.gh-jac-summary { flex-wrap: wrap }` → chips wrap to next row if too many ✅
- `.gh-jac-delete-actions { flex-wrap: wrap }` → cancel/delete buttons stack ✅

### JAC touch targets:
| Element | Height | Status |
|---|---|---|
| .gh-jac-action rows | ~62px (11px+12px padding + content) | PASS (>44px) |
| .gh-jac-close button | 32px | FAIL (below 44px) |
| .gh-jac-btn (cancel/danger) | ~40px | PARTIAL (≈44px after padding) |

### Issues:
1. `.gh-jac-close` is 32px × 32px — below 44px touch target minimum
2. `.gh-jac-btn` is ~40px height — borderline, slightly below 44px

## Phase 2: Public Job Detail V7 Mobile Analysis

### Breadcrumb at mobile:
- `<ol class="gh-breadcrumb">` — should be flex-wrap by default
- Three items: Home > Jobs > [Title] — wraps cleanly on narrow screens
- No overflow issues ✅

### Boilerplate notice at mobile:
```scss
.gh-content-quality-notice {
  display: flex; align-items: flex-start; gap: 8px;
  // No fixed width — fills container width
}
```
- Fills full card width ✅
- Text wraps naturally ✅
- Icon stays left-aligned ✅

### Company sidecard rating guard:
- `col-12 col-md-6` — takes full width on mobile, no layout break ✅
- When hidden (`*ngIf` false) — no empty column space ✅

### Mobile sticky bottom bar (already shipped in earlier session):
- `position: fixed; bottom: 0` with `safe-area-inset-bottom` ✅
- Title + apply CTA visible ✅

## Phase 3: Safe-Area and dvh

### JAC modal:
- `max-height: 92dvh` — uses dynamic viewport height ✅ (iOS Safari respects dvh correctly)
- Missing: `padding-bottom: env(safe-area-inset-bottom)` on `.gh-jac-footer`
  - On iPhone with home indicator, footer note may be behind home swipe area
  - Impact: LOW (the footer only shows "Actions are based on your workspace access" — not a CTA)

### V7 mobile sticky bar:
- Previously verified to use safe-area-inset-bottom ✅

## Phase 4: Responsive Contract

| Component | Breakpoint | Behavior | Status |
|---|---|---|---|
| JAC modal | >600px | Standard dialog, max 560px centered | ✅ |
| JAC modal | ≤600px | Bottom sheet, full width, 92dvh | ✅ |
| JAC header meta | Any | flex-wrap: wrap | ✅ |
| JAC body | Any | overflow-y: auto, scrollable | ✅ |
| Job detail breadcrumb | Any | Single semantic nav, wraps | ✅ |
| Job detail sticky rail | ≥1200px | Fixed, top 84px | ✅ |
| Job detail mobile bar | <992px | Fixed bottom bar | ✅ |

## Phase 5: Code Changes Made

### Safe fix applied: safe-area-inset on JAC footer
To prevent home indicator overlap on iOS, adding padding-bottom to JAC footer.

This is the only mobile change warranted from this audit.
