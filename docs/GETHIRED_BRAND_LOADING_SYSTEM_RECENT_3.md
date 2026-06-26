# GETHIRED BRAND — LOADING SYSTEM (RECENT 3)
**Date:** 2026-06-26

---

## 1. Loading Components Inventory

### 1.1 `<app-inline-loading>` (global)
- **Location:** `src/app/shared/components/inline-loading/`
- **Visual:** camera.gif + "LOA**DING**" text with coral `<span class="text-primary-red">`
- **Usage sites:** job detail (loading$ | async), portal jobs preview (loading$ | async), profile, applicant panels
- **Brand fit:** coral accent consistent with `$color-global-red-buttons`; camera icon thematically appropriate for a platform with video interview features.
- **Gap:** GIF cannot be paused by CSS under `prefers-reduced-motion: reduce`. Pre-existing. Would require a CSS-only spinner replacement.
- **Gap:** No `alt` attribute on the `<img>` tag. Pre-existing a11y issue.

### 1.2 `.gh-job-skeleton` (job detail — defined, not yet rendered)
- **Location:** `job-posts-details.component.scss`
- **Status:** CSS class defined; template still uses `<app-inline-loading>` instead.
- **Recommendation:** This class is ready to use if a per-section skeleton is needed in future. Not blocking.

### 1.3 `.gh-skeleton` / `.gh-skeleton-card` (global)
- **Location:** `styles.scss`
- **Usage:** Public job list page, other pages that use `@extend .gh-skeleton`
- **Reduced-motion:** `@include ambient-motion-safe` + `background: #ececec` static fallback in reduce block. Correctly implemented.

---

## 2. Loading State Decision Tree

```
User navigates to /jobs/details/:id
         |
         v
Is job data in store? ──YES──> Show details (content reveal animation)
         |
         NO
         v
loading$ = true
Show <app-inline-loading>
         |
         v
API response arrives
         |
    ┌────┴────┐
  success   error
    |          |
Show details   Show .job-detail-error-state
(reveal anim)  (error-banner-reveal anim)
```

---

## 3. Loading UX Brand Compliance

| Check | Result |
|---|---|
| Spinner/loader uses brand color | YES (#FF7062 coral accent) |
| Content does not "flash" from empty to loaded | YES — conditional ngIf prevents empty flash |
| Loading state does not show alongside content | YES — `!details$` guard ensures mutual exclusivity |
| Skeleton available for fallback use | YES — `gh-job-skeleton` defined |
| Loading animation respects reduced motion | PARTIAL — CSS skeleton does; GIF does not (pre-existing) |

---

## 4. Deferred Items

| ID | Issue | Priority |
|---|---|---|
| L1 | Replace camera.gif with CSS spinner for `prefers-reduced-motion` support | Low |
| L2 | Add `alt=""` + `aria-hidden="true"` to camera.gif img tag | Low |
| L3 | Wire `.gh-job-skeleton` into job detail template as an alternative to global spinner | Low |
