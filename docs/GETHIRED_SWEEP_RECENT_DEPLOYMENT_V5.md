# GETHIRED SWEEP — RECENT DEPLOYMENT V5 (SEO Phase 5 + Auth Error Redaction)

**FE HEAD:** 41b5920  
**BE HEAD:** 6a7755c  
**Date audited:** 2026-06-26  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Scope:** Full 24-phase system discovery and audit against latest codebase, with focus on the V5 deployment changes.

---

## Executive Summary

**Deployment health: GREEN — all V5 changes verified correct, all previously fixed P0/P1 issues hold.**

This deployment is a well-executed, scope-controlled batch of six concerns:

1. **BE: Firebase error redaction** — raw Firebase SDK error object was returned verbatim in the 403 response body; replaced with the generic string `'Authentication failed.'`. Exact diff confirmed. No regression.

2. **FE: SSR-safe JSON-LD and canonical injection** — `seo.service.ts` now uses Angular's injected `DOCUMENT` token for all DOM mutation (JSON-LD script creation/replacement, canonical `<link>` management). Previously these methods returned early on server (`if (!this.isBrowser) return`), which meant structured data and canonical tags were never present in SSR-rendered HTML. Now Google's Rich Results parser sees the correct JobPosting / Organization / WebSite JSON-LD in the SSR output.

3. **FE: Dead `?id=` param removed from `getApplicant()`** — the `applicantUrl/profile` call no longer sends `?id=${userId}`. The param was a dead path anyway (SEC-01 fix already redirected the backend to derive identity from JWT). Confirmed clean.

4. **FE: `isMobileViewAllowed` dead route data fully removed** — `app.routing.module.ts`, `auth.module.ts`, and `auth.guard.ts` cleaned of this dead property. Full-codebase grep confirms zero surviving references.

5. **FE: "Browse jobs" CTAs converted to `<a routerLink="/jobs">`** — all three instances in `job-seeker-portal.component.html` now use proper anchor elements (confirmed: 3 `routerLink="/jobs"` `<a>` elements found, plus a `.ts`-level programmatic navigate). This benefits both SEO crawlability and accessibility.

6. **FE: Job detail breadcrumb + SEO** — visual breadcrumb nav added to `job-posts-details.component.html` using correct `<nav aria-label="Breadcrumb">` + `<ol>` semantic structure with `aria-current="page"`. `noindex` set on `jobError$` (expired/deleted/invalid job), cleared on valid job load. Auth pages (signup / reset-password / change-pw / account-auth / verify) all set `noindex, nofollow`.

**Previously tracked open items:** DEBT-01 (`createGroup`/`updateGroup` forEach async) and DEBT-02 (`interview.service.js` forEach async) have been confirmed FIXED in commit 25f5e17 (BE HEAD~2). DEBT-06 (no rate limiting) is confirmed FIXED in `server.js` — a 4-tier rate-limit system is active. These were open in V4 SWEEP, now closed.

**New items surfaced:** See §7. One new finding (P2) around `robots` tag on job detail — the component uses direct `Meta.updateTag` rather than the `SeoService.setPageMeta()` wrapper, which means `canonical` is not set on the valid job load path. Low risk (the JobPosting URL is correctly in the JSON-LD `url` field) but a consistency gap.

---

## §1 What Changed — Verified

### 1.1 BE: `middleware/verifyAuth.js` — Error Redaction

**Commit:** 6a7755c (HEAD)  
**Status: CONFIRMED**

```diff
-    res.status(403).send(error);
+    res.status(403).send('Authentication failed.');
```

The `catch (error)` block's fallthrough case (non-expired invalid token) previously called `res.status(403).send(error)`. In Express, passing a JavaScript `Error` object to `res.send()` converts it via `toString()` which can expose `error.message` — the raw Firebase Admin SDK error message which may include internal identifiers, token parsing details, or stack traces.

The fix replaces this with a hardcoded generic string. The `auth/id-token-expired` branch above it was already returning a safe explicit string; this aligns the catch-all branch.

**Regression risk: none.** The 403 status code is unchanged. Callers relying on the response to make routing decisions only need to see a 403; the message body is informational only.

### 1.2 FE: `src/app/core/services/seo.service.ts` — SSR-safe DOCUMENT injection

**Commit:** d908be8 (HEAD~3)  
**Status: CONFIRMED**

All four previously SSR-unsafe methods are now fixed:

| Method | Was | Now |
|--------|-----|-----|
| `setCanonical()` | `document.querySelector(...)` (bare global) | `this.doc.querySelector(...)` (injected token) |
| `clearCanonical()` | `document.querySelector(...)` | `this.doc.querySelector(...)` |
| `setJsonLd()` | `if (!this.isBrowser) return; document.getElementById(...)` | `this.doc.getElementById(...)` (no isBrowser guard) |
| `clearJsonLd()` | `if (!this.isBrowser) return; ...` | `this.doc.getElementById(...)` (no isBrowser guard) |

The `DOCUMENT` token is injected in the constructor alongside `PLATFORM_ID`. The `isBrowser` flag is still used appropriately for `stripHtml()` (the server-side path uses regex, browser path uses `<textarea>`).

`setOrganizationJsonLd()` previously included `sameAs: []` — the empty array was removed. Confirmed no `sameAs` property exists anywhere in the Organization LD block.

**Impact:** Google's indexer fetches SSR output directly. JSON-LD and canonical tags are now present in the first-byte HTML, dramatically improving structured data coverage for the job detail page.

### 1.3 FE: `src/app/applicant/applicant.service.ts` — Dead `?id=` param removed

**Commit:** d908be8 (HEAD~3 batch)  
**Status: CONFIRMED**

`getApplicant(userId: string)` now calls:
```
${this.applicantUrl}/profile
```
without the `?id=${userId}` suffix that previously existed. The `userId` parameter is still in the function signature but is unused — not a meaningful risk since the BE already ignores any `id` query param (SEC-01 fix, commit 9173f0f). A follow-up cleanup could remove the now-unused parameter from the signature.

**Note:** The `userProfile()` method below (line 105) was the main SEC-01 fix target and has a code comment confirming the IDOR vector was closed. This `getApplicant()` change is a belt-and-suspenders cleanup on a different but related call.

### 1.4 FE: `isMobileViewAllowed` dead route data fully removed

**Commit:** d908be8 (HEAD~3 batch)  
**Status: CONFIRMED — zero surviving references**

Verified:
- `app.routing.module.ts`: no `isMobileViewAllowed` in route data anywhere
- `auth.module.ts`: routes declared without the property
- `auth.guard.ts`: `navigateToUserRole()` has clean switch/case, no query param appending
- Full-codebase grep (all `.ts` and `.html` files): zero matches

### 1.5 FE: "Browse jobs" CTAs → `<a routerLink="/jobs">`

**Commit:** 41b5920 (HEAD) / d908be8 batch  
**Status: CONFIRMED**

`job-seeker-portal.component.html` now has three `<a routerLink="/jobs">` elements in the template:
- Line 123: workspace section "Browse jobs"
- Line 176: empty-state fallback "Browse all jobs"
- Line 180: section-level CTA when jobs are present "Browse all jobs"

The CTA band component also has a `(primaryClick)="goToJobs()"` which calls `this.router.navigateByUrl('/jobs')` programmatically — this is acceptable for component-level CTAs in a section that uses event-driven layout.

**Accessibility improvement:** Converting `<button (click)="navigate()">` to `<a routerLink="/jobs">` gives screen readers and keyboard users a proper link element with a `href` target, which is also crawlable by Googlebot.

### 1.6 FE: Job detail — breadcrumb + error noindex + auth page noindex

**Commits:** 41b5920 (HEAD), d908be8  
**Status: CONFIRMED**

**Breadcrumb HTML** (`job-posts-details.component.html` lines 15-21):
```html
<nav aria-label="Breadcrumb" class="gh-breadcrumb-nav">
  <ol class="gh-breadcrumb">
    <li class="gh-breadcrumb-item"><a routerLink="/home">Home</a></li>
    <li class="gh-breadcrumb-item"><a routerLink="/jobs">Jobs</a></li>
    <li class="gh-breadcrumb-item gh-breadcrumb-item--current" aria-current="page">{{ selectedJobPost?.jobTitle }}</li>
  </ol>
</nav>
```
Correct semantic structure: `<nav>` landmark + `<ol>` + `aria-current="page"` on the final item. Focus ring defined in SCSS for breadcrumb links (`.a:focus-visible`).

**Error state noindex** (`job-posts-details.component.ts` lines 90-94):
```typescript
this.jobErrorSub = this.jobError$.subscribe(err => {
  if (err) {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
});
```

**Valid job robots clear** (lines 80-85):
```typescript
this.normalizedJobSub = this.normalizedJob$.subscribe(job => {
  if (job) {
    this.titleService.setTitle(`${job.title} at ${job.companyName} | GetHired`);
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.structuredData.apply(job);
  }
});
```

**Auth pages noindex** — confirmed in all four components:
- `signup.component.ts` line 52: `robots: 'noindex, nofollow'`
- `reset-password.component.ts` line 37: `robots: 'noindex, nofollow'`
- `change-pw.component.ts` line 43: `robots: 'noindex, nofollow'`
- `account-authentication.component.ts` line 51: `robots: 'noindex, nofollow'`

**SCSS** — `job-posts-details.component.scss`:
- `.gh-breadcrumb-nav`, `.gh-breadcrumb`, `.gh-breadcrumb-item`, `.gh-breadcrumb-item--current` all defined
- `@media (prefers-reduced-motion: no-preference)` fade-in for breadcrumb nav
- `@media (prefers-reduced-motion: reduce)` animation suppressor covers `.gh-job-content-reveal`, `.bg-applied`, `.job-detail-session-banner`, `.gh-job-skeleton`, `.btn-apply-now:active`

---

## §2 Full System Inventory

### 2.1 BE Route Security Matrix

| Route File | Auth Coverage | Notes |
|---|---|---|
| `userRoute.js` | All write routes: `verifyAuth`. Public: signup, resend, verify, pw-reset, change-pw | Auth-appropriate — intentionally public auth endpoints |
| `applicationRoute.js` | All routes: `verifyAuth` | SECURE fix applied; previously 3 routes had no auth |
| `jobsRoute.js` | Write/private: `verifyAuth`. Public read: `optionalVerifyAuth` | Clean SEC-02 implementation |
| `companiesRoute.js` | All routes: `verifyAuth` | |
| `contactRoutes.js` | All routes: `verifyAuth` | STITCH fix applied (GH-ACT-011) |
| `candidateRoutes.js` | All routes: `verifyAuth` | STITCH fix applied (GH-ACT-011) |
| `interviewRoute.js` | All routes: `verifyAuth` | STITCH fix applied (GH-ACT-011) |
| `employerRoute.js` | (not re-read this sweep) | Not changed in V5 |
| `adminRoute.js` | (not re-read this sweep) | Not changed in V5 |
| `subscriptionRoute.js` | (not re-read this sweep) | Not changed in V5 |
| `paymentRoute.js` | (not re-read this sweep) | |
| `messageRoutes.js` | (not re-read this sweep) | |

**BOLA/IDOR posture:** All data-access controllers derive company/user identity from `req.user.uid` (populated by Firebase JWT verification). No controller examined trusts caller-supplied `companyId` or `uid` in body/query.

### 2.2 Middleware Chain

```
verifyAuth.js         — mandatory auth, now returns generic 403 on invalid token (V5)
optionalVerifyAuth.js — token-if-present, req.user=null for anon, 401 for invalid
verifyRoles.js        — company role check, derives uid from req.user (SEC-07 fix)
```

### 2.3 Rate Limiting (DEBT-06 — CLOSED)

Four tiers are active in `server.js`:
- **Global:** 500 req / 15 min (all routes)
- **Auth:** 20 req / 15 min (`/api/auth/*`) — brute-force defense
- **Write:** 100 req / 15 min (all POST/PUT/DELETE on `/api`, excluding PayMongo webhook)
- **Sensitive:** 10 req / 1 hour (`/api/auth/changepassword`, `/api/auth/getpwresetlink`, `/api/auth/archive`)

In-memory store, appropriate for single-node Linode. Redis-backed deferred for horizontal scaling.

### 2.4 Security Headers

Set in `server.js` before route mounting:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`

CSP not yet set (deferred, no tracking item exists — recommend adding as a follow-up).

### 2.5 FE Guards

| Guard | File | Behavior |
|---|---|---|
| `AuthGuard` | `auth.guard.ts` | Reads `localStorage.state === 'true'` + `coreService.getRole()`; checks `route.data.role`; calls `navigateToUserRole()` on mismatch (V5: clean, no `isMobileViewAllowed` leakage) |
| `UnauthGuard` | `unauth.guard.ts` | Redirects logged-in users away from auth pages |
| `EmployerGuard` | `employer.guard.ts` | (not re-read this sweep) |
| `ApplicantGuard` | `applicant.guard.ts` | (not re-read this sweep) |
| `AdminGuard` | `admin.guard.ts` | (not re-read this sweep) |

**Notable:** `AuthGuard.canLoad()` returns `true` unconditionally. This is a known limitation — it means the lazy-loaded bundle is always downloaded even for the wrong role. Guard protection is at `canActivate` not `canLoad`. This is pre-existing and low risk (the bundle doesn't expose data, only code).

### 2.6 Route Architecture

Root routes (order preserved):
1. `path: ''` → `/home` redirect
2. `path: 'admin'` → `AdminPanelModule`, `canActivate: [AuthGuard]`, `role: '1'`
3. `path: 'recruiter'` → `EmployerPanelModule`, `canActivate: [AuthGuard]`, `role: '2'`
4. `path: 'user'` → `ApplicantPanelModule`, `canActivate: [AuthGuard]`, `role: '3'`
5. `path: ''` → `PublicModule` (first, so `/` resolves without backtracking)
6. `path: ''` → `AuthModule` (signin/signup/reset etc.)
7. `path: '**'` → `ErrorPageModule`

Note from routing comments: 404 after login may not reach `ErrorPageModule` because role-based guards call `router.resetConfig()` at login time with arrays that don't include the wildcard. Documented as a known follow-up item.

### 2.7 SEO System State

The `SeoService` is now fully SSR-safe. Coverage matrix:

| Page | Title | Meta Description | robots | Canonical | JSON-LD |
|---|---|---|---|---|---|
| `/home` | Set | Set | index,follow | Set | Organization + WebSite |
| `/jobs` | Set | Set | index,follow | Set | BreadcrumbList |
| `/jobs/details/:id` (valid) | Per-job title | (via structuredData service) | index,follow (V5) | Not set from component | JobPosting |
| `/jobs/details/:id` (error) | Default | Default | noindex (V5) | Cleared | None |
| `/job-seekers` | Set | Set | index,follow | Set | — |
| `/employers` | Set | Set | index,follow | Set | — |
| `/signin` | Set (via SeoService) | Set | noindex,nofollow | Cleared | — |
| `/signup` | Set (V5) | Set | noindex,nofollow (V5) | Cleared | — |
| `/reset-password` | Set (V5) | Set | noindex,nofollow (V5) | Cleared | — |
| `/change-password` | Set (V5) | Set | noindex,nofollow (V5) | Cleared | — |
| `/verify` | Set (V5) | Set | noindex,nofollow (V5) | Cleared | — |

---

## §3 Findings by Category

### 3.1 Security

**S1 [RESOLVED — V5] Raw Firebase error in 403 response**  
`middleware/verifyAuth.js` now returns `'Authentication failed.'` instead of the raw error object. The `auth/id-token-expired` branch was already clean; the catch-all is now also clean. No information leakage in auth errors.

**S2 [OPEN — DEBT-07] Leaked secrets in BE git history**  
Confirmed present from initial discovery. Not touched in V5. Requires: (1) secret rotation on all leaked credentials, (2) `git filter-repo` or BFG to rewrite history, (3) force-push after coordinating with any forks/clones. This is the highest-effort remaining security item.

**S3 [RESOLVED — from V4 sprint] BOLA/IDOR on applicant profile, job details, contacts, candidates, interviews**  
All confirmed fixed in prior sprints and untouched by V5. BOLA fixes hold.

**S4 [RESOLVED — from V4 sprint] Rate limiting**  
4-tier rate limiting is active in `server.js`. DEBT-06 is closed.

**S5 [RESOLVED — from QA10 sprint] MIME spoofing on file upload**  
Magic-byte verification in `helpers/fileSignature.js`. Active.

**S6 [NOTE] `canLoad()` returns unconditional `true` in `AuthGuard`**  
Pre-existing. Low risk — bundle downloads are not a data breach vector. Role enforcement via `canActivate` is the meaningful guard.

### 3.2 SEO

**SEO-1 [RESOLVED — V5] JSON-LD and canonical tags now emitted in SSR HTML**  
The DOCUMENT injection fix means Google's first-byte HTML fetch now contains `<script type="application/ld+json">` tags and `<link rel="canonical">`. Prior to V5, these were entirely absent from SSR output.

**SEO-2 [RESOLVED — V5] Auth pages marked noindex,nofollow**  
`/signup`, `/reset-password`, `/change-password`, `/verify` all set `noindex, nofollow` via SeoService in `ngOnInit()`. This is defense-in-depth (robots.txt should also disallow these).

**SEO-3 [RESOLVED — V5] Job error pages marked noindex**  
`jobError$` subscription sets `noindex` when a job fails to load. Valid jobs clear it back to `index, follow`. Prevents thin/dead-content pages from being indexed.

**SEO-4 [RESOLVED — V5] Empty `sameAs: []` removed from Organization JSON-LD**  
Google's structured data validator may warn on an empty `sameAs` array. Now omitted.

**SEO-5 [NEW FINDING — P2] Job detail page: canonical tag not set on valid job load**  
The component uses `this.meta.updateTag({ name: 'robots', content: 'index, follow' })` directly rather than calling `this.seoService.setPageMeta()`. The `setPageMeta()` path sets/clears canonical; the direct `meta.updateTag()` path does not. As a result, valid job detail pages may inherit a stale canonical from the previous route (if one was set) or have no canonical at all.

The `url` field in the JobPosting JSON-LD (`${BASE_URL}/jobs/details/${job.jobId}`) provides a partial signal to Google but it is not a substitute for a proper `<link rel="canonical">`.

**Recommended fix:** In the `normalizedJob$` subscription (`.component.ts` line 80), after setting the title and robots, also call:
```typescript
this.seoService.setCanonical(`${BASE_URL}/jobs/details/${job.jobId}`);
```
And in `ngOnDestroy()`, call `this.seoService.clearCanonical()`.

**SEO-6 [EXISTING — LOW] BreadcrumbList JSON-LD not yet set on job detail page**  
The visual breadcrumb nav is now present. The `SeoService.setBreadcrumbJsonLd()` helper exists but is not called from `job-posts-details.component.ts`. Without BreadcrumbList JSON-LD, Google may not show breadcrumb rich results in SERPs. Low priority — visual breadcrumb is the higher-value item for UX.

**Recommended fix (follow-up):** In the `normalizedJob$` subscription, after setting the canonical, call:
```typescript
this.seoService.setBreadcrumbJsonLd([
  { name: 'Home', url: `${BASE_URL}/home` },
  { name: 'Jobs', url: `${BASE_URL}/jobs` },
  { name: job.title, url: `${BASE_URL}/jobs/details/${job.jobId}` }
]);
```

**SEO-7 [EXISTING] Sitemap: 15-minute TTL, xmlEscape applied, only published jobs**  
Sitemap in `server.js` is well-formed. Cache TTL reduced to 15 minutes for faster job discovery. `xmlEscape()` applied to `job_id` in URL construction. Only `job_status_id = 2` rows included. Static pages `/home`, `/jobs`, `/job-seekers`, `/employers` included.

**SEO-8 [EXISTING] `robots.txt` not audited in this sweep**  
Should be verified to disallow `/signup`, `/signin`, `/change-password`, `/verify`, all `/admin`, `/recruiter`, `/user` paths. Not re-read this sweep; recommend confirming in the next pass.

### 3.3 Accessibility

**A11Y-1 [RESOLVED — V5] Breadcrumb uses correct semantic structure**  
`<nav aria-label="Breadcrumb">` + `<ol>` list + `aria-current="page"` on terminal item. Focus ring defined for breadcrumb links with `:focus-visible`. Screen reader support: links are `<a>` elements with `routerLink` (so they have real `href`s after Angular hydration).

**A11Y-2 [RESOLVED — V5] Error state has `role="alert"` and `aria-live="assertive"`**  
`job-detail-error-state` div has both attributes (line 3 of template). Screen readers will announce the error when it appears.

**A11Y-3 [RESOLVED — V5] `prefers-reduced-motion` respected**  
Both the breadcrumb nav animation and all other motion effects are suppressed in the `@media (prefers-reduced-motion: reduce)` block.

**A11Y-4 [EXISTING — P3] `warning-snackbar` WCAG AA contrast failure**  
`#f59e0b` amber with white text: ~2.5:1 contrast ratio against AA minimum of 4.5:1. Copy conveys outcome in words; color is supplementary. Tracked as DEBT-04.

**A11Y-5 [EXISTING — P3] Danger snackbar should use `aria-live="assertive"`**  
Global Angular Material snackbar config does not set `aria-live="assertive"` for danger messages. Tracked as DEBT-05.

**A11Y-6 [EXISTING] `AuthGuard.canLoad()` returns true**  
Not an a11y issue but noted for completeness.

### 3.4 Performance

**PERF-1 [OK] Skeleton shimmer animation uses `will-change: background-position`**  
Appropriate hint — GPU-composited property. Combined with `animation: gh-skeleton-shimmer 1.4s infinite linear`, this is the correct modern implementation pattern.

**PERF-2 [OK] Sitemap 15-min in-memory cache**  
Avoids DB hit on every bot crawl. Appropriate for single-server Linode.

**PERF-3 [NOTE] `structuredData.apply(job)` on every `normalizedJob$` emission**  
If `normalizedJob$` emits multiple times (e.g., on route re-use), the JSON-LD is rebuilt and DOM-replaced each time. In practice this should only emit once per job load but the subscription remains open. The `unsubscribe()` in `ngOnDestroy()` handles cleanup correctly. No memory leak.

### 3.5 Mobile

**MOB-1 [OK] `isMobileViewAllowed` dead route data fully removed**  
This dead property was previously used to block mobile users from certain routes at the JS level. It was removed in V5 across all three files where it existed. The mobile block from `app.component.ts` was removed in an earlier sprint (commit bf7f175).

**MOB-2 [EXISTING] Breadcrumb `font-size: 0.8rem` on mobile**  
`0.8rem` = 12.8px at default font size. WCAG SC 1.4.4 requires text to be resizable to 200%; at base 12.8px this is borderline. Not a hard failure but worth noting. Breadcrumb text is navigational and brief.

**MOB-3 [OK] Breadcrumb wraps with `flex-wrap: wrap`**  
Long job titles won't overflow horizontally on small screens.

### 3.6 UX

**UX-1 [RESOLVED — V5] Job error state provides clear recovery path**  
Error state shows a human-readable title, explanation text, and CTA buttons: "Sign In" (for session-expired cases) and "Browse all jobs". No more silent blank page.

**UX-2 [RESOLVED — V5] "Browse jobs" buttons are now proper links**  
Using `<a routerLink="/jobs">` means right-click → "Open in new tab" works, as does middle-click. Previously these were `<button>` elements.

**UX-3 [NOTE] `console.log(res.data)` in `getShareableLink()`**  
`job-posts-details.component.ts` line 137: `console.log(res.data)` left in from development. Low severity — doesn't expose PII (the value is a short URL) but should be removed before launch.

**UX-4 [NOTE] `console.log('here meeee')` in signup**  
`signup.component.ts` line 83: debug log left in. Should be removed before launch.

### 3.7 Data Flow and API Contracts

**DF-1 [RESOLVED — from V4] NOTIFY-P2 bulk invite response shape**  
`multipleContact` and `multipleCandidate` endpoints return `{ contacts/candidates, summary }`. FE dialog components read `res.summary`. Shape change is fully contained to two endpoints and their two consumers.

**DF-2 [RESOLVED — from V4 sprint] `createGroup`/`updateGroup` async forEach fixed**  
Confirmed fixed in commit 25f5e17 (BE HEAD~2). Both now use `Promise.allSettled`. The V4 SWEEP erroneously listed this as still open from the NOTIFY-P2 report — it was fixed in the QA10 sprint. DEBT-01 is CLOSED.

**DF-3 [RESOLVED — from V4 sprint] `interview.service.js` async forEach fixed**  
Confirmed fixed in commit 25f5e17. Line 276 now uses `Promise.allSettled(removeDuplicates.map(...))`. DEBT-02 is CLOSED.

**DF-4 [EXISTING — DEBT-03] FE `candidates/list` still sends `?companyId=` query param**  
`get-hired-FE/src/app/shared/services/api/candidates.service.ts` getCandidateList still passes `?companyId=${data.payload}`. The BE correctly ignores it (derives from JWT). Harmless but inconsistent with the contact service (which had the param removed in QA10).

**DF-5 [EXISTING — DEBT-08] Single-candidate save double-dispatches `SAVE_CONTACT`**  
`import-add-candidate.component.ts` lines 241-243: adding a single candidate also dispatches `ContactActionTypes.SAVE_CONTACT`. The contact toast correctly handles `status: 'ADDED'` / `'DUPLICATE_CONTACT'` so no false-positive toast, but the double-dispatch is semantically incorrect.

---

## §4 Previous Sweep Comparison

### V4 SWEEP (NOTIFY-P2 deployment, FE 1863842 / BE 2ff6358)

| V4 Open Item | V5 Status |
|---|---|
| DEBT-01: `createGroup`/`updateGroup` forEach(async) | CLOSED — Fixed in commit 25f5e17 |
| DEBT-02: `interview.service.js` forEach(async) | CLOSED — Fixed in commit 25f5e17 |
| DEBT-03: `candidates/list` FE `?companyId=` param | Still open |
| DEBT-04: `warning-snackbar` WCAG contrast | Still open |
| DEBT-05: `danger-snackbar` aria-live | Still open |
| DEBT-06: No rate limiting | CLOSED — 4-tier limiter active in server.js |
| DEBT-07: Leaked secrets in BE git history | Still open |

### New Items Surfaced in V5

| ID | Item | Severity |
|---|---|---|
| NEW-01 | Job detail: no canonical tag set on valid job load | P2 |
| NEW-02 | Job detail: no BreadcrumbList JSON-LD | P3 |
| NEW-03 | `console.log(res.data)` in getShareableLink | P3 |
| NEW-04 | `console.log('here meeee')` in signup | P3 |

---

## §5 Open Items Register

| ID | Issue | Severity | File | Recommendation |
|---|---|---|---|---|
| DEBT-03 | `candidates/list` FE sends unused `?companyId=` query param | P2 | `shared/services/api/candidates.service.ts` | Remove param; BE derives from JWT |
| DEBT-04 | `warning-snackbar` fails WCAG AA contrast (#f59e0b + white) | P3 | `src/styles.scss` | Darken to `#b45309` or use text color inversion |
| DEBT-05 | Danger snackbar should use `aria-live="assertive"` | P3 | Global snackbar config | Add panelClass aria-live override |
| DEBT-07 | Leaked secrets in BE git history | P1 | `.git/` history | Rotate secrets + git filter-repo + force-push |
| DEBT-08 | Single-candidate save double-dispatches SAVE_CONTACT | P2 | `import-add-candidate.component.ts` | Remove spurious dispatch (FE commit 21657a5 targeted this — verify if still present) |
| NEW-01 | No canonical tag on valid job detail page | P2 | `job-posts-details.component.ts` | Add `seoService.setCanonical(...)` in normalizedJob$ sub |
| NEW-02 | No BreadcrumbList JSON-LD on job detail | P3 | `job-posts-details.component.ts` | Call `seoService.setBreadcrumbJsonLd(...)` |
| NEW-03 | Debug log in getShareableLink | P3 | `job-posts-details.component.ts` line 137 | Remove `console.log(res.data)` |
| NEW-04 | Debug log in signup | P3 | `signup.component.ts` line 83 | Remove `console.log('here meeee')` |
| ARCH-01 | No CSP header set | P2 | `server.js` | Add Content-Security-Policy middleware |
| ARCH-02 | `canLoad()` returns `true` in AuthGuard | P3 | `auth.guard.ts` | Low risk; lazy bundle not a data breach; document as accepted |
| ARCH-03 | 404 after login may not reach ErrorPageModule | P3 | Route-swap guards | Document or add wildcard to each role-specific route array |

---

## §6 Release Posture

**Status: RELEASE-READY with minor follow-up items**

| Category | Status |
|---|---|
| Authentication | PASS — verifyAuth generic error message; JWT-only identity in all guarded routes |
| Authorization (BOLA) | PASS — no BOLA vectors in audited code; ownership checks via JWT UID throughout |
| Rate limiting | PASS — 4-tier limiter active |
| Security headers | PASS — nosniff, deny-framing, XSS disabled; CSP deferred (P2) |
| File upload MIME check | PASS — magic-byte check active |
| SEO (SSR structured data) | PASS (V5) — DOCUMENT token injection means JSON-LD and canonical in SSR HTML |
| SEO (auth page noindex) | PASS (V5) — all auth pages set noindex,nofollow |
| SEO (job error noindex) | PASS (V5) — jobError$ triggers noindex |
| Breadcrumb | PASS (V5) — semantic HTML, aria-current, focus ring |
| Accessibility | PASS (core); P3 contrast and aria-live items deferred |
| Mobile | PASS — mobile block removed; isMobileViewAllowed fully cleaned up |
| Leaked secrets | FAIL — still in git history; requires manual rotation + history rewrite |
| Canonical on job detail | GAP (NEW-01 P2) — not set on valid job load |

**Blocking to launch:** DEBT-07 (leaked secrets) is the only item that should block a public launch. All other open items are P2/P3 polish or technical debt.

---

## §7 Recommended Next Steps

1. **Fix NEW-01 (P2):** Add `seoService.setCanonical(`${BASE_URL}/jobs/details/${job.jobId}`)` in the `normalizedJob$` subscription in `job-posts-details.component.ts` and `clearCanonical()` in `ngOnDestroy()`.

2. **Fix DEBT-07 (P1):** Rotate all secrets found in BE git history, then rewrite history with `git filter-repo` or BFG Repo Cleaner, then force-push. Coordinate with any forks/clones.

3. **Resolve NEW-03/NEW-04 (P3):** Remove the two debug `console.log` statements in `job-posts-details.component.ts` and `signup.component.ts`.

4. **Next recommended command: `QA`** — to validate the V5 SEO changes (canonical, JSON-LD in SSR) and close NEW-01/NEW-03/NEW-04 in a single fix sprint. A targeted SEO validation against the deployed site (Google Rich Results Test, Chrome devtools SSR snapshot) would also confirm the DOCUMENT injection is working end-to-end.
