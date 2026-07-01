# GETHIRED PUBLIC PORTAL ACTIONS — V6
**Date:** 2026-07-01 | **Scope:** All public-facing pages — job listing, job detail, company pages, public search, home page, employer info

---

## Open Actions — Public Portal

### PP-ACT-001 (= ACT-005): JobPosting JSON-LD on /jobs/:id
**Priority:** P1
**Problem:** Public job detail page does not emit `<script type="application/ld+json">` JobPosting structured data.
**Why it matters:** Google Job Search rich results require JobPosting JSON-LD. Without it, jobs are invisible in Google's dedicated job search UI (millions of impressions).
**Scope:** `job-posts-details.component.ts` — inject `SeoService.addJobPostingSchema()` in `ngOnInit` once job data loads.
**Non-scope:** Schema for non-published / draft jobs; schema for company pages.
**Affected repo:** FE
**Affected files:** `src/app/jobs/job-posts-details/job-posts-details.component.ts`, `src/app/core/services/seo.service.ts`
**Affected roles:** Public visitors, Googlebot
**Effort:** ~2 hours
**Acceptance criteria:** `curl https://gethiredonline.app/jobs/details/{active-job-id}` returns HTML containing `"@type":"JobPosting"` with title, description, datePosted, hiringOrganization, jobLocation.
**Status:** OPEN

---

### PP-ACT-002 (= P2-SOFT-404): HTTP 404 on Expired/Unknown Jobs
**Priority:** P2
**Problem:** When a job ID is not found or expired, the Angular SSR process still returns HTTP 200 with a client-rendered error state. Google interprets this as thin-content and indexes the page.
**Why it matters:** Soft 404s pollute the index with worthless pages and degrade crawl budget.
**Scope:** Inject Angular `RESPONSE` token in `job-posts-details.component.ts`; call `response.status(404)` inside the `jobError$` subscription.
**Non-scope:** Company page 404s; general Angular error pages.
**Affected repo:** FE
**Affected files:** `src/app/jobs/job-posts-details/job-posts-details.component.ts`, `server.ts`
**Effort:** ~2-3 hours
**Acceptance criteria:** `curl -I https://gethiredonline.app/jobs/details/nonexistent-xyz` returns HTTP 404.
**Status:** OPEN

---

### PP-ACT-003 (= P2-LOCALSTORAGE-SSR): isPlatformBrowser Guard in PublicSearchComponent
**Priority:** P2
**Problem:** `localStorage` calls in `PublicSearchComponent` throw `ReferenceError` in Node SSR context, causing Angular Universal to fall back to client-only rendering for the public job search page.
**Why it matters:** If SSR falls back for the search page, Googlebot sees no job content — the primary indexable page degrades.
**Scope:** Wrap all `localStorage` calls with `if (isPlatformBrowser(this.platformId))`.
**Affected repo:** FE
**Affected files:** `src/app/jobs/public-search/public-search.component.ts`
**Effort:** ~30 minutes
**Acceptance criteria:** SSR render of `/jobs` does not throw ReferenceError in PM2 logs.
**Status:** OPEN

---

### PP-ACT-004 (= P2-HERO-CTA): Employer Info Page CTAs — Crawlable Links
**Priority:** P2
**Problem:** Employer info page CTAs ("Post a Job", "Get Started", "Learn More") use Angular `(click)="router.navigate()"` rather than `<a routerLink>` elements. Not crawlable by Googlebot.
**Why it matters:** Google cannot follow JavaScript-only navigation events reliably. Link equity to `/jobs/post` is blocked.
**Scope:** Replace `(click)` navigation with `<a [routerLink]="...">` in employer info page template.
**Non-scope:** Authenticated employer portal pages (no SEO value).
**Affected repo:** FE
**Affected files:** `src/app/home/employers/` component HTML (audit needed)
**Effort:** ~30 minutes
**Acceptance criteria:** Googling "Get Started" link in employer info page HTML shows `<a href="/jobs/post">` (or equivalent route).
**Status:** OPEN

---

### PP-ACT-005 (= P2-SVG-CLS): SVG width/height Attributes (CLS)
**Priority:** P2
**Problem:** `<img src="*.svg">` elements on homepage and public pages lack explicit `width`/`height` attributes. Browser cannot reserve layout space before SVG loads → CLS (Cumulative Layout Shift) degradation.
**Why it matters:** CLS is a Core Web Vital. Poor CLS lowers Google ranking and creates jarring page jumps for users.
**Scope:** Audit `<img>` tags in public-facing component templates. Add `width` + `height` on all SVGs.
**Affected repo:** FE
**Affected files:** Homepage, job-seeker portal, employer info page component templates
**Effort:** ~1 hour
**Acceptance criteria:** Lighthouse CLS score does not degrade from baseline after deployment.
**Status:** OPEN

---

### PP-ACT-006 (= ACT-016): Canonical URL Meta + Company Pages in Sitemap
**Priority:** P2
**Problem:** Company profile pages at `/jobs/company/:id` are not included in `sitemap.xml`. No canonical URL meta tags on public job/company pages.
**Why it matters:** Duplicate content risk without canonical; company pages undiscoverable by search bots until manually crawled.
**Scope:** (a) Add `<link rel="canonical">` meta injection in `SeoService` on job detail + company pages. (b) Add company page URLs to sitemap controller query.
**Affected repo:** BE + FE
**Affected files:** `get-hired-BE/controllers/sitemapController.js`, `src/app/core/services/seo.service.ts`
**Effort:** ~2-3 hours
**Acceptance criteria:** `https://gethiredonline.app/sitemap.xml` includes company page URLs. Job detail page HTML contains `<link rel="canonical" href="...">`.
**Status:** OPEN

---

### PP-ACT-007 (= ACT-008): Noindex on Role Classification Page
**Priority:** P2
**Problem:** `/role-classification` is an internal routing page that should not be indexed by search engines (thin/duplicate content, no user value as a search result).
**Scope:** Add `this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' })` in `role-classification.component.ts` ngOnInit.
**Affected repo:** FE
**Affected files:** `src/app/auth/role-classification/role-classification.component.ts`
**Effort:** ~10 minutes
**Acceptance criteria:** `curl -A Googlebot https://gethiredonline.app/role-classification` shows `<meta name="robots" content="noindex, nofollow">` in HTML.
**Status:** OPEN

---

### PP-ACT-008 (= P2-SSR-VERIFY): Verify Angular Universal SSR Running in Production
**Priority:** P2
**Problem:** `server.ts` and `AppServerModule` are configured, but it is unknown whether Linode/nginx actually serves the Node SSR process or falls back to static `index.html`.
**Why it matters:** If static, Googlebot sees no dynamic `<title>`, JSON-LD, or `og:` tags.
**Scope:** Ops verification only — no code change required if SSR is confirmed running.
**Affected repo:** N/A (ops)
**Effort:** ~15 minutes (verification)
**Steps:** `curl -A "Googlebot" https://gethiredonline.app/jobs/details/{any-active-job-id}` — look for job-specific `<title>` and `<script type="application/ld+json">` in raw HTML output.
**Acceptance criteria:** Job-specific title and JSON-LD present in raw HTML response.
**Status:** OPEN

---

### PP-ACT-009: OG Image Asset Creation
**Priority:** P1
**Problem:** `gethired-og-default.png` does not exist at `src/assets/brand/`. Social share previews show logo only.
**Scope:** Create 1200×630px branded PNG. Commit to `get-hired-FE/src/assets/brand/gethired-og-default.png`.
**Non-scope:** Per-job OG image generation (future feature).
**Affected repo:** FE
**Affected files:** `src/assets/brand/gethired-og-default.png` (new file), `src/app/core/services/seo.service.ts` (verify path constant)
**Owner:** Design / Paul
**Effort:** 1-2 hours
**Acceptance criteria:** Pasting `https://gethiredonline.app` into LinkedIn post composer shows branded OG image card.
**Status:** OPEN

---

## Closed Public Portal Items (History)

| Item | Closed | Detail |
|---|---|---|
| Browse jobs crawlable links | 94e4d39 | 3 CTAs converted from `(click)` to `<a routerLink>` |
| Job detail breadcrumb UI | 41b5920 | Visual breadcrumb nav added |
| Error-state noindex on job detail | 41b5920 | noindex meta on jobError$ |
| `sameAs: []` in Organization JSON-LD | 94e4d39 | Empty array omitted |
| CORS wildcard | d4e34c7 | Scoped to app URL |
| isMobileViewAllowed dead code | 94e4d39 | Removed from routes + guard |
| Mobile: public pages accessible | Multiple | Mobile block removed |

---

## Top 5 Public Portal Actions (Priority Order)

1. PP-ACT-009 — OG image asset (P1, unblocks social sharing)
2. PP-ACT-001 — JobPosting JSON-LD (P1, Google Jobs rich results)
3. PP-ACT-008 — Verify SSR running (P2, ops check — 15 min)
4. PP-ACT-003 — isPlatformBrowser guard (P2, SSR correctness)
5. PP-ACT-002 — HTTP 404 on expired jobs (P2, SEO index quality)
