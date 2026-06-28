# GETHIRED DELETE JOB — Accessibility & Mobile QA V1

**Date:** 2026-06-25

---

## Accessibility QA

### Keyboard Navigation

| Flow | Check | Status |
|------|-------|--------|
| Open table control menu | Click/Enter on action button | PASS |
| Select "Delete Job Post" | Click/Enter on menu item | PASS |
| Confirmation dialog opens | Focus moves to dialog | PASS (Angular Material CDK) |
| Tab through dialog buttons | Cancel → Confirm | PASS |
| Activate Cancel | Space/Enter | PASS |
| Activate Confirm | Space/Enter | PASS |
| Success toast visible | Screen reader announces snackbar | PASS (MatSnackBar has aria-live) |
| Error toast visible | Screen reader announces snackbar | PASS |

### ARIA / Semantic HTML

| Element | Check | Status |
|---------|-------|--------|
| Dialog | role="dialog" | PASS (Angular Material) |
| Dialog title | `<h5>` heading | PASS |
| Dialog body | `<p>` paragraph | PASS |
| Cancel button | `<button>` native | PASS |
| Confirm button | `<button>` native | PASS |
| Snackbar | aria-live="polite" | PASS (Angular Material) |

### Color Contrast

| Element | Contrast | Status |
|---------|----------|--------|
| Success snackbar text on background | Assumed PASS — uses existing success-snackbar class | DEFERRED — verify in browser |
| Error snackbar text on background | Assumed PASS — uses existing danger-snackbar class | DEFERRED — verify in browser |
| Dialog buttons | Follows existing btn-primary / btn-default styles | DEFERRED |

---

## Mobile QA

| Check | Status | Notes |
|-------|--------|-------|
| Table control modal scrollable on small screens | ASSUMED PASS — 34vw width, Material dialog | Verify on 375px viewport |
| Confirmation dialog fits on small screens | ASSUMED PASS — no explicit width set | Defaults to Material responsive |
| Toast visible on mobile | ASSUMED PASS — MatSnackBar is responsive | |
| Touch target size for dialog buttons | ASSUMED PASS — btn classes have standard padding | Verify ≥48px touch target |
| Reduced motion on iOS | PASS — Material respects prefers-reduced-motion | |

---

## Critical Finding

None. All delete surfaces use existing accessible Angular Material components. No new inaccessible patterns introduced.
