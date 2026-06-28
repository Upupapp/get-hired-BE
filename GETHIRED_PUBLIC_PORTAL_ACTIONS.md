# GETHIRED PUBLIC PORTAL ACTIONS
## QA Cycle 11

**Generated:** 2026-06-25
**Scope:** Actions affecting publicly visible pages: job board, company pages, job details, shareable links, and unauthenticated API endpoints.

---

## Public Portal Endpoints (currently active, no auth required)

| Route | Controller | Notes |
|-------|-----------|-------|
| `GET /api/job/published` | `getAllPublishedJobs` | Public job board feed |
| `GET /api/job/details` | `getJobDetails` | Job detail page |
| `GET /api/job/sharelink` | `getJobShareableLink` | Shareable job URL |
| `GET /api/company/featured` | `getFeaturedCompanies` | Featured companies list |
| `GET /api/company/details` | `getSpecificCompany` | Public company profile |
| `GET /api/company/sharelink` | `getCompanyShareableLink` | Company shareable URL |
| `POST /api/payment/paymongowebhook` | `paymongoWebhook` | Webhook (must stay open but needs HMAC) |

---

## Public Portal Actions (Priority-Ordered)

### PP-01 — Rate-Limit Public Job Search Endpoint
**Priority:** P2
**Why:** `GET /api/job/published` is unauthenticated and uncapped (only the global 500/15min limiter applies). A scraper can exhaust 500 requests in 15 minutes trivially. Public job boards are common scraping targets.
**Action:** Add a stricter public-read limiter (e.g. 60/minute per IP) specifically on `/api/job/published` and `/api/job/details`.
**Files:** `server.js`
**Acceptance Criteria:**
- [ ] `publicReadLimiter = rateLimit({ windowMs: 60*1000, max: 60 })` defined
- [ ] Applied before `app.use("/api", ...)` mounting: `app.use("/api/job/published", publicReadLimiter)`
- [ ] Test: 61st request within 1 minute gets 429

### PP-02 — Add Cache-Control Headers to Public Job Endpoints
**Priority:** P2
**Why:** Public job listings are read-heavy. Without cache headers, CDN and browser cannot cache; every request hits the DB.
**Action:** Add `Cache-Control: public, max-age=60, stale-while-revalidate=300` on `getAllPublishedJobs` and `getJobDetails`.
**Files:** `controllers/jobsController.js`
**Acceptance Criteria:**
- [ ] `res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')` on success path
- [ ] Job create/update/status-change endpoints emit `Cache-Control: no-store` to avoid stale caches

### PP-03 — Structured Data (JSON-LD) on Job Detail Page (FE)
**Priority:** P2
**Why:** Job detail pages with `JobPosting` schema markup get rich results in Google Search.
**Action:** Add `<script type="application/ld+json">` JSON-LD block to job detail Angular component with `datePosted`, `title`, `hiringOrganization`, `jobLocation`.
**Files:** FE job-detail component
**Acceptance Criteria:**
- [ ] JSON-LD block present in rendered HTML of `/jobs/:id`
- [ ] Google Rich Results Test passes for the job URL

### PP-04 — Meta Tags for Job Detail and Company Pages (FE)
**Priority:** P2
**Why:** Open Graph and `<title>` tags are missing on dynamic pages — sharing a job URL on LinkedIn/Slack shows no preview.
**Action:** Angular `Meta` service sets `og:title`, `og:description`, `og:image` on route change for job and company detail pages.
**Files:** FE job-detail component, company-detail component
**Acceptance Criteria:**
- [ ] `<title>` is `{Job Title} at {Company Name} | GetHired`
- [ ] `og:title`, `og:description` populated from API response
- [ ] `og:image` falls back to GetHired logo when company has no logo

### PP-05 — 404 Page for Invalid Job/Company IDs (FE)
**Priority:** P2
**Why:** Navigating to a non-existent job or company currently shows an empty/broken state, not a proper 404.
**Action:** Angular router guard or component `ngOnInit` checks API response and navigates to `/not-found` on 404.
**Files:** FE job-detail component, company-detail component
**Acceptance Criteria:**
- [ ] Invalid job ID returns HTTP 404 from BE `getJobDetails`
- [ ] FE redirects to `/not-found` with proper H1 "Page not found"
- [ ] Correct HTTP 404 status from SSR if SSR is used (or canonical tag for CSR)

### PP-06 — sitemap.xml for Published Jobs
**Priority:** P3
**Why:** Search engines need a sitemap to crawl all job listings efficiently.
**Action:** New route `GET /sitemap.xml` generates XML sitemap of all active published jobs dynamically (or via scheduled job writing to a static file).
**Files:** new `controllers/sitemapController.js`, new `routes/sitemapRoute.js`
**Acceptance Criteria:**
- [ ] `/sitemap.xml` responds with valid XML sitemap
- [ ] Includes all active jobs with `<loc>`, `<lastmod>`, `<changefreq>`
- [ ] Includes company pages
- [ ] Response cached for 1 hour

### PP-07 — robots.txt Served from BE
**Priority:** P3
**Files:** `server.js`
**Acceptance Criteria:**
- [ ] `GET /robots.txt` returns `User-agent: *\nAllow: /\nSitemap: https://domain.com/sitemap.xml`
