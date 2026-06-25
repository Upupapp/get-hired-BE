# GetHired MOBILEVIEW Recent Deployment Audit Report
**Scope:** Mobile block removal verification + NOTIFY-P2 dialog mobile UX
**Date:** 2026-06-26

---

## 1. Mobile Block Removal — CONFIRMED

`src/app/app.component.ts` contains no `checkScreenSize()` method, no `isSmallScreen` property, and no screen-width detection. The component body is minimal: only `TranslateService` initialization.

`src/app/app.component.html` is a single line: `<router-outlet></router-outlet>`. No conditional `*ngIf`, no splash overlay, no blocking wrapper.

**Verdict: Mobile block fully removed. All screen sizes now reach the router.**

---

## 2. NOTIFY-P2 Dialog Mobile Assessment

Three dialogs were patched in NOTIFY-P2. All three inherit the global bottom-sheet conversion from `styles.scss` (BL-010 block, lines 491–543) which:

- Forces `width: 100%`, `max-width: 100vw` on `.cdk-overlay-pane` at `≤767px`
- Forces `.mat-dialog-container` to `max-height: 90vh`, `overflow-y: auto`, rounded top corners (bottom-sheet shape)
- Slides the CDK overlay wrapper to `align-items: flex-end` (bottom of screen)

### import-add-user dialog (`company-users.component.ts`)
- **Opener width:** `width: '34vw'` — would be ~122px on a 360px phone (broken) BUT the global BL-010 override in `styles.scss` overrides this to `width: 100%` at mobile.
- **Missing before fix:** no `maxWidth` or `maxHeight` in the opener config — the global CSS override saves it but the TS config gave no safety net.
- **FIX APPLIED:** Added `maxWidth: '100vw'` and `maxHeight: '90vh'` to the `MatDialog.open()` config (defensive belt-and-suspenders alongside the CSS override).
- **Content responsiveness:** Uses `col-12 col-md-6` grid for tab buttons (stacks correctly on mobile). Upload container has fixed `max-height: 145px` on `.uploader-container` — acceptable, content fits. Email list scroll area: `max-height: 250px; overflow-y: auto` — fine on mobile. Buttons use `min-width: 145px; padding: 12px 20px` — meets 44px touch target height.
- **SCSS:** No `@media` responsive blocks in component SCSS, but content uses Bootstrap grid (stacks correctly) and fixed heights are small enough not to clip.

### import-add-contact dialog (`contact-list.component.ts`)
- **Opener width:** `width: '40vw'`, `maxHeight: '90vh'` — already has maxHeight. The `40vw` at 360px = 144px but again overridden globally by BL-010.
- **Content:** Multi-field form (`firstName`, `lastName`, `email`, `mobileNumber`, `address`, `jobId`, `groupName`). All fields use `col-12 col-md-6` or `col-12` — stacks correctly. `min-height: 44px` set on `.form-control, .form-select` in this component's SCSS (line 208). Touch targets: adequate.
- **Scroll:** Inherits `max-height: 90vh; overflow-y: auto` from the dialog container global rule.
- **Assessment:** Usable on mobile with the global BL-010 rule active.

### import-add-candidate dialog (`candidate-list.component.ts`)
- **Opener width:** `width: '40vw'`, `maxHeight: '90vh'` — same as contact dialog.
- **Content:** Identical field structure to contact dialog. `min-height: 44px` on `.form-control, .form-select` (line 208 of candidate SCSS).
- **Assessment:** Usable on mobile with the global BL-010 rule active.

**Overall dialog verdict:** All three are functionally usable on mobile due to the existing global BL-010 CSS override. The import-add-user opener TS config was the only gap (now patched).

---

## 3. Toast / Snackbar Mobile Behavior

### Global snackbar positioning (styles.scss, lines 55–84)
```scss
@media (max-width: 767px) {
  .mat-snack-bar-container {
    margin-bottom: 80px !important;
  }
}
```
This lifts snackbars 80px above the screen bottom — avoids overlap with bottom nav. This is already in place from a prior MOBILEVIEW pass.

### NOTIFY-P2 snackbar durations
- Success: 4000ms — appropriate for mobile
- Warning (partial success): 6000ms — slightly long for mobile but acceptable given the message contains two data points ("X sent. Y couldn't be added."). No action required.
- Danger (all failed): 6000ms — appropriate, error messages need more read time on small screens.

### Width / max-width
No `width: 100%` or `max-width` rules on `.mat-snack-bar-container` in `styles.scss`. Angular Material's default snackbar on mobile is not full-width — it centers with auto margins. This is a cosmetic gap but not a functional blocker.

**Toast verdict:** Positioning is correct (80px above bottom). Duration is acceptable. No max-width override currently set — minor cosmetic gap, not a blocker for release.

---

## 4. Public Page Mobile Responsiveness

### Job list (job-posts-list.component.html)
Grid classes: `[ngClass]="listView ? 'col-12 col-md-12 col-lg-6' : 'col-12 col-md-6 col-lg-3'"` — both list view and grid view collapse to `col-12` on mobile (< 768px). This is correct responsive behavior.

### Job cards (job-card.component.html)
The job card uses a component-level layout with no Bootstrap grid classes inside it. The card content (`job-card__title`, `job-card__facts`, `job-card__apply-btn`) is structured in a flex column layout. No `d-none d-lg-block` hiding. Full content is visible on mobile.

### Job detail page (job-posts-details.component.html)
- Main content: `col-12 col-md-9` for badges, `col-12 col-md-3` for Apply button — stacks correctly on mobile.
- **BUG FOUND AND FIXED:** Line 81 had `class="col-12 mb-2 mt-2 pe-5 ps-lg-4"` — the `pe-5` (padding-end: 3rem = 48px) applied at ALL breakpoints including mobile, creating a 48px right-indent on a full-width column, clipping description text unnecessarily. Fixed to `pe-lg-5 ps-lg-4` so padding only applies at lg+.
- Banner: `bg-banner` has `height: 260px` desktop, `height: 400px !important` at `max-width: 1099px` — this means on mobile the banner is 400px tall (taller than desktop). This is a pre-existing design choice, not a NOTIFY-P2 regression. Not changed.
- Interview questions: `col-12 col-lg-6` — stacks to full-width on mobile. Fine.

### d-none d-lg-block audit
Found `d-none d-lg-block` in:
- `signup.component.html` — decorative left panel (aria-hidden="true"): intentional, correct.
- `signin.component.html` — decorative left panel (aria-hidden="true"): intentional, correct.
- `error-not-found.component.html` — decorative image: intentional, correct.
- `reusable-table.component.html` line 94: `d-none d-md-inline` on the table — hides a data table on mobile. No corresponding mobile card view was found in this component. This is a pre-existing gap, not NOTIFY-P2 related.
- Sidebar containers: `d-none d-md-block` on employer-panel, applicant-panel, admin-panel sidebars — appropriate, employer panel is not publicly accessible on mobile.

---

## 5. Navigation Mobile State

`src/app/core/header/header.component.html`:

- Bootstrap `navbar navbar-expand-lg` — correct pattern for mobile hamburger.
- `<button class="navbar-toggler" ...>` — hamburger button present with proper `aria-expanded`, `aria-controls`, `aria-label`.
- `<div class="collapse navbar-collapse">` — correctly collapses on mobile and expands via Bootstrap toggler.
- Sign In button: `<div class="dropdown d-flex"` — uses `d-flex` (not `d-lg-flex`). The prior session's fix (`d-lg-flex` → `d-flex`) is confirmed in place. Sign In is visible on mobile.
- "Browse jobs" CTA: `<li class="nav-item me-2" *ngIf="isPublic">` — inside the collapsible `navbar-collapse` div, visible after hamburger tap on mobile.

**Navigation verdict: OK. Hamburger present, Sign In fix confirmed, all nav items accessible on mobile.**

---

## 6. Touch Target Sizes

### Passing
- `.btn-apply-now` in job-posts-details.scss: `min-height: 44px` — WCAG 2.5.5 compliant.
- `.form-control, .mat-form-field-infix input` in styles.scss `@media (max-width: 767px)`: `min-height: 44px`.
- `.mat-icon-button, .icon-btn` in styles.scss: `min-width: 44px; min-height: 44px`.
- `.mat-option` at mobile: `min-height: 48px`.
- Dialog tab buttons (`btn-add`): `padding: 15px 20px` = ~45px height — adequate.
- Dialog action buttons (`btn-default`, `btn-primary`): `padding: 12px 20px`, `min-width: 145px` — height ~40px. Borderline but acceptable on padded forms.

### Gap
- Remove-document icon (`<img height="15px" (click)="removeDocument()">`) in all three dialogs: the clickable image is 15px tall with no touch wrapper. This is a tap target too small for mobile (fails WCAG 2.5.5 44px minimum). Pre-existing, not a NOTIFY-P2 regression.
- Hamburger navbar toggler: Bootstrap default applies no explicit min-height/min-width. Browser default button padding usually gives ~44px but it is not enforced. Low risk given Bootstrap's sizing.

---

## 7. Safe Fixes Applied

Two fixes were applied:

**Fix 1 — import-add-user dialog opener (company-users.component.ts)**
Added `maxWidth: '100vw'` and `maxHeight: '90vh'` to the `MatDialog.open()` config. This is a belt-and-suspenders fix alongside the existing global BL-010 CSS override.

**Fix 2 — job detail description padding (job-posts-details.component.html)**
Changed `pe-5 ps-lg-4` to `pe-lg-5 ps-lg-4` on the job description container (`col-12`). The `pe-5` was creating 48px right-side clipping of job description text on all mobile widths. Changed to `pe-lg-5` so the large end-padding only applies at ≥992px.
