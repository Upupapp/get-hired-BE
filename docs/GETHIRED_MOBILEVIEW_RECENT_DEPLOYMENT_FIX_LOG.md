# GetHired MOBILEVIEW Recent Deployment Fix Log
**Date:** 2026-06-26

---

## Fix 1 — Dialog opener: add maxWidth/maxHeight guard
**File:** `src/app/company/company-users/company-users.component.ts`
**Method:** `addUserToCompany()`
**Type:** Safe defensive fix — no behavioral change on desktop, adds TS-level safety on mobile

**Before:**
```ts
let openDialog = this.dialog.open(
  ImportAddUserComponent,
  {
    width: '34vw',
    data: event,
  }
);
```

**After:**
```ts
let openDialog = this.dialog.open(
  ImportAddUserComponent,
  {
    width: '34vw',
    maxWidth: '100vw',    // MOBILEVIEW: prevent overflow on small screens
    maxHeight: '90vh',    // MOBILEVIEW: ensure dialog scrolls on mobile
    data: event,
  }
);
```

**Rationale:** The `34vw` width would be ~122px on a 360px phone if the global BL-010 CSS were ever removed or failed to load. Adding `maxWidth: '100vw'` and `maxHeight: '90vh'` at the TS level makes this dialog safe-by-default at the source rather than relying solely on the global CSS override. The contact and candidate dialogs already had `maxHeight: '90vh'` — this brings add-user to parity.

---

## Fix 2 — Job detail padding clips description on mobile
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html`
**Line:** 81 (approximately)
**Type:** Safe CSS class change — no desktop visual change, fixes mobile content clipping

**Before:**
```html
<div class="col-12 mb-2 mt-2 pe-5 ps-lg-4">
```

**After:**
```html
<div class="col-12 mb-2 mt-2 pe-lg-5 ps-lg-4">
```

**Rationale:** `pe-5` (Bootstrap 5 `padding-end: 3rem = 48px`) applies at all breakpoints including mobile. On a 360px screen, 48px right padding on a full-width `col-12` container wastes 13% of the screen width and clips job description text hard at the right margin. Changing to `pe-lg-5` restricts the large end-padding to screens ≥992px (Bootstrap `lg` breakpoint), which is where the two-column layout `col-12 col-md-9` starts to have meaningful visual room for the padding. `ps-lg-4` was already scoped to `lg` and remains unchanged.

---

## Not Fixed (out of scope / pre-existing / design decision)

| Item | Reason not fixed |
|------|-----------------|
| Remove-document icon 15px tap target in 3 dialogs | Pre-existing; would require HTML restructuring with wrapper div/button; safe but outside NOTIFY-P2 scope |
| Banner `height: 400px` on mobile (job detail) | Pre-existing design decision; changing it could alter visual identity |
| `reusable-table d-none d-md-inline` no mobile fallback | Pre-existing; requires a card-view template, not a one-line safe fix |
| Snackbar no `max-width: 100%` on mobile | Cosmetic only; not a functional blocker; deferred |
| Navbar toggler touch target not explicitly sized | Bootstrap default is usually adequate; low risk |
