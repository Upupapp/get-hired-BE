# GETHIRED_OPTIMIZE_BACKLOG_RECENT_3
## Optimization Backlog — OPTIMIZE Round 3
Date: 2026-06-26

Items that were identified but not fixed this round (outside safe/small/reversible scope, or deferred).

---

## HIGH PRIORITY

### B-R3-001 — Dynamic sitemap.xml
**Category:** SEO
**Description:** No `/sitemap.xml` endpoint exists. Googlebot discovers job detail pages only by following links. A sitemap listing all `jobStatusId=2` job URLs with `<lastmod>` would accelerate indexing of new jobs and speed deindexing of expired ones.
**Effort:** Medium (new BE route + Angular Universal transfer-state or static generation)
**Risk:** Low

### B-R3-002 — Remaining `localStorage` field initializers in auth-gated routes
**Category:** SSR safety / consistency
**Description:** The following files still have unguarded localStorage reads. They are in auth-gated routes (not reachable by Googlebot without login), so they do not cause SSR indexing failures. However, they are technically incorrect and could cause issues if routes are ever opened to SSR:
- `application/application-process/steps/interview-questions/components/job-details-answer-interview/job-details-answer-interview.component.ts:13`
- `views/home/pages/job-post-details-apply/steps/interview-questions/components/record-interview/record-interview.component.ts:26`
- `views/home/pages/job-post-details-apply/steps/interview-questions/components/job-details-answer-interview/job-details-answer-interview.component.ts:13`
**Effort:** Low per file (same pattern as R3 fixes)
**Risk:** Low — currently auth-gated, no active SSR crash

---

## MEDIUM PRIORITY

### B-R3-003 — `public-details.component.ts` window.innerWidth in @HostListener
**Category:** Code correctness / SSR
**Description:** `@HostListener('window:resize')` reads `window.innerWidth` directly. The @HostListener decorator means this only fires in the browser — not an active SSR crash. However, if Angular Universal's behavior changes, or if this component is tested in a server context, it would crash. Adding an `isPlatformBrowser` guard inside the @HostListener is defensive hardening.
**Effort:** Trivial
**Risk:** Zero — pure guard addition

### B-R3-004 — ChangeDetectionStrategy.OnPush on job card components
**Category:** Angular performance / INP
**Description:** Job card components (job-card.component.ts, job-match-panel.component.ts) use default change detection. With OnPush, Angular would only check these components when their @Input() references change, reducing unnecessary checks on every timer/event. High-impact on the job list page with 30+ cards.
**Effort:** Medium (requires auditing all @Input() bindings and async pipe usage)
**Risk:** Medium (OnPush requires all state changes via observables or explicit markForCheck)

### B-R3-005 — og:url strips query params
**Category:** SEO
**Description:** `seoService.setPageMeta()` sets `og:url` to `${BASE_URL}${this.router.url}`. On search/filter pages, `this.router.url` may include query params. og:url should be the canonical URL without params.
**Effort:** Low (pass explicit canonical to og:url)
**Risk:** Zero

### B-R3-006 — `last-modified` response header for job detail SSR pages
**Category:** SEO / Crawl efficiency
**Description:** SSR responses for `/jobs/details/:id` do not set a `Last-Modified` header. Googlebot cannot determine if a job has changed without re-crawling. Setting this from the job's `updatedAt` or `createdAt` field would improve crawl budget efficiency.
**Effort:** Medium (requires RESPONSE header access in SSR context)
**Risk:** Low

---

## LOW PRIORITY / NICE TO HAVE

### B-R3-007 — Redis rate-limit store
**Category:** BE scaling
**Description:** Current in-memory rate limiter resets on process restart and doesn't work across multiple nodes. Not needed for current single-Linode deployment.
**Effort:** Medium
**Risk:** Low

### B-R3-008 — DB query N+1 audit in batch controllers
**Category:** BE efficiency
**Description:** `addMultipleContact` and `addCandidates` may issue multiple queries per item. Not profiled yet.
**Effort:** High (requires query logging and profiling under load)

### B-R3-009 — Per-request latency logging in BE
**Category:** Observability
**Description:** No structured latency logging. Hard to diagnose slow endpoints in production.
**Effort:** Low (express middleware)

### B-R3-010 — SSR hydration mismatch on mobile (screenSize default 1600)
**Category:** CLS / Mobile UX
**Description:** Server renders at 1600px breakpoint; mobile clients at 375px see a layout shift on hydration. This is a known Angular Universal limitation and is not regression from this round.
**Effort:** High (requires SSR-aware responsive layout or server-side breakpoint detection via User-Agent)
