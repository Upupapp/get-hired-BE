# GETHIRED_OPTIMIZE_FIX_LOG_RECENT_V5
## Fix Log — Safe Changes Applied
Date: 2026-06-26 | Session: GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_V5

All changes are small, safe, and reversible. No product behavior changed. No auth logic modified.

---

## FIX 001 — Subscription leak in job-posts-list.component.ts
**File:** `src/app/jobs/job-posts-list/job-posts-list.component.ts`
**Category:** Angular subscription management
**Severity:** Medium

**Problem:** `this.route.queryParams.subscribe()` was called in the constructor without storing the subscription, making it impossible to unsubscribe. The component has no `ngOnDestroy`. Component appears on `/jobs`, company detail pages, and search results.

**Change:**
- Added `Subscription` import from `rxjs`
- Added `PLATFORM_ID` + `Inject` to Angular core imports
- Added `@Inject(PLATFORM_ID) private platformId: object` constructor parameter
- Added `private queryParamsSub: Subscription` field
- Changed `this.route.queryParams.subscribe(...)` to `this.queryParamsSub = this.route.queryParams.subscribe(...)`
- Added `implements OnDestroy` to class declaration
- Added `ngOnDestroy()` that calls `this.queryParamsSub.unsubscribe()`
- Also added `isPlatformBrowser` import for co-located window.innerWidth fix (see FIX 002)

---

## FIX 002 — SSR crash in job-posts-list.component.ts (window.innerWidth)
**File:** `src/app/jobs/job-posts-list/job-posts-list.component.ts`
**Category:** SSR hydration safety
**Severity:** Medium

**Problem:** `this.screenSize = window.innerWidth` in `ngOnInit()` throws `ReferenceError: window is not defined` on the Angular Universal server for the `/jobs` route. The default value 1600 is the correct server-side assumption (wide layout).

**Change:** Wrapped the assignment with `if (isPlatformBrowser(this.platformId))`.

---

## FIX 003 — trackBy missing on job list ngFor
**File:** `src/app/jobs/job-posts-list/job-posts-list.component.ts` + `.html`
**Category:** Template performance / INP
**Severity:** Medium

**Problem:** `*ngFor="let data of filteredJobs"` had no `trackBy`. NgRx store emits new array references on every action (fetch, filter, reset). Angular compared items by object identity and destroyed/recreated every card's DOM node even when jobIds were unchanged. On a typical job list with 30+ cards, this caused visible jank and wasted garbage collection.

**Change (TS):** Added `trackByJobId(_index: number, job: any): string { return job?.jobId; }` method.
**Change (HTML):** Added `trackBy: trackByJobId` to the `*ngFor` directive.

---

## FIX 004 — CLS risk on job-posts-details breadcrumb
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.scss`
**Category:** Core Web Vitals / CLS
**Severity:** Low-Medium

**Problem:** `.gh-breadcrumb-nav` had no `min-height`. The breadcrumb renders inside `*ngIf="details$ | async"`, so it appears only after the job data loads. On slow connections the banner renders first, then the breadcrumb pushes content below it when data arrives — a measurable CLS contribution on a public-facing SEO page.

**Change:** Added `min-height: 2rem; contain: layout;` to `.gh-breadcrumb-nav`. Reserves the row height before data arrives, preventing layout shift. `contain: layout` limits reflow propagation.

---

## FIX 005 — SSR crashes in public-list.component.ts (window.innerWidth)
**File:** `src/app/public/public-list/public-list.component.ts`
**Category:** SSR hydration safety
**Severity:** Medium

**Problem:** `this.screenSize = window.innerWidth` in `ngOnInit()` crashes the SSR server render for `/jobs`. Same pattern as FIX 002.

**Change:**
- Added `Inject` + `PLATFORM_ID` to Angular core imports
- Added `isPlatformBrowser` from `@angular/common`
- Added `@Inject(PLATFORM_ID) private platformId: object` constructor parameter
- Wrapped `window.innerWidth` assignment with `isPlatformBrowser` guard

---

## FIX 006 — SSR crashes in public-search.component.ts (window, localStorage, sessionStorage)
**File:** `src/app/public/public-search/public-search.component.ts`
**Category:** SSR hydration safety
**Severity:** High

**Problem:** Three SSR-unsafe patterns:
1. Field initializer `public loggedUserData = JSON.parse(localStorage.getItem('userData'))` — crashes at class construction on the server (`localStorage is not defined`).
2. Field initializer `public jobSearch = JSON.parse(sessionStorage.getItem('job-search'))` — same crash (`sessionStorage is not defined`).
3. `this.screenSize = window.innerWidth` in `ngOnInit()` — crashes (`window is not defined`).

The `/jobs/search/:keyword` route is server-rendered (inside PublicModule, loaded by `*` in `server.ts`). All three items prevented Googlebot from receiving valid HTML for any job search URL.

**Change:**
- Added `Inject` + `PLATFORM_ID` to Angular core imports
- Added `isPlatformBrowser` from `@angular/common`
- Added `@Inject(PLATFORM_ID) private platformId: object` constructor parameter
- Changed field initializers to safe defaults: `loggedUserData = null`, `jobSearch = null`, `keyword = ''`
- Moved all three browser-only reads into `ngOnInit()` inside `if (isPlatformBrowser(this.platformId))` block
- Also fixed the `JSON.parse` null safety: `JSON.parse(localStorage.getItem('userData') || 'null')` to avoid `JSON.parse(null)` returning `null` while still being safe

---

## FIX 007 — Nested subscription leak in banner.component.ts
**File:** `src/app/public/components/banner/banner.component.ts`
**Category:** Angular subscription management + SSR safety
**Severity:** High

**Problem:** Two issues combined:
1. **Nested subscription leak:** Inside `this.router.events.subscribe()`, a new `this.adminService.adminStatus$.subscribe()` was called on every router event, creating O(n) inner subscriptions. The outer subscription reference (`this.req`) was cleaned up in `ngOnDestroy`, but all inner subscriptions accumulated and leaked. On a busy SPA session with 20+ navigations, this results in 20+ active subscriptions to `adminStatus$` all trying to update the same component.
2. **SSR crash:** `JSON.parse(localStorage.getItem('userData'))` as a field initializer crashes on the server.

**Change:**
- Removed the `router.events.subscribe()` wrapper entirely — it was not needed (`adminStatus$` is a BehaviorSubject-style stream that emits immediately on subscribe, no router trigger required).
- Replaced with a single `this.req = this.adminService.adminStatus$.subscribe(...)` that reuses the existing `this.req` cleanup in `ngOnDestroy`.
- Moved `localStorage.getItem('userData')` to `ngOnInit()` inside `isPlatformBrowser` guard, defaulting field to `null`.
- Added `Inject` + `PLATFORM_ID` + `isPlatformBrowser` imports.

---

## UNCHANGED / VERIFIED CLEAN

| Item | Verdict |
|------|---------|
| `seo.service.ts` setJsonLd() duplicate risk | Clean — id-based replace, no accumulation |
| `job-posts-details.component.ts` jobErrorSub | Clean — unsubscribed in ngOnDestroy line 164 |
| `job-posts-details.component.scss` prefers-reduced-motion | Clean — full coverage confirmed |
| `job-seeker-portal.component.html` focus styles on `<a>` | Clean — :focus-visible defined in _portal-common.scss |
| `auth.guard.ts` navigateByUrl change | Clean — no queryParams were threaded before; no regression |
| `public-details.component.ts` | Clean — window.innerWidth only in @HostListener (browser-only); seoSub properly unsubscribed |

---

## SUMMARY TABLE

| Fix | File | Type | Risk |
|-----|------|------|------|
| 001 | job-posts-list.component.ts | Subscription leak | Medium |
| 002 | job-posts-list.component.ts | SSR crash | Medium |
| 003 | job-posts-list.component.ts + .html | Template perf (trackBy) | Medium |
| 004 | job-posts-details.component.scss | CLS (min-height) | Low-Med |
| 005 | public-list.component.ts | SSR crash | Medium |
| 006 | public-search.component.ts | SSR crash (3 issues) | High |
| 007 | banner.component.ts | Nested leak + SSR crash | High |
