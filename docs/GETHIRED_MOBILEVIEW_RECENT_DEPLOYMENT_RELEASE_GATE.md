# GetHired MOBILEVIEW Recent Deployment Release Gate
**Date:** 2026-06-26

---

## Gate A — Mobile block gone

**Status: PASS**

Evidence:
- `app.component.ts`: No `checkScreenSize()`, no `isSmallScreen`, no `HostListener('window:resize')`, no screen-width conditional logic.
- `app.component.html`: Single line `<router-outlet></router-outlet>`. No blocking wrapper, no `*ngIf` on screen size, no desktop-only splash element.

---

## Gate B — NOTIFY-P2 Dialogs usable on mobile

**Status: PASS** (with fixes applied)

Evidence:
- Global `styles.scss` BL-010 block forces all MatDialog overlays to `width: 100%`, `max-width: 100vw`, `max-height: 90vh`, `overflow-y: auto` at `≤767px`. Applies to all three dialogs.
- Dialog contents use Bootstrap `col-12 col-md-6` grids that stack correctly on mobile.
- `import-add-contact` and `import-add-candidate` openers already had `maxHeight: '90vh'`.
- `import-add-user` opener was missing `maxWidth`/`maxHeight` — **fixed in this audit** (company-users.component.ts).
- Form inputs in all three dialogs have `min-height: 44px` touch targets.
- Bottom-sheet slide-up animation from BL-010 gives a native-feeling interaction on mobile.

**Residual gap (not blocking):** Remove-document icon inside the file upload preview is a 15px tap target. Functional workaround exists (choosing a new file re-triggers the input). Deferred.

---

## Gate C — Public pages mobile-responsive

**Status: PASS** (with one fix applied)

Evidence:
- Job list (`job-posts-list.component.html`): `col-12` at mobile in both list and grid view modes. Correct.
- Job card (`job-card.component.html`): Full content rendered on mobile, no `d-none d-lg-block` hiding. Responsive flex layout.
- Job detail page (`job-posts-details.component.html`): `col-12 col-md-9 / col-12 col-md-3` layout stacks on mobile. **`pe-5` description padding bug fixed in this audit** (`pe-5` → `pe-lg-5`).
- Header/nav: Bootstrap `navbar-expand-lg` with working hamburger toggler. Sign In `d-flex` fix from prior session confirmed in place.
- `d-none d-lg-block` occurrences: only decorative elements with `aria-hidden="true"` — all intentional.

**Residual gap (pre-existing, not blocking):** `reusable-table.component.html` hides data table on mobile (`d-none d-md-inline`) with no card-view fallback. Employer-panel only, not on the public job-seeker portal. Deferred.

---

## Gate D — Touch targets adequate

**Status: PASS** (with known minor gap)

Evidence:
- `.btn-apply-now` in job detail: `min-height: 44px`. Compliant.
- Dialog tab buttons (`btn-add`): `padding: 15px 20px` produces ~45px height. Compliant.
- Dialog action buttons: `padding: 12px 20px` = ~40px height. Borderline but with form label spacing, effective tap area is adequate.
- Global MOBILEVIEW rule: `min-height: 44px` on `.form-control`, `.mat-select-trigger`, `.mat-form-field-infix input` at `≤767px`.
- Global MOBILEVIEW rule: `min-width: 44px; min-height: 44px` on `.mat-icon-button, .icon-btn`.
- Mat options: `min-height: 48px` at mobile.

**Known gap (not blocking):** Remove-document icon (`<img height="15px">` with click handler) in upload dialogs — 15px tap target. Pre-existing, deferred.

---

## Summary

| Gate | Result | Notes |
|------|--------|-------|
| A — Mobile block gone | **PASS** | Fully removed, verified clean |
| B — Dialogs usable on mobile | **PASS** | BL-010 global CSS covers all; add-user TS config hardened |
| C — Public pages mobile-responsive | **PASS** | pe-5 clipping bug fixed in job detail |
| D — Touch targets adequate | **PASS** | One known minor gap (remove-doc icon) deferred |

**Overall gate result: PASS — cleared for release on mobile.**
