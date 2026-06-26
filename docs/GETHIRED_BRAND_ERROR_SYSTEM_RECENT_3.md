# GETHIRED BRAND — ERROR SYSTEM (RECENT 3)
**Date:** 2026-06-26

---

## 1. Error State Coverage

### 1.1 Job Detail — Not Found / Expired / Auth Error

**Implementation:** `job-posts-details.component.html` lines 3–12

```html
<div class="job-detail-error-state" *ngIf="(jobError$ | async) && !(loading$ | async) && !(details$ | async)"
     role="alert" aria-live="assertive">
```

**Condition:** Only shows when `jobError$` is set AND the job is not loading AND no details are present. Three-way mutual exclusivity is correct.

**Context-sensitive copy:**
| Error message | Heading | Body | Primary CTA |
|---|---|---|---|
| "Unable to load this job for the current session." | "Session required" | "Sign in to view this job." | `<a routerLink="/signin">Sign In</a>` |
| Any other error | "This job isn't available" | "It may have expired, been removed, or the link may be incorrect." | N/A |
| Both cases | — | — | `<button (click)="goToJobsList()">Browse all jobs</button>` |

**SEO behavior (TypeScript):**
- Sets `meta.updateTag({name:'robots', content:'noindex'})` — prevents Google from indexing error pages.
- Sets `titleService.setTitle('Job not found | GetHired')` — correct browser tab label.
- SSR: `response.status(404)` via `@Optional() RESPONSE` token — Googlebot sees HTTP 404, not soft-404.

**Styling (SCSS):**
```scss
.job-detail-error-state {
  max-width: 480px;
  margin: 48px auto;
  text-align: center;
  padding: 32px 24px;
  animation: gh-error-banner-reveal $motion-duration-micro $motion-ease-standard both;
}
```
- Center-aligned, max-width 480px — proportionally correct, not full-bleed.
- `gh-error-banner-reveal` is 160ms (`$motion-duration-micro`) — micro-interaction duration, not card duration. Correct (error is a status update, not a content arrival).
- Listed in `prefers-reduced-motion: reduce` block.

**Verdict: FULLY IMPLEMENTED AND BRAND-CORRECT**

---

### 1.2 Snackbar Error States

**`.danger-snackbar`** — defined in `styles.scss`
- Background: `$color-global-red` (#FE6F61)
- Text: `#ffffff`
- Contrast: 2.74:1 — below WCAG AA 4.5:1. Pre-existing brand decision.

**`.error-snackbar`** — defined in `styles.scss` (NOTIFY-V5 FIX-B)
- Background: `$color-global-red` (#FE6F61)
- Text: `#ffffff`
- Aliases `danger-snackbar` semantically — consistent.
- Used in `recorder-setting.component.ts` for "no recording devices detected".

**`.warn-snackbar`** — defined in `styles.scss` (NOTIFY-V5 FIX-A)
- Background: `$color-warning-amber` (#b45309)
- Text: `#ffffff`
- Contrast: 5.02:1 — WCAG AA pass.
- Used in `unauthorize.interceptor.ts` for HTTP 429 rate-limit.

---

## 2. Error State Brand Checklist

| Check | Result |
|---|---|
| Error state shows (not blank/unstyled) | YES |
| Copy is specific and actionable | YES — two distinct message paths |
| Recovery CTAs present | YES — Sign In + Browse all jobs |
| SEO noindex on error | YES |
| SSR 404 on error | YES |
| Accessibility (role=alert, aria-live) | YES |
| Animation is calm (not alarming) | YES — 160ms fade-in, no pulsing/blinking |
| Reduced-motion guard | YES — listed in reduce block |
| Error does not coexist with content | YES — three-way mutual exclusivity via ngIf |

---

## 3. Deferred Items

| ID | Issue | Priority |
|---|---|---|
| E1 | `.success-snackbar` / `.danger-snackbar` / `.error-snackbar` — brand coral contrast 2.7:1 fails WCAG AA | Moderate — pre-existing brand decision |
| E2 | No global app-error page (route-level 404 for unknown paths) | Low |
| E3 | "Browse all jobs" error CTA uses `.btn-outline-secondary` (Bootstrap) not a brand token | Low |
