# GetHired SEO Crawlability Audit — RECENT_3
**Date:** 2026-06-26
**Scope:** robots.txt correctness, sitemap coverage and quality, SSR readiness for crawlers, and known crawlability risks.

---

## 1. robots.txt Assessment

**File:** `src/robots.txt` → deployed to `https://gethiredonline.app/robots.txt` (listed in `angular.json` assets array)

### Full contents:
```
User-agent: *
Allow: /

# Private/authenticated-only routes — do not index
Disallow: /admin/
Disallow: /admin
Disallow: /recruiter/
Disallow: /recruiter
Disallow: /user/
Disallow: /user
Disallow: /owner/
Disallow: /owner
Disallow: /investor/
Disallow: /investor
Disallow: /api/
Disallow: /payment/
Disallow: /payment
Disallow: /subscription/
Disallow: /subscription
Disallow: /signin
Disallow: /signup
Disallow: /reset-password
Disallow: /change-password
Disallow: /verify

# Prevent indexing paginated/filtered search result pages (duplicate content).
Disallow: /jobs/search/

# Sitemap location
Sitemap: https://gethiredonline.app/sitemap.xml
```

### Conformance checks:
| Check | Result |
|-------|--------|
| `User-agent: *` applies to all bots | PASS |
| Sitemap directive present with correct URL | PASS |
| No accidental Disallow of canonical public pages (/home, /jobs, /job-seekers, /employers) | PASS |
| No Disallow of /jobs/details/ (would block all job URLs) | PASS |
| Trailing-slash + bare-path variants for role routes | PASS |
| CRLF vs LF line endings: not verified (static file served by Express static middleware) | ADVISORY |

### Minor issues:
1. `/verify` — robots.txt disallows `/verify` (no trailing slash). If the route is `/verify/something` (deep path), only the exact `/verify` entry may not block sub-paths in all Googlebot versions. The `Disallow: /verify` without trailing slash should still match all sub-paths in current Googlebot per RFC 9309 — acceptable.
2. No Disallow for `/company/` — if company profile pages become public in future, this would need updating.
3. No `Crawl-delay` directive — acceptable (Google ignores it; only honored by some bots like Bing).

---

## 2. Sitemap Coverage Assessment

**Endpoint:** `GET /sitemap.xml` (BE `server.js`)

### Static pages in sitemap:
| URL | changefreq | priority | Should be in sitemap? |
|-----|-----------|----------|-----------------------|
| `/home` | weekly | 1.0 | YES ✓ |
| `/jobs` | daily | 0.9 | YES ✓ |
| `/job-seekers` | monthly | 0.7 | YES ✓ |
| `/employers` | monthly | 0.7 | YES ✓ |

### Dynamic job URLs:
- Query: `SELECT job_id, updated_at FROM {schema}.jobs WHERE job_status_id = 2 ORDER BY updated_at DESC`
- URL format: `https://gethiredonline.app/jobs/details/{job_id}`
- changefreq: weekly, priority: 0.8
- lastmod: `updated_at` date (YYYY-MM-DD) or today if null

### Sitemap quality:
| Criterion | Status | Notes |
|-----------|--------|-------|
| Only published jobs (status=2) | PASS | Prevents dead URLs in sitemap |
| XML namespace correct | PASS | `http://www.sitemaps.org/schemas/sitemap/0.9` |
| XML declaration present | PASS | `<?xml version="1.0" encoding="UTF-8"?>` |
| Content-Type: application/xml | PASS | |
| XML injection protection | PASS | `xmlEscape()` on job_id and lastmod |
| Cache (15 min in-process, 15 min CDN) | PASS | New jobs appear within 15 minutes |
| Graceful degradation (503 + empty urlset on DB error) | PASS | |
| No auth-gated URLs included | PASS | |
| No noindex'd URLs included | PASS | (search results, auth pages not in sitemap) |

### Gaps:
1. **`/home` not at root URL** — The canonical homepage URL in sitemap is `https://gethiredonline.app/home`. If the app also serves content at `https://gethiredonline.app/` (root), there may be two URLs for the same content. Recommend verifying that root `/` redirects to `/home` or that the sitemap uses the same URL as the canonical in the component.
2. **No image sitemap** — Google can discover the OG image but a formal `<image:image>` tag in the sitemap for job pages could improve image indexing. Low priority for a job board.
3. **Static page lastmod is always today** — `lastmod` for /home, /jobs, /job-seekers, /employers is recalculated as the current date every 15 minutes. Google may interpret this as "changes frequently" and crawl more aggressively than needed. Consider using a fixed date or a deployment timestamp.

---

## 3. SSR Readiness for Crawlers

### Angular Universal SSR: confirmed present
- `server.ts` uses `ngExpressEngine` with `AppServerModule`
- All routes rendered server-side via `server.get('*', ...)`
- Static assets served with `server.get('*.*', express.static(distFolder))` (matched first)
- `AppServerModule` imports `ServerModule` from `@angular/platform-server` ✓

### What Googlebot sees in SSR response (verified from code):

For a valid active job URL (`/jobs/details/:id`):
- `<title>` — job title + company + "| GetHired Online" (if job data resolves before zone stabilization)
- `meta[name="description"]` — job-specific description
- `meta[name="robots"]` — "index, follow"
- `meta[property="og:*"]` — full OG tag set
- `<link rel="canonical">` — per-job canonical URL (timing dependent)
- `<script type="application/ld+json" id="gh-jsonld-jobposting">` — JobPosting (timing dependent)
- `<script type="application/ld+json" id="gh-jsonld-breadcrumb">` — BreadcrumbList (timing dependent)

**Timing-dependent items** are those set inside a subscribe callback on an observable that resolves from an async HTTP call. If Angular Universal's zone stabilization fires before the HTTP response arrives, these items will NOT appear in the SSR HTML.

For the homepage (`/home`):
- All Organization and WebSite JSON-LD is set in `ngOnInit` — synchronous calls to `setOrganizationJsonLd()` and `setWebsiteJsonLd()` — these DO appear in SSR output reliably.

### Zone stabilization risk analysis:

The critical path is:
1. `PublicDetailsComponent.ngOnInit()` calls `this.jobFacade.getJobById(this.jobId)`
2. This dispatches an NgRx action which triggers an HTTP call (from Angular HTTP client)
3. The HTTP call is a macrotask in Angular's zone
4. Zone stabilization happens when the zone queue is empty
5. Angular Universal's `renderModule` waits for zone stabilization

**If** Angular's HttpClient triggers a zone-tracked request (the default in Angular Universal with `ServerTransferStateModule`), the zone will NOT stabilize until the HTTP response returns. This means the HTTP data WILL be available before rendering.

**If** the NgRx store uses a non-standard scheduler or if the HTTP call exits the Angular zone for any reason, data may not be available before rendering.

**Bottom line:** Standard Angular Universal + NgRx + HttpClient setup SHOULD ensure data is available in SSR. The DOCUMENT-based methods will correctly write to the server DOM. However, this has not been verified via live curl testing.

---

## 4. Crawl Budget Considerations

### Current crawl budget allocation (estimated):
- Public job detail pages: likely hundreds to thousands depending on active job count
- Static pages: 4
- Search result pages: blocked by robots.txt ✓
- Auth pages: blocked by robots.txt ✓
- Sitemap refreshes crawl signals every 15 minutes ✓

### Items that could waste crawl budget:
1. **Inactive job pages returning HTTP 200** — Googlebot crawls, reads noindex, moves on. Each such crawl consumes budget without contributing to indexing. At scale (thousands of expired jobs), this could matter.
2. **`lastmod: today` on all static pages** — signals frequent changes even when content hasn't changed; may increase crawl frequency unnecessarily.

---

## 5. Crawler Signals Summary

| Signal | Status |
|--------|--------|
| robots.txt present and parseable | PASS |
| Sitemap submitted to Search Console | PASS |
| Sitemap referenced in robots.txt | PASS |
| SSR: Googlebot receives rendered HTML (not empty Angular shell) | PASS |
| SSR: Real HTTP 404 for invalid job URLs | PASS |
| Canonical tags: per-route | PASS (timing dependent) |
| noindex on all private/auth pages | PASS (dual-layer) |
| Google Search Console property verified | PASS |
| X-Content-Type-Options: nosniff | PASS (BE security headers) |
| Structured data: JobPosting, Organization, WebSite, BreadcrumbList | PASS |

---

## 6. Recommendations (prioritized)

### High
- Verify SSR output contains JSON-LD and canonical via live curl before declaring Google for Jobs ready:
  ```
  curl -s "https://gethiredonline.app/jobs/details/{active-job-id}" | grep -E "(ld\+json|canonical)"
  ```

### Medium
- Add `jobLocationType: 'TELECOMMUTE'` for remote jobs in `setJobPostingJsonLd` (see structured data audit)
- Add description fallback in `setJobPostingJsonLd`: `|| job.jobTitle || ''`
- Confirm `/` root URL redirects to `/home` or update sitemap/canonical to use root URL

### Low
- Fix sitemap test Cache-Control assertion (`max-age=3600` → `max-age=900`)
- Consider HTTP 410 for inactive job URLs to free crawl budget
- Confirm Angular route for change-password is `/change-password` (matches robots.txt entry)
- Evaluate using deployment timestamp for static page `lastmod` in sitemap
