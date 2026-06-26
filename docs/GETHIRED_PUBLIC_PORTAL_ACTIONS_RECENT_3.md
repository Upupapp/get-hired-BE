# GetHired — Public Portal Actions RECENT 3
**Generated:** 2026-06-26
**Scope:** Public-facing SEO, discoverability, social sharing, crawlability
**Previous state:** Multiple P1/P2 SEO gaps open
**Current state:** Core SEO infrastructure solid; remaining items are polish/scaling

---

## Status: Public Portal is Launch-Ready

Core SEO infrastructure is now complete:
- SSR (Angular Universal): configured and deployed
- JSON-LD structured data: DOCUMENT token injection (no hydration issues)
- Real HTTP 404 on unknown/expired jobs: RESPONSE token injection
- OG image: 1200x630 branded PNG created; all social platforms will show preview image
- Google Search Console: property verified; sitemap submitted
- sitemap.xml: endpoint exists, queries active jobs, has cache + error fallback
- robots.txt: correct disallow list; sitemap reference
- Crawlable CTAs: job-seeker portal CTAs converted to `<a routerLink>` elements

---

## Closed This Session

| Item | Status |
|---|---|
| OG image `gethired-og-default.png` | CLOSED — 1200x630 PNG created |
| Google Search Console property verification | CLOSED — verified |
| Sitemap submission | CLOSED — submitted |
| SSR JSON-LD injection fix | CLOSED — DOCUMENT token |
| SSR real 404 on job detail | CLOSED — RESPONSE token |

---

## Open Public Portal Items

### P2 — Verify SSR Is Actually Running in Production (P2-SSR-VERIFY)

**Risk:** If Linode/nginx is serving the static `dist/browser/index.html` instead of the Node SSR process, Googlebot sees only the generic `<title>GetHired Online</title>` with no dynamic content, JSON-LD, or OG tags — even though the code is correct.

**Verification command:**
```bash
curl -A "Googlebot" https://gethiredonline.app/jobs/details/<active-job-id>
```
**Pass criteria:**
- `<title>` shows the actual job title (not "GetHired Online")
- `<script type="application/ld+json">` block with `JobPosting` schema appears in raw HTML
- `og:title` meta tag shows job title

**If failing (static serving):** Nginx config needs to proxy to the Node SSR server process; the Angular Universal `server.ts` / `dist/server/main.js` process must be running via PM2.

**Owner:** Ops / Paul | **Effort:** XS

---

### P2 — Company Pages Not in Sitemap (P2-COMPANY-SITEMAP)

**Risk:** Company profile pages at `/jobs/company/:id` are discovered only by link-following. Google may deprioritize them.

**Fix:** Add a query to `sitemapController.js` (or wherever sitemap XML is built) to include all active company profile URLs:
```javascript
const companies = await dbQuery.query('SELECT id, updated_at FROM companies WHERE is_active = true');
const companyUrls = companies.rows.map(c => ({
  loc: `${baseUrl}/jobs/company/${c.id}`,
  lastmod: c.updated_at.toISOString().split('T')[0],
  changefreq: 'weekly',
  priority: 0.6
}));
```

**Owner:** BE dev | **Effort:** S

---

### P2 — Employer Info Page CTAs Not Crawlable (P2-HERO-CTA)

**Risk:** `(click)="router.navigate()"` buttons on the employer info page carry no SEO link equity. Googlebot sees them as non-links. "Post a Job" and "Get Started" CTAs should pass PageRank to `/jobs/post`.

**Fix:** Convert to `<a routerLink="/jobs/post">` elements (same pattern as job-seeker portal fix in commit 94e4d39).

**Files:** `src/app/home/employers/` component HTML templates
**Owner:** FE dev | **Effort:** XS

---

### P2 — SVG Images Without Width/Height (P2-SVG-CLS)

**Risk:** `<img src="*.svg">` without explicit `width` and `height` attributes causes the browser to not reserve layout space → layout shift → degrades Core Web Vitals CLS score.

**Fix:** Add `width="N" height="N"` to all SVG `<img>` elements in homepage and public-page component templates.

**Owner:** FE dev | **Effort:** S

---

### P2 — localStorage in PublicSearchComponent Without SSR Guard (P2-LOCALSTORAGE-SSR)

**Risk:** `localStorage` calls in `public-search.component.ts` throw `ReferenceError: localStorage is not defined` in the Node SSR context. Angular Universal falls back to client-only rendering for this page — Googlebot sees the loading skeleton, not the content.

**Fix:**
```typescript
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

// Wrap all localStorage calls:
if (isPlatformBrowser(this.platformId)) {
  localStorage.setItem('key', value);
}
```

**Files:** `src/app/jobs/public-search/public-search.component.ts`
**Owner:** FE dev | **Effort:** XS

---

### P3 — Deferred: Google Indexing API (FEAT-INDEXING-API)

Now unblocked by Search Console verification. The Google Indexing API allows proactive URL submission when new jobs are posted, instead of waiting for crawl queue. Additional OAuth setup required (service account + Indexing API scope).

**When to do:** After measuring indexing velocity via Search Console (typically 1-4 weeks post-launch). If jobs take longer than 7 days to appear in search results, prioritize this.

---

### P3 — Deferred: Programmatic SEO Landing Pages (FEAT-PROGRAMMATIC-SEO)

"Jobs in Manila", "Remote Jobs Philippines", "Customer Service Jobs Philippines" etc.

**Do not build until:** At least 5 active, unique jobs exist per city/category. Stub pages with thin content trigger Google thin-content penalties that hurt the entire domain.

---

## Public Portal SEO Health Scorecard

| Area | Status | Notes |
|---|---|---|
| SSR / dynamic rendering | PASS (verify in prod) | Angular Universal configured; verify with curl |
| Structured data (JSON-LD) | PASS | JobPosting schema; DOCUMENT token injection |
| Real 404 on unknown jobs | PASS | RESPONSE token injection |
| OG image | PASS | 1200×630 PNG deployed |
| Social sharing (og:title, og:desc) | PASS | SeoService wired |
| sitemap.xml | PASS | Active jobs; cache; error fallback |
| robots.txt | PASS | Correct disallows; sitemap reference |
| Search Console | PASS | Property verified; sitemap submitted |
| Crawlable job-seeker CTAs | PASS | `<a routerLink>` conversion done |
| Crawlable employer info CTAs | OPEN (P2) | Convert (click) to routerLink |
| Company pages in sitemap | OPEN (P2) | Add company URLs to sitemap query |
| SVG CLS | OPEN (P2) | Add width/height to img[src=*.svg] |
| localStorage SSR guard | OPEN (P2) | isPlatformBrowser wrap in PublicSearch |
| Breadcrumb schema | PASS | Visual breadcrumb added to job detail |
| noindex on error states | PASS | jobError$ subscription sets noindex |
| Rate limiting on public endpoints | OPEN (P1) | publicReadLimiter needed (DoS protection) |
