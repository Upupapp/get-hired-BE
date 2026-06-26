# GETHIRED BRAND — ACCESSIBILITY GUARDRAILS (RECENT 3)
**Date:** 2026-06-26

---

## 1. WCAG 2.1 Compliance Status

### 1.1 Touch Targets (WCAG 2.5.5 — Level AAA, but industry standard)

| Element | `min-height` | Method | Pass? |
|---|---|---|---|
| `.btn-apply-now` | 44px | explicit `min-height` | YES |
| `.btn-cta-primary` (portal) | 44px | `padding: 12px 24px` + `min-height: 44px` | YES |
| `.btn-link-cta` | 44px | `padding: 12px 8px` + `min-height: 44px` | YES |
| Breadcrumb `<a>` links | 44px | `display: inline-flex; min-height: 44px; padding: 0 4px` | YES |
| `.mat-icon-button`, `.icon-btn` | 44×44px | `min-width/height: 44px` in styles.scss | YES |
| Share icon `<img>` | 45px (height attr) | style attribute height (not a button) | MARGINAL |

### 1.2 Color Contrast (WCAG 1.4.3 — Level AA)

| Element | Foreground | Background | Ratio | Pass 4.5:1? |
|---|---|---|---|---|
| Breadcrumb active text | #374151 | #ffffff | 10.7:1 | YES |
| Breadcrumb muted text | #6b7280 | #ffffff | 4.83:1 | YES (just passes) |
| Error state `<h5>` | #1a1a1a (inherited) | #ffffff | ~18:1 | YES |
| Error state `<p>` | #6b7280 | #ffffff | 4.83:1 | YES |
| `.warn-snackbar` | #ffffff | #b45309 | 5.02:1 | YES |
| `.error-snackbar` | #ffffff | #FE6F61 | 2.74:1 | FAIL (pre-existing) |
| `.success-snackbar` | #ffffff | #FF7062 | 2.71:1 | FAIL (pre-existing) |
| `.danger-snackbar` | #ffffff | #FE6F61 | 2.74:1 | FAIL (pre-existing) |
| `.info-snackbar` | #ffffff | #6b7280 | 4.83:1 | YES |
| `.session-banner` text | #b45309 | #fff8f0 | ~5.7:1 | YES |

### 1.3 Reduced Motion (WCAG 2.3.3 — Level AAA)

All new animations in this deployment are:
- Either wrapped in `@media (prefers-reduced-motion: no-preference)` (only fires when motion is OK)
- Or listed in the `@media (prefers-reduced-motion: reduce)` block with `animation: none`
- Global `styles.scss` contract: `animation-duration: 0.01ms !important` on `prefers-reduced-motion: reduce` acts as a final catch-all.

**Status: PASS for all new elements. Pre-existing gap: camera.gif loops regardless.**

### 1.4 Focus Management (WCAG 2.4.7 — Level AA)

- Global `:focus-visible` rule in `styles.scss`: `outline: 2px solid $color-global-red-buttons; outline-offset: 2px`
- `.btn-apply-now:focus-visible`: `outline: 2px solid $color-global-red-buttons; outline-offset: 3px; border-radius: 5px`
- Breadcrumb `a:focus-visible`: `outline: 2px solid currentColor; border-radius: 2px`
- `.btn-link-cta:focus-visible`: `outline: 2px solid $color-global-red-buttons; outline-offset: 2px`
- `.btn-cta-primary`: No explicit `focus-visible` rule — relies on browser default. Pre-existing gap.

### 1.5 Semantic HTML (WCAG 1.3.1)

- Error state: `role="alert"` + `aria-live="assertive"` — correct
- Breadcrumb: `<nav aria-label="Breadcrumb">` + `<ol>` + `aria-current="page"` — correct
- Loading spinner: `<img>` with no `alt` — pre-existing gap

---

## 2. New Accessibility Wins (This Deployment)

1. Error state has `role="alert"` + `aria-live="assertive"` — immediate screen reader announcement.
2. Error state has context-sensitive copy — two distinct messages for auth vs. not-found.
3. Breadcrumb has `aria-label="Breadcrumb"` and `aria-current="page"` on current crumb.
4. SSR HTTP 404 on error — assistive technology users following links won't reach a silent soft-404.
5. 44px touch targets on all new interactive elements.

---

## 3. Open Accessibility Debts (Deferred)

| ID | Issue | Standard | Priority |
|---|---|---|---|
| A1 | `.success-snackbar` / `.danger-snackbar` / `.error-snackbar` contrast 2.7:1 | WCAG 1.4.3 | Moderate |
| A2 | Share icon `<img (click)>` — not a button, no role, no focus | WCAG 2.1.1 | Moderate — pre-existing |
| A3 | `camera.gif` loops under `prefers-reduced-motion: reduce` | WCAG 2.3.3 | Low |
| A4 | `camera.gif` `<img>` no alt attribute | WCAG 1.1.1 | Low |
| A5 | `.btn-cta-primary` no explicit `focus-visible` ring | WCAG 2.4.7 | Low |
| A6 | `mainAnimations` (`@animate` directive) not audited for reduced-motion | WCAG 2.3.3 | Low |
