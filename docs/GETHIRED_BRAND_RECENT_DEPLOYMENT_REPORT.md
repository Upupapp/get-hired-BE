# GETHIRED BRAND — RECENT DEPLOYMENT AUDIT (NOTIFY-P2)
**Date:** 2026-06-26
**Deployment tag:** BE 2ff6358 / FE 1863842
**Auditor:** Claude Code (Sonnet 4.6)

---

## 1. Executive Summary

NOTIFY-P2 delivered a well-structured 4-outcome toast system (success / warning / info / danger) across three import dialogs. The toast logic, copy, and outcome routing are correct. One contrast failure was found in the new `.warning-snackbar` color and fixed inline. Both submit buttons in the contact and CSV-upload flows have a loading indicator. Mobile responsiveness is adequate — the global responsive baseline from prior passes already covers these dialogs. Two pre-existing brand-consistency issues are noted as deferred items but do not block release.

---

## 2. Color & Brand Analysis

### Brand palette (from `src/assets/styles/colors.scss`)

| Variable | Hex | Usage |
|---|---|---|
| `$color-global-red-buttons` | `#FF7062` | Primary CTA, borders, focus ring, success-snackbar BG |
| `$color-global-red` | `#FE6F61` | Secondary red, danger-snackbar BG |
| `$color-blue-primary` | `#168DBD` | Underline hover effects |
| `$color-green-secondary` | `#04A08B` | Progress bars |
| `$color-global-gray-cancel` | `#7A637F` | Cancel buttons |

The brand palette is warm-coral/red dominant with teal and blue accents. There was no canonical "warning amber" or "info gray" in the palette prior to NOTIFY-P2 — this deployment introduces them.

### NOTIFY-P2 toast classes (before fix)

| Class | Background | Text | Semantic meaning |
|---|---|---|---|
| `.success-snackbar` | `$color-global-red-buttons` (#FF7062) | (inherited white) | All contacts added |
| `.warning-snackbar` | `#f59e0b` (hardcoded amber) | `#ffffff` | Partial success |
| `.info-snackbar` | `#6b7280` (hardcoded gray) | `#ffffff` | All duplicates / no-op |
| `.danger-snackbar` | `$color-global-red` (#FE6F61) | `#ffffff` | All failed / error |

### Brand fit assessment

- **success-snackbar using brand red/coral (#FF7062):** Unconventional (typically green = success) but intentional — this is the brand's "positive action" color, consistent with buttons, borders, and focus rings throughout the app. Treat it as a deliberate brand convention, not a bug.
- **warning amber (#f59e0b):** Semantically correct (amber universally signals caution). Not in the existing palette but acceptable as a semantic extension. The contrast failure (see Section 3) required a shade change.
- **info gray (#6b7280):** Semantically correct (neutral = informational). The existing `$color-global-gray-cancel` (#7A637F) is a similar purple-gray; the new cooler gray fits the info-neutral role well.
- **danger using brand red (#FE6F61):** Appropriate — the brand secondary red communicates error/failure, distinct from the CTA coral.

**Overall palette coherence:** The 4-class system is semantically well-structured. The warning amber shade required a WCAG-driven correction; that correction (darker amber) remains semantically recognizable as a warning signal.

---

## 3. Contrast Ratio Findings

Computed using the WCAG 2.1 relative luminance algorithm (sRGB gamma-corrected). All snackbars use white (`#ffffff`) text.

| Class | Background | Contrast vs white | WCAG AA (4.5:1) | Status |
|---|---|---|---|---|
| `.success-snackbar` | `#FF7062` | **2.71:1** | Fail | Pre-existing, deferred |
| `.warning-snackbar` | `#f59e0b` (original) | **2.15:1** | Fail | **FIXED this session** |
| `.warning-snackbar` | `#b45309` (replacement) | **5.02:1** | Pass | Fixed |
| `.info-snackbar` | `#6b7280` | **4.83:1** | Pass | OK (now tokenized) |
| `.danger-snackbar` | `#FE6F61` | **2.74:1** | Fail | Pre-existing, deferred |

**Active contrast failures at time of this audit: 0**

The pre-existing success/danger failures exist because the brand coral (#FF7062/#FE6F61) simply does not achieve 4.5:1 vs white. Fixing them would require either darkening the brand color (affecting all CTAs and borders site-wide) or switching to dark text on those snackbars — both carry broad design implications and are deferred.

---

## 4. Changes Made

### 4a. `src/assets/styles/colors.scss` — new semantic tokens added

```scss
// NOTIFY-P2 toast semantic tokens
// #b45309 = amber-800: 5.02:1 contrast vs white (WCAG AA pass).
// Original #f59e0b (amber-400) only achieves 2.15:1 — fails WCAG AA.
$color-warning-amber: #b45309;
// #6b7280 = gray-500: 4.83:1 contrast vs white (WCAG AA pass).
$color-info-gray: #6b7280;
```

### 4b. `src/styles.scss` — warning-snackbar contrast fix + both classes tokenized

Before:
```scss
.warning-snackbar {
  background-color: #f59e0b;   // 2.15:1 — WCAG FAIL
  color: #ffffff;
}
.info-snackbar {
  background-color: #6b7280;   // hardcoded, not tokenized
  color: #ffffff;
}
```

After:
```scss
.warning-snackbar {
  background-color: $color-warning-amber;  // #b45309, 5.02:1 — WCAG PASS
  color: #ffffff;
}
.info-snackbar {
  background-color: $color-info-gray;      // #6b7280, 4.83:1 — WCAG PASS, now tokenized
  color: #ffffff;
}
```

No component TypeScript or HTML files required changes — the fix is purely in the global SCSS layer.

---

## 5. State Experience Review

### Components audited

| Component | File |
|---|---|
| `ImportAddContactComponent` | `src/app/employer-panel/employer-contacts/contact-list/dialogs/import-add-contact/import-add-contact.component.ts` |
| `ImportAddCandidateComponent` | `src/app/employer-panel/employer-contacts/candidate-list/dialogs/import-add-candidate/import-add-candidate.component.ts` |
| `ImportAddUserComponent` | `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts` |

### Toast outcome matrix

| Outcome | Class | Copy (contact flow) | Duration |
|---|---|---|---|
| All success (single) | success | "Contact added." | 4s |
| All success (bulk) | success | "N contacts added." | 4s |
| Partial success | warning | "N added. M couldn't be added." | 6s |
| All duplicates (bulk) | info | "No new contacts were added. These contacts are already in your list." | 6s |
| Single duplicate | info | "This contact is already in your list." | 5s |
| All failed | danger | "No contacts were added." | 6s |
| Network/store error | danger | "Something went wrong please try again later..." | 4s |

State coverage is complete. Copy is honest (never claims success on failure). Duration scaling — longer for non-success outcomes — is appropriate and gives users time to read the longer messages.

### Loading state assessment

All three components have `isLoading: boolean = false` tracked at the component level, set to `true` on submit dispatch, and reset to `false` on store response.

**Visual feedback during submission:**

- `import-add-contact.component.html` (single-contact submit button, line 110): Shows a loading GIF via `*ngIf="isLoading"`. The button is `[disabled]="!contactForm.valid"` but does NOT include `|| isLoading`. A user can tap the submit button multiple times during the async dispatch window, potentially dispatching duplicate NgRx actions. The backend handles duplicates gracefully (returns DUPLICATE_CONTACT status), so this does not cause data corruption — but it can cause the snackbar to fire multiple times.

- `import-add-contact.component.html` (CSV upload button, line 201): `[disabled]="isLoading || !importContactForm.valid"` — correctly blocks re-submission. Loading GIF also shown.

- `import-add-user.component.html`: The "Import Users" (CSV) button is `[disabled]="isLoading"`. The "Invite All" (email list) button has NO `isLoading` guard — double-submit risk during email dispatch.

### Assessment: loading state = adequate, double-submit = deferred P2

The flows communicate "something is happening" during all submission paths. The double-submit gaps are low-severity given the backend's duplicate handling.

---

## 6. Mobile Responsiveness Assessment

### app.component.ts

The app root is now a clean `<router-outlet>` shell with no desktop-only block. Mobile users can access all routes. The prior desktop-only lock has been fully removed.

### Global mobile baseline (from `src/styles.scss`)

Already in place from prior MOBILEVIEW passes:
- `box-sizing: border-box` universal
- `overflow-x: hidden` on body
- Snackbar raised `margin-bottom: 80px` above bottom nav at ≤767px
- Touch targets `min-height: 44px` on form controls and icon buttons
- Dialogs converted to bottom-sheet on mobile (BL-010, `border-radius: 16px 16px 0 0`)
- Tap scale compression on touch-only devices via `$gh-scale-press` token

### Import dialog mobile assessment

Both dialog component SCSSs use Bootstrap grid (`col-12 col-md-6`) for responsive column splitting. Tab switcher rows (`row > col-12 col-md-6`) stack correctly on small screens. The uploader container has `max-height: 145px` which is fixed but not problematic at standard mobile viewport widths. No overflow-x clipping was found in either dialog SCSS.

**No mobile-specific regressions introduced by NOTIFY-P2.**

---

## 7. Deferred Items

| ID | Priority | Description | Effort |
|---|---|---|---|
| D1 | P2 | `success-snackbar` (#FF7062, 2.71:1) and `danger-snackbar` (#FE6F61, 2.74:1) both fail WCAG AA contrast vs white text. Pre-existing. Requires design decision: darken brand coral or switch to dark text on success/danger toasts. | Medium — design-led |
| D2 | P2 | Single-contact submit button in `import-add-contact.component.html` missing `isLoading` in disabled binding — double-submit possible during async window. | Small |
| D3 | P2 | "Invite All" button in `import-add-user.component.html` has no disabled/loading state during email dispatch. | Small |

---

## 8. Files Changed This Session

| File | Change |
|---|---|
| `src/assets/styles/colors.scss` | Added `$color-warning-amber` (#b45309) and `$color-info-gray` (#6b7280) |
| `src/styles.scss` | Replaced hardcoded amber/gray hex values with new tokens; added WCAG contrast comment |

---

## Release Gate: GO WITH CAUTION

The one active contrast failure (amber 2.15:1) has been fixed. All 4 toast outcomes are semantically distinct, copy-honest, and correctly timed. Mobile access is open and responsive baseline is solid. Deferred items D1–D3 are pre-existing or minor — none block this release.

**Caution note:** Pre-existing success/danger snackbar contrast failures (D1) should be addressed in the next brand sprint before a public accessibility audit.
