# GetHired QA8 Fix Sprint — BRAND Visual Audit Report

**Date:** 2026-06-25
**Scope:** FE visual changes in QA8 fix sprint
**Files audited:**
- `src/app/employer-panel/employer-panel.component.scss` (Fix 11)
- `src/app/job/job-create/job-create.component.ts` (Fix 10)
- `src/app/job/state/job.effects.ts` (Fix 1)
- Brand refs: `src/assets/styles/colors.scss`, `src/assets/styles/_motion.scss`

---

## 1. Sub-company Safe-Area Padding (Fix 11)

### Finding: CORRECT — applied to right selector and media query

**Location:** `employer-panel.component.scss` lines 161-165

```scss
@media (max-width: 767px) {
  #sub-company-component {
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
```

### Selector analysis

`#sub-company-component` is defined at line 19-25 of the same file as the scrollable content wrapper for the employer panel. Its existing styles are `position: relative`, `overflow-x/y: hidden`, and `margin-bottom: 30px`. The 72px padding-bottom is added inside the `max-width: 767px` media query which matches the Bootstrap `md` breakpoint used throughout the codebase (`d-md-none` classes on the billing bar and mobile nav also target this breakpoint). Selector and breakpoint are correct.

### 72px base value analysis

The mobile nav bar (`.gh-mobile-nav`) occupies 56px height (`min-height: 44px` items + 6px top padding + 6px bottom padding = ~56px). The billing bar (`.gh-billing-bar`) adds approximately 16px more content when visible (padding 6px top + 6px bottom + ~4px for the link line-height at 11px). 56px + 16px = 72px base. The chosen value is reasonable.

### Safe-area interaction with billing bar

The billing bar is positioned `bottom: calc(56px + env(safe-area-inset-bottom, 0px))`, which means on notched iPhones the billing bar is pushed up by the safe area inset. The content padding of `calc(72px + env(safe-area-inset-bottom, 0px))` adds the same `env()` term to the content bottom, so on a device with a 34px home indicator the total padding is 106px — this clears both the 56px nav bar and the 16px billing bar above it (which itself floats at 56px + 34px = 90px bottom), with 16px to spare. Clearance is sufficient.

### Flat devices

`env(safe-area-inset-bottom, 0px)` resolves to 0px on devices without a home indicator, leaving exactly 72px padding — matches original intent.

**Status: PASS. No fix needed.**

---

## 2. changeJobStatus$ Error Display (Fix 1)

### Finding: GAP — errors silently written to store, never shown to user

**Effect path for `changeJobStatusFail`:**

1. `job.effects.ts` lines 167-177: error is normalised to a string (`body.error || body.message || fallback`) and dispatched as `changeJobStatusFail({ payload })`.
2. `job.reducer.ts` lines 82-89: `changeJobStatusFail` writes `action.payload` to `state.error` and sets `succesMsg: null`.
3. `job.facade.ts` line 28: `jobError$` selector is exposed on the facade.
4. `job-list.component.ts` lines 66-68: `success$` is subscribed to `afterChange()`. There is **no subscription to `jobError$`** or `jobFacade.jobError$` in the job-list component.
5. `job-list.component.html`: No error alert or snackbar is rendered for `changeJobStatus` failures.

**Result:** When an employer tries to archive a job and the BE returns a 403 (or any error), the loading spinner stops, the dialog closes after 2 seconds (`afterChange` timeout at line 221), and the user sees nothing. The error is stored in Redux state but never surfaced. The 403 normalisation in Fix 1 ensures a clean string is in state — but that string is not displayed.

### Comparison to `saveJob$` error path

`job-create.component.ts` also does not subscribe to `jobError$` for save failures — the same silent-fail pattern exists there too. This is a pre-existing systemic gap, not introduced by Fix 1.

### Toast pattern used elsewhere

`'danger-snackbar'` is passed as `panelClass` to `MatSnackBar.open()` in 13 files across the employer panel and auth flows. However, `.danger-snackbar` has **no CSS definition** in `src/styles.scss` or any other stylesheet — the panel class is applied but produces no visual distinction from the default snackbar. This is a pre-existing brand gap.

`.success-snackbar` at `src/styles.scss:37` is defined and applies `background-color: $color-global-red-buttons` (brand red `#FF7062`). `.danger-snackbar` should be defined alongside it with a red-shade treatment (e.g. `#d32f2f` or the existing `$color-global-red` `#FE6F61`).

### Recommended safe fix (applied below in Section 5)

Add a CSS definition for `.danger-snackbar` in `src/styles.scss`, and add a `jobError$` subscription in `job-list.component.ts` that opens a `danger-snackbar` toast when an error is present. The toast copy uses the normalised error string from the store (Fix 1 ensures it is always a readable string).

**Status: BRAND GAP — two items: (a) `danger-snackbar` has no CSS; (b) `changeJobStatusFail` errors are never shown to the user.**

---

## 3. formSubs (Fix 10) — Visual Impact Assessment

**Finding: CONFIRMED — zero visual change**

`formSubs` is a lifecycle management fix. The change replaces a single `private formSubs = new Subscription()` field and guards it with `unsubscribe()` + reassignment at the top of `setFormGroup()`. The subscriber callbacks (`statusChanges`) drive stepper-item `disabled` state — the visual result is identical to before the fix on the first load. The fix only prevents accumulation of duplicate listeners on repeated `editJob$` emissions (edit-mode jobs), which could previously cause the stepper enabled/disabled state to toggle excessively. If anything, Fix 10 makes the stepper state more visually stable on repeat renders — no regressions possible.

**Status: PASS (no visual change, as expected).**

---

## 4. BE-Only Fixes — Visual Impact Assessment

**Fixes covered:** createJobs 403, CV upload auth, applicant read auth, contacts/companies CRUD auth gates.

All are middleware-level authorization additions in the BE (route guards, ownership checks, subscription checks). They change which HTTP status codes the FE receives for unauthorized requests, but the FE error display pipeline for all these endpoints is either:
- A toast snackbar (already triggered by the existing catch paths), or
- A redirect to login (via `unauthorize.interceptor.ts` for 401s).

The FE UI layout, component trees, color values, typography, spacing, and motion tokens are unaffected.

**Status: CONFIRMED — zero visual impact.**

---

## 5. Safe Brand Fixes Applied

### Fix A: Define `.danger-snackbar` in global styles

**File:** `src/styles.scss`

**Gap:** The class is referenced in 13 TS files as a `panelClass` for error toasts. Without a CSS rule the snackbar renders in the default Material dark-grey, with no visual distinction from a neutral message.

**Fix:** Added `.danger-snackbar` alongside `.success-snackbar` using `$color-global-red` (`#FE6F61`) — the brand's designated error/warning red — as background and white text to match the success snackbar pattern.

**No other styling changes made.**

### Fix B: Wire `changeJobStatusFail` error display in job-list

**File:** `src/app/job/job-list/job-list.component.ts`

**Gap:** Errors from `changeJobStatus` actions (e.g. 403 when subscription limit is reached or ownership check fails) are silently swallowed. After Fix 1's normalisation the error payload is always a readable string, but it never reaches the user.

**Fix:** Added a subscription to `jobFacade.jobError$` in `ngOnInit`. When a non-null error arrives, opens a `danger-snackbar` toast for 4000ms with the error string. Subscription added to the existing `req` bag for cleanup on destroy.

---

## Brand Compliance Summary

| Item | Result |
|---|---|
| Fix 11 safe-area selector correct | PASS |
| Fix 11 breakpoint matches billing bar / nav | PASS |
| Fix 11 notched device clearance (106px) | PASS |
| Fix 11 flat device clearance (72px) | PASS |
| Fix 10 no visual change | PASS (confirmed) |
| Fix 1 normalised error string reaches UI | FAIL — error silently discarded in job-list |
| `danger-snackbar` CSS defined | FAIL (pre-existing, fixed in Section 5) |
| `success-snackbar` CSS defined | PASS (existing) |
| BE fixes visual impact | PASS (none) |
| Motion tokens imported correctly in employer-panel | WARNING — `@import "src/assets/styles/motion"` (line 2) should be `@import "src/assets/styles/_motion"` or use tilde path `"~assets/styles/motion"` — other files in the same folder use `"~assets/styles/motion"`. Works at build time due to SCSS partial resolution but is inconsistent with the project pattern. |
| `motion-duration-micro`, `motion-ease-standard`, `motion-safe` mixin used | PASS (billing bar link uses all three correctly) |

---

## Files Changed

1. `src/styles.scss` — added `.danger-snackbar` CSS rule
2. `src/app/job/job-list/job-list.component.ts` — wired `jobError$` toast for `changeJobStatusFail`
