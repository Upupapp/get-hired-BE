# GETHIRED_SEO_READINESS_AUDIT_RECENT_3
## SEO Readiness Audit — OPTIMIZE Round 3
Date: 2026-06-26

---

## CRITICAL SEO SIGNALS — JOB DETAIL PAGE

### HTTP Status
- Active jobs: HTTP 200 (SSR renders full page)
- Missing/expired/deleted jobs: HTTP 404 (via `@Optional() @Inject(RESPONSE)` + `isPlatformServer` guard in `jobErrorSub`)
- Googlebot receives a real 404 for dead content — prevents soft-404 indexing

### Title
- Active job: `${job.title} at ${job.companyName} | GetHired` (set in normalizedJobSub)
- Error state: "Job not found | GetHired" (set in jobErrorSub)
- SSR: title is in SSR HTML

### Canonical
- Active job: `https://gethiredonline.app/jobs/details/${job.jobId}` (set via seoService.setCanonical → DOCUMENT token → in SSR head)
- Error state: `clearCanonical()` called in ngOnDestroy — no orphaned canonical
- Cleared on navigation away: `clearCanonical()` in ngOnDestroy

### robots meta
- Active job: `index, follow`
- Error/deleted job: `noindex`
- Search results: `noindex, follow`

### JSON-LD (JobPosting)
- Set via `seoService.setJobPostingJsonLd()` from `public-details.component.ts` when `jobStatusId === 2`
- Uses DOCUMENT token — present in SSR HTML seen by Googlebot
- Cleared on navigation away: `clearJobPostingJsonLd()` in ngOnDestroy
- Fields: title, description (HTML-stripped), datePosted, hiringOrganization, jobLocation, url, directApply:true, identifier, employmentType, baseSalary (when available), validThrough (when available)

### Breadcrumb JSON-LD
- Set in `public-details.component.ts` ngOnInit
- Cleared in ngOnDestroy
- Structure: Home → Jobs → {Job Title}

### OG / Social preview
- `og:image` = `https://gethiredonline.app/assets/brand/gethired-og-default.png`
- `og:image:width` = 1200, `og:image:height` = 630, `og:image:type` = image/png
- File confirmed present: `src/assets/brand/gethired-og-default.png` (9.9KB)

---

## SEARCH PAGE SEO

`public-search.component.ts` sets:
- `robots: noindex, follow` — prevents search-result duplicate content indexing
- `canonical: https://gethiredonline.app/jobs` — consolidates link equity to main jobs page
- Dynamic title: `"${keyword}" Jobs in the Philippines | GetHired Online`

The secondary SSR risk (asyncLocalStorage calling bare localStorage) is now fixed (FIX-R3-009). The search page now fully renders on the server without crashing.

---

## JOB LIST PAGE SEO (/jobs)

`job-posts.component.ts` and its child `app-banner` were SSR-crashing with `localStorage is not defined`. After FIX-R3-002 through FIX-R3-006, the `/jobs` route server-renders without errors. Googlebot receives valid HTML.

---

## SEO RISKS REMAINING (backlog)

1. **Dynamic sitemap:** No sitemap.xml is generated from the job list. Each job detail URL must be discovered by Googlebot via crawl. A dynamic sitemap at `/sitemap.xml` listing all active (jobStatusId=2) job URLs would accelerate indexing.

2. **`og:url` on list pages:** Points to `${BASE_URL}${this.router.url}` which may include query params. Consider stripping query params from og:url.

3. **No `last-modified` header** from SSR for individual job pages — Googlebot cannot tell when a job was last updated without crawling.
