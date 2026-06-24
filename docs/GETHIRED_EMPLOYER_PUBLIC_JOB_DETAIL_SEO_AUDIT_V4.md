# GetHired Employer Public Job Detail and SEO Audit V4

**Document:** GETHIRED_EMPLOYER_PUBLIC_JOB_DETAIL_SEO_AUDIT_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Public job listing and detail page fields, confirmed SEO gaps, structured data status, and safe improvement backlog. No SEO code changes are made in this pass; all items are documented as backlog.

---

## Table of Contents

1. [Public Routes](#1-public-routes)
2. [Public Job List](#2-public-job-list)
3. [Public Job Detail](#3-public-job-detail)
4. [Fields Displayed Publicly](#4-fields-displayed-publicly)
5. [Share Link](#5-share-link)
6. [Structured Data (JSON-LD) Status](#6-structured-data-json-ld-status)
7. [Open Graph and Social Sharing](#7-open-graph-and-social-sharing)
8. [SEO Gap Summary](#8-seo-gap-summary)
9. [Public Apply Flow](#9-public-apply-flow)
10. [Expired and Closed Job Handling](#10-expired-and-closed-job-handling)
11. [Safe Improvement Backlog](#11-safe-improvement-backlog)

---

## 1. Public Routes

The following routes are accessible without authentication:

| Route | Component | Guard | Description |
|-------|-----------|-------|-------------|
| `/jobs` | (public job list component) | None | All published jobs via `GET /job/published` |
| `/jobs/details/:id` | `PublicDetailsComponent` | None | Single job detail page |
| `/public-apply` | (public apply component) | None | Application submission without account |

These routes are part of the public module. Authenticated and unauthenticated users can both access them.

---

## 2. Public Job List

**Endpoint:** `GET /job/published`

**Purpose:** Returns all jobs with `jobStatusId=2` (Published/Active). Expired jobs (`jobStatusId=3`) and drafts (`jobStatusId=1`) are excluded from public listing.

**Frontend:** Public job list component renders job cards with summary information.

**SEO relevance:** This is likely the most crawled page in the application. It should have a meaningful `<title>` and meta description. Neither is confirmed as implemented.

---

## 3. Public Job Detail

**Route:** `/jobs/details/:id`
**Component:** `PublicDetailsComponent`

**Data source:** Job data fetched by `id` from the URL parameter. Likely via `GET /job/{id}` or a public variant.

**Page purpose:** Full description of a single job posting visible to all users including unauthenticated guests. This is the most important SEO landing page for individual job discovery.

---

## 4. Fields Displayed Publicly

The following fields from the job record are displayed on the public job detail page. Fields marked as conditional are only shown when the value is present.

| Field | Display Rule | Notes |
|-------|-------------|-------|
| `jobTitle` | Always | Primary heading of the page |
| Company name | Always | Derived from employer's company record |
| Location (`jobCity`, `jobCountry`) | Always | Combined as "City, Country" |
| `workSetupId` label | Always | e.g., Remote, On-site, Hybrid |
| `jobTypeId` label | Always | e.g., Full-time, Part-time |
| `jobLevelId` label | Always | e.g., Entry Level, Senior |
| `jobDescription` | Always | Main job description text |
| `jobDuties` | Conditional | Shown if present |
| `requirements[]` | Conditional | Shown if non-empty |
| `goodToHave[]` | Conditional | Shown if non-empty |
| `educationalBackground[]` | Conditional | Shown if non-empty |
| `skills[]` | Conditional | Tag display |
| `certificationRequirements[]` | Conditional | v1 implementation; shown if non-empty |
| `salaryMinimum` / `salaryMaximum` | Conditional | Shown only if both are filled |
| `salaryCurrency` | Conditional | Shown with salary range |
| `badges[]` | Conditional | Perk highlights |
| `jobBanner` | Conditional | Job cover image (required to publish, so present on all active jobs) |

**Note on salary:** Salary is only displayed publicly if both `salaryMinimum` and `salaryMaximum` are present. Employers who do not fill salary during posting will not expose salary information publicly.

---

## 5. Share Link

**Endpoint:** `GET /job/sharelink`
**Returns:** A Firebase Dynamic Link for the specific job.

**Purpose:** Allows employers to share a deep link to a specific job posting. Dynamic links can route mobile users to the app or fall back to the web URL.

**SEO relevance:** Firebase Dynamic Links use HTTP redirects. The destination URL (the actual job detail page) is what search engines index, not the dynamic link itself. The dynamic link is for sharing, not for SEO.

**Gap:** No confirmed implementation of the share link button in the employer panel. The endpoint exists in the backend but UI integration in the employer panel post-publish flow is not confirmed.

---

## 6. Structured Data (JSON-LD) Status

### 6.1 JobPosting schema

Google Search supports `JobPosting` JSON-LD structured data, which enables rich results (job cards in Google Jobs search).

**Status: NOT CONFIRMED in codebase.**

A `JobPosting` structured data block (`<script type="application/ld+json">`) in `PublicDetailsComponent` or its template has not been confirmed. This is documented as a gap.

**Required fields for Google Jobs eligibility:**
- `title`
- `description`
- `datePosted`
- `validThrough`
- `hiringOrganization.name`
- `jobLocation.addressLocality`
- `jobLocation.addressCountry`

**Optional but recommended:**
- `baseSalary`
- `employmentType`
- `experienceRequirements`

**Impact of gap:** GetHired job postings do not appear in Google Jobs rich results. This is a significant organic discovery gap given that job search is a high-volume Google search behavior.

### 6.2 Organization schema

A `Organization` schema on the employer company page would improve brand signals for employers. **Not confirmed.**

### 6.3 BreadcrumbList schema

Breadcrumb structured data on job detail pages would improve rich snippet display. **Not confirmed.**

---

## 7. Open Graph and Social Sharing

### 7.1 Open Graph meta tags

When a job link is shared on LinkedIn, Facebook, Twitter/X, or messaging apps, the platform reads Open Graph meta tags to generate a link preview.

**Status: NOT CONFIRMED.**

Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) have not been confirmed in `PublicDetailsComponent` or the application `index.html`.

**Impact:** Job links shared on social platforms will render as plain URLs without a preview card. This significantly reduces click-through rates from social sharing.

**Required tags:**
```html
<meta property="og:title" content="{jobTitle} at {companyName}" />
<meta property="og:description" content="{first 160 chars of jobDescription}" />
<meta property="og:image" content="{jobBanner URL}" />
<meta property="og:url" content="https://gethired.app/jobs/details/{id}" />
<meta property="og:type" content="website" />
```

### 7.2 Twitter Card meta tags

Similar to Open Graph but for X (Twitter).

**Status: NOT CONFIRMED.**

---

## 8. SEO Gap Summary

| Gap | Type | Impact | Confirmed/Suspected |
|-----|------|--------|---------------------|
| No `<title>` tag dynamic update on `/jobs/details/:id` | Technical SEO | High | Suspected -- Angular `Title` service not confirmed in `PublicDetailsComponent` |
| No meta description on job detail pages | Technical SEO | High | Not confirmed |
| No `JobPosting` JSON-LD structured data | Rich results | High | Not confirmed (gap) |
| No Open Graph meta tags | Social sharing | High | Not confirmed (gap) |
| No Twitter Card meta tags | Social sharing | Medium | Not confirmed (gap) |
| No canonical tag on job detail pages | Technical SEO | Medium | Not confirmed |
| No `BreadcrumbList` schema | Rich results | Low | Not confirmed |
| No closing date handling (`validThrough`) | Correctness | Medium | Not confirmed |
| Firebase Dynamic Link used for sharing (redirect, not indexable) | Discovery | Medium | Confirmed gap |

**Priority order for implementation:**

1. Dynamic `<title>` update using Angular `Title` service in `PublicDetailsComponent` -- simplest, highest impact.
2. Meta description using Angular `Meta` service.
3. Open Graph tags -- enables social sharing previews.
4. `JobPosting` JSON-LD -- enables Google Jobs.
5. Canonical tag.
6. `BreadcrumbList` schema.

---

## 9. Public Apply Flow

**Route:** `/public-apply`

This route allows unauthenticated users to apply to a job without creating an account. The route exists in the public module.

**SEO relevance:** Low directly, but high for conversion. If the public job detail page has good SEO, applicants who arrive from search engines need a low-friction apply path. The existence of `/public-apply` suggests this path exists.

**Gap:** The linkage between `/jobs/details/:id` and `/public-apply` (how the job context is passed) is not confirmed in this audit. Confirm that the public apply route receives `jobId` context correctly.

---

## 10. Expired and Closed Job Handling

**Job statuses that take a job off public listing:**

| statusId | Label | Public behavior |
|----------|-------|-----------------|
| 1 | Draft | Not in `GET /job/published` |
| 2 | Published | In public listing and accessible by direct URL |
| 3 | Expired | Not in public listing (unconfirmed for direct URL access) |
| 4 | Archived | Not in public listing |

**Gap: Expired job direct URL behavior not confirmed.**

If an employer's job URL is shared widely (e.g., social media, job boards) and the job expires, the public detail page at `/jobs/details/{id}` may still render the job or show an error state. The correct behavior is to show a "This job is no longer accepting applications" state and suggest related open jobs.

**Impact for SEO:** If expired jobs return a 200 status with "not found" content, search engines may index the expired state. The correct approach is either:
- 200 with a clear "job closed" message and canonical to the jobs list, or
- 410 Gone response if the job is archived/deleted

Neither approach is confirmed as implemented.

---

## 11. Safe Improvement Backlog

All items below are backlog items. No code changes are made in this pass.

| # | Item | Component/File | Effort | Priority |
|---|------|---------------|--------|----------|
| 1 | Add Angular `Title` service call in `PublicDetailsComponent` to set `{jobTitle} at {companyName} - GetHired` | `PublicDetailsComponent` | Low | High |
| 2 | Add Angular `Meta` service call for `description` tag | `PublicDetailsComponent` | Low | High |
| 3 | Add Open Graph `<meta>` tags for job title, description, image, URL | `PublicDetailsComponent` | Low | High |
| 4 | Add `JobPosting` JSON-LD block dynamically from job data | `PublicDetailsComponent` | Medium | High |
| 5 | Add expired job state handling in `PublicDetailsComponent` (detect `jobStatusId=3`, show closed message) | `PublicDetailsComponent` | Medium | Medium |
| 6 | Add canonical `<link>` tag | `PublicDetailsComponent` | Low | Medium |
| 7 | Add Twitter Card meta tags | `PublicDetailsComponent` | Low | Medium |
| 8 | Add `BreadcrumbList` JSON-LD | `PublicDetailsComponent` | Low | Low |
| 9 | Wire share link endpoint to employer panel post-publish CTA | Employer panel | Medium | Low |
| 10 | Confirm `/public-apply` receives and uses `jobId` correctly from `/jobs/details/:id` | `PublicDetailsComponent` + public apply component | Low | Medium |

**Implementation note for JSON-LD:** Angular `Title` and `Meta` services handle `<title>` and standard meta tags. For JSON-LD structured data, inject a `<script>` element into the document head using `@angular/platform-browser`'s `DomSanitizer` and `DOCUMENT` injection token, or use a community library such as `ngx-seo`. Do not use `innerHTML` without sanitization.
