# GETHIRED_OPTIMIZE_RECENT_DEPLOYMENT_V5
## Performance, CWV, Angular, A11y & Maintainability Audit
Date: 2026-06-26 | FE HEAD: 41b5920 | BE HEAD: 6a7755c

---

## EXECUTIVE SUMMARY

5 safe fixes applied. 4 were real bugs (subscription leak, SSR crashes, nested subscription). 1 was a CLS hardening. All changes are reversible, zero product behavior change, zero auth weakening.

---

## PART 1 — TARGETED AUDIT (6 recent changes)

### 1. `seo.service.ts` — setJsonLd() duplicate script tag risk
**Status: CLEAN — no fix needed.**

`setJsonLd(id, data)` locates the existing `<script id="...">` via `this.doc.getElementById(id)` before creating a new one. This is an in-place replace, not an append. No matter how many times it is called across navigations, there is exactly one script tag per id in `<head>`.

`clearJobPostingJsonLd()` is called in `job-posts-details.component.ts` `ngOnDestroy()` (line 168) via `this.structuredData.remove()`, and also in `public-details.component.ts` `ngOnDestroy()` (line 80). Both cover the navigation-away path.

**Conclusion:** No duplicate script tag risk. DOCUMENT token injection is correctly used on both SSR and browser paths.

---

### 2. `job-posts-details.component.html` — breadcrumb CLS risk
**Status: RISK FOUND — fixed.**

The `<nav class="gh-breadcrumb-nav">` is inside `*ngIf="details$ | async as selectedJobPost"`. This means it appears only after the job data loads. On a slow connection, the page first renders the banner section, then the breadcrumb pushes content down when it appears — a CLS event.

**Fix applied:** Added `min-height: 2rem; contain: layout;` to `.gh-breadcrumb-nav` in `job-posts-details.component.scss`. This reserves the row height before the data arrives so no layout shift occurs.

The `@media (prefers-reduced-motion: no-preference)` block already animates the breadcrumb entry. The `@media (prefers-reduced-motion: reduce)` block already nulls its animation. Both remain intact.

---

### 3. `job-posts-details.component.ts` — jobErrorSub subscription
**Status: CLEAN — no fix needed.**

`jobErrorSub` is declared at line 69, assigned in `ngOnInit()` at line 90, and unsubscribed in `ngOnDestroy()` at line 164. The guard `if (this.jobErrorSub)` is present. Properly managed.

---

### 4. `job-posts-details.component.scss` — prefers-reduced-motion coverage
**Status: CLEAN — no fix needed.**

The existing `@media (prefers-reduced-motion: reduce)` block at line 110-120 covers `.gh-breadcrumb-nav`, `.gh-job-content-reveal`, `.bg-applied`, `.job-detail-session-banner`, and `.gh-job-skeleton`. The breadcrumb animation at line 66-68 is already scoped inside `@media (prefers-reduced-motion: no-preference)`. Complete coverage.

---

### 5. `job-seeker-portal.component.html` — button → `<a>` elements
**Status: CLEAN — focus styles verified.**

The buttons that were changed to `<a routerLink="...">` (e.g. "Browse all jobs" at lines 123, 176, 180) all receive `.btn-link-cta` or `.btn-cta-primary` classes. Both classes define `:focus-visible` rules in `_portal-common.scss`:

- `.btn-link-cta` (line 49): `outline: 2px solid $color-global-red-buttons; outline-offset: 2px`
- `.btn-cta-primary` (lines 161-165): `transform: translateY(-2px)` on `:hover, :focus-visible` (inside `no-preference` media query)

`<a routerLink="...">` elements are keyboard-navigable (they have an href equivalent via Angular router). The remaining action-triggering items (createAccount, goToSignin) are still `<button type="button">` with Angular event bindings — correct semantic for JS-triggered navigation with no URL.

One observation: `.btn-cta-primary` only applies a `transform` on focus, not an `outline`. For `<a>` tags (which do receive browser default focus ring), this is less prominent than a custom outline. This is a **low-severity a11y observation** (not a fix — the browser default focus ring is still present; no regression introduced by the recent change).

---

### 6. `auth.guard.ts` — router.navigateByUrl vs navigate with queryParams
**Status: CLEAN — no functional difference for this codebase.**

The guard redirects unauthenticated users to `/signin` with no returnUrl queryParam. Inspecting the code, no other mechanism in the guard previously passed a queryParam to `/signin` either (the old `navigate([...], {queryParams})` was not in this guard — the guard always used a direct URL). The `job-posts-details.component.ts` `toLogin()` method handles its own returnUrl via `localStorage.setItem('returnURL', url)` independently.

`router.navigateByUrl('/signin')` is equivalent to `router.navigate(['/signin'])` in all cases where no queryParams were being passed. No extra navigation events are generated.

---

## PART 2 — BROAD AUDIT

### Core Web Vitals

#### LCP
- **Public job list (`/jobs`):** `app-job-posts-list` triggers `getPublishedList()` on init. No `loading` skeleton with explicit `min-height` on the list area. The `min-height: 30vh` on the outer row prevents complete blank, acceptable.
- **Job detail (`/jobs/details/:id`):** Banner `height: 260px` is fixed — good for LCP. Hero banner image is a CSS `background-image`, which is not preloaded. This is a pre-existing concern, not introduced by recent changes.
- **Public portal pages (`/home`, `/job-seekers`, `/employers`):** Pure HTML/SVG content, no images critical to LCP. Acceptable.

#### CLS
- **Breadcrumb nav:** Fixed (see Part 1, item 2).
- **`.gh-job-skeleton`:** Has explicit `height: 20px` and `margin-bottom: 12px`. CLS-safe.
- **Signal badges in banner:** Appear after `jobSignals$ | async` resolves. Inside a fixed-height `height: 260px` banner — no layout shift outside the banner.

#### INP
- No synchronous blocking operations on user interaction found in the audited components. `haptics.selection()` is a lightweight browser API call.

---

### Angular Subscription Leaks

#### FIXED: `job-posts-list.component.ts` — queryParams subscription leak
**Severity: Medium.** `this.route.queryParams.subscribe()` was called in the constructor with the return value discarded. The component is used on `/jobs` (PublicListComponent), company detail pages, and search results. Every navigation to one of these pages would create a new subscription never cleaned up.

**Fix:** Stored as `this.queryParamsSub`, unsubscribed in newly-added `ngOnDestroy()`.

#### FIXED: `banner.component.ts` — nested subscription leak
**Severity: High.** Inside `this.router.events.subscribe()`, a new `this.adminService.adminStatus$.subscribe()` was called on every router event, creating O(n) subscriptions proportional to the number of navigation events during the component lifetime. The outer subscription was cleaned up in `ngOnDestroy()`, but all inner ones leaked.

**Fix:** Removed the router.events wrapper entirely. `adminStatus$` is a BehaviorSubject-style observable — the last value is emitted immediately on subscribe without needing a router trigger. Replaced with a single direct subscription stored in `this.req`, which is already cleaned up in ngOnDestroy.

---

### SSR / Hydration Safety

#### FIXED: `job-posts-list.component.ts` — window.innerWidth in ngOnInit
**Severity: Medium (SSR crash risk).** `this.screenSize = window.innerWidth` was called unconditionally in `ngOnInit`. On the SSR server, `window` is not defined — this throws `ReferenceError: window is not defined` and breaks the server render for `/jobs`. The default value of `1600` is correct for SSR (wide layout), and the actual width is correctly read on resize events (which only fire in the browser).

**Fix:** Wrapped with `isPlatformBrowser(this.platformId)` guard.

#### FIXED: `public-list.component.ts` — window.innerWidth in ngOnInit
**Severity: Medium.** Same as above, affects `/jobs`. Fixed with `isPlatformBrowser` guard.

#### FIXED: `public-search.component.ts` — window.innerWidth, localStorage, sessionStorage in field initializers and ngOnInit
**Severity: High.** Three issues:
1. `public loggedUserData = JSON.parse(localStorage.getItem('userData'))` — field initializer runs during class construction on the server, `localStorage` is not defined → crash.
2. `public jobSearch = JSON.parse(sessionStorage.getItem('job-search'))` — same, `sessionStorage` not defined on server → crash.
3. `this.screenSize = window.innerWidth` in `ngOnInit` — same crash pattern.

The `/jobs/search/:keyword` route is server-rendered (it's inside PublicModule, which is loaded for all `*` routes in `server.ts`). All three items crash the SSR render for every job search URL, preventing Googlebot from indexing search result pages and returning error HTML instead of content.

**Fix:** Moved all three to `ngOnInit` behind `isPlatformBrowser(this.platformId)` guard. Field initializers now set safe defaults (null / '' / 1600).

#### FIXED: `banner.component.ts` — localStorage field initializer
**Severity: Medium.** `public loggedUserData = JSON.parse(localStorage.getItem('userData'))` crashes on SSR. The banner is rendered inside `PublicListComponent` (the `/jobs` page), which is SSR-rendered.

**Fix:** Moved to `ngOnInit` behind `isPlatformBrowser` guard, defaulting to `null`.

---

### Template Performance

#### FIXED: `job-posts-list.component.html` — missing trackBy
**Severity: Medium.** The `*ngFor="let data of filteredJobs"` loop had no `trackBy`. When the NgRx store emits a new job list reference (e.g., after a fetch, filter, or store reset), Angular compares items by object identity. Since the objects are new references from the store, every single card's DOM node is destroyed and recreated on every emission — even if all jobIds are unchanged.

**Fix:** Added `trackByJobId(_index, job) { return job?.jobId; }` to the component and wired it as `trackBy: trackByJobId` in the template.

---

### Pre-existing Subscription Patterns (not introduced by recent changes, documented for follow-up)

| Component | Pattern | Risk |
|-----------|---------|------|
| `public-list.component.ts` | Uses `asyncLocalStorage.getItem('role')` → `localStorage` in async method, called in `ngOnInit`. This runs only in the browser because it's called from `ngOnInit` (not a field initializer), but the method itself is not SSR-guarded. Low risk in practice because the SSR render does not wait for async. | Low |
| `public-search.component.ts` | `findJobs()` calls `sessionStorage.setItem()` directly — only reachable via user interaction (form submit), never on SSR. Safe. | None |
| `job-posts-details.component.ts` `toLogin()` | Opens a `route.url.subscribe()` and stores the result in `this.currentUrl$`. This IS cleaned up in ngOnDestroy (line 156-158). Safe. | None |

---

### Bundle Size
No new dependencies added. No new imports that weren't already used. `isPlatformBrowser` was already used in the file's module bundle (imported by other components in the same module).

---

## PART 3 — AUTH GUARD / SECURITY

No auth or security changes. `auth.guard.ts` was reviewed as requested. The change to `navigateByUrl` is functionally identical for the guard's purpose (no queryParams were being threaded). Guard logic (role check, logged-in check) is unchanged and correct.

---

## PART 4 — OPEN / DEFERRED ITEMS

| Item | Severity | Recommendation |
|------|----------|----------------|
| `.btn-cta-primary` on `<a>` only shows transform on focus, no explicit outline | Low a11y | Add `outline: 2px solid` to the `:focus-visible` block in `_portal-common.scss` for full WCAG 2.1 AA compliance |
| `console.log(job_search_data)` in `banner.component.ts` line 73 | Low | Remove debug log before production ship |
| `console.log(res.data)` in `job-posts-details.component.ts` line 137 | Low | Remove debug log before production ship |
| Hero banner image (`job-post-banner.png`) is a CSS background-image, not preloaded | Medium CWV | Add `<link rel="preload" as="image">` in `index.html` for the LCP candidate on the job detail page |
| No `trackBy` on job card inner `*ngFor` loops (badges, signals, tags) | Low | Low-churn loops, acceptable for now |

---

## FILES CHANGED

1. `src/app/jobs/job-posts-list/job-posts-list.component.ts` — subscription leak fix, SSR guard, trackBy method, implements OnDestroy
2. `src/app/jobs/job-posts-list/job-posts-list.component.html` — trackBy wired to ngFor
3. `src/app/jobs/job-posts-details/job-posts-details.component.scss` — min-height CLS fix
4. `src/app/public/public-list/public-list.component.ts` — SSR guard for window.innerWidth
5. `src/app/public/public-search/public-search.component.ts` — SSR guards for window, localStorage, sessionStorage
6. `src/app/public/components/banner/banner.component.ts` — nested subscription leak fix, localStorage SSR guard
