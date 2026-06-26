# GETHIRED BRAND — HAPTICS SPEC (RECENT 3)
**Date:** 2026-06-26

---

## 1. Haptic Design Principles

GetHired does not use the Web Vibration API (mobile haptics). "Haptics" in this context means visual press-response (scale compression) that gives tactile-feel feedback on touch and mouse-press events. The spec is:

- **Scale token:** `$gh-scale-press: 0.985` (subtle, not dramatic)
- **Duration:** 100ms for `.gh-pressable`, $motion-duration-micro (160ms) for `.btn-apply-now`
- **Easing:** $motion-ease-standard
- **Touch-only global rule:** `@media (hover: none) and (pointer: coarse)` — applies `scale($gh-scale-press)` on `.mat-raised-button:active`, `.mat-flat-button:active`, `.btn:active`, `.gh-card:active`

---

## 2. Haptic Coverage Audit (Recent Changes)

### Primary CTAs (`btn-cta-primary`)
All instances in public portal have `gh-pressable`. Confirmed in prior V5 audit.

### Job Detail Apply Button (`.btn-apply-now`)
```scss
.btn-apply-now {
  min-height: 44px;
  &:active {
    transform: scale($gh-scale-press);
    transition: transform $motion-duration-micro $motion-ease-standard;
  }
}
```
- Does not use `.gh-pressable` class — uses inline `:active` rule instead. Equivalent outcome.
- Covered in reduce block: `transform: none` on `.btn-apply-now:active`.
- **Status: CORRECT**

### Secondary CTAs (`btn-link-cta`)
No haptic class — intentional. Text links do not warrant scale compression. Consistent throughout.

### Share Icon (job detail)
```html
<img style="height: 45px; cursor: pointer;" (click)="getShareableLink(...)">
```
- No haptic class. Gap: interactive image has no press feedback.
- Pre-existing — not introduced by recent changes.

---

## 3. Touch Target Compliance

| Element | Class | `min-height` | Compliant |
|---|---|---|---|
| `.btn-apply-now` | job detail apply | `44px` | YES |
| `.btn-cta-primary` | portal CTAs | `44px` | YES |
| `.btn-link-cta` | portal text links | `44px` | YES |
| Breadcrumb links | `<a>` in `.gh-breadcrumb-item` | `min-height: 44px; padding: 0 4px` via `display: inline-flex` | YES |
| `.mat-icon-button`, `.icon-btn` | global | `min-width: 44px; min-height: 44px` in styles.scss | YES |
| Form controls (mobile) | global | `min-height: 44px` at ≤767px in styles.scss | YES |
| Share icon (`<img>`) | cursor:pointer only | 45px height (just passes via style attr) | MARGINAL — not a button element |

---

## 4. WCAG 2.5.5 Summary

**Conformance target: 44×44px touch targets**

- All new elements from this deployment meet 44px.
- Pre-existing gap: share icon (`<img>` with click handler) is not a button — no accessible role, no focus handling, no haptic feedback. Deferred.
