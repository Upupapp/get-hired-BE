# GETHIRED MOBILEVIEW — EMPLOYER AUDIT V6
**Date:** 2026-07-01 | **Scope:** Employer panel surfaces

---

## Summary
Employer panel surfaces carry forward as PASS from V5. The only employer-specific new surface in V6 is the **company setup success modal** (bottom-sheet behavior on mobile). All other employer surfaces (dashboard, pipeline, action center, company settings, job posting, messages widget) are unchanged since V5 and retain PASS status.

---

## Company Setup Success Modal — V6 Detailed Audit

**Files:**
- `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.html`
- `src/app/employer-panel/employer-settings/employer-company-setup-success-modal/employer-company-setup-success-modal.component.scss`
- `src/app/employer-panel/employer-settings/employer-settings.component.ts` (dialog opener)
- `src/styles.scss` (panel class override)

### Viewport Analysis

| Breakpoint | Layout | Issues Found | Status |
|---|---|---|---|
| 320×568 | Bottom-sheet (if :has() works) | Company name overflow, dashboard-link touch target | FIXED |
| 375×667 | Bottom-sheet | Border-radius 18px 18px 0 0 ✓, CTA stack fits | PASS |
| 390×844 | Bottom-sheet | All 3 CTAs stack cleanly in flex-column ✓ | PASS |
| 412×915 | Bottom-sheet | Checklist text OK ✓ | PASS |
| 768×1024 | Center modal (560px+ breakpoint) | 18px full border-radius ✓, max-width 480px ✓ | PASS |

### Issues Found & Fixed

**MV6-I1 — Company name overflow at 320px** (MEDIUM)
- `.gh-setup-modal__company-name` had no `overflow-wrap`. A company name >30 chars can push past the container edge.
- **Fixed by MV6-F1**: Added `overflow-wrap: break-word; word-break: break-word;`

**MV6-I2 — Dashboard link touch target 28px** (HIGH — WCAG 2.5.5 FAIL)
- `.gh-setup-modal__dashboard-link` had `padding: 4px 0` + `font-size: 13px`. Computed height ~28px, minimum is 44px.
- **Fixed by MV6-F2**: Added `min-height: 44px; display: inline-flex; align-items: center;`

**MV6-I3 — `:has()` selector not supported in all browsers** (MEDIUM)
- `.cdk-overlay-pane:has(.gh-setup-success-dialog)` controls bottom-sheet positioning at ≤560px.
- `:has()` is only supported Chrome ≥105, Safari ≥15.4, Firefox ≥103. On older browsers, the modal centers instead of bottom-sheeting.
- **Fixed by MV6-F5**: Added `.gh-bottom-sheet-pane` CSS rule as class-based fallback. Changed `panelClass` in employer-settings.component.ts from string to array: `['gh-setup-success-dialog', 'gh-bottom-sheet-pane']`.

### Confirmed OK (no changes needed)

- `.gh-setup-modal` has `@media (max-width: 540px) { padding: 32px 20px 24px; }` ✓
- `.gh-setup-modal__title` has `@media (max-width: 540px) { font-size: 20px; }` ✓
- All `.gh-setup-modal__btn` have `min-height: 44px` ✓
- `.gh-setup-modal__actions` is `flex-direction: column` — all 3 CTA buttons stack full-width ✓
- `border-radius: 18px 18px 0 0` gives correct bottom-sheet look ✓
- Checklist text at `font-size: 14px` with `overflow: visible` — no clipping at 375px ✓
- Confetti ring animation respects `prefers-reduced-motion` ✓
- `gh-setup-success-dialog.mat-dialog-container` has `padding: 0 !important` to strip MatDialog chrome ✓

---

## Other Employer Surfaces — Carry-Forward Status

| Surface | V5 Status | V6 Change | V6 Status |
|---|---|---|---|
| Employer dashboard | PASS | None | PASS |
| Action center widget | PASS | None | PASS |
| Pipeline board | PASS | None | PASS |
| Needs-review list | PASS | None | PASS |
| Job create (Easy Post modal) | PASS | None | PASS |
| Company settings | PASS | None | PASS |
| Subscription page | PASS | None | PASS |
| Messages widget | PASS (deferred) | None | PASS |

---

## V6 Employer Result: GO WITH CAUTION (modal fixed, :has() fallback added)
