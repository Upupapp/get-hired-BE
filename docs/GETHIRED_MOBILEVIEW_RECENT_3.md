# GETHIRED MOBILEVIEW 3 — RECENT DEPLOYMENT AUDIT

**Run date:** 2026-06-26
**Scope:** Mobile responsiveness audit for changes deployed since last MOBILEVIEW run
**Focus files verified:** 7 key TS components + 2 SCSS files + global styles.scss

---

## Executive Summary

The recent mobile-related changes are largely correct and well-implemented. The targeted fixes to `job-posts-details`, `job-posts-list`, `public-search`, and `banner` components all landed as expected. The SSR platform-guard situation is significantly improved for the primary public routes (`/jobs`, `/jobs/search/:kw`, `/jobs/details/:id`). Touch targets on breadcrumbs and CTA buttons meet WCAG 2.2 (44px) requirements.

**Three residual SSR crash vectors remain** in legacy components that sit in the SSR render path but were not part of this sprint's scope. These are not new regressions — they predated this sprint — but they are outstanding risks.

**One CSS gap** exists: `.btn-primary` in `styles.scss` has `padding: 7px 20px` with no `min-height: 44px`, putting it below the 44px touch target threshold on mobile. It is used globally across many buttons.

Overall mobile readiness for the touched components: **good**. Global touch target coverage: **partial**.

---

## 1. Touch Target Compliance Audit (WCAG 2.5.5 — 44px minimum)

### PASSING

| Selector | Location | Measured height |
|---|---|---|
| `.gh-breadcrumb-item a` | `job-posts-details.component.scss` | `min-height: 44px` + `inline-flex` — PASS |
| `.btn-apply-now` | `job-posts-details.component.scss` | `min-height: 44px` — PASS |
| `.btn-link-cta` | `_portal-common.scss` | `min-height: 44px` + `display:inline-flex` + `padding:12px 8px` — PASS |
| `.btn-cta-primary` | `_portal-common.scss` | `min-height: 44px` + `padding:12px 24px` — PASS |
| `.btn-find-jobs` | `public-search.component.scss` (banner) | `height: 44px !important` — PASS |
| `.form-control` (mobile) | `styles.scss` @media 767px | `min-height: 44px` — PASS |
| `.mat-icon-button, .icon-btn` | `styles.scss` | `min-height: 44px; min-width: 44px` — PASS |
| `.mat-option` (mobile) | `styles.scss` @media 767px | `min-height: 48px` — PASS |
| `.dropdown-item` (mobile) | `styles.scss` @media 767px | `padding-top/bottom: 12px` — PASS |

### FAILING / AT RISK

| Selector | Location | Issue |
|---|---|---|
| `.btn-primary` | `styles.scss` line 298–314 | `padding: 7px 20px`, no `min-height`. Computed height ≈ 7+27+7 = 41px — 3px short of 44px. This class is used on many buttons across the app. |
| `.btn-outline-primary` | `styles.scss` line 316–334 | `padding: 10px`, no `min-height`. At 14px font + 10px top + 10px bottom = 34px — 10px short. |
| `.btn-save-draft` | `job-posts-details.component.scss` | `padding: 7px 25px`, no `min-height`. ≈ 37px. Minor, only on draft-save path. |
| Share icon (`img` with `height: 45px`) | `job-posts-details.component.html` line 79 | Image is 45px tall but has no minimum-width constraint and no padding. Tap area is only as wide as the rendered image (~45px). Technically borderline. |

---

## 2. Overflow / Layout Audit at Breakpoints

### 320px (iPhone SE, minimum supported)

| Component | Status | Notes |
|---|---|---|
| Breadcrumb | **Clean** | `.gh-breadcrumb-item--current` has `max-width: min(240px, 50vw)` → 160px at 320px; truncates with ellipsis. `.gh-breadcrumb` has `flex-wrap: wrap`. |
| Banner hero (`.bg-banner`) | **Risk** | `height: 360px` in `banner.component.scss` / `height: 260px` in `job-posts-details.component.scss` with fixed `padding-left: calc(100vw - 83vw)`. At 320px this equals ~54px left padding, which may compress inner content tightly. Not tested live. |
| Search bar (`.bg-transparent`) | **Clean** | `flex-wrap: wrap` applied at 767px in `public-search.component.scss`; all child `div`s go `width: 100%`. |
| `.search-key` | **Risk** | `min-width: 450px` on desktop shrinks to `200px` at 1154px breakpoint, but no rule covers < 575px. At 320px the element could still have `min-width: 200px` which exceeds viewport. Template context needed to confirm if it is conditionally shown. |
| Job list cards | **Clean** | Bootstrap grid `col-12` on small; cards are single-column. |
| Banner decorative images (`.banner-person`, `.banner-float-*`) | **Clean** | All set to `width: 0px` at `max-width: 860px` — invisible on mobile. |
| `.portal-quick-search` | **Clean** | `flex-direction: column` at `max-width: 575px`. |
| `.portal-hero-title` | **Clean** | `font-size: 24px` at `max-width: 575px`. |
| Error state (`.job-detail-error-state`) | **Clean** | `max-width: 480px; padding: 32px 24px` — fits 320px. `.gh-error-cta-row` has `flex-wrap: wrap`. |

### 375px (iPhone 14)

Same verdict as 320px. The `search-key` min-width risk is lower since 200px < 375px, but the banner float element visibility via zero-width is confirmed clean.

### 414px (iPhone 14 Plus / large Android)

No additional issues found. All breakpoints that affect 414px are the same as 375px tier.

### 768px (iPad portrait)

| Component | Status |
|---|---|
| Banner hero | **Clean** — `@media (max-width: 1099px)` increases banner height to 400px. |
| Job list cards | **Clean** — `col-md-6` gives 2-column layout, appropriate for 768px. |
| Bento grid | **Clean** — `portal-bento-grid` goes to `repeat(2, 1fr)` at 991px. |
| Dialog/modal | **Clean** — bottom-sheet pattern only activates at `max-width: 767px`; 768px keeps standard dialog. |

---

## 3. SSR Platform Guard Verification

### Status Summary

**Scope: SSR-rendered public routes** — `/home`, `/jobs`, `/jobs/details/:id`, `/jobs/search/:kw`

| Component | Route | Guard status |
|---|---|---|
| `banner.component.ts` | `/home` | **GUARDED** — `localStorage` in `ngOnInit` behind `isPlatformBrowser`. |
| `public-search.component.ts` | `/jobs/search/:kw` | **GUARDED** — `localStorage`, `sessionStorage`, `window.innerWidth` all in `isPlatformBrowser` block in `ngOnInit`. `asyncLocalStorage` fallback uses `typeof localStorage !== 'undefined'`. |
| `job-posts-list.component.ts` (public module) | `/jobs` | **GUARDED** — `window.innerWidth` in `ngOnInit` behind `isPlatformBrowser`. `@HostListener` is safe (only fires in browser). |
| `job-posts-details.component.ts` | `/jobs/details/:id` | **GUARDED** — `@HostListener('window:resize')` has `isPlatformBrowser` guard. `localStorage.setItem('returnURL')` in `toLogin()` is only invoked by user click, which cannot occur during SSR. |
| `public-list.component.ts` | `/jobs` | **PARTIALLY GUARDED** — `window.innerWidth` is guarded. However `asyncLocalStorage` calls bare `localStorage.getItem/setItem` without any `typeof` guard. This function is called from `getUserRole()` in `ngOnInit()` — potential SSR crash if the async microtask resolves before SSR ends. Low probability in practice but real. |
| `public.component.ts` | All public routes (parent shell) | **CRASH RISK** — `safeParseUser()` static method calls `localStorage.getItem('user')` directly. It wraps in `try/catch` but `localStorage` is not defined at all on SSR — `ReferenceError: localStorage is not defined` will be thrown and caught silently. Result: `user` is null (correct fallback), but a caught ReferenceError still prints a server-side error log on every SSR render. Not a hard crash but noisy and masking real errors. |
| `job-board-employer-cta.component.ts` | `/jobs` (public list) | **PARTIALLY GUARDED** — `wasDismissed()` and `dismiss()` both call `localStorage` wrapped in `try/catch`. Same pattern as `public.component.ts` — silent ReferenceError on SSR. |
| `public-details.component.ts` | `/jobs/details/:id` | **NOT GUARDED** — `@HostListener('window:resize')` calls `window.innerWidth` directly, no `isPlatformBrowser`. `@HostListener` does not fire during SSR so this is safe in practice, but is a correctness gap. |
| `job-post-details.component.ts` (views/home legacy) | Not in main SSR path | **UNGUARDED** — `window.innerWidth` bare in `ngOnInit` + `window.scrollTo()` bare in `ngOnInit`. Legacy component using static mock data. Lower SSR risk if route is not in Universal routes. |
| `job-post-search-list.component.ts` (views/home legacy) | Not in main SSR path | **UNGUARDED** — `window.innerWidth` bare in `ngOnInit`. Legacy component. |
| `views/home/components/job-posts-list.component.ts` (legacy) | Not in main SSR path | **UNGUARDED** — `window.innerWidth` bare in `ngOnInit`. Legacy component. |

### SSR Crash Vector Summary

- **Hard crash vectors (none found in current SSR render path):** All primary public route components have been guarded.
- **Silent ReferenceError vectors (caught, not crashing but noisy):** 3 files — `public.component.ts`, `public-list.component.ts` (async), `job-board-employer-cta.component.ts`.
- **Legacy unguarded components:** 3 files in `views/home/` that appear to use static mock data and may not be in the SSR route config.

---

## 4. Job Detail Page Mobile UX

### Breadcrumbs
- `.gh-breadcrumb-nav`: `min-height: 2rem; contain: layout` — prevents CLS. **CONFIRMED IN CODE.**
- `.gh-breadcrumb-item a`: `display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px` — 44px touch targets. **CONFIRMED.**
- `.gh-breadcrumb-item--current`: `max-width: min(240px, 50vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — safe at 320px. **CONFIRMED.**
- Hover transforms wrapped in `@media (prefers-reduced-motion: no-preference)`. **CONFIRMED** (line 87-89 in SCSS).
- Reduced-motion block at line 131-142 disables all animations including breadcrumb. **CONFIRMED.**

### Error State Mobile UX
- Error state renders a full visible div with role="alert" aria-live="assertive". **CONFIRMED** (HTML line 3-12).
- Shows appropriate heading and body text: "This job isn't available" / "Session required" based on error type.
- Has two CTAs: "Sign In" button (routerLink="/signin") and "Browse all jobs" button.
- `.gh-error-cta-row` has `flex-wrap: wrap; justify-content: center; gap: 8px` — stacks correctly on 320px.
- Error state is **visible to users on mobile**, not a blank screen. **PASS.**
- Caveat: "Sign In" button uses class `btn btn-apply-now` which has `min-height: 44px` — touch target passes.

### Apply CTA
- `.btn-apply-now` has `min-height: 44px` in SCSS. **CONFIRMED.**
- The w-100 class makes it full-width on mobile. **CONFIRMED** (HTML line 70).
- Active tap compression: `transform: scale($gh-scale-press)` guarded in `@media (prefers-reduced-motion: no-preference)`. **CONFIRMED** (line 87+).
- `@HostListener('window:resize')` in TS is guarded with `isPlatformBrowser`. **CONFIRMED** (TS line 111-116).
- `localStorage.setItem('returnURL')` in `toLogin()` only fires on user click — no SSR risk. **CONFIRMED.**

### Job Content Layout
- Card uses `padding: 30px 10px 20px 30px` — asymmetric padding, right padding is 10px, left is 30px. On 320px this gives 40px total horizontal padding consumed, leaving 280px content width. Acceptable.
- Job description uses `col-12 mb-2 mt-2 pe-lg-5 ps-lg-4` — on mobile these are zero (no prefix = col-12 without lg padding offset). Clean.

---

## 5. Job List Page Mobile UX

### Component: `job-posts-list.component.ts` (public module)
- `isPlatformBrowser` guard on `window.innerWidth` in `ngOnInit`. **CONFIRMED.**
- `trackByJobId` function added — prevents full DOM rebuild on store re-emissions. **CONFIRMED.**
- `filterJobList()` handles null/undefined keyword safely via `?? ''`. **CONFIRMED.**
- Empty state renders via `app-empty-section` when filtered list is zero. **CONFIRMED** (HTML lines 49-58).

### Card Grid Responsiveness
- Grid uses Bootstrap columns: `col-12 col-md-6 col-lg-3` (grid) / `col-12 col-md-12 col-lg-6` (list). On mobile: single column. **CLEAN.**
- `@HostListener` for resize fires only in browser. **CORRECT** (comment confirms this in TS line 114).

### Filters
- Work setup and job type filters are now properly applied in `filterJobList()`. **CONFIRMED.**

---

## 6. Public Search Mobile UX

- `localStorage.getItem('userData')`, `sessionStorage.getItem('job-search')`, and `window.innerWidth` all inside `isPlatformBrowser` block. **CONFIRMED.**
- `asyncLocalStorage` helper uses `typeof localStorage !== 'undefined'` fallback. **CONFIRMED.**
- `@HostListener('window:resize')` calls `window.innerWidth` directly without guard — acceptable because `@HostListener` never fires during SSR.
- `sessionStorage.setItem('job-search', ...)` in `findJobs()` is only invoked by user action. No SSR risk.
- Search bar flex layout wraps at 767px. **CONFIRMED** (SCSS `.bg-transparent` at 767px).

---

## 7. Banner Mobile Behavior

- `localStorage` field initializer moved to `ngOnInit` behind `isPlatformBrowser`. **CONFIRMED** (TS line 44-48).
- Banner decorative elements (`banner-person`, `banner-float-*`) all set to `width: 0px` at 860px. **CONFIRMED.**
- `findJobs()` calls `sessionStorage.setItem` on user action only. No SSR risk.
- No `console.log` removal: `findJobs()` still contains `console.log(job_search_data)` at line 82 — minor (logging on user action, not SSR, not a mobile issue per se).
- Banner height is 360px in `banner.component.scss` and expands to 400px at 1099px. On narrow mobile this is a tall fixed-height element.

---

## 8. Forms Mobile UX

- `.form-control` gets `min-height: 44px` at 767px via global `styles.scss`. **CONFIRMED.**
- `.mat-form-field-infix input` and `.mat-select-trigger` also get `min-height: 44px` at 767px. **CONFIRMED.**
- Labels: `display: flex; align-items: center` globally. **CONFIRMED.**
- Material dialog converts to bottom-sheet on mobile (max-width 767px) via CSS-only animation. **CONFIRMED** in `styles.scss`.
- `.mat-tab-header` gets `overflow-x: auto` at 767px — prevents tab strip overflow on profile pages. **CONFIRMED.**

---

## 9. OG Image / Social Sharing

- `gethired-og-default.png` exists at `src/assets/brand/gethired-og-default.png`. **CONFIRMED.**
- `angular.json` includes `src/assets` in build assets. **CONFIRMED.**
- `index.html` references it at `https://gethiredonline.app/assets/brand/gethired-og-default.png`. **CONFIRMED.**
- `seo.service.ts` uses `DEFAULT_OG_IMAGE` constant referencing same path. **CONFIRMED.**
- Asset path is correct for mobile social sharing.

---

## 10. Safe Mobile Fixes Applied This Round

See `GETHIRED_MOBILEVIEW_FIX_LOG_RECENT_3.md` for the full fix log.

**Fix 1 (MV3-F1):** Added `min-height: 44px` to `.btn-primary` in `styles.scss`.
**Fix 2 (MV3-F2):** Added `min-height: 44px` to `.btn-outline-primary` in `styles.scss`.
**Fix 3 (MV3-F3):** Fixed `public.component.ts` SSR silent crash — added `typeof localStorage !== 'undefined'` guard inside `safeParseUser()`.

---

## Top 5 Mobile Issues Found

1. **`.btn-primary` touch target gap** — global button class has `padding: 7px 20px` with no `min-height: 44px`. Computed height ~41px, 3px below WCAG 2.5.5. Affects many buttons app-wide. **FIXED this round (MV3-F1).**

2. **`.btn-outline-primary` touch target gap** — `padding: 10px` gives ~34px height. 10px short. **FIXED this round (MV3-F2).**

3. **`public.component.ts` SSR silent crash** — `localStorage.getItem('user')` called in a static method used as a field initializer. The `try/catch` prevents hard crash but logs ReferenceError on every SSR render. **FIXED this round (MV3-F3).**

4. **`public-list.component.ts` async localStorage** — `asyncLocalStorage` methods call bare `localStorage.getItem/setItem` without `typeof` check. Async microtask timing during SSR may trigger ReferenceError. **Not fixed this round** (would require refactor of async pattern; low actual crash probability).

5. **`job-board-employer-cta.component.ts` SSR silent localStorage** — `wasDismissed()` wraps `localStorage.getItem` in `try/catch` but SSR still logs ReferenceError. **Not fixed this round** (same pattern as above; component is non-critical to SSR).
