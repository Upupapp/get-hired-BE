# GetHired SEO Audit — RECENT_3
**Date:** 2026-06-26
**Scope:** Focused audit of SEO improvements deployed since SEO-V2; verifying SSR 404, JSON-LD SSR, canonical timing, OG tags, structured data coverage, sitemap, noindex, and crawlability.

---

## Executive Summary

The SEO-V4 deployment is largely correct and well-implemented. The five highest-impact fixes (RESPONSE token wiring, DOCUMENT token for JSON-LD/canonical, OG image, noindex on auth pages, Google Search Console verification) are all confirmed present. Three residual risks remain but none are launch-blockers: (1) an inherent Angular Universal async timing gap for canonical/JSON-LD on job detail pages, (2) `clearCanonical()` in `ngOnDestroy` is a no-op under SSR (safe but worth documenting), and (3) `JobStructuredDataService` still exists as an orphaned file — it is not wired to any component so it produces no duplicate JSON-LD, but the dead code could confuse future developers.

---

## 1. SSR 404 Verification — RESPONSE Token Wiring

**Status: VERIFIED WORKING**

### Evidence chain (all 4 links confirmed):

**Link 1 — `server.ts` provides RESPONSE:**
```ts
// server.ts lines 38–46
server.get('*', (req, res) => {
  res.render(indexHtml, {
    req,
    providers: [
      { provide: APP_BASE_HREF, useValue: req.baseUrl },
      { provide: REQUEST, useValue: req },
      { provide: RESPONSE, useValue: res },   // <-- wired
    ],
  });
});
```
The Express `res` object is passed as the RESPONSE token in the `providers` array given to `ngExpressEngine`. This is the standard Angular Universal pattern — confirmed correct.

**Link 2 — Token imported from correct package:**
```ts
// server.ts line 10
import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';
```
Matches the import in `job-posts-details.component.ts` line 3 — both use `@nguniversal/express-engine/tokens`.

**Link 3 — Component uses `@Optional()`:**
```ts
// job-posts-details.component.ts lines 66–69
@Inject(PLATFORM_ID) private platformId: object,
@Optional() @Inject(RESPONSE) private response: any
```
`@Optional()` ensures browser context does not throw when RESPONSE is absent.

**Link 4 — `isPlatformServer` guard is correct:**
```ts
// job-posts-details.component.ts lines 104–106
if (isPlatformServer(this.platformId) && this.response) {
  this.response.status(404);
}
```
The `this.response` null-check means the browser code path is fully safe. The `this.response.status(404)` call mutates the Express `res` object before `ngExpressEngine` serializes the rendered HTML — this is the correct pattern and will send a real HTTP 404 to Googlebot.

**One minor note:** `response.status(404)` in Express is a chainable setter — it does NOT send the response immediately. The actual send happens when `ngExpressEngine` calls `res.send()` after rendering, so the 404 status is set correctly on the response object before it is flushed. No timing issue here.

---

## 2. JSON-LD SSR Verification — DOCUMENT Token

**Status: VERIFIED WORKING**

### Evidence:

`seo.service.ts` injects `DOCUMENT` via Angular's DI token (line 59):
```ts
@Inject(DOCUMENT) private doc: Document,
```

`setJsonLd()` uses `this.doc` exclusively (line 208):
```ts
let script: HTMLScriptElement = this.doc.getElementById(id) as HTMLScriptElement;
if (!script) {
  script = this.doc.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  this.doc.head.appendChild(script);
}
```

The Angular `DOCUMENT` token resolves to Angular Universal's server-side DOM stub (domino) on the server, and to the real `window.document` in the browser. Both paths work correctly.

### Critical async timing question (canonical and JSON-LD):

`PublicDetailsComponent.ngOnInit()` subscribes to `this.details$.pipe(filter(...), take(1))`. The question is: does the NgRx store emit the job data before Angular Universal serializes the SSR response?

**Assessment: Risk exists but is inherent to the architecture.** Angular Universal's `renderModule` by default waits for the Angular zone to stabilize (all macrotasks complete) before serializing. If the NgRx store is populated by an HTTP fetch triggered during `ngOnInit`, that HTTP request will either:
- Complete before zone stabilization → JSON-LD IS in the SSR response (happy path)
- Complete after zone stabilization → JSON-LD is NOT in the initial SSR HTML

For job detail pages, the job data fetch happens during route initialization (`jobFacade.getJobById()`). Since this is an HTTP call, Angular Universal's standard behavior depends on `TransferState` or `APP_INITIALIZER` wiring to ensure the call completes before serialization.

**Verdict:** If the NgRx store performs server-side HTTP fetches that complete within the zone stabilization window, JSON-LD will appear in SSR output. If those fetches are deferred or not properly server-rendered, JSON-LD will only appear client-side. This is a known Angular Universal limitation — not a bug in the V4 SEO code, but a structural risk. See Section 8 for recommendation.

---

## 3. Canonical URL SSR Timing Assessment

**Status: SAME TIMING RISK AS JSON-LD (above)**

### Evidence:

`setCanonical()` uses `this.doc` correctly (SSR-safe). The timing risk is not in the implementation but in when the subscriber fires:

**In `PublicDetailsComponent`** (the parent — route-level component):
```ts
this.seoSub = this.details$.pipe(filter(job => !!job && !!job.jobTitle), take(1))
  .subscribe(job => {
    this.seoService.setPageMeta({ canonical: `https://gethiredonline.app/jobs/details/${this.jobId}`, ... });
  });
```
Canonical is set by `setPageMeta()` which calls `setCanonical()`. Same zone-stabilization timing question.

**In `JobPostsDetailsComponent`** (the child — also sets canonical):
```ts
this.normalizedJobSub = this.normalizedJob$.subscribe(job => {
  if (job) {
    this.seoService.setCanonical(`https://gethiredonline.app/jobs/details/${job.jobId}`);
  }
});
```
Both parent and child set the canonical URL to the same value. This is redundant but harmless — the canonical URL is the same in both cases.

### `clearCanonical()` in `ngOnDestroy` timing:

`JobPostsDetailsComponent.ngOnDestroy()` calls `this.seoService.clearCanonical()`. Under SSR, `ngOnDestroy` is never called (Angular Universal doesn't tear down components after rendering), so this is a no-op on the server — safe but worth documenting. On the browser, this correctly clears the canonical when navigating away.

### `clearCanonical()` before job loads edge case:

Scenario: component destroyed before `normalizedJobSub` fires (e.g., user navigates away immediately). In this case `clearCanonical()` in `ngOnDestroy` runs before the subscribe callback sets the canonical — result: no canonical tag is present. This is correct behavior (no stale canonical from a previous route).

---

## 4. OG Tags Completeness

**Status: COMPLETE — ALL REQUIRED TAGS PRESENT**

### In `index.html` (static fallback, served as SSR shell):
- `og:type` = "website" ✓
- `og:url` = "https://gethiredonline.app" ✓
- `og:title` = "GetHired Online — Jobs and Hiring Platform in the Philippines" ✓
- `og:description` = full description ✓
- `og:site_name` = "GetHired Online" ✓
- `og:image` = "https://gethiredonline.app/assets/brand/gethired-og-default.png" ✓
- `og:image:width` = "1200" ✓
- `og:image:height` = "630" ✓
- `og:image:type` = "image/png" ✓
- `twitter:card` = "summary_large_image" ✓
- `twitter:title` ✓, `twitter:description` ✓, `twitter:image` ✓

### Dynamic OG tags via `SeoService.setPageMeta()`:
All routes that call `setPageMeta()` receive the full OG tag set. Job detail pages receive `ogType: 'article'` (appropriate for job postings). The default `ogImage` fallback points to the correct 1200×630 PNG.

### OG image file:
`src/assets/brand/gethired-og-default.png` exists on disk — confirmed via glob.

### Gap: No per-job OG image
All job detail pages use the same generic OG image. Job-specific images (e.g., company logo) would improve social preview quality. This is a deferred enhancement, not a blocker.

---

## 5. Google Search Console Status

**Status: VERIFIED + SITEMAP SUBMITTED**

From session memory and audit notes:
- Property `https://gethiredonline.app/` is verified (GSC meta tag present in `index.html` line 31: `EYWOEFfXbR2hY6_iyAD0X8UXPX4fHysRFjxnOUJoEJo`)
- Sitemap `https://gethiredonline.app/sitemap.xml` submitted 2026-06-26

---

## 6. Structured Data Field Coverage — JobPosting

See `GETHIRED_SEO_STRUCTURED_DATA_AUDIT_RECENT_3.md` for full breakdown.

**Summary:** Title, description, datePosted, hiringOrganization, jobLocation are all present. baseSalary is now conditionally included (salary min/max/currency all non-null required). validThrough is conditionally included. employmentType is always included via `mapEmploymentType()` (returns 'OTHER' as safe fallback). directApply=true is present. identifier is present.

**One gap vs. Google for Jobs requirements:** `description` in the JSON-LD uses a regex-stripped version of `jobDescription`. If `jobDescription` is empty or null, the field is `""` — Google may flag this as insufficient. The `JobStructuredDataService` (old) had `description: job.description || job.title` as a fallback; the current `setJobPostingJsonLd` uses `this.stripHtml(job.jobDescription || '')` which returns `""` when `jobDescription` is empty. Recommend adding fallback to job title.

---

## 7. Sitemap Quality Review

**Status: GOOD — MINOR IMPROVEMENT AVAILABLE**

The sitemap endpoint in `server.js`:
- Serves `application/xml; charset=utf-8` ✓
- Queries only `job_status_id = 2` (published jobs) ✓
- XML-escapes job IDs (xmlEscape function) ✓
- 15-minute in-memory cache (SITEMAP_TTL_MS) ✓
- Cache-Control: public, max-age=900 (15 min) ✓
- 503 on DB error with Retry-After: 3600 ✓
- `robots.txt` includes `Sitemap:` directive pointing to correct URL ✓

**Static pages included:** /home (priority 1.0), /jobs (priority 0.9), /job-seekers (priority 0.7), /employers (priority 0.7) — all correct.

**Minor gap:** `lastmod` on static pages is always `today` (recalculated each time cache expires), not the actual last modification date of those pages. This is a minor inaccuracy — crawlers use `lastmod` to prioritize recrawling, so always-fresh dates can reduce efficiency. Low priority.

**Test file note:** `tests/sitemap.test.js` exists but cannot run automatically (no Jest runner in BE's package.json). Tests use a mock implementation with `max-age=3600` in Cache-Control while production uses `max-age=900` — test expectation would fail. This discrepancy should be fixed when test runner is added.

---

## 8. NoIndex Enforcement Review

**Status: CORRECTLY IMPLEMENTED — DUAL-LAYER PROTECTION**

Auth pages with noindex (all confirmed via source read):
- `/signin` — `robots: 'noindex, nofollow'` ✓
- `/signup` — `robots: 'noindex, nofollow'` ✓
- `/reset-password` — `robots: 'noindex, nofollow'` ✓
- `/change-password` → `change-pw` component — `robots: 'noindex, nofollow'` ✓
- `/verify` / `account-authentication` — `robots: 'noindex, nofollow'` ✓

robots.txt also Disallows all of these routes — defense-in-depth confirmed.

Job search results (`/jobs/search/`):
- `PublicSearchComponent` sets `robots: 'noindex, follow'` ✓
- `robots.txt` Disallows `/jobs/search/` ✓

Job detail error state:
- `meta.updateTag({ name: 'robots', content: 'noindex' })` ✓
- Real HTTP 404 via RESPONSE token ✓

Inactive job details (`jobStatusId !== 2`):
- `PublicDetailsComponent` sets `robots: 'noindex, nofollow'` for non-active jobs ✓

---

## 9. Core Web Vitals SEO Readiness

**Status: PARTIALLY ASSESSED — NO CWV TOOLING IN PLACE**

Positive signals:
- Angular Universal SSR means LCP candidate (job title, description) is in the SSR HTML — reduces LCP impact of AJAX loading
- `defer` attribute on Google Maps script ✓
- Font preconnect to googleapis.com and gstatic.com ✓
- Bootstrap JS loaded from CDN — no `async`/`defer` on that script tag (minor)

Gaps:
- No Lighthouse / CrUX data in this audit (would require live network access)
- Bootstrap 5.2.0 and Popper.js loaded synchronously from CDN could block render
- No explicit image lazy-loading configuration found in this pass

---

## Top Findings

1. **RESPONSE token: fully wired and correct** — server.ts provides `{ provide: RESPONSE, useValue: res }` in the render providers array; job-posts-details uses `@Optional()` + `isPlatformServer` guard correctly.

2. **JSON-LD SSR: code is correct; async timing is an inherent Angular Universal risk** — `setJsonLd` uses DOCUMENT token properly; whether JSON-LD appears in the SSR output depends on whether the NgRx HTTP fetch completes before zone stabilization.

3. **Duplicate JSON-LD eliminated** — `JobStructuredDataService` is completely unused (no component imports it). Only `SeoService.setJobPostingJsonLd()` via `PublicDetailsComponent` emits JobPosting JSON-LD.

4. **OG tags: complete** — all required tags present in both index.html (static fallback) and dynamic via SeoService.

5. **Canonical dual-write** — both `PublicDetailsComponent` (parent) and `JobPostsDetailsComponent` (child) set the canonical to the same URL. Harmless redundancy, but the child's `clearCanonical()` in `ngOnDestroy` could transiently remove the canonical set by the parent if destroy happens before subscribe fires during fast navigation.

---

## Remaining Gaps

1. **Angular Universal async timing (medium risk):** JSON-LD and canonical on job detail pages are only in SSR output if the NgRx HTTP fetch completes within the zone stabilization window. No `TransferState` or server-side data prefetching is confirmed in this codebase. Recommend verifying SSR output manually via `curl -s https://gethiredonline.app/jobs/details/{active-job-id} | grep -c 'application/ld+json'`.

2. **Empty description fallback in JSON-LD (low risk):** `setJobPostingJsonLd` sets `description: this.stripHtml(job.jobDescription || '')` — if `jobDescription` is null/empty, Google's Rich Results Test will flag the JobPosting as missing a required field. Add `|| job.jobTitle` as a fallback.

3. **Test/prod Cache-Control mismatch (low risk):** Sitemap test asserts `max-age=3600` but production serves `max-age=900`. Test would fail once test runner is added. Fix the test to assert `max-age=900`.
