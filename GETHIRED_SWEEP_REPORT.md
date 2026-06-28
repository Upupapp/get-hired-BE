# GETHIRED SWEEP REPORT — SEO V3 RECENT DEPLOYMENT (QA Cycle 12)

**Generated:** 2026-06-25
**Scope:** Targeted SWEEP — SEO V3 deployment (FE bf5bd08, BE 26ca25a). Recent-deployment mode; focuses on the 16 FE files + 1 BE file changed.
**BE HEAD:** 26ca25a
**FE HEAD:** bf5bd08

---

## RECENT DEPLOYMENT SECTION — SEO V3

### Summary

The SEO V3 deployment is fundamentally sound. The SeoService architecture is clean, the JSON-LD structured data is well-designed, and the component integrations are correct in all 10 components. No new security vulnerabilities were introduced. However, **four concrete issues require action**, ranging from a missing asset that will cause broken OG images on every share to SSR crashes on public pages caused by unguarded `window.innerWidth` reads.

---

### Finding 1 — CRITICAL: DEFAULT OG IMAGE ASSET DOES NOT EXIST

**File:** `src/app/core/services/seo.service.ts:34`
**Issue:** `DEFAULT_OG_IMAGE` is hardcoded to `https://gethiredonline.app/assets/brand/gethired-og-default.png`. This file does not exist in the repo. `src/assets/brand/` contains only SVG files in a `gethired-wow/` subfolder. There is no PNG at `src/assets/brand/gethired-og-default.png` and no such file anywhere under `src/assets/`.

**Impact:** Every page that calls `setPageMeta()` without supplying a custom `ogImage` (all 10 components except job detail) will emit `og:image` and `twitter:image` pointing to a 404 URL. Facebook/Twitter/LinkedIn card previews will show no image, and Google may flag the broken reference. This is the single most user-visible SEO V3 defect.

**Fix:** Create a 1200x630px PNG at `src/assets/brand/gethired-og-default.png` (add to `angular.json` assets array — `src/assets` is already there, so any file under it is included automatically). The file already exists in `src/assets/images/logo.png`; a temporary workaround is to change `DEFAULT_OG_IMAGE` to point at `${BASE_URL}/assets/images/logo.png` until a proper card image is produced.

---

### Finding 2 — HIGH: SSR CRASH ON MULTIPLE PUBLIC COMPONENTS (window.innerWidth unguarded)

**Files:**
- `src/app/public/public-list/public-list.component.ts:27` — `this.screenSize = window.innerWidth;` in `ngOnInit`
- `src/app/public/public-search/public-search.component.ts:47` — same in `ngOnInit`; also line 19: `JSON.parse(localStorage.getItem('userData'))` in a class field initializer
- `src/app/public/public-details/public-details.component.ts:71` — `window.innerWidth` in `@HostListener` handler (this one is safe in SSR; HostListeners aren't registered server-side, but it means screenSize stays 1600)

**Issue:** `window` does not exist on the server. Under Angular Universal, `ngOnInit` runs server-side. `window.innerWidth` on line 27 of `public-list.component.ts` and line 47 of `public-search.component.ts` will throw a `ReferenceError: window is not defined` and crash the SSR render. Similarly, `public-search.component.ts:19,24` access `localStorage` and `sessionStorage` in class field initializers — these execute before `isPlatformBrowser` checks can be applied.

**Impact:** If SSR is active, crawlers receiving server-rendered HTML will get error pages for `/jobs` and `/jobs/search/*` — exactly the pages most critical to the SEO V3 investment. The SeoService itself correctly guards all `document.*` access, making the unguarded `window` in these components a jarring inconsistency.

**Fix:** Wrap `window.innerWidth` reads with `if (isPlatformBrowser(this.platformId))` (inject `PLATFORM_ID`), or use `@Inject(PLATFORM_ID)` + `isPlatformBrowser`. For the `localStorage`/`sessionStorage` field initializers in `public-search.component.ts`, move the reads into `ngOnInit` inside a browser guard.

**Note:** These `window.*` bugs pre-exist SEO V3 but become newly relevant because SEO V3 makes SSR meaningful for the first time — these pages now have rich metadata that Google should render server-side.

---

### Finding 3 — HIGH: SITEMAP.XML HAS NO XML ENTITY ESCAPING (potential malformed XML)

**File:** `get-hired-BE/server.js:173`

```js
return `  <url>\n    <loc>${BASE_URL}/jobs/details/${row.job_id}</loc>\n ...`;
```

**Issue:** `row.job_id` is interpolated directly into the XML `<loc>` element. If any `job_id` in the database contains `&`, `<`, `>`, `"`, or `'` (e.g. if the column type is varchar rather than integer and data was imported), the resulting XML would be malformed and Google Search Console would reject the sitemap.

**Additional concern:** `static_pages` hardcode `now` as `lastmod` for every crawl. This means the sitemap will report the homepage, /jobs, /job-seekers, and /employers as modified every hour (matching Cache-Control max-age=3600). Google may deprioritize these lastmod values as unreliable.

**Fix for job_id:** Confirm `job_id` is a UUID or integer column (both are safe). If VARCHAR, add a helper to escape `&` → `&amp;`, `<` → `&lt;`. A quick check of `jobsController.js:75` shows `job_id` is inserted as a UUID (`job_id uuid PRIMARY KEY` per existing controller code), so this risk is very low but worth noting.

**Fix for lastmod:** Use a static date string for pages that don't change (e.g. the build date or a config constant), not `now`. Or omit `lastmod` for static pages entirely — absence is preferable to an unreliable timestamp.

---

### Finding 4 — MEDIUM: DUPLICATE TITLE SETTER IN THREE COMPONENTS (constructor + ngOnInit race)

**Files:**
- `src/app/public/main-portal/main-portal.component.ts:77` — sets title in `constructor` via direct `titleService.setTitle()`; then `ngOnInit` calls `seoService.setPageMeta()` which sets a different title again
- `src/app/public/job-seeker-portal/job-seeker-portal.component.ts:83` — same pattern
- `src/app/public/employer-portal/employer-portal.component.ts:87` — same pattern

**Issue:** The constructor calls `this.titleService.setTitle('GetHired Online | Jobs and Hiring Platform')` with a legacy title, then `ngOnInit` immediately overwrites it via `seoService.setPageMeta()` with the SEO-correct title. The constructor call is therefore dead code. This creates two `<title>` mutations per navigation, which is harmless in browsers but can cause the wrong title to appear momentarily in SSR if the constructor runs first.

**Fix:** Remove the `titleService` injection and `this.titleService.setTitle()` calls from all three constructors. The `SeoService.setPageMeta()` call in `ngOnInit` does the right thing already. Also remove the `Title` import from those three component files.

---

### Finding 5 — MEDIUM: CANONICAL URL SKIPPED IN SSR (every server-render omits canonical)

**File:** `src/app/core/services/seo.service.ts:127-140`

```typescript
setCanonical(url: string): void {
  if (!this.isBrowser) {
    // SSR: cannot use document directly ... skip in server context.
    return;
  }
  ...
}
```

**Issue:** The comment acknowledges the limitation but does not solve it. Angular Universal can inject canonical `<link>` tags server-side using the `Meta` service (not `document.querySelector`). The current implementation means that every SSR-rendered page will have `og:url` correctly set (via `Meta.updateTag`) but will have no canonical `<link rel="canonical">` in the initial HTML. Googlebot may therefore see duplicate-canonical signals.

**Fix:** Use `this.meta.updateTag` or Angular's `Dom​Adapter` to write the canonical link on the server, or use `@angular/platform-browser`'s `Meta` for link tags (Angular 13 does not support `Meta.addTag` for `link` elements natively, but the `document.head.appendChild` pattern works fine on the server via `@nguniversal/express-engine`'s DOM shim — test whether the guard is truly needed or just overly conservative).

---

### Finding 6 — LOW: ORGANIZATION JSON-LD HAS EMPTY sameAs ARRAY

**File:** `src/app/core/services/seo.service.ts:282`

```typescript
sameAs: [],
```

**Issue:** An empty `sameAs` array is valid per Schema.org but adds noise. If GetHired has any social profiles (LinkedIn, Facebook, etc.), this is the right place to add them. If not, omitting the property entirely is cleaner than `sameAs: []`.

---

### Finding 7 — LOW: ROBOTS.TXT MISSING /employers AND /job-seekers ALLOW DECLARATIONS (not blocking, but incomplete)

**File:** `src/robots.txt`

The file correctly blocks all authenticated routes and includes the sitemap pointer. However:
- `/employers` and `/job-seekers` are public marketing pages with SEO value but are not explicitly listed as allowed (they ARE allowed by the blanket `Allow: /` — this is not a bug)
- Missing explicit `Disallow: /jobs/search/` — the search results pages receive `noindex` from SeoService but they are not blocked from crawling in robots.txt. Crawlers will spend crawl budget fetching pages that will be noindexed anyway
- Missing `Disallow: /companies/` — company detail pages are public-indexable but there's no sub-path restriction for internal admin company views

**Recommendation (not a fix, just an improvement):** Add `Disallow: /jobs/search/` to conserve crawl budget. The noindex directive handles deduplication, but robots.txt disallow is cleaner.

---

### Finding 8 — LOW: PUBLIC-SEARCH COMPONENT HAS UNGUARDED localStorage/sessionStorage IN CLASS FIELD INITIALIZERS

**File:** `src/app/public/public-search/public-search.component.ts:19,24`

```typescript
public loggedUserData: any = JSON.parse(localStorage.getItem('userData'));
public jobSearch = JSON.parse(sessionStorage.getItem('job-search'));
```

These execute at class instantiation time, before any Angular lifecycle hook where a browser guard could be applied. On the server, both will throw. This overlaps with Finding 2 but is a distinct mechanism (field initializer vs. lifecycle method).

---

### SSR Safety Audit of SeoService

| Method | Document access guarded? | Works server-side? |
|---|---|---|
| `setPageMeta()` | N/A — uses `Title` + `Meta` services | YES — both are SSR-safe |
| `setCanonical()` | YES — early `return` if not browser | YES — but canonical is skipped (Finding 5) |
| `setRobots()` | N/A — `Meta.updateTag` | YES |
| `setJsonLd()` | YES — early `return` if not browser | Skipped on server — JSON-LD not in SSR HTML |
| `clearJsonLd()` | YES | Safe no-op |
| `setOpenGraph()` | N/A — `Meta.updateTag` | YES |
| `setBreadcrumbJsonLd()` | Inherited from `setJsonLd` | Skipped on server |
| `setJobPostingJsonLd()` | Inherited from `setJsonLd` | Skipped on server |
| `setOrganizationJsonLd()` | Inherited from `setJsonLd` | Skipped on server |
| `setWebsiteJsonLd()` | Inherited from `setJsonLd` | Skipped on server |
| `stripHtml()` | YES — regex fallback on server | YES |

**SSR verdict for SeoService itself:** Correctly implemented. All `document.*` calls are properly guarded. The limitation is that JSON-LD blocks are entirely absent from SSR-rendered HTML (because they use `document.createElement`). This is a known constraint with the current approach. Google can execute client-side JS to pick up JSON-LD, so this is acceptable for now, but not ideal.

---

### Component Integration Audit (all 10)

| Component | Route | Meta set? | JSON-LD? | Canonical? | ngOnDestroy cleanup? |
|---|---|---|---|---|---|
| MainPortalComponent | /home | YES | Org + Website | YES | Not needed (singleton JSON-LD, resetToDefaults not called — minor gap) |
| PublicListComponent | /jobs | YES | Breadcrumb | YES | YES — clearBreadcrumbJsonLd() |
| PublicDetailsComponent | /jobs/details/:id | YES (async, after data loads) | JobPosting (active only) + Breadcrumb | YES | YES — full cleanup |
| PublicSearchComponent | /jobs/search/* | YES | none (correct) | YES — points to /jobs | NO — does not implement ngOnDestroy; noindex page so low impact |
| JobSeekerPortalComponent | /job-seekers | YES | none | YES | Not needed |
| EmployerPortalComponent | /employers | YES | none | YES | Not needed |
| PublicCompanyDetailsComponent | /companies/details | YES (async) | Breadcrumb | YES | Partial — clears link$ but NOT breadcrumb JSON-LD |
| SigninComponent | /signin | YES | none (correct) | NO — noindex, canonical skipped | Not needed |
| ErrorNotFoundComponent | /404 | YES | none (correct) | NO — noindex, canonical skipped | Not needed |

**Gap 1:** `PublicCompanyDetailsComponent.ngOnDestroy()` unsubscribes `link$` but does not call `this.seoService.clearBreadcrumbJsonLd()`. Navigating away from a company detail page leaves the breadcrumb JSON-LD in `<head>` until another page's setBreadcrumb overwrites it.

**Gap 2:** `PublicSearchComponent` does not implement `ngOnDestroy` — minor since it's a noindex page and sets no JSON-LD, but if users navigate directly from search to another page the meta title/description could be stale in `<head>` briefly.

**Gap 3:** `MainPortalComponent` calls `setOrganizationJsonLd()` and `setWebsiteJsonLd()` but never clears them when navigating away. These JSON-LD blocks (`gh-jsonld-org`, `gh-jsonld-website`) persist in `<head>` on every subsequent page. This is actually correct behavior for site-wide schemas (they should persist), but worth documenting: `resetToDefaults()` clears only JobPosting and Breadcrumb, so Org and Website schemas are intentionally persistent.

---

### Sitemap Endpoint Audit (BE server.js)

| Check | Status |
|---|---|
| No authentication required | PASS |
| Only published jobs (job_status_id=2) | PASS |
| Content-Type: application/xml | PASS |
| Cache-Control: public, max-age=3600 | PASS |
| Graceful empty urlset on DB error | PASS |
| Static pages included | PASS — 4 pages (/home, /jobs, /job-seekers, /employers) |
| Schema parameterized via `envConfig.schema` | PASS — uses config, not hardcoded |
| SQL injection risk | LOW — `schema` comes from env config, not user input; `job_id` is UUID |
| XML entity escaping of job_id | LOW RISK — UUID format is safe; see Finding 3 |
| lastmod accuracy for static pages | WEAK — uses `now` on every request (Finding 3) |
| Rate limiting applied | YES — falls under `globalLimiter` (500 req/15min, GET-only so writeLimiter is skipped) |
| Sitemap pointer in robots.txt | PASS — `Sitemap: https://gethiredonline.app/sitemap.xml` |

**Missing from sitemap:** Company profile pages (`/companies/details?id=X`) are not included. These are public, indexable, and have SEO value. This is an omission, not a bug — company IDs would need a separate query.

---

### Skeleton Loading System (styles.scss) Regression Check

The skeleton CSS added at lines 270-345 of `styles.scss` is:
- Self-contained — uses `.gh-skeleton`, `.gh-skeleton-card`, and child classes
- Does not modify any existing class names
- `prefers-reduced-motion` guard is correctly applied (disables animation entirely, falls back to flat color)
- Job card hover lift (`.gh-job-card-hover`) also respects reduced-motion
- No `!important` overrides that could affect existing components

**Verdict:** No regressions introduced. The classes are additive only. Components must opt in by adding `.gh-skeleton-card` to their templates — nothing applies skeleton styles globally.

**Gap:** No component templates were found applying `.gh-skeleton-card` in this scan (the classes exist but no templates were observed using them). The skeleton CSS may be defined but not yet wired up to any loading state. This is a completeness gap, not a regression.

---

### robots.txt Audit

| Directive | Correct? | Notes |
|---|---|---|
| `User-agent: *` | YES | |
| `Allow: /` | YES | Correct default |
| `Disallow: /admin/` + `/admin` | YES | Both slash and no-slash variants covered |
| `Disallow: /recruiter/` + `/recruiter` | YES | |
| `Disallow: /user/` + `/user` | YES | |
| `Disallow: /owner/` + `/owner` | YES | |
| `Disallow: /investor/` + `/investor` | YES | |
| `Disallow: /api/` | YES | |
| `Disallow: /payment/` + `/payment` | YES | |
| `Disallow: /subscription/` + `/subscription` | YES | |
| `Disallow: /signin` | YES | |
| `Disallow: /signup` | YES | |
| `Disallow: /reset-password` | YES | |
| `Disallow: /change-password` | YES | |
| `Disallow: /verify` | YES | |
| `Sitemap:` pointer | YES | Correct URL |
| Missing: `/jobs/search/` | GAP | Crawlable but noindex — wastes crawl budget |
| Missing: `/jobs/search` | GAP | Same as above |

---

## §1 Product System Map (updated for SEO V3)

*(Unchanged from QA Cycle 11 — see below)*

---

# GETHIRED SWEEP REPORT — QA Cycle 11

**Generated:** 2026-06-25  
**Scope:** Full 24-phase SWEEP with focus on QA11 deployment: rate-limiting, Interview Hub, Messages name enrichment  
**BE HEAD:** af3d67e  
**FE HEAD:** fed4bf8

---

## Executive Summary

The QA11 deployment ships three meaningful improvements: (1) four-tier rate-limiting that closes the repo-wide gap confirmed in previous SWEEPs, (2) a real Interview Hub replacing the stub at `/recruiter/interview`, and (3) applicant name+photo enrichment in the recruiter messages inbox. The architecture is sound and all three items are properly guarded at the route/JWT level.

**One CRITICAL silent bug is present:** both new name-JOIN queries (`listRecruiterThreads` in `message.service.js` and `getInterviewHub` in `interviewController.js`) use `u.first_name`/`u.last_name` column names. The actual `gethired.users` table schema defines these columns as `firstname`/`lastname` (without underscore). Every other service in the repo uses `u.firstname`/`u.lastname`. This means both queries silently return NULL for all applicant names — the name enrichment feature does not function. The fallback path kicks in (email or `Candidate <uid-suffix>`) so nothing crashes, but the shipped feature produces no visible benefit. This requires a two-line SQL fix in both files.

Security posture overall is the strongest it has been across all 11 QA cycles. The BOLA hardening from QA9/QA10 holds. Rate-limiting is correct. The FE deploy workflow requires two manual secrets before auto-deploy activates (known, tracked). No new auth bypasses introduced.

---

## §1 Product System Map

**Platform:** GetHired — job platform connecting recruiters/employers with job seekers/applicants.

**Core flows:**
- Public: Browse published jobs, view company pages, apply without login
- Applicant: Sign up → build profile → apply to jobs → record video answers → track applications
- Employer/Recruiter: Sign up → create company → post jobs → review applicants → message candidates → run interviews → manage subscriptions
- Admin: User profile lookup (thin; `GET /api/admin/userprofile` only)

**Repos:**
- `get-hired-BE`: Node.js/Express with Babel transpilation, Firebase Auth, PostgreSQL (`gethired` schema)
- `get-hired-FE`: Angular 13, NgRx state, Firebase Auth, deployed to Linode via GitHub Actions (2 manual secrets pending)

**Schema:** `gethired` (live production schema); `jobhunt` schema exists in `complete_ddl.sql` as legacy migration reference only.

---

## §2 Frontend Route Map

| Route | Component | Guard |
|---|---|---|
| `/` | → `/home` redirect | none |
| `/home` | JobPostsComponent (public portal) | none |
| `/home/details/:id` | JobPostDetailsComponent | none |
| `/home/apply/:id` | JobPostDetailsApplyComponent | none |
| `/home/company/:name` | CompanyDetailsComponent | none |
| `/home/:keyword[/:work_setup[/:job_type]]` | JobPostSearchListComponent | none |
| `/signin` | (AuthModule) | UnauthGuard |
| `/signup` | (AuthModule) | UnauthGuard |
| `/admin/**` | AdminPanelModule | AuthGuard (role=1) |
| `/recruiter/**` | EmployerPanelModule | AuthGuard (role=2) |
| `/recruiter/dashboard` | EmployerDashboardComponent | EmployerGuard |
| `/recruiter/jobs/**` | EmployerJobsModule | EmployerGuard |
| `/recruiter/company/**` | EmployerSettingsModule | EmployerGuard |
| `/recruiter/contacts/**` | EmployerContactsModule | EmployerGuard |
| `/recruiter/interview` | RecruiterInterviewHubComponent (B03, new) | EmployerGuard |
| `/recruiter/messages` | RecruiterMessagesComponent (B01) | EmployerGuard |
| `/recruiter/subscription/**` | EmployerSubscriptionModule | EmployerGuard |
| `/user/**` | ApplicantPanelModule | AuthGuard (role=3) |
| `**` | ErrorPageModule | none |

**Note:** The `**` wildcard is wired at root level but role-based guards call `router.resetConfig()` at login and do not include a wildcard — post-login 404s may not reach the error page. Flagged in prior reports; not changed in QA11.

---

## §3 Backend API Map

### Authentication (`/api/auth`)
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signin` | none | + authLimiter + sensitiveLimiter (via changepassword path separation) |
| POST | `/api/auth/signup` | none | + authLimiter |
| POST | `/api/auth/resendverificationlink` | none | |
| POST | `/api/auth/getverificationlink` | none | |
| POST | `/api/auth/manualexcelverification` | none | |
| POST | `/api/auth/logout` | none | |
| POST | `/api/auth/verifyemail` | none | |
| GET | `/api/auth/getpwresetlink` | none | + sensitiveLimiter |
| POST | `/api/auth/changepassword` | none | + sensitiveLimiter |
| GET | `/api/auth/getprofile` | verifyAuth | |
| PUT | `/api/auth/updateprofile` | verifyAuth | |
| PUT | `/api/auth/archive` | verifyAuth | + sensitiveLimiter |

**Observation:** `changePw` and `getpwresetlink` are unguarded by `verifyAuth` (by design — reset flows before login). `sensitiveLimiter` (10/hr) provides the only rate defense.

### Applications & Applicants (`/api/application`, `/api/applicant`)
All routes: verifyAuth.  
`/api/application/create`, `updateJobs`, `delete`, `apply`, snapshots, profile CRUD, workexp, educbg, cert, skills, docs, savevideocv, dashboard, completeness, batch snapshots.

### Jobs (`/api/job`)
| Visibility | Routes |
|---|---|
| Public (no auth) | `GET /job/published`, `GET /job/details`, `GET /job/sharelink` |
| Protected | `POST /job/create`, `PUT /job/updatejobs`, all GET lists, `/job/applicants`, `/job/applicants/signals`, `/job/changestatus`, `/job/deleteinterviewquestion`, `/job/getsubscriptionrestrictions` |

### Interviews (`/api/interview`)
All verifyAuth-protected.  
`GET /interview/getlistbyuser`, `GET /interview/getall`, `GET /interview/getalltemplates`, `GET /interview/getallrecipients`, `GET /interview/gettemplatequestions`, `POST /interview/savegroupinterview`, `POST /interview/savequestiontemplate`, `PUT /interview/updatejobinterview`  
**NEW (QA11):** `GET /interview/hub` — company-scoped applicant activity feed, JWT company scope, LIMIT 200.

### Messages (`/api/messages`)
All verifyAuth-protected.  
`POST /messages/thread`, `GET /messages/thread/messages`, `POST /messages/thread/send`  
**QA11 enriched:** `GET /messages/recruiter/threads` — now JOINs users for name+photo.

### Other
`/api/candidates/*`, `/api/contacts/*`, `/api/groups/*`, `/api/employer/*`, `/api/admin/*`, `/api/cv*`, `/api/cvbuilder/*`, `/api/companies/*`, `/api/subscriptions/*`, `/api/payment/*`, `/api/options/*` — all verifyAuth-protected.

---

## §4 FE-to-BE Contract Map

### RecruiterThreadSummary (QA11 enrichment)

| Field | Source | Notes |
|---|---|---|
| `threadId` | `mt.id` | thread PK |
| `applicantUid` | `mt.applicant_uid` | for deep-link context |
| `applicantName` | `u.first_name + u.last_name` joined from `gethired.users` | **BUG: columns are `firstname`/`lastname` — always NULL** |
| `applicantPhotoUrl` | `u.photo_url` | joined same query — correct column name, will work IF query doesn't fail |
| `jobId` | `mt.job_id` | |
| `jobTitle` | `j.job_title` | from `jobs` JOIN |
| `lastMessageSnippet` | `last_msg.body` | LATERAL subquery, sliced to 120 chars |
| `lastSenderRole` | `last_msg.sender_role` | `'employer'` or `'applicant'` |
| `lastMessageAt` | `mt.updated_at` | |
| `needsReply` | `lastSenderRole === 'applicant'` | computed in JS |

**FE interface:** Correctly declares `applicantName: string | null` and `applicantPhotoUrl: string | null`. Fallback in `applicantLabel()` handles null gracefully — no crash, but the feature doesn't deliver.

### InterviewHubItem (new)

| Field | Source | Notes |
|---|---|---|
| `applicationId` | `ja.job_application_id` | |
| `applicantId` | `ja.candidate_id` | |
| `applicantName` | `u.first_name + u.last_name` | **BUG: same column mismatch — always NULL** |
| `applicantEmail` | `u.email` | fallback display |
| `applicantPhotoUrl` | `u.photo_url` | correct column |
| `applicationStatusId` | `ja.application_status_id` | |
| `applicationStatus` | `s.job_applicant_status_name` | from `job_applicant_status` join |
| `dateApplied` | `ja.date_applied` | |
| `lastActivity` | `ja.updated_at` | |
| `jobId` | `j.job_id` | |
| `jobTitle` | `j.job_title` | |
| `videoAnswerCount` | `COUNT(ia.*)` via lateral subquery | COALESCE to 0 |
| `hasVideoAnswers` | `videoAnswerCount > 0` | |
| `total` | `items.length` | JSON envelope |

**FE service:** Uses `HttpClient.get` directly (not BaseService). No auth header injection concern — `BaseService` has an `http` interceptor; the hub service uses raw `HttpClient` which may miss the auth interceptor. **Risk: if `BaseService` adds the Authorization header via interceptor and `HttpClient` alone doesn't, `/interview/hub` calls may hit 403 on production.** Verify interceptor scope.

---

## §5 Database/Data Model Map

**Active schema:** `gethired`

### Core tables

| Table | Key Columns | Notes |
|---|---|---|
| `users` | `uid, firstname, lastname, photo_url, email` | `firstname`/`lastname` (no underscore) — source of QA11 bug |
| `user_credentials` | `uid, email, password, role, is_archive` | role FK to `access_roles` |
| `access_roles` | `id, role_name` | 0=super_admin, 1=admin, 2=employer, 3=candidate |
| `companies` | `company_id, company_name, company_logo, created_by` | |
| `company_employees` | `employee_id, company_id, employee_uuid` | employer-company link; `getUserCompany()` pivots on this |
| `jobs` | `job_id, job_title, company_id, job_status_id, expiration_date` | |
| `job_applicants` | `job_application_id, job_id, candidate_id, application_status_id, is_archived` | |
| `job_applicant_status` | `1=Pending, 2=Applied, 3=Under Review, 4=Shortlisted, 5=Rejected, 6=Hired` | seeded in applicant_application_ddl.sql |
| `applicants_profile` | `applicant_profile_id, user_id, job_title, video_cv_url` | |
| `interview_answers` | `interview_answer_id, applicant_id (FK→applicants_profile), job_id, question_id, answer_url` | |
| `job_interview_template` | `job_interview_template_id, company_id, job_id` | has `company_id` in service.js but DDL in `job_ddl.sql` does NOT define `company_id`; service queries it — **potential schema gap** |
| `interview_template_question` | FK→`job_interview_template` | |
| `message_threads` | `id, job_id, company_id, applicant_uid` | UNIQUE(job_id, applicant_uid) |
| `messages` | `id, thread_id, sender_uid, sender_role, body` | CHECK sender_role IN ('employer','applicant'); no `is_read` |
| `application_snapshots` | `application_id, applicant_profile_snapshot, job_snapshot, etc.` | jsonb persistence |
| `application_completeness_snapshots` | completeness_score, missing_required/recommended | |
| `match_snapshots` | match_score, factor_scores | |

**Confirmed gaps:**
- `job_interview_template` DDL in `job_ddl.sql` has no `company_id` column; `interview.service.js` queries `company_id` from it. Either the column was added via migration not in the DDL files, or there's a live schema gap.
- No `is_read` column in `messages` or `message_threads`. Unread state is not trackable.

---

## §6 Public Job Portal Current State

**Routes:** `/home`, `/home/details/:id`, `/home/apply/:id`, `/home/company/:name`, `/home/:keyword/*`  
**Backend:** `GET /api/job/published`, `GET /api/job/details`, `GET /api/job/sharelink` (all public, no auth)  
**Status:** Functional. Public routes are correctly unauthenticated. Published jobs query returns live data. Search/filter routes exist.

**Known limitations:**
- No server-side pagination on `/api/job/published` — full table scan on every load. SEO impact TBD.
- Structured data service exists (`job-structured-data.service.ts`) but was added during BRAND pass; verify it emits valid JSON-LD in production.
- No meta/OG tags managed dynamically per job listing (confirmed in prior SWEEP).

**Rating:** Ready with caution — functional but no pagination = scale risk.

---

## §7 Applicant Experience Current State

**Core flows:** Signup → profile build → apply → video answers → application tracking → dashboard → messaging  
**Auth:** Firebase ID token via verifyAuth middleware  
**Profile:** `POST /applicant/createprofile`, `PUT /applicant/updateprofile`, completeness scoring  
**Applications:** `POST /application/apply` (primary submit), BOLA guards fixed in QA9/QA10  
**Video CV:** `PUT /applicant/savevideocv` with ownership check (QA10 fix active)  
**Documents:** File upload with magic-byte MIME verification (QA9 fix; video excluded by design)  
**Snapshots:** Batch completeness + match snapshots at submit time

**Remaining gaps:**
- Applicant messaging: `POST /messages/thread` + `GET /messages/thread/messages` + `POST /messages/thread/send` are wired; applicant-facing FE component for messaging exists (`app-message-thread`) and is reused in the recruiter detail pane. Full applicant-initiated flow exists.
- No in-app notification for messages received (no polling on applicant side visible).
- File upload: video MIME spoofing not covered (noted as deliberate deferral).

**Rating:** Ready with caution — core flow solid, messaging and notifications still limited.

---

## §8 Recruiter/Employer Current State

### Interview Hub (B03 — new QA11)
- Route: `/recruiter/interview` → `RecruiterInterviewHubComponent`
- Data: `GET /api/interview/hub` — company-scoped via JWT, LIMIT 200
- Filters: All applicants / Video answers / Under review (applicationStatusId===3)
- BOLA: Correct — `getUserCompany(req.user.uid)` derives company; no caller-supplied ID
- **FE service bug:** Uses raw `HttpClient`, not `BaseService`. If auth is injected via an Angular HTTP interceptor attached only to `BaseService`'s http client, hub calls may send no auth token → 403 on prod.
- UI: Loading skeleton, error state, empty state, card list, filter chips — complete.
- "View applicants" and "Review responses" links both route to `/recruiter/contacts/candidate-list/:jobId` (same route for both) — functionally correct but "Review responses" label implies a video-specific view that doesn't exist yet.

### Messages Inbox (B01 — QA11 enrichment)
- Route: `/recruiter/messages` → `RecruiterMessagesComponent`
- **Name enrichment BUG:** `listRecruiterThreads()` queries `u.first_name`/`u.last_name` from `gethired.users`; actual columns are `firstname`/`lastname`. All `applicantName` values will be NULL. Fallback shows email address or `Candidate <uid>`.
- Avatar: Photo renders if `applicantPhotoUrl` is non-null; falls back to initial letter. Photo URL column (`u.photo_url`) name is correct so photos may render if set.
- Two-pane layout (desktop) / list-first mobile: correct.
- Filter chips: All / Needs reply. Correct.
- needsReply signal: derived from `lastSenderRole === 'applicant'` — correct.

### Mobile Sidebar/Drawer (B02)
- Hamburger button with animated SVG, scrim overlay, slide-in drawer, Escape key handler, focus management — all present.
- Bottom nav: 5 items (Dashboard, Jobs, Candidates, Messages, Company) + billing bar.
- `aria-controls`, `aria-expanded`, `aria-current`, focus trap to first drawer link on open, focus return on close — all implemented.

### Dashboard / Jobs / Contacts
- Existing functionality from prior cycles; no regression observed in QA11 files.

---

## §9 Admin Current State

**Single endpoint:** `GET /api/admin/userprofile` (verifyAuth, no role enforcement in the route — admin check is in AuthGuard at route level via role=1 data).  
**UI:** AdminPanelModule (lazy loaded).  
**Status:** Minimal. No admin CRUD, no user management endpoints beyond profile lookup. Unchanged from prior cycles.

---

## §10 Security Review

### Rate Limiting (new QA11)

| Tier | Scope | Window | Max | Assessment |
|---|---|---|---|---|
| Global | Every route | 15 min | 500 | Adequate catch-all |
| Auth | `/api/auth` | 15 min | 20 | Good for signup/signin brute-force |
| Writes | `/api` POST/PUT/DELETE (skips GET/HEAD/OPTIONS) | 15 min | 100 | Correct skip logic |
| Sensitive | `/api/auth/changepassword`, `/api/auth/getpwresetlink`, `/api/auth/archive` | 1 hour | 10 | Appropriate |

**Implementation notes:**
- `express-rate-limit@6.11.2` — current stable, no known CVEs.
- In-memory store — correct for single-server Linode deploy. Comment in code notes Redis deferred for horizontal scale. 
- `standardHeaders: true` (RFC 6585 RateLimit-* headers emitted), `legacyHeaders: false` — modern and correct.
- `app.enable("trust proxy")` is present. On Linode with a single server, this means Express trusts `X-Forwarded-For` from the first proxy. **Risk:** if the Linode server sits behind a load balancer or Cloudflare, this setting may cause incorrect IP resolution and make rate limits trivially bypassable. For current single-server-behind-nginx setup, likely fine but should be verified with `trust proxy: 1` (explicit depth) rather than `true`.
- `changePw` and `getpwresetlink` routes have `sensitiveLimiter` applied but **no `verifyAuth`** — correct for password reset flow, but means the 403 auth error shape is a bare string from `verifyAuth`, not the JSON shape from the controller. Rate limiter fires first so brute-force is still protected.
- The `writeLimiter` at `/api` is applied **before** specific route mounts, which is correct middleware ordering.

### BOLA Status

All BOLA fixes from QA9/QA10 are present and intact in the reviewed code:
- `deleteApplication`, `createApplication`, `saveVideoCV` — ownership checks active
- `contactslist`, `list2` — JWT lock confirmed
- `candidateController` — BOLA fixes confirmed
- `getAllApplicantOfJob`, `getJobApplicantFitSignals` — verifyAuth + company check
- `interviewController` — `callerBelongsToCompany()` on all existing endpoints
- `saveGroupInterview` — company derived from JWT

**New endpoints:**
- `GET /interview/hub`: verifyAuth + `getUserCompany(req.user.uid)` — no caller-supplied ID. CORRECT.
- `GET /messages/recruiter/threads`: verifyAuth + `resolveCallerCompany(callerUid)` — CORRECT.

### applicantPhotoUrl — PII exposure consideration
The `listRecruiterThreads` query returns `u.photo_url` which may be a Firebase Storage URL or external URL. This is appropriate — recruiters are seeing applicants who messaged them or they messaged. Not a new exposure.

### CORS
CORS is `app.use(cors())` — open to all origins. The commented-out whitelist was intentionally disabled. For a production API this is a medium risk if the API should only be consumed by the FE. No change in QA11.

### Missing security headers
No `helmet()` or equivalent. No `X-Content-Type-Options: nosniff` (confirmed repo-wide). File signature verification was added for uploads (QA9) but nosniff header is still absent. A CDN serving uploaded files without nosniff could enable content-sniffing attacks.

### Secrets in git history
Confirmed in prior SWEEPs: `gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` exist in the BE repo and likely in git history. Not changed in QA11. This remains a P0 finding from the SECURE command.

---

## §11 Build/Config Review

### Backend
- **Node/runtime:** No `.nvmrc` in BE. Production uses `node start.js` via `gcloud app deploy`. Node version not pinned.
- **`express-rate-limit@6.11.2`**: Correctly pinned with `^` allowing patch updates. No known vulnerabilities.
- **Transpilation:** Babel via `esm` module. `start.js` not reviewed but confirmed in use.
- **Environment:** `env.js` holds config, `env.schema` = `gethired` for all queries.
- **No test script:** `"test": "echo \"Error: no test specified\" && exit 1"` — zero automated tests on BE.

### Frontend
- **Angular 13**, Node 16 (specified in deploy workflow).
- **`recordRtc` → `recordrtc` import fix:** Committed (FE `fix(ci)` commit), confirmed in `recorder.service.ts` line 4: `import RecordRTC from 'recordrtc'` — lowercase, correct for case-sensitive Linux CI.
- **GitHub Actions deploy workflow** (`.github/workflows/deploy.yml`):
  - Triggers on push to `master`
  - Steps: checkout → Node 16 → `npm ci` → `ng build --production` → SSH test → `rsync dist/ → /var/www/get-hired-FE/dist/`
  - **Requires 3 secrets:** `LINODE_HOST`, `LINODE_USER`, `LINODE_SSH_KEY` (base64-encoded)
  - **SSH key is base64-decoded from secret** — correct pattern.
  - **rsync target path** `dist/` to `/var/www/get-hired-FE/dist/` — needs verification that Nginx serves from this path.
  - **No rollback step:** failed deploy leaves the server in whatever state rsync completed.
  - **`--delete` flag on rsync** — removes files not in the new build. Correct but irreversible.
  - Status: **2 manual steps pending** (add secrets + verify rsync path). Auto-deploy is not yet active.

---

## §12 UI/UX Heuristic Review

### Recruiter Messages Inbox
- Two-pane layout is correct for a messaging interface.
- Thread list: avatar, name, job chip, snippet, time, needs-reply badge — appropriate information density.
- Empty state and filtered-empty state both have clear copy and CTAs.
- Loading skeleton matches the eventual content shape (row height = thread row height).
- Retry pattern in error state: correct (shows "Trying…" while retrying).
- **Issue:** applicant name shows as email or `Candidate <id>` due to the column name bug — functional but impersonal.

### Interview Hub
- Card list is clean and informative (name, job, status chip, video count, date applied).
- Three filter chips (`All`, `Video answers`, `Under review`) are simple and correct.
- Empty state is appropriate and non-alarmist.
- **Issue:** "Review responses" CTA routes to same place as "View applicants" (`/recruiter/contacts/candidate-list/:jobId`) — no dedicated video review UI exists. Label overpromises.
- **Issue:** The `ih-status-chip` class is `'ih-status-chip ih-status--' + item.applicationStatusId` — the status-specific CSS classes may not all be defined in the SCSS, making status chips all look the same.

### Mobile Sidebar (B02)
- Hamburger to X SVG animation declared (`gh-menu-line--top`, `--mid`, `--bot` classes).
- Scrim tap-to-dismiss: correct.
- Escape key: `@HostListener('document:keydown.escape')` — correct.
- Focus: moves to first drawer link on open, returns to hamburger on close — correct.
- Bottom nav: 5 items fits standard mobile nav pattern.
- Billing bar below bottom nav: compact and non-intrusive.

---

## §13 Accessibility Review

### Messages Inbox
- `role="list"` on `<ul>`, `role="button" tabindex="0"` on thread rows with keyboard handlers (enter, space) — correct.
- `aria-label` on each thread row from `threadLabel()` — includes job title, time, needsReply.
- `aria-pressed` on thread rows (selected state) — correct for toggle buttons.
- Avatar `img` has `alt=""` (decorative) — correct.
- Filter chips use `aria-pressed` — correct.
- Loading state uses `aria-busy="true"` — correct.
- Error state uses `role="alert"` — correct.

### Interview Hub
- `aria-label` on filter chip group — correct.
- `aria-pressed` on filter chips — correct.
- Loading `aria-busy="true"` — correct.
- Error `role="alert"` — correct.
- Card list uses `role="list"` / `role="listitem"` — correct.
- **Issue:** The video answer icon is a raw emoji (`&#9654;`) with `aria-label="Video answers submitted"` — the aria-label is on the `<span>`, which is correct. However the `aria-hidden="true"` is absent from the emoji span, so screen readers may read both the aria-label and announce the emoji character. Minor.

### Mobile Drawer
- `aria-controls` on hamburger → `id="gh-mobile-drawer"` — correct.
- `aria-expanded` on button — dynamic, correct.
- `aria-label` on open/close buttons — correct.
- `role="navigation"` + `aria-label="Employer navigation"` on drawer — correct.
- `aria-current="page"` on active nav item via `routerLinkActive` + template expression — correct.

**Overall accessibility posture:** Substantially improved over prior cycles. The employer panel now meets most WCAG 2.1 AA requirements for keyboard and screen reader navigation.

---

## §14 Performance/SEO Review

### Backend
- `getInterviewHub` uses `LIMIT 200` — prevents runaway queries. No index on `ja.updated_at` or `ja.date_applied` in the DDL files; the ORDER BY COALESCE will do a sequential scan for large datasets.
- `listRecruiterThreads` uses a LATERAL subquery for the last message — efficient (single pass per thread). Company-scoped WHERE clause benefits from `message_threads_company_id_idx` (defined in DDL).
- `interview_answers` COUNT subquery groups by `applicant_id` — no index on `interview_answers.applicant_id` visible in DDL; may be slow at scale.
- No query result caching anywhere.

### Frontend
- `app-message-thread` polls every 8s. Acceptable for a single open thread; would become expensive if many recruiter tabs are open.
- Lazy loading applied to all non-dashboard employer modules — correct.
- Interview Hub service makes one GET on init; no subscription leak (ngOnDestroy unsubscribes).
- Messages service uses `takeUntil(destroy$)` — correct.
- No SSR / prerendering on public portal; Angular 13 SPA with hash location strategy.

---

## §15 Testing Readiness

### Backend
- **Zero automated tests.** `"test": "echo \"Error: no test specified\""` in `package.json`.
- No test runner, no test files, no CI test step.
- The rate-limit middleware, BOLA guards, and interview hub endpoint are completely untested by automation.

### Frontend
- `karma.conf.js` present; test runner configured.
- 7 spec files found in employer-contacts module — legacy, not reviewed.
- `public-search.component.spec.ts` and `match-factor-adapter.spec.ts` and `job-compatibility.matched.spec.ts` found in public services — partial coverage.
- **No spec files for:** `RecruiterMessagesComponent`, `RecruiterInterviewHubComponent`, `RecruiterInterviewHubService`, `MessageService` (new methods).
- FE test step not included in the GitHub Actions deploy workflow (build only, no `ng test`).

---

## §16 Notifications/Errors/Status Messaging

### Rate limit responses
- All four limiters return consistent JSON `{ message: "..." }` shapes. Error messages are user-friendly ("Please try again in 15 minutes", "Please try again in an hour").

### Interview Hub
- Loading: skeleton cards shown.
- Error: "We couldn't load interview activity." with Try again / Back to dashboard. Correct.
- Empty: "No interview activity yet." Non-alarming, with CTAs. Correct.
- Retry: reloads the component. No exponential backoff — acceptable for MVP.

### Messages Inbox
- Loading: 5 skeleton rows. Correct.
- Error: "We couldn't load your messages" with retry. Correct.
- Empty (no threads): descriptive copy + CTAs. Correct.
- Filtered empty: "No messages match this filter" + reset. Correct.
- Retry: shows "Trying…" while in progress. Correct.

### No toast/snackbar system visible for send-message success/failure — handled inside `app-message-thread` component (not reviewed in detail in QA11 scope).

---

## §17 Brand/Positioning Review

- Brand fonts: `Manrope` used consistently in new components.
- Color: `#1E1B4B` (deep navy), `#7B61FF` (accent violet), `$color-global-red-buttons` (CTA) — consistent.
- Motion: `rm-page-reveal`, `rm-detail-slide`, `rm-empty-reveal` animations with `@include motion-safe` guards — correct.
- Messaging: Copy is factual, no fake counts or fake urgency. Interview Hub subtitle is honest: "Review candidates who applied to your jobs and submitted video responses."
- The "Message" action on Interview Hub cards routes to `/recruiter/messages` (the inbox), not to a specific thread — recruiter must find the right thread manually. Opportunity for deeper linking.

---

## §18 Redesign Readiness Matrix

| Area | Status | Blocker? |
|---|---|---|
| Public job portal | Ready with caution | No pagination |
| Applicant signup/profile | Ready | None |
| Applicant apply flow | Ready | None |
| Applicant video answers | Ready | None |
| Employer job posting | Ready | None |
| Employer applicant list | Ready | None |
| Employer messages inbox | Feature degraded | Column name bug silently breaks names |
| Employer interview hub | Feature degraded | Column name bug + FE HttpClient auth risk |
| Employer mobile nav | Ready | None |
| Admin panel | Not ready | Thin; no real admin features |
| Rate limiting | Ready | In-memory; Redis deferred |
| CI/deploy | Partially ready | 2 secrets + rsync path pending for FE auto-deploy |

---

## §19 Risk Register

| # | Severity | Title | Detail |
|---|---|---|---|
| R-01 | CRITICAL | Column name mismatch in name enrichment queries | `message.service.js` queries `u.first_name`/`u.last_name`; `interviewController.js` queries `u.first_name`/`u.last_name`. Actual schema: `firstname`/`lastname`. Both name JOINs silently return NULL. Fix: rename columns in SQL to `u.firstname AS "first_name", u.lastname AS "last_name"` in both files. |
| R-02 | HIGH | Interview Hub FE uses raw HttpClient | `recruiter-interview-hub.service.ts` uses `HttpClient` not `BaseService`. If Angular auth interceptor is attached to `BaseService`'s HTTP client, hub calls may not include Authorization header and hit 403 in production. |
| R-03 | HIGH | Leaked service account keys in git history | `gethired-serviceAccountKey.json` and `jobhunt-serviceAccountKey.json` committed to BE repo. Key rotation needed. (Known from prior SECURE pass.) |
| R-04 | HIGH | `job_interview_template` missing `company_id` in DDL | `interview.service.js` queries `company_id` from `job_interview_template` but the DDL in `job_ddl.sql` does not define this column. Either a live migration exists outside tracked DDL files, or the ownership check in `getTemplateCompanyId()` always fails/errors. |
| R-05 | MEDIUM | `trust proxy: true` rather than explicit depth | If a CDN or load balancer is added in front of Linode, `trust proxy: true` (all proxies trusted) makes rate limiting bypassable via `X-Forwarded-For` spoofing. Use `app.set('trust proxy', 1)` for explicit single-hop trust. |
| R-06 | MEDIUM | `changePw` / `getpwresetlink` unguarded by verifyAuth | By design for reset flow, but means any unauthenticated caller gets sensitiveLimiter (10/hr) as the only defense — no Firebase token validation. This is standard for reset flows but worth tracking. |
| R-07 | MEDIUM | No X-Content-Type-Options nosniff header | File uploads exist; without nosniff, CDN-served content could be type-sniffed. `helmet()` would add this automatically. |
| R-08 | MEDIUM | Open CORS | `app.use(cors())` allows all origins. Acceptable for public API but means any web page can make credentialed requests. |
| R-09 | MEDIUM | FE auto-deploy blocked | GitHub Actions workflow requires `LINODE_HOST`, `LINODE_USER`, `LINODE_SSH_KEY` secrets and rsync path verification. Without these, pushes to `master` fail silently (or the workflow fails). |
| R-10 | LOW | Post-login 404s may not reach error page | Role-based guards call `router.resetConfig()` without a wildcard. Post-login 404s may show a blank screen. |
| R-11 | LOW | "Review responses" label in Interview Hub overpromises | Both "View applicants" and "Review responses" route to the same candidate list. No dedicated video review UI exists. |
| R-12 | LOW | No read-state on messages | `is_read` column absent from schema. Unread count badge in nav comment says "BACKLOG: badge showing unread thread count". Known and documented. |

---

## §20 Opportunity Register

| # | Value | Title | Detail |
|---|---|---|---|
| O-01 | HIGH | Fix column name mismatch — 2-line fix, immediate | Change `u.first_name AS "applicantFirstName", u.last_name AS "applicantLastName"` to `u.firstname AS "applicantFirstName", u.lastname AS "applicantLastName"` in `message.service.js:196-197`, and `u.first_name, u.last_name` to `u.firstname, u.last_name` in `interviewController.js:274-275`. Two files, two lines each. Names will then work. |
| O-02 | HIGH | Migrate Interview Hub service to BaseService | Change `HttpClient` to `BaseService` in `recruiter-interview-hub.service.ts` to ensure auth interceptor fires. Pattern: same as `MessageService`. Low risk, one-file change. |
| O-03 | HIGH | Add backend automated tests | At minimum: one test per BOLA-fixed endpoint, rate-limit header tests, and the interview hub ownership check. Would close the biggest quality gap in the codebase. |
| O-04 | HIGH | Activate FE auto-deploy | Add 3 GitHub Actions secrets and verify rsync path. One-time setup, then every push to master deploys automatically. |
| O-05 | MEDIUM | Add helmet() for security headers | Single `npm install helmet` + `app.use(helmet())` adds X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS. |
| O-06 | MEDIUM | Add messages read-state | `ALTER TABLE gethired.messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false` + update logic. Enables unread count badge in nav. |
| O-07 | MEDIUM | Deep-link "Message" from Interview Hub to specific thread | Instead of routing to the inbox root, pass `?applicantUid=&jobId=` to open the correct thread directly. |
| O-08 | MEDIUM | Paginate public job feed | Add `LIMIT`/`OFFSET` or cursor pagination to `getAllPublishedJobs`. Prevents full table scan on page load at scale. |
| O-09 | MEDIUM | Add `trust proxy: 1` | Replace `app.enable("trust proxy")` with `app.set("trust proxy", 1)` for explicit single-hop trust, hardening rate-limit IP accuracy. |
| O-10 | LOW | Add video-specific review route | Create `/recruiter/interview/:jobId/video-review` for the "Review responses" CTA, showing only applicants with video answers for that job. |

---

## §21 Recommended Next Commands

**Immediate (before any further features):**
1. Fix R-01 (column name bug) — 2-file, 4-line patch. Run manually, verify names appear in messages inbox and interview hub.
2. Fix R-02 (HttpClient in hub service) — 1-file change. Verify `/interview/hub` returns 200 in prod.
3. Complete R-09 (FE deploy secrets + rsync path) — unblocks CI/CD.

**Then:** `TEST` — add automated tests for rate-limiting, BOLA endpoints, and the new hub endpoint. The test gap is the biggest reliability risk.

**Then:** `NOTIFY` — read-state for messages, unread badge, email notification when a new message arrives.

**Then:** `OPTIMIZE` — pagination on public jobs, index on `interview_answers.applicant_id`, `COALESCE(updated_at, date_applied)` index consideration.

---

## §22 Final Acceptance Check

- [x] Phase 0: Both repos confirmed present
- [x] Phase 1: Repository inventory complete
- [x] Phase 2: Executive summary written
- [x] Phase 3: §1 Product System Map
- [x] Phase 4: §2 Frontend Route Map
- [x] Phase 5: §3 Backend API Map (includes GET /api/interview/hub)
- [x] Phase 6: §4 FE-to-BE Contract Map (includes RecruiterThreadSummary new fields)
- [x] Phase 7: §5 Database/Data Model Map
- [x] Phase 8: §6 Public Job Portal Current State
- [x] Phase 9: §7 Applicant Experience Current State
- [x] Phase 10: §8 Recruiter/Employer Current State (Interview Hub, Messages, mobile sidebar)
- [x] Phase 11: §9 Admin Current State
- [x] Phase 12: §10 Security Review (rate-limiting tiers, BOLA status, new endpoints)
- [x] Phase 13: §11 Build/Config Review (rate-limit package version, CI workflow)
- [x] Phase 14: §12 UI/UX Heuristic Review
- [x] Phase 15: §13 Accessibility Review
- [x] Phase 16: §14 Performance/SEO Review
- [x] Phase 17: §15 Testing Readiness
- [x] Phase 18: §16 Notifications/Errors/Status Messaging
- [x] Phase 19: §17 Brand/Positioning Review
- [x] Phase 20: §18 Redesign Readiness Matrix
- [x] Phase 21: §19 Risk Register
- [x] Phase 22: §20 Opportunity Register
- [x] Phase 23: §21 Recommended Next Commands
- [x] Phase 24: Final acceptance check

---

*GETHIRED_SWEEP_REPORT.md — QA Cycle 11 — generated 2026-06-25*
