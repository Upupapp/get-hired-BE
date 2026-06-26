# GETHIRED BRAND — STATE EXPERIENCE SYSTEM (RECENT 3)
**Date:** 2026-06-26

---

## 1. System Overview

The state experience system covers 5 state categories for every user-facing surface:
1. Loading
2. Error
3. Success
4. Empty / Fallback
5. Offline / Degraded

---

## 2. Job Detail Page — State Coverage Audit

### State: Loading
- **Component:** `<app-inline-loading>` (conditional on `loading$ | async && !details$`)
- **Visual:** Camera GIF + "LOADING" text with coral accent span
- **Gap:** GIF loops regardless of `prefers-reduced-motion`. Pre-existing, not introduced here.
- **Coverage:** Conditional rendering gates are correct.

### State: Error
- **Template:** `.job-detail-error-state` (conditional on `jobError$ && !loading$ && !details$`)
- **Role/a11y:** `role="alert"` + `aria-live="assertive"` — announces immediately to screen readers.
- **Context-sensitive copy:**
  - Session error: "Session required" / "Sign in to view this job." + "Sign In" CTA
  - Not-found/expired: "This job isn't available" / "It may have expired, been removed, or the link may be incorrect." + "Browse all jobs" button
- **SEO guard:** `noindex` meta tag + SSR HTTP 404 via `RESPONSE` token — Googlebot sees a real 404.
- **Animation:** `gh-error-banner-reveal` (160ms, $motion-ease-standard), listed in `prefers-reduced-motion: reduce` block.
- **Status: FULLY IMPLEMENTED**

### State: Success (applied)
- **Component:** `.bg-applied` chip with applied.png icon, shown when `userRole == '3' && isApplied`
- **Animation:** `gh-applied-chip-reveal` (scale 0.9→1, 160ms), listed in reduce block.
- **Status: IMPLEMENTED**

### State: Empty
- Not applicable to the job detail page directly (the error state handles not-found).

### State: Offline
- Not implemented at component level. Global Angular service worker / app-wide offline handling is out of scope for this audit.

---

## 3. Public Portal — State Coverage Audit

### Job seeker portal jobs preview
- **Loading:** `<app-inline-loading>` via `loading$ | async`
- **Empty:** `.portal-jobs-fallback--upgraded` — copy + Browse all jobs CTA
- **Status: COVERED**

### Auth pages
- No async state (form renders immediately). N/A.

---

## 4. System-Level State Token Table

| State | Animation | Duration | Easing | Reduced-motion guard |
|---|---|---|---|---|
| Content reveal | `gh-job-detail-reveal` | 220ms ($motion-duration-card) | $motion-ease-decelerate | `reduce` block |
| Error banner | `gh-error-banner-reveal` | 160ms ($motion-duration-micro) | $motion-ease-standard | `reduce` block |
| Applied chip | `gh-applied-chip-reveal` | 160ms ($motion-duration-micro) | $motion-ease-standard | `reduce` block |
| Skeleton shimmer | `gh-skeleton-shimmer` | 1.4s infinite | linear | `reduce` block |
| Session banner | `gh-error-banner-reveal` | 160ms | $motion-ease-standard | `reduce` block |
| Breadcrumb nav | `gh-job-detail-reveal` | 180ms | $motion-ease-decelerate | `no-preference` wrapper + `reduce` block |
| Sheet reveal (dialogs) | `gh-sheet-reveal` | 220ms | $motion-ease-decelerate | `reduce` block in styles.scss |
| Success pulse | `gh-success-pulse-kf` | 400ms | $motion-ease-decelerate | `@include motion-safe` in _motion.scss |

All states are accounted for and guarded.
