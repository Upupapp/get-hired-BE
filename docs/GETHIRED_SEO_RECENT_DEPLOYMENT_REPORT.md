# GetHired SEO Recent Deployment Report
**Audit date:** 2026-06-26
**Deployment audited:** NOTIFY-P2

---

## Executive Summary

NOTIFY-P2 introduced changes exclusively to authenticated employer-panel routes (candidate import dialog, contact import dialog, and styles). These components are behind `AuthGuard` and the `EmployerGuard`, are not crawlable, and carry no public-facing URLs. **SEO impact from NOTIFY-P2: zero.** No regression.

Separately, a prior session removed the site-wide mobile block (a `< 1025px` desktop-only splash page in `app.component.ts`). That removal is confirmed — `app.component.ts` now contains only translation bootstrapping and `app.component.html` contains only `<router-outlet>`. The site is now indexable by Google's mobile-first crawler.

Structured data (JobPosting JSON-LD) and per-job title/meta tags are implemented across two complementary services and called correctly on public job detail pages. Sitemap and robots.txt are both deployed. The OG image is still the logo fallback (not a purpose-built 1200×630 image), which affects social share card quality but not search indexing.

---

## 1. NOTIFY-P2 SEO Impact

### Changed Components
| Component | Route Path | Guard | Public? |
|---|---|---|---|
| `ImportAddCandidateComponent` | `/recruiter/contacts/candidate-list/:id` | `AuthGuard` + `EmployerGuard` (role 2) | No |
| `ImportAddContactComponent` | `/recruiter/contacts/list` | `AuthGuard` + `EmployerGuard` (role 2) | No |
| `TableControlModalComponent` | Modal inside candidate-list route | Same as above | No |
| `styles.scss` additions (`.warning-snackbar`, `.info-snackbar`) | Global styles | N/A — style-only, no HTML/URL change | No |

### Guard Chain
- Top-level: `app.routing.module.ts` → path `recruiter` → `canActivate: [AuthGuard]` with `data.role: '2'`
- `AuthGuard.checkUserLogin()` redirects unauthenticated users to `/signin`; wrong-role users to their own panel
- `EmployerGuard` enforces employer role and resets routes for non-employer sessions
- The contacts sub-module (`employer-contacts.module.ts`) has no public child routes

**Verdict: No SEO impact. All NOTIFY-P2 components are inaccessible to Googlebot.**

---

## 2. Mobile-First Indexing Readiness

### Desktop-only block: REMOVED
- `src/app/app.component.ts`: Only contains `TranslateService` bootstrapping. No screen-width check, no viewport guard, no mobile redirect. Confirmed.
- `src/app/app.component.html`: Contains exactly `<router-outlet>`. Confirmed.

### Remaining `isMobileViewAllowed` flags
The route data attribute `isMobileViewAllowed: false` appears on several routes in `app.routing.module.ts` (recruiter, user, admin). These data keys are NOT consumed by any guard currently active in the public path — no guard reads `isMobileViewAllowed` to block rendering. They appear to be legacy annotations from the removed feature. Public routes (`PublicModule`) do not carry this flag. There is no code enforcing a mobile block on public pages.

### Assessment
Google's mobile-first crawler will now see the same content as desktop users on all public pages. The viewport meta tag is correctly set: `<meta name="viewport" content="width=device-width, initial-scale=1">`.

**Mobile-first indexing readiness: Ready for public pages.**

---

## 3. Public Job Pages — Crawlability

### Route protection
- `/jobs/details/:id` is in `PublicModule` with no `canActivate` guard. No authentication required.
- The BE endpoint `GET /api/job/details` uses `optionalVerifyAuth` (SEC-02 fix): serves job data to anonymous users without requiring a token.
- `PublicDetailsComponent` fetches job data via `JobFacade.getJobById()` on `ngOnInit` — no login check before fetch.

### Page title
- `PublicDetailsComponent` calls `seoService.setPageMeta({ title: '${jobTitle} at ${companyName} | GetHired Online', ... })` once job data arrives.
- `JobPostsDetailsComponent` (used inside the authenticated panel) calls `titleService.setTitle()` + `structuredData.apply()` independently.

### Meta tags per job page
- `description`: set dynamically from job title + company name
- `robots`: `index, follow` for active jobs (jobStatusId=2); `noindex, nofollow` for non-active jobs
- `canonical`: `https://gethiredonline.app/jobs/details/{jobId}`
- `og:title`, `og:description`, `og:type: article`: set via `SeoService.setPageMeta()`
- `og:image`: falls back to logo (see OG section below)

### Crawlability caveat — Angular Universal SSR
`server.ts` exists and is wired with `@nguniversal/express-engine`. `AppServerModule` is configured. However, whether SSR is actually being served in production (vs. the Angular build serving client-side SPA from static files) cannot be verified from local files alone. If the production server is only serving the static `index.html` (client-side rendering), Googlebot may not see dynamic meta tags or JSON-LD on the initial response. This is the most significant unresolved SEO risk.

---

## 4. Sitemap

- `GET /sitemap.xml` endpoint exists in `server.js` (lines 168–231)
- Queries `jobs WHERE job_status_id = 2 ORDER BY updated_at DESC`
- Includes 4 static pages: `/home`, `/jobs`, `/job-seekers`, `/employers`
- Each job URL: `https://gethiredonline.app/jobs/details/{job_id}` with `changefreq: weekly`, `priority: 0.8`
- In-memory cache TTL: 15 minutes
- 503 fallback on error with `Retry-After: 3600` (correct behavior)
- `robots.txt` at `src/robots.txt` references `Sitemap: https://gethiredonline.app/sitemap.xml`
- XML-escaping applied to job_id values (STITCH-V2 fix)

**Sitemap: implemented and correct.**

---

## 5. robots.txt

File: `src/robots.txt` (served as a static asset from the FE build)

```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /recruiter/
Disallow: /user/
Disallow: /owner/
Disallow: /investor/
Disallow: /api/
Disallow: /payment/
Disallow: /subscription/
Disallow: /signin
Disallow: /signup
Disallow: /reset-password
Disallow: /change-password
Disallow: /verify
Disallow: /jobs/search/

Sitemap: https://gethiredonline.app/sitemap.xml
```

All authenticated panel routes are correctly disallowed. Search result pages are disallowed to prevent duplicate-content crawl. Sitemap URL is declared.

**Note:** The sitemap is served from the BE (`/sitemap.xml` route on the Express server). If nginx proxies `/sitemap.xml` to the BE, this works. If nginx serves the FE static files and does not proxy `/sitemap.xml`, Googlebot will 404 on the sitemap URL. This cannot be verified from local files.

---

## 6. Structured Data — JobPosting Schema

Two implementations exist:

### Implementation A: `SeoService.setJobPostingJsonLd()` (primary, used in public flow)
Called from `PublicDetailsComponent` only when `job.jobStatusId === 2`.

Fields populated:
- `@type: JobPosting`
- `title` (jobTitle)
- `description` (jobDescription, HTML-stripped)
- `datePosted` (createdAt → ISO 8601)
- `validThrough` (expirationDate, if present)
- `hiringOrganization` (name, logo if companyLogoUrl present)
- `jobLocation` (city, country=PH hardcoded)
- `url` (`https://gethiredonline.app/jobs/details/{jobId}`)
- `directApply: true`
- `identifier` (PropertyValue with jobId)
- `employmentType` (mapped from jobTypeName: FULL_TIME, PART_TIME, INTERN, CONTRACTOR, TEMPORARY, VOLUNTEER, OTHER)
- `baseSalary` (when salaryMinimum AND salaryMaximum AND salaryCurrency are all present; unitText mapped from job.rate field)

Fields correctly omitted (not available in data model or conditionally absent): view count, review count, applicationCount.

### Implementation B: `JobStructuredDataService.apply()` (secondary, used in authenticated job detail panel)
Called from `JobPostsDetailsComponent` (the logged-in-user view). Produces similar JSON-LD but with a slightly different field mapping (uses `NormalizedJob` model). Not used on public-facing pages.

### Additional structured data (homepage)
- `Organization` JSON-LD: set in `MainPortalComponent`
- `WebSite` JSON-LD with `SearchAction`: set in `MainPortalComponent`
- `BreadcrumbList`: set in `PublicDetailsComponent` and `PublicListComponent`

**Structured data: implemented comprehensively for public job detail pages.**

---

## 7. OG Image Gap

### Current state
- `src/index.html` `og:image` and `twitter:image`: `https://gethiredonline.app/assets/images/logo.png`
- `SeoService` `DEFAULT_OG_IMAGE` constant: `https://gethiredonline.app/assets/images/logo.png`
- The `index.html` comment documents this explicitly: "replace the og:image URL below with a 1200x630px branded OG image once assets/brand/gethired-og-default.png is created"
- Confirmed: `src/assets/brand/gethired-og-default.png` does not exist. The `gethired-wow/` directory contains only SVGs.
- `assets/images/logo.png` exists.

### Impact
- Facebook/LinkedIn/Twitter link previews use the logo as the preview image instead of a purpose-built social card
- `summary_large_image` Twitter card type is set but the logo is likely too small/wrong aspect ratio for a proper large-image card — most platforms will downgrade to `summary` or show a cropped/poorly-fitted preview
- Google Search does not use OG images for search results (uses page content), so this does not affect organic rankings
- Affects social sharing clicks and brand impression, not crawlability

---

## Top Findings

1. **SSR deployment uncertainty (highest risk):** `server.ts` exists and Angular Universal is configured, but whether production actually runs SSR (Node server) or serves static SPA files is unverifiable from local files. If client-side only, dynamic title/meta/JSON-LD are invisible to crawlers on first response. Recommend verifying by curling the live job detail URL with `curl -A Googlebot https://gethiredonline.app/jobs/details/{id}` and checking if the title/JSON-LD appear in the raw HTML response.

2. **OG image missing (medium priority):** A proper 1200×630 branded OG image is needed at `src/assets/brand/gethired-og-default.png` (and referenced in `index.html` + `SeoService.DEFAULT_OG_IMAGE`). Current fallback is the logo, which produces poor social share card quality.

3. **`isMobileViewAllowed` data flags are unused dead code (low priority):** The `isMobileViewAllowed: false` route data annotations in `app.routing.module.ts` are remnants of the removed mobile block. No guard reads them. They have no functional or SEO effect but should be cleaned up to avoid confusion.
