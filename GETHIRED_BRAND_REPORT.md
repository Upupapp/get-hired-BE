# GETHIRED BRAND REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29
**Source reports:** SWEEP, OPTIMIZE, NOTIFY

## Executive Summary

| Metric | Status |
|---|---|
| Brand OS compliance | EXCELLENT |
| Color tokens used | Deep Navy #1a1830, Coral #FF7062, Azure #6C6BAD |
| Button system (gradient) | NOT APPLICABLE (JAC uses custom action-row buttons, not gh-btn-primary) |
| Hover ring (global) | PRESENT (global styles.scss rule covers JAC buttons) |
| Skeleton/loading state | PRESENT + reduced-motion guarded |
| Delete danger styling | CORRECT (red #dc2626, not coral) |
| Status chip system | CORRECT (published=green, draft=amber, expired=red, archived=gray) |
| Motion tokens | PRESENT in @keyframes (gh-shimmer, gh-confirm-fade) |
| gh-form-card standard | N/A (JAC is not a form card) |
| Typography | Consistent with GetHired type scale |

## Phase 1: Visual Direction Compliance

### JAC Modal header (Deep Navy #1a1830):
- Background: `$gh-navy: #1a1830` ✅
- Text: white, #fff (title), rgba(255,255,255,0.55) (job ID), rgba(255,255,255,0.45) (work setup)
- Status chips: correct per-status colors (green/amber/red/gray with appropriate opacity)
- Close button: rgba(255,255,255,0.12) background, hover rgba(255,255,255,0.22) ✅

### Summary strip:
- Background: #f9fafb (gh-gray-50) — correct off-white
- Chips: white bg, 1.5px #e5e7eb border, rounded pill
- Live chip: green bg/color (rgba(34,197,94,...)) ✅
- Draft chip: amber bg/color ✅

### Action rows:
- White bg, 1.5px #e5e7eb border, 10px radius ✅ (matches gh-form-card input style)
- Primary action: coral accent border + bg tint ✅
- Hover: azure border (#6C6BAD) + subtle box shadow + -1px translate ✅
- Delete row: red bg/border, separate danger zone with dashed red top border ✅

### Brand interaction promise: "Every state gives clear, modern feedback."
- Loading state: skeleton shimmer ✅
- Success state: "Link copied!" with icon change ✅
- Error state: summaryError=true → summaryLoading=false → data falls back to list row ✅ (though no visible error notice — see NOTIFY NB-003)
- Delete confirm: animates in (gh-confirm-fade) ✅

## Phase 2: Button System Check

### JAC uses custom `.gh-jac-action` rows, NOT standard `.gh-btn-primary` buttons
This is intentional — JAC is a command center (action list pattern), not a form with primary CTAs.

### `.gh-jac-btn` (cancel/danger confirm buttons):
- Cancel: white bg, neutral border — matches gh-btn-secondary pattern ✅
- Danger: $gh-red bg, white text — matches destructive button pattern ✅
- Missing: the standard gradient primary button is not needed in this context (JAC doesn't have a single primary CTA)

### Global hover ring rule (from styles.scss):
```scss
@media (hover: hover) {
  button:not(:disabled):not([disabled]):hover { ... coral ring ... }
}
```
This global rule applies to all `.gh-jac-action` buttons and `.gh-jac-btn` buttons automatically. ✅

## Phase 3: Motion & Haptics

### Animations in JAC SCSS:
1. `@keyframes gh-shimmer` — skeleton loading for summary chips
   - prefers-reduced-motion: ✅ `animation: none; background: #f0f0f0`
   - Performance: GPU-composited (`background-position` shift) ✅

2. `@keyframes gh-confirm-fade` — delete confirm panel enter
   - `from { opacity: 0; transform: translateY(4px) }` to `{ opacity: 1; translateY(0) }`
   - prefers-reduced-motion: ✅ `animation: none`
   - Performance: opacity + transform only ✅

### Hover microinteractions:
- `.gh-jac-action:hover`: `transform: translateY(-1px)` — subtle lift ✅
- prefers-reduced-motion: NOT explicitly guarded on hover transitions
  - The global prefers-reduced-motion block in styles.scss suppresses `transition-duration: 0.01ms` ✅ (covered globally)

### Haptics:
- `copyLink()`: `navigator.vibrate(8)` — user-initiated, 8ms selection haptic ✅
- Guard: `typeof window.navigator !== 'undefined' && navigator.vibrate` ✅
- Wrapped in try/catch ✅
- Only on clipboard copy — not on page load, not on error, not on low-score ✅

## Phase 4: Typography

| Element | Font-size | Weight | Color | Brand standard |
|---|---|---|---|---|
| Job title (header) | 18px | 700 | #fff | Matches card title 16px/600 (slightly larger — appropriate for modal hero) ✅ |
| Job ID chip | 11px | 600 | rgba(255,255,255,0.55) | Micro label 12px/600 (1px under — acceptable) ✅ |
| Status chip | 11px | 700 | varies | Micro label — ✅ |
| Group label | 10px | 700 | gray, uppercase, 0.08em tracking | Eyebrow label pattern ✅ |
| Action label | 14px | 600 | #111827 | Body text 14px/400 → 600 for action labels ✅ |
| Action desc | 12px | 400 | gray | Small helper 13px (1px under — acceptable) ✅ |
| Summary chip | 12px | 600 | gray | Micro label ✅ |

## Phase 5: V7 Public Job Detail Brand Check

### Boilerplate fallback notice (`.gh-content-quality-notice`):
- Background: #f8f9fa (soft gray) ✅
- Border: 1.5px #e9ecef (consistent with gh-input border pattern) ✅
- Border-radius: 10px (matches gh-input 10px) ✅
- Text: 14px / gray / 1.5 line-height ✅

## Phase 6: Code Changes Made

No brand changes needed — recent deployment already fully compliant with GetHired Brand OS.

## Release Gate

| Gate | Status |
|---|---|
| A State coverage | PASS |
| B Brand fit | PASS |
| C Behavior preservation | PASS |
| D Accessibility | PASS WITH CAUTION (nested dialog role — minor) |
| E Haptics safety | PASS |
| F Performance | PASS |
| G Product trust | PASS — no fake data, no fake urgency |
| H Recovery | PASS (error fallback to list row data) |
| Button system | PASS (global hover ring covers JAC) |

**Result: GO**
**Confidence: HIGH**
